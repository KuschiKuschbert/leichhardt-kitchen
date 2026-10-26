// Resource preparation is additive, waits for readiness, and fails closed on provisioning errors.
const assert=require('node:assert/strict');
(async()=>{
 const {ensurePingIndex,preparePingQuery}=await import('../scripts/ping-index.mjs');
 const fields=[{fieldPath:'to',order:'ASCENDING'},{fieldPath:'until',order:'ASCENDING'}];
 const ready={name:'projects/test/databases/(default)/collectionGroups/directnotes/indexes/ready',queryScope:'COLLECTION',fields:[...fields,{fieldPath:'__name__',order:'ASCENDING'}],state:'READY'};
 let calls=[];
 await ensurePingIndex(async(path,method='GET')=>{calls.push(method);return {indexes:[{...ready,fields:[{fieldPath:'other',order:'ASCENDING'}]},ready]};});
 assert.deepEqual(calls,['GET']);
 calls=[];
 await ensurePingIndex(async(path,method='GET',body)=>{
  calls.push(method);
  if(method==='POST'){assert.deepEqual(body,{queryScope:'COLLECTION',fields});return {name:'projects/test/databases/(default)/operations/create'};}
  if(path.includes('/operations/'))return {done:true,response:ready};
  return {indexes:[]};
 },async()=>{});
 assert.deepEqual(calls,['GET','POST','GET']);
 let polls=0;
 await ensurePingIndex(async path=>path.startsWith('collectionGroups/')?{indexes:[{...ready,state:'CREATING'}]}:(polls++,ready),async()=>{});
 assert.equal(polls,1);
 await assert.rejects(ensurePingIndex(async()=>({indexes:[{...ready,state:'NEEDS_REPAIR'}]}),async()=>{}),/needs repair/);
 await assert.rejects(ensurePingIndex(async(path,method)=>{if(method==='POST')throw new Error('denied');return {indexes:[]};}),/denied/);
 let conflict=0;
 await ensurePingIndex(async(path,method='GET')=>{
  if(method==='POST'){const e=new Error('concurrent publisher');e.status=409;throw e;}
  return {indexes:conflict++?[ready]:[]};
 },async()=>{});
 assert.equal(conflict,2);
 await assert.rejects(ensurePingIndex(async(path,method)=>method==='POST'?{done:true,error:{code:7}}:{indexes:[]}),/failed with code 7/);
 let adminCalls=0;
 await preparePingQuery(async()=>{},async()=>{adminCalls++;throw new Error('no index-admin permission');});
 assert.equal(adminCalls,0);
 let queryChecks=0;
 await preparePingQuery(async()=>{if(!queryChecks++){const e=new Error('missing index');e.code=9;throw e;}},async()=>({indexes:[ready]}));
 assert.equal(queryChecks,2);
 await assert.rejects(preparePingQuery(async()=>{const e=new Error('read denied');e.code=7;throw e;},async()=>{throw new Error('must not request index admin');}),/read denied/);
 console.log('10 personal-ping index preparation checks passed.');
})();
