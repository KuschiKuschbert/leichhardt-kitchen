// Makes the moving previews for the tutorial videos in Guides (head chef, 19 Nov 2026; docs/tutorial-videos.md, In the book).
// Each video gets a short, silent, sped-up loop of its page in action (about 6 s), made from the app recording that
// make.mjs films (out/<id>/<cut>/compose/app.mp4), and a still picture for phones set to reduce motion:
//   guides/videos/<id>-card.mp4 and .jpg   the list card: the top of the phone recording, 152 x 202 (twice the card's size)
//   guides/videos/<id>-wide.mp4 and .jpg   the video's page: the computer recording, 640 x 360
// The book shows the stills on the Guides page and plays a loop only under a mouse (never on a touch screen), never in
// the saved shell. They show the
// stand-in's made-up kitchen only, like the videos.
//
//   node scripts/tutorials/previews.mjs [--out <the make.mjs output folder>] [<id> ...]
//
// Then run catalogue.mjs, which marks each video that has its previews (pv), raise GV_PV in js/prep.js when you remake
// previews already on the site (phones then fetch the new ones), and commit guides/videos/ with js/tutorials.js.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';
import { ORDER } from './order.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2), at = args.indexOf('--out');
const OUT = path.resolve(at >= 0 ? args[at + 1] : path.join(HERE, 'out'));
const only = args.filter((a, i) => a !== '--out' && i !== at + 1);
const DEST = path.join(ROOT, 'guides', 'videos');
const LOOP = 6;   // seconds each loop lasts, whatever the video's length

const ff = a => execFileSync('ffmpeg', ['-nostdin', '-v', 'error', '-y', ...a], { stdio: 'inherit' });
const length = f => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString().trim();

fs.mkdirSync(DEST, { recursive: true });
let made = 0;
for (const id of ORDER.filter(x => !only.length || only.includes(x))) {
  const phone = path.join(OUT, id, 'phone', 'compose', 'app.mp4'), wide = path.join(OUT, id, 'desktop', 'compose', 'app.mp4');
  if (!fs.existsSync(phone) || !fs.existsSync(wide)) { console.log('skipped ' + id + ': film it first (make.mjs ' + id + ')'); continue; }
  for (const [src, kind, crop, size, fps] of [[phone, 'card', 'crop=666:884:0:0,', '152:202', 10], [wide, 'wide', '', '640:360', 12]]) {
    const len = length(src), speed = (len / LOOP).toFixed(3), base = path.join(DEST, id + '-' + kind);
    ff(['-i', src, '-an', '-vf', `setpts=PTS/${speed},fps=${fps},${crop}scale=${size}:flags=lanczos`, '-c:v', 'libx264', '-preset', 'slow', '-crf', '30',
      '-pix_fmt', 'yuv420p', '-movflags', '+faststart', base + '.mp4']);
    ff(['-ss', (len * 0.3).toFixed(2), '-i', src, '-frames:v', '1', '-vf', `${crop}scale=${size}:flags=lanczos`, '-q:v', '4', base + '.jpg']);
  }
  made++;
}
const kb = fs.readdirSync(DEST).reduce((n, f) => n + fs.statSync(path.join(DEST, f)).size, 0) / 1024;
console.log('made previews for ' + made + ' videos; guides/videos/ holds ' + Math.round(kb) + ' kB');
