
import express from "express";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const projectDirectory = resolve(serverDirectory, "..");
const csvPath = resolve(process.env.GAMES_CSV_PATH ?? join(projectDirectory, "tester.csv"));
const databasePath = resolve(process.env.DATABASE_PATH ?? join(serverDirectory, "data", "games.sqlite"));
const port = Number(process.env.PORT ?? 3001);

const records = parse(readFileSync(csvPath, "utf8"), {
  bom: true,
  columns: true,
  skip_empty_lines: true,
  trim: true,
});
const columns = ["id", "title", "genre", "estimatedMinutes"];
if (!records.length || Object.keys(records[0]).join(",") !== columns.join(",")) {
  throw new Error(`Expected a nonempty CSV with headers: ${columns.join(",")}`);
}

const ids = new Set();
const games = records.map((row, index) => {
  const game = {
    id: Number(row.id),
    title: row.title?.trim(),
    genre: row.genre?.trim(),
    estimatedMinutes: Number(row.estimatedMinutes),
  };
  if (!Number.isSafeInteger(game.id) || game.id < 1 || ids.has(game.id) ||
      !game.title || !game.genre || !Number.isSafeInteger(game.estimatedMinutes) ||
      game.estimatedMinutes < 1) {
    throw new Error(`Invalid game on CSV line ${index + 2}`);
  }
  ids.add(game.id);
  return game;
});

mkdirSync(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec(`CREATE TABLE IF NOT EXISTS games (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0)
)`);

// The CSV is the current sample library. Replace old rows on every start.
db.exec("BEGIN");
try {
  db.exec("DELETE FROM games");
  const insert = db.prepare("INSERT INTO games VALUES (?, ?, ?, ?)");
  for (const game of games) {
    insert.run(game.id, game.title, game.genre, game.estimatedMinutes);
  }
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

const columnsSql = "id, title, genre, estimated_minutes AS estimatedMinutes";
const listGames = db.prepare(`SELECT ${columnsSql} FROM games ORDER BY id`);
const recommendGames = db.prepare(
  `SELECT ${columnsSql} FROM games WHERE estimated_minutes <= ? ORDER BY estimated_minutes, id`
);

const app = express();
app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.get("/api/games", (_req, res) => res.json(listGames.all()));
app.get("/api/recommendations", (req, res) => {
  const minutes = Number(req.query.availableMinutes);
  if (!Number.isSafeInteger(minutes) || minutes < 1) {
    return res.status(400).json({ error: "availableMinutes must be a positive whole number" });
  }
  return res.json(recommendGames.all(minutes));
});

const distDirectory = join(projectDirectory, "frontend", "dist");
app.use(express.static(distDirectory));
app.use((req, res, next) => {
  if (req.method === "GET" && !req.path.startsWith("/api/")) {
    return res.sendFile(join(distDirectory, "index.html"));
  }
  return next();
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Loaded ${games.length} games from ${csvPath}`);
  console.log(`Listening on port ${port}`);
});

// Allow the server to exit cleanly when tests send SIGTERM.
process.on("SIGTERM", () => process.exit(0));
