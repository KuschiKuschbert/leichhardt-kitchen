// Add only the personal-ping index. Never delete or replace existing indexes or kitchen records.
import { pathToFileURL } from 'node:url';
const fields=[{fieldPath:'to',order:'ASCENDING'},{fieldPath:'until',order:'ASCENDING'}];
export async function ensurePingIndex(api, pause=ms=>new Promise(r=>setTimeout(r,ms)), conflicts=0) {
  const parent='collectionGroups/directnotes/indexes';
  let index, token='';
  do {
    const page=await api(parent+(token?'?pageToken='+encodeURIComponent(token):''));
    index=(page.indexes||[]).find(x=>x.queryScope==='COLLECTION' && (x.fields||[]).filter(f=>f.fieldPath!=='__name__').length===fields.length && fields.every((f,i)=>x.fields[i].fieldPath===f.fieldPath&&x.fields[i].order===f.order));
    token=page.nextPageToken||'';
  } while(!index&&token);
  if(!index) {
    try {
      let op=await api(parent,'POST',{queryScope:'COLLECTION',fields});
      for(let tries=0;!op.done&&tries<96;tries++){await pause(5000);op=await api(op.name);}
      if(!op.done)throw new Error('Personal-ping index creation timed out. No indexes were removed.');
      if(op.error)throw new Error('Personal-ping index creation failed with code '+op.error.code);
      index=op.response;
    } catch(e) {
      if(e.status!==409||conflicts>=2)throw e;
      await pause(5000);
      return ensurePingIndex(api,pause,conflicts+1);
    }
  }
  for(let tries=0;index&&index.state!=='READY'&&tries<96;tries++) {
    if(index.state==='NEEDS_REPAIR')throw new Error('The personal-ping index needs repair. No indexes were removed.');
    await pause(5000);index=await api(index.name);
  }
  if(!index||index.state!=='READY')throw new Error('The personal-ping index is not ready.');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href) {
  const {cert,initializeApp,deleteApp}=await import('firebase-admin/app');
  const {getFirestore}=await import('firebase-admin/firestore');
  let account;
  try {account=JSON.parse(process.env.FIREBASE_SA||'{}');} catch {throw new Error('The existing Firebase service-account configuration is invalid.');}
  if(account.project_id!=='leichhardt-kitchen')throw new Error('Use the existing Leichhardt Firebase service account.');
  const credential=cert(account), app=initializeApp({credential});
  const base='projects/'+account.project_id+'/databases/(default)/';
  const api=async (path,method='GET',body)=>{
    let token;
    try {token=await credential.getAccessToken();} catch {throw new Error('Existing Firebase credentials could not authorize index preparation.');}
    const name=path.startsWith('projects/')?path:base+path;
    const response=await fetch('https://firestore.googleapis.com/v1/'+name,{method,headers:{Authorization:'Bearer '+token.access_token,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
    if(!response.ok){const e=new Error('Firestore index API returned HTTP '+response.status);e.status=response.status;throw e;}
    return response.json();
  };
  try {
    await ensurePingIndex(api);
    // This reads no kitchen records; it proves the exact client query can use the deployed index.
    await getFirestore(app).collection('kitchens').doc(process.env.KITCHEN_PIN||'index-check').collection('directnotes')
      .where('to','==','__index_probe__').where('until','>=',new Date().toISOString().slice(0,10)).limit(1).get().catch(e=>{throw new Error('Recipient/date query validation failed with code '+e.code);});
    console.log('Personal-ping index is ready and the recipient/date query succeeded. No kitchen records changed.');
  } catch(e) {
    console.error(/^(Firestore index API|Personal-ping index|The personal-ping index|Existing Firebase credentials|Recipient\/date query)/.test(e.message||'')?e.message:'Could not prepare the individual-ping index. Check service-account permissions and connectivity.');
    process.exitCode=1;
  } finally {await deleteApp(app);}
}
