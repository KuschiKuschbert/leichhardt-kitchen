/* This isolated preview uses RAM instead of browser storage. Reload restores all sample records. */
(() => {
 const fixture=window.LK_PREVIEW_FIXTURE,RealDate=Date,started=performance.now();
 class PreviewDate extends RealDate {constructor(...args){super(...(args.length?args:[PreviewDate.now()]));}static now(){return fixture.now+Math.round(performance.now()-started);}}
 window.Date=PreviewDate;
 function memoryStorage(seed={}){const values=Object.assign(Object.create(null),seed);const api={};Object.defineProperties(api,{getItem:{value:k=>Object.hasOwn(values,k)?values[k]:null},setItem:{value:(k,v)=>{values[k]=String(v);Object.defineProperty(api,k,{value:String(v),writable:true,configurable:true,enumerable:true});}},removeItem:{value:k=>{delete values[k];delete api[k];}},clear:{value:()=>{Object.keys(values).forEach(k=>{delete values[k];delete api[k];});}},key:{value:i=>Object.keys(values)[i]||null},length:{get:()=>Object.keys(values).length}});Object.keys(seed).forEach(k=>api.setItem(k,seed[k]));return api;}
 Object.defineProperty(window,'localStorage',{value:memoryStorage(fixture.storage),configurable:true});
 Object.defineProperty(window,'sessionStorage',{value:memoryStorage(),configurable:true});
 window.LK_PREVIEW={mode:new URLSearchParams(location.search).get('mode')||'shared',contributions:new Map()};
 if(!location.hash)history.replaceState(null,'','#/prep');
})();
