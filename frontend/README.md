# Frontend

From `frontend/`, run `npm ci` and `npm run dev`. Start the backend in another terminal with `cd server && npm ci && npm run dev`. Vite proxies `/api` to the backend at port 3001.

The React components call `src/services/gameService.js`, which fetches the game library and time-based recommendations from the Express API. Each game has `id`, `title`, `genre`, and `estimatedMinutes`. Run `npm run lint` and `npm run build` before pushing.
