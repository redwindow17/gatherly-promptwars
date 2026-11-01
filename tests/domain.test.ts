import { describe, expect, it, vi } from 'vitest';
import { allocateBudget, budgetSummary, createPlan } from '../src/domain/planner';
import { validateAdvice, validateBrief, validateStoredPlan } from '../src/domain/validation';
import { starterAdvice } from '../src/domain/starter';
import { exportPlanCalendar } from '../src/domain/calendar';
import type { AIAdvice, EventBrief, Plan } from '../src/domain/types';

const today = '2026-11-01';
const now = new Date('2026-11-01T12:00:00.000Z');
const brief: EventBrief = {
  title: 'Asha’s birthday',
  type: 'birthday',
  date: '2026-11-02',
  location: 'Chennai',
  guests: 40,
  budgetPaise: 100_001,
  priorities: ['Food'],
  notes: 'Vegetarian food',
};
const advice: AIAdvice = {
  summary: 'An intimate celebration with thoughtful food and music.',
  budget: [
    { category: 'Food', weight: 1, rationale: 'Guest refreshments' },
    { category: 'Venue', weight: 1, rationale: 'Accessible space' },
    { category: 'Activities', weight: 1, rationale: 'Shared entertainment' },
  ],
  tasks: [
    { title: 'Book the venue', daysBefore: 30, owner: 'Host' },
    { title: 'Confirm dietary needs', daysBefore: 1, owner: 'Host' },
    { title: 'Check the room', daysBefore: 0, owner: 'Host' },
  ],
  vendors: [{ category: 'Caterer', questions: ['Can you handle vegetarian meals?'] }],
  ideas: [{ title: 'Memory corner', description: 'Invite guests to bring a photograph.' }],
  cautions: ['Confirm access before paying a deposit.'],
};
function plan(): Plan {
  return createPlan(brief, advice, 'starter', now);
}

describe('budget allocation', () => {
  it('assigns indivisible paise deterministically without losing money', () => {
    expect(allocateBudget(101, [1, 1, 1])).toEqual([34, 34, 33]);
    expect(allocateBudget(100, [0, 1, 3])).toEqual([0, 25, 75]);
    expect(allocateBudget(0, [1, 2])).toEqual([0, 0]);
    expect(allocateBudget(101, [0.1, 0.2, 0.3])).toEqual([17, 34, 50]);
    expect(allocateBudget(10_000_000_000, [1, 1, 1])).toEqual([
      3_333_333_334, 3_333_333_333, 3_333_333_333,
    ]);
  });
  it('rejects sparse weight arrays rather than returning unassigned categories', () => {
    const weights = [1, 2, 3];
    delete weights[1];
    expect(() => allocateBudget(100, weights)).toThrow(/weight/i);
  });
  it.each([-1, 1.2, Infinity, Number.MAX_SAFE_INTEGER])('rejects invalid total %s', (total) => {
    expect(() => allocateBudget(total, [1, 1])).toThrow(/budget|money|paise/i);
  });
  it.each([[], [0, 0], [-1, 2], [NaN, 1], [Infinity, 1]].map((weights) => [weights] as [number[]]))(
    'rejects invalid weights %s',
    (weights) => {
      expect(() => allocateBudget(100, weights)).toThrow(/weight/i);
    },
  );
  it('creates an explicit reserve and shows overspend without changing edited costs', () => {
    const saved = plan();
    expect(saved.reservePaise).toBe(10_000);
    expect(saved.budgetItems.map((item) => item.amountPaise)).toEqual([30_001, 30_000, 30_000]);
    saved.budgetItems[0].amountPaise = 80_000;
    const before = structuredClone(saved);
    expect(budgetSummary(saved)).toEqual({
      allocatedPaise: 140_000,
      committedPaise: 150_000,
      remainingPaise: 0,
      overBudgetPaise: 49_999,
      perGuestPaise: 2_500,
    });
    expect(saved).toEqual(before);
  });
});

describe('untrusted input validation', () => {
  it('accepts valid brief and trims free text', () => {
    expect(validateBrief({ ...brief, title: '  Community Lunch  ' }, today).title).toBe(
      'Community Lunch',
    );
  });
  it.each([
    { budgetPaise: 1.5 },
    { budgetPaise: 0 },
    { budgetPaise: '10000' },
    { guests: 2.5 },
    { guests: 0 },
    { guests: 10001 },
    { date: '2026-02-30' },
    { date: '2026-10-31' },
    { date: '2032-11-01' },
    { date: '2026-11-02T00:00:00Z' },
    { notes: 'x'.repeat(2001) },
    { priorities: Array(6).fill('food') },
  ])('rejects invalid brief fields %j', (change) => {
    expect(() => validateBrief({ ...brief, ...change }, today)).toThrow();
  });
  it('accepts bounded model advice but rejects excessive arrays and invalid offsets', () => {
    expect(validateAdvice(advice)).toEqual(advice);
    expect(() => validateAdvice({ ...advice, budget: Array(13).fill(advice.budget[0]) })).toThrow(
      /budget/i,
    );
    expect(() =>
      validateAdvice({
        ...advice,
        tasks: [{ ...advice.tasks[0], daysBefore: -1 }, ...advice.tasks.slice(1)],
      }),
    ).toThrow(/days|task/i);
    expect(() =>
      validateAdvice({
        ...advice,
        vendors: [{ category: 'Test', questions: Array(9).fill('Question?') }],
      }),
    ).toThrow(/question|vendor/i);
  });
  it('rejects forged persisted line amounts and task flags', () => {
    const saved = plan();
    expect(validateStoredPlan(saved)).toEqual(saved);
    expect(() =>
      validateStoredPlan({ ...saved, budgetItems: [{ ...saved.budgetItems[0], amountPaise: -5 }] }),
    ).toThrow();
    expect(() =>
      validateStoredPlan({ ...saved, tasks: [{ ...saved.tasks[0], done: 'yes' }] }),
    ).toThrow();
  });
  it('keeps valid historical plans readable while rejecting impossible saved dates', () => {
    const saved = plan();
    saved.brief.date = '2025-12-31';
    saved.tasks = saved.tasks.map((task) => ({ ...task, date: '2025-12-30' }));
    expect(validateStoredPlan(saved).brief.date).toBe('2025-12-31');
    expect(() =>
      validateStoredPlan({ ...saved, tasks: [{ ...saved.tasks[0], date: '2025-02-30' }] }),
    ).toThrow();
  });
});

describe('plan creation and starter templates', () => {
  it('makes tomorrow’s early tasks actionable today and flags urgency', () => {
    const saved = plan();
    expect(saved.tasks.map((task) => ({ date: task.date, urgent: task.urgent }))).toEqual([
      { date: '2026-11-01', urgent: true },
      { date: '2026-11-01', urgent: true },
      { date: '2026-11-02', urgent: false },
    ]);
    expect(saved.tasks.every((task) => task.done === false)).toBe(true);
    expect(
      new Set([...saved.tasks, ...saved.budgetItems, ...saved.vendors].map((item) => item.id)).size,
    ).toBe(7);
    expect(saved.source).toBe('starter');
    expect(saved.ai).toBeUndefined();
  });
  it.each(['wedding', 'birthday', 'community'] as const)(
    'provides contextual %s starter advice that passes the model schema',
    (type) => {
      const result = starterAdvice({ ...brief, type });
      expect(() => validateAdvice(result)).not.toThrow();
      expect(result.summary.toLowerCase()).toContain(type === 'community' ? 'community' : type);
      expect(result.summary).toContain('40');
      expect(result.summary).toContain('Chennai');
      expect(result.cautions.join(' ')).toMatch(/starter|template/i);
      expect(result.cautions.join(' ')).toMatch(/quote|estimate/i);
    },
  );
  it('clamps early tasks to today in the event brief timezone across the UTC date boundary', () => {
    const saved = createPlan(
      { ...brief, timeZone: 'Asia/Kolkata' },
      advice,
      'starter',
      new Date('2026-11-01T20:00:00.000Z'),
    );
    expect(saved.tasks.map((task) => ({ date: task.date, urgent: task.urgent }))).toEqual([
      { date: '2026-11-02', urgent: true },
      { date: '2026-11-02', urgent: true },
      { date: '2026-11-02', urgent: true },
    ]);
    expect(saved.brief.timeZone).toBe('Asia/Kolkata');
    expect(validateStoredPlan(saved).brief.timeZone).toBe('Asia/Kolkata');
  });
  it('accepts a same-day Los Angeles event while the UTC runtime is on the next date', () => {
    const saved = createPlan(
      { ...brief, date: '2026-11-01', timeZone: 'America/Los_Angeles' },
      advice,
      'starter',
      new Date('2026-11-02T02:00:00.000Z'),
    );
    expect(saved.tasks.map((task) => task.date)).toEqual([
      '2026-11-01',
      '2026-11-01',
      '2026-11-01',
    ]);
  });
  it('validates new event dates against their timezone while retaining the explicit today override', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-02T02:00:00.000Z'));
    try {
      const event = { ...brief, date: '2026-11-01', timeZone: 'America/Los_Angeles' };
      expect(validateBrief(event).date).toBe('2026-11-01');
      expect(() => validateBrief(event, '2026-11-02')).toThrow(/today or later/i);
      expect(() => validateBrief({ ...event, timeZone: 'Not/A_Timezone' }, today)).toThrow(
        /timeZone|time zone/i,
      );
      expect(() => validateBrief({ ...event, timeZone: '+05:30' }, today)).toThrow(
        /timeZone|time zone/i,
      );
    } finally {
      vi.useRealTimers();
    }
  });
  it('accepts recognised IANA aliases that contain digits', () => {
    expect(validateBrief({ ...brief, timeZone: 'EST5EDT' }, today).timeZone).toBe('EST5EDT');
  });
});

describe('calendar export', () => {
  it('escapes calendar text and keeps event/task dates as all-day entries', () => {
    const saved = plan();
    saved.brief.title = 'Lunch, music; fun\\family\nEND:VEVENT';
    const calendar = exportPlanCalendar(saved);
    expect(calendar).toContain('SUMMARY:Lunch\\, music\\; fun\\\\family\\nEND:VEVENT\r\n');
    expect(calendar).toContain('DTSTART;VALUE=DATE:20261102\r\nDTEND;VALUE=DATE:20261103');
    expect(calendar).toContain('DTSTART;VALUE=DATE:20261101');
    expect(calendar.match(/BEGIN:VEVENT/g)).toHaveLength(4);
    expect(calendar.replace(/\r\n/g, '')).not.toMatch(/[\r\n]/);
  });
  it('folds Unicode content to at most 75 UTF-8 bytes per physical line', () => {
    const saved = plan();
    saved.tasks[0].title = 'விழா '.repeat(40);
    const calendar = exportPlanCalendar(saved);
    for (const line of calendar.split('\r\n'))
      expect(new TextEncoder().encode(line).length).toBeLessThanOrEqual(75);
    expect(calendar).toContain('\r\n ');
    expect(calendar).not.toContain('\uFFFD');
  });
});
