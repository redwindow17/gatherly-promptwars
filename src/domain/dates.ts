// Intl formatters are immutable and expensive. Bound the cache because zones are input.
const timeZoneFormats = new Map<string, Intl.DateTimeFormat>();
function timeZoneFormat(timeZone: string): Intl.DateTimeFormat {
  const existing = timeZoneFormats.get(timeZone);
  if (existing) return existing;
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    calendar: 'iso8601',
    numberingSystem: 'latn',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  if (timeZoneFormats.size >= 32) timeZoneFormats.delete(timeZoneFormats.keys().next().value!);
  timeZoneFormats.set(timeZone, formatter);
  return formatter;
}

/** Date-only values stay in UTC for arithmetic, so daylight saving cannot shift a task. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function isIanaTimeZone(value: string): boolean {
  if (!/^[A-Za-z][A-Za-z0-9_+-]*(?:\/[A-Za-z0-9_+-]+)*$/.test(value)) return false;
  try {
    timeZoneFormat(value);
    return true;
  } catch {
    return false;
  }
}

export function localToday(now = new Date(), timeZone?: string): string {
  if (!Number.isFinite(now.getTime())) throw new Error('Choose a valid planning date.');
  if (timeZone !== undefined) {
    if (!isIanaTimeZone(timeZone)) throw new Error('Choose a valid IANA time zone.');
    const parts = timeZoneFormat(timeZone).formatToParts(now);
    const part = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((value) => value.type === type)!.value;
    return `${part('year').padStart(4, '0')}-${part('month')}-${part('day')}`;
  }
  // Legacy briefs without a zone retain their runtime-local interpretation.
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function shiftDate(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}
