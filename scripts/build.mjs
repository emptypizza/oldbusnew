import { cp, mkdir, rm, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
await mkdir(output, { recursive: true });
// Keep the output directory inode stable for static preview servers.
for (const entry of await readdir(output)) {
  await rm(path.join(output, entry), { recursive: true, force: true });
}
for (const entry of ['index.html', 'styles.css', 'app.js', 'assets', 'content']) {
  await cp(path.join(root, entry), path.join(output, entry), { recursive: true });
}
await cp(path.join(root, '.nojekyll'), path.join(output, '.nojekyll'));
console.log('Built static website in dist/ (no runtime dependencies).');
