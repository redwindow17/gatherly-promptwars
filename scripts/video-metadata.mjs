import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const video = await readFile(new URL('../public/demo/gatherly-demo.mp4', import.meta.url));
const metadata = {
  bytes: video.byteLength,
  sha256: createHash('sha256').update(video).digest('hex'),
};
await writeFile(
  new URL('../worker/video-metadata.json', import.meta.url),
  JSON.stringify(metadata, null, 2) + '\n',
);
console.log(`Video metadata generated: ${metadata.bytes} bytes`);
