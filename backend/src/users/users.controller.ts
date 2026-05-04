import {
  Controller,
  Delete,
  Get,
  Patch,
  Body,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { userToProfileResponse } from './profile-mapper';
import { DailyIntakeService } from '../daily-intake/daily-intake.service';
import { ScanQuotaService } from './scan-quota.service';
import { formatLocalDateIso, calendarWeekMondayToSunday } from '../nutrition/local-date';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly dailyIntake: DailyIntakeService,
    private readonly scanQuota: ScanQuotaService,
  ) {}

  @Get('me/scan-usage')
  async scanUsage(
    @Req() req: { user: { userId: string } },
    @Query('timezone') timezoneRaw?: string,
  ) {
    return this.scanQuota.getScanUsageForUser(req.user.userId, timezoneRaw);
  }

  @Get('me')
  async getProfile(@Req() req: { user: { userId: string } }) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) return null;
    return userToProfileResponse(user);
  }

  @Get('me/daily-summary')
  async dailySummary(
    @Req() req: { user: { userId: string } },
    @Query('date') dateRaw?: string,
    @Query('timezone') timezoneRaw?: string,
    @Query('locale') localeRaw?: string,
  ) {
    const tz = (timezoneRaw ?? 'Europe/Istanbul').trim() || 'Europe/Istanbul';
    const locale = localeRaw === 'en' ? ('en' as const) : ('tr' as const);
    const dr = dateRaw?.trim();
    const date =
      dr && dr.length >= 10 ? dr.slice(0, 10) : formatLocalDateIso(new Date(), tz);
    const [totals, conditions] = await Promise.all([
      this.dailyIntake.sumDailyNutrients(req.user.userId, date),
      this.dailyIntake.buildDailyDashboard(req.user.userId, date, locale),
    ]);
    return { date, timezone: tz, totals, conditions };
  }

  @Get('me/weekly-rules')
  async weeklyRules(
    @Req() req: { user: { userId: string } },
    @Query('timezone') timezoneRaw?: string,
    @Query('locale') localeRaw?: string,
  ) {
    const tz = (timezoneRaw ?? 'Europe/Istanbul').trim() || 'Europe/Istanbul';
    const locale = localeRaw === 'en' ? ('en' as const) : ('tr' as const);
    const today = formatLocalDateIso(new Date(), tz);
    const { weekStart, weekEnd } = calendarWeekMondayToSunday(today);
    const { totals, conditions } = await this.dailyIntake.getWeeklyNutrientSummary(
      req.user.userId,
      weekStart,
      weekEnd,
      locale,
    );
    return {
      trackable: true as const,
      timezone: tz,
      weekStart,
      weekEnd,
      totals,
      conditions,
    };
  }

  @Patch('me')
  async updateProfile(
    @Req() req: { user: { userId: string } },
    @Body() body: UpdateProfileDto,
  ) {
    return this.usersService.update(req.user.userId, body);
  }

  @Delete('me')
  async deleteAccount(@Req() req: { user: { userId: string } }) {
    await this.usersService.removeAccount(req.user.userId);
    return { ok: true };
  }
}
