# Vybe Full-Stack Application

This repository contains a full-stack web application with:
- **Backend**: FastAPI (Python 3.12+) with Uvicorn, Pydantic v2, and CORS support.
- **Frontend**: React 18 + Vite + TypeScript with proxy configuration.

---

## Project Structure

```
vybe/
├── backend/
│   ├── app/
│   │   ├── core/
│   │   │   └── config.py       # Configuration & environment settings
│   │   ├── routers/
│   │   │   └── items.py        # Sample RESTful CRUD endpoints
│   │   └── main.py             # FastAPI entrypoint & CORS setup
│   ├── .venv/                  # Python virtual environment
│   ├── requirements.txt        # Backend dependencies
│   ├── .env.example            # Backend env sample
│   └── README.md
├── frontend/
│   ├── src/
│   │   ├── api.ts              # API client functions
│   │   ├── types.ts            # TypeScript interfaces
│   │   ├── App.tsx             # Main dashboard UI
│   │   ├── index.css           # Styling
│   │   └── main.tsx            # React root mount
│   ├── index.html              # HTML shell
│   ├── vite.config.ts          # Vite configuration with /api proxy
│   ├── tsconfig.json           # TypeScript configuration
│   └── package.json            # Frontend dependencies
└── README.md
```

---

## Quick Start Guide

### 1. Run the FastAPI Backend

Open a terminal and navigate to `backend/`:

```powershell
cd d:\vybe\backend

# Activate the virtual environment
.\.venv\Scripts\Activate.ps1

# Start the FastAPI development server with hot-reload
uvicorn app.main:app --reload --port 8000
```

- API Root: [http://127.0.0.1:8000](http://127.0.0.1:8000)
- Interactive Swagger UI: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- Interactive ReDoc: [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)
- Health Check: [http://127.0.0.1:8000/api/health](http://127.0.0.1:8000/api/health)

---

### 2. Run the React + Vite Frontend

Open a second terminal and navigate to `frontend/`:

```powershell
cd d:\vybe\frontend

# Start Vite dev server
npm run dev
```

- Web App: [http://localhost:5173](http://localhost:5173)

The Vite dev server automatically proxies any requests to `/api` directly to `http://127.0.0.1:8000`.
CORS is also pre-configured on FastAPI for development convenience.


---

## Live Deployment

- **Frontend (Vercel)**: Deployed from `frontend/` directory with automatic SPA rewrites
- **Backend (Render)**: [https://vybe-k8e2.onrender.com](https://vybe-k8e2.onrender.com)
  - API Health Check: [https://vybe-k8e2.onrender.com/health](https://vybe-k8e2.onrender.com/health)
  - Swagger Documentation: [https://vybe-k8e2.onrender.com/docs](https://vybe-k8e2.onrender.com/docs)
  - Interactive ReDoc: [https://vybe-k8e2.onrender.com/redoc](https://vybe-k8e2.onrender.com/redoc)

All `/api/*` frontend calls on Vercel are automatically proxied to the live Render backend via `vercel.json`.

