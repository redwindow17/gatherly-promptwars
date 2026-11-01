import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import type { Plan } from '../src/domain/types';
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-11-01T12:00:00Z'));
});
afterEach(() => {
  vi.useRealTimers();
});
import { handleApi, type APIEnvironment } from '../worker/api';

const limiter = { limit: async () => ({ success: true }) };
const env: APIEnvironment = {
  GEMINI_API_KEY: 'test-key-not-a-secret',
  GEMINI_MODEL: 'gemini-3.8-flash',
  RATE_LIMITER: limiter,
  GLOBAL_LIMITER: limiter,
};
const brief = {
  title: 'Community supper',
  type: 'community',
  date: '2027-04-12',
  location: 'Chennai',
  guests: 80,
  budgetPaise: 5000000,
  priorities: ['Food'],
  notes: 'Vegetarian and step-free access',
};
const advice = {
  summary: 'A neighborhood meal with accessible seating.',
  budget: [
    { category: 'Food', weight: 6, rationale: 'Vegetarian supper' },
    { category: 'Venue', weight: 3, rationale: 'Step-free access' },
    { category: 'Decor', weight: 1, rationale: 'Reusable decorations' },
  ],
  tasks: [
    { title: 'Confirm venue', daysBefore: 30, owner: 'Host' },
    { title: 'Confirm food', daysBefore: 7, owner: 'Host' },
    { title: 'Welcome guests', daysBefore: 0, owner: 'Volunteers' },
  ],
  vendors: [{ category: 'Catering', questions: ['Can you provide vegetarian menus?'] }],
  ideas: [
    { title: 'Shared stories', description: 'Invite guests to share a neighborhood memory.' },
  ],
  cautions: ['Confirm all estimates with suppliers.'],
};
function req(body: unknown = brief, headers: Record<string, string> = {}) {
  return new Request('https://gatherly.example/api/plan', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://gatherly.example',
      'cf-connecting-ip': '192.0.2.1',
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
function provider(value: unknown = advice) {
  return vi.fn<typeof fetch>().mockResolvedValue(
    new Response(
      JSON.stringify({
        candidates: [
          { finishReason: 'STOP', content: { parts: [{ text: JSON.stringify(value) }] } },
        ],
      }),
      { headers: { 'content-type': 'application/json' } },
    ),
  );
}

describe('planning API boundary', () => {
  it('keeps a malformed upstream encoding classified as a provider failure', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response(new Uint8Array([0xc3, 0x28])));
    const response = await handleApi(req(), env, fetcher);
    expect(response.status).toBe(502);
    expect(await response.text()).toContain('existing plans are safe');
  });
  it('rejects malformed UTF-8 as client input rather than a provider outage', async () => {
    const request = new Request('https://gatherly.example/api/plan', {
      method: 'POST',
      headers: { 'content-type': 'application/json', origin: 'https://gatherly.example' },
      body: new Uint8Array([0x7b, 0x22, 0x78, 0x22, 0x3a, 0x22, 0xc3, 0x28, 0x22, 0x7d]),
    });
    const response = await handleApi(request, env, provider());
    expect(response.status).toBe(400);
    expect(await response.text()).toMatch(/UTF-8|encoding/i);
  });

  it('times out a stalled provider request and preserves a controlled error', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options?.signal?.addEventListener('abort', () =>
            reject(new DOMException('Aborted', 'AbortError')),
          );
        }),
    );
    const pending = handleApi(req(), env, fetcher);
    await vi.advanceTimersByTimeAsync(35_001);
    const response = await pending;
    expect(response.status).toBe(504);
    expect(await response.text()).toContain('existing work is safe');
  });
  it('rejects an oversized upstream response without returning partial data', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('x'.repeat(150_000)));
    const response = await handleApi(req(), env, fetcher);
    expect(response.status).toBe(502);
    expect(await response.text()).not.toContain('"plan"');
  });
  it('never returns the key from its configuration health check', async () => {
    const r = await handleApi(new Request('https://gatherly.example/api/health'), env);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ aiConfigured: true, model: 'gemini-3.8-flash' });
    expect(r.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects cross-origin requests before contacting the model', async () => {
    const fetcher = provider();
    const r = await handleApi(req(brief, { origin: 'https://evil.example' }), env, fetcher);
    expect(r.status).toBe(403);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('rejects non-JSON content', async () => {
    const r = await handleApi(req(brief, { 'content-type': 'text/plain' }), env, provider());
    expect(r.status).toBe(415);
  });
  it('rejects oversized streaming bodies even without Content-Length', async () => {
    const r = await handleApi(req({ ...brief, notes: 'x'.repeat(18000) }), env, provider());
    expect(r.status).toBe(413);
  });
  it('validates the event before making a paid model call', async () => {
    const fetcher = provider();
    const r = await handleApi(req({ ...brief, guests: -1 }), env, fetcher);
    expect(r.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('returns a helpful unavailable error when no secret is configured', async () => {
    const r = await handleApi(req(), { ...env, GEMINI_API_KEY: undefined }, provider());
    expect(r.status).toBe(503);
    expect(await r.text()).toContain('not configured');
  });
  it('fails closed if the deployment rate limiter is missing', async () => {
    const r = await handleApi(req(), { ...env, RATE_LIMITER: undefined }, provider());
    expect(r.status).toBe(503);
  });
  it('enforces the platform limiter without invoking Gemini', async () => {
    const fetcher = provider();
    const r = await handleApi(
      req(),
      { ...env, RATE_LIMITER: { limit: async () => ({ success: false }) } },
      fetcher,
    );
    expect(r.status).toBe(429);
    expect(r.headers.get('retry-after')).toBe('60');
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('returns a validated plan with an accurate prompt and response record', async () => {
    const fetcher = provider();
    const r = await handleApi(req(), env, fetcher);
    expect(r.status).toBe(200);
    const data = (await r.json()) as { plan: Plan };
    expect(data.plan.source).toBe('gemini');
    expect(data.plan.brief).toEqual(brief);
    expect(data.plan.ai?.prompt).toContain('Vegetarian and step-free access');
    expect(data.plan.ai?.response).toContain('Shared stories');
    expect(
      data.plan.reservePaise +
        data.plan.budgetItems.reduce(
          (n: number, b: { amountPaise: number }) => n + b.amountPaise,
          0,
        ),
    ).toBe(brief.budgetPaise);
    const [url, options] = fetcher.mock.calls[0];
    expect(String(url)).not.toContain(env.GEMINI_API_KEY);
    expect(new Headers(options?.headers).get('x-goog-api-key')).toBe(env.GEMINI_API_KEY);
  });
  it('rejects invalid model data without presenting it as a completed plan', async () => {
    const r = await handleApi(
      req(),
      env,
      provider({ ...advice, budget: [{ category: 'Venue', weight: -1, rationale: 'bad' }] }),
    );
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain('"plan"');
  });
  it('does not leak upstream authentication or diagnostic details', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('sensitive upstream diagnostic', { status: 403 }));
    const r = await handleApi(req(), env, fetcher);
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain('sensitive');
  });
  it('exposes provider quota failure as retryable without an automatic retry loop', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('quota', { status: 429 }));
    const r = await handleApi(req(), env, fetcher);
    expect(r.status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('handles a provider network failure with a controlled response', async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockRejectedValue(new Error('private internal network info'));
    const r = await handleApi(req(), env, fetcher);
    expect(r.status).toBe(502);
    expect(await r.text()).not.toContain('private');
  });
  it('rejects incomplete generations instead of parsing truncated output', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          candidates: [
            {
              finishReason: 'MAX_TOKENS',
              content: { parts: [{ text: JSON.stringify(advice) }] },
            },
          ],
        }),
      ),
    );
    const r = await handleApi(req(), env, fetcher);
    expect(r.status).toBe(502);
  });
});
