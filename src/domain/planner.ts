import type { AIAdvice, BudgetSummary, EventBrief, Plan } from './types';
import { localToday, MAX_MONEY_PAISE, shiftDate, validateAdvice, validateBrief } from './validation';

/** Largest-remainder allocation preserves every paise; equal remainders use input order. */
export function allocateBudget(total: number, weights: number[]): number[] {
  if (!Number.isSafeInteger(total) || total < 0 || total > MAX_MONEY_PAISE) throw new Error('Budget must be a non-negative integer amount in paise within the supported range.');
  if (!Array.isArray(weights) || weights.length < 1 || weights.length > 1000 || Array.from(weights).some((weight) => !Number.isFinite(weight) || weight < 0) || !weights.some((weight) => weight > 0)) throw new Error('Budget weights must contain finite, non-negative values with at least one positive weight.');
  // Normalizing first avoids overflow even for large, otherwise valid weights.
  const largest = Math.max(...weights);
  const normalized = weights.map((weight) => weight / largest);
  const sum = normalized.reduce((value, weight) => value + weight, 0);
  const shares = normalized.map((weight) => (total * weight) / sum);
  const amounts = shares.map(Math.floor);
  const remainderOrder = shares.map((share, index) => ({ index, fraction: share - amounts[index] }))
    .sort((left, right) => right.fraction - left.fraction || left.index - right.index);
  const remainder = total - amounts.reduce((value, amount) => value + amount, 0);
  for (let index = 0; index < remainder; index++) amounts[remainderOrder[index % remainderOrder.length].index]++;
  return amounts;
}

const id = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function createPlan(brief: EventBrief, advice: AIAdvice, source: Plan['source'], now = new Date()): Plan {
  const today = localToday(now);
  const event = validateBrief(brief, today);
  const suggestions = validateAdvice(advice);
  if (source !== 'gemini' && source !== 'starter') throw new Error('Choose a valid plan source.');
  const reservePaise = Math.floor(event.budgetPaise / 10);
  const amounts = allocateBudget(event.budgetPaise - reservePaise, suggestions.budget.map((item) => item.weight));
  return {
    id: id('plan'),
    createdAt: now.toISOString(),
    brief: event,
    budgetItems: suggestions.budget.map((item, index) => ({ id: id('cost'), category: item.category, amountPaise: amounts[index], rationale: item.rationale })),
    reservePaise,
    tasks: suggestions.tasks.map((task) => {
      const target = shiftDate(event.date, -task.daysBefore);
      return { id: id('task'), title: task.title, date: target < today ? today : target, owner: task.owner, done: false, urgent: target <= today };
    }).sort((left, right) => left.date.localeCompare(right.date)),
    vendors: suggestions.vendors.map((vendor) => ({ id: id('vendor'), category: vendor.category, questions: vendor.questions.map((question) => ({ id: id('question'), text: question, done: false })) })),
    ideas: suggestions.ideas,
    summary: suggestions.summary,
    cautions: suggestions.cautions,
    source,
  };
}

export function budgetSummary(plan: Plan): BudgetSummary {
  const allocatedPaise = plan.budgetItems.reduce((sum, item) => sum + item.amountPaise, 0);
  const committedPaise = allocatedPaise + plan.reservePaise;
  return {
    allocatedPaise,
    committedPaise,
    remainingPaise: Math.max(0, plan.brief.budgetPaise - committedPaise),
    overBudgetPaise: Math.max(0, committedPaise - plan.brief.budgetPaise),
    perGuestPaise: Math.floor(plan.brief.budgetPaise / plan.brief.guests),
  };
}
