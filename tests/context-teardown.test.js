// Synthetic lifecycle boundary, not an application test or a reproduction of Chromium's internal hung command.
// A modelled native-close pause exposes a held route.fetch acknowledgement that can queue a final reload.
const L = require('./lib'), http = require('http');
const { R, ok } = L.results();
const deferred = () => { let resolve; const promise = new Promise(r => resolve = r); return { promise, resolve }; };
const bounded = (promise, label) => { let timer; return Promise.race([promise, new Promise((_, reject) => timer = setTimeout(() => reject(Error('Lifecycle fixture did not progress: ' + label)), 5000))]).finally(() => clearTimeout(timer)); };

(async () => {
  const ackRequested = deferred(), releaseAck = deferred(), routeSettled = deferred(), nativeEntered = deferred(), releaseNative = deferred(), originSdk = deferred(), liveError = deferred();
  const expectedLiveError = 'Synthetic active-body route failure', unexpectedErrors = [], nativeCloses = new WeakMap();
  let sdkRequests = 0, fakeRequests = 0, observerFakeRequests = 0, lateRouteErrors = 0, pageCloses = 0, contextCloses = 0, browser;
  const onUnhandled = error => { const message = String(error && error.message || error); if (message === expectedLiveError) liveError.resolve(); else unexpectedErrors.push(message); };
  process.on('unhandledRejection', onUnhandled);
  const server = http.createServer((req, res) => {
    res.setHeader('cache-control', 'no-store');
    if (req.url === '/ack') { ackRequested.resolve(); releaseAck.promise.then(() => res.end('ack')); return; }
    if (req.url === '/sdk.js') { sdkRequests++; originSdk.resolve(); res.setHeader('content-type', 'application/javascript'); res.end('window.originSdk=true'); return; }
    if (req.url === '/ping') { res.end('still-online'); return; }
    res.setHeader('content-type', 'text/html');
    res.end('<script src="/sdk.js"></script><script>window.bodyComplete=false;window.queueAcknowledgement=function(){window.finish=fetch("/ack").then(()=>location.reload())}</script><p>Synthetic lifecycle page</p>');
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  const base = 'http://127.0.0.1:' + server.address().port + '/';
  const method = process.env.LK_WS ? 'connect' : 'launch', originalStart = L.chromium[method];
  let first = true;
  L.chromium[method] = async (...args) => {
    const b = await originalStart.apply(L.chromium, args), newContext = b.newContext.bind(b);
    b.newContext = async (...opts) => {
      const ctx = await newContext(...opts), nativeClose = ctx.close.bind(ctx);
      nativeCloses.set(ctx, nativeClose);
      if (first) {
        first = false;
        ctx.close = async options => { nativeEntered.resolve(); await releaseNative.promise; return nativeClose(options); };
      }
      return ctx;
    };
    return b;
  };
  try {
    browser = await L.start(); L.chromium[method] = originalStart;
    const ctx = await browser.newContext({ serviceWorkers: 'block' }), observer = await browser.newContext({ serviceWorkers: 'block' });
    const page = await ctx.newPage(), other = await observer.newPage();
    page.on('close', () => pageCloses++); ctx.on('close', () => contextCloses++);
    await ctx.route('**/sdk.js', r => { fakeRequests++; return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.fakeSdk=true' }); });
    await observer.route('**/sdk.js', r => { observerFakeRequests++; return r.fulfill({ status: 200, contentType: 'application/javascript', body: 'window.fakeSdk=true' }); });
    await ctx.route('**/ack', async r => {
      try {
        const response = await r.fetch(); await r.fulfill({ response });
        if (page.isClosed()) throw Error('Synthetic late callback rejection after teardown');
      } catch (error) { lateRouteErrors++; throw error; }
      finally { routeSettled.resolve(); }
    });
    await page.goto(base); await other.goto(base);
    ok(await page.evaluate(() => window.fakeSdk === true) && sdkRequests === 0, 'the live fixture starts behind its SDK stand-in');
    await page.evaluate(() => { window.bodyComplete = true; window.queueAcknowledgement(); });
    await bounded(ackRequested.promise, 'held route.fetch');
    ok(await page.evaluate(() => window.bodyComplete), 'body assertions finish before the held acknowledgement and teardown');
    const closing = ctx.close();
    ok(ctx.close() === closing, 'concurrent context close retains one helper promise');
    await bounded(nativeEntered.promise, 'modelled native-close pause');
    releaseAck.resolve();
    await bounded(routeSettled.promise, 'active route callback settles');
    // Old cleanup leaves this page alive. Let its deterministic queued reload expose the removed stand-in.
    if (!page.isClosed()) await bounded(originSdk.promise, 'queued reload reaches the synthetic SDK origin');
    ok(page.isClosed() && sdkRequests === 0, 'teardown closes the page before native disposal and no queued reload reaches an unmocked SDK');
    releaseNative.resolve(); await bounded(closing, 'native context close');
    await bounded(ctx.close(), 'later repeated close');
    ok(pageCloses === 1 && contextCloses === 1, 'repeated close emits one page and context close');
    ok(lateRouteErrors === 1 && unexpectedErrors.length === 0, 'ignoreErrors retains the already active callback rejection during teardown');
    const state = await other.evaluate(async () => ({ online: navigator.onLine, ping: await (await fetch('/ping')).text(), sdk: await (await fetch('/sdk.js')).text() }));
    ok(!other.isClosed() && state.online && state.ping === 'still-online' && state.sdk.includes('fakeSdk') && observerFakeRequests === 2, 'another owned context stays online with its stand-in intact');

    const active = await browser.newContext(), activePage = await active.newPage();
    await active.route('**/live-error', () => { throw Error(expectedLiveError); });
    await activePage.goto(base);
    await activePage.evaluate(() => { fetch('/live-error').catch(() => {}); });
    await bounded(liveError.promise, 'active-body route rejection');
    ok(true, 'a route callback rejection before teardown still propagates');
    await active.close();

    const failed = await browser.newContext(), offline = failed.setOffline.bind(failed);
    failed.setOffline = async () => { throw Error('Synthetic teardown isolation failure'); };
    let rejected = false;
    try { await failed.close(); } catch (error) { rejected = error.message === 'Synthetic teardown isolation failure'; }
    ok(rejected, 'a teardown isolation failure is propagated rather than reported as a successful close');
    failed.setOffline = offline; await nativeCloses.get(failed)();
    await browser.close(); browser = null;
    ok(unexpectedErrors.length === 0, 'the lifecycle fixture has no unrelated asynchronous errors');
  } finally {
    L.chromium[method] = originalStart; releaseAck.resolve(); releaseNative.resolve();
    if (browser) await browser.close().catch(() => {});
    server.closeAllConnections(); await new Promise(r => server.close(r));
    process.removeListener('unhandledRejection', onUnhandled);
  }
  L.report(R);
})().catch(error => { console.error(error); console.log(R.join('\n')); process.exit(1); });
