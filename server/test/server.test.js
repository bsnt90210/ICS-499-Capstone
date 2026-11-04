import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { after, test } from 'node:test';

const directory = await mkdtemp(join(tmpdir(), 'mars-games-test-'));
const csvPath = join(directory, 'tester.csv');
const databasePath = join(directory, 'games.sqlite');
const processes = [];
after(() => processes.forEach(child => child.kill()));
const header = 'id,title,estimatedMinutes,playtimeMinutes,lastPlayed,genres,categories\n';
const metadata = names => `"${JSON.stringify(names.map(description => ({ description }))).replaceAll('"', '""')}"`;
const row = (id, title, minutes, genres = ['Strategy'], categories = ['Single-player'], playtime = '90', date = '2024-11-28') =>
  `${id},${title},${minutes},${playtime},${date},${metadata(genres)},${metadata(categories)}\n`;
async function freePort() {
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  return port;
}
async function startServer() {
  const port = await freePort();
  const child = spawn(process.execPath, ['src/server.js'], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, PORT: String(port), GAMES_CSV_PATH: csvPath, DATABASE_PATH: databasePath },
    stdio: 'pipe',
  });
  processes.push(child);
  let stderr = '';
  child.stderr.on('data', chunk => { stderr += chunk });
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw new Error(`Server exited: ${stderr}`);
    try { if ((await fetch(`${base}/api/health`)).ok) return { child, base }; } catch { /* startup */ }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Server did not start');
}
async function stopServer(child) {
  const exited = new Promise(resolve => child.once('exit', resolve));
  child.kill(); await exited;
}

test('API contract: metadata, filters, inclusive time, validation, JSON errors and restart', async () => {
  await writeFile(csvPath, header + row(1, 'Short', 15, ['Strategy', 'RPG'], ['Single-player', 'Co-op']) + row(2, 'Long', 60) + row(3, 'Never', 30, [], [], '', ''));
  let server = await startServer();
  const get = path => fetch(`${server.base}${path}`);
  let response = await get('/api/games');
  const games = await response.json();
  assert.deepEqual(games.map(game => game.id), [1, 2, 3]);
  assert.deepEqual(games[0], { id: 1, title: 'Short', estimatedMinutes: 15, playtimeMinutes: 90, lastPlayed: '2024-11-28', genres: ['RPG', 'Strategy'], categories: ['Co-op', 'Single-player'] });
  assert.deepEqual(games[2].genres, ['Uncategorized']);
  assert.deepEqual(games[2].categories, []);
  assert.equal(games[2].playtimeMinutes, 0);
  assert.equal(games[2].lastPlayed, null);
  assert.deepEqual(await (await get('/api/genres')).json(), ['RPG', 'Strategy', 'Uncategorized']);
  for (const genre of ['RPG', 'strategy', '%20Strategy%20']) {
    assert.ok((await (await get(`/api/games?genre=${genre}`)).json()).some(game => game.id === 1));
  }
  assert.deepEqual(await (await get('/api/games?genre=Unknown')).json(), []);
  assert.equal((await (await get('/api/games?genre=')).json()).length, 3);
  response = await get('/api/recommendations?availableMinutes=30');
  assert.deepEqual((await response.json()).map(game => game.title), ['Short', 'Never']);
  response = await get('/api/recommendations?availableMinutes=15&genre=rpg');
  const recommendations = await response.json();
  assert.deepEqual(recommendations[0].genres, ['RPG', 'Strategy']);
  assert.deepEqual(recommendations[0].categories, ['Co-op', 'Single-player']);
  assert.deepEqual(await (await get('/api/recommendations?availableMinutes=10')).json(), []);
  for (const minutes of ['0x1e', '3e1', '1.5', '0', '-5', '', '30.0', '%2B30', '030', '%2030', '9007199254740992', '30&availableMinutes=60']) {
    response = await get(`/api/recommendations?availableMinutes=${minutes}`);
    assert.equal(response.status, 400, minutes);
    assert.deepEqual(await response.json(), { error: 'availableMinutes must be a positive whole number' });
  }
  response = await get('/api/recommendations'); assert.equal(response.status, 400);
  for (const path of ['/api/games?genre=RPG&genre=Strategy', '/api/recommendations?availableMinutes=30&genre=RPG&genre=Strategy']) {
    response = await get(path); assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'genre must be a single value' });
  }
  for (const path of ['/api/unknown', '/api']) {
    response = await get(path); assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { error: 'Not found' });
  }
  await stopServer(server.child);
  await writeFile(csvPath, header + row(1, 'Short', 15));
  server = await startServer();
  response = await fetch(`${server.base}/api/games`);
  assert.equal((await response.json()).length, 1);
  await stopServer(server.child);
});

test('CSV validation rejects bad rows and missing columns without rounding or truncating data', async () => {
  const cases = [
    [header + row(1, 'Bad', '1.5'), /CSV line 2/],
    [header + row(1, 'Bad', 30, [], [], '1.5'), /CSV line 2/],
    [header + row(1, 'Bad', 30, [], [], '0', '2024-02-30'), /CSV line 2/],
    [header + row(1, '', 30), /CSV line 2/],
    [header + row(1, 'First', 30) + row(1, 'Duplicate', 30), /CSV line 3/],
    [header + '1,Bad,30,0,,not-json,[]\n', /CSV line 2/],
    ['id,title\n1,Missing\n', /Missing required CSV column/],
    [header, /at least one game/],
  ];
  for (const [csv, error] of cases) {
    await writeFile(csvPath, csv);
    await assert.rejects(startServer(), error);
  }
});
