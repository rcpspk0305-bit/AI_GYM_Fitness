# AI Gym & Fitness Assistant

> A full-stack AI-powered fitness ecosystem — React frontend + FastAPI backend.
> Sem 2 CSE Final Project — Unlox Academy — April 2026

---

## What This Project Does

The AI Gym & Fitness Assistant is an all-in-one platform that combines computer vision, machine learning, NLP, and retrieval-augmented generation (RAG) into a single unified fitness app. It acts as a smart personal trainer, dietician, motivational companion, and data-driven fitness manager. 

---

## Features & Modules

| # | Module | Description | Tech Stack |
|---|--------|-------------|------------|
| 1 | **Frontend Authentication** | Secure admin login page protecting the dashboard and components, complete with localized session management. | React + LocalStorage |
| 2 | **AI Gym Trainer** | Real-time pose detection for squats, curls, and posture analysis. | MediaPipe |
| 3 | **AI Dietician** | Personalised diet plans using RAG (ChromaDB) + Gemini LLM. | RAG + ChromaDB + Gemini |
| 4 | **Smart Gym Assistant** | Intelligent equipment recommendations based on user history. | FastAPI |
| 5 | **Habit Tracker** | Daily gym attendance logging with ML skip prediction. | scikit-learn (RandomForest) |
| 6 | **Virtual Gym Buddy** | Motivational AI chat companion with sentiment analysis. | VADER + TextBlob + RAG |
| 7 | **Performance Analyzer** | Biomechanical motion efficiency scoring (TUT & variance). | NumPy + FastAPI |
| 8 | **Gym Recommender** | Weekly workout plan generator using ML (cosine similarity). | Pandas + Cosine Similarity |
| 9 | **IoT Integration** | Seamless data syncing between IoT hardware and the backend via MQTT. | Paho-MQTT |
| — | **Interactive Dashboard** | Live aggregated stats from all modules with auto-refresh. | React + Axios |

---

## Tech Stack Overview

### Frontend
- **Framework:** React 18 + Vite
- **Routing:** React Router v6
- **HTTP:** Axios
- **Pose Detection:** MediaPipe Pose (via CDN)
- **Styling:** Custom Vanilla CSS with Glassmorphism elements

### Backend
- **API Framework:** FastAPI (Python 3.12)
- **Server:** Uvicorn with hot reload (Gunicorn for production scaling) + GZipMiddleware for max speed payloads
- **Database:** SQLite with SQLAlchemy ORM (`data/gym_assistant.db`)
- **Vector DB:** ChromaDB (RAG for diet + buddy modules)
- **LLM:** Google Gemini 2.0 Flash (`google-genai`)
- **Machine Learning:** scikit-learn — RandomForestClassifier + cosine similarity
- **NLP:** VADER Sentiment + TextBlob
- **IoT & Telemetry:** Paho MQTT
- **Cloud Storage:** Cloudinary (progress photos)

---

## Project Structure

```
ai_gym_assistant/
│
├── frontend/
│   ├── index.html                  ← MediaPipe CDN scripts in <head>
│   ├── src/
│   │   ├── App.jsx                 ← Router + Auth Shell
│   │   └── pages/
│   │       ├── Login.jsx           ← Module 1 — Authentication
│   │       ├── Dashboard.jsx       ← Interactive live dashboard
│   │       ├── Trainer.jsx         ← Module 2 — Pose detection
│   │       ├── Dietician.jsx       ← Module 3 — Diet planner
│   │       ├── Habit.jsx           ← Module 5 — Habit tracker
│   │       ├── Buddy.jsx           ← Module 6 — AI chat
│   │       └── Recommender.jsx     ← Module 8 — Workout planner
│   └── package.json
│
├── ai_gym_backend/
│   ├── main.py                     ← FastAPI entry + CORS setup + IoT
│   ├── database.py                 ← SQLAlchemy models (7 tables)
│   ├── .env                        ← API keys
│   ├── requirements.txt            ← Dependencies
│   ├── data/
│   │   └── gym_assistant.db        ← SQLite database
│   ├── chroma_db/                  ← ChromaDB vector store
│   └── modules/
│       ├── trainer.py              
│       ├── dietician.py            
│       ├── equipment.py            
│       ├── habit.py                
│       ├── buddy.py                
│       ├── performance.py          
│       ├── recommender.py
│       └── iot.py                  ← IoT MQTT Service
│
├── render.yaml                     ← Render Full-Stack Blueprint Deployment
└── RENDER_DEPLOY_GUIDE.md          ← Deployment Instructions
```

---

## Deployment (Render)

This project is fully configured for a 1-click full-stack deployment using [Render Blueprints](https://render.com/).

The `render.yaml` file automatically provisions:
1. **Python FastAPI Web Service** (Backend)
2. **React Vite Static Site** (Frontend)

Refer to the included `RENDER_DEPLOY_GUIDE.md` for a complete step-by-step walkthrough to get the app live. The frontend is automatically configured to point its API requests to the Render-deployed backend.

---

## Local Development Setup

### 1. Backend

```powershell
cd ai_gym_backend
python -m venv venv
venv\Scripts\activate

pip install -r requirements.txt
python -m textblob.download_corpora

# Start backend
uvicorn main:app --reload
```
Runs on: `http://localhost:8000` (API Docs: `/docs`)

### 2. Frontend

```powershell
cd frontend
npm install
npm run dev
```
Runs on: `http://localhost:5173`

---

## API Keys Setup

Create `ai_gym_backend/.env` with:

```env
GEMINI_API_KEY=your_gemini_key_here
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

- **Gemini (free):** Get an API key from [aistudio.google.com](https://aistudio.google.com).
- **Cloudinary (free):** Sign up at [cloudinary.com](https://cloudinary.com) and access your Dashboard credentials.

---

## Known Limitations

- **MediaPipe:** Requires good lighting and full-body/arm visibility to detect poses correctly.
- **Habit ML Model:** Requires at least 5+ logged entries to activate Machine Learning predictions. It operates purely on rule-based heuristics until enough data is collected.
- **Gemini Free Tier:** Limited to 15 requests/minute.
- **SQLite:** Perfect for demo and low-scale uses; not recommended for high-concurrency production deployments (Consider PostgreSQL).
