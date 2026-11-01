import type { Plan } from './types';
import { shiftDate } from './validation';

const escapeText = (value: string) => value.replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '');

/** RFC 5545 folds at 75 octets, including the continuation space. */
function foldLine(line: string): string {
  const encoder = new TextEncoder();
  let output = '';
  let bytes = 0;
  for (const character of line) {
    const length = encoder.encode(character).length;
    if (bytes + length > 75) { output += '\r\n '; bytes = 1; }
    output += character;
    bytes += length;
  }
  return output;
}

export function exportPlanCalendar(plan: Plan): string {
  const stamp = new Date(plan.createdAt).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const date = (value: string) => value.replace(/-/g, '');
  const entry = (uid: string, title: string, day: string, description: string, completed = false) => [
    'BEGIN:VEVENT', `UID:${escapeText(uid)}@gatherly.local`, `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${date(day)}`, `DTEND;VALUE=DATE:${date(shiftDate(day, 1))}`,
    `SUMMARY:${escapeText(title)}`, `DESCRIPTION:${escapeText(description)}`,
    `LOCATION:${escapeText(plan.brief.location)}`, `STATUS:${completed ? 'CONFIRMED' : 'TENTATIVE'}`, 'END:VEVENT',
  ];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Gatherly//Event Planner//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    ...entry(plan.id, plan.brief.title, plan.brief.date, plan.summary),
    ...plan.tasks.flatMap((task) => entry(`${plan.id}-${task.id}`, task.title, task.date, `${plan.brief.title}\nOwner: ${task.owner}\n${task.done ? 'Completed' : 'To do'}${task.urgent && !task.done ? '\nNeeds attention now' : ''}`, task.done)),
    'END:VCALENDAR'];
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}
