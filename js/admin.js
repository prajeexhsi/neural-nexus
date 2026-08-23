const ADMIN_EMAIL = 'neuralnexus092@gmail.com';
        const ADMIN_PASSWORD = 'neural-nexus-admin';
        const loginView = document.getElementById('loginView');
        const dashboardView = document.getElementById('dashboardView');
        const userView = document.getElementById('userView');
        const leadList = document.getElementById('leadList');
        const userList = document.getElementById('userList');

        function getUsers() {
            const users = JSON.parse(localStorage.getItem('neuralNexusUsers') || '[]');
            if (!users.some(user => user.email === ADMIN_EMAIL)) {
                users.push({ id: 'admin', name: 'Neural Nexus Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD, role: 'admin', createdAt: new Date().toISOString() });
                localStorage.setItem('neuralNexusUsers', JSON.stringify(users));
            }
            return users;
        }
        function setUsers(users) { localStorage.setItem('neuralNexusUsers', JSON.stringify(users)); }
        function getLeads() { return JSON.parse(localStorage.getItem('neuralNexusLeads') || '[]'); }
        function setLeads(leads) { localStorage.setItem('neuralNexusLeads', JSON.stringify(leads)); }
        function escapeHtml(value) { const node = document.createElement('div'); node.textContent = value || ''; return node.innerHTML; }

        function renderLeads() {
            const query = document.getElementById('leadSearch').value.trim().toLowerCase();
            const leads = getLeads();
            const filtered = leads.filter(lead => `${lead.name} ${lead.email} ${lead.requestType} ${lead.message}`.toLowerCase().includes(query));
            document.getElementById('totalLeads').textContent = leads.length;
            document.getElementById('newLeads').textContent = leads.filter(lead => lead.status === 'New').length;
            document.getElementById('contactedLeads').textContent = leads.filter(lead => lead.status === 'Contacted').length;
            const users = getUsers();
            document.getElementById('totalUsers').textContent = users.filter(user => user.role === 'user').length;
            const registeredUsers = users.filter(user => user.role === 'user');
            userList.innerHTML = registeredUsers.length ? registeredUsers.map(user => `<article class="lead"><div class="lead-head"><h2>${escapeHtml(user.name)}</h2><span>${new Date(user.createdAt).toLocaleString()}</span></div><div class="lead-meta"><span>${escapeHtml(user.email)}</span><span>Registered user</span></div></article>`).join('') : '<div class="empty">No registered users yet.</div>';
            if (!filtered.length) { leadList.innerHTML = '<div class="empty">No leads found yet.</div>'; return; }
            leadList.innerHTML = filtered.map(lead => `
                <article class="lead">
                    <div class="lead-head"><h2>${escapeHtml(lead.name)}</h2><span>${new Date(lead.submittedAt).toLocaleString()}</span></div>
                    <div class="lead-meta"><span>${escapeHtml(lead.email)}</span><span>${escapeHtml(lead.requestType)}</span><span>${escapeHtml(lead.timeline)}</span></div>
                    <p class="lead-message">${escapeHtml(lead.message)}</p>
                    <div class="lead-actions">
                        <select aria-label="Lead status" data-status-id="${lead.id}">
                            ${['New', 'Contacted', 'Qualified', 'Closed'].map(status => `<option ${lead.status === status ? 'selected' : ''}>${status}</option>`).join('')}
                        </select>
                        <a href="mailto:${encodeURIComponent(lead.email)}">Reply by email</a>
                        <button class="danger" type="button" data-delete-id="${lead.id}">Delete</button>
                    </div>
                </article>`).join('');
        }

        function renderUserDashboard(user) {
            document.getElementById('userProfile').innerHTML = `<h2 style="margin-top: 0; color: var(--cyan);">${escapeHtml(user.name)}</h2><p>${escapeHtml(user.email)}</p><p>Account created: ${new Date(user.createdAt).toLocaleDateString()}</p>`;
            const myLeads = getLeads().filter(lead => lead.userId === user.id || lead.email.toLowerCase() === user.email.toLowerCase());
            const target = document.getElementById('userLeadList');
            if (!myLeads.length) { target.innerHTML = '<div class="empty">No enquiries yet. Submit a project request from the main website.</div>'; return; }
            target.innerHTML = myLeads.map(lead => `<article class="lead"><div class="lead-head"><h2>${escapeHtml(lead.requestType)}</h2><span>${new Date(lead.submittedAt).toLocaleString()}</span></div><div class="lead-meta"><span>Status: ${escapeHtml(lead.status)}</span><span>${escapeHtml(lead.timeline)}</span></div><p class="lead-message">${escapeHtml(lead.message)}</p></article>`).join('');
        }

        function showAccount(user) {
            loginView.style.display = 'none';
            if (user.role === 'admin') { dashboardView.classList.add('open'); renderLeads(); }
            else { userView.classList.add('open'); renderUserDashboard(user); }
        }

        function showLogin() {
            dashboardView.classList.remove('open'); userView.classList.remove('open'); loginView.style.display = '';
        }

        document.getElementById('loginForm').addEventListener('submit', event => {
            event.preventDefault();
            const email = document.getElementById('loginEmail').value.trim().toLowerCase();
            const password = document.getElementById('loginPassword').value;
            const user = getUsers().find(account => account.email.toLowerCase() === email && account.password === password);
            if (!user) { document.getElementById('loginError').textContent = 'Invalid email or password.'; return; }
            sessionStorage.setItem('neuralNexusSession', JSON.stringify({ id: user.id, role: user.role }));
            showAccount(user);
        });
        document.getElementById('registerForm').addEventListener('submit', event => {
            event.preventDefault();
            const name = document.getElementById('registerName').value.trim();
            const email = document.getElementById('registerEmail').value.trim().toLowerCase();
            const password = document.getElementById('registerPassword').value;
            const users = getUsers();
            if (users.some(user => user.email.toLowerCase() === email)) { document.getElementById('registerError').textContent = 'An account already uses this email.'; return; }
            const user = { id: `user-${Date.now()}`, name, email, password, role: 'user', createdAt: new Date().toISOString() };
            users.push(user); setUsers(users);
            sessionStorage.setItem('neuralNexusSession', JSON.stringify({ id: user.id, role: user.role }));
            showAccount(user);
        });
        document.getElementById('showRegister').addEventListener('click', event => { event.preventDefault(); document.getElementById('loginForm').classList.add('hidden'); document.getElementById('registerForm').classList.add('open'); });
        document.getElementById('showLogin').addEventListener('click', event => { event.preventDefault(); document.getElementById('registerForm').classList.remove('open'); document.getElementById('loginForm').classList.remove('hidden'); });
        document.getElementById('logoutButton').addEventListener('click', () => { sessionStorage.removeItem('neuralNexusSession'); showLogin(); });
        document.querySelectorAll('.logout-button').forEach(button => button.addEventListener('click', () => { sessionStorage.removeItem('neuralNexusSession'); showLogin(); }));
        document.getElementById('leadSearch').addEventListener('input', renderLeads);
        leadList.addEventListener('change', event => {
            const id = Number(event.target.dataset.statusId); if (!id) return;
            const leads = getLeads(); const lead = leads.find(item => item.id === id); if (lead) { lead.status = event.target.value; setLeads(leads); renderLeads(); }
        });
        leadList.addEventListener('click', event => {
            const id = Number(event.target.dataset.deleteId); if (!id) return;
            setLeads(getLeads().filter(lead => lead.id !== id)); renderLeads();
        });
        document.getElementById('exportButton').addEventListener('click', () => {
            const headers = ['Name', 'Email', 'Request type', 'Timeline', 'Message', 'Status', 'Submitted at'];
            const quote = value => `"${String(value || '').replace(/"/g, '""')}"`;
            const rows = getLeads().map(lead => [lead.name, lead.email, lead.requestType, lead.timeline, lead.message, lead.status, lead.submittedAt].map(quote).join(','));
            const blob = new Blob([[headers.join(','), ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
            const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = 'neural-nexus-leads.csv'; link.click(); URL.revokeObjectURL(link.href);
        });
        const savedSession = JSON.parse(sessionStorage.getItem('neuralNexusSession') || 'null');
        if (savedSession) { const account = getUsers().find(user => user.id === savedSession.id && user.role === savedSession.role); if (account) showAccount(account); }
