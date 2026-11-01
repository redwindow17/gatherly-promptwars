import { afterEach, expect, it, vi } from 'vitest';
import { dateLabel } from '../src/components/format';

afterEach(() => vi.unstubAllEnvs());

it('keeps a calendar date unchanged when the device timezone changes after formatting', () => {
  vi.stubEnv('TZ', 'Pacific/Kiritimati');
  expect(dateLabel('2026-11-01')).toBe('1 November 2026');
  vi.stubEnv('TZ', 'Etc/GMT+12');
  expect(dateLabel('2026-11-01')).toBe('1 November 2026');
});
