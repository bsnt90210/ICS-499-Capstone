# MARS Game Finder — Iteration 2

Enter available minutes to see games that fit that time. The React page calls an Express API backed by SQLite. `tester.csv` is a five-game **sample dataset** for the Iteration 2 demo; replace it with the team's approved game data when ready.

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

`GET /api/games` returns all games. `GET /api/recommendations?availableMinutes=30` returns games at or below 30 minutes. `GET /api/health` is for deployment checks. The server reloads `tester.csv` into SQLite on startup, so removed CSV rows do not linger in the app.

## Render

`render.yaml` defines one Node web service that builds the frontend and runs the backend. Connect this GitHub repository as a Render Blueprint, select the branch with these changes, and check the resulting `/api/health` URL and the page. The service uses a local SQLite file rebuilt from `tester.csv` at startup; edits to the database itself are not persistent across deploys. A `render.yaml` file alone does not create a live Render deployment.
