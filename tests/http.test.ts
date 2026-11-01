import { expect, it } from 'vitest';
import { readBounded } from '../worker/http';

it('cancels unread bytes after invalid UTF-8 and releases the stream lock', async () => {
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>(
    {
      pull(controller) {
        controller.enqueue(new Uint8Array([0xc3, 0x28]));
      },
      cancel() {
        cancelled = true;
      },
    },
    { highWaterMark: 0 },
  );
  await expect(readBounded(stream, 100)).rejects.toThrow(/UTF-8/i);
  expect(cancelled).toBe(true);
  expect(stream.locked).toBe(false);
});

it('decodes Unicode split across chunks without counting characters as bytes', async () => {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new Uint8Array([0xe2]));
      controller.enqueue(new Uint8Array([0x82, 0xb9]));
      controller.close();
    },
  });
  expect(await readBounded(stream, 3)).toBe('₹');
});
