/* Actual-app implementation evidence with synthetic Firebase records. No UI DOM edits.
   Run after implementation: CHROME=/usr/bin/chromium node docs/staff-personalisation-options/capture-implementation.cjs
   The only injected CSS supplies the app's existing official fonts locally. */
const fs = require('fs'), path = require('path'), cp = require('child_process');
const ROOT = path.resolve(__dirname, '../..'), L = require(path.join(ROOT, 'tests/lib'));
const server = require(path.join(ROOT, 'tests/serve'));
const OUT = path.join(__dirname, 'implementation');
const BASE = 'http://127.0.0.1:8780/';
const clock = Date.parse('2026-11-09T04:00:00Z'), day = '2026-11-09';
const key = bits => ['kitchens', L.PIN].concat(bits).join('/');
const fontsDir = '/tmp/lk-personalisation-fonts';
const fontsUrl = 'https://fonts.googleapis.com/css2?family=Barlow:wght@400;600;700&family=Barlow+Condensed:wght@700&family=Caveat:wght@700&display=swap';
function download(url, file) {
  if (!fs.existsSync(file)) cp.execFileSync('curl', ['-fsS', '--max-time', '30', url, '-o', file]);
  return fs.readFileSync(file);
}
function fontCss() {
  fs.mkdirSync(fontsDir, { recursive: true });
  const css = download(fontsUrl, path.join(fontsDir, 'fonts.css')).toString();
  return css.replace(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g, (_, url) => {
    const bytes = download(url, path.join(fontsDir, path.basename(new URL(url).pathname)));
    return 'url(data:font/ttf;base64,' + bytes.toString('base64') + ')';
  });
}
function fixture(name) {
  const records = {
    [key(['config', 'main'])]: { people: [
      { id: 'ann', name, role: 'staff', active: true, add: true, tick: true },
      { id: 'sam', name: 'Sam', role: 'sous', active: true, add: true, tick: true, del: true },
      { id: 'bo', name: 'Bo', role: 'staff', active: true, add: true, tick: true },
      { id: 'jo', name: 'Jo', role: 'staff', active: true, add: true, tick: true }
    ], staffIds: ['ann', 'sam', 'bo', 'jo'], sousIds: ['sam'],
    kitSecs: [{ id: 'larder', name: 'Larder' }, { id: 'grill', name: 'Grill' }, { id: 'sauce', name: 'Sauce' }],
    kitShifts: [{ id: 'lunch', name: 'Lunch', from: 600, to: 900 }, { id: 'dinner', name: 'Dinner', from: 960, to: 1320 }] },
    [key(['team', day])]: { day,
      on: [{ id: 'ann', sh: 'lunch', sec: 'larder' }, { id: 'sam', sh: 'lunch', sec: 'grill' }, { id: 'bo', sh: 'lunch', sec: 'larder' }, { id: 'jo', sh: 'lunch', sec: 'sauce' }],
      br: [{ id: 'ann', sh: 'lunch', at: 870, len: 30 }, { id: 'sam', sh: 'lunch', at: 840, len: 30 }],
      v: 1, at: clock - 3600000, upd: clock - 3600000, by: 'sam' }
  };
  [['Slice onions', 'Larder', '2 tubs'], ['Pick coriander', 'Larder', ''], ['Portion rump', 'Grill', '20'], ['Make gravy', 'Sauce', '5 L'], ['Laksa', 'Sauce', '1 batch'], ['Wash bok choy', 'Larder', '']].forEach(([text, station, qty], i) => {
    records[key(['days', day, 'items', 'preview-' + i])] = { text, station, qty, recipe: '', addedBy: 'Sam', addedById: 'sam', addedAt: clock - 3600000 + i * 1000, done: false, deleted: false };
  });
  return records;
}

async function inspect(p) {
 return p.evaluate(()=>{
  const rect=sel=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();return{top:+r.top.toFixed(2),height:+r.height.toFixed(2),bottom:+r.bottom.toFixed(2)}};
  const tab=document.querySelector('.tabbar'),limit=tab&&getComputedStyle(tab).display!=='none'?tab.getBoundingClientRect().top:innerHeight;
  const rows=[...document.querySelectorAll('.hm-coworkers > li')],summary=document.querySelector('#hm-full-team > summary'),heading=document.querySelector('#rtitle');
  const headingLines=[...document.querySelectorAll('.wall-main > .wall-h,.wall-main > .wall-date')].flatMap(e=>{const r=document.createRange();r.selectNodeContents(e);return [...r.getClientRects()]});
  const ornaments=[...document.querySelectorAll('.kb-hang-item')].filter(e=>e.getClientRects().length);
  const seasonal={theme:document.querySelector('#app')?.dataset.kbTheme||'off',visibleOrnaments:ornaments.length,note:!!document.querySelector('.kb-season-note'),ambient:window.KB_EFFECTS?.status().ambientCount||0,
   overlap:ornaments.some(e=>{const a=e.getBoundingClientRect();return headingLines.some(b=>a.left<b.right&&a.right>b.left&&a.top<b.bottom&&a.bottom>b.top)})};
  return{heading:heading?.textContent||'',headingRect:rect('#rtitle'),headingFont:heading?getComputedStyle(heading).font:null,ownDay:rect('#hm-day'),team:rect('#hm-with'),seasonal,
   visibleCoworkers:rows.filter(e=>e.getBoundingClientRect().bottom<=limit).length,totalCoworkers:rows.length,viewportLimit:limit,
   fullTeamVisible:!!summary&&summary.getBoundingClientRect().bottom<=limit,overflow:document.documentElement.scrollWidth>innerWidth,
   dayText:document.querySelector('#hm-day')?.textContent||'',teamText:document.querySelector('#hm-with')?.textContent||'',
   name:window.LK_PREP?.whoName?.()||'',fonts:[...document.fonts].filter(f=>['Barlow','Barlow Condensed','Caveat'].includes(f.family.replaceAll('"',''))).map(f=>({family:f.family,weight:f.weight,status:f.status})),
   topbarLabels:[...document.querySelectorAll('.wtop [aria-label]')].map(e=>e.getAttribute('aria-label'))};
 });
}
(async()=>{
 fs.mkdirSync(OUT,{recursive:true});const css=fontCss(),records=[];
 await new Promise(r=>server.listen(8780,'127.0.0.1',r));const browser=await L.start();
 const LONG='Alexandria Catherine Montgomery-Smythe J';
 const cases=[];
 for(const width of [390,768,1280,1400]) for(const variant of ['ordinary','long','long-large']) cases.push({id:variant+'-'+width,width,name:variant==='ordinary'?'Ann':LONG,text:variant==='long-large'?'xlarge':''});
 cases.push({id:'ordinary-large-390',width:390,name:'Ann',text:'xlarge'},
  {id:'medium-large-390',width:390,name:'Ana María O’Neill',text:'xlarge'},
  {id:'devanagari-390',width:390,name:'अदिति शर्मा'}, {id:'cjk-390',width:390,name:'李明'},
  {id:'shared-390',width:390,name:'Ann',mode:'shared'},
  {id:'shared-long-390',width:390,name:LONG,mode:'shared'},
  {id:'shared-long-large-390',width:390,name:LONG,mode:'shared',text:'xlarge'},
  {id:'shared-long-1400',width:1400,name:LONG,mode:'shared'},
  {id:'shared-long-1440',width:1440,name:LONG,mode:'shared'},
  {id:'unassigned-390',width:390,name:'Ann',state:'unassigned'},
  {id:'team-unset-390',width:390,name:'Ann',state:'unset'},
  {id:'team-error-390',width:390,name:'Ann',state:'error'},
  {id:'functions-only-390',width:390,name:'Fay',state:'functions'},
  {id:'signed-out-390',width:390,name:'Ann',state:'signed-out'},
  {id:'missing-name-390',width:390,name:''},
  {id:'long-fallback-390',width:390,name:LONG,fallback:true},
  {id:'long-large-fallback-390',width:390,name:LONG,text:'xlarge',fallback:true},
  {id:'seasonal-ordinary-large-390',width:390,name:'Ann',text:'xlarge',seasonal:'np-tihar'},
  {id:'seasonal-medium-large-390',width:390,name:'Ana María O’Neill',text:'xlarge',seasonal:'in-diwali'},
  {id:'seasonal-long-large-390',width:390,name:LONG,text:'xlarge',seasonal:'np-tihar'},
  {id:'seasonal-long-large-1280',width:1280,name:LONG,text:'xlarge',seasonal:'np-tihar'},
  {id:'seasonal-neutral-390',width:390,name:'Ann',state:'signed-out',seasonal:'np-tihar'});
 try{
  for(const c of cases){
   const data=fixture(c.name),cfg=data[key(['config','main'])],team=data[key(['team',day])];
   if(c.state==='unassigned'){team.on=team.on.filter(p=>p.id!=='ann');team.br=team.br.filter(p=>p.id!=='ann')}
   if(c.state==='unset')delete data[key(['team',day])];
   if(c.state==='functions'){cfg.people[0].role='fnc';cfg.people[0].fn=true;cfg.fnIds=['ann'];cfg.fnOnlyIds=['ann']}
   const p=await L.open(browser,'#/',{base:BASE,who:c.state==='signed-out'?'':'ann',noPin:c.state==='signed-out',extra:data,clock,width:c.width,height:c.width===390?844:1000,wait:1400,deviceMode:c.mode||'personal',settings:c.text?{text:c.text}:{},...(c.seasonal?{seasonal:{selection:c.seasonal,motion:'gentle',density:'festive'}}:{}),...(c.state==='error'?{failReads:'/team/'}:{})});
   if(!c.fallback){await p.addStyleTag({content:css});await p.evaluate(()=>document.fonts.ready)}
   if(!['unset','error','functions','signed-out'].includes(c.state))await L.waitFor(p,()=>document.querySelectorAll('.hm-coworkers > li').length===3,null,6000);
   if(c.seasonal){
    // Hand-picked themes are a tab-only test option, not a persisted preference.
    await L.waitFor(p,()=>!!window.KB_SEASONAL);
    await p.evaluate(selection=>KB_SEASONAL.configure({selection,motion:'gentle',density:'festive'}),c.seasonal);
    await L.waitFor(p,selection=>document.querySelector('#app')?.dataset.kbTheme===selection,c.seasonal);
    await p.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
   }
   await p.screenshot({path:path.join(OUT,c.id+'.png')});
   const measured=await inspect(p);
   if(c.id==='ordinary-390'){
    await p.click('#hm-full-team > summary');measured.fullTeamOpensInOneTap=await p.locator('#hm-full-team').evaluate(e=>e.open);
    await p.screenshot({path:path.join(OUT,'full-team-390.png')});
   }
   records.push({...c,...measured,errors:p.errors});console.log(c.id);
   await p.context().close();
  }
  const crypto=require('crypto'),hash=file=>crypto.createHash('sha256').update(fs.readFileSync(path.join(ROOT,file))).digest('hex');
  const result={sourceCommit:cp.execFileSync('git',['rev-parse','HEAD'],{cwd:ROOT}).toString().trim(),sourceHashes:Object.fromEntries(['js/app.js','css/app.css','js/prep.js','css/seasonal-effects.css','js/seasonal/theme-effects.js'].map(file=>[file,hash(file)])),method:'Actual app markup and styles. Synthetic Firebase records; locally supplied official app fonts except named fallback cases. No greeting or layout DOM edits. Text size uses the saved app setting.',limits:'Chromium presentation and the noted disclosure click only. No real kitchen records, production session, emulator or real device validation.',records};
  fs.writeFileSync(path.join(OUT,'measurements.json'),JSON.stringify(result,null,2)+'\n');
  if(records.some(r=>r.errors.length||r.overflow||r.seasonal.overlap))throw new Error('Capture reported an error, horizontal overflow or seasonal text collision');
 }finally{await browser.close();await new Promise(r=>server.close(r))}
})().catch(e=>{console.error(e);process.exit(1)});
