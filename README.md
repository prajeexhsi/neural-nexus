# Neural Nexus Website

- `index.html` — main Neural Nexus website
- `admin.html` — login/register + lead management page
- `css/style.css` — main website styles
- `css/admin.css` — admin styles
- `js/main.js` — main website interactions
- `js/admin.js` — admin/login/lead interactions

Run `node server.js`, then open `http://localhost:5500`.

Customer accounts, enquiries, payment proofs, and project stages are persisted in `data/store.json` (created automatically when the server starts). Do not commit that file; it contains customer data. Set `SESSION_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` environment variables before production use.

## Vercel deployment

The `api/[...path].js` serverless function serves the `/api/*` endpoints used by the website. It stores production data in Upstash Redis, so the data survives serverless function restarts.

Before deploying, add an Upstash Redis integration from the Vercel Marketplace and connect it to this project. It supplies `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` automatically. (The older `KV_REST_API_URL` and `KV_REST_API_TOKEN` names are also supported.) Also add these Production environment variables:

- `SESSION_SECRET`: a long random secret used to sign sessions.
- `ADMIN_EMAIL`: the initial administrator email address.
- `ADMIN_PASSWORD`: the initial administrator password.

Do not change `ADMIN_EMAIL` after the first successful request: the initial admin record is stored in KV on first use.
