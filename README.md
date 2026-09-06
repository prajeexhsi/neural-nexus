# Neural Nexus Website

- `index.html` — main Neural Nexus website
- `admin.html` — login/register + lead management page
- `css/style.css` — main website styles
- `css/admin.css` — admin styles
- `js/main.js` — main website interactions
- `js/admin.js` — admin/login/lead interactions

Run `node server.js`, then open `http://localhost:5500`.

Customer accounts, enquiries, payment proofs, and project stages are persisted in `data/store.json` (created automatically when the server starts). Do not commit that file; it contains customer data. Set `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` environment variables before production use.
