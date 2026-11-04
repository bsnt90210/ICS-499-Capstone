/**
 * Express server that reads tester.csv at run time (csv-parse) and fills
 * five SQLite tables: games, genres, game_genres, categories, game_categories.
 *
 * CSV -> table mapping
 *   id               -> games.id
 *   title            -> games.title
 *   estimatedMinutes -> games.estimated_minutes   (rounded to a whole number)
 *   playedTime       -> games.playtime_minutes
 *   lastPlayedDate   -> games.last_played
 *   genre            -> genres.name        (+ game_genres link)
 *   categories       -> categories.name    (+ game_categories links; the CSV cell
 *                                           is a JSON array of {id, description})
 *
 * Usage:
 *   npm install
 *   npm start
 *
 * Environment variables (optional): PORT (3000), CSV_PATH (./tester.csv), DB_PATH (./games.db)
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const Database = require('better-sqlite3');
const { parse } = require('csv-parse/sync');

const PORT = Number(process.env.PORT) || 3001;
const CSV_PATH = path.resolve(process.env.CSV_PATH || path.join(__dirname, 'tester.csv'));
const DB_PATH = path.resolve(process.env.DB_PATH || path.join(__dirname, 'games.db'));

// ---------------------------------------------------------------------------
// Database + schema (tables are rebuilt from the CSV every time the server starts)
// ---------------------------------------------------------------------------
const db = new Database(DB_PATH);
db.pragma('foreign_keys = ON');

const SCHEMA = `
DROP TABLE IF EXISTS game_categories;
DROP TABLE IF EXISTS game_genres;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS genres;
DROP TABLE IF EXISTS games;

CREATE TABLE games (
  id                INTEGER PRIMARY KEY,
  title             TEXT    NOT NULL,
  estimated_minutes INTEGER NOT NULL CHECK (estimated_minutes > 0),
  playtime_minutes  INTEGER NOT NULL DEFAULT 0 CHECK (playtime_minutes >= 0),
  last_played       DATE
);

CREATE TABLE genres (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE game_genres (
  game_id  INTEGER NOT NULL REFERENCES games(id),
  genre_id INTEGER NOT NULL REFERENCES genres(id),
  PRIMARY KEY (game_id, genre_id)
);

CREATE TABLE categories (
  id   INTEGER PRIMARY KEY,
  name TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE game_categories (
  game_id     INTEGER NOT NULL REFERENCES games(id),
  category_id INTEGER NOT NULL REFERENCES categories(id),
  PRIMARY KEY (game_id, category_id)
);
`;

// ---------------------------------------------------------------------------
// CSV import
// ---------------------------------------------------------------------------
const REQUIRED_COLUMNS = [
  'id',
  'title',
  'genre',
  'estimatedMinutes',
  'playedTime',
  'lastPlayedDate',
  'categories',
];

function parseJsonArray(value) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function importCsv() {
  if (!fs.existsSync(CSV_PATH)) throw new Error(`CSV file not found: ${CSV_PATH}`);

  const rows = parse(fs.readFileSync(CSV_PATH), {
    columns: true,
    bom: true,
    skip_empty_lines: true,
  });
  if (rows.length === 0) throw new Error('CSV file has no data rows.');

  const missing = REQUIRED_COLUMNS.filter((c) => !(c in rows[0]));
  if (missing.length) throw new Error(`CSV is missing columns: ${missing.join(', ')}`);

  const run = db.transaction(() => {
    // Tables must exist before the statements below can be prepared.
    db.exec(SCHEMA);

    const insertGame = db.prepare(
      `INSERT INTO games (id, title, estimated_minutes, playtime_minutes, last_played)
       VALUES (?, ?, ?, ?, ?)`
    );
    const insertGenre = db.prepare('INSERT OR IGNORE INTO genres (name) VALUES (?)');
    const findGenre = db.prepare('SELECT id FROM genres WHERE name = ?');
    const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
    const findCategory = db.prepare('SELECT id FROM categories WHERE name = ?');
    const linkGenre = db.prepare('INSERT OR IGNORE INTO game_genres (game_id, genre_id) VALUES (?, ?)');
    const linkCategory = db.prepare(
      'INSERT OR IGNORE INTO game_categories (game_id, category_id) VALUES (?, ?)'
    );

    for (const row of rows) {
      const id = parseInt(row.id, 10);

      // estimated_minutes is an INTEGER column, so 22.5 / 67.5 / 82.5 are rounded.
      insertGame.run(
        id,
        row.title,
        Math.round(Number(row.estimatedMinutes)),
        parseInt(row.playedTime, 10) || 0,
        row.lastPlayedDate || null
      );

      // genres.name <- CSV "genre"; game_genres links games.id with genres.id
      const genreName = (row.genre || '').trim();
      if (genreName) {
        insertGenre.run(genreName);
        linkGenre.run(id, findGenre.get(genreName).id);
      }

      // categories.name <- each "description" in the CSV "categories" JSON array
      for (const c of parseJsonArray(row.categories)) {
        const categoryName = (c.description || '').trim();
        if (!categoryName) continue;
        insertCategory.run(categoryName);
        linkCategory.run(id, findCategory.get(categoryName).id);
      }
    }
  });
  run();

  const count = (table) => db.prepare(`SELECT COUNT(*) AS n FROM ${table}`).get().n;
  const summary = {
    games: count('games'),
    genres: count('genres'),
    game_genres: count('game_genres'),
    categories: count('categories'),
    game_categories: count('game_categories'),
  };
  console.log('Import complete:', summary);
  return summary;
}

importCsv();

// ---------------------------------------------------------------------------
// Express API
// ---------------------------------------------------------------------------
const app = express();
app.use(express.json());

// Each game with its genre and category names attached.
const GAME_SELECT = `
  SELECT g.*,
    (SELECT json_group_array(ge.name) FROM game_genres gg
       JOIN genres ge ON ge.id = gg.genre_id WHERE gg.game_id = g.id) AS genres,
    (SELECT json_group_array(c.name) FROM game_categories gc
       JOIN categories c ON c.id = gc.category_id WHERE gc.game_id = g.id) AS categories
  FROM games g`;

const shapeGame = (row) => ({
  ...row,
  genres: JSON.parse(row.genres),
  categories: JSON.parse(row.categories),
});

// GET /api/games?genre=RPG&category=Co-op&q=dark&limit=50&offset=0
app.get('/api/games', (req, res) => {
  const where = [];
  const params = [];

  if (req.query.genre) {
    where.push(`EXISTS (SELECT 1 FROM game_genres gg JOIN genres ge ON ge.id = gg.genre_id
                        WHERE gg.game_id = g.id AND ge.name = ?)`);
    params.push(req.query.genre);
  }
  if (req.query.category) {
    where.push(`EXISTS (SELECT 1 FROM game_categories gc JOIN categories c ON c.id = gc.category_id
                        WHERE gc.game_id = g.id AND c.name = ?)`);
    params.push(req.query.category);
  }
  if (req.query.q) {
    where.push('g.title LIKE ?');
    params.push(`%${req.query.q}%`);
  }

  const whereSql = where.length ? ` WHERE ${where.join(' AND ')}` : '';
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

  const total = db.prepare(`SELECT COUNT(*) AS n FROM games g${whereSql}`).get(...params).n;
  const rows = db
    .prepare(`${GAME_SELECT}${whereSql} ORDER BY g.id LIMIT ? OFFSET ?`)
    .all(...params, limit, offset);

  res.json({ total, limit, offset, data: rows.map(shapeGame) });
});

app.get('/api/games/:id', (req, res) => {
  const row = db.prepare(`${GAME_SELECT} WHERE g.id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Game not found' });
  res.json(shapeGame(row));
});

app.get('/api/genres', (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT ge.id, ge.name, COUNT(gg.game_id) AS game_count
         FROM genres ge LEFT JOIN game_genres gg ON gg.genre_id = ge.id
         GROUP BY ge.id ORDER BY ge.name`
      )
      .all()
  );
});

app.get('/api/categories', (_req, res) => {
  res.json(
    db
      .prepare(
        `SELECT c.id, c.name, COUNT(gc.game_id) AS game_count
         FROM categories c LEFT JOIN game_categories gc ON gc.category_id = c.id
         GROUP BY c.id ORDER BY c.name`
      )
      .all()
  );
});

// Games that fit in the time available, optionally limited to one genre.
// The statement is prepared once, after the import has created the tables.
const recommendGames = db.prepare(`
  SELECT g.id, g.title, g.estimated_minutes AS estimatedMinutes,
         g.playtime_minutes AS playtimeMinutes, g.last_played AS lastPlayed
  FROM games g
  WHERE g.estimated_minutes <= ?
    AND (? IS NULL OR EXISTS (
          SELECT 1 FROM game_genres gg JOIN genres ge ON ge.id = gg.genre_id
          WHERE gg.game_id = g.id AND ge.name = ?))
  ORDER BY g.estimated_minutes, g.id
`);

// GET /api/recommendations?availableMinutes=30&genre=RPG
app.get('/api/recommendations', (req, res) => {
  const availableMinutes = Number(req.query.availableMinutes);
  if (!Number.isInteger(availableMinutes) || availableMinutes <= 0) {
    return res
      .status(400)
      .json({ error: 'availableMinutes is required and must be a positive whole number' });
  }

  // A missing or blank genre becomes NULL, which turns the genre filter off.
  const genre = (req.query.genre || '').trim() || null;

  res.json(recommendGames.all(availableMinutes, genre, genre));
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
