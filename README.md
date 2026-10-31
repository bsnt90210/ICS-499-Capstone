# MARS Game Finder

[![CI](https://github.com/bsnt90210/ICS-499-Capstone/actions/workflows/hello.yml/badge.svg?branch=main)](https://github.com/bsnt90210/ICS-499-Capstone/actions/workflows/hello.yml)

[Open the live app](https://mars-game-finder.onrender.com/)

MARS Game Finder helps you pick a game when you have a limited amount of time to play. Enter the minutes you have, and it returns games with estimated sessions that fit. A game that takes exactly that long is included, and shorter sessions appear first.

The app uses React for the page, Express for the API, and SQLite to store the games loaded from `tester.csv`.

## Iteration 3 progress

The frontend now has a genre dropdown. Picking a genre filters the library, and Find Games sends that genre along with your available minutes. All genres removes the genre filter. Cards in both lists use the same component, with space for genres, play modes, estimated session length, total hours played, and the last-played date. A missing play date in the new data shows as “Never played.”

The minutes field accepts plain positive whole numbers. Blank input, decimals, negative numbers, and values such as `3e1` show a message without sending a search. Results show which time and genre you searched for and clear when either input changes. If genres cannot load, time searches still work across all genres.

These frontend changes are local work and have not been deployed yet. The backend in this checkout still uses the eight-game Iteration 2 CSV and does not have the genre endpoint or genre filtering. With that backend, the dropdown shows “Genres unavailable,” and the new play-history fields show “Unavailable.” Andrey’s backend update will add the 103-game dataset, genre support, and the extra card data. We still need to check the frontend against that update after it merges.

The dataset is sample data. For Iteration 3, genres and play modes will come from Steam store data, while session lengths, playtimes, and play dates are hand-entered examples. The app does not connect to a Steam account. Steam import, game images, Rediscover, and AI explanations are future work.

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

Open the local URL printed by Vite. It forwards `/api` requests to Express on port 3001. Run these commands from the folder containing `frontend/`, `server/`, and `tester.csv`.

## Check the app

```sh
cd frontend && npm run lint && npm run build
cd ../server && npm test
```

The frontend also has 21 Vitest tests covering input validation, genre requests, card fields, empty and error messages, and clearing old results. They passed locally with simulated API responses. Muniib’s tooling update will add the permanent test dependencies, scripts, coverage reports, and CI steps. Until that update merges, `npm ci` alone will not install the frontend test tools, and there is no frontend `npm test` script in the checked-in package file.

The backend tests use a temporary CSV and database. The server reloads `tester.csv` into SQLite on startup, so games removed from the CSV are removed from the database too.

## API

The current backend has these routes:

- `GET /api/health` checks whether the server is running.
- `GET /api/games` returns the sample library.
- `GET /api/recommendations?availableMinutes=30` returns games with estimated sessions of 30 minutes or less.

The Iteration 3 frontend also expects `GET /api/genres` and an optional `genre` parameter on both game routes. For example, `/api/recommendations?availableMinutes=60&genre=Strategy` should return Strategy games that fit within 60 minutes. Those backend changes are still pending in this checkout.

## Render

`render.yaml` builds the frontend and starts Express on one Render service, so the page and API use the same URL. The health check uses `/api/health`. The free service may take a minute to wake up.

SQLite is rebuilt from the bundled CSV when the server starts. Changes made only in the database are not saved across rebuilds.

The checked-in GitHub Actions workflow runs frontend lint and build, plus backend syntax checks and tests, on pushes and pull requests. Coverage checks and dependency scanning are still waiting on the tooling update.

On October 31, we set Render’s auto-deploy option to “After CI Checks Pass” and protected `main` on GitHub. Changes now go through a pull request, with the branch up to date and both “Frontend lint & build” and “Backend install & test” passing before merge. The rules also apply to admins.
