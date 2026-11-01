import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, where, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';
import { anonContext, dailySession, seedOwnerDevice } from './device-auth-fixtures.mjs';
const K='kitchens/000000/', now=Date.now(), day=new Date(now+36000000).toISOString().slice(0,10);
const rules=readFileSync(new URL('../../firestore.rules',import.meta.url),'utf8').replaceAll('KITCHEN_PIN','000000').replaceAll('OWNER_EMAIL','owner@test.local');
const env=await initializeTestEnvironment({projectId:'demo-direct-pings',firestore:{rules}});
const cfg={people:[],staffIds:['head','sam','ann','bo','fn'],sousIds:['head','sam'],headId:'head',pingIds:['head','sam','ann'],fnOnlyIds:['fn']};
const ping={text:'Private test message',tag:'none',start:day,until:day,dows:[],tm:840,removed:false,at:now,upd:now,author:'sam',by:'sam',to:'ann'};
await env.withSecurityRulesDisabled(async c=>{
 const db=c.firestore(); await setDoc(doc(db,K+'config/main'),cfg);
 for(const id of cfg.staffIds){await setDoc(doc(db,K+'pinset/'+id),{at:1});await setDoc(doc(db,K+'sessions/'+id),dailySession(id,{at:now}));}
 await setDoc(doc(db,K+'sessions/expired'),dailySession('ann',{at:now-86400000}));
 await setDoc(doc(db,K+'directnotes/a'),ping);
 await setDoc(doc(db,K+'notes/everyone'),{...ping,to:'',text:'Everyone message'});
});
await seedOwnerDevice(env,{uid:'owner',headId:'head',at:now});
const db=id=>anonContext(env,id).firestore(), ref=(d,id='a')=>doc(d,K+'directnotes/'+id);
let checks=0;
async function pass(p){await assertSucceeds(p);checks++;} async function deny(p){await assertFails(p);checks++;}
try {
 const ann=db('ann'),bo=db('bo'),sam=db('sam'),head=db('head'),fn=db('fn');
 const owner=db('owner');
 for(const d of [ann,sam,head,owner])await pass(getDoc(ref(d)));
 for(const d of [bo,fn,db('anonymous'),db('expired'),env.unauthenticatedContext().firestore(),env.authenticatedContext('wrong-owner',{email:'owner@test.local',email_verified:false}).firestore()])await deny(getDoc(ref(d)));
 await pass(getDocs(query(collection(ann,K+'directnotes'),where('to','==','ann'),where('until','>=',day))));
 await deny(getDocs(query(collection(ann,K+'directnotes'),where('until','>=',day))));
 await deny(getDocs(query(collection(bo,K+'directnotes'),where('to','==','ann'))));
 await pass(getDocs(query(collection(sam,K+'directnotes'),where('until','>=',day))));
 await pass(getDocs(collection(ann,K+'notes')));
 await pass(setDoc(ref(sam,'new'),ping));
 await deny(setDoc(ref(ann,'forged'),{...ping,author:'ann',by:'ann'}));
 for(const to of ['missing','fn',''])await deny(setDoc(ref(sam,'invalid'),{...ping,to}));
 await deny(setDoc(ref(sam,'forged-author'),{...ping,author:'head'}));
 await pass(updateDoc(ref(head),{text:'Chef edit',by:'head',upd:now+1}));
 await deny(updateDoc(ref(ann),{text:'Recipient edit',by:'ann'}));
 await deny(updateDoc(ref(head),{to:'bo',by:'head'}));
 await deny(updateDoc(ref(owner),{author:'head'}));
 await deny(deleteDoc(ref(sam)));
 const seen=doc(ann,K+'directnotes/a/seen/'+day+'_ann');
 await pass(setDoc(seen,{day,at:now,by:'ann'}));
 await deny(setDoc(doc(bo,K+'directnotes/a/seen/'+day+'_bo'),{day,at:now,by:'bo'}));
 await deny(setDoc(doc(sam,K+'directnotes/a/seen/'+day+'_sam'),{day,at:now,by:'sam'}));
 await pass(getDoc(seen)); await deny(getDoc(doc(bo,K+'directnotes/a/seen/'+day+'_ann')));
 await pass(getDocs(collection(sam,K+'directnotes/a/seen')));
 await deny(updateDoc(seen,{at:now+1}));
 await env.withSecurityRulesDisabled(c=>updateDoc(doc(c.firestore(),K+'config/main'),{staffIds:['head','sam','bo','fn']}));
 await deny(getDoc(ref(ann))); await deny(setDoc(ref(sam,'removed-recipient'),ping));
 console.log(checks+' personal-ping rules checks passed.');
} finally {await env.cleanup();}
