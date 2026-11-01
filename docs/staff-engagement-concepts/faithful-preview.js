(() => {
 const frame=document.getElementById('book-preview'),mode=document.getElementById('preview-mode');
 mode.addEventListener('change',()=>frame.contentWindow.postMessage({type:'kitchen-preview-mode',mode:mode.value},location.origin));
 frame.addEventListener('load',()=>frame.contentWindow.postMessage({type:'kitchen-preview-mode',mode:mode.value},location.origin));
 document.getElementById('preview-reset').addEventListener('click',()=>{frame.src='current-prep/index.html?mode='+encodeURIComponent(mode.value)+'#/prep';});
})();
