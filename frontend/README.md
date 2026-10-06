# MARS frontend

Simple React application created with Vite.

## Run locally

From the repository root:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL printed by Vite.

## Verify before pushing

```bash
npm run lint
npm run build
```

The page currently displays a sample game library. All game data goes through
`src/services/gameService.js`. The backend team can replace `getGames()` and
`getRecommendations(availableMinutes)` there with API calls. Both functions
return arrays of games with `id`, `title`, `genre`, and `estimatedMinutes`.
