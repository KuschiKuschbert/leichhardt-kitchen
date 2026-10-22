/*
  A small static server for the book (the repository folder), the way GitHub Pages serves it, with no caching.
  run.js starts it by itself. To look at the book in a browser while working:  node tests/serve.js  then open
  http://127.0.0.1:8777/
*/
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.pdf': 'application/pdf' };
/* over (tests only): files the server answers differently, by path: { body, lastModified }; over.delay holds every
   answer back that many ms, like slow wifi. saved-copy.test.js starts its own server with these. */
const handler = over => (req, res) => {
  over = over || {};
  if (over.delay) { const d = over.delay; return setTimeout(() => answer(req, res, over), d); }
  answer(req, res, over);
};
function answer(req, res, over) {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/leichhardt-kitchen/')) p = p.slice('/leichhardt-kitchen'.length);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  const o = over[p];
  if (o) { res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Last-Modified': o.lastModified }); return res.end(o.body); }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    // a fixed Last-Modified, so the book's self-update check never sees a "new version" during a test
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Last-Modified': 'Sun, 18 Oct 2026 00:00:00 GMT', 'X-Served': String(Date.now()) });   // X-Served: when this copy left the server (saved-copy.test.js)
    res.end(b);
  });
}
const server = http.createServer(handler());
server.make = over => http.createServer(handler(over));
module.exports = server;
if (require.main === module) {
  const port = +process.argv[2] || 8777;
  server.listen(port, '127.0.0.1', () => console.log('Serving ' + root + ' at http://127.0.0.1:' + port + '/'));
}
