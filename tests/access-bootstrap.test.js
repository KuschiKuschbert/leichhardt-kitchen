const assert=require('node:assert/strict');
(async()=>{
 const {bootstrapAccess}=await import('../scripts/access-bootstrap.mjs');
 const prefix='kitchens/000000/', data=new Map([
  [prefix+'config/main',{people:[{id:'h',name:'Head',role:'head'},{id:'f',name:'Function',role:'fnc'},{id:'gone',name:'Gone',role:'fnc',active:false}],headId:'h',staffIds:['h','f'],sousIds:['h'],fnIds:['f'],cutoffs:[{private:'do not expose'}],pinOpen:{h:123}}],
  [prefix+'book/index',{r:{burger:2}}],[prefix+'book/matches',{m:{}}],
  [prefix+'recipes/burger',{r:{id:'burger',name:'Burger'},v:2}],[prefix+'drawings/burger',{svgS:'<svg/>'}],
  [prefix+'recipes/burger/hist/1',{was:'private history'}],[prefix+'fncontact/x',{phone:'private'}],[prefix+'staffpins/f',{hash:'secret'}]
 ]);
 const writes=[];
 const ref=path=>({id:path.split('/').pop(),collection:n=>col(path+'/'+n),get:async()=>({id:path.split('/').pop(),exists:data.has(path),data:()=>structuredClone(data.get(path))}),create:async(value)=>{if(data.has(path))throw {code:6};writes.push(path);data.set(path,structuredClone(value));},set:async(value,opt)=>{writes.push(path);data.set(path,opt?.merge?{...data.get(path),...structuredClone(value)}:structuredClone(value));}});
 const col=path=>({doc:id=>ref(path+'/'+id),get:async()=>({docs:[...data.keys()].filter(k=>k.startsWith(path+'/')&&k.split('/').length===path.split('/').length+1).map(k=>({id:k.split('/').pop(),exists:true,data:()=>structuredClone(data.get(k))}))})});
 const db={collection:col,batch:()=>{const ops=[];return {set:(r,v,o)=>ops.push(()=>r.set(v,o)),commit:async()=>{for(const f of ops)await f()}}}};
 const first=await bootstrapAccess(db,'000000');assert.deepEqual(first,{roster:2,recipeAssets:4});
 assert.deepEqual(data.get(prefix+'config/main').fnOnlyIds,['f']);
 const roster=data.get(prefix+'login/roster');assert.equal(roster.people.length,2);assert.equal(roster.cutoffs,undefined);assert.equal(roster.pinOpen,undefined);
 assert.deepEqual(data.get('publicRecipes/burger'),data.get(prefix+'recipes/burger'));
 assert(!writes.some(k=>/public.*(hist|contact|staffpins)/.test(k)));
 const snapshot=JSON.stringify([...data]);await bootstrapAccess(db,'000000');assert.equal(JSON.stringify([...data]),snapshot);
 data.get(prefix+'config/main').people[1].role='staff';await bootstrapAccess(db,'000000');assert.deepEqual(data.get(prefix+'config/main').fnOnlyIds,['f'],'deployment cannot promote a function account through an unapproved people-list role');
 data.delete(prefix+'book/index');data.delete('publicBook/index');await bootstrapAccess(db,'000000');assert.deepEqual(data.get('publicBook/index'),{r:{},d:{}},'an unedited recipe book still has a public index');
 const missing={collection:()=>({doc:()=>({collection:()=>({doc:()=>({get:async()=>({exists:false})})})})})};
 await assert.rejects(()=>bootstrapAccess(missing,'1111'),/configuration is missing/);
 console.log('PASS access preparation: minimal roster, current public assets only, idempotency and missing-config protection');
})().catch(e=>{console.error(e);process.exit(1)});
