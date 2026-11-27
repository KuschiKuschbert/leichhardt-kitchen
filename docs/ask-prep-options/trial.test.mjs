import test from 'node:test';
import assert from 'node:assert/strict';
import { answer } from './board.mjs';
import { trialServer } from './server.mjs';
test('section follow-up, ambiguity and day isolation', () => {
  const tick = { action:'tick', item:'onions', day:'today' };
  assert.match(answer(tick,null).text,/Which section/);
  assert.equal(answer(tick,'Grill').text,'Proposed tick: Grill, Red onions, today.');
  assert.equal(answer({...tick,day:'tomorrow'},'Sauce').text,'No matching line. Say the item again.');
  assert.match(answer({action:'unclear'},'Grill').text,/again/);
});
test('server serves the study and handles model success and failure', async t => {
  const server = trialServer(async words => {
    if (words === 'fail') throw Error();
    return {action:'list', section:'Grill',day:'today'};
  });
  await new Promise(resolve => server.listen(0,'127.0.0.1',resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = 'http://127.0.0.1:' + server.address().port;
  for (const path of ['/','/trial.js','/board.mjs']) assert.equal((await fetch(base+path)).status,200);
  const post = words => fetch(base+'/ask',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({words,section:null})});
  assert.match((await (await post('Grill?')).json()).text,/Red onions, Portion steaks/);
  assert.equal((await post('')).status,400);
  assert.equal((await post('fail')).status,503);
});
