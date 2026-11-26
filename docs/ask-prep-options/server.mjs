// Run on localhost or behind a private authenticated HTTPS proxy for a trial phone.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { answer } from './board.mjs';

const root = new URL('./', import.meta.url);
const paths = new Map([['/', ['index.html','text/html']], ['/trial.js',['trial.js','text/javascript']], ['/board.mjs',['board.mjs','text/javascript']]]);
const prompt = 'Parse a kitchen command as JSON with action list, tick or unclear; section Grill, Sauce or null (null when omitted); day today or tomorrow (default today); item a literal item phrase from the command or null. Never invent an item or section. Use unclear for corrections, negation, unknown stations or unrelated requests. No other actions.';

export function trialServer(interpret) {
  return http.createServer(async (req, res) => {
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
    if (req.method === 'GET' && paths.has(req.url)) {
      const [file,type] = paths.get(req.url);
      res.setHeader('Content-Type', type + '; charset=utf-8');
      return res.end(await readFile(new URL(file, root)));
    }
    if (req.method !== 'POST' || req.url !== '/ask') { res.writeHead(404); return res.end(); }
    if (req.headers['content-type'] !== 'application/json' || req.headers['sec-fetch-site'] === 'cross-site') { res.writeHead(403); return res.end(); }
    try {
      let body = '';
      for await (const chunk of req) {
        body += chunk;
        if (Buffer.byteLength(body) > 2048) { res.writeHead(413); return res.end(); }
      }
      const {words, section} = JSON.parse(body);
      if (typeof words !== 'string' || !words.trim() || words.length > 250 ||
          ![null, 'Grill','Sauce'].includes(section)) { res.writeHead(400); return res.end(); }
      const result = answer(await interpret(words), section);
      res.setHeader('Content-Type','application/json');
      res.end(JSON.stringify(result));
    } catch { res.writeHead(503); res.end('Model unavailable. Use the touch list.'); }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const server = trialServer(async words => {
    if (!process.env.OPENAI_API_KEY) throw Error('Provider unavailable');
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST', signal: AbortSignal.timeout(12000),
      headers: {'Content-Type':'application/json', Authorization:'Bearer ' + process.env.OPENAI_API_KEY},
      body: JSON.stringify({model: process.env.TRIAL_MODEL || 'gpt-4o-mini', messages:[
        {role:'system',content:prompt},{role:'user',content:words}], response_format:{type:'json_object'}})
    });
    if (!response.ok) throw Error('Model unavailable');
    return JSON.parse((await response.json()).choices[0].message.content);
  });
  server.listen(Number(process.env.PORT || 8787), '127.0.0.1', () => console.log('Ask Prep trial listening on localhost'));
}
