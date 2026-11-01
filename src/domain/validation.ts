import { z } from 'zod';
import type { AIAdvice, EventBrief, Plan } from './types';

export const MAX_MONEY_PAISE = 10_000_000_000;
const money = z.number().finite().int().min(0).max(MAX_MONEY_PAISE);
const text = (max: number, min = 1) => z.string().trim().min(min).max(max);
const identifier = text(100).regex(/^[A-Za-z0-9_-]+$/, 'Invalid identifier');

/** Date-only values stay in UTC for arithmetic, so daylight saving cannot shift a task. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function localToday(now = new Date()): string {
  if (!Number.isFinite(now.getTime())) throw new Error('Choose a valid planning date.');
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

export function shiftDate(date: string, days: number): string {
  const parsed = new Date(`${date}T00:00:00.000Z`);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return parsed.toISOString().slice(0, 10);
}

const calendarDate = z.string().refine(isCalendarDate, 'Use a real date in YYYY-MM-DD format');
const briefSchema = z.object({
  title: text(120, 2),
  type: z.enum(['wedding', 'birthday', 'community']),
  date: calendarDate,
  location: text(120, 2),
  guests: z.number().finite().int().min(1).max(10_000),
  budgetPaise: money.min(10_000),
  priorities: z.array(text(80)).max(5),
  notes: text(2000, 0),
}).strict();

const ideaSchema = z.object({ title: text(120), description: text(1000) }).strict();
const adviceSchema = z.object({
  summary: text(1600),
  budget: z.array(z.object({ category: text(80), weight: z.number().finite().min(0.1).max(100), rationale: text(500) }).strict()).min(3).max(12),
  tasks: z.array(z.object({ title: text(160), daysBefore: z.number().int().min(0).max(1826), owner: text(80) }).strict()).min(3).max(30),
  vendors: z.array(z.object({ category: text(80), questions: z.array(text(300)).min(1).max(8) }).strict()).min(1).max(12),
  ideas: z.array(ideaSchema).min(1).max(12),
  cautions: z.array(text(500)).max(10),
}).strict();

function parse<T>(schema: z.ZodType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue.path.join('.') || label;
  throw new Error(`${label}: ${field} — ${issue.message}.`);
}

export function validateBrief(value: unknown, today = localToday()): EventBrief {
  const brief = parse(briefSchema, value, 'Event details');
  if (!isCalendarDate(today)) throw new Error('Choose a valid planning date.');
  const latest = new Date(`${today}T00:00:00.000Z`);
  latest.setUTCFullYear(latest.getUTCFullYear() + 5);
  if (brief.date < today) throw new Error('Event date must be today or later.');
  if (brief.date > latest.toISOString().slice(0, 10)) throw new Error('Event date must be within the next five years.');
  return brief;
}

export function validateAdvice(value: unknown): AIAdvice {
  return parse(adviceSchema, value, 'Plan suggestions');
}

const planSchema = z.object({
  id: identifier,
  createdAt: z.string().datetime(),
  brief: briefSchema,
  budgetItems: z.array(z.object({ id: identifier, category: text(80), amountPaise: money, rationale: text(500) }).strict()).min(1).max(12),
  reservePaise: money,
  tasks: z.array(z.object({ id: identifier, title: text(160), date: calendarDate, owner: text(80), done: z.boolean(), urgent: z.boolean() }).strict()).min(1).max(30),
  vendors: z.array(z.object({ id: identifier, category: text(80), questions: z.array(z.object({ id: identifier, text: text(300), done: z.boolean() }).strict()).min(1).max(8) }).strict()).min(1).max(12),
  ideas: z.array(ideaSchema).min(1).max(12),
  summary: text(1600),
  cautions: z.array(text(500)).max(10),
  source: z.enum(['gemini', 'starter']),
  ai: z.object({ prompt: text(12_000), response: text(50_000), model: text(100) }).strict().optional(),
}).strict().superRefine((plan, context) => {
  const ids = [plan.id, ...plan.budgetItems.map((item) => item.id), ...plan.tasks.map((task) => task.id), ...plan.vendors.flatMap((vendor) => [vendor.id, ...vendor.questions.map((question) => question.id)])];
  if (new Set(ids).size !== ids.length) context.addIssue({ code: z.ZodIssueCode.custom, message: 'Each plan item needs a unique identifier' });
  if (plan.tasks.some((task) => task.date > plan.brief.date)) context.addIssue({ code: z.ZodIssueCode.custom, path: ['tasks'], message: 'Planning tasks cannot fall after the event' });
});

/** Historical plans remain readable: future-date rules apply only to new briefs. */
export function validateStoredPlan(value: unknown): Plan {
  return parse(planSchema, value, 'Saved plan');
}
