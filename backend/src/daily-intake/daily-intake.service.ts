import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { MedicalConditionRule, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { formatLocalDateIso } from '../nutrition/local-date';
import {
  parseNutrientsPerServing,
  scaleNutrientsJson,
  sumNutrientRecords,
  type NutrientTotals,
} from '../nutrition/nutrient-json';
import { resolveMetricForRule, ruleFires } from '../nutrition/trigger-metric';

type Locale = 'tr' | 'en';

export type TriggeredRuleDto = {
  ruleCode: string;
  conditionCode: string;
  riskLevel: string;
  current: number;
  threshold: number;
  operator: string;
  message: string;
};

const PORTION_PRESETS = new Set([0.25, 0.5, 1, 2]);

@Injectable()
export class DailyIntakeService {
  constructor(private readonly prisma: PrismaService) {}

  async sumDailyNutrients(userId: string, localDate: string): Promise<NutrientTotals> {
    const logs = await this.prisma.consumptionLog.findMany({
      where: { userId, localDate },
      select: { nutrientsScaled: true },
    });
    const parsed = logs.map((l) =>
      parseNutrientsPerServing(l.nutrientsScaled as unknown),
    );
    return sumNutrientRecords(parsed);
  }

  async evaluateBreachedDayRules(
    userId: string,
    totals: NutrientTotals,
    locale: Locale,
  ): Promise<TriggeredRuleDto[]> {
    const userRules = await this.loadUserDayScanRules(userId);
    const out: TriggeredRuleDto[] = [];
    for (const { rule, conditionCode } of userRules) {
      if (rule.triggerType !== 'nutrient') continue;
      const { value, readiness } = resolveMetricForRule(totals, rule);
      if (readiness !== 'ok' || value == null) continue;
      if (!ruleFires(rule.operator, rule.threshold, value)) continue;
      const msg = messageFromJson(rule.messages, locale);
      out.push({
        ruleCode: rule.code,
        conditionCode,
        riskLevel: rule.riskLevel,
        current: value,
        threshold: rule.threshold,
        operator: rule.operator,
        message: msg,
      });
    }
    out.sort((a, b) => riskOrder(b.riskLevel) - riskOrder(a.riskLevel));
    return out;
  }

  async setScanConsumed(
    userId: string,
    scanId: string,
    portions: number,
    timeZone: string,
    locale: Locale,
  ): Promise<{
    localDate: string;
    dailyTotals: NutrientTotals;
    triggeredRules: TriggeredRuleDto[];
  }> {
    const scan = await this.prisma.scanHistory.findFirst({
      where: { id: scanId, userId },
    });
    if (!scan) {
      throw new NotFoundException('Scan not found');
    }
    const p = PORTION_PRESETS.has(portions) ? portions : 1;
    const base = parseNutrientsPerServing(scan.nutrientsPerServing);
    const scaled = scaleNutrientsJson(base, p);
    const now = new Date();
    const localDate = formatLocalDateIso(now, timeZone);

    await this.prisma.$transaction(async (tx) => {
      await tx.consumptionLog.deleteMany({ where: { scanId } });
      await tx.consumptionLog.create({
        data: {
          id: randomUUID(),
          userId,
          scanId,
          consumedAt: now,
          localDate,
          portions: p,
          nutrientsScaled: scaled as unknown as Prisma.InputJsonValue,
        },
      });
      await tx.scanHistory.update({
        where: { id: scanId },
        data: {
          consumed: true,
          consumedAt: now,
          portionsConsumed: p,
        },
      });
    });

    const dailyTotals = await this.sumDailyNutrients(userId, localDate);
    const triggeredRules = await this.evaluateBreachedDayRules(
      userId,
      dailyTotals,
      locale,
    );
    return { localDate, dailyTotals, triggeredRules };
  }

  async clearScanConsumed(userId: string, scanId: string): Promise<void> {
    const scan = await this.prisma.scanHistory.findFirst({
      where: { id: scanId, userId },
    });
    if (!scan) {
      throw new NotFoundException('Scan not found');
    }
    await this.prisma.$transaction(async (tx) => {
      await tx.consumptionLog.deleteMany({ where: { scanId } });
      await tx.scanHistory.update({
        where: { id: scanId },
        data: {
          consumed: false,
          consumedAt: null,
          portionsConsumed: 1,
        },
      });
    });
  }

  async buildDailyDashboard(
    userId: string,
    localDate: string,
    locale: Locale,
  ): Promise<
    {
      conditionCode: string;
      conditionName: string;
      rows: {
        slug: string;
        triggerName: string;
        unit: string;
        current: number | null;
        readiness: string;
        worstLevel: 'ok' | 'yellow' | 'red' | 'unknown';
        rules: {
          code: string;
          riskLevel: string;
          operator: string;
          threshold: number;
          fires: boolean;
        }[];
      }[];
    }[]
  > {
    const totals = await this.sumDailyNutrients(userId, localDate);
    const links = await this.prisma.userMedicalCondition.findMany({
      where: { userId },
      include: {
        condition: {
          include: {
            rules: {
              where: {
                period: 'DAY',
                scope: 'scan',
                triggerType: 'nutrient',
              },
            },
          },
        },
      },
    });

    const out: {
      conditionCode: string;
      conditionName: string;
      rows: {
        slug: string;
        triggerName: string;
        unit: string;
        current: number | null;
        readiness: string;
        worstLevel: 'ok' | 'yellow' | 'red' | 'unknown';
        rules: {
          code: string;
          riskLevel: string;
          operator: string;
          threshold: number;
          fires: boolean;
        }[];
      }[];
    }[] = [];

    for (const link of links) {
      const cond = link.condition;
      const rules = cond.rules as MedicalConditionRule[];
      if (rules.length === 0) continue;

      const bySlug = new Map<string, MedicalConditionRule[]>();
      for (const r of rules) {
        const arr = bySlug.get(r.triggerSlug) ?? [];
        arr.push(r);
        bySlug.set(r.triggerSlug, arr);
      }

      const rows: (typeof out)[0]['rows'] = [];
      for (const [, group] of bySlug) {
        const first = group[0]!;
        const { value, readiness } = resolveMetricForRule(totals, first);

        const ruleRows = group.map((r) => ({
          code: r.code,
          riskLevel: r.riskLevel,
          operator: r.operator,
          threshold: r.threshold,
          fires:
            value != null &&
            readiness === 'ok' &&
            ruleFires(r.operator, r.threshold, value),
        }));

        let worstLevel: 'ok' | 'yellow' | 'red' | 'unknown' = 'unknown';
        if (readiness !== 'ok' || value == null) {
          worstLevel = 'unknown';
        } else if (ruleRows.some((r) => r.fires && r.riskLevel === 'RED')) {
          worstLevel = 'red';
        } else if (ruleRows.some((r) => r.fires && r.riskLevel === 'YELLOW')) {
          worstLevel = 'yellow';
        } else {
          worstLevel = 'ok';
        }

        rows.push({
          slug: first.triggerSlug,
          triggerName: first.triggerName,
          unit: first.unit,
          current: readiness === 'ok' ? value : null,
          readiness,
          worstLevel,
          rules: ruleRows,
        });
      }

      const disp = cond.displayNames as { tr?: string; en?: string };
      const conditionName =
        locale === 'en'
          ? (disp.en ?? disp.tr ?? cond.code)
          : (disp.tr ?? disp.en ?? cond.code);

      out.push({ conditionCode: cond.code, conditionName, rows });
    }

    return out;
  }

  async listWeeklyPlaceholderRules(
    userId: string,
  ): Promise<{ code: string; title: string }[]> {
    const links = await this.prisma.userMedicalCondition.findMany({
      where: { userId },
      include: {
        condition: {
          include: {
            rules: {
              where: {
                period: 'WEEK',
                scope: 'scan',
              },
            },
          },
        },
      },
    });
    const out: { code: string; title: string }[] = [];
    for (const link of links) {
      const disp = link.condition.displayNames as { tr?: string };
      for (const r of link.condition.rules) {
        out.push({
          code: r.code,
          title: `${disp.tr ?? link.condition.code} — ${r.triggerName}`,
        });
      }
    }
    return out;
  }

  private async loadUserDayScanRules(
    userId: string,
  ): Promise<{ rule: MedicalConditionRule; conditionCode: string }[]> {
    const rows = await this.prisma.userMedicalCondition.findMany({
      where: { userId },
      include: {
        condition: {
          include: {
            rules: {
              where: {
                period: 'DAY',
                scope: 'scan',
              },
            },
          },
        },
      },
    });
    const flat: { rule: MedicalConditionRule; conditionCode: string }[] = [];
    for (const row of rows) {
      const code = row.condition.code;
      for (const rule of row.condition.rules as MedicalConditionRule[]) {
        flat.push({ rule, conditionCode: code });
      }
    }
    return flat;
  }
}

function riskOrder(r: string): number {
  return r === 'RED' ? 2 : r === 'YELLOW' ? 1 : 0;
}

function messageFromJson(messages: unknown, locale: Locale): string {
  if (!messages || typeof messages !== 'object') return '';
  const m = messages as { tr?: string; en?: string };
  const t = locale === 'en' ? m.en ?? m.tr : m.tr ?? m.en;
  return typeof t === 'string' ? t : '';
}
