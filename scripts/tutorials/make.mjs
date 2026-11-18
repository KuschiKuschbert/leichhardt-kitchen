// Makes tutorial videos of the Kitchen Book (docs/tutorial-videos.md).
//
//   node scripts/tutorials/make.mjs prep                 the Prep list, both cuts
//   node scripts/tutorials/make.mjs prep --cut phone     one cut
//   node scripts/tutorials/make.mjs all                  every storyboard, then the whole book in one video per cut
//   options: --engine kokoro|chatterbox|azure  --voice af_heart  --speed 1  --py <python with the voice engine>
//            --steps voice,film,compose (default all three)  --out <folder> (default scripts/tutorials/out)
//
// Needs: tests/ installed (cd tests && npm install), ffmpeg, a Python with the voice engine (see the docs), and Chrome
// (CHROME=/path/to/chrome, as for the click tests). Nothing here touches the real book: it runs on the click tests'
// Firebase stand-in with made-up people.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { createRequire } from 'module';
import { CUTS, HERE, ROOT, launch } from './kit.mjs';
import { film, script } from './film.mjs';
import { compose, joinAll } from './compose.mjs';

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const names = args.filter((a, i) => !a.startsWith('--') && !(i && args[i - 1].startsWith('--')));
const cuts = (opt('cut', 'desktop,phone')).split(',');
const steps = (opt('steps', 'voice,film,compose')).split(',');
const engine = opt('engine', 'kokoro'), voice = opt('voice', 'af_heart'), speed = opt('speed', '1');
const py = opt('py', process.env.TUTORIAL_PY || 'python3');
const OUT = path.resolve(opt('out', path.join(HERE, 'out')));
const ORDER = ['prep'];   // the order of the whole-book video; each name is a file in storyboards/

const boards = names.includes('all') ? ORDER : names;
if (!boards.length) { console.error('Name a storyboard (' + fs.readdirSync(path.join(HERE, 'storyboards')).map(f => f.replace(/\.mjs$/, '')).join(', ') + ') or all.'); process.exit(1); }

const require = createRequire(import.meta.url);
const server = require(path.join(ROOT, 'tests', 'serve.js'));
await new Promise((res, rej) => server.listen(8777, '127.0.0.1', res).on('error', rej));
// one Chrome per cut, each drawing at its cut's scale, and one at 1:1 for the chalkboard
const browsers = {}, made = {};
const browserFor = async scale => browsers[scale] || (browsers[scale] = await launch(scale));
const browser = await browserFor(1);
try {
  for (const name of boards) {
    const board = (await import(path.join(HERE, 'storyboards', name + '.mjs'))).default;
    const dir = path.join(OUT, name), vdir = path.join(dir, 'voice-' + engine + '-' + path.basename(voice).replace(/\W+/g, '-'));
    fs.mkdirSync(vdir, { recursive: true });
    if (steps.includes('voice')) {
      fs.writeFileSync(path.join(vdir, 'lines.json'), JSON.stringify(script(board), null, 1));
      execFileSync(py, [path.join(HERE, 'voice.py'), 'say', '--engine', engine, '--voice', voice, '--speed', speed, '--script', path.join(vdir, 'lines.json'), '--out', vdir], { stdio: 'inherit' });
    }
    const durations = JSON.parse(fs.readFileSync(path.join(vdir, 'durations.json'), 'utf8'));
    for (const cut of cuts) {
      const cdir = path.join(dir, cut);
      fs.mkdirSync(cdir, { recursive: true });
      if (steps.includes('film')) {
        const t = await film(await browserFor(CUTS[cut].scale), board, cut, durations, cdir);
        console.log(name + ' ' + cut + ': filmed ' + t.length.toFixed(1) + ' s, ' + t.cues.length + ' sentences' + (t.blocked.length ? ', refused ' + t.blocked.length + ' outside requests' : '') + (t.errors.length ? ', page errors: ' + t.errors.join(' | ') : ''));
      }
      if (steps.includes('compose')) {
        const mp4 = await compose(browser, board, cut, { dir: cdir, vdir, py, out: path.join(OUT, name + '-' + cut + '.mp4') });
        (made[cut] = made[cut] || []).push({ board, mp4 });
        console.log('made ' + mp4);
      }
    }
  }
  if (names.includes('all') && steps.includes('compose')) {
    for (const cut of cuts) console.log('made ' + await joinAll(browser, made[cut], cut, path.join(OUT, 'kitchen-book-' + cut + '.mp4')));
  }
} finally {
  for (const b of Object.values(browsers)) await b.close();
  server.close();
}
