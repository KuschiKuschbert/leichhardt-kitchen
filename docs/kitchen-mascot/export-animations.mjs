// Mechanical sprite extraction and encoding. Artwork remains in the source PNGs.
// Requires ImageMagick 7. Does not load the Kitchen Book or contact any service.
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const assetDir = join(dirname(fileURLToPath(import.meta.url)), 'assets');
const manifest = JSON.parse(readFileSync(join(assetDir, 'manifest.json'), 'utf8'));
const scratch = mkdtempSync(join(tmpdir(), 'lk-mascot-export-'));
const magick = args => execFileSync('magick', args, { stdio: ['ignore', 'pipe', 'pipe'] });

try {
  for (const [id, clip] of Object.entries(manifest.clips)) {
    const sheet = join(assetDir, clip.sheet);
    // The app-sized atlas uses exact 2:1 nearest-neighbour sampling, never blur.
    // Keep the original generated PNG master alongside the compact export.
    magick([join(assetDir, clip.master), '-sample', '50%', '-define', 'webp:lossless=true', '-quality', '100', sheet]);
    const [width, height] = magick(['identify', '-format', '%w %h', sheet]).toString().split(' ').map(Number);
    const fw = width / clip.columns;
    const fh = height / clip.rows;
    if (!Number.isInteger(fw) || !Number.isInteger(fh) || clip.durations.length !== clip.columns * clip.rows) {
      throw new Error(`${id}: frame grid does not match the sheet`);
    }
    const frames = clip.durations.map((ms, i) => {
      const path = join(scratch, `${id}-${i}.png`);
      magick([sheet, '-crop', `${fw}x${fh}+${i % clip.columns * fw}+${Math.floor(i / clip.columns) * fh}`, '+repage', path]);
      return { path, delay: ms / 10 };
    });
    magick([frames[clip.posterFrame].path, join(assetDir, clip.poster)]);
    const sequence = frames.flatMap(frame => ['-dispose', 'Background', '-delay', String(frame.delay), frame.path]);
    // Lossless WebP preserves the generated RGBA pixels and exact frame timing.
    const loopCount = clip.loop === false ? '1' : '0';
    magick([...sequence, '-loop', loopCount, '-define', 'webp:lossless=true', '-quality', '100', join(assetDir, `${id}.webp`)]);
    // Shareable GIF preview uses the app's paper surface; PNG/WebP retain alpha.
    magick([...sequence, '-background', '#FBF8F1', '-alpha', 'remove', '-alpha', 'off', '-loop', loopCount, '-layers', 'Optimize', join(assetDir, `${id}.gif`)]);
    console.log(`${id}: ${frames.length} frames, ${clip.durations.reduce((a, b) => a + b, 0)} ms, ${fw} × ${fh}`);
  }
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
