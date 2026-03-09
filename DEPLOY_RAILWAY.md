# Deploy To Railway

## 1. Push Code To GitHub
Make sure your latest code is in the GitHub repo.

## 2. Create Railway Project
1. Open https://railway.app
2. Click `New Project` -> `Deploy from GitHub repo`
3. Select this repository

`railway.json` in this repo already sets:
- Build command: `npm install --include=dev && npm run build`
- Start command: `npm run start`

## 3. Add PostgreSQL
1. In Railway project, click `+ New` -> `Database` -> `PostgreSQL`
2. Open the PostgreSQL service and copy the connection string

## 4. Set Environment Variables (Web Service)
Add these keys in Railway service Variables:

- `DATABASE_URL` = your Railway PostgreSQL URL (starts with `postgres://...` or `postgresql://...`)
- `NODE_ENV` = `production`

Optional:
- `DATABASE_INTERNAL_URL` = Railway internal database URL (if using private networking)
- `OPENAI_API_KEY` = your OpenAI key
- `OPENAI_BASE_URL` = `https://api.openai.com/v1` (or your provider URL)

## 5. Deploy
Trigger a deploy from Railway.  
After deploy, open the generated Railway domain and test:
- signup/login
- `/api` endpoints
- egg records insert

## 6. Common Error Fix
If you see `PostgreSQL is not configured` or connection errors:
- Your `DATABASE_URL` value is missing or invalid.
- Replace it with the full PostgreSQL URL from Railway Variables.

## 7. If Frontend Is On Netlify
This app calls backend APIs like `/api/...`, so a static Netlify deploy needs backend wiring:

1. In Netlify environment variables, set:
   - `VITE_API_BASE_URL` = your Railway backend URL (for example `https://your-app.up.railway.app`)
2. In Railway environment variables, set:
   - `CORS_ORIGINS` = your Netlify site URL (for example `https://your-site.netlify.app`)
3. Redeploy both Railway and Netlify.
