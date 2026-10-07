# MARS Game Finder — Iteration 2

[![CI](https://github.com/bsnt90210/ICS-499-Capstone/actions/workflows/hello.yml/badge.svg?branch=main)](https://github.com/bsnt90210/ICS-499-Capstone/actions/workflows/hello.yml)

[Open the live app](https://mars-game-finder.onrender.com/)

Enter available minutes to see games that fit that time. The React page calls an Express API backed by SQLite. `tester.csv` contains eight sample games for the Iteration 2 demo. Recommendations include games whose `estimatedMinutes` is less than or equal to the number entered. Genre filtering, Steam import, and AI explanations are later work.

## Run locally

Use Node 24.19.0 (see `.node-version`). In separate terminals, from the repository root:

```sh
cd server
npm ci
npm run dev
```

```sh
cd frontend
npm ci
npm run dev
```

Open the URL printed by Vite. Vite proxies `/api` to Express on port 3001.

## Check the app

```sh
cd frontend && npm run lint && npm run build
cd ../server && npm test
```

`GET /api/games` returns all eight games. `GET /api/recommendations?availableMinutes=30` returns Rocket League (15), Robots (25), and Hades (30). `GET /api/health` is for deployment checks. The server reloads `tester.csv` into SQLite on startup, so removed CSV rows do not linger in the app.

## Render

`render.yaml` defines the live Node web service at [mars-game-finder.onrender.com](https://mars-game-finder.onrender.com/). It builds the frontend and runs the Express backend at the same URL. The service uses a local SQLite file rebuilt from `tester.csv` at startup; database-only edits do not persist across deploys. GitHub Actions runs build, lint, and backend tests on pushes and pull requests; Render deployment is configured separately.
