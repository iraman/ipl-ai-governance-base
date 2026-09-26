# Trimble WorkRide — Share with team & deploy to gateway

## Part 1: Share the codebase with your team

### Option A: Git repository (recommended)

1. **Initialize Git in the project** (if not already under version control):
   ```bash
   cd /path/to/Trimble-transport
   git init
   git add .
   git commit -m "Initial Trimble WorkRide app"
   ```

2. **Create a remote repository** (e.g. on your org’s Git server — Azure DevOps, GitHub, GitLab, Bitbucket):
   - Create a new repo (e.g. `Trimble-WorkRide` or `trimble-workride`).
   - Do **not** initialize with a README if you already have one locally.

3. **Push your code**:
   ```bash
   git remote add origin <your-repo-url>
   git branch -M main
   git push -u origin main
   ```

4. **Share with the team**:
   - Send the repo URL and access (add members / grant permissions).
   - Tell them to clone and run locally (see README):
     ```bash
     git clone <repo-url>
     cd Trimble-transport
     # Backend
     cd backend && npm install && npm run dev
     # Frontend (new terminal)
     cd frontend && npm install && npm run dev
     ```

5. **What’s ignored** (see `.gitignore`):
   - `node_modules/`, `frontend/dist/`, `backend/data/store.json` (optional), `.env`, logs, IDE files.
   - If you want to commit seed data, remove or comment out the `backend/data/store.json` line in `.gitignore`.

### Option B: Share as a zip or copy

1. From the project root, create an archive **excluding** `node_modules` and `frontend/dist`:
   ```bash
   cd /path/to/Trimble-transport
   zip -r Trimble-WorkRide.zip . -x "node_modules/*" -x "frontend/node_modules/*" -x "backend/node_modules/*" -x "frontend/dist/*" -x ".git/*"
   ```
2. Share the zip (e.g. Teams, email, shared drive).
3. Recipients unzip and run `npm install` in both `backend` and `frontend`, then start as in the README.

---

## Part 2: Deploy to the gateway

“Gateway” here means your deployment target (e.g. internal app gateway, reverse proxy, or a single server that hosts the app).

### Prerequisites

- Node.js 16+ (or 18+ recommended) on the deployment host.
- Build and run from the **Trimble-transport** project root (or adjust paths below).

### Step 1: Build the frontend

```bash
cd Trimble-transport/frontend
npm ci
npm run build
```

This creates `frontend/dist/` with static files (HTML, JS, CSS).

### Step 2: Prepare the backend for production

- Backend stays in `Trimble-transport/backend`.
- Ensure `backend/data/` exists (it will be created on first run if your code creates it).
- Optional: set environment variables (see Step 4).

### Step 3: Deploy as a single Node app (easiest for “gateway”)

Run one process that serves both API and frontend:

1. Set production mode and port (e.g. for gateway or reverse proxy):
   ```bash
   export NODE_ENV=production
   export PORT=3001
   ```
2. From the **project root** (parent of both `backend` and `frontend`):
   ```bash
   cd Trimble-transport
   node backend/server.js
   ```
   - API: `http://<host>:3001/api/...`
   - App (SPA): same origin, e.g. `http://<host>:3001/` (backend serves `frontend/dist` when `NODE_ENV=production` and `frontend/dist` exists).

3. **Gateway / reverse proxy** (e.g. nginx, internal gateway):
   - Point the gateway to `http://<this-server>:3001` (or the port you set).
   - No need to set `VITE_API_URL`; the UI uses `/api` on the same origin.

### Step 4: Environment variables (optional)

| Variable           | Where   | Purpose |
|--------------------|--------|---------|
| `NODE_ENV`         | Backend | Set to `production` so the backend serves the built frontend. |
| `PORT`             | Backend | Port the server listens on (default `3001`). |
| `VITE_API_URL`     | Frontend (build time) | Only if the UI is served from a **different** host/port than the API. Set to the **base URL** of the API (e.g. `https://gateway.company.com/workride-api`). Then rebuild the frontend. |

Example (frontend on different host):

```bash
cd frontend
VITE_API_URL=https://gateway.company.com/workride-api npm run build
```

Then deploy `frontend/dist` to your static host and point the gateway to your backend for `/api`.

### Step 5: Run behind a process manager (recommended on a server)

So the app restarts on crash and survives reboots:

**Using PM2:**

```bash
cd Trimble-transport
npm install -g pm2
NODE_ENV=production PORT=3001 pm2 start backend/server.js --name trimble-workride
pm2 save
pm2 startup   # follow the command it prints to enable on boot
```

**Using systemd** (Linux): create a unit file, e.g. `/etc/systemd/system/trimble-workride.service`:

```ini
[Unit]
Description=Trimble WorkRide
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/Trimble-transport
Environment=NODE_ENV=production
Environment=PORT=3001
ExecStart=/usr/bin/node backend/server.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

Then:

```bash
sudo systemctl daemon-reload
sudo systemctl enable trimble-workride
sudo systemctl start trimble-workride
```

### Step 6: Gateway / reverse proxy configuration

If your “gateway” is nginx (or similar) in front of the Node app:

- Proxy requests for the app (and optionally `/api`) to `http://127.0.0.1:3001`.
- Example (nginx):

```nginx
server {
  listen 80;
  server_name workride.company.com;

  location / {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

If the gateway uses a path prefix (e.g. `https://gateway.company.com/apps/workride`), you’ll need to:
- Set the backend’s base path (if your stack supports it), or
- Publish the app at the root of a dedicated subdomain/vhost and point the gateway there.

---

## Quick reference

| Goal                    | Command / action |
|-------------------------|------------------|
| Share via Git           | Push to remote; team runs `git clone` then `npm install` in `backend` and `frontend`. |
| Build for production    | `cd frontend && npm run build`. |
| Run production (single) | `NODE_ENV=production node backend/server.js` from project root. |
| Custom API URL (UI elsewhere) | `VITE_API_URL=<api-base> npm run build` in `frontend`, then deploy `frontend/dist` and backend separately. |
| Run with PM2            | `NODE_ENV=production pm2 start backend/server.js --name trimble-workride`. |

For Trimble-specific gateway (e.g. internal portal or API gateway), use your team’s standard deployment steps and point the gateway to the Node app (and optional static host) as above.
