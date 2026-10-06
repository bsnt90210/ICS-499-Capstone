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

The page displays a sample game library and recommends games that fit the time
entered by the user. All game data goes through
`src/services/gameService.js`. The backend team can replace `getGames()` and
`getRecommendations(availableMinutes)` there with API calls. Both functions
return complete arrays of games with `id`, `title`, `genre`, and
`estimatedMinutes`. The React components do not need to change for the API.
