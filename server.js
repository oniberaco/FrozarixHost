const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const USERS_FILE = path.join(__dirname, 'users.json');
const JWT_SECRET = process.env.ZH_JWT_SECRET || 'dev-secret-change-me';

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname)));

function readUsers(){
  try{
    const raw = fs.readFileSync(USERS_FILE, 'utf8');
    return JSON.parse(raw || '[]');
  }catch(e){ return [] }
}
function writeUsers(users){
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

function sanitizeUser(u){
  const { passwordHash, ...rest } = u;
  return rest;
}

// Register
app.post('/api/register', async (req, res) => {
  const { username, email, password } = req.body || {};
  if(!username || !email || !password) return res.status(400).json({ message: 'Kérjük adj meg minden mezőt.' });
  const users = readUsers();
  if(users.some(u => u.username && u.username.toLowerCase() === username.toLowerCase())) return res.status(409).json({ message: 'A felhasználónév már foglalt.' });
  if(users.some(u => u.email && u.email.toLowerCase() === email.toLowerCase())) return res.status(409).json({ message: 'Az email már regisztrálva van.' });
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(password, salt);
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2,8);
  const user = { id, username, email: email.toLowerCase(), passwordHash: hash, createdAt: new Date().toISOString() };
  users.push(user);
  writeUsers(users);
  return res.status(201).json({ message: 'Created' });
});

// Login
app.post('/api/login', async (req, res) => {
  const { user, password } = req.body || {};
  if(!user || !password) return res.status(400).json({ message: 'Missing fields' });
  const users = readUsers();
  const u = users.find(x => (x.username && x.username.toLowerCase() === user.toLowerCase()) || (x.email && x.email.toLowerCase() === user.toLowerCase()));
  if(!u) return res.status(401).json({ message: 'Nem található felhasználó.' });
  const ok = bcrypt.compareSync(password, u.passwordHash || '');
  if(!ok) return res.status(401).json({ message: 'Hibás jelszó.' });
  const payload = { id: u.id, username: u.username, email: u.email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '4h' });
  return res.json({ token, user: sanitizeUser(u) });
});

// Auth middleware
function requireAuth(req, res, next){
  const auth = req.headers.authorization || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if(!m) return res.status(401).json({ message: 'No token' });
  const token = m[1];
  try{
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  }catch(e){ return res.status(401).json({ message: 'Invalid token' }); }
}

// Dashboard data
app.get('/api/dashboard', requireAuth, (req, res) => {
  const users = readUsers();
  const activeUsers = users.length;
  const now = Date.now();
  const signups7d = users.filter(u => new Date(u.createdAt).getTime() > (now - 7*24*3600*1000)).length;
  const resourceUsage = Math.round(Math.random()*100) + '%';
  res.json({ activeUsers, signups7d, resourceUsage, serverTime: new Date().toISOString() });
});

// Get users (no passwordHash)
app.get('/api/users', requireAuth, (req, res) => {
  const users = readUsers().map(u => sanitizeUser(u));
  res.json(users);
});

// Import users (merge) - accepts array of users, will hash plain 'password' fields
app.post('/api/import', requireAuth, (req, res) => {
  const incoming = req.body;
  if(!Array.isArray(incoming)) return res.status(400).json({ message: 'Invalid payload' });
  const users = readUsers();
  incoming.forEach(item => {
    if(!item.email && !item.username) return;
    const exists = users.some(u => (u.email && item.email && u.email === item.email) || (u.username && item.username && u.username === item.username));
    if(exists) return;
    const id = item.id || (Date.now().toString(36) + Math.random().toString(36).slice(2,8));
    let passwordHash = item.passwordHash;
    if(!passwordHash && item.password){ const salt = bcrypt.genSaltSync(10); passwordHash = bcrypt.hashSync(item.password, salt); }
    const user = { id, username: item.username || '', email: (item.email||'').toLowerCase(), passwordHash: passwordHash || '', createdAt: item.createdAt || new Date().toISOString() };
    users.push(user);
  });
  writeUsers(users);
  res.json({ message: 'Imported' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>console.log('Server running on http://localhost:' + PORT));
