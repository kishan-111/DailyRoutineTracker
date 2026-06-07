# DailyRoutineTracker

A React app that shows your daily routine and highlights the current task.

Routine data lives in `public/data/routines.json` and is loaded via `fetch` in `src/api/routines.js`. To switch to a backend later, change the URL in that file.

## Run locally

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (usually `http://localhost:5173`).

## Build for production

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

Live site: [https://kishan-111.github.io/DailyRoutineTracker/](https://kishan-111.github.io/DailyRoutineTracker/)

1. Push your changes to GitHub.
2. Deploy:

```bash
npm run deploy
```

3. In the repo on GitHub: **Settings → Pages → Build and deployment → Branch:** select `gh-pages` and `/ (root)`, then save.

The first deploy may take a minute before the site is available.

## Upcoming features

### 1. Login
User authentication so routines, progress, and history are tied to your account and synced across devices.

### 2. Make your own routine
A guided flow to build a personalized schedule:
- **Current habits** — what you already do day to day
- **Habits to include** — new activities you want to add
- **Habits to remove** — what you want to cut back on or drop

An LLM will use your inputs to generate a tailored daily routine.

### 3. Mark task done & save last day's routine
Check off tasks as you complete them and persist your end-of-day routine so you have a record of what you actually did.

### 4. Last day routine analysis
Review and analyze your previous day's routine — what you completed, what slipped, and patterns worth noticing.

### 5. Dashboard — last 21 days
A dashboard with trends and insights across the last 21 days: consistency, completion rates, and habit progress over time.

