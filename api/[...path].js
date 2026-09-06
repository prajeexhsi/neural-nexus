const crypto = require('crypto');
const { Redis } = require('@upstash/redis');

const storeKey = 'neural-nexus:store';
const stages = ['Quote requested', 'Planning', 'In progress', 'Testing', 'Completed'];

function redis() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) throw new Error('The server is not configured. Connect an Upstash Redis database in Vercel.');
  return new Redis({ url, token });
}

function send(response, status, body) {
  response.status(status).json(body);
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

function publicUser(user) {
  return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt };
}

async function readDb() {
  const saved = await redis().get(storeKey);
  if (saved) return typeof saved === 'string' ? JSON.parse(saved) : saved;

  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) throw new Error('The server is not configured. Set ADMIN_EMAIL and ADMIN_PASSWORD in Vercel.');
  const initial = {
    users: [{ id: 'admin', name: 'Neural Nexus Admin', email: adminEmail.trim().toLowerCase(), passwordHash: hashPassword(adminPassword), role: 'admin', createdAt: new Date().toISOString() }],
    leads: [],
    payments: []
  };
  await redis().set(storeKey, JSON.stringify(initial));
  return initial;
}

async function writeDb(db) {
  await redis().set(storeKey, JSON.stringify(db));
}

function signSession(user) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error('The server is not configured. Set SESSION_SECRET in Vercel.');
  const payload = Buffer.from(JSON.stringify({ id: user.id, role: user.role, expires: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('base64url');
  return `${payload}.${signature}`;
}

function currentUser(request, db) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;
  const token = (request.headers.authorization || '').replace(/^Bearer\s+/i, '');
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

function requireUser(user, response) {
  if (user) return true;
  send(response, 401, { error: 'Please sign in first.' });
  return false;
}

function requireAdmin(user, response) {
  if (!requireUser(user, response)) return false;
  if (user.role === 'admin') return true;
  send(response, 403, { error: 'Admin access required.' });
  return false;
}

module.exports = async (request, response) => {
  try {
    const db = await readDb();
    const user = currentUser(request, db);
    const path = `/${(request.query.path || []).join('/')}`;
    const body = typeof request.body === 'string' ? JSON.parse(request.body || '{}') : (request.body || {});

    if (request.method === 'POST' && path === '/auth/register') {
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return send(response, 400, { error: 'Enter a name, valid email, and password of at least 6 characters.' });
      if (db.users.some(account => account.email === email)) return send(response, 409, { error: 'An account already uses this email.' });
      const account = { id: `user-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`, name, email, passwordHash: hashPassword(password), role: 'user', createdAt: new Date().toISOString() };
      db.users.push(account); await writeDb(db);
      return send(response, 201, { user: publicUser(account), token: signSession(account) });
    }

    if (request.method === 'POST' && path === '/auth/login') {
      const email = String(body.email || '').trim().toLowerCase();
      const account = db.users.find(item => item.email === email);
      if (!account || !passwordMatches(String(body.password || ''), account.passwordHash)) return send(response, 401, { error: 'Invalid email or password.' });
      return send(response, 200, { user: publicUser(account), token: signSession(account) });
    }

    if (request.method === 'GET' && path === '/session') {
      if (!requireUser(user, response)) return;
      return send(response, 200, { user: publicUser(user) });
    }

    if (request.method === 'POST' && path === '/leads') {
      const name = String(body.name || '').trim(); const email = String(body.email || '').trim().toLowerCase(); const message = String(body.message || '').trim();
      if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) return send(response, 400, { error: 'Name, email, and message are required.' });
      const submittedAt = new Date().toISOString();
      const lead = { id: Date.now(), userId: user?.role === 'user' ? user.id : null, name, email, requestType: String(body.requestType || 'Consultation'), timeline: String(body.timeline || 'Not specified'), message, status: 'New', stage: 'Quote requested', stageUpdatedAt: submittedAt, submittedAt };
      db.leads.unshift(lead); await writeDb(db); return send(response, 201, { lead });
    }

    if (request.method === 'GET' && path === '/leads') {
      if (!requireUser(user, response)) return;
      return send(response, 200, { leads: user.role === 'admin' ? db.leads : db.leads.filter(lead => lead.userId === user.id || lead.email === user.email) });
    }

    const leadMatch = path.match(/^\/leads\/(\d+)$/);
    if (leadMatch && request.method === 'PATCH') {
      if (!requireAdmin(user, response)) return;
      const lead = db.leads.find(item => item.id === Number(leadMatch[1]));
      if (!lead) return send(response, 404, { error: 'Project not found.' });
      if (body.status) lead.status = String(body.status);
      if (stages.includes(body.stage) && lead.stage !== body.stage) { lead.stage = body.stage; lead.stageUpdatedAt = new Date().toISOString(); }
      await writeDb(db); return send(response, 200, { lead });
    }
    if (leadMatch && request.method === 'DELETE') {
      if (!requireAdmin(user, response)) return;
      db.leads = db.leads.filter(item => item.id !== Number(leadMatch[1])); await writeDb(db); return response.status(204).end();
    }

    if (request.method === 'GET' && path === '/users') {
      if (!requireAdmin(user, response)) return;
      return send(response, 200, { users: db.users.filter(account => account.role === 'user').map(publicUser) });
    }

    if (request.method === 'POST' && path === '/payments') {
      if (!requireUser(user, response) || user.role !== 'user') return;
      const amount = Number(body.amount); const proofData = String(body.proofData || '');
      if (!Number.isFinite(amount) || amount <= 0 || !/^data:image\/(png|jpeg|webp);base64,/i.test(proofData)) return send(response, 400, { error: 'Enter the paid amount and upload a valid image.' });
      const payment = { id: `UPI-${Date.now()}`, userId: user.id, name: user.name, email: user.email, amount, proofName: String(body.proofName || 'payment-proof'), proofData, submittedAt: new Date().toISOString() };
      db.payments.unshift(payment); await writeDb(db); return send(response, 201, { payment: { ...payment, proofData: undefined } });
    }
    if (request.method === 'GET' && path === '/payments') {
      if (!requireAdmin(user, response)) return;
      return send(response, 200, { payments: db.payments });
    }
    return send(response, 404, { error: 'Endpoint not found.' });
  } catch (error) {
    return send(response, 500, { error: error.message || 'Request failed.' });
  }
};

module.exports.config = { api: { bodyParser: { sizeLimit: '2mb' } } };
