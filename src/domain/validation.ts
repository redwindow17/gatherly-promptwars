import * as z from 'zod/mini';
import english from 'zod/v4/locales/en.js';
import type { AIAdvice, EventBrief, Plan } from './types';
import { isCalendarDate, isIanaTimeZone, localToday } from './dates';
export { isCalendarDate, localToday, shiftDate } from './dates';

// Mini avoids shipping unused schema classes while retaining readable errors.
z.config(english());

export const MAX_MONEY_PAISE = 10_000_000_000;
const money = z.int().check(z.minimum(0), z.maximum(MAX_MONEY_PAISE));
const text = (max: number, min = 1) =>
  z.string().check(z.trim(), z.minLength(min), z.maxLength(max));
const identifier = text(100).check(z.regex(/^[A-Za-z0-9_-]+$/, 'Invalid identifier'));

const calendarDate = z
  .string()
  .check(z.refine(isCalendarDate, 'Use a real date in YYYY-MM-DD format'));
const briefSchema = z.strictObject({
  title: text(120, 2),
  type: z.enum(['wedding', 'birthday', 'community']),
  date: calendarDate,
  location: text(120, 2),
  guests: z.int().check(z.minimum(1), z.maximum(10_000)),
  budgetPaise: money.check(z.minimum(10_000)),
  priorities: z.array(text(80)).check(z.maxLength(5)),
  notes: text(2000, 0),
  timeZone: z.optional(text(100).check(z.refine(isIanaTimeZone, 'Use a valid IANA time zone'))),
});

const ideaSchema = z.strictObject({ title: text(120), description: text(1000) });
const adviceSchema = z.strictObject({
  summary: text(1600),
  budget: z
    .array(
      z.strictObject({
        category: text(80),
        weight: z.number().check(z.minimum(0.1), z.maximum(100)),
        rationale: text(500),
      }),
    )
    .check(z.minLength(3), z.maxLength(12)),
  tasks: z
    .array(
      z.strictObject({
        title: text(160),
        daysBefore: z.int().check(z.minimum(0), z.maximum(1826)),
        owner: text(80),
      }),
    )
    .check(z.minLength(3), z.maxLength(30)),
  vendors: z
    .array(
      z.strictObject({
        category: text(80),
        questions: z.array(text(300)).check(z.minLength(1), z.maxLength(8)),
      }),
    )
    .check(z.minLength(1), z.maxLength(12)),
  ideas: z.array(ideaSchema).check(z.minLength(1), z.maxLength(12)),
  cautions: z.array(text(500)).check(z.maxLength(10)),
});

function parse<T>(schema: z.ZodMiniType<T>, value: unknown, label: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const issue = result.error.issues[0];
  const field = issue.path.join('.') || label;
  throw new Error(`${label}: ${field} — ${issue.message}.`);
}

export function validateBrief(value: unknown, today?: string): EventBrief {
  const brief = parse(briefSchema, value, 'Event details');
  const planningDate = today ?? localToday(new Date(), brief.timeZone);
  if (!isCalendarDate(planningDate)) throw new Error('Choose a valid planning date.');
  const latest = new Date(`${planningDate}T00:00:00.000Z`);
  latest.setUTCFullYear(latest.getUTCFullYear() + 5);
  if (brief.date < planningDate) throw new Error('Event date must be today or later.');
  if (brief.date > latest.toISOString().slice(0, 10))
    throw new Error('Event date must be within the next five years.');
  return brief;
}

export function validateAdvice(value: unknown): AIAdvice {
  return parse(adviceSchema, value, 'Plan suggestions');
}

const planSchema = z
  .strictObject({
    id: identifier,
    createdAt: z.iso.datetime(),
    brief: briefSchema,
    budgetItems: z
      .array(
        z.strictObject({
          id: identifier,
          category: text(80),
          amountPaise: money,
          rationale: text(500),
        }),
      )
      .check(z.minLength(1), z.maxLength(12)),
    reservePaise: money,
    tasks: z
      .array(
        z.strictObject({
          id: identifier,
          title: text(160),
          date: calendarDate,
          owner: text(80),
          done: z.boolean(),
          urgent: z.boolean(),
        }),
      )
      .check(z.minLength(1), z.maxLength(30)),
    vendors: z
      .array(
        z.strictObject({
          id: identifier,
          category: text(80),
          questions: z
            .array(z.strictObject({ id: identifier, text: text(300), done: z.boolean() }))
            .check(z.minLength(1), z.maxLength(8)),
        }),
      )
      .check(z.minLength(1), z.maxLength(12)),
    ideas: z.array(ideaSchema).check(z.minLength(1), z.maxLength(12)),
    summary: text(1600),
    cautions: z.array(text(500)).check(z.maxLength(10)),
    source: z.enum(['gemini', 'starter']),
    ai: z.optional(
      z.strictObject({ prompt: text(12_000), response: text(50_000), model: text(100) }),
    ),
  })
  .check(
    z.superRefine((plan, context) => {
      const ids = [
        plan.id,
        ...plan.budgetItems.map((item) => item.id),
        ...plan.tasks.map((task) => task.id),
        ...plan.vendors.flatMap((vendor) => [
          vendor.id,
          ...vendor.questions.map((question) => question.id),
        ]),
      ];
      if (new Set(ids).size !== ids.length)
        context.addIssue({
          code: 'custom',
          message: 'Each plan item needs a unique identifier',
        });
      if (plan.tasks.some((task) => task.date > plan.brief.date))
        context.addIssue({
          code: 'custom',
          path: ['tasks'],
          message: 'Planning tasks cannot fall after the event',
        });
    }),
  );

/** Historical plans remain readable: future-date rules apply only to new briefs. */
export function validateStoredPlan(value: unknown): Plan {
  return parse(planSchema, value, 'Saved plan');
}
