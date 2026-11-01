import type { EventType } from '../domain/types';
import { localToday } from '../domain/dates';
export { localToday } from '../domain/dates';

export const EVENT_LABELS: Record<EventType, string> = {
  wedding: 'Wedding',
  birthday: 'Birthday',
  community: 'Community event',
};
const rupees = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2,
});
export function money(paise: number): string {
  return rupees.format(paise / 100);
}
const dateFormats = new Map<string, Intl.DateTimeFormat>();
export function dateLabel(
  date: string,
  options: Pick<Intl.DateTimeFormatOptions, 'day' | 'month' | 'year' | 'weekday'> = {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  },
): string {
  const key = JSON.stringify(options);
  let formatter = dateFormats.get(key);
  if (!formatter) {
    // A calendar day has no instant/timezone; keep it stable when the device zone changes.
    formatter = new Intl.DateTimeFormat('en-IN', { ...options, timeZone: 'UTC' });
    if (dateFormats.size >= 8) dateFormats.delete(dateFormats.keys().next().value!);
    dateFormats.set(key, formatter);
  }
  const parsed = new Date(`${date}T12:00:00Z`);
  return Number.isFinite(parsed.getTime()) ? formatter.format(parsed) : 'Invalid Date';
}
export function daysTo(date: string): number {
  return Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${localToday()}T00:00:00Z`)) / 86_400_000,
  );
}
export function rupeesToPaise(value: string): number | null {
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return null;
  const [whole, fraction = ''] = value.trim().split('.');
  const paise = Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  return Number.isSafeInteger(paise) ? paise : null;
}
export function saveTextFile(content: string, filename: string, type: string): void {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
