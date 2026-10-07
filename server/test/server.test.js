import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, test } from "node:test";

const directory = await mkdtemp(join(tmpdir(), "mars-games-test-"));
const csvPath = join(directory, "tester.csv");
const databasePath = join(directory, "games.sqlite");
const processes = [];
after(() => processes.forEach((child) => child.kill()));

async function freePort() {
  const listener = createServer();
  await new Promise((resolve) => listener.listen(0, "127.0.0.1", resolve));
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

async function startServer() {
  const port = await freePort();
  const child = spawn(process.execPath, ["src/server.js"], {
    cwd: new URL("..", import.meta.url),
    env: { ...process.env, PORT: String(port), GAMES_CSV_PATH: csvPath, DATABASE_PATH: databasePath },
    stdio: "pipe",
  });
  processes.push(child);
  const base = `http://127.0.0.1:${port}`;
  for (let attempt = 0; attempt < 50; attempt++) {
    if (child.exitCode !== null) throw new Error("Server exited before becoming ready");
    try {
      const response = await fetch(`${base}/api/health`);
      if (response.ok) return { child, base };
    } catch { /* wait for startup */ }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("Server did not start");
}

async function stopServer(child) {
  child.kill();
  await new Promise((resolve) => child.once("exit", resolve));
}

test("imports games, filters by time, validates input, and removes stale rows", async () => {
  await writeFile(csvPath, "id,title,genre,estimatedMinutes\n1,Short,Arcade,15\n2,Long,Strategy,60\n");
  let server = await startServer();
  let response = await fetch(`${server.base}/api/games`);
  assert.deepEqual((await response.json()).map((game) => game.title), ["Short", "Long"]);

  response = await fetch(`${server.base}/api/recommendations?availableMinutes=30`);
  assert.deepEqual((await response.json()).map((game) => game.title), ["Short"]);
  response = await fetch(`${server.base}/api/recommendations?availableMinutes=0`);
  assert.equal(response.status, 400);
  await stopServer(server.child);

  await writeFile(csvPath, "id,title,genre,estimatedMinutes\n1,Short,Arcade,15\n");
  server = await startServer();
  response = await fetch(`${server.base}/api/games`);
  assert.deepEqual((await response.json()).map((game) => game.title), ["Short"]);
  await stopServer(server.child);
});
