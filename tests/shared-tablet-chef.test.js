// A shared browser must never hand a Google admin session to a staff identity.
const L=require('./lib'),{R,ok}=L.results();
(async()=>{
 const b=await L.start();
 for(const [person,pin] of [['bo','3333'],['sam','1111']]) {
  const p=await L.open(b,'#/prep',{admin:true,who:person,settings:{shared:true},wait:1600});
  ok(await p.evaluate(()=>!LK_PREP.state.user&&!LK_PREP.state.authed),person+': remembered Google account is signed out before staff login');
  await p.fill('#pf1',pin);await L.settle(p,1000);
  ok(await L.admItem(p)==='none',person+': their personal PIN grants no admin access');
  await p.goto(L.BASE+'#/admin');await L.settle(p,700);
  ok(!await p.$('.a-groups'),person+': direct admin URL contains no private admin sections');
  await p.goto(L.BASE+'#/prep');await L.settle(p,500);
  ok(!!await p.$('.nb-row'),person+': normal kitchen access still works after login');
  ok(!p.errors.length,person+': no page errors '+p.errors.join(' | '));await p.context().close();
 }
 for(const shared of [false,true]) {
  const p=await L.open(b,'#/admin',{admin:true,who:'',settings:{shared},wait:1600});
  ok(!!await p.$('.a-groups'),'explicit Google admin can open admin on '+(shared?'shared':'personal')+' device');
  await p.evaluate(()=>LK_PREP.signOut(true));await L.settle(p,500);
  ok(!await p.$('.a-groups')&&await p.evaluate(()=>!LK_PREP.state.user),'admin sign-out locks '+(shared?'shared':'personal')+' device');
  await p.context().close();
 }
 await b.close();L.report(R);
})().catch(e=>{console.error(e);process.exit(1)});
