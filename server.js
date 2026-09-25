const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = __dirname;
const dataDir = path.join(root, 'data');
const dataFile = path.join(dataDir, 'store.json');
const port = Number(process.env.PORT || 5500);
const secret = process.env.SESSION_SECRET || 'change-this-session-secret-before-production';
const adminEmail = process.env.ADMIN_EMAIL || 'admin@gmail.com';
const adminPassword = process.env.ADMIN_PASSWORD || 'Neural@123';
const stages = ['Quote requested', 'Planning', 'In progress', 'Testing', 'Completed'];
function normalizeProject(lead) {
  const stageIndex = Math.max(0, stages.indexOf(lead.stage));
  if (!Number.isFinite(Number(lead.progress))) lead.progress = Math.round((stageIndex / (stages.length - 1)) * 100);
  if (!Array.isArray(lead.statusHistory)) lead.statusHistory = [{ stage: lead.stage || stages[0], progress: lead.progress, note: lead.statusNote || 'Project request received.', updatedAt: lead.stageUpdatedAt || lead.submittedAt }];
  return lead;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  return `${salt}:${crypto.scryptSync(password, salt, 64).toString('hex')}`;
}
function passwordMatches(password, stored) {
  const [salt, expected] = (stored || '').split(':');
  if (!salt || !expected) return false;
  const actual = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(actual, 'hex'), Buffer.from(expected, 'hex'));
}
function ensureStore() {
  fs.mkdirSync(dataDir, { recursive: true });
  if (!fs.existsSync(dataFile)) {
    writeDb({ users: [{ id: 'admin', username: 'admin@gmail.com', name: 'Neural Nexus Admin', email: adminEmail, passwordHash: hashPassword(adminPassword), role: 'admin', createdAt: new Date().toISOString() }], leads: [], payments: [] });
  } else {
    const db = readDb();
    const adminUser = db.users.find(user => user.role === 'admin');
    if (adminUser) {
      adminUser.username = 'admin@gmail.com';
      adminUser.email = adminEmail;
      adminUser.passwordHash = hashPassword(adminPassword);
      writeDb(db);
    }
  }
}
function readDb() { ensureStore(); return JSON.parse(fs.readFileSync(dataFile, 'utf8')); }
function writeDb(db) {
  fs.mkdirSync(dataDir, { recursive: true });
  const temporaryFile = `${dataFile}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(temporaryFile, dataFile);
}
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }; }
function signSession(user) {
  const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}
function currentUser(req, db) {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return null;
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (session.expires < Date.now()) return null;
    return db.users.find(user => user.id === session.id && user.role === session.role) || null;
  } catch { return null; }
}
function send(res, status, body) { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' }); res.end(JSON.stringify(body)); }
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = ''; let size = 0;
    req.on('data', chunk => { size += chunk.length; if (size > 2 * 1024 * 1024) { reject(new Error('Request is too large.')); req.destroy(); } else body += chunk; });
    req.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('Invalid request data.')); } });
    req.on('error', reject);
  });
}
function requireUser(user, res) { if (!user) { send(res, 401, { error: 'Please sign in first.' }); return false; } return true; }
function requireAdmin(user, res) { if (!requireUser(user, res)) return false; if (user.role !== 'admin') { send(res, 403, { error: 'Admin access required.' }); return false; } return true; }
function safeStaticPath(urlPath) {
  const requested = urlPath === '/' ? '/index.html' : decodeURIComponent(urlPath);
  const filePath = path.resolve(root, `.${requested}`);
  return filePath.startsWith(root) ? filePath : null;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname.startsWith('/api/')) {
      const db = readDb(); const user = currentUser(req, db); const body = ['POST', 'PATCH'].includes(req.method) ? await readBody(req) : {};
      if (req.method === 'POST' && url.pathname === '/api/auth/register') {
        const name = String(body.name || '').trim(); const email = String(body.email || '').trim().toLowerCase(); const password = String(body.password || '');
        if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return send(res, 400, { error: 'Enter a name, valid email, and password of at least 6 characters.' });
        if (db.users.some(account => account.email === email)) return send(res, 409, { error: 'An account already uses this email.' });
        const account = { id: `user-${Date.now()}`, name, email, passwordHash: hashPassword(password), role: 'user', createdAt: new Date().toISOString() };
        db.users.push(account); writeDb(db); return send(res, 201, { user: publicUser(account), token: signSession(account) });
      }
      if (req.method === 'POST' && url.pathname === '/api/auth/login') {
        const loginValue = String(body.email || body.username || '').trim().toLowerCase();
        const account = db.users.find(item => {
          const email = String(item.email || '').trim().toLowerCase();
          const username = String(item.username || '').trim().toLowerCase();
          return (email === loginValue || username === loginValue || email.split('@')[0] === loginValue) && passwordMatches(String(body.password || ''), item.passwordHash);
        });
        if (!account) return send(res, 401, { error: 'Invalid username/email or password.' });
        return send(res, 200, { user: publicUser(account), token: signSession(account) });
      }
      if (req.method === 'GET' && url.pathname === '/api/session') { if (!requireUser(user, res)) return; return send(res, 200, { user: publicUser(user) }); }
      if (req.method === 'POST' && url.pathname === '/api/leads') {
        const name = String(body.name || '').trim(); const email = String(body.email || '').trim().toLowerCase(); const message = String(body.message || '').trim();
        if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) return send(res, 400, { error: 'Name, email, and message are required.' });
        const submittedAt = new Date().toISOString();
        const lead = { id: Date.now(), userId: user?.role === 'user' ? user.id : null, name, email, requestType: String(body.requestType || 'Consultation'), timeline: String(body.timeline || 'Not specified'), message, status: 'New', stage: 'Quote requested', progress: 0, statusNote: 'Project request received. We will review it shortly.', statusHistory: [{ stage: 'Quote requested', progress: 0, note: 'Project request received. We will review it shortly.', updatedAt: submittedAt }], stageUpdatedAt: submittedAt, submittedAt };
        db.leads.unshift(lead); writeDb(db); return send(res, 201, { lead });
      }
      if (req.method === 'GET' && url.pathname === '/api/leads') { if (!requireUser(user, res)) return; const leads = (user.role === 'admin' ? db.leads : db.leads.filter(lead => lead.userId === user.id || lead.email === user.email)).map(normalizeProject); return send(res, 200, { leads }); }
      const leadMatch = url.pathname.match(/^\/api\/leads\/(\d+)$/);
      if (leadMatch && req.method === 'PATCH') { if (!requireAdmin(user, res)) return; const lead = db.leads.find(item => item.id === Number(leadMatch[1])); if (!lead) return send(res, 404, { error: 'Project not found.' }); normalizeProject(lead); if (body.status) lead.status = String(body.status); const nextStage = stages.includes(body.stage) ? body.stage : lead.stage, nextProgress = Number.isFinite(Number(body.progress)) ? Math.max(0, Math.min(100, Math.round(Number(body.progress)))) : lead.progress, nextNote = typeof body.statusNote === 'string' ? body.statusNote.trim().slice(0, 500) : lead.statusNote; if (nextStage !== lead.stage || nextProgress !== lead.progress || nextNote !== lead.statusNote) { const updatedAt = new Date().toISOString(); lead.stage = nextStage; lead.progress = nextProgress; lead.statusNote = nextNote; lead.stageUpdatedAt = updatedAt; lead.statusHistory.unshift({ stage: nextStage, progress: nextProgress, note: nextNote || 'Project status updated.', updatedAt }); lead.statusHistory = lead.statusHistory.slice(0, 10); } writeDb(db); return send(res, 200, { lead }); }
      if (leadMatch && req.method === 'DELETE') { if (!requireAdmin(user, res)) return; db.leads = db.leads.filter(item => item.id !== Number(leadMatch[1])); writeDb(db); return send(res, 204, {}); }
      if (req.method === 'GET' && url.pathname === '/api/users') { if (!requireAdmin(user, res)) return; return send(res, 200, { users: db.users.filter(account => account.role === 'user').map(publicUser) }); }
      if (req.method === 'POST' && url.pathname === '/api/payments') {
        if (!requireUser(user, res) || user.role !== 'user') return; const amount = Number(body.amount); const proofData = String(body.proofData || '');
        if (!Number.isFinite(amount) || amount <= 0 || !/^data:image\/(png|jpeg|webp);base64,/i.test(proofData)) return send(res, 400, { error: 'Enter the paid amount and upload a valid image.' });
        const payment = { id: `UPI-${Date.now()}`, userId: user.id, name: user.name, email: user.email, amount, proofName: String(body.proofName || 'payment-proof'), proofData, submittedAt: new Date().toISOString() };
        db.payments.unshift(payment); writeDb(db); return send(res, 201, { payment: { ...payment, proofData: undefined } });
      }
      if (req.method === 'GET' && url.pathname === '/api/payments') { if (!requireAdmin(user, res)) return; return send(res, 200, { payments: db.payments }); }
      return send(res, 404, { error: 'Endpoint not found.' });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); return res.end(); }
    const filePath = safeStaticPath(url.pathname);
    if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpeg': 'image/jpeg' };
    res.writeHead(200, { 'Content-Type': types[path.extname(filePath)] || 'application/octet-stream' });
    if (req.method === 'HEAD') return res.end(); fs.createReadStream(filePath).pipe(res);
  } catch (error) { send(res, 400, { error: error.message || 'Request failed.' }); }
});

ensureStore();
server.listen(port, () => console.log(`Neural Nexus running at http://localhost:${port}`));
