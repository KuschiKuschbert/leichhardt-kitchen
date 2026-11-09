/* Package the isolated concepts as a single offline HTML file. */
const fs = require('fs');
const path = require('path');
const folder = __dirname;
let html = fs.readFileSync(path.join(folder, 'index.html'), 'utf8');
const fonts = fs.readFileSync(path.join(folder, 'assets/fonts.css'), 'utf8').replace(/url\(([^)]+)\)/g, (_, name) => {
  const file = path.join(folder, 'assets', name.replace(/["']/g, ''));
  return 'url(data:font/ttf;base64,' + fs.readFileSync(file).toString('base64') + ')';
});
const css = fs.readFileSync(path.join(folder, 'preview.css'), 'utf8');
const js = fs.readFileSync(path.join(folder, 'preview.js'), 'utf8').replace(/<\/script/gi, '<\\/script');
const licences = ['barlow', 'barlowcondensed', 'caveat'].map(name => name + '\n' + fs.readFileSync(path.join(folder, 'assets', name + '-OFL.txt'), 'utf8')).join('\n\n');
html = html.replace('<link rel="stylesheet" href="assets/fonts.css">', '<style>' + fonts + '</style>')
  .replace('<link rel="stylesheet" href="preview.css">', '<style>' + css + '</style>')
  .replace('<script src="preview.js" defer></script>', '')
  .replace('</body>', '<script type="text/plain" id="bundled-font-licences">' + licences + '</script>\n<script>' + js + '</script>\n</body>');
fs.writeFileSync(path.join(folder, 'orders-designs.html'), html);
console.log('Wrote orders-designs.html (' + Buffer.byteLength(html) + ' bytes), with fonts, styles and interactions embedded.');
