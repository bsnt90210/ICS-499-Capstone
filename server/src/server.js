import express from "express";
import { DatabaseSync } from "node:sqlite";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "csv-parse/sync";

const app = express();
const port = Number(process.env.PORT ?? 3001);

// Resolve project paths from this file so they work regardless of terminal folder.
const sourceDirectory = dirname(fileURLToPath(import.meta.url));
const serverDirectory = resolve(sourceDirectory, "..");
const projectDirectory = resolve(serverDirectory, "..");
const dataDirectory = join(serverDirectory, "data");
const databasePath = join(dataDirectory, "tasks.sqlite");
const csvPath = join(projectDirectory, "tester.csv");

mkdirSync(dataDirectory, { recursive: true });
if (!existsSync(csvPath)) {
  throw new Error(`Could not find tester.csv at ${csvPath}. Put it in the project root.`);
}

// Open (or create) the same SQLite file used by the tutorial project.
const db = new DatabaseSync(databasePath);
db.exec("PRAGMA journal_mode = WAL;");
db.exec(`
  CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    genre TEXT NOT NULL,
    estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0)
  )
`);

// Parse CSV rows as objects using the header row as column names.
const csvText = readFileSync(csvPath, "utf8");
const records = parse(csvText, {
  bom: true,
  columns: true,
  skip_empty_lines: true,
  trim: true,
});

const expectedColumns = ["id", "title", "genre", "estimatedMinutes"];
if (records.length === 0) {
  throw new Error("tester.csv has a header but no game records.");
}
const actualColumns = Object.keys(records[0]);
const missingColumns = expectedColumns.filter((name) => !actualColumns.includes(name));
const extraColumns = actualColumns.filter((name) => !expectedColumns.includes(name));
if (missingColumns.length > 0 || extraColumns.length > 0) {
  throw new Error(
    `CSV headers must be ${expectedColumns.join(", ")}. ` +
      `Missing: ${missingColumns.join(", ") || "none"}; ` +
      `extra: ${extraColumns.join(", ") || "none"}.`
  );
}

// Validate and convert CSV values before writing any rows.
const seenIds = new Set();
const games = records.map((record, index) => {
  const lineNumber = index + 2; // Line 1 is the CSV header.
  const game = {
    id: Number(record.id),
    title: record.title?.trim(),
    genre: record.genre?.trim(),
    estimatedMinutes: Number(record.estimatedMinutes),
  };

  if (!Number.isSafeInteger(game.id) || game.id < 1) {
    throw new Error(`Invalid id on CSV line ${lineNumber}.`);
  }
  if (seenIds.has(game.id)) {
    throw new Error(`Duplicate id ${game.id} on CSV line ${lineNumber}.`);
  }
  if (!game.title || !game.genre) {
    throw new Error(`Title and genre are required on CSV line ${lineNumber}.`);
  }
  if (!Number.isSafeInteger(game.estimatedMinutes) || game.estimatedMinutes < 1) {
    throw new Error(`estimatedMinutes must be a positive integer on CSV line ${lineNumber}.`);
  }

  seenIds.add(game.id);
  return game;
});

// Prepared values protect the SQL query from treating CSV text as SQL code.
const saveGame = db.prepare(`
  INSERT INTO games (id, title, genre, estimated_minutes)
  VALUES (?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title = excluded.title,
    genre = excluded.genre,
    estimated_minutes = excluded.estimated_minutes
`);

// Import all rows as one transaction: either all succeed or none are saved.
db.exec("BEGIN");
try {
  for (const game of games) {
    saveGame.run(game.id, game.title, game.genre, game.estimatedMinutes);
  }
  db.exec("COMMIT");
} catch (error) {
  db.exec("ROLLBACK");
  throw error;
}

const listGames = db.prepare(`
  SELECT id, title, genre,
         estimated_minutes AS estimatedMinutes
  FROM games
  ORDER BY id
`);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/games", (_req, res) => {
  res.json(listGames.all());
});

app.listen(port, () => {
  console.log(`Imported ${games.length} CSV game(s) into ${databasePath}`);
  console.log(`Games API listening at http://localhost:${port}/api/games` );
});