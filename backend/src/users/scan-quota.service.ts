import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { formatLocalDateIso } from '../nutrition/local-date';
import {
  dailyScanLimitForPlan,
  normalizeSubscriptionPlan,
  type SubscriptionPlanId,
} from '../subscription/plan-limits';

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const TZ_SAFE_RE = /^[A-Za-z0-9_/+\-]+$/;

@Injectable()
export class ScanQuotaService {
  constructor(private readonly prisma: PrismaService) {}

  sanitizeTimezone(tzRaw: string | undefined, fallback = 'Europe/Istanbul'): string {
    const tz = (tzRaw ?? '').trim() || fallback;
    if (!TZ_SAFE_RE.test(tz) || tz.length > 64) return fallback;
    return tz;
  }

  /** Kullanıcının seçili güne göre (IANA TZ) oluşturduğu scan_history satırı sayısı. */
  async countScansOnLocalDate(userId: string, localYmd: string, timeZone: string): Promise<number> {
    if (!YMD_RE.test(localYmd)) return 0;
    const tz = this.sanitizeTimezone(timeZone);
    const rows = await this.prisma.$queryRaw<{ c: bigint }[]>`
      SELECT COUNT(*)::bigint AS c
      FROM scan_history
      WHERE "userId" = ${userId}
      AND ("scannedAt" AT TIME ZONE ${tz})::date = ${localYmd}::date
    `;
    return Number(rows[0]?.c ?? 0);
  }

  async getScanUsageForUser(
    userId: string,
    timeZoneRaw?: string,
  ): Promise<{
    localDate: string;
    timezone: string;
    plan: SubscriptionPlanId;
    usedToday: number;
    dailyLimit: number | null;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { subscriptionPlan: true },
    });
    const plan = normalizeSubscriptionPlan(user?.subscriptionPlan);
    const tz = this.sanitizeTimezone(timeZoneRaw);
    const localDate = formatLocalDateIso(new Date(), tz);
    const usedToday = await this.countScansOnLocalDate(userId, localDate, tz);
    return {
      localDate,
      timezone: tz,
      plan,
      usedToday,
      dailyLimit: dailyScanLimitForPlan(plan),
    };
  }

  async assertScanAllowed(userId: string, timeZoneRaw?: string): Promise<void> {
    const { usedToday, dailyLimit } = await this.getScanUsageForUser(userId, timeZoneRaw);
    if (dailyLimit == null) return;
    if (usedToday >= dailyLimit) {
      const err = new Error('SCAN_QUOTA_EXCEEDED');
      err.name = 'ScanQuotaExceeded';
      throw err;
    }
  }
}
