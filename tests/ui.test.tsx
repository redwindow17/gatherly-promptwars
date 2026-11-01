// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../src/App';
import { createPlan } from '../src/domain/planner';
import { starterAdvice } from '../src/domain/starter';
import { localToday, shiftDate } from '../src/domain/validation';
import { loadPlans, savePlans } from '../src/lib/storage';
import type { EventBrief, Plan } from '../src/domain/types';

const storageKey = 'gatherly.plans.v1';

function fixture(index = 0): Plan {
  const brief: EventBrief = {
    title: `Gathering ${index + 1}`,
    type: 'birthday',
    date: shiftDate(localToday(), 90),
    location: 'Chennai',
    guests: 30,
    budgetPaise: 3_000_000,
    priorities: ['Guest experience'],
    notes: '',
  };
  const plan = createPlan(brief, starterAdvice(brief), 'starter');
  plan.createdAt = new Date(Date.now() - (20 - index) * 1000).toISOString();
  return plan;
}

beforeEach(() => {
  localStorage.clear();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: RequestInfo | URL) => {
      if (String(input) === '/api/health') {
        return new Response(JSON.stringify({ aiConfigured: true, model: 'test-model' }), {
          headers: { 'Content-Type': 'application/json' },
        });
      }
      const plan = fixture(99);
      plan.source = 'gemini';
      return new Response(JSON.stringify({ plan }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('UI persistence guarantees', () => {
  it('keeps the unsaved status after a quota warning is dismissed, until a write succeeds', async () => {
    const user = userEvent.setup();
    const original = fixture();
    savePlans([original]);
    const originalPayload = localStorage.getItem(storageKey);
    render(<App />);
    await screen.findByText('Gemini connected');
    await user.click(screen.getByRole('button', { name: 'Budget' }));

    const write = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError');
    });
    const amount = screen.getByRole('textbox', {
      name: `${original.budgetItems[0].category} amount in rupees`,
    });
    await user.clear(amount);
    await user.type(amount, '99999.99');
    await user.tab();

    await screen.findByRole('button', { name: 'Dismiss storage warning' });
    expect(localStorage.getItem(storageKey)).toBe(originalPayload);
    expect(screen.getByText('Changes in this tab only')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Dismiss storage warning' }));
    expect(screen.queryByRole('button', { name: 'Dismiss storage warning' })).toBeNull();
    expect(screen.getByText('Changes in this tab only')).toBeTruthy();
    expect(screen.queryByText('Changes saved in this browser')).toBeNull();
    expect((amount as HTMLInputElement).value).toBe('99999.99');
    expect(localStorage.getItem(storageKey)).toBe(originalPayload);

    write.mockRestore();
    await user.clear(amount);
    await user.type(amount, '88888.88');
    await user.tab();
    await screen.findByText('Changes saved in this browser');
    expect(loadPlans()[0].budgetItems[0].amountPaise).toBe(8_888_888);
  }, 20_000);

  it.each(['gemini', 'starter'] as const)(
    'blocks a %s revision at twelve plans and preserves the oldest plan’s manual edits',
    async (source) => {
      const user = userEvent.setup();
      const originals = Array.from({ length: 12 }, (_, index) => fixture(index));
      originals[0].budgetItems[0].amountPaise += 777;
      originals[0].tasks[0].done = true;
      savePlans(originals);
      const originalPayload = localStorage.getItem(storageKey);
      const savedBefore = loadPlans();
      render(<App />);
      await screen.findByText('Gemini connected');

      const savedNavigation = screen.getByRole('navigation', { name: 'Local saved plans' });
      await user.click(
        within(savedNavigation)
          .getByText(originals[0].brief.title, { exact: true })
          .closest('button')!,
      );
      await user.click(screen.getByRole('button', { name: 'Edit brief' }));
      const title = screen.getByRole('textbox', { name: 'Event name' });
      await user.clear(title);
      await user.paste('Revised gathering');
      await user.click(
        screen.getByRole('button', {
          name: source === 'gemini' ? 'Create a new Gemini plan' : 'Use a starter plan',
        }),
      );

      await waitFor(() => {
        const alert = screen.getByRole('alert');
        expect(alert.textContent).toMatch(/12/);
        expect(alert.textContent).toMatch(/export|print/i);
        expect(alert.textContent).toMatch(/delete/i);
      });
      expect(vi.mocked(fetch).mock.calls.some(([input]) => String(input) === '/api/plan')).toBe(
        false,
      );
      expect(localStorage.getItem(storageKey)).toBe(originalPayload);
      expect(loadPlans()).toEqual(savedBefore);
      expect(within(savedNavigation).getAllByRole('button', { name: /^Gathering / })).toHaveLength(
        12,
      );
      expect((title as HTMLInputElement).value).toBe('Revised gathering');
      await user.click(screen.getByRole('button', { name: 'Back to your plan' }));
      await user.click(screen.getByRole('button', { name: 'Budget' }));
      expect(
        (
          screen.getByRole('textbox', {
            name: `${originals[0].budgetItems[0].category} amount in rupees`,
          }) as HTMLInputElement
        ).value,
      ).toBe(String(originals[0].budgetItems[0].amountPaise / 100));
      await user.click(screen.getByRole('button', { name: /^Timeline/ }));
      expect(
        (
          screen.getByRole('checkbox', {
            name: `Mark ${originals[0].tasks[0].title} incomplete`,
          }) as HTMLInputElement
        ).checked,
      ).toBe(true);
    },
    20_000,
  );
});
