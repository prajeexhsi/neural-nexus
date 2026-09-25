const loginView = document.getElementById('loginView');
const dashboardView = document.getElementById('dashboardView');
const userView = document.getElementById('userView');
const leadList = document.getElementById('leadList');
const userList = document.getElementById('userList');
const stages = ['Quote requested', 'Planning', 'In progress', 'Testing', 'Completed'];
let liveTrackingTimer = null;

function getSession() { return JSON.parse(sessionStorage.getItem('neuralNexusSession') || 'null'); }
function setSession(session) { sessionStorage.setItem('neuralNexusSession', JSON.stringify(session)); }
function escapeHtml(value) { const node = document.createElement('div'); node.textContent = value || ''; return node.innerHTML; }
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'Neural@123';
function getUsers() {
  const users = JSON.parse(localStorage.getItem('neuralNexusUsers') || '[]');
  const adminIndex = users.findIndex(user => user.role === 'admin');
  if (adminIndex >= 0) {
    users[adminIndex] = { ...users[adminIndex], id: 'admin', username: 'admin@gmail.com', name: 'Neural Nexus Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin', createdAt: users[adminIndex].createdAt || new Date().toISOString() };
  } else {
    users.push({ id: 'admin', username: 'admin@gmail.com', name: 'Neural Nexus Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin', createdAt: new Date().toISOString() });
  }
  localStorage.setItem('neuralNexusUsers', JSON.stringify(users));
  return users;
}
function setUsers(users) { localStorage.setItem('neuralNexusUsers', JSON.stringify(users)); }
function getLeads() { return JSON.parse(localStorage.getItem('neuralNexusLeads') || '[]'); }
function setLeads(leads) { localStorage.setItem('neuralNexusLeads', JSON.stringify(leads)); }
function getPayments() { return JSON.parse(localStorage.getItem('neuralNexusPayments') || '[]'); }
function setPayments(payments) { localStorage.setItem('neuralNexusPayments', JSON.stringify(payments)); }
function normalizeProject(lead) { const stageIndex = Math.max(0, stages.indexOf(lead.stage)); if (!Number.isFinite(Number(lead.progress))) lead.progress = Math.round(stageIndex / (stages.length - 1) * 100); if (!Array.isArray(lead.statusHistory)) lead.statusHistory = [{ stage: lead.stage || stages[0], progress: lead.progress, note: lead.statusNote || 'Project request received.', updatedAt: lead.stageUpdatedAt || lead.submittedAt }]; return lead; }
function publicUser(user) { return { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt }; }
function currentUser() { const saved = getSession()?.user; return saved && getUsers().find(user => user.id === saved.id) || null; }
function fail(message) { throw new Error(message); }
async function api(url, options = {}) {
  const method = options.method || 'GET'; const body = options.body ? JSON.parse(options.body) : {}; const user = currentUser();
  if (method === 'POST' && url === '/api/auth/register') {
    const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase(), password = String(body.password || '');
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || password.length < 6) return fail('Enter a name, valid email, and password of at least 6 characters.');
    const users = getUsers(); if (users.some(account => account.email === email)) return fail('An account already uses this email.');
    const account = { id: `user-${Date.now()}`, name, email, password, role: 'user', createdAt: new Date().toISOString() }; users.push(account); setUsers(users); return { user: publicUser(account) };
  }
  if (method === 'POST' && url === '/api/auth/login') {
    const loginValue = String(body.email || body.username || '').trim().toLowerCase();
    const account = getUsers().find(item => {
      const email = String(item.email || '').trim().toLowerCase();
      const username = String(item.username || '').trim().toLowerCase();
      return (email === loginValue || username === loginValue || email.split('@')[0] === loginValue) && item.password === String(body.password || '');
    });
    if (!account) return fail('Invalid username/email or password.'); return { user: publicUser(account) };
  }
  if (method === 'GET' && url === '/api/session') { if (!user) return fail('Please sign in first.'); return { user: publicUser(user) }; }
  if (method === 'POST' && url === '/api/leads') {
    const name = String(body.name || '').trim(), email = String(body.email || '').trim().toLowerCase(), message = String(body.message || '').trim();
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !message) return fail('Name, email, and message are required.');
    const submittedAt = new Date().toISOString(), lead = { id: Date.now(), userId: user?.role === 'user' ? user.id : null, name, email, requestType: String(body.requestType || 'Consultation'), timeline: String(body.timeline || 'Not specified'), message, status: 'New', stage: 'Quote requested', progress: 0, statusNote: 'Project request received. We will review it shortly.', statusHistory: [{ stage: 'Quote requested', progress: 0, note: 'Project request received. We will review it shortly.', updatedAt: submittedAt }], stageUpdatedAt: submittedAt, submittedAt };
    const leads = getLeads(); leads.unshift(lead); setLeads(leads); return { lead };
  }
  if (method === 'GET' && url === '/api/leads') { if (!user) return fail('Please sign in first.'); const leads = getLeads(); return { leads: (user.role === 'admin' ? leads : leads.filter(lead => lead.userId === user.id || lead.email === user.email)).map(normalizeProject) }; }
  const leadMatch = url.match(/^\/api\/leads\/(\d+)$/);
  if (leadMatch && method === 'PATCH') { if (user?.role !== 'admin') return fail('Admin access required.'); const leads = getLeads(), lead = leads.find(item => item.id === Number(leadMatch[1])); if (!lead) return fail('Project not found.'); normalizeProject(lead); if (body.status) lead.status = String(body.status); const nextStage = stages.includes(body.stage) ? body.stage : lead.stage, nextProgress = Number.isFinite(Number(body.progress)) ? Math.max(0, Math.min(100, Math.round(Number(body.progress)))) : lead.progress, nextNote = typeof body.statusNote === 'string' ? body.statusNote.trim().slice(0, 500) : lead.statusNote; if (nextStage !== lead.stage || nextProgress !== lead.progress || nextNote !== lead.statusNote) { const updatedAt = new Date().toISOString(); lead.stage = nextStage; lead.progress = nextProgress; lead.statusNote = nextNote; lead.stageUpdatedAt = updatedAt; lead.statusHistory.unshift({ stage: nextStage, progress: nextProgress, note: nextNote || 'Project status updated.', updatedAt }); lead.statusHistory = lead.statusHistory.slice(0, 10); } setLeads(leads); return { lead }; }
  if (leadMatch && method === 'DELETE') { if (user?.role !== 'admin') return fail('Admin access required.'); setLeads(getLeads().filter(item => item.id !== Number(leadMatch[1]))); return null; }
  if (method === 'GET' && url === '/api/users') { if (user?.role !== 'admin') return fail('Admin access required.'); return { users: getUsers().filter(account => account.role === 'user').map(publicUser) }; }
  if (method === 'POST' && url === '/api/payments') { if (!user || user.role !== 'user') return fail('Please sign in first.'); const amount = Number(body.amount), proofData = String(body.proofData || ''); if (!Number.isFinite(amount) || amount <= 0 || !/^data:image\/(png|jpeg|webp);base64,/i.test(proofData)) return fail('Enter the paid amount and upload a valid image.'); const payment = { id: `UPI-${Date.now()}`, userId: user.id, name: user.name, email: user.email, amount, proofName: String(body.proofName || 'payment-proof'), proofData, submittedAt: new Date().toISOString() }; const payments = getPayments(); payments.unshift(payment); setPayments(payments); return { payment: { ...payment, proofData: undefined } }; }
  if (method === 'GET' && url === '/api/payments') { if (user?.role !== 'admin') return fail('Admin access required.'); return { payments: getPayments() }; }
  return fail('Request not found.');
}

async function renderLeads() {
  const [leadData, userData, paymentData] = await Promise.all([api('/api/leads'), api('/api/users'), api('/api/payments')]);
  const query = document.getElementById('leadSearch').value.trim().toLowerCase();
  const leads = leadData.leads;
  const filtered = leads.filter(lead => `${lead.name} ${lead.email} ${lead.requestType} ${lead.message}`.toLowerCase().includes(query));
  document.getElementById('totalLeads').textContent = leads.length;
  document.getElementById('newLeads').textContent = leads.filter(lead => lead.status === 'New').length;
  document.getElementById('contactedLeads').textContent = leads.filter(lead => lead.status === 'Contacted').length;
  document.getElementById('totalUsers').textContent = userData.users.length;
  userList.innerHTML = userData.users.length ? userData.users.map(user => `<article class="lead"><div class="lead-head"><h2>${escapeHtml(user.name)}</h2><span>${new Date(user.createdAt).toLocaleString()}</span></div><div class="lead-meta"><span>${escapeHtml(user.email)}</span><span>Registered user</span></div></article>`).join('') : '<div class="empty">No registered users yet.</div>';
  const paymentTarget = document.getElementById('paymentList');
  paymentTarget.innerHTML = paymentData.payments.length ? paymentData.payments.map(payment => `<article class="lead"><div class="lead-head"><h2>₹${Number(payment.amount).toLocaleString('en-IN')} payment proof</h2><span>${new Date(payment.submittedAt).toLocaleString()}</span></div><div class="lead-meta"><span>${escapeHtml(payment.name)}</span><span>${escapeHtml(payment.email)}</span><span>${escapeHtml(payment.proofName)}</span></div><a href="${payment.proofData}" target="_blank" rel="noopener noreferrer">View uploaded screenshot</a></article>`).join('') : '<div class="empty">No payment proofs submitted yet.</div>';
  leadList.innerHTML = filtered.length ? filtered.map(lead => { normalizeProject(lead); return `<article class="lead"><div class="lead-head"><h2>${escapeHtml(lead.name)}</h2><span>${new Date(lead.submittedAt).toLocaleString()}</span></div><div class="lead-meta"><span>${escapeHtml(lead.email)}</span><span>${escapeHtml(lead.requestType)}</span><span>${escapeHtml(lead.timeline)}</span></div><p class="lead-message">${escapeHtml(lead.message)}</p><div class="lead-actions"><select aria-label="Lead status" data-status-id="${lead.id}">${['New', 'Contacted', 'Qualified', 'Closed'].map(status => `<option ${lead.status === status ? 'selected' : ''}>${status}</option>`).join('')}</select><select aria-label="Project stage" data-stage-id="${lead.id}">${stages.map(stage => `<option ${lead.stage === stage ? 'selected' : ''}>${stage}</option>`).join('')}</select><label class="progress-control">Progress <input aria-label="Project progress" data-progress-id="${lead.id}" max="100" min="0" type="number" value="${lead.progress}" />%</label><input aria-label="Client-visible project update" data-note-id="${lead.id}" maxlength="500" placeholder="Client-visible status update" value="${escapeHtml(lead.statusNote || '')}"/><button type="button" data-save-status-id="${lead.id}">Save update</button><a href="mailto:${encodeURIComponent(lead.email)}">Reply by email</a><button class="danger" type="button" data-delete-id="${lead.id}">Delete</button></div></article>`; }).join('') : '<div class="empty">No leads found yet.</div>';
}

async function renderUserDashboard(user) {
  document.getElementById('userProfile').innerHTML = `<h2 style="margin-top: 0; color: var(--cyan);">${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><p>Account created: ${new Date(user.createdAt).toLocaleDateString()}</p>`;
  const { leads } = await api('/api/leads');
  const target = document.getElementById('userLeadList');
  target.innerHTML = leads.length ? leads.map(lead => {
    const activeStage = Math.max(0, stages.indexOf(lead.stage));
    const tracker = stages.map((stage, index) => `<span class="stage-step ${index < activeStage ? 'done' : index === activeStage ? 'current' : ''}">${escapeHtml(stage)}</span>`).join('');
    normalizeProject(lead); const updatedAt = lead.stageUpdatedAt || lead.submittedAt;
    const history = lead.statusHistory.slice(0, 3).map(item => `<li><strong>${escapeHtml(item.stage)} · ${item.progress}%</strong><span>${escapeHtml(item.note || 'Project status updated.')}</span><time>${new Date(item.updatedAt).toLocaleString()}</time></li>`).join('');
    return `<article class="lead live-project"><div class="lead-head"><h2>${escapeHtml(lead.requestType)}</h2><span>${new Date(lead.submittedAt).toLocaleString()}</span></div><div class="lead-meta"><span>Status: ${escapeHtml(lead.status)}</span><span class="stage">Current stage: ${escapeHtml(lead.stage)}</span><span>${escapeHtml(lead.timeline)}</span></div><div class="progress-row"><strong>${lead.progress}% complete</strong><div aria-label="Project is ${lead.progress}% complete" class="progress-bar"><span style="width: ${lead.progress}%"></span></div></div><div aria-label="Project stage: ${escapeHtml(lead.stage)}" class="stage-tracker">${tracker}</div><p class="status-note">${escapeHtml(lead.statusNote || 'No update has been posted yet.')}</p><p class="tracking-updated">Live status · Last updated ${new Date(updatedAt).toLocaleString()}</p><ul class="status-history">${history}</ul><p class="lead-message">${escapeHtml(lead.message)}</p></article>`;
  }).join('') : '<div class="empty">No enquiries yet. Submit a project request from the main website.</div>';
}

function setupUserPayment() {
  const proofForm = document.getElementById('paymentProofForm');
  if (proofForm.dataset.ready === 'true') return;
  proofForm.dataset.ready = 'true';
  const proofInput = document.getElementById('paymentProof');
  const preview = document.getElementById('paymentProofPreview');
  const result = document.getElementById('paymentResult');
  proofInput.addEventListener('change', () => {
    const file = proofInput.files[0]; preview.hidden = true;
    if (!file) return;
    if (file.size > 1024 * 1024) { result.textContent = 'Please choose a screenshot smaller than 1 MB.'; proofInput.value = ''; return; }
    preview.src = URL.createObjectURL(file); preview.hidden = false; result.textContent = '';
  });
  proofForm.addEventListener('submit', event => {
    event.preventDefault(); const file = proofInput.files[0]; const amount = Number(document.getElementById('paidAmount').value);
    if (!file || !Number.isFinite(amount) || amount <= 0) { result.textContent = 'Enter the paid amount and upload a valid screenshot.'; return; }
    const reader = new FileReader();
    reader.onload = async () => {
      try { await api('/api/payments', { method: 'POST', body: JSON.stringify({ amount, proofName: file.name, proofData: reader.result }) }); result.textContent = 'Payment proof submitted. We will verify it shortly.'; proofForm.reset(); preview.hidden = true; }
      catch (error) { result.textContent = error.message; }
    };
    reader.readAsDataURL(file);
  });
}

async function showAccount(user) {
  loginView.style.display = 'none';
  clearInterval(liveTrackingTimer);
  if (user.role === 'admin') { dashboardView.classList.add('open'); await renderLeads(); }
  else { userView.classList.add('open'); await renderUserDashboard(user); setupUserPayment(); liveTrackingTimer = setInterval(() => renderUserDashboard(user).catch(() => {}), 10000); }
}
function showLogin() { clearInterval(liveTrackingTimer); liveTrackingTimer = null; dashboardView.classList.remove('open'); userView.classList.remove('open'); loginView.style.display = ''; }

document.getElementById('loginForm').addEventListener('submit', async event => {
  event.preventDefault(); const error = document.getElementById('loginError'); error.textContent = '';
  try { const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: document.getElementById('loginEmail').value, password: document.getElementById('loginPassword').value }) }); setSession(result); await showAccount(result.user); }
  catch (reason) { error.textContent = reason.message; }
});
document.getElementById('registerForm').addEventListener('submit', async event => {
  event.preventDefault(); const error = document.getElementById('registerError'); error.textContent = '';
  try { const result = await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: document.getElementById('registerName').value, email: document.getElementById('registerEmail').value, password: document.getElementById('registerPassword').value }) }); setSession(result); await showAccount(result.user); }
  catch (reason) { error.textContent = reason.message; }
});
document.getElementById('showRegister').addEventListener('click', event => { event.preventDefault(); document.getElementById('loginForm').classList.add('hidden'); document.getElementById('registerForm').classList.add('open'); });
document.getElementById('showLogin').addEventListener('click', event => { event.preventDefault(); document.getElementById('registerForm').classList.remove('open'); document.getElementById('loginForm').classList.remove('hidden'); });
document.getElementById('logoutButton').addEventListener('click', () => { sessionStorage.removeItem('neuralNexusSession'); showLogin(); });
document.querySelectorAll('.logout-button').forEach(button => button.addEventListener('click', () => { sessionStorage.removeItem('neuralNexusSession'); showLogin(); }));
document.getElementById('leadSearch').addEventListener('input', () => renderLeads().catch(() => {}));
leadList.addEventListener('change', async event => {
  const id = event.target.dataset.statusId || event.target.dataset.stageId; if (!id) return;
  try { await api(`/api/leads/${id}`, { method: 'PATCH', body: JSON.stringify(event.target.dataset.statusId ? { status: event.target.value } : { stage: event.target.value }) }); await renderLeads(); } catch (error) { alert(error.message); }
});
leadList.addEventListener('click', async event => {
  const saveId = event.target.dataset.saveStatusId;
  if (saveId) { try { const progress = leadList.querySelector(`[data-progress-id="${saveId}"]`).value; const statusNote = leadList.querySelector(`[data-note-id="${saveId}"]`).value; const stage = leadList.querySelector(`[data-stage-id="${saveId}"]`).value; await api(`/api/leads/${saveId}`, { method: 'PATCH', body: JSON.stringify({ stage, progress, statusNote }) }); await renderLeads(); } catch (error) { alert(error.message); } return; }
  const id = event.target.dataset.deleteId; if (!id) return;
  try { await api(`/api/leads/${id}`, { method: 'DELETE' }); await renderLeads(); } catch (error) { alert(error.message); }
});
(async () => { const session = getSession(); if (!session?.user) return; try { const { user } = await api('/api/session'); await showAccount(user); } catch { sessionStorage.removeItem('neuralNexusSession'); } })();
