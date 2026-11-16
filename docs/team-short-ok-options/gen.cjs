// Builds the design previews from the page snapshots (snap.cjs): <design>-<role>.html, each the real page with pv.css
// and pv.js added. Run: node gen.cjs
const fs = require('fs'), path = require('path');
for (const d of ['z', 'a', 'b', 'c', 'm']) for (const role of ['admin', 'team']) {
  let s = fs.readFileSync(path.join(__dirname, 'snap', role + '.html'), 'utf8').split('../../../').join('../../');
  s = s.replace('<title>', '<title>Preview ' + d.toUpperCase() + ', ' + role + ': ').replace('</head>', '<link rel="stylesheet" href="pv.css"></head>')
    .replace('</body>', (d === 'm' ? '<script src="mix.js"></script>' : '') + '<script src="pv.js" data-design="' + d + '" data-role="' + role + '"></script></body>');
  fs.writeFileSync(path.join(__dirname, d + '-' + role + '.html'), s);
}
console.log('ok');
