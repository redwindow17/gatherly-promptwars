import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPlans, savePlans } from '../src/lib/storage';
import type { Plan } from '../src/domain/types';

const key = 'gatherly.plans.v1';
let data: Map<string, string>;
const fixture: Plan = {
  id: 'plan-one',
  createdAt: '2026-11-01T12:00:00.000Z',
  source: 'starter',
  brief: {
    title: 'Birthday celebration',
    type: 'birthday',
    date: '2026-11-02',
    location: 'Chennai',
    guests: 10,
    budgetPaise: 10000,
    priorities: [],
    notes: '',
  },
  budgetItems: [{ id: 'cost-one', category: 'Food', amountPaise: 9000, rationale: 'Refreshments' }],
  reservePaise: 1000,
  tasks: [
    {
      id: 'task-one',
      title: 'Confirm guests',
      date: '2026-11-01',
      owner: 'Host',
      done: false,
      urgent: true,
    },
  ],
  vendors: [
    {
      id: 'vendor-one',
      category: 'Caterer',
      questions: [{ id: 'question-one', text: 'Dietary options?', done: false }],
    },
  ],
  ideas: [{ title: 'Music', description: 'Ask guests for a song.' }],
  summary: 'A small birthday.',
  cautions: ['Check current quotes.'],
};
beforeEach(() => {
  data = new Map();
  vi.stubGlobal('localStorage', {
    getItem: (name: string) => data.get(name) ?? null,
    setItem: (name: string, value: string) => {
      data.set(name, value);
    },
    removeItem: (name: string) => {
      data.delete(name);
    },
  });
});
afterEach(() => vi.unstubAllGlobals());
describe('versioned plan persistence', () => {
  it('keeps an unchanged saved plan available even if further writes are blocked', () => {
    savePlans([fixture]);
    const previous = data.get(key);
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => savePlans([structuredClone(fixture)])).not.toThrow();
    expect(data.get(key)).toBe(previous);
    expect(loadPlans()).toEqual([fixture]);
  });
  it('rechecks externally replaced data before overwriting the same storage object', () => {
    savePlans([fixture]);
    data.set(key, 'damaged by another tab');
    vi.spyOn(localStorage, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    expect(() => savePlans([{ ...fixture, summary: 'Changed in this tab' }])).toThrow(
      /recover|original/i,
    );
    expect(data.get(key)).toBe('damaged by another tab');
  });

  it('starts empty and roundtrips edited values and completed tasks', () => {
    expect(loadPlans()).toEqual([]);
    const saved = structuredClone(fixture);
    saved.budgetItems[0].amountPaise = 20000;
    saved.tasks[0].done = true;
    savePlans([saved]);
    expect(loadPlans()).toEqual([saved]);
    expect(JSON.parse(data.get(key)!)).toMatchObject({ version: 1 });
  });
  it('retains the 12 latest distinct plans without mutating the caller', () => {
    const plans = Array.from({ length: 14 }, (_, index) => ({
      ...structuredClone(fixture),
      id: `plan-${index}`,
      createdAt: `2026-11-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
    }));
    savePlans(plans);
    expect(loadPlans().map((saved) => saved.id)).toEqual([
      'plan-13',
      'plan-12',
      'plan-11',
      'plan-10',
      'plan-9',
      'plan-8',
      'plan-7',
      'plan-6',
      'plan-5',
      'plan-4',
      'plan-3',
      'plan-2',
    ]);
    expect(plans[0].id).toBe('plan-0');
  });
  it.each([
    'broken JSON',
    JSON.stringify({ version: 2, plans: [] }),
    JSON.stringify({ version: 1, plans: [{ ...fixture, reservePaise: -1 }] }),
  ])('backs up corrupt data, reports recovery, and permits a fresh start', (raw) => {
    data.set(key, raw);
    expect(() => loadPlans()).toThrow(/saved|storage|recover/i);
    expect([...data.keys()].some((name) => name.startsWith('gatherly.plans.recovery.'))).toBe(true);
    expect(loadPlans()).toEqual([]);
    savePlans([fixture]);
    expect(loadPlans()).toEqual([fixture]);
  });
  it('preserves the prior payload and reports a quota failure visibly', () => {
    savePlans([fixture]);
    const previous = data.get(key);
    vi.stubGlobal('localStorage', {
      getItem: (name: string) => data.get(name) ?? null,
      setItem: () => {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      },
      removeItem: (name: string) => data.delete(name),
    });
    expect(() => savePlans([])).toThrow(/storage|space|save/i);
    expect(data.get(key)).toBe(previous);
  });
  it('rejects an invalid plan before overwriting saved data', () => {
    savePlans([fixture]);
    expect(() => savePlans([{ ...fixture, brief: { ...fixture.brief, guests: 0 } }])).toThrow();
    expect(loadPlans()).toEqual([fixture]);
  });
  it('keeps damaged original data when the recovery backup cannot be written', () => {
    data.set(key, 'damaged');
    vi.stubGlobal('localStorage', {
      getItem: (name: string) => data.get(name) ?? null,
      setItem: () => {
        throw new Error('Storage disabled');
      },
      removeItem: (name: string) => data.delete(name),
    });
    expect(() => loadPlans()).toThrow(/original data was kept/i);
    expect(data.get(key)).toBe('damaged');
  });
  it('blocks a later save when unrecovered original data still cannot be backed up', () => {
    const damaged = JSON.stringify({
      version: 1,
      plans: [fixture, { ...fixture, id: 'damaged-plan', reservePaise: -1 }],
    });
    data.set(key, damaged);
    vi.stubGlobal('localStorage', {
      getItem: (name: string) => data.get(name) ?? null,
      setItem: (name: string, value: string) => {
        if (name.startsWith('gatherly.plans.recovery.'))
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        data.set(name, value);
      },
      removeItem: (name: string) => {
        data.delete(name);
      },
    });
    expect(() => loadPlans()).toThrow(/original data was kept/i);
    expect(() => savePlans([{ ...fixture, id: 'new-plan' }])).toThrow(/original|recover|backup/i);
    expect(data.get(key)).toBe(damaged);
  });
  it('backs up the unrecovered original before saving after storage becomes writable', () => {
    const damaged = JSON.stringify({
      version: 1,
      plans: [fixture, { ...fixture, id: 'damaged-plan', reservePaise: -1 }],
    });
    data.set(key, damaged);
    let writable = false;
    vi.stubGlobal('localStorage', {
      getItem: (name: string) => data.get(name) ?? null,
      setItem: (name: string, value: string) => {
        if (!writable) throw new DOMException('Quota exceeded', 'QuotaExceededError');
        data.set(name, value);
      },
      removeItem: (name: string) => {
        data.delete(name);
      },
    });
    expect(() => loadPlans()).toThrow(/original data was kept/i);
    writable = true;
    savePlans([{ ...fixture, id: 'new-plan' }]);
    expect(
      [...data.entries()].find(([name]) => name.startsWith('gatherly.plans.recovery.'))?.[1],
    ).toBe(damaged);
    expect(loadPlans().map((saved) => saved.id)).toEqual(['new-plan']);
  });
  it('reports storage unavailability without losing the in-memory plan', () => {
    vi.stubGlobal('localStorage', undefined);
    expect(() => savePlans([fixture])).toThrow(/storage.*unavailable/i);
    expect(() => loadPlans()).toThrow(/storage.*unavailable/i);
    expect(fixture.budgetItems[0].amountPaise).toBe(9000);
  });
});
