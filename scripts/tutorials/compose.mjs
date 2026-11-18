// Puts a filmed tutorial together (docs/tutorial-videos.md): the book's picture in its phone or screen on the chalkboard,
// the step and the caption of each sentence, the mascot's intro and outro, the voice where the film said it, and quiet
// music under it that dips while the voice speaks. Chrome draws every picture (stage/); ffmpeg only stacks and joins.
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import { L, CUTS, HERE, startFilm, sleep } from './kit.mjs';

const FPS = 30;
// Music under the voice (docs/tutorial-videos.md, Music): Creative Commons Attribution 4.0, so every video says whose it is.
export const MUSIC = {
  url: 'https://incompetech.com/music/royalty-free/mp3-royaltyfree/Easy%20Lemon.mp3',
  file: 'easy-lemon.mp3',
  credit: 'Music: "Easy Lemon" by Kevin MacLeod (incompetech.com), licensed under Creative Commons: By Attribution 4.0'
};
const GAP = 0.3;

const ff = (args, label) => {
  try { execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y'].concat(args), { stdio: ['ignore', 'inherit', 'inherit'] }); }
  catch (e) { throw new Error('ffmpeg failed making ' + label); }
};
const secs = n => n.toFixed(3);

// The frames Chrome sent, held each until the next one, as a list ffmpeg reads (its concat demuxer).
function frameList(dir, frames, end) {
  const lines = ['ffconcat version 1.0'];
  frames.forEach((f, i) => {
    const next = i + 1 < frames.length ? frames[i + 1].t : end;
    lines.push("file '" + path.join(dir, f.file) + "'", 'duration ' + secs(Math.max(next - f.t, 0.001)));
  });
  lines.push("file '" + path.join(dir, frames[frames.length - 1].file) + "'");
  const list = path.join(dir, 'frames.txt');
  fs.writeFileSync(list, lines.join('\n') + '\n');
  return list;
}

function filmToMp4(dir, out, w, h) {
  const { frames, end } = JSON.parse(fs.readFileSync(path.join(dir, 'frames.json'), 'utf8'));
  ff(['-f', 'concat', '-safe', '0', '-i', frameList(dir, frames, end), '-vf', 'fps=' + FPS + ',scale=' + w + ':' + h + ':flags=lanczos,setsar=1,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-an', out], out);
  return end - frames[0].t;
}

async function stagePage(browser, cut) {
  const [W, H] = CUTS[cut].frame;
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(L.BASE + 'scripts/tutorials/stage/stage.html');
  await page.evaluate(() => document.fonts.ready);
  return page;
}

// A card that plays (the intro or the outro), filmed while it plays for `length` seconds.
async function playCard(page, cut, state, length, dir) {
  const [W, H] = CUTS[cut].frame;
  await page.evaluate(s => window.stage.render(Object.assign({}, s, { mode: 'blank' })), { cut });
  const rec = await startFilm(page, dir, [W, H]);
  await page.evaluate(s => window.stage.render(s), state);
  await sleep(length * 1000);
  await rec.stop();
}

function srtTime(t) {
  const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60;
  return [h, m, s].map(n => String(n).padStart(2, '0')).join(':') + ',' + String(ms % 1000).padStart(3, '0');
}

function music(root) {
  const f = path.join(root, MUSIC.file);
  if (!fs.existsSync(f)) execFileSync('curl', ['-sSfL', '-m', '120', '-o', f, MUSIC.url], { stdio: 'inherit' });
  return f;
}

export async function compose(browser, board, cut, o) {
  const { dir, vdir, py, out } = o;
  const [W, H] = CUTS[cut].frame;
  const t = JSON.parse(fs.readFileSync(path.join(dir, 'timeline.json'), 'utf8'));
  const dur = JSON.parse(fs.readFileSync(path.join(vdir, 'durations.json'), 'utf8'));
  const work = path.join(dir, 'compose');
  fs.rmSync(work, { recursive: true, force: true });
  fs.mkdirSync(work, { recursive: true });
  const page = await stagePage(browser, cut);
  const lay = await page.evaluate(c => window.stage.layout[c], cut);
  const titles = t.steps.map(s => s.title);

  // 1. the book's own picture, sized to its slot
  const app = path.join(work, 'app.mp4');
  const main = filmToMp4(path.join(dir, 'frames'), app, lay.slot.w, lay.slot.h);

  // 2. the board behind it: a new picture whenever the step or the caption changes
  const marks = new Set([0, main]);
  t.steps.forEach(s => marks.add(s.at));
  t.cues.forEach((c, i) => { marks.add(c.at); const next = t.cues[i + 1]; marks.add(Math.min(c.at + c.dur + 0.5, next ? next.at : main)); });
  const times = [...marks].filter(x => x >= 0 && x <= main).sort((a, b) => a - b);
  const stateAt = x => {
    let now = -1; t.steps.forEach((s, i) => { if (s.at <= x + 1e-6) now = i; });
    const c = t.cues.find((c, i) => c.at <= x + 1e-6 && x < Math.min(c.at + c.dur + 0.5, t.cues[i + 1] ? t.cues[i + 1].at : main) - 1e-6);
    return { cut, mode: 'back', title: board.title, steps: titles, now, caption: c ? c.text : '' };
  };
  const cards = [], made = new Map();
  for (let i = 0; i < times.length - 1; i++) {
    const st = stateAt(times[i]), k = JSON.stringify(st);
    if (!made.has(k)) {
      const png = path.join(work, 'back-' + made.size + '.png');
      await page.evaluate(s => window.stage.render(s), st);
      await page.screenshot({ path: png });
      made.set(k, png);
    }
    cards.push({ png: made.get(k), d: times[i + 1] - times[i] });
  }
  const backList = path.join(work, 'back.txt');
  fs.writeFileSync(backList, ['ffconcat version 1.0'].concat(cards.flatMap(c => ["file '" + c.png + "'", 'duration ' + secs(c.d)]), ["file '" + cards[cards.length - 1].png + "'"]).join('\n') + '\n');

  // 3. the bezel in front, with a hole for the picture
  const front = path.join(work, 'front.png');
  await page.evaluate(s => window.stage.render(s), { cut, mode: 'front' });
  await page.screenshot({ path: front, omitBackground: true });

  const mainMp4 = path.join(work, 'main.mp4');
  ff(['-f', 'concat', '-safe', '0', '-i', backList, '-i', app, '-loop', '1', '-i', front,
    '-filter_complex', '[0:v]fps=' + FPS + ',setsar=1,format=yuv420p[bg];[1:v]setpts=PTS-STARTPTS[app];[bg][app]overlay=' + lay.slot.x + ':' + lay.slot.y + ':eof_action=repeat[a];[a][2:v]overlay=0:0:shortest=1,trim=duration=' + secs(main) + ',format=yuv420p[v]',
    '-map', '[v]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '18', '-r', String(FPS), mainMp4], mainMp4);

  // 4. the intro and the outro, long enough for their sentences
  const said = ids => ids.reduce((s, id) => s + dur[id] + GAP, 0);
  const inIds = (board.intro || []).map((x, k) => 'in_' + k), outIds = (board.outro || []).map((x, k) => 'out_' + k);
  const IN_LEAD = 1.0, OUT_LEAD = 0.6;
  const inLen = Math.max(4.5, IN_LEAD + said(inIds) + 0.8), outLen = Math.max(5, OUT_LEAD + said(outIds) + 2.2);
  await playCard(page, cut, { cut, mode: 'intro', title: board.title, sub: board.sub }, inLen, path.join(work, 'intro'));
  await playCard(page, cut, { cut, mode: 'outro', title: "That's the " + board.title, next: board.next, credit: MUSIC.credit }, outLen, path.join(work, 'outro'));
  await page.context().close();
  const introMp4 = path.join(work, 'intro.mp4'), outroMp4 = path.join(work, 'outro.mp4');
  filmToMp4(path.join(work, 'intro'), introMp4, W, H);
  filmToMp4(path.join(work, 'outro'), outroMp4, W, H);

  // 5. the voice: every sentence where it was said, then the music under it
  const total = inLen + main + outLen, cues = [];
  let x = IN_LEAD;
  inIds.forEach(id => { cues.push({ id, at: x }); x += dur[id] + GAP; });
  t.cues.forEach(c => cues.push({ id: c.id, at: inLen + c.at }));
  x = inLen + main + OUT_LEAD;
  outIds.forEach(id => { cues.push({ id, at: x }); x += dur[id] + GAP; });
  const cueFile = path.join(work, 'cues.json'), voiceWav = path.join(work, 'voice.wav');
  fs.writeFileSync(cueFile, JSON.stringify({ length: total, cues: cues.map(c => ({ wav: path.join(vdir, c.id + '.wav'), at: c.at })) }));
  execFileSync(py, [path.join(HERE, 'voice.py'), 'mix', '--cues', cueFile, '--out', voiceWav], { stdio: 'inherit' });

  // 6. all together
  const song = music(path.dirname(path.dirname(dir)));
  ff(['-i', introMp4, '-i', mainMp4, '-i', outroMp4, '-i', voiceWav, '-stream_loop', '-1', '-i', song,
    '-filter_complex',
    '[0:v]setsar=1[v0];[1:v]setsar=1[v1];[2:v]setsar=1[v2];[v0][v1][v2]concat=n=3:v=1:a=0,format=yuv420p[v];' +
    '[4:a]atrim=0:' + secs(total) + ',asetpts=N/SR/TB,aformat=sample_rates=48000:channel_layouts=stereo,volume=0.2,afade=t=in:d=1.5,afade=t=out:st=' + secs(Math.max(0, total - 3)) + ':d=3[m];' +
    '[3:a]aformat=sample_rates=48000:channel_layouts=stereo,asplit[n1][n2];' +
    '[m][n1]sidechaincompress=threshold=0.015:ratio=10:attack=20:release=500[md];' +
    '[n2][md]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]',
    '-map', '[v]', '-map', '[a]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-r', String(FPS), '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-movflags', '+faststart', '-t', secs(total), out], out);

  // captions file next to the video, for YouTube or Drive
  const text = Object.fromEntries((board.intro || []).map((s, k) => ['in_' + k, s]).concat((board.outro || []).map((s, k) => ['out_' + k, s]), t.cues.map(c => [c.id, c.text])));
  fs.writeFileSync(out.replace(/\.mp4$/, '.srt'), cues.map((c, i) => (i + 1) + '\n' + srtTime(c.at) + ' --> ' + srtTime(c.at + dur[c.id]) + '\n' + text[c.id] + '\n').join('\n'));
  fs.writeFileSync(path.join(work, 'cues-final.json'), JSON.stringify({ total, inLen, main, outLen, cues }, null, 1));
  return out;
}

// The whole book in one video per cut: each page's video in turn, with chapter marks.
export async function joinAll(browser, made, cut, out) {
  const list = out.replace(/\.mp4$/, '.txt'), meta = out.replace(/\.mp4$/, '.chapters.txt');
  fs.writeFileSync(list, made.map(m => "file '" + m.mp4 + "'").join('\n') + '\n');
  let at = 0;
  const chapters = [';FFMETADATA1', 'title=The Kitchen Book, start to finish'];
  for (const m of made) {
    const d = parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', m.mp4]).toString());
    chapters.push('[CHAPTER]', 'TIMEBASE=1/1000', 'START=' + Math.round(at * 1000), 'END=' + Math.round((at + d) * 1000), 'title=' + m.board.title);
    at += d;
  }
  fs.writeFileSync(meta, chapters.join('\n') + '\n');
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-i', meta, '-map_metadata', '1', '-map_chapters', '1', '-c', 'copy', '-movflags', '+faststart', out], out);
  return out;
}
