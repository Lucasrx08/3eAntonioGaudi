const navButtons = [...document.querySelectorAll('[data-view]')];
const views = [...document.querySelectorAll('.view')];
const title = document.getElementById('page-title');
const titles = {home:'Bonjour Lucas', agenda:'Mon agenda', resources:'Mes ressources', profile:'Mon espace'};

function showView(name){
  views.forEach(v => v.classList.toggle('active-view', v.id === name));
  document.querySelectorAll('[data-view]').forEach(b => b.classList.toggle('active', b.dataset.view === name));
  title.textContent = titles[name] || 'Ma 3e';
  window.scrollTo({top:0,behavior:'smooth'});
}

navButtons.forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.view)));
document.querySelectorAll('[data-go]').forEach(btn => btn.addEventListener('click', () => showView(btn.dataset.go)));

const dialog = document.getElementById('resource-dialog');
const dialogTitle = document.getElementById('dialog-title');
document.querySelectorAll('[data-resource]').forEach(btn => btn.addEventListener('click', () => {
  dialogTitle.textContent = btn.dataset.resource;
  dialog.showModal();
}));
document.querySelector('.dialog-close').addEventListener('click', () => dialog.close());
document.querySelector('.dialog-ok').addEventListener('click', () => dialog.close());

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(()=>{}));
}
