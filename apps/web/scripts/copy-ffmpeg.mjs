// Copies the single-thread FFmpeg core next to the app so the encoder is served from our own domain.
// Runs after `npm install`. The files are build output and are not committed.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = join(root, 'node_modules', '@ffmpeg', 'core', 'dist', 'umd');
const to = join(root, 'public', 'ffmpeg');

if (!existsSync(from)) {
  console.warn('copy-ffmpeg: @ffmpeg/core is not installed yet, skipping.');
  process.exit(0);
}
mkdirSync(to, { recursive: true });
for (const file of ['ffmpeg-core.js', 'ffmpeg-core.wasm']) copyFileSync(join(from, file), join(to, file));
console.log('copy-ffmpeg: copied ffmpeg-core.js and ffmpeg-core.wasm to public/ffmpeg');
