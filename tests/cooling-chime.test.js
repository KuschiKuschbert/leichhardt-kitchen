// Operandio's three stronger chimes use the audio clock and can be cancelled as one sequence.
// A Web Audio stand-in checks scheduled notes, source levels, limiter routing and held resume boundaries.
const assert = require('assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const source = fs.readFileSync(path.join(__dirname, '../js/chime.js'), 'utf8');
let checks = 0;
function check(value, message) { assert.ok(value, message); checks++; console.log('PASS ' + message); }
function harness(noAudio) {
  const events = {}, timers = new Map(), oscillators = [], gains = [], held = [];
  let timerId = 0, audio, resumeCalls = 0, hold = false, fail = false;
  const param = () => ({ value: 0, events: [], setValueAtTime(v, t) { this.events.push(['set', v, t]); },
    exponentialRampToValueAtTime(v, t) { this.events.push(['ramp', v, t]); }, linearRampToValueAtTime(v, t) { this.events.push(['linear', v, t]); } });
  const node = () => ({ connected: [], disconnected: 0, connect(to) { this.connected.push(to); }, disconnect() { this.disconnected++; } });
  class Audio {
    constructor() { audio = this; this.currentTime = 10; this.state = 'running'; this.destination = {}; this.suspends = 0; }
    createDynamicsCompressor() { this.limiter = Object.assign(node(), { threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }); return this.limiter; }
    createGain() { const gain = Object.assign(node(), { gain: param() }); gains.push(gain); return gain; }
    createOscillator() { const o = Object.assign(node(), { frequency: param(), type: '', stops: [], start(t) { this.started = t; }, stop(t) { this.stops.push(t); } }); oscillators.push(o); return o; }
    createBufferSource() { return Object.assign(node(), { start() {} }); }
    createBuffer() { return {}; }
    resume() { resumeCalls++; if (fail) return Promise.reject(new Error('blocked')); this.state = 'running'; return hold ? new Promise(resolve => held.push(() => { this.state = 'running'; resolve(); })) : Promise.resolve(); }
    suspend() { this.state = 'suspended'; this.suspends++; return Promise.resolve(); }
  }
  const listen = (name, fn) => { (events[name] || (events[name] = [])).push(fn); };
  const document = { visibilityState: 'visible', addEventListener: listen };
  const window = { AudioContext: noAudio ? undefined : Audio, addEventListener: listen };
  vm.runInNewContext(source, { window, document, navigator: { audioSession: {} }, Number, Math,
    setTimeout(fn, ms) { const id = ++timerId; timers.set(id, { fn, ms }); return id; }, clearTimeout(id) { timers.delete(id); } });
  return { api: window.LK_CHIME, document, oscillators, gains, timers, get audio() { return audio; }, get resumeCalls() { return resumeCalls; },
    event(name) { (events[name] || []).forEach(fn => fn()); }, hold(value) { hold = value; }, fail(value) { fail = value; }, release() { hold = false; held.splice(0).forEach(fn => fn()); },
    sleep() { const all = [...timers.values()]; timers.clear(); all.forEach(t => t.fn()); } };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const roots = h => h.oscillators.filter(o => o.frequency.value === 784 || o.frequency.value === 1046.5);
const peak = o => o.connected[0].gain.events.filter(e => e[0] === 'ramp')[0][1];
(async () => {
  let h = harness();
  check(h.api.playCooling() === false && !h.audio, 'An untouched device does not create audio or ring');
  h.api.wake(); await settle();
  const before = h.resumeCalls;
  check(h.api.playCooling() === true, 'A gesture-woken device accepts the cooling alert'); await settle();
  const notes = roots(h), begins = notes.filter(o => o.frequency.value === 784).map(o => o.started);
  check(h.resumeCalls === before + 1, 'The entire sequence asks the browser to resume once');
  check(notes.length === 6 && h.oscillators.length === 18, 'Three two-note chimes each have their original three harmonics');
  check(begins.every((t, i) => Math.abs(t - (10.03 + i * 1.65)) < 1e-8), 'Three chimes are spaced on the audio clock, not browser repeat timers');
  check(notes.every(o => peak(o) === 0.6), 'Cooling fundamental amplitude is twice the ordinary 0.3 chime');
  check(h.gains[0].gain.value === 0.9 && h.gains[0].connected[0] === h.audio.limiter && h.audio.limiter.ratio.value === 12, 'All stronger notes retain the existing output level and limiter');
  check(Math.abs(Math.max(...h.oscillators.map(o => o.stops[0])) - 14.725) < 1e-8, 'All three chimes finish in under 4.8 seconds');
  check(h.timers.size === 1 && [...h.timers.values()][0].ms > 5000 && [...h.timers.values()][0].ms < 5200, 'Only the bounded sleep timer is active, with no repeat timer');
  h.api.stopCooling();
  check(h.oscillators.every(o => o.stops.length === 2 && o.stops[1] === 10 && o.disconnected && o.connected[0].disconnected), 'Stopping silences current and future notes together');
  h.sleep(); await settle(); check(h.audio.state === 'suspended', 'The audio context returns to sleep after cancellation');

  h = harness(); h.api.wake(); await settle(); h.api.play('chime'); await settle();
  const ordinary = h.oscillators.slice();
  check(roots(h).length === 2 && roots(h).every(o => peak(o) === 0.3), 'Ordinary Soft chime keeps one pair and its original level');
  h.api.playCooling(); await settle(); const firstCooling = h.oscillators.slice(ordinary.length);
  h.api.playCooling(); await settle();
  check(firstCooling.every(o => o.stops.length === 2), 'A replacement cooling alert cancels the previous scheduled repeats');
  check(ordinary.every(o => o.stops.length === 1 && !o.disconnected), 'Replacing cooling does not cancel ordinary ping notes');
  h.document.visibilityState = 'hidden'; h.event('visibilitychange');
  check(h.oscillators.slice(ordinary.length).every(o => o.disconnected), 'Hiding the page cancels all remaining cooling notes');
  const count = h.oscillators.length;
  check(h.api.playCooling() === false && h.oscillators.length === count, 'A hidden page cannot start a new cooling sequence');

  h = harness(); h.api.wake(); await settle(); h.api.playCooling(); await settle();
  h.audio.currentTime += 0.5; h.api.play('timer'); await settle();
  check([...h.timers.values()][0].ms > 4200, 'An ordinary short ping during cooling cannot suspend before the third chime');
  check(roots(h).length === 6 && h.oscillators.filter(o => o.frequency.value === 1480).length === 3, 'The ordinary ping and all three cooling chimes are retained');
  h = harness(); h.api.wake(); await settle(); h.api.playCooling(); await settle();
  h.hold(true); h.api.play('bell'); h.api.stopCooling();
  check(h.timers.size === 1, 'Cooling cancellation restores a real sleep timer while ordinary resume is held');
  h.sleep(); h.event('mousedown'); h.release(); await settle();
  check(h.oscillators.length === 18 && h.timers.size === 1, 'A discarded held ordinary sound does not ring or leave the context awake');
  h.sleep(); await settle(); check(h.audio.state === 'suspended', 'The mixed cancellation returns to sleep after the late resume');

  for (const cancel of ['stop', 'hidden', 'pagehide', 'tap']) {
    h = harness(); h.api.wake(); await settle(); h.hold(true); h.api.playCooling();
    if (cancel === 'stop') { h.api.stopCooling(); h.sleep(); }
    if (cancel === 'hidden') { h.document.visibilityState = 'hidden'; h.event('visibilitychange'); }
    if (cancel === 'pagehide') h.event('pagehide');
    if (cancel === 'tap') h.event('mousedown');
    h.release(); await settle();
    check(h.oscillators.length === 0, cancel + ': a held resume never produces a late chime');
    h.sleep(); await settle(); check(h.audio.state === 'suspended', cancel + ': a cancelled held resume also returns to sleep');
  }
  h = harness(); h.api.wake(); await settle(); h.hold(true); h.api.playCooling(); h.api.playCooling(); h.release(); await settle();
  check(roots(h).length === 6, 'Two held requests resolve to one current three-chime sequence');
  h.event('pagehide'); check(h.oscillators.every(o => o.disconnected), 'Leaving the page stops already scheduled cooling notes');
  h = harness(); h.api.wake(); await settle(); h.fail(true); h.api.playCooling(); await settle();
  check(h.oscillators.length === 0 && h.api.playCooling() === false, 'A browser resume refusal stays silent and requires a new gesture');
  h = harness(true); h.api.wake(); check(h.api.playCooling() === false, 'A device without Web Audio remains usable and silent');
  h = harness();
  check(h.api.list.map(x => x.id).join() === 'bell,order,chime,marimba,timer' && !h.api.has('cooling') && !h.api.has('off'), 'Cooling adds no ringtone preference or saved sound ID');
  console.log(checks + ' cooling chime checks passed');
})().catch(error => { console.error(error); process.exit(1); });
