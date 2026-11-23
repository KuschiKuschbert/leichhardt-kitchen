// Makes js/tutorials.js: every tutorial video as a guide for the book's Guides page (docs/tutorial-videos.md, In the book).
// Its title, who it is for, one line on what it shows, its length and its steps written out (each step's title and what
// the voice says), so the guide reads well before its video is added and for anyone who cannot play sound.
//
//   node scripts/tutorials/catalogue.mjs [--out <the make.mjs output folder, for each video's length>]
//
// Run it after a storyboard changes (and after previews.mjs), and commit js/tutorials.js with the storyboard. The YouTube links are not here: the
// head chef pastes them in the admin panel, and the chefs' links are kept where only chefs can read them.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ORDER, CHEFS } from './order.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url)), ROOT = path.resolve(HERE, '..', '..');
const args = process.argv.slice(2), at = args.indexOf('--out');
const OUT = path.resolve(at >= 0 ? args[at + 1] : path.join(HERE, 'out'));
const FILE = path.join(ROOT, 'js', 'tutorials.js');

// the length already in js/tutorials.js, kept when this run has no film of that video
let before = {};
try { const m = fs.readFileSync(FILE, 'utf8').match(/LK_TUTORIALS = (\{[\s\S]*\});/); if (m) JSON.parse(m[1]).list.forEach(t => { before[t.id] = t.len; }); } catch (e) {}

const list = [];
for (const [i, id] of ORDER.entries()) {
  const board = (await import(path.join(HERE, 'storyboards', id + '.mjs'))).default;
  let len = before[id] || 0;
  try { len = Math.round(JSON.parse(fs.readFileSync(path.join(OUT, id, 'desktop', 'compose', 'cues-final.json'), 'utf8')).total); } catch (e) {}
  const steps = board.steps.map(s => s.title + ': ' + s.say.join(' '));
  const t = { id, n: i + 1, title: board.title, who: CHEFS.includes(id) ? 'chefs' : 'all', sum: (board.intro || [])[1] || board.sub || '', len, steps };
  // its moving previews are in guides/videos/ (previews.mjs): the book shows them only when all four are there
  if (['card.mp4', 'card.jpg', 'wide.mp4', 'wide.jpg'].every(k => fs.existsSync(path.join(ROOT, 'guides', 'videos', id + '-' + k)))) t.pv = 1;
  if (/—/.test(JSON.stringify(t))) throw new Error(id + ': an em dash in the words');
  list.push(t);
}

fs.writeFileSync(FILE, '/* The tutorial videos as guides (docs/tutorial-videos.md, In the book). Made by scripts/tutorials/catalogue.mjs from the\n' +
  '   storyboards: do not change it by hand. Loaded by js/prep.js only when Guides opens, never at the start. */\n' +
  'window.LK_TUTORIALS = ' + JSON.stringify({ v: 1, list }, null, 1) + ';\n');
console.log('wrote ' + path.relative(ROOT, FILE) + ': ' + list.length + ' videos, ' + list.filter(t => t.who === 'chefs').length + ' for chefs only');
process.exit(0);
