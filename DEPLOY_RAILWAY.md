# Deploy To Railway

## 1. Push Code To GitHub
Make sure your latest code is in the GitHub repo.

## 2. Create Railway Project
1. Open https://railway.app
2. Click `New Project` -> `Deploy from GitHub repo`
3. Select this repository

`railway.json` in this repo already sets:
- Build command: `npm ci --include=dev && npm run db:push -- --force && npm run build`
- Start command: `npm run start`

## 3. Add PostgreSQL
1. In Railway project, click `+ New` -> `Database` -> `PostgreSQL`
2. Open the database service and copy the connection string

## 4. Set Environment Variables (Web Service)
Add these keys in Railway service Variables:

- `DATABASE_URL` = your Railway Postgres URL (starts with `postgres://...`)
- `NODE_ENV` = `production`

Optional:
- `PGSSL` = `true` (only if needed by your database)
- `OPENAI_API_KEY` = your OpenAI key
- `OPENAI_BASE_URL` = `https://api.openai.com/v1` (or your provider URL)

## 5. Deploy
Trigger a deploy from Railway.  
After deploy, open the generated Railway domain and test:
- signup/login
- `/api` endpoints
- egg records insert

## 6. Common Error Fix
If you see `getaddrinfo ENOTFOUND base`:
- Your `DATABASE_URL` value is incorrect.
- Replace it with the real full Postgres URL from Railway Variables.
