/*
  A small static server for the book (the repository folder), the way GitHub Pages serves it, with no caching.
  run.js starts it by itself. To look at the book in a browser while working:  node tests/serve.js  then open
  http://127.0.0.1:8777/
*/
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.webmanifest': 'application/manifest+json', '.json': 'application/json', '.pdf': 'application/pdf' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p.startsWith('/leichhardt-kitchen/')) p = p.slice('/leichhardt-kitchen'.length);
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (e, b) => {
    if (e) { res.writeHead(404); return res.end('not found'); }
    // a fixed Last-Modified, so the book's self-update check never sees a "new version" during a test
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'Last-Modified': 'Sun, 18 Oct 2026 00:00:00 GMT' });
    res.end(b);
  });
});
module.exports = server;
if (require.main === module) {
  const port = +process.argv[2] || 8777;
  server.listen(port, '127.0.0.1', () => console.log('Serving ' + root + ' at http://127.0.0.1:' + port + '/'));
}
