# DailyRoutineTracker

A React app that shows your daily routine and highlights the current task. Email-based login is backed by a Go API and MongoDB.

Routine data lives in `public/data/routines.json` and is loaded via `fetch` in `src/api/routines.js`.

## Run locally

### 1. Start MongoDB

```bash
docker compose up -d
```

### 2. Start the Go backend

```bash
cd backend
cp .env.example .env
go run ./cmd/server
```

The API runs at `http://localhost:8080`.

### 3. Start the frontend

```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Vite proxies `/api` requests to the backend.

## Auth API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/auth/register` | Register with email, password, optional name |
| `POST` | `/api/auth/login` | Sign in with email and password |
| `GET` | `/api/auth/me` | Get current user (requires `Authorization: Bearer <token>`) |

## Routine log API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `PUT` | `/api/routine/today` | Sync today's schedule and load saved completion state |
| `PATCH` | `/api/routine/today/tasks` | Mark a task done or undone |
| `GET` | `/api/routine/last?before=YYYY-MM-DD` | Get the most recent saved routine before today |

Yesterday's routine is automatically saved when you open the app on a new day.

## Build for production

```bash
npm run build
npm run preview
```

For a deployed frontend, set `VITE_API_URL` to your backend URL before building:

```bash
VITE_API_URL=https://your-api.example.com npm run build
```

## Deploy to GitHub Pages

Live site: [https://kishan-111.github.io/DailyRoutineTracker/](https://kishan-111.github.io/DailyRoutineTracker/)

GitHub Pages hosts the frontend only. Deploy the Go backend separately (e.g. Railway, Render, Fly.io) and set `VITE_API_URL` when building the frontend.

1. Push your changes to GitHub.
2. Deploy:

```bash
npm run deploy
```

3. In the repo on GitHub: **Settings → Pages → Build and deployment → Branch:** select `gh-pages` and `/ (root)`, then save.

## Upcoming features

### ~~1. Login~~ ✅
Email/password authentication with JWT, Go backend, and MongoDB.

### 2. Make your own routine
A guided flow to build a personalized schedule:
- **Current habits** — what you already do day to day
- **Habits to include** — new activities you want to add
- **Habits to remove** — what you want to cut back on or drop

An LLM will use your inputs to generate a tailored daily routine.

### ~~3. Mark task done & save last day's routine~~ ✅
Check off tasks as you complete them. Yesterday's routine is auto-saved when you open the app on a new day.

### 4. Last day routine analysis
Review and analyze your previous day's routine — what you completed, what slipped, and patterns worth noticing.

### 5. Dashboard — last 21 days
A dashboard with trends and insights across the last 21 days: consistency, completion rates, and habit progress over time.

