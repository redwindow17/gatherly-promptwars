import { readdir, readFile } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';

const root = new URL('../dist/assets/', import.meta.url);
const entries = await readdir(root);
const sizes = { javascript: { raw: 0, gzip: 0 }, css: { raw: 0, gzip: 0 } };
let scripts = 0;
for (const name of entries) {
  const category = name.endsWith('.js') ? 'javascript' : name.endsWith('.css') ? 'css' : null;
  if (!category) continue;
  const content = await readFile(new URL(name, root));
  sizes[category].raw += content.length;
  sizes[category].gzip += gzipSync(content).length;
  if (category === 'javascript') scripts++;
}
console.log(JSON.stringify(sizes, null, 2));
if (!scripts || sizes.javascript.gzip > 100_000 || sizes.css.gzip > 20_000) {
  console.error(
    'Bundle budget exceeded or no JavaScript found. Run npm run build first. Limits: all JS 100 kB gzip, CSS 20 kB gzip.',
  );
  process.exitCode = 1;
}
