import express from 'express';
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'csv-parse/sync';

const serverDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const projectDirectory = resolve(serverDirectory, '..');
const csvPath = resolve(process.env.GAMES_CSV_PATH ?? join(projectDirectory, 'tester.csv'));
const databasePath = resolve(process.env.DATABASE_PATH ?? join(serverDirectory, 'data', 'games.sqlite'));
const port = Number(process.env.PORT ?? 3001);
mkdirSync(dirname(databasePath), { recursive: true });
const db = new DatabaseSync(databasePath);
db.exec('PRAGMA foreign_keys = ON');

function loadGamesFromCsv() {
  const records = parse(readFileSync(csvPath, 'utf8'), {
    bom: true, columns: true, skip_empty_lines: true, trim: true,
  });
  const required = ['id', 'title', 'estimatedMinutes', 'playtimeMinutes', 'lastPlayed', 'genres', 'categories'];
  if (!records.length) throw new Error('CSV must contain at least one game');
  for (const column of required) {
    if (!(column in records[0])) throw new Error(`Missing required CSV column: ${column}`);
  }
  const ids = new Set();
  const games = records.map((row, index) => {
    try {
      const integer = (value, minimum) => {
        if (!/^\d+$/.test(value)) throw new Error('Expected whole-number data');
        const number = Number(value);
        if (!Number.isSafeInteger(number) || number < minimum) throw new Error('Invalid numeric value');
        return number;
      };
      const names = (value) => {
        const entries = JSON.parse(value);
        if (!Array.isArray(entries)) throw new Error('Metadata must be an array');
        return entries.map((entry) => {
          if (typeof entry?.description !== 'string' || !entry.description.trim()) {
            throw new Error('Metadata needs a description');
          }
          return entry.description.trim();
        });
      };
      const game = {
        id: integer(row.id, 1), title: row.title,
        estimatedMinutes: integer(row.estimatedMinutes, 1),
        playtimeMinutes: integer(row.playtimeMinutes || '0', 0),
        lastPlayed: row.lastPlayed || null,
        genres: names(row.genres), categories: names(row.categories),
      };
      if (!game.title || ids.has(game.id)) throw new Error('Blank title or duplicate id');
      if (game.lastPlayed && (!/^\d{4}-\d{2}-\d{2}$/.test(game.lastPlayed) ||
          !Number.isFinite(Date.parse(game.lastPlayed)) ||
          new Date(game.lastPlayed).toISOString().slice(0, 10) !== game.lastPlayed)) {
        throw new Error('Invalid play date');
      }
      if (!game.genres.length) game.genres = ['Uncategorized'];
      ids.add(game.id);
      return game;
    } catch (error) {
      throw new Error(`Invalid game on CSV line ${index + 2}: ${error.message}`);
    }
  });
  db.exec('BEGIN');
  try {
    db.exec(readFileSync(join(serverDirectory, 'sql', 'schema.sql'), 'utf8'));
    const insertGame = db.prepare('INSERT INTO games VALUES (?, ?, ?, ?, ?)');
    const insertGenre = db.prepare('INSERT OR IGNORE INTO genres (name) VALUES (?)');
    const findGenre = db.prepare('SELECT id FROM genres WHERE name = ?');
    const linkGenre = db.prepare('INSERT OR IGNORE INTO game_genres VALUES (?, ?)');
    const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (name) VALUES (?)');
    const findCategory = db.prepare('SELECT id FROM categories WHERE name = ?');
    const linkCategory = db.prepare('INSERT OR IGNORE INTO game_categories VALUES (?, ?)');
    for (const game of games) {
      insertGame.run(game.id, game.title, game.estimatedMinutes, game.playtimeMinutes, game.lastPlayed);
      for (const name of game.genres) {
        insertGenre.run(name);
        linkGenre.run(game.id, findGenre.get(name).id);
      }
      for (const name of game.categories) {
        insertCategory.run(name);
        linkCategory.run(game.id, findCategory.get(name).id);
      }
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
  console.log(`Loaded ${games.length} games from ${csvPath}`);
}

loadGamesFromCsv();

const fields = 'g.id, g.title, g.estimated_minutes AS estimatedMinutes, g.playtime_minutes AS playtimeMinutes, g.last_played AS lastPlayed';
const genreFilter = `(? IS NULL OR EXISTS (
  SELECT 1 FROM game_genres gg JOIN genres ge ON ge.id = gg.genre_id
  WHERE gg.game_id = g.id AND ge.name = ?))`;
const listGames = db.prepare(`SELECT ${fields} FROM games g WHERE ${genreFilter} ORDER BY g.id`);
const listGenres = db.prepare('SELECT name FROM genres ORDER BY name');
const recommendGames = db.prepare(`SELECT ${fields} FROM games g
  WHERE g.estimated_minutes <= ? AND ${genreFilter} ORDER BY g.estimated_minutes, g.id`);
const listGameGenres = db.prepare(`SELECT ge.name FROM game_genres gg JOIN genres ge ON ge.id = gg.genre_id
  WHERE gg.game_id = ? ORDER BY ge.name`);
const listGameCategories = db.prepare(`SELECT c.name FROM game_categories gc JOIN categories c ON c.id = gc.category_id
  WHERE gc.game_id = ? ORDER BY c.name`);

function addGenresAndCategories(games) {
  return games.map((game) => ({
    ...game,
    genres: listGameGenres.all(game.id).map((row) => row.name),
    categories: listGameCategories.all(game.id).map((row) => row.name),
  }));
}

function parseAvailableMinutes(value) {
  if (typeof value !== 'string' || !/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error('availableMinutes must be a positive whole number');
  }
  return Number(value);
}

function parseGenre(value) {
  if (value === undefined) return null;
  if (typeof value !== 'string') throw new Error('genre must be a single value');
  return value.trim() || null;
}

const app = express();
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.get('/api/games', (req, res) => {
  let genre;
  try { genre = parseGenre(req.query.genre); }
  catch (error) { return res.status(400).json({ error: error.message }); }
  return res.json(addGenresAndCategories(listGames.all(genre, genre)));
});
app.get('/api/genres', (_req, res) => res.json(listGenres.all().map((row) => row.name)));
app.get('/api/recommendations', (req, res) => {
  let minutes, genre;
  try {
    minutes = parseAvailableMinutes(req.query.availableMinutes);
    genre = parseGenre(req.query.genre);
  } catch (error) { return res.status(400).json({ error: error.message }); }
  return res.json(addGenresAndCategories(recommendGames.all(minutes, genre, genre)));
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Not found' }));
const distDirectory = join(projectDirectory, 'frontend', 'dist');
app.use(express.static(distDirectory));
app.use((req, res, next) => {
  if (req.method === 'GET') return res.sendFile(join(distDirectory, 'index.html'));
  return next();
});
app.listen(port, '0.0.0.0', () => console.log(`Listening on port ${port}`));
process.on('SIGTERM', () => process.exit(0));
