import { board } from './board.mjs';
const el = id => document.getElementById(id);
const results = [];
const scores = ['right','wrong','retry'];
let generation = 0, recognition, controller, section = null, attempt;
const SpeechInput = window.SpeechRecognition || window.webkitSpeechRecognition;
el('talk').disabled = !SpeechInput;
if (!SpeechInput) el('reply').textContent = 'Voice input unavailable in this browser. Type a command.';
for (const line of board) {
  const row = document.createElement('li');
  row.textContent = [line.section, line.day, line.name].join(' · ');
  el('lines').append(row);
}
function enableScore(value) { scores.forEach(id => { el(id).disabled = !value; }); }
function stop() {
  generation++;
  recognition?.abort();
  recognition = null;
  controller?.abort();
  window.speechSynthesis?.cancel();
}
function finish(text) {
  el('reply').textContent = text;
  attempt.elapsed_ms = Math.round(performance.now() - attempt.start);
  enableScore(true);
}
function begin(mode) {
  el('book').open = false;
  el('found').disabled = true;
  if (attempt) record('abandoned');
  stop();
  attempt = { mode, start: performance.now() };
  el('heard').textContent = '';
  return generation;
}
function record(outcome) {
  if (!attempt) return;
  results.push({ attempt: results.length + 1, mode: attempt.mode, outcome,
    elapsed_ms: attempt.elapsed_ms ?? Math.round(performance.now() - attempt.start) });
  el('count').textContent = results.length + ' scored';
  attempt = null;
  enableScore(false);
}
async function ask(words, ticket) {
  el('heard').textContent = 'Heard: ' + words;
  el('reply').textContent = 'Checking…';
  controller = new AbortController();
  try {
    const response = await fetch('/ask',{method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({words,section}),signal:controller.signal});
    if (!response.ok) throw Error();
    const result = await response.json();
    if (ticket !== generation) return;
    section = result.section;
    finish(result.text);
    if (window.speechSynthesis) window.speechSynthesis.speak(new SpeechSynthesisUtterance(result.text));
  } catch {
    if (ticket !== generation) return;
    el('reply').textContent = 'Could not get an answer. Use the touch list.';
    record('unavailable');
  }
}
el('form').onsubmit = event => {
  event.preventDefault();
  const words = el('words').value.trim();
  if (words) ask(words,begin('typed'));
};
el('talk').onclick = () => {
  const ticket = begin('voice');
  recognition = new SpeechInput();
  recognition.lang = 'en-AU';
  let heard = false;
  recognition.onresult = event => {
    if (ticket !== generation || heard) return;
    heard = true;
    ask(event.results[0][0].transcript,ticket);
  };
  recognition.onend = () => {
    if (ticket === generation && !heard && attempt) {
      el('reply').textContent = 'No speech received. Try again or type.';
      record('no input');
    }
  };
  recognition.onerror = () => {
    if (ticket !== generation || heard) return;
    el('reply').textContent = 'Microphone unavailable. Try typing.';
    record('microphone error');
  };
  try { recognition.start(); el('reply').textContent = 'Listening…'; }
  catch { recognition.onerror(); }
};
function reset() {
  stop();
  record('stopped');
  section = null;
  el('words').value = '';
  el('heard').textContent = '';
  el('reply').textContent = 'Stopped. Section cleared.';
}
el('stop').onclick = reset;
document.addEventListener('visibilitychange', () => { if (document.hidden) reset(); });
scores.forEach(id => { el(id).onclick = () => record(id); });
el('download').onclick = () => {
  const url = URL.createObjectURL(new Blob([JSON.stringify(results,null,2)],{type:'application/json'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'ask-prep-trial.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
};
el('touch').onclick = () => {
  begin('touch');
  el('book').open = true;
  el('found').disabled = false;
  el('reply').textContent = 'Find the requested line, then tap Found it.';
};
el('found').onclick = () => {
  if (attempt?.mode !== 'touch') return;
  el('found').disabled = true;
  finish('Tell the observer which line you found.');
};
