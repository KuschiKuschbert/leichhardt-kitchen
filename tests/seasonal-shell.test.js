// Startup scripts, styles and their local fonts belong to the same saved public shell.
// A missing optional drawing must not leave an installed book with a partly updated startup.
const fs = require('fs'), path = require('path'), vm = require('vm');
const { spawnSync } = require('child_process');
const root = path.resolve(__dirname, '..'), read = f => fs.readFileSync(path.join(root, f), 'utf8');
const R = [], ok = (condition, message) => R.push((condition ? 'PASS ' : 'FAIL ') + message);
const index = read('index.html'), worker = read('sw.js'), upkeep = read('js/upkeep.js');
const array = text => vm.runInNewContext(text);
const shell = array(worker.match(/var SHELL = (\[.*?\]);/)[1]).map(f => f.replace(/^\.\//, ''));
const refreshes = Array.from(upkeep.matchAll(/var files = (\[.*?\]);/g), m => array(m[1]));
const scripts = Array.from(index.matchAll(/<script\b[^>]*\bsrc="([^"?#]+)"[^>]*>/g), m => m[1]).filter(f => !/^https?:/.test(f));
const styles = Array.from(index.matchAll(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"?#]+)"[^>]*>/g), m => m[1]).filter(f => !/^https?:/.test(f));
const assets = scripts.concat(styles);
styles.forEach(f => {
  const css = read(f);
  for (const match of css.matchAll(/url\(['"]?([^)'"?#]+)['"]?\)/g)) {
    if (/^(?:data:|https?:)/.test(match[1])) continue;
    assets.push(path.posix.normalize(path.posix.join(path.posix.dirname(f), match[1])));
  }
});
ok(scripts.includes('js/seasonal/seasonal.js'), 'the real book loads the seasonal controller');
ok(scripts.indexOf('js/seasonal/seasonal.js') > scripts.indexOf('js/app.js'), 'seasonal integration follows the real app');
ok(refreshes.length === 2, 'both manual and 04:00 refresh manifests are checked');
Array.from(new Set(assets)).forEach(f => {
  ok(fs.existsSync(path.join(root, f)), 'startup asset exists: ' + f);
  ok(shell.includes(f) && refreshes.every(files => files.includes(f)), 'startup asset updates atomically: ' + f);
});
scripts.filter(f => f.startsWith('js/seasonal/')).forEach(f => {
  const result = spawnSync(process.execPath, ['--check', path.join(root, f)], { encoding: 'utf8', timeout: 10000 });
  ok(!result.error && result.status === 0, 'seasonal JavaScript parses: ' + f);
  if (result.error || result.status) console.error(result.error || result.stderr);
});
R.forEach(line => console.log(line));
const failed = R.filter(line => line.startsWith('FAIL')).length;
console.log(failed + ' failed of ' + R.length);
process.exit(failed ? 1 : 0);
