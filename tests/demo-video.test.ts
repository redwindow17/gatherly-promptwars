import { describe, expect, it, vi } from 'vitest';
import { handleDemoVideo } from '../worker/demo-video';

const url = 'https://gatherly.example/demo/gatherly-demo.mp4';
const text = '0123456789';
const metadata = {
  'content-type': 'video/mp4',
  'content-length': '10',
  etag: '"video-v1"',
  'content-security-policy': "default-src 'self'",
};
function source() {
  return { fetch: vi.fn(async (_request: Request) => new Response(text, { headers: metadata })) };
}
function request(range?: string, extra: Record<string, string> = {}) {
  return new Request(url, { headers: { ...(range ? { range } : {}), ...extra } });
}

describe('demo video byte ranges', () => {
  it.each([
    ['bytes=0-3', '0123', 'bytes 0-3/10'],
    ['bytes=4-6', '456', 'bytes 4-6/10'],
    ['bytes=7-', '789', 'bytes 7-9/10'],
    ['bytes=-3', '789', 'bytes 7-9/10'],
    ['bytes=8-100', '89', 'bytes 8-9/10'],
    ['bytes=-100', text, 'bytes 0-9/10'],
  ])('serves %s with the exact bytes and range metadata', async (range, body, contentRange) => {
    const response = await handleDemoVideo(request(range), source());
    expect(response.status).toBe(206);
    expect(response.headers.get('content-range')).toBe(contentRange);
    expect(response.headers.get('content-length')).toBe(String(body.length));
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.headers.get('content-type')).toBe('video/mp4');
    expect(response.headers.get('content-security-policy')).toBe("default-src 'self'");
    expect(await response.text()).toBe(body);
  });

  it.each(['bytes=10-', 'bytes=99-100', 'bytes=-0', 'bytes=9-3'])(
    'returns 416 for an unsatisfiable range %s',
    async (range) => {
      const response = await handleDemoVideo(request(range), source());
      expect(response.status).toBe(416);
      expect(response.headers.get('content-range')).toBe('bytes */10');
      expect(response.headers.get('content-length')).toBe('0');
      expect(await response.text()).toBe('');
    },
  );

  it.each([
    undefined,
    'bytes=0-1,4-5',
    'items=0-1',
    'bytes=-',
    'bytes=nope',
    'bytes=999999999999999999999-',
  ])('returns the whole file for absent or unsupported range %s', async (range) => {
    const response = await handleDemoVideo(request(range), source());
    expect(response.status).toBe(200);
    expect(response.headers.get('content-range')).toBeNull();
    expect(response.headers.get('content-length')).toBe('10');
    expect(await response.text()).toBe(text);
  });

  it.each([
    ['"video-v1"', 206, '01'],
    ['"old-video"', 200, text],
    ['W/"video-v1"', 200, text],
    ['Sun, 01 Nov 2026 12:00:00 GMT', 200, text],
  ])('honors If-Range %s conservatively', async (validator, status, body) => {
    const response = await handleDemoVideo(
      request('bytes=0-1', { 'if-range': validator }),
      source(),
    );
    expect(response.status).toBe(status);
    expect(await response.text()).toBe(body);
  });

  it('preserves a conditional 304 before attempting a range response', async () => {
    const assets = {
      fetch: vi.fn(async (upstream: Request) =>
        upstream.headers.get('if-none-match') === metadata.etag
          ? new Response(null, { status: 304, headers: { etag: metadata.etag } })
          : new Response(text, { headers: metadata }),
      ),
    };
    const response = await handleDemoVideo(
      request('bytes=0-1', {
        'if-range': '"video-v1"',
        'if-none-match': '"video-v1"',
        'if-modified-since': 'Sun, 01 Nov 2026 12:00:00 GMT',
      }),
      assets,
    );
    const upstream = assets.fetch.mock.calls[0][0];
    expect(response.status).toBe(304);
    expect(response.body).toBeNull();
    expect(response.headers.get('content-range')).toBeNull();
    for (const name of ['range', 'if-range']) {
      expect(upstream.headers.has(name)).toBe(false);
    }
    expect(upstream.headers.get('if-none-match')).toBe('"video-v1"');
    expect(upstream.headers.get('if-modified-since')).toBe('Sun, 01 Nov 2026 12:00:00 GMT');
  });

  it('serves HEAD metadata without a response body', async () => {
    const response = await handleDemoVideo(
      new Request(url, { method: 'HEAD', headers: { range: 'bytes=0-1' } }),
      source(),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe('10');
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.body).toBeNull();
  });

  it('preserves upstream error responses', async () => {
    const response = await handleDemoVideo(request('bytes=0-1'), {
      fetch: async () => new Response('Unavailable', { status: 404 }),
    });
    expect(response.status).toBe(404);
    expect(await response.text()).toBe('Unavailable');
  });

  it('streams only the required chunks and cancels the unused source', async () => {
    const chunks = ['012', '345', '6789'];
    let reads = 0;
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>(
      {
        pull(controller) {
          controller.enqueue(new TextEncoder().encode(chunks[reads++]));
        },
        cancel,
      },
      { highWaterMark: 0 },
    );
    const response = await handleDemoVideo(request('bytes=2-4'), {
      fetch: async () => new Response(body, { headers: metadata }),
    });
    expect(reads).toBe(0);
    expect(await response.text()).toBe('234');
    expect(reads).toBe(2);
    expect(cancel).toHaveBeenCalledOnce();
  });

  it('propagates client cancellation to the upstream stream', async () => {
    const cancel = vi.fn();
    const body = new ReadableStream<Uint8Array>(
      { pull: (controller) => controller.enqueue(new TextEncoder().encode('012')), cancel },
      { highWaterMark: 0 },
    );
    const response = await handleDemoVideo(request('bytes=0-9'), {
      fetch: async () => new Response(body, { headers: metadata }),
    });
    const reader = response.body!.getReader();
    await reader.read();
    await reader.cancel('player moved elsewhere');
    expect(cancel).toHaveBeenCalledWith('player moved elsewhere');
  });

  it('does not invent partial metadata when the source length is unknown', async () => {
    const response = await handleDemoVideo(request('bytes=0-1'), {
      fetch: async () => new Response(text, { headers: { 'content-type': 'video/mp4' } }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.has('content-range')).toBe(false);
    expect(await response.text()).toBe(text);
  });

  it.each([undefined, 'invalid', '999999999999999999999'])(
    'uses a known size when the asset Content-Length is %s',
    async (contentLength) => {
      const headers = new Headers({ 'content-type': 'video/mp4' });
      if (contentLength !== undefined) headers.set('content-length', contentLength);
      const response = await handleDemoVideo(
        request('bytes=4-6'),
        { fetch: async () => new Response(text, { headers }) },
        10,
      );
      expect(response.status).toBe(206);
      expect(response.headers.get('content-range')).toBe('bytes 4-6/10');
      expect(response.headers.get('content-length')).toBe('3');
      expect(response.headers.get('accept-ranges')).toBe('bytes');
      expect(await response.text()).toBe('456');
    },
  );

  it.each([-1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1])(
    'ignores invalid known size %s',
    async (knownSize) => {
      const response = await handleDemoVideo(
        request('bytes=0-1'),
        { fetch: async () => new Response(text) },
        knownSize,
      );
      expect(response.status).toBe(200);
      expect(response.headers.has('content-range')).toBe(false);
      expect(response.headers.has('accept-ranges')).toBe(false);
      expect(await response.text()).toBe(text);
    },
  );

  it('provides the known full length for HEAD when the asset omits it', async () => {
    const response = await handleDemoVideo(
      new Request(url, { method: 'HEAD' }),
      { fetch: async () => new Response(null, { headers: { 'content-type': 'video/mp4' } }) },
      10,
    );
    expect(response.status).toBe(200);
    expect(response.headers.get('content-length')).toBe('10');
    expect(response.headers.get('accept-ranges')).toBe('bytes');
    expect(response.body).toBeNull();
  });

  it('prefers a valid asset Content-Length over the fallback', async () => {
    const response = await handleDemoVideo(request('bytes=-3'), source(), 999);
    expect(response.headers.get('content-range')).toBe('bytes 7-9/10');
    expect(await response.text()).toBe('789');
  });

  it('does not apply the known size to an encoded asset', async () => {
    const response = await handleDemoVideo(
      request('bytes=0-1'),
      { fetch: async () => new Response(text, { headers: { 'content-encoding': 'gzip' } }) },
      10,
    );
    expect(response.status).toBe(200);
    expect(response.headers.has('content-range')).toBe(false);
    expect(response.headers.has('content-length')).toBe(false);
    expect(await response.text()).toBe(text);
  });
});
