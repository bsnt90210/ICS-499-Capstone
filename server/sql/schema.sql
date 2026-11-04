-- MARS Game Finder schema, Iteration 3
-- Runs on every server start, then tester.csv is loaded.
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
  last_played       TEXT
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
