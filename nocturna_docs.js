// Nocturna Avatars — Paquetes & Términos JS
function switchTab(id, btn) {
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  btn.classList.add('active');
}

function switchLang(lang, btn) {
  document.querySelectorAll('.lang-content').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('lang-' + lang).classList.add('active');
  btn.classList.add('active');
}
