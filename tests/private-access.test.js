const L = require('./lib'), { R, ok } = L.results();
const key = p => ['kitchens', L.PIN].concat(p).join('/');
const cfg = {people:[{id:'sam',name:'Sam',role:'sous',active:true,add:true,tick:true,del:true},{id:'ann',name:'Ann',role:'staff',active:true,add:true,tick:true},{id:'fay',name:'Fay',role:'fnc',fn:true,active:true}],staffIds:['sam','ann','fay'],sousIds:['sam'],fnIds:['fay'],fnOnlyIds:['fay']};
const deletion={v:1,status:'draft',name:'Audit deletion',date:'',start:0,loc:'',guests:0,mode:'all',lines:[],rounds:[],notes:'',kc:'',kcBy:'',kcAt:0,first:0,last:0,from:0,until:0,kq:0,was:{},chg:[],cBy:'fay',cAt:L.NOW,by:'fay',upd:L.NOW};
const extra = {[key(['functions','delete-me'])]:deletion,[key(['config','main'])]:cfg,[key(['pinset','fay'])]:{at:1},[key(['staffpins','fay'])]:{hash:L.sha('lk:fay:5151')}};
(async()=>{
 const b=await L.start();
 for(const route of ['#/prep','#/orders','#/waste','#/guides','#/functions','#/fn/now','#/manage']) {
  const p=await L.open(b,route,{who:'',extra,wait:1400});
  ok(/Who are you/.test(await p.locator('body').innerText()) && !await p.$('.nb-row, .fe-row, .fn-svc-row, .mg-results'),route+': signed out sees login only');
  ok(!p.errors.length,route+': no page errors '+p.errors.join(' | '));await p.context().close();
 }
 let p=await L.open(b,'#/recipes',{who:'',noPin:true,wait:1400});
 ok(!!await p.$('#find'), 'recipes stay available without either PIN');await p.context().close();
 p=await L.open(b,'#/r/public-special',{who:'',noPin:true,extra:{'publicBook/index':{r:{'public-special':1}},'publicRecipes/public-special':{r:{id:'public-special',kind:'main',name:'Public special',ingredients:[],sections:[]},v:1,src:'new',removed:false}},wait:2000});
 ok(/Public special/.test(await p.locator('body').innerText()),'fresh signed-out visitor sees a newly published recipe without knowing the kitchen PIN');await p.context().close();
 p=await L.open(b,'#/functions',{who:'fay',extra,wait:1600});
 ok(/Functions/.test(await p.locator('body').innerText()) && !!await p.$('#fe-root'), 'function-only account opens function management');
 const menu=await L.chefItems(p);ok(menu.includes('functions') && !menu.includes('mail') && !menu.includes('drinks') && !menu.includes('manage'), 'function-only menu has no kitchen or recipe management');
 await p.goto(L.BASE+'#/functions/delete-me');await L.settle(p,900);
 await p.click('[data-fe="remove"]');await p.click('[data-fe="remove"]');await L.settle(p,1100);
 ok(await p.evaluate(k=>{const d=__fake.dump();return d[k]?.removed===true&&d[k].v===2&&!!d[k+'/hist/1']},key(['functions','delete-me'])),'function deletion keeps an immutable previous version');
 ok(!/Audit deletion/.test(await p.locator('body').innerText()),'deleted function leaves normal management lists');
 await p.goto(L.BASE+'#/orders');await L.settle(p,1000);
 ok(/Functions account/.test(await p.locator('body').innerText()) && !await p.$('.nb-row'), 'function-only direct order URL is refused');await p.context().close();
 p=await L.open(b,'#/manage',{who:'sam',extra,wait:1600});ok(!!await p.$('#mg-results'),'sous chef can manage recipes');await p.context().close();
 p=await L.open(b,'#/manage',{who:'ann',extra,wait:1400});ok(!await p.$('#mg-results'),'staff cannot manage recipes');await p.context().close();
 p=await L.open(b,'#/admin',{admin:true,who:'',extra,wait:1600});
 await p.evaluate(()=>LK_PREP.signOut(true));await L.settle(p,1000);
 ok(await p.evaluate(()=>!LK_PREP.state.user && !LK_PREP.privateAccess() && localStorage.getItem('fake.user') !== '1'),'Google admin sign-out removes elevated access');await p.context().close();
 p=await L.open(b,'#/prep',{admin:true,who:'ann',extra,wait:1600});
 ok(await p.evaluate(()=>!LK_PREP.state.user && !LK_PREP.state.authed && localStorage.getItem('fake.user') !== '1'),'restored staff identity cannot inherit a remembered Google admin');
 await p.fill('#pf1','2222');await L.settle(p,1100);
 ok(await p.evaluate(()=>LK_PREP.state.authed && LK_PREP.state.who === 'ann' && !LK_PREP.state.user),'staff PIN opens their own session after Google is signed out');
 await p.evaluate(()=>LK_PREP.signOut(true));await L.settle(p,700);
 ok(!await p.$('.nb-row') && !/Slice onions/.test(await p.locator('body').innerText()),'logout immediately hides operational data');await p.context().close();
 await b.close();R.forEach(x=>console.log(x));const bad=R.filter(x=>x.startsWith('FAIL')).length;console.log(bad+' failed of '+R.length);process.exit(bad?1:0);
})().catch(e=>{console.error(e);process.exit(1)});
