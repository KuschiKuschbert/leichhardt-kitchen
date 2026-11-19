// The tutorial videos in Guides (head chef, 19 Nov 2026, docs/tutorial-videos.md): a Videos group for everyone, the chefs'
// videos only for the chefs and the admin, Play over the page (the tall video on a phone, the wide one on a computer), Video
// to come before a link is saved, and the admin's links: typed as YouTube links, kept as ids, the chefs' in their own record.
const L = require('./lib');
const { R, ok } = L.results();
const T = n => ['kitchens', L.PIN, 'tutorials', n].join('/');
const STAFF_V = 14, ALL_V = 21;
const links = {
  [T('staff')]: { links: { prep: { w: 'AAAAAAAAAAA', t: 'BBBBBBBBBBB' } }, at: L.NOW - 86400000, by: 'sam' },
  [T('chefs')]: { links: { 'chef-panel': { w: 'CCCCCCCCCCC', t: '' } }, at: L.NOW - 86400000, by: 'sam' }
};
const vids = p => p.$$eval('.g-grp[aria-label="Videos"] .g-card', a => a.map(x => x.getAttribute('href').replace('#/guides/', '')));
const reads = p => p.evaluate(() => window.__fake.reads.filter(k => /\/tutorials\//.test(k)));
// the player's page, served here: the tests never reach YouTube
async function open(...a) {
  const p = await L.open(...a);
  await p.context().route(/^https:\/\/www\.youtube-nocookie\.com\//, r => r.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Video</title><p>Video</p>' }));
  return p;
}
(async () => {
  const b = await L.start();
  for (const width of [390, 768, 1280]) {
    // staff: the videos for everyone, labelled, last; none of the chefs'
    let p = await open(b, '#/guides', { who: 'ann', width, extra: links, wait: 1200 });
    await L.waitFor(p, () => !!document.querySelector('.g-grp[aria-label="Videos"] .g-card'));
    let v = await vids(p);
    ok(v.length === STAFF_V && v[0] === 'v-sign-in' && v.indexOf('v-prep') >= 0 && !v.some(x => /chef-panel|admin|todays-team|supplier|recipes-manage/.test(x)), 'videos: staff see the ' + STAFF_V + ' videos for everyone, none of the chefs\' at ' + width + ' (' + v.length + ')');
    ok(await p.evaluate(() => { const g = [...document.querySelectorAll('.g-grp')]; return g[g.length - 1].getAttribute('aria-label') === 'Videos'; }), 'videos: the group comes after the kitchen\'s own guides at ' + width);
    ok(/How each page of the book works/.test(await p.locator('.g-vhint').innerText()), 'videos: the group says what the videos are and how to play one at ' + width);
    ok(/Video, \d+ min \d\d/.test(await p.locator('.g-card[href="#/guides/v-prep"] .g-cm').innerText()), 'videos: a card says it is a video and how long at ' + width);
    ok((await reads(p)).length === 0, 'videos: the list reads no links');
    await L.choose(p, '[data-p="g-cat"][data-v="video"]');
    ok(await p.locator('.g-card').count() === STAFF_V, 'videos: the Videos chip shows only the videos at ' + width);
    await L.choose(p, '[data-p="g-cat"][data-v="all"]');
    await p.fill('#g-q', 'quick add'); await L.settle(p, 300);
    ok(await p.locator('.g-card[href="#/guides/v-prep"]').count() === 1, 'videos: the search finds a video by its spoken steps at ' + width);
    await p.fill('#g-q', ''); await L.settle(p, 200);
    // a video with a link: Play opens the player over the page
    await p.click('.g-card[href="#/guides/v-prep"]');
    await L.waitFor(p, () => !!document.querySelector('.g-vplay'));
    const doc = await p.locator('.g-doc').innerText();
    ok(/Video tutorial/i.test(doc) && /The steps in the video/i.test(doc) && await p.locator('.g-ol > li').count() > 3, 'videos: the guide page says Video tutorial and has the steps written out at ' + width);
    let r = await reads(p);
    ok(r.length === 1 && /tutorials\/staff$/.test(r[0]), 'videos: staff read only the staff links, once (' + r.join(', ') + ')');
    await p.click('.g-vplay');
    await L.waitFor(p, () => !!document.querySelector('.gv-wrap iframe'));
    const src = await p.getAttribute('.gv-wrap iframe', 'src'), tall = await p.locator('.gv-frame.tall').count() === 1;
    const want = width < 700 ? 'BBBBBBBBBBB' : 'AAAAAAAAAAA';
    ok(src.indexOf('https://www.youtube-nocookie.com/embed/' + want + '?') === 0 && tall === (width < 700), 'videos: Play opens the ' + (width < 700 ? 'tall phone' : 'wide computer') + ' video at ' + width + ' (' + src + ')');
    const fit = await p.evaluate(() => { const f = document.querySelector('.gv-frame').getBoundingClientRect(), b = document.querySelector('.gv-body').getBoundingClientRect(), h = document.querySelector('.gv-wrap .gz-bar').getBoundingClientRect();
      return { in: f.top >= b.top - 1 && f.bottom <= b.bottom + 1 && f.left >= b.left - 1 && f.right <= b.right + 1 && f.top >= h.bottom - 1, w: Math.round(f.width), h: Math.round(f.height) }; });
    ok(fit.in && fit.w > 200, 'videos: the whole video fits under the title at ' + width + ' ' + JSON.stringify(fit));
    await p.keyboard.press('Escape');
    await L.waitFor(p, () => !document.querySelector('.gv-wrap'));
    ok(await p.locator('.g-vplay').count() === 1 && !(await p.evaluate(() => document.documentElement.classList.contains('gz-open'))), 'videos: Escape closes the player and leaves the guide');
    await p.click('.g-vplay'); await L.waitFor(p, () => !!document.querySelector('.gv-wrap'));
    await p.goBack(); await L.waitFor(p, () => !document.querySelector('.gv-wrap'));
    ok(await p.evaluate(() => location.hash) === '#/guides/v-prep', 'videos: Back closes the player and stays on the guide');
    // no link yet: the steps carry it
    await p.evaluate(() => { location.hash = '#/guides/v-orders'; });
    await L.waitFor(p, () => !!document.querySelector('.g-vsoon, .g-vnone'));
    ok(/Video to come/i.test(await p.locator('.g-vid').innerText()) && await p.locator('.g-vplay').count() === 0, 'videos: a video with no link says Video to come at ' + width);
    ok(await p.locator('.g-vsoon video.g-vloop[data-src="guides/videos/orders-wide.mp4?v=1"]').count() === 1 && await p.locator('.g-vsoon [data-p="g-play"], .g-vsoon .g-vring').count() === 0, 'videos: with no link yet, the moving preview shows with no Play on it at ' + width);
    ok((await reads(p)).length === 1, 'videos: another video the same day reads nothing more');
    // a chef's video by its address: told it is for chefs
    await p.evaluate(() => { location.hash = '#/guides/v-chef-panel'; }); await L.settle(p, 500);
    ok(/This guide is for chefs/.test(await p.locator('#rtitle').innerText()) && await p.locator('.g-vplay').count() === 0, 'videos: staff opening a chefs\' video by its link are told it is for chefs');
    ok(!(await L.overflow(p)), 'videos: no sideways scroll for staff at ' + width);
    ok(p.errors.length === 0, 'videos: no page errors for staff at ' + width + ' ' + p.errors.join(' | '));
    if (width === 390) await p.screenshot({ path: __dirname + '/shots/guide-videos-phone.png' });
    await p.context().close();

    // a sous chef: every video, the chefs' marked, their links from the chefs' record
    p = await open(b, '#/guides', { who: 'sam', width, extra: links, wait: 1200 });
    await L.waitFor(p, () => document.querySelectorAll('.g-grp[aria-label="Videos"] .g-card').length > 14);
    v = await vids(p);
    ok(v.length === ALL_V && v.indexOf('v-chef-panel') >= 0 && v.indexOf('v-admin-kitchen') >= 0, 'videos: a sous chef sees all ' + ALL_V + ' at ' + width);
    ok(await p.locator('.g-card[href="#/guides/v-chef-panel"] .g-who').count() === 1 && await p.locator('.g-card[href="#/guides/v-prep"] .g-who').count() === 0, 'videos: the chefs\' videos are marked For chefs');
    await p.click('.g-card[href="#/guides/v-chef-panel"]');
    await L.waitFor(p, () => !!document.querySelector('.g-vplay'));
    r = await reads(p);
    ok(r.length === 2 && r.some(k => /tutorials\/chefs$/.test(k)), 'videos: a chef reads both records (' + r.join(', ') + ')');
    await p.click('.g-vplay'); await L.waitFor(p, () => !!document.querySelector('.gv-wrap iframe'));
    ok((await p.getAttribute('.gv-wrap iframe', 'src')).indexOf('/embed/CCCCCCCCCCC?') > 0 && await p.locator('.gv-frame.tall').count() === 0, 'videos: with only a wide link, the wide video plays at ' + width);
    await p.click('.gv-wrap [data-gv="close"]'); await L.waitFor(p, () => !document.querySelector('.gv-wrap'));
    ok(await p.locator('.g-vplay').count() === 1, 'videos: Close shuts the player');
    ok(p.errors.length === 0, 'videos: no page errors for a sous chef at ' + width + ' ' + p.errors.join(' | '));
    if (width === 1280) await p.screenshot({ path: __dirname + '/shots/guide-videos-wide.png' });
    await p.context().close();
  }

  // a link record that is not an id is never played
  let p = await open(b, '#/guides/v-prep', { who: 'ann', width: 390, extra: { [T('staff')]: { links: { prep: { w: 'javascript:alert(1)', t: 'https://evil.example/x' } }, at: 1, by: 'sam' } }, wait: 1200 });
  await L.waitFor(p, () => !!document.querySelector('.g-vsoon, .g-vnone, .g-vplay'));
  ok(await p.locator('.g-vplay').count() === 0 && /Video to come/i.test(await p.locator('.g-vid').innerText()), 'videos: a saved link that is not a YouTube id is not used');
  await p.context().close();

  // the admin on a video guide: no Change this guide (videos are not written here), a way to the links instead
  p = await open(b, '#/guides/v-prep', { admin: true, who: '', width: 1280, extra: links, wait: 1500 });
  await L.waitFor(p, () => !!document.querySelector('.g-vplay'));
  ok(await p.locator('[data-p="g-change"]').count() === 0 && await p.locator('[data-p="g-vlinks"]').count() === 1, 'admin videos: a video guide offers Change the video links, not Change this guide');
  await p.click('[data-p="g-vlinks"]');
  await L.waitFor(p, () => location.hash === '#/admin' && document.querySelectorAll('.tv-row').length > 0);
  ok(await p.locator('.tv-blk').count() === 1, 'admin videos: Change the video links opens the admin Guides tab with the links');
  ok(p.errors.length === 0, 'admin videos: no page errors from a video guide ' + p.errors.join(' | '));
  await p.context().close();

  // the admin: the links box, typed links kept as ids, the chefs' in their own record
  for (const width of [390, 1280]) {
    p = await open(b, '#/admin', { admin: true, who: '', width, height: 900, extra: links, wait: 1500 });
    await L.adminTab(p, 'guides');
    await L.waitFor(p, () => document.querySelectorAll('.tv-row').length > 0);
    ok(await p.locator('.tv-row').count() === ALL_V, 'admin videos: one row per video at ' + width);
    ok(await p.inputValue('[data-k="tv:prep:w"]') === 'https://youtu.be/AAAAAAAAAAA' && await p.inputValue('[data-k="tv:chef-panel:w"]') === 'https://youtu.be/CCCCCCCCCCC', 'admin videos: the saved links fill the boxes, the chefs\' too');
    ok(/For chefs/i.test(await p.locator('.tv-row').filter({ hasText: 'Chef panel' }).first().innerText()) && /Everyone/i.test(await p.locator('.tv-row').filter({ hasText: 'Prep list' }).first().innerText()), 'admin videos: each row says who sees it');
    ok(await p.locator('[data-p="tv-save"]').isDisabled(), 'admin videos: Save is off with nothing changed');
    await p.fill('[data-k="tv:orders:w"]', 'hello');
    ok(await p.getAttribute('[data-k="tv:orders:w"]', 'aria-invalid') === 'true' && !(await p.locator('[data-p="tv-save"]').isDisabled()), 'admin videos: a box that is not a YouTube link is marked');
    await p.click('[data-p="tv-save"]');
    await L.waitFor(p, () => /Not a YouTube link/.test((document.querySelector('.tv-blk') || {}).textContent || ''));
    ok(/Not a YouTube link: Orders/.test(await p.locator('.tv-blk').innerText()), 'admin videos: Save names the video whose link is wrong at ' + width);
    await p.fill('[data-k="tv:orders:w"]', 'https://www.youtube.com/watch?v=DDDDDDDDDDD&t=3s');
    await p.fill('[data-k="tv:orders:t"]', 'https://youtube.com/shorts/EEEEEEEEEEE?si=x');
    await p.fill('[data-k="tv:admin-today:t"]', 'https://youtu.be/FFFFFFFFFFF');
    await p.click('[data-p="tv-save"]');
    await L.waitFor(p, () => /Saved\./.test((document.querySelector('.tv-blk') || {}).textContent || ''));
    const st = await p.evaluate(() => window.__fake.dump());
    const s = (st[T('staff')] || {}).links || {}, c = (st[T('chefs')] || {}).links || {};
    ok(s.orders && s.orders.w === 'DDDDDDDDDDD' && s.orders.t === 'EEEEEEEEEEE' && s.prep.w === 'AAAAAAAAAAA', 'admin videos: the staff links are saved as ids at ' + width + ' ' + JSON.stringify(s));
    ok(c['admin-today'] && c['admin-today'].t === 'FFFFFFFFFFF' && c['chef-panel'].w === 'CCCCCCCCCCC' && !s['admin-today'] && !c.orders, 'admin videos: the chefs\' links go only in the chefs\' record ' + JSON.stringify(c));
    ok(/Saved\. 4 of 21 videos have a link/.test(await p.locator('.tv-blk').innerText()), 'admin videos: Saved says how many have a link');
    ok(!(await L.overflow(p)), 'admin videos: no sideways scroll at ' + width);
    ok(p.errors.length === 0, 'admin videos: no page errors at ' + width + ' ' + p.errors.join(' | '));
    if (width === 390) await p.screenshot({ path: __dirname + '/shots/guide-videos-admin-phone.png', fullPage: true });
    await p.context().close();
  }
  // the admin box starts only from the server: a phone without signal cannot save an empty list over the links
  p = await open(b, '#/admin', { admin: true, who: '', width: 1280, extra: links, wait: 1200 });
  await p.evaluate(() => { window.__fake.failReads = /tutorials/; });
  await L.adminTab(p, 'guides');
  await L.waitFor(p, () => /Could not check the saved links/.test((document.querySelector('.tv-blk') || {}).textContent || ''));
  ok(await p.locator('[data-p="tv-save"]').count() === 0 && await p.locator('[data-p="tv-retry"]').count() === 1, 'admin videos: no Save until the saved links come from the server, and Try again is offered');
  await p.evaluate(() => { window.__fake.failReads = null; });
  await p.click('[data-p="tv-retry"]');
  await L.waitFor(p, () => document.querySelectorAll('.tv-row').length > 0);
  ok(await p.inputValue('[data-k="tv:prep:t"]') === 'https://youtu.be/BBBBBBBBBBB', 'admin videos: Try again loads the links');
  await p.context().close();

  // the moving previews (19 Nov 2026): a silent loop of each page on its card and behind the page's Play, loaded and played
  // only on screen, paused under the player, still pictures for a phone set to reduce motion
  const fs = require('fs'), path = require('path');
  global.window = {}; require('../js/tutorials.js');
  const cat = global.window.LK_TUTORIALS.list, gone = [];
  cat.forEach(t => ['card.mp4', 'card.jpg', 'wide.mp4', 'wide.jpg'].forEach(k => { if (!fs.existsSync(path.join(__dirname, '..', 'guides', 'videos', t.id + '-' + k))) gone.push(t.id + '-' + k); }));
  ok(cat.every(t => t.pv === 1) && !gone.length, 'previews: every video has its card and page loops and stills in guides/videos (' + (gone.join(', ') || 'none missing') + ')');
  const loopOf = (pg, sel) => pg.evaluate(sel => { const v = document.querySelector(sel); return v ? { poster: v.getAttribute('poster'), data: v.getAttribute('data-src'), src: v.getAttribute('src') || '', playing: !v.paused, loop: v.loop, muted: v.muted, hidden: v.getAttribute('aria-hidden') } : null; }, sel);
  for (const width of [390, 1280]) {
    p = await open(b, '#/guides', { who: 'ann', width, extra: links, wait: 1200 });
    await L.waitFor(p, () => !!document.querySelector('.g-grp[aria-label="Videos"] video.g-vloop'));
    let c = await loopOf(p, '.g-card[href="#/guides/v-prep"] video.g-vloop');
    ok(c && c.poster === 'guides/videos/prep-card.jpg?v=1' && c.data === 'guides/videos/prep-card.mp4?v=1' && c.loop && c.hidden === 'true', 'previews: the Prep list card carries its loop and still at ' + width + ' ' + JSON.stringify(c));
    ok(!(await loopOf(p, '.g-card[href="#/guides/v-settings"] video.g-vloop')).src, 'previews: a card off screen loads nothing at ' + width);
    await p.evaluate(() => document.querySelector('.g-card[href="#/guides/v-prep"]').scrollIntoView({ block: 'center' }));
    await L.waitFor(p, () => { const v = document.querySelector('.g-card[href="#/guides/v-prep"] video.g-vloop'); return !!v && !v.paused; }).catch(() => {});
    c = await loopOf(p, '.g-card[href="#/guides/v-prep"] video.g-vloop');
    ok(c.src === 'guides/videos/prep-card.mp4?v=1' && c.playing && c.muted, 'previews: on screen, the card loads its loop and plays it, muted, at ' + width + ' ' + JSON.stringify(c));
    const res = await p.request.get(L.BASE + 'guides/videos/prep-card.mp4?v=1');
    ok(res.ok() && /video\/mp4/.test(res.headers()['content-type'] || ''), 'previews: the loop is served as a video');
    await p.click('.g-card[href="#/guides/v-prep"]');
    await L.waitFor(p, () => !!document.querySelector('.g-vposter video.g-vloop'));
    await L.waitFor(p, () => { const v = document.querySelector('.g-vposter video.g-vloop'); return !!v && !v.paused; }).catch(() => {});
    c = await loopOf(p, '.g-vposter video.g-vloop');
    ok(c && c.poster === 'guides/videos/prep-wide.jpg?v=1' && c.src === 'guides/videos/prep-wide.mp4?v=1' && c.playing, 'previews: the page shows its loop behind Play at ' + width + ' ' + JSON.stringify(c));
    ok(/Play the video/i.test(await p.locator('.g-vposter').innerText()) && await p.locator('.g-vposter .g-vring').count() === 1, 'previews: the poster says Play the video, with the round Play');
    await p.click('.g-vplay');
    await L.waitFor(p, () => !!document.querySelector('.gv-wrap iframe'));
    ok(await p.evaluate(() => [...document.querySelectorAll('video.g-vloop')].every(v => v.paused)), 'previews: the loops stop under the player at ' + width);
    await p.keyboard.press('Escape');
    await L.waitFor(p, () => { const v = document.querySelector('.g-vposter video.g-vloop'); return !document.querySelector('.gv-wrap') && !!v && !v.paused; }).catch(() => {});
    ok((await loopOf(p, '.g-vposter video.g-vloop')).playing, 'previews: closing the player starts the loop again at ' + width);
    ok(!(await L.overflow(p)), 'previews: no sideways scroll at ' + width);
    ok(p.errors.length === 0, 'previews: no page errors at ' + width + ' ' + p.errors.join(' | '));
    if (width === 390) await p.screenshot({ path: __dirname + '/shots/guide-videos-poster-phone.png' });
    await p.context().close();
  }
  // a phone set to reduce motion keeps the still pictures: nothing loads, nothing plays
  const calm = () => { const m = window.matchMedia.bind(window); window.matchMedia = q => /prefers-reduced-motion:\s*reduce/.test(q) ? { matches: true, media: q, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} } : m(q); };
  p = await open(b, '#/guides/v-prep', { who: 'ann', width: 390, extra: links, wait: 1200, init: calm });
  await L.waitFor(p, () => !!document.querySelector('.g-vposter video.g-vloop'));
  await L.settle(p, 600);
  const still = await loopOf(p, '.g-vposter video.g-vloop');
  ok(still && still.poster === 'guides/videos/prep-wide.jpg?v=1' && !still.src && !still.playing, 'previews: reduce motion shows the still picture and loads no loop ' + JSON.stringify(still));
  await p.click('.g-vplay');
  await L.waitFor(p, () => !!document.querySelector('.gv-wrap iframe'));
  ok(true, 'previews: Play still opens the video with reduce motion on');
  await p.context().close();
  await b.close(); L.report(R);
})().catch(e => { console.error(e); process.exit(1); });
