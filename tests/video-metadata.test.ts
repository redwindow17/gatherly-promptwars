import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

it('keeps the deployed range size tied to the exact published video', () => {
  const video = readFileSync(new URL('../public/demo/gatherly-demo.mp4', import.meta.url));
  const metadataPath = new URL('../worker/video-metadata.json', import.meta.url);
  const metadata = existsSync(metadataPath) ? JSON.parse(readFileSync(metadataPath, 'utf8')) : null;
  expect(metadata).toEqual({
    bytes: video.byteLength,
    sha256: createHash('sha256').update(video).digest('hex'),
  });
});
