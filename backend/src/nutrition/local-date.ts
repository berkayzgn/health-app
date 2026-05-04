/** IANA zaman diliminde yerel tarih YYYY-MM-DD */
export function formatLocalDateIso(d: Date, timeZone: string): string {
  const tz = timeZone.trim() || 'UTC';
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = fmt.formatToParts(d);
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const m = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return `${y}-${m}-${day}`;
}

/**
 * Saf Gregoriyan takvim: YYYY-MM-DD üzerinden gün ekler / çıkarır.
 * Yerel tarih string’leri (consumption_logs.localDate vb.) ile tutarlı.
 */
export function addCalendarDaysIso(ymd: string, deltaDays: number): string {
  const [yRaw, moRaw, dRaw] = ymd.split('-');
  const y = Number.parseInt(yRaw ?? '', 10);
  const mo = Number.parseInt(moRaw ?? '', 10);
  const d = Number.parseInt(dRaw ?? '', 10);
  if (
    Number.isNaN(y) ||
    Number.isNaN(mo) ||
    Number.isNaN(d) ||
    yRaw == null ||
    moRaw == null ||
    dRaw == null
  ) {
    return ymd;
  }
  const utc = new Date(Date.UTC(y, mo - 1, d + deltaDays));
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** ISO-8601: Pazartesi=1 … Pazar=7 (Gregoriyan takvim tarihi için). */
function isoWeekdayMon1Sun7(ymd: string): number {
  const [yRaw, moRaw, dRaw] = ymd.split('-');
  const y = Number.parseInt(yRaw ?? '', 10);
  const mo = Number.parseInt(moRaw ?? '', 10);
  const d = Number.parseInt(dRaw ?? '', 10);
  if (Number.isNaN(y) || Number.isNaN(mo) || Number.isNaN(d)) return 1;
  const utc = new Date(Date.UTC(y, mo - 1, d));
  const dow = utc.getUTCDay();
  return dow === 0 ? 7 : dow;
}

/** Yerel tarih `anchorYmd`'nin haftasında Pazartesi–Pazar (dahil) YYYY-MM-DD. */
export function calendarWeekMondayToSunday(anchorYmd: string): {
  weekStart: string;
  weekEnd: string;
} {
  const iso = isoWeekdayMon1Sun7(anchorYmd);
  const weekStart = addCalendarDaysIso(anchorYmd, 1 - iso);
  const weekEnd = addCalendarDaysIso(weekStart, 6);
  return { weekStart, weekEnd };
}
