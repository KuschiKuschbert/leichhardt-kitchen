// Booking contact uses the existing function editor and synthetic manager sessions.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const L = require('./lib');
const M = require('../js/functions');

const key = (...parts) => ['kitchens', L.PIN, ...parts].join('/');
const bookingKey = key('functions', 'smith');
const contactKey = key('fncontact', 'smith');
const route = '#/functions/smith';
const contact = { cname: 'Riverbend Community Arts Association', phone: '0400 000 000', email: 'first@example.com', upd: 1 };
const date = L.ymd(new Date(L.NOW));
const at = time => M.kat(date, M.hmMin(time));
const booking = M.derive({
  v: 1, status: 'confirmed', name: 'Smith 50th', date, start: at('18:00'), loc: 'Beer garden', guests: 60, mode: 'stag',
  rounds: ['18:30', '19:00', '19:30'].map(time => ({ at: at(time), note: '' })),
  lines: ['pizza', 'aussie', 'antipasto'].map(name => ({ rid: name + '-platter', name: name + ' platter', qty: 3, unit: 'platter', u: [0, 1, 2], spec: '', fp: '' })),
  notes: '', kc: '', kcBy: '', kcAt: 0, was: {}, chg: [], cBy: 'fay', cAt: L.NOW - 86400000, confBy: 'fay', confAt: L.NOW - 86400000, by: 'fay', upd: L.NOW - 3600000
});
const people = [
  { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
  { id: 'ann', name: 'Ann', role: 'staff', active: true },
  { id: 'fay', name: 'Fay', role: 'fnc', active: true }
];
const seed = {
  [key('config', 'main')]: { people, staffIds: ['sam', 'ann', 'fay'], sousIds: ['sam'], fnIds: ['sam', 'fay'], fnOnlyIds: ['fay'] },
  [key('staffpins', 'fay')]: { hash: L.sha('lk:fay:5151') },
  [key('pinset', 'fay')]: { at: 1 },
  [key('drinks', 'fay')]: { kind: 'flat', at: 1, by: 'fay' },
  [bookingKey]: booking
};
const sdk = fs.readFileSync(path.join(__dirname, 'fake/firebase-firestore.js'), 'utf8');
const cacheSdk = sdk.replace('export function getDoc(ref) {', 'export function getDoc(ref) {\n  if (key(ref.path).endsWith("/fncontact/smith")) return Promise.resolve({ metadata: { fromCache: true, hasPendingWrites: false }, exists: () => false });');
const stalledSdk = sdk.replace('export function getDocFromServer(ref) {', 'export function getDocFromServer(ref) {\n  if (key(ref.path).endsWith("/fncontact/smith")) return new Promise(() => {});');
const shim = script => ({ 'firebase-firestore.js': script });
const toggle = '[data-fe="contact"]';

async function open(browser, hash, options = {}) {
  const { hasContact, ...rest } = options;
  return L.open(browser, hash, { who: 'sam', extra: { ...seed, ...(hasContact ? { [contactKey]: contact } : {}) }, wait: 500, ...rest });
}
async function inspect(page, fn) {
  try {
    return await fn(page);
  } finally {
    assert.deepEqual(page.errors, []);
    await page.context().close();
  }
}
async function fields(page) {
  await page.locator('#fe-name').waitFor();
  if (!await page.locator('#fe-cname').isVisible()) await page.locator(toggle + ', .fe-contact > summary').click();
  await page.locator('#fe-cname').waitFor();
}
function dump(page, k) {
  return page.evaluate(k => window.__fake.dump()[k], k);
}
async function save(page) {
  await page.locator('[data-fe="save"]').click();
  await page.locator('.p-toast-msg').getByText('Saved. The kitchen sees the change now.', { exact: true }).waitFor();
}
async function goToList(page) {
  await page.getByRole('button', { name: 'Back to all functions' }).click();
  await page.locator('.fe-row[href="#/functions/smith"]').waitFor();
}

async function twoManagers(browser, changeEmail, legacy = false) {
  await inspect(await open(browser, route, { hasContact: true }), async a => {
    await a.locator('#fe-notes').fill('Two plates separate');
    if (changeEmail) {
      await fields(a);
      await a.locator('#fe-email').fill('draft@example.com');
    }
    await goToList(a);
    if (legacy) await a.evaluate(() => {
      const key = 'lk.fe.draft.smith';
      const draft = JSON.parse(localStorage.getItem(key));
      delete draft.contactEdits;
      localStorage.setItem(key, JSON.stringify(draft));
    });
    const later = await inspect(await open(browser, route, { hasContact: true, who: 'fay' }), async b => {
      await fields(b);
      await b.locator('#fe-cname').fill('New contact from Fay');
      if (!changeEmail) await b.locator('#fe-email').fill('second@example.com');
      await save(b);
      return { [bookingKey]: await dump(b, bookingKey), [contactKey]: await dump(b, contactKey) };
    });
    await a.evaluate(changes => Object.entries(changes).forEach(([k, d]) => window.__fake.write(k, d)), later);
    await a.locator('.fe-row[href="#/functions/smith"]').click();
    assert.equal(await a.locator('#fe-notes').inputValue(), 'Two plates separate');
    await fields(a);
    const shownName = await a.locator('#fe-cname').inputValue();
    const shownEmail = await a.locator('#fe-email').inputValue();
    if (legacy) {
      assert.equal(shownName, contact.cname, 'the older draft still has its input');
      await a.locator('[data-fe="save"]').click();
      await a.getByRole('button', { name: 'Keep mine and save over theirs' }).waitFor();
      assert.deepEqual(await dump(a, contactKey), later[contactKey], 'the existing conflict decision guards the saved contact');
      return;
    }
    await save(a);
    const saved = await dump(a, contactKey);
    assert.equal(saved.cname, 'New contact from Fay', 'saving a restored food draft preserves the other manager’s contact name');
    assert.equal(saved.email, changeEmail ? 'draft@example.com' : 'second@example.com');
    if (!changeEmail) assert.deepEqual(saved, later[contactKey], 'saving the food draft does not rewrite the private contact');
    assert.equal((await dump(a, bookingKey)).notes, 'Two plates separate');
    assert.equal(shownName, 'New contact from Fay');
    assert.equal(shownEmail, changeEmail ? 'draft@example.com' : 'second@example.com');
  });
}

(async () => {
  const browser = await L.start();
  try {
    await twoManagers(browser, false);
    await twoManagers(browser, true);
    await twoManagers(browser, false, true);
    for (const width of [390, 768, 1280]) {
      await inspect(await open(browser, route, { width }), async page => {
        await page.locator('#fe-name').waitFor();
        const button = page.getByRole('button', { name: 'Add contact' });
        assert.equal(await button.getAttribute('aria-expanded'), 'false');
        assert.equal(await page.locator('.fe-sum').textContent(), 'No contact added');
        assert((await button.boundingBox()).height >= 44);
        assert.equal(await page.locator('#fe-phone').isVisible(), false);
        assert.equal(await page.locator('[data-fe="save"]').count(), 1);
        assert(await page.locator('[data-fe="save"]').isDisabled());
        await button.focus();
        await page.keyboard.press('Enter');
        assert.equal(await page.locator(toggle).getAttribute('aria-expanded'), 'true');
        assert.equal(await page.locator(toggle).evaluate(node => document.activeElement === node), true);
        assert(await page.getByLabel('Contact name').isVisible());
        assert(await page.getByLabel('Phone (optional)').isVisible());
        assert(await page.getByLabel('Email (optional)').isVisible());
        assert.equal(await L.overflow(page), false);
        assert.equal(await page.evaluate(k => window.__fake.reads.filter(x => x === k).length, contactKey), 1);
      });
    }
    await inspect(await open(browser, route, { hasContact: true, settings: { text: 'xlarge' } }), async page => {
      await page.getByRole('button', { name: 'Edit contact' }).waitFor();
      assert.equal(await page.locator('.fe-sum').textContent(), contact.cname);
      assert.equal(await L.overflow(page), false);
      // The confirmed label is wider with some fallback fonts while the app font loads.
      await page.locator('.fe-head .fn-tag').evaluate(tag => { tag.style.fontFamily = 'monospace'; });
      assert.equal(await L.overflow(page), false, 'the booking header fits with a wide fallback font');
      assert(await page.locator('.fn-tw:has(> .fe-grid)').evaluate(node => node.scrollWidth > node.clientWidth));
      await fields(page);
      assert.equal(await page.locator('#fe-email').inputValue(), contact.email);
    });
    await inspect(await open(browser, route, { hasContact: true, failReads: 'fncontact/smith$' }), async page => {
      await page.getByText('Contact unavailable', { exact: true }).waitFor();
      assert(await page.locator('#fe-phone').isVisible());
      await page.locator('#fe-notes').fill('Preserve the private contact');
      await save(page);
      assert.deepEqual(await dump(page, contactKey), contact);
    });
    await inspect(await open(browser, route, { hasContact: true, denyReads: 'fncontact/smith$', fakeSDK: shim(cacheSdk) }), async page => {
      await page.getByText('Contact not verified', { exact: true }).waitFor();
      assert(await page.locator('#fe-phone').isVisible());
      assert.equal(await page.getByText('No contact added', { exact: true }).count(), 0);
    });
    await inspect(await open(browser, route, { fakeSDK: shim(stalledSdk) }), async page => {
      await page.getByText('Opening the function...', { exact: true }).first().waitFor();
      assert.equal(await page.locator(toggle).count(), 0);
    });
    await inspect(await open(browser, '#/functions/new'), async page => {
      await fields(page);
      await page.locator('#fe-email').fill('wrong-address');
      await page.getByRole('button', { name: 'Hide contact' }).click();
      assert.equal(await page.locator('#fe-email').isVisible(), false);
      assert.equal(await page.locator(toggle).evaluate(node => document.activeElement === node), true);
      const writes = await page.evaluate(() => window.__fake.writes.length);
      await page.locator('[data-fe="save"]').click();
      const email = page.locator('#fe-email[aria-invalid="true"]');
      await email.waitFor();
      assert.equal(await email.evaluate(node => document.activeElement === node), true);
      assert.match(await page.locator('#fe-e-email').textContent(), /does not look like an email/);
      assert.equal(await page.evaluate(() => window.__fake.writes.length), writes);
      await goToList(page);
      await page.getByText('Carry on with it', { exact: true }).click();
      assert.equal(await page.locator('#fe-email').inputValue(), 'wrong-address');
      await page.locator('#fe-email').fill('draft@example.com');
      await page.locator('#fe-cname').fill('Festival bookings');
      assert.equal(await page.locator('.fe-sum').textContent(), 'Festival bookings');
      await page.evaluate(() => { window.__fake.mode = 'hold'; });
      await page.locator('[data-fe="save"]').click();
      await page.locator('.fe-saving').getByText('Saving...', { exact: true }).waitFor();
      assert.equal(await page.locator('.p-toast-msg').count(), 0);
      await page.evaluate(() => window.__fake.warm());
      await page.locator('.p-toast-msg').getByText('Draft saved. The kitchen does not see it yet.', { exact: true }).waitFor();
      assert.equal(await page.locator('.fe-sum').textContent(), 'Festival bookings');
    });
    await inspect(await open(browser, route, { who: 'ann', hasContact: true }), async page => {
      await page.getByText(/Only function managers change functions/).waitFor();
      assert.equal(await page.locator(toggle).count(), 0);
      assert.equal(await page.evaluate(k => window.__fake.reads.includes(k), contactKey), false);
    });
    console.log('Booking contact checks passed');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
