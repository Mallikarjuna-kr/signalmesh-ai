# 🚀 SignalMesh AI — Production Deployment Guide
**Team: APEX-AI-X**  
**Architecture:** Frontend on **Vercel** + Backend on **Render**

---

## 📋 Overview of What We Configured

1. **Frontend (`JATAYU-frontend 2/frontend`)**:
   - Configured with SPA rewrite rules in `vercel.json` so React Router paths work without 404s.
   - Dynamic API base URL: points to `process.env.REACT_APP_API_URL` (falls back to local `http://localhost:5000/api`).
   - Production bundle verified with `craco build` (`build/static/js/main.*.js`).

2. **Backend (`backend/`)**:
   - Configured dynamic `process.env.PORT` for cloud container hosting.
   - CORS middleware enabled for all `*.vercel.app` domains, localhost, and custom `CORS_ORIGIN`.
   - `render.yaml` blueprint included for automatic Render configuration.

3. **Git Repository**:
   - Initialized on branch `main` with `.gitignore` excluding `node_modules`, `build`, and sensitive `.env` files.

---

## ⚡ Step 1: Push Code to GitHub

Open PowerShell or Command Prompt in the project folder and run:

```bash
# 1. Create a new repository on GitHub (e.g. named "signalmesh-ai")
# 2. Add your GitHub remote and push:
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/signalmesh-ai.git
git push -u origin main
```

---

## 🖥️ Step 2: Deploy the Backend on Render (Render.com)

1. Sign in to [Render](https://render.com).
2. Click **New +** > **Web Service**.
3. Select **Build and deploy from a Git repository** and connect your GitHub repo `signalmesh-ai`.
4. Configure the Web Service settings:
   - **Name**: `signalmesh-backend`
   - **Region**: Choose closest to you (e.g., Singapore, Frankfurt, or Oregon)
   - **Branch**: `main`
   - **Root Directory**: `backend` *(CRITICAL)*
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`
5. Scroll down to **Environment Variables** and add:
   | Key | Value | Notes |
   |---|---|---|
   | `PORT` | `5000` | Cloud port |
   | `CORS_ORIGIN` | `*` | Or your Vercel URL |
   | `SESSION_SECRET` | `signalmesh_apex_secret_2026` | Random secure string |
   *(Optional Snowflake credentials if connecting live Snowflake warehouse)*:
   - `SNOWFLAKE_ACCOUNT`
   - `SNOWFLAKE_USERNAME`
   - `SNOWFLAKE_PASSWORD`
   - `SNOWFLAKE_DATABASE` (`SIGNALMESH_DB`)
   - `SNOWFLAKE_SCHEMA` (`MONITORING`)
   *(Optional Twilio credentials if using real SMS dispatch)*:
   - `TWILIO_ACCOUNT_SID`
   - `TWILIO_AUTH_TOKEN`
   - `TWILIO_PHONE_NUMBER`
6. Click **Deploy Web Service**.
7. Once deployed (shows **Live** in green), copy your Render backend URL:  
   👉 `https://signalmesh-backend.onrender.com`

---

## 🌐 Step 3: Deploy the Frontend on Vercel (Vercel.com)

1. Sign in to [Vercel](https://vercel.com).
2. Click **Add New...** > **Project**.
3. Import your GitHub repo `signalmesh-ai`.
4. In the **Configure Project** screen:
   - **Project Name**: `signalmesh-ai`
   - **Framework Preset**: `Create React App`
   - **Root Directory**: Click **Edit** and choose `JATAYU-frontend 2/frontend` *(CRITICAL)*
   - **Build Command**: `npm run build`
   - **Output Directory**: `build`
   - **Install Command**: `npm install`
5. Expand **Environment Variables** and add:
   | Key | Value |
   |---|---|
   | `REACT_APP_API_URL` | `https://signalmesh-backend.onrender.com/api` |
   *(Make sure to append `/api` to your Render backend URL)*
6. Click **Deploy**.
7. Vercel will build and assign you a live production URL:  
   👉 `https://signalmesh-ai.vercel.app`

---

## ✅ Step 4: Verify Deployment

1. **Verify Backend Health**:
   Visit: `https://<YOUR-RENDER-BACKEND>.onrender.com/api/health`  
   Expected Response:
   ```json
   { "status": "healthy", "service": "SignalMesh AI Backend", "timestamp": "..." }
   ```

2. **Verify Frontend Live Site**:
   Visit: `https://<YOUR-VERCEL-FRONTEND>.vercel.app/`  
   Expected: SignalMesh AI interactive dashboard loads with live map, gauges, and risk matrix.

3. **Verify Zero-Login Mobile Emergency Alert Modal**:
   Visit on any mobile or desktop device:  
   `https://<YOUR-VERCEL-FRONTEND>.vercel.app/alert.html`  
   Expected: Instant red emergency strobe modal with audio alert, location coordinates, and acknowledgement buttons.
