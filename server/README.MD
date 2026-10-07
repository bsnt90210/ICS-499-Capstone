# Backend

From `server/`, run `npm ci` then `npm run dev`. Use Node 24.19.0. The server reads the repository-root `tester.csv` and creates its local SQLite database under `server/data/` when it starts. `server/data/` is ignored by Git.

The API routes are `/api/health`, `/api/games`, and `/api/recommendations?availableMinutes=30`. Run `npm test` for API and CSV import checks.
