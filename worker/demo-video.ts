type AssetSource = { fetch(request: Request): Promise<Response> };
type ByteRange = { start: number; end: number } | 'unsatisfiable' | undefined;

function parseRange(value: string, size: number): ByteRange {
  const match = /^bytes=(\d*)-(\d*)$/i.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return undefined;
  const first = match[1] ? Number(match[1]) : undefined;
  const last = match[2] ? Number(match[2]) : undefined;
  if ([first, last].some((part) => part !== undefined && !Number.isSafeInteger(part))) {
    return undefined;
  }
  if (size === 0) return 'unsatisfiable';
  if (first === undefined) {
    return last === 0 ? 'unsatisfiable' : { start: Math.max(0, size - last!), end: size - 1 };
  }
  if (first >= size || (last !== undefined && last < first)) return 'unsatisfiable';
  return { start: first, end: Math.min(last ?? size - 1, size - 1) };
}

function sliceStream(body: ReadableStream<Uint8Array>, start: number, end: number) {
  const reader = body.getReader();
  let offset = 0;
  let closed = false;
  return new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        try {
          while (!closed) {
            const { done, value } = await reader.read();
            if (closed) return;
            if (done) throw new Error('Video asset ended before the requested range.');
            const from = Math.max(0, start - offset);
            const to = Math.min(value.byteLength, end + 1 - offset);
            offset += value.byteLength;
            if (to > from) controller.enqueue(value.subarray(from, to));
            if (offset > end) {
              closed = true;
              controller.close();
              await reader.cancel();
              return;
            }
            if (to > from) return;
          }
        } catch (error) {
          if (!closed) controller.error(error);
          closed = true;
          await reader.cancel(error).catch(() => {});
        }
      },
      async cancel(reason) {
        closed = true;
        await reader.cancel(reason);
      },
    },
    { highWaterMark: 0 },
  );
}

export async function handleDemoVideo(
  request: Request,
  assets: AssetSource,
  knownSize?: number,
): Promise<Response> {
  if (request.method !== 'GET' && request.method !== 'HEAD') return assets.fetch(request);
  const rangeHeader = request.method === 'GET' ? request.headers.get('range') : null;
  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete('range');
  upstreamHeaders.delete('if-range');
  const upstream = await assets.fetch(new Request(request, { headers: upstreamHeaders }));
  if (upstream.status !== 200) return upstream;
  const headers = new Headers(upstream.headers);
  const rawSize = headers.get('content-length');
  const headerSize = rawSize && /^\d+$/.test(rawSize) ? Number(rawSize) : NaN;
  const size =
    Number.isSafeInteger(headerSize) && headerSize >= 0 ? headerSize : (knownSize ?? NaN);
  const canSlice = Number.isSafeInteger(size) && size >= 0 && !headers.has('content-encoding');
  if (canSlice) {
    headers.set('accept-ranges', 'bytes');
    headers.set('content-length', String(size));
  }
  if (request.method === 'HEAD') {
    await upstream.body?.cancel();
    return new Response(null, { status: 200, headers });
  }
  const validator = request.headers.get('if-range');
  const etag = headers.get('etag');
  const validatorMatches = !validator || (validator.startsWith('"') && validator === etag);
  const range =
    rangeHeader && canSlice && validatorMatches ? parseRange(rangeHeader, size) : undefined;
  if (!range || !upstream.body) return new Response(upstream.body, { status: 200, headers });
  if (range === 'unsatisfiable') {
    await upstream.body.cancel();
    headers.set('content-range', `bytes */${size}`);
    headers.set('content-length', '0');
    return new Response(null, { status: 416, headers });
  }
  headers.set('content-range', `bytes ${range.start}-${range.end}/${size}`);
  headers.set('content-length', String(range.end - range.start + 1));
  return new Response(sliceStream(upstream.body, range.start, range.end), { status: 206, headers });
}
