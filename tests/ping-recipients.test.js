const L=require('./lib'),{R,ok}=L.results();
const today=L.ymd(new Date(L.NOW)),key=p=>['kitchens',L.PIN].concat(p).join('/');
const ping=(text,to)=>({text,tag:'none',start:today,until:today,dows:[],tm:839,removed:false,at:L.NOW-60000,upd:L.NOW-60000,author:'sam',by:'sam',...(to?{to}:{})});
const extra={};extra[key(['notes','all'])]=ping('Whole kitchen brief');extra[key(['directnotes','ann-message'])]=ping('Ann private brief','ann');extra[key(['directnotes','bo-message'])]=ping('Bo private brief','bo');
const yesterday=L.ymd(new Date(L.NOW-86400000));extra[key(['directnotes','past-ann'])]={...ping('Ann past private brief','ann'),start:yesterday,until:yesterday};
const dump=p=>p.evaluate(()=>__fake.dump());
(async()=>{
 const b=await L.start();
 let p=await L.open(b,'#/prep',{who:'sam',extra,wait:1800});
 await L.chef(p,'pings');await p.click('[data-p="n-new"]');await L.settle(p,200);
 ok(await p.inputValue('#n-to')==='', 'new ping: Everyone is the default');
 ok((await p.locator('#n-to option').allTextContents()).join('|')==='Everyone|Sam|Ann|Bo','recipients: active kitchen people are listed');
 await L.pick(p, '#n-to','ann');await p.fill('#n-text','Ann targeted prep reminder');await p.click('[data-p="n-save"]');await L.settle(p,500);
 let data=await dump(p), entries=Object.entries(data).filter(([k,v])=>k.includes('/directnotes/')&&v.text==='Ann targeted prep reminder');
 ok(entries.length===1&&entries[0][1].to==='ann'&&entries[0][1].author==='sam','save: the message is stored privately for Ann');
 ok(!Object.entries(data).some(([k,v])=>k.includes('/notes/')&&v.text==='Ann targeted prep reminder'),'save: no individual text is written to Everyone pings');
 const id='direct/'+entries[0][0].split('/').pop();
 ok((await L.txt(p,'.p-notes-page')).includes('For Ann'),'management: the intended recipient is visible');
 await p.click('[data-p="n-edit"][data-id="'+id+'"]');await L.settle(p,200);
 ok(await p.locator('#n-to').isDisabled()&&await p.inputValue('#n-to')==='ann','edit: the saved recipient stays fixed');
 await p.fill('#n-text','Ann revised reminder');await p.click('[data-p="n-save"]');await L.settle(p,400);
 data=await dump(p);ok(data[entries[0][0]].text==='Ann revised reminder'&&data[entries[0][0]].to==='ann','edit: text changes preserve the recipient');
 await p.click('[data-p="n-reuse"][data-id="'+id+'"]');await L.settle(p,200);
 ok(!(await p.locator('#n-to').isDisabled())&&await p.inputValue('#n-to')==='ann','Use again: copies the recipient into a new editable draft');
 ok(!p.errors.length&&!(await L.overflow(p)),'chef editor: no errors or sideways scroll');await p.context().close();

 for(const who of ['ann','bo']) {
  p=await L.open(b,'#/prep',{who,extra,wait:1800});
  const rows=await p.evaluate(()=>LK_PREP.state.notes.map(n=>n.text));
  ok(rows.includes('Whole kitchen brief')&&rows.includes(who==='ann'?'Ann private brief':'Bo private brief')&&!rows.includes(who==='ann'?'Bo private brief':'Ann private brief'),who+': only Everyone and their own private message are downloaded');
  if(!await p.$('.nt'))await p.click('.nbell');await L.settle(p,250);
  const text=await L.txt(p,'.nt');ok(text.includes(who==='ann'?'Ann private brief':'Bo private brief')&&!text.includes(who==='ann'?'Bo private brief':'Ann private brief'),who+': the bell shows only their own individual ping');
  await p.click('[data-note="close"]');await L.settle(p,350);
  data=await dump(p);ok(!!data[key(['directnotes',who+'-message','seen',today+'_'+who])],who+': Got it writes a personal receipt under the private ping');
  ok(!Object.keys(data).some(k=>k.startsWith(key(['directnotes',who==='ann'?'bo-message':'ann-message','seen']))),who+': no receipt is written for someone else');
  ok(!p.errors.length,who+': no page errors');await p.context().close();
 }
 p=await L.open(b,'#/prep',{who:'sam',extra,wait:1800});
 if(!await p.$('.nt'))await p.click('.nbell');await L.settle(p,250);const chefText=await L.txt(p,'.nt');
 ok(!chefText.includes('Ann private brief')&&!chefText.includes('Bo private brief'),'chef bell: managing other people’s pings does not deliver them to the chef');
 await p.keyboard.press('Escape');await L.chef(p,'pings');await p.click('[data-p="n-past"]');await L.settle(p,300);
 ok(await p.evaluate(()=>LK_PREP.state.nPast.some(n=>n.text==='Ann past private brief')),'chef history: individual pings are retained in past pings');
 await p.evaluate(()=>{
  const fs=LK_PREP.book().fs(), original=fs.getDocsFromServer;
  window.__restorePingRead=()=>{fs.getDocsFromServer=original;};
  fs.getDocsFromServer=function(ref){const result=original(ref);return ref.path&&ref.path[2]==='directnotes'?result.then(value=>new Promise(resolve=>{window.__releasePingRead=()=>resolve(value);})):result;};
  LK_PREP.state.notesAt=0;LK_PREP.chefOpen('pings');
 });
 // The shared wait helper works under the live site's Content Security Policy.
 await L.waitFor(p,()=>!!window.__releasePingRead,null,10000);
 await p.evaluate(()=>{window.__restorePingRead();LK_PREP.signOut(true);});await L.settle(p,400);
 ok(await p.evaluate(()=>LK_PREP.state.notes===null&&LK_PREP.state.nPast===null),'handover: personal messages and private history are cleared');
 await p.click('.p-name[data-id="bo"]');await L.settle(p,250);await p.fill('#pf1','3333');await L.settle(p,1000);
 await p.evaluate(()=>window.__releasePingRead());await L.settle(p,250);
 const nextNotes=await p.evaluate(()=>LK_PREP.state.notes||[]);
 ok(nextNotes.some(n=>n.text==='Bo private brief')&&!nextNotes.some(n=>/Ann/.test(n.text)),'handover: a late chef read cannot replace the next person’s private pings');
 ok(!p.errors.length,'handover: no page errors');await p.context().close();
 p=await L.open(b,'#/prep',{who:'ann',extra,failReads:'directnotes',wait:1800});
 if(!await p.$('.nt'))await p.click('.nbell');await L.settle(p,250);
 ok((await L.txt(p,'.nt')).includes('Could not check individual pings'),'failed read: the person sees an error instead of a claim that no individual pings exist');
 await p.evaluate(()=>{
  const fs=LK_PREP.book().fs(), original=fs.getDocsFromServer;
  __fake.failReads=null;
  fs.getDocsFromServer=ref=>ref.path&&ref.path[2]==='directnotes'?new Promise(()=>{}):original(ref);
 });
 await p.click('[data-note="refresh"]');await p.clock.runFor(6500);await L.settle(p,100);
 ok(await p.evaluate(()=>!LK_PREP.state.notesBusy&&!!LK_PREP.state.nPrivateError),'slow connection: a stalled private query times out and releases the loading state');
 ok((await L.txt(p,'.nt')).includes('Whole kitchen brief'),'slow connection: Everyone pings remain available');
 ok(!p.errors.length,'failed read: no page errors');await p.context().close();
 // the personal check fails after a good read (no signal, a lost read; 28 Oct 2026): the personal ping already read for
 // this person stays with the warning, and the pings are read again once the phone is back online, not after 30 minutes
 p=await L.open(b,'#/prep',{who:'ann',extra,wait:1800});
 await L.waitFor(p,()=>(LK_PREP.state.notes||[]).some(n=>n.text==='Ann private brief'),null,6000).catch(()=>{});
 await p.evaluate(()=>{__fake.failReads=/directnotes/;const k=Object.keys(__fake.dump()).find(x=>/config\/main$/.test(x)),c=__fake.dump()[k];c.pastEdit=Object.assign({},c.pastEdit||{},{n:Date.now()+5000});__fake.write(k,c);});
 await L.waitFor(p,()=>!!LK_PREP.state.nPrivateError,null,6000).catch(()=>{});
 ok(await p.evaluate(()=>(LK_PREP.state.notes||[]).some(n=>n.text==='Ann private brief')),'personal check failed after a good read: Ann\'s ping already read stays');
 if(!await p.$('.nt'))await p.click('.nbell');await L.settle(p,250);
 const kept=await L.txt(p,'.nt')||'';ok(kept.includes('Ann private brief')&&kept.includes('Could not check individual pings'),'personal check failed: the sheet keeps her ping, with the warning');
 await p.keyboard.press('Escape');await L.settle(p,300);
 const dn0=await p.evaluate(()=>__fake.reads.filter(k=>/directnotes/.test(k)).length);
 await p.evaluate(()=>{__fake.failReads=null;window.dispatchEvent(new Event('online'));});
 ok(await L.waitFor(p,d=>__fake.reads.filter(k=>/directnotes/.test(k)).length>d&&!LK_PREP.state.nPrivateError,dn0,6000).then(()=>true,()=>false),'personal check, signal back: read again by itself, and the warning goes');
 ok(!p.errors.length,'personal check failed: no page errors');await p.context().close();
 // opened with no signal: neither kind of ping is read, so the bell never says there are none
 p=await L.open(b,'#/prep',{who:'ann',extra,cold:'notes$',wait:1800});
 await L.waitFor(p,()=>!!LK_PREP.state.notesErr,null,6000).catch(()=>{});
 const lab=await p.evaluate(()=>(document.querySelector('.nbell')||{getAttribute:()=>''}).getAttribute('aria-label')||'');
 ok(!/No shift pings on now/.test(lab)&&/^Shift pings could not be checked/.test(lab),'no signal: the bell says the pings could not be checked, not that there are none ('+lab+')');
 ok(!p.errors.length,'no signal bell: no page errors');await p.context().close();
 await b.close();L.report(R);
})().catch(e=>{console.error(e);process.exit(1)});
