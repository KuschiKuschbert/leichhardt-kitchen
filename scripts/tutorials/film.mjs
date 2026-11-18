// Films one storyboard in one cut (docs/tutorial-videos.md). The voice is made first, so every sentence's length is known:
// a sentence starts when the one before it has finished (and its taps are done), the taps and chalk marks tied to it
// run while it is said, and the film's log (timeline.json) says when each sentence started, for compose.mjs.
import fs from 'fs';
import path from 'path';
import { L, CUTS, HERE, openApp, startFilm, sleep } from './kit.mjs';
import { kitchen } from './fixtures.mjs';

const GAP = 0.3;    // seconds of quiet between two sentences
const LEAD = 0.5;   // before a step's first sentence
const TAIL = 0.6;   // after a step's last sentence, before the next step

// a value given per cut ({ phone, desktop }) or for both
const pick = (v, cut) => v && typeof v === 'object' && !Array.isArray(v) && ('phone' in v || 'desktop' in v) ? v[cut] : v;

// The first visible match of a selector (CSS, or Playwright's text= and :has-text()).
const loc = (page, sel) => page.locator(sel).locator('visible=true').first();

// Brings the control into the window (smoothly, the marks cleared first) when it is under a bar or off screen,
// and gives back its box for the chalk.
async function rect(page, sel) {
  const l = loc(page, sel);
  await l.waitFor({ timeout: 5000 }).catch(() => { throw new Error('film: nothing visible matches ' + sel); });
  const out = await l.evaluate(el => {
    const r = el.getBoundingClientRect(), fixed = el.closest('.p-sheet,.p-toast,[role="dialog"]');
    return !fixed && (r.top < 60 || r.bottom > innerHeight - 130);
  });
  if (out) {
    await page.evaluate(() => window.__chalk.clear(150));
    await l.evaluate(el => el.scrollIntoView({ block: 'center', behavior: 'smooth' }));
    await sleep(650);
  }
  const b = await l.boundingBox();
  return { x: b.x, y: b.y, width: b.width, height: b.height, right: b.x + b.width, bottom: b.y + b.height };
}

async function tap(page, sel) {
  const box = await rect(page, sel);
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.evaluate(([x, y]) => window.__chalk.touch(x, y).then(g => { window.__lkTap = g; }), [x, y]);
  await sleep(260);
  await loc(page, sel).click();
  await page.evaluate(([x, y]) => window.__lkTap && window.__chalk.release(window.__lkTap, x, y), [x, y]);
}

// One action of a step. Each names what it does: circle, underline, arrow, note, tap, type, key, scroll, clear, run.
async function act(page, a, cut) {
  const v = k => pick(a[k], cut), o = a.opts || {};
  if (v('circle')) { const r = await rect(page, v('circle')); await page.evaluate(([r, o]) => { window.__chalk.circle(r, o); }, [r, o]); }
  if (v('underline')) { const r = await rect(page, v('underline')); await page.evaluate(([r, o]) => { window.__chalk.underline(r, o); }, [r, o]); }
  if (v('arrow')) { const r = await rect(page, v('arrow')); await page.evaluate(([r, o]) => { window.__chalk.arrow(r, o); }, [r, o]); }
  if (v('note')) { const [s, words] = v('note'), r = await rect(page, s); await page.evaluate(([r, w, o]) => { window.__chalk.note(r, w, o); }, [r, words, o]); }
  if (v('tap')) await tap(page, v('tap'));
  if (v('type')) { const [s, words] = v('type'); await loc(page, s).pressSequentially(words, { delay: 75 }); }
  if (v('key')) await page.keyboard.press(v('key'));
  if (v('scroll')) { await page.evaluate(() => window.__chalk.clear(150)); await page.evaluate(s => (document.querySelector(s) || document.body).scrollIntoView({ block: 'start', behavior: 'smooth' }), v('scroll')); await sleep(650); }
  if (v('top')) { await page.evaluate(() => window.__chalk.clear(150)); await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'smooth' })); await sleep(650); }
  if (a.clear) await page.evaluate(() => window.__chalk.clear());
  if (a.run) await a.run(page, cut, L);
}

// Films the storyboard in this cut. durations: { lineId: seconds } from voice.py. Returns the timeline.
export async function film(browser, board, cut, durations, outDir) {
  const page = await openApp(browser, board.hash, cut, Object.assign({ who: board.who, extra: kitchen(board.extra) }, board.open || {}));
  if (board.setup) await board.setup(page, cut, L);
  await page.addScriptTag({ path: path.join(HERE, 'overlay.js') });
  await page.evaluate(() => window.scrollTo(0, 0));
  await L.settle(page, 300);
  const rec = await startFilm(page, path.join(outDir, 'frames'), [Math.round(CUTS[cut].width * CUTS[cut].scale), Math.round(CUTS[cut].height * CUTS[cut].scale)]);
  const start = rec.frames[0].t, cues = [], steps = [];
  const now = () => rec.now() - start;
  await sleep(LEAD * 1000);
  for (const [si, step] of board.steps.entries()) {
    if (pick(step.skip, cut)) continue;
    const st = { title: step.title, at: now(), lines: [] };
    let free = now();
    for (const [k, words] of step.say.entries()) {
      const id = lineId(si, k), dur = durations[id];
      if (dur == null) throw new Error('film: no voice for ' + id);
      if (now() < free) await sleep((free - now()) * 1000);
      const at = now();
      cues.push({ id, at, dur, text: words });
      st.lines.push(id);
      for (const a of (step.do || []).filter(a => (a.s || 0) === k && !(a.only && a.only !== cut))) {
        const due = at + (a.d || 0);
        if (now() < due) await sleep((due - now()) * 1000);
        await act(page, a, cut);
      }
      free = at + dur + GAP;
    }
    if (now() < free - GAP + TAIL) await sleep((free - GAP + TAIL - now()) * 1000);
    if (!step.keep) { await page.evaluate(() => window.__chalk.clear()); await sleep(250); }
    st.end = now();
    steps.push(st);
  }
  await sleep(400);
  const { end } = await rec.stop();
  const timeline = { board: board.id, cut, size: [Math.round(CUTS[cut].width * CUTS[cut].scale), Math.round(CUTS[cut].height * CUTS[cut].scale)], length: end - start, start, cues, steps, blocked: page.blocked, errors: page.errors };
  fs.writeFileSync(path.join(outDir, 'timeline.json'), JSON.stringify(timeline, null, 1));
  await page.context().close();
  return timeline;
}

export const lineId = (si, k) => 's' + String(si + 1).padStart(2, '0') + '_' + k;

// Every sentence the video says, with its id, for voice.py: the intro, the steps, the outro.
export function script(board) {
  const lines = [];
  (board.intro || []).forEach((t, k) => lines.push({ id: 'in_' + k, text: t }));
  board.steps.forEach((st, si) => st.say.forEach((t, k) => lines.push({ id: lineId(si, k), text: t })));
  (board.outro || []).forEach((t, k) => lines.push({ id: 'out_' + k, text: t }));
  return lines;
}
