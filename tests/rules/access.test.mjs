import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, writeBatch } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
const pin = '000000', K = `kitchens/${pin}/`, ownerEmail = 'owner@test.local';
const rules = readFileSync(new URL('../../firestore.rules', import.meta.url), 'utf8').replaceAll('KITCHEN_PIN', pin).replaceAll('OWNER_EMAIL', ownerEmail);
const env = await initializeTestEnvironment({ projectId: 'demo-access', firestore: { rules } });
await env.clearFirestore();
const now = Date.now(), today = new Date(now + 10 * 3600000).toISOString().slice(0, 10);
const paths = [
 'config/main','config/admins','proofHistory/x',`days/${today}/items/x`,`orders/${today}/lines/x`,`waste/${today}/lines/x`,`waste/${today}`,
 'transferOpen/x',`transfers/${today}/lines/x`,'daily/x','summary/waste','misses/x','views/x','notes/x','notes/x/seen/x',
 'minutes/x','minutes/x/hist/1','minutes/x/signs/x','minutes/x/signs/1_staff','guides/x','guides/x/pages/0','functions/x','functions/x/hist/1',
 'fncontact/x','fnsent/x','mail/x','mailstat/x','todos/x','push/x','cutdone/x','suppliers/x','suppliers/x/audit/1',
 'suppliers/x/orders/x','supplierlinks/x','drinks/x','shifts/x','staffpins/x','pinset/x','sessions/x','proofs/x','activity/x',
 'sections/x','learned/x','ordlearned/x','learnlog/x','recipes/x/hist/1','drawings/x/hist/1'
];
const cfg = { people: [{id:'head',name:'Head',role:'head'}, {id:'sous',name:'Sous',role:'sous'}, {id:'staff',name:'Staff',role:'staff'}, {id:'fn',name:'Functions',role:'fnc'}], staffIds:['head','sous','staff','fn'], sousIds:['head','sous'], headId:'head', fnIds:['fn'], fnOnlyIds:['fn'] };
await env.withSecurityRulesDisabled(async c => {
 const db=c.firestore();
 for (const p of paths) await setDoc(doc(db,K+p), { status:'published',pubAt:1,open:true,by:'staff',at:1 });
 await setDoc(doc(db,K+'config/main'),cfg);
 await setDoc(doc(db,K+'login/roster'),{people:cfg.people,staffIds:cfg.staffIds,sousIds:cfg.sousIds,headId:'head',fnIds:['fn'],fnOnlyIds:['fn']});
 for (const id of cfg.staffIds) {
  await setDoc(doc(db,K+'pinset/'+id),{at:1});
  await setDoc(doc(db,K+'sessions/'+id),{by:id,exp:now+600000,pinAt:1});
 }
 await setDoc(doc(db,K+'sessions/expired'),{by:'staff',exp:now-1000,pinAt:1});
 for(const p of ['book/index','book/matches','recipes/x','drawings/x','drawtpl/x','drawlib/x']) await setDoc(doc(db,K+p),{by:'head'});
 for(const p of ['publicBook/index','publicRecipes/x','publicDrawings/x']) await setDoc(doc(db,p),{by:'head'});
});
let checks=0;
for(const db of [env.unauthenticatedContext().firestore(),env.authenticatedContext('anonymous').firestore(),env.authenticatedContext('expired').firestore()]) {
 for(const p of paths) { await assertFails(getDoc(doc(db,K+p)));checks++; }
 for(const p of ['publicBook/index','publicRecipes/x','publicDrawings/x',K+'recipes/x']) { await assertSucceeds(getDoc(doc(db,p)));checks++; }
}
const fn=env.authenticatedContext('fn').firestore(), staff=env.authenticatedContext('staff').firestore();
for(const p of paths.filter(p=>!['functions/x','functions/x/hist/1','fncontact/x','fnsent/x'].includes(p))) { await assertFails(getDoc(doc(fn,K+p)));checks++; }
for(const p of ['functions/x','functions/x/hist/1','fncontact/x','fnsent/x']) { await assertSucceeds(getDoc(doc(fn,K+p)));checks++; }
for(const p of ['config/main',`days/${today}/items/x`,`orders/${today}/lines/x`,`waste/${today}/lines/x`,'notes/x','guides/x']) { await assertSucceeds(getDoc(doc(staff,K+p)));checks++; }
await assertFails(setDoc(doc(fn,K+`days/${today}/items/foreign`),{text:'Injected',qty:'1',by:'fn'}));checks++;
await assertFails(setDoc(doc(staff,'publicRecipes/forged'),{by:'staff'}));checks++;
await assertFails(getDocs(collection(fn,K+'days/'+today+'/items')));checks++;
await assertFails(setDoc(doc(env.authenticatedContext('anonymous').firestore(),K+'pinset/outsider'),{at:1}));checks++;
// A functions-only coordinator can save generated reminders without seeing or editing the kitchen list.
const t = Date.parse(today+'T08:00:00Z');
const f = {v:1,status:'confirmed',name:'Private event',date:today,start:t,loc:'Room',guests:20,mode:'all',lines:[{rid:'pizza',name:'Pizza',unit:'platter',spec:'',fp:'',qty:1,u:[0]}],rounds:[{at:t,note:''}],notes:'',kc:'',kcBy:'',kcAt:0,first:t,last:t,from:t-18*3600000,until:t+7200000,kq:t+7200000,was:{},chg:[],cBy:'fn',cAt:now,confBy:'fn',confAt:now,by:'fn',upd:now};
const generated = {text:'Pizza: Private event',qty:'1 platter',station:'Functions',recipe:'pizza',fn:'private-event',dupOk:true,deleted:false,addedBy:'Functions',addedById:'fn',addedAt:now,by:'fn'};
let batch=writeBatch(fn);batch.set(doc(fn,K+'functions/private-event'),f);batch.set(doc(fn,K+`days/${today}/items/fn-private-event-pizza`),generated);
await assertSucceeds(batch.commit());checks++;
await assertFails(setDoc(doc(fn,K+`days/${today}/items/fn-private-event-pizza`),{...generated,text:'Unpaired edit'}));checks++;
batch=writeBatch(fn);batch.set(doc(fn,K+'functions/private-event'),{...f,v:2,status:'cancelled',removed:true,kq:0,by:'fn',upd:now+1});batch.set(doc(fn,K+'functions/private-event/hist/1'),{was:f,at:now+1,by:'fn',what:'Deleted'});batch.set(doc(fn,K+`days/${today}/items/fn-private-event-pizza`),{...generated,deleted:true});
await assertSucceeds(batch.commit());checks++;
// Public copies must be the exact canonical recipe in the same authorised batch.
const sous=env.authenticatedContext('sous').firestore();
const recipe={r:{id:'new-public',name:'Public recipe',kind:'main',ingredients:[],sections:[]},v:1,upd:now,by:'sous'};
batch=writeBatch(sous);batch.set(doc(sous,K+'recipes/new-public'),recipe);batch.set(doc(sous,K+'book/index'),{r:{'new-public':1},by:'sous'});batch.set(doc(sous,'publicRecipes/new-public'),recipe);batch.set(doc(sous,'publicBook/index'),{r:{'new-public':1},by:'sous'});
await assertSucceeds(batch.commit());checks++;
await assertFails(setDoc(doc(sous,'publicRecipes/new-public'),{...recipe,r:{...recipe.r,name:'Divergent public copy'}}));checks++;
// Sign-offs (27 Oct 2026): a person reads only their own by id, signed or not yet; the chefs list the register.
await assertSucceeds(getDoc(doc(staff,K+'minutes/x/signs/1_staff')));checks++;
await assertSucceeds(getDoc(doc(staff,K+'minutes/x/signs/2_staff')));checks++;
await assertFails(getDoc(doc(staff,K+'minutes/x/signs/1_sous')));checks++;
await assertFails(getDocs(collection(staff,K+'minutes/x/signs')));checks++;
await assertFails(getDoc(doc(fn,K+'minutes/x/signs/1_fn')));checks++;
await assertSucceeds(getDocs(collection(sous,K+'minutes/x/signs')));checks++;
await assertSucceeds(getDocs(collection(env.authenticatedContext('head').firestore(),K+'minutes/x/signs')));checks++;
console.log('PASS private access matrix: '+checks+' checks, including every private collection and history.');
await env.cleanup();
