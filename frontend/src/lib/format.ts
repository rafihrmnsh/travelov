const idrFormatter = new Intl.NumberFormat('id-ID', { maximumFractionDigits: 0 });

/**
 * Parses a date-only string ("2026-10-15") as a *local* date.
 * `new Date("2026-10-15")` is parsed as UTC midnight and can shift a day in
 * negative-offset timezones, so we build the date explicitly.
 */
export function parseDateOnly(value: string | Date): Date {
  if (value instanceof Date) return value;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

/** "Rp 1.250.000" */
export function formatIDR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  return `Rp ${idrFormatter.format(Math.round(amount))}`;
}

/** "1,2 jt" / "950 rb" — compact form for dense listings. */
export function formatCompactIDR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return '—';
  if (amount >= 1_000_000) return `Rp ${(amount / 1_000_000).toFixed(amount % 1_000_000 === 0 ? 0 : 1)} jt`;
  if (amount >= 1_000) return `Rp ${Math.round(amount / 1_000)} rb`;
  return formatIDR(amount);
}

const shortDate = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const longDate = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const shortDateNoYear = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' });

/** "15 Okt 2026" */
export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  return shortDate.format(parseDateOnly(value));
}

/** "Kamis, 15 Oktober 2026" */
export function formatDateLong(value: string | null | undefined): string {
  if (!value) return '—';
  return longDate.format(parseDateOnly(value));
}

/** "15 Okt" */
export function formatDateShort(value: string | null | undefined): string {
  if (!value) return '—';
  return shortDateNoYear.format(parseDateOnly(value));
}

/** "15 Okt 2026, 14.30" */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  const time = new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit' }).format(date);
  return `${shortDate.format(date)}, ${time}`;
}

/** Formats a duration in ms as "12:34" or "1j 02m". */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00';
  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return hours > 0 ? `${hours}j ${pad(minutes)}m` : `${pad(minutes)}:${pad(seconds)}`;
}

/** "4,5" */
export function formatRating(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toFixed(1).replace('.', ',');
}

/** Nights between two date-only values (check-out minus check-in). */
export function diffNights(checkIn: string | null | undefined, checkOut: string | null | undefined): number {
  if (!checkIn || !checkOut) return 0;
  const start = parseDateOnly(checkIn).getTime();
  const end = parseDateOnly(checkOut).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}

/** yyyy-mm-dd in local time — the format the API expects for date-only fields. */
export function toDateInputValue(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

export function todayISO(): string {
  return toDateInputValue(new Date());
}

export function daysFromNowISO(days: number): string {
  return toDateInputValue(addDays(new Date(), days));
}

/** Pluralises an Indonesian noun: 1 malam, 2 malam (Indonesian has no plural form). */
export function nightsLabel(nights: number): string {
  return `${nights} malam`;
}
