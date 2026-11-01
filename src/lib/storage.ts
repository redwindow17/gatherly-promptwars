import type { Plan } from '../domain/types';
import { validateStoredPlan } from '../domain/validation';

const STORAGE_KEY = 'gatherly.plans.v1';
const MAX_PLANS = 12;
const MAX_SERIALIZED_LENGTH = 4_000_000;

function storage(): Storage {
  try {
    if (!globalThis.localStorage) throw new Error('Unavailable');
    return globalThis.localStorage;
  } catch { throw new Error('Browser storage is unavailable. Your current plan can still be used, but it cannot be saved on this device.'); }
}

function latest(plans: Plan[]): Plan[] {
  const sorted = [...plans].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const unique = new Map<string, Plan>();
  for (const plan of sorted) if (!unique.has(plan.id)) unique.set(plan.id, plan);
  return [...unique.values()].slice(0, MAX_PLANS);
}

export function loadPlans(): Plan[] {
  const target = storage();
  let raw: string | null;
  try { raw = target.getItem(STORAGE_KEY); }
  catch { throw new Error('Saved plans could not be read from browser storage. Try again with storage enabled.'); }
  if (raw === null) return [];
  try {
    if (raw.length > MAX_SERIALIZED_LENGTH) throw new Error('Saved data is too large.');
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null || !('version' in parsed) || parsed.version !== 1 || !('plans' in parsed) || !Array.isArray(parsed.plans) || parsed.plans.length > MAX_PLANS) throw new Error('Unsupported saved data.');
    return latest(parsed.plans.map(validateStoredPlan));
  } catch {
    try {
      target.setItem(`gatherly.plans.recovery.${Date.now()}`, raw);
      target.removeItem(STORAGE_KEY);
    } catch {
      throw new Error('Saved plans are damaged and could not be recovered automatically. The original data was kept. Free browser storage before trying again.');
    }
    throw new Error('Saved plans could not be opened. A recovery copy was kept on this device; you can now start a new plan.');
  }
}

export function savePlans(plans: Plan[]): void {
  if (!Array.isArray(plans) || plans.length > 100) throw new Error('Only valid saved plans can be stored.');
  const validated = plans.map(validateStoredPlan);
  const payload = JSON.stringify({ version: 1, plans: latest(validated) });
  if (payload.length > MAX_SERIALIZED_LENGTH) throw new Error('There is not enough browser storage for these plans. Remove older plans and try again.');
  const target = storage();
  try { target.setItem(STORAGE_KEY, payload); }
  catch { throw new Error('The plan could not be saved. Browser storage may be full or disabled. Keep this page open and free some space before trying again.'); }
}
