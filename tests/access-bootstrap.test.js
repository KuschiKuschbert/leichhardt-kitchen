const assert=require('node:assert/strict');
const {spawnSync}=require('node:child_process'), path=require('node:path');
(async()=>{
 for(const flags of [['--dryrun'],['--verify','--dry-run'],['--publish']]) {
  const result=spawnSync(process.execPath,[path.join(__dirname,'../scripts/access-bootstrap.mjs'),...flags],{env:{...process.env,KITCHEN_PIN:'000000',FIREBASE_SA:'synthetic-invalid-credentials',FIRESTORE_EMULATOR_HOST:''},encoding:'utf8'});
  assert.notEqual(result.status,0);assert.match(result.stderr,/Unknown or conflicting modes are refused before data access/);assert.doesNotMatch(result.stderr,/synthetic-invalid-credentials/);
 }
 const {bootstrapAccess}=await import('../scripts/access-bootstrap.mjs');
 const prefix='kitchens/000000/', data=new Map([
  [prefix+'config/main',{people:[{id:'h',name:'Head',role:'head'},{id:'f',name:'Function',role:'fnc'},{id:'gone',name:'Gone',role:'fnc',active:false}],headId:'h',staffIds:['h','f'],sousIds:['h'],fnIds:['f'],cutoffs:[{private:'do not expose'}],pinOpen:{h:123}}],
  [prefix+'book/index',{r:{burger:2}}],[prefix+'book/matches',{m:{}}],
  [prefix+'recipes/burger',{r:{id:'burger',name:'Burger'},v:2}],[prefix+'drawings/burger',{svgS:'<svg/>'}],
  [prefix+'recipes/burger/hist/1',{was:'private history'}],[prefix+'fncontact/x',{phone:'private'}],[prefix+'staffpins/f',{hash:'secret'}]
 ]);
 const writes=[];let queryDocs=0;
 const ref=path=>({id:path.split('/').pop(),collection:n=>col(path+'/'+n),get:async()=>({id:path.split('/').pop(),exists:data.has(path),data:()=>structuredClone(data.get(path))}),create:async(value)=>{if(data.has(path))throw {code:6};writes.push(path);data.set(path,structuredClone(value));},set:async(value,opt)=>{writes.push(path);data.set(path,opt?.merge?{...data.get(path),...structuredClone(value)}:structuredClone(value));}});
 const col=(path,after='',limit=Infinity)=>({doc:id=>ref(path+'/'+id),orderBy:()=>col(path,after,limit),startAfter:doc=>col(path,doc.id,limit),limit:n=>col(path,after,n),get:async()=>{const docs=[...data.keys()].filter(k=>k.startsWith(path+'/')&&k.split('/').length===path.split('/').length+1&&k.split('/').pop()>after).sort().slice(0,limit).map(k=>({id:k.split('/').pop(),exists:true,data:()=>structuredClone(data.get(k))}));queryDocs+=docs.length;return {docs};}});
 const db={collection:col,runTransaction:async(fn)=>{const ops=[];const value=await fn({get:r=>r.get(),set:(r,v,o)=>ops.push(()=>r.set(v,o))});for(const op of ops)await op();return value;},batch:()=>{const ops=[];return {set:(r,v,o)=>ops.push(()=>r.set(v,o)),commit:async()=>{for(const f of ops)await f()}}}};
 const preview=JSON.stringify([...data]);assert.deepEqual(await bootstrapAccess(db,'000000',{dryRun:true}),{roster:2,recipeAssets:0,capabilityLists:3,functionBookings:0,bookingsScanned:0,dryRun:true});assert.equal(JSON.stringify([...data]),preview);
 const first=await bootstrapAccess(db,'000000');assert.deepEqual(first,{roster:2,recipeAssets:4,capabilityLists:3,functionBookings:0,bookingsScanned:0,dryRun:false});
 assert.deepEqual(data.get(prefix+'config/main').fnOnlyIds,['f']);
 for(const cap of ['add','tick','del'])assert.deepEqual(data.get(prefix+'config/main')[cap+'Ids'],['h']);
 const roster=data.get(prefix+'login/roster');assert.equal(roster.people.length,2);assert.equal(roster.cutoffs,undefined);assert.equal(roster.pinOpen,undefined);
 assert.deepEqual(data.get('publicRecipes/burger'),data.get(prefix+'recipes/burger'));
 assert(!writes.some(k=>/public.*(hist|contact|staffpins)/.test(k)));
 const snapshot=JSON.stringify([...data]);await bootstrapAccess(db,'000000');assert.equal(JSON.stringify([...data]),snapshot);
 data.get(prefix+'config/main').people[1].role='staff';await bootstrapAccess(db,'000000');assert.deepEqual(data.get(prefix+'config/main').fnOnlyIds,['f'],'deployment cannot promote a function account through an unapproved people-list role');
 data.delete(prefix+'book/index');data.delete('publicBook/index');await bootstrapAccess(db,'000000');assert.deepEqual(data.get('publicBook/index'),{r:{},d:{}},'an unedited recipe book still has a public index');
 data.get(prefix+'config/main').people[1].add=true;await bootstrapAccess(db,'000000');assert.deepEqual(data.get(prefix+'config/main').addIds,['h'],'a rerun never grants an unapproved person flag');
 const approved=structuredClone(data.get(prefix+'config/main').addIds);data.get(prefix+'config/main').addIds='invalid';await assert.rejects(()=>bootstrapAccess(db,'000000'),/capability list is invalid/);data.get(prefix+'config/main').addIds=approved;
 const missing={runTransaction:fn=>fn({get:r=>r.get()}),collection:()=>({doc:()=>({collection:()=>({doc:()=>({get:async()=>({exists:false})})})})})};
 await assert.rejects(()=>bootstrapAccess(missing,'1111'),/configuration is missing/);
 for(let i=0;i<4100;i++)data.set(prefix+'functions/overflow-'+String(i).padStart(4,'0'),{v:1,date:'2026-11-09',name:'Synthetic bound',lines:[],rounds:[]});
 const overflow=JSON.stringify([...data]), readsBeforeBound=queryDocs;await assert.rejects(()=>bootstrapAccess(db,'000000',{dryRun:true}),/4000-record bound/);assert.equal(JSON.stringify([...data]),overflow,'an oversized preview changes nothing');assert.equal(queryDocs-readsBeforeBound,4001,'scope refusal reads at most4000 bookings plus one overflow sentinel');
 console.log('PASS access preparation: CLI mode guard, read-only preview, minimal roster, current public assets, preserved approvals, idempotency, missing config and 4100-record overflow refusal after 4001 reads');
})().catch(e=>{console.error(e);process.exit(1)});
