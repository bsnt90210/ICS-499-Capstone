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
npm install
npm run lint
npm run build
```

The following browser checks passed with the sample data: blank, zero, and
negative input show validation; 1 minute shows no matches; and 15, 30, 45,
and 90 minutes return only games within the entered time. The empty-library
message was checked by temporarily using an empty sample array. The library
and recommendation error messages were checked by temporarily making each
service function throw. The normal sample data and service were restored
afterward.

The page displays a sample game library and recommends games that fit the time
entered by the user. All game data goes through
`src/services/gameService.js`. The backend team can replace `getGames()` and
`getRecommendations(availableMinutes)` there with API calls. Both functions
return complete arrays of games with `id`, `title`, `genre`, and
`estimatedMinutes`. The React components do not need to change for the API.
