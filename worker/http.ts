export class HTTPError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Bound bytes while reading, even when a caller omits Content-Length. */
export async function readBounded(
  body: ReadableStream<Uint8Array> | null,
  maxBytes: number,
): Promise<string> {
  if (!body) return '';
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false });
  let total = 0;
  let result = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        throw new HTTPError(
          413,
          'This request is too large. Shorten the event notes and try again.',
        );
      }
      try {
        result += decoder.decode(value, { stream: true });
      } catch {
        throw new HTTPError(400, 'The JSON body must contain valid UTF-8 text.');
      }
    }
    try {
      return result + decoder.decode();
    } catch {
      throw new HTTPError(400, 'The JSON body must contain valid UTF-8 text.');
    }
  } catch (error) {
    await reader.cancel(error).catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}

export function json(data: unknown, status = 200): Response {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
  };
  if (status === 429) headers['Retry-After'] = '60';
  return new Response(JSON.stringify(data), { status, headers });
}
