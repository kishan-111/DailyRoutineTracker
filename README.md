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
