// Client-side auth using JSON API endpoints (/api/register, /api/login)
const SESSION_KEY = 'zh_currentUser';
const TOKEN_KEY = 'zh_token';

function $(sel){ return document.querySelector(sel) }
function $all(sel){ return document.querySelectorAll(sel) }

function showMessage(text, type = ''){
  const el = $('#message');
  el.textContent = text;
  el.className = 'message' + (type? ' ' + type : '');
}

function setLoggedIn(user, token){
  localStorage.setItem(SESSION_KEY, JSON.stringify({ id: user.id, username: user.username, email: user.email, at: new Date().toISOString() }));
  localStorage.setItem(TOKEN_KEY, token);
  showMessage('Sikeres bejelentkezés: ' + (user.username || user.email), 'success');
  $('#logoutBtn').style.display = 'inline-block';
}

function clearSession(){
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(TOKEN_KEY);
  showMessage('Kijelentkeztél.');
  $('#logoutBtn').style.display = 'none';
}

// Tabs
$all('.tab').forEach(btn=>{
  btn.addEventListener('click', e=>{
    $all('.tab').forEach(t=>t.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.dataset.target;
    $all('.panel').forEach(p=>p.style.display = (p.id === target ? 'block' : 'none'));
    showMessage('');
  })
});

// Helper: POST JSON
async function postJSON(url, body){
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type':'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(()=>({}));
  return { status: res.status, data };
}

// Register -> call /api/register
$('#registerForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const f = e.target;
  const username = f.username.value.trim();
  const email = f.email.value.trim().toLowerCase();
  const pw = f.password.value;
  const pw2 = f.password2.value;
  if(pw !== pw2){ showMessage('A jelszavak nem egyeznek.', 'error'); return }
  if(pw.length < 6){ showMessage('A jelszónak legalább 6 karakter hosszúnak kell lennie.', 'error'); return }

  const { status, data } = await postJSON('/api/register', { username, email, password: pw });
  if(status === 201){ showMessage('Sikeres regisztráció! Most bejelentkezhetsz.', 'success'); f.reset(); document.querySelector('[data-target="login"]').click(); }
  else { showMessage(data && data.message ? data.message : 'Regisztráció sikertelen.', 'error'); }
});

// Login -> call /api/login
$('#loginForm').addEventListener('submit', async (e)=>{
  e.preventDefault();
  const f = e.target;
  const userOrEmail = f.user.value.trim();
  const pw = f.password.value;
  const { status, data } = await postJSON('/api/login', { user: userOrEmail, password: pw });
  if(status === 200 && data && data.token){
    setLoggedIn(data.user, data.token);
    f.reset();
  }else{
    showMessage(data && data.message ? data.message : 'Bejelentkezés sikertelen.', 'error');
  }
});

// Logout
$('#logoutBtn').addEventListener('click', (e)=>{ clearSession(); });

// Export users JSON -> downloads from /api/users (requires auth)
$('#exportBtn').addEventListener('click', async e=>{
  const token = localStorage.getItem(TOKEN_KEY);
  if(!token){ showMessage('Először jelentkezz be az exportáláshoz.', 'error'); return }
  try{
    const res = await fetch('/api/users', { headers: { 'Authorization': 'Bearer ' + token } });
    if(res.status === 401){ showMessage('Nincs jogosultság. Jelentkezz be.', 'error'); return }
    const users = await res.json();
    const data = JSON.stringify(users, null, 2);
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'zh_users.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }catch(err){ showMessage('Exportálás hiba: ' + err.message, 'error') }
});

// Import users JSON (merge) -> POST /api/import (requires auth)
$('#importFile').addEventListener('change', e=>{
  const f = e.target.files[0];
  if(!f) return;
  const reader = new FileReader();
  reader.onload = async ()=>{
    try{
      const incoming = JSON.parse(reader.result);
      if(!Array.isArray(incoming)) throw new Error('Hibás formátum');
      const token = localStorage.getItem(TOKEN_KEY);
      if(!token){ showMessage('Először jelentkezz be az importáláshoz.', 'error'); return }
      const res = await fetch('/api/import', { method:'POST', headers:{ 'Content-Type':'application/json', 'Authorization':'Bearer ' + token }, body: JSON.stringify(incoming) });
      const data = await res.json();
      if(res.status === 200) showMessage('Importálás kész. Új felhasználók hozzáadva.', 'success'); else showMessage(data.message || 'Importálás sikertelen.', 'error');
    }catch(err){ showMessage('Importálás sikertelen: ' + err.message, 'error') }
  };
  reader.readAsText(f);
  e.target.value = '';
});

// On load: show logout if session exists
window.addEventListener('load', ()=>{
  const sess = localStorage.getItem(SESSION_KEY);
  if(sess) $('#logoutBtn').style.display = 'inline-block';
});