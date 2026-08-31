const views=[...document.querySelectorAll('.view')];
function showView(id){
  views.forEach(v=>v.classList.toggle('active-view',v.id===id));
  document.querySelectorAll('[data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view===id));
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.view)));
document.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>showView(b.dataset.go)));
const dialog=document.querySelector('#resource-dialog');
const dialogTitle=document.querySelector('#dialog-title');
document.querySelectorAll('[data-resource]').forEach(b=>b.addEventListener('click',()=>{
  dialogTitle.textContent=b.dataset.resource;
  dialog.showModal();
}));
document.querySelector('.dialog-close').addEventListener('click',()=>dialog.close());
document.querySelector('.dialog-secondary').addEventListener('click',()=>dialog.close());
document.querySelector('.dialog-primary').addEventListener('click',()=>dialog.close());
if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
