import { validateBrief } from '../src/domain/validation';
import { createPlan } from '../src/domain/planner';
import { generateAdvice } from './gemini';
import { HTTPError, json, readBounded } from './http';

export type APIEnvironment = Pick<Env, 'GEMINI_MODEL'> &
  Partial<Pick<Env, 'GEMINI_API_KEY' | 'RATE_LIMITER' | 'GLOBAL_LIMITER'>>;

function sameOrigin(request: Request): boolean {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (!origin) return request.headers.get('sec-fetch-site') !== 'cross-site';
  if (origin === url.origin) return true;
  // Vite's loopback development proxy uses a different local port.
  try {
    const source = new URL(origin);
    return (
      ['localhost', '127.0.0.1'].includes(url.hostname) &&
      source.hostname === url.hostname &&
      source.protocol === url.protocol
    );
  } catch {
    return false;
  }
}

export async function handleApi(
  request: Request,
  env: APIEnvironment,
  fetcher: typeof fetch = fetch,
): Promise<Response> {
  try {
    const url = new URL(request.url);
    if (url.pathname === '/api/health' && request.method === 'GET')
      return json({ aiConfigured: Boolean(env.GEMINI_API_KEY?.trim()), model: env.GEMINI_MODEL });
    if (url.pathname !== '/api/plan') return json({ error: 'Endpoint not found.' }, 404);
    if (request.method !== 'POST') return json({ error: 'Use POST to generate a plan.' }, 405);
    if (!sameOrigin(request))
      throw new HTTPError(403, 'Please generate your plan from the Gatherly website.');
    if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json')
      throw new HTTPError(415, 'Send the event brief as JSON.');
    if (Number(request.headers.get('content-length') ?? 0) > 12_288)
      throw new HTTPError(413, 'This request is too large. Shorten the event notes and try again.');
    const body = await readBounded(request.body, 12_288);
    let brief;
    try {
      brief = validateBrief(JSON.parse(body));
    } catch (error) {
      throw new HTTPError(
        400,
        error instanceof SyntaxError
          ? 'The event brief is not valid JSON.'
          : error instanceof Error
            ? error.message
            : 'Please check the event details.',
      );
    }
    if (!env.GEMINI_API_KEY?.trim())
      throw new HTTPError(
        503,
        'Live AI planning is not configured yet. You can still create an editable starter plan.',
      );
    if (!env.RATE_LIMITER || !env.GLOBAL_LIMITER)
      throw new HTTPError(
        503,
        'Planning safeguards are unavailable. Please use a starter plan and try again later.',
      );
    const address = request.headers.get('cf-connecting-ip') ?? 'local-development';
    const limits = await Promise.all([
      env.RATE_LIMITER.limit({ key: address }),
      env.GLOBAL_LIMITER.limit({ key: 'gatherly-generation' }),
    ]);
    if (limits.some((result) => !result.success))
      throw new HTTPError(
        429,
        'Too many planning requests. Please wait a minute before trying again.',
      );
    const { advice, trace } = await generateAdvice(
      brief,
      env.GEMINI_API_KEY,
      env.GEMINI_MODEL,
      fetcher,
    );
    const plan = createPlan(brief, advice, 'gemini');
    plan.ai = trace;
    return json({ plan });
  } catch (error) {
    if (error instanceof HTTPError) return json({ error: error.message }, error.status);
    console.error(
      JSON.stringify({
        event: 'planning_request_failed',
        type: error instanceof Error ? error.name : 'unknown',
      }),
    );
    return json(
      {
        error: 'Planning is temporarily unavailable. Your existing work is safe. Please try again.',
      },
      502,
    );
  }
}
