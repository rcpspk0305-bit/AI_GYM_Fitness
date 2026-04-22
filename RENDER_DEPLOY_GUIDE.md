# Deploying AI Gym & Fitness Full Stack to Render

This guide walks you through deploying both your **Frontend** and **Backend** simultaneously to Render. I have updated the `render.yaml` (Blueprint) at the root of your project to automate this complete setup!

> [!TIP]
> I have updated all frontend React files so they now dynamically point to the new backend URL (`import.meta.env.VITE_API_BASE_URL`) rather than hardcoded `localhost:8000`. Everything is wired up and ready for production!

## Deploying via Blueprint (Automated & Recommended)

1. Commit and push your latest code to your GitHub repository (including `render.yaml` and frontend `src/pages` changes).
2. Go to your [Render Dashboard](https://dashboard.render.com/).
3. Click on **New +** -> **Blueprint**.
4. Connect the GitHub repository that contains this project.
5. Render will automatically detect the `render.yaml` file and create **two services**:
    * `ai-gym-backend` (Web Service - Python)
    * `ai-gym-frontend` (Static Site - React/Vite)
6. Render will begin building both.
7. Go to the **Environment** tab of your deployed `ai-gym-backend` Web Service on Render and add the exact values for your secrets:
    * `GEMINI_API_KEY`
    * `CLOUDINARY_URL` (if you are using Cloudinary for storage)

The `render.yaml` already tells the frontend (`ai-gym-frontend`) exactly what the backend's URL is, so no further configuration is required on your part!

## Deploying Manually via Render Dashboard

If you prefer to configure them manually without the Blueprint:

### 1. Deploy the Backend
1. Click **New +** -> **Web Service**.
2. Connect your repo.
3. Configure the service:
    * **Name**: `ai-gym-backend`
    * **Language**: `Python`
    * **Root Directory**: `ai_gym_backend`
    * **Build Command**: `pip install -r requirements.txt`
    * **Start Command**: `uvicorn main:app --host 0.0.0.0 --port 10000`
4. Expand **Advanced** and add Environment Variables:
    * `PYTHON_VERSION` to `3.10.0`
    * `GEMINI_API_KEY` 
5. Click **Create Web Service**. Wait for it to deploy and copy its URL (e.g., `https://ai-gym-backend.onrender.com`).

### 2. Deploy the Frontend
1. Click **New +** -> **Static Site**.
2. Connect your repo.
3. Configure the site:
    * **Name**: `ai-gym-frontend`
    * **Root Directory**: `ai_gym_frontend`
    * **Build Command**: `npm install && npm run build`
    * **Publish directory**: `dist`
4. Expand **Advanced** and add Environment Variables:
    * `VITE_API_BASE_URL` and set its value to your newly created Backend URL (e.g., `https://ai-gym-backend.onrender.com`).
    * Add a Rewrite rule: Source `/*`, Destination `/index.html`
5. Click **Create Static Site**.

Once both services are **Live**, your entire AI Gym Fitness platform is fully operational on the cloud!
