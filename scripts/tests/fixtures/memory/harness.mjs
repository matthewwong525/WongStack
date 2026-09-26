// Test harness for the memory scripts: a fake Cloudflare D1 + R2 REST API on node:sqlite,
// and a throwaway git repo configured to use it.
import { execFile, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { after } from 'node:test';
import { fileURLToPath } from 'node:url';

const REPO = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const SCRIPTS = join(REPO, '.agents/skills/memory/scripts');
const TOKEN = 'test-memory-token-value';
export const SECRET = 'super-secret-value-123';

const run = (db, sql, params = []) => (params.length === 0 && /;\s*\S/.test(sql.trim().replace(/;\s*$/, ''))) ? (db.exec(sql), []) : db.prepare(sql).all(...params);

// One in-memory database per D1 id, so a work repo and its home can share one fake API.
async function fakeCloudflare({ bucket = true } = {}) {
  const dbs = new Map();
  const dbFor = id => { if (!dbs.has(id)) dbs.set(id, new DatabaseSync(':memory:')); return dbs.get(id); };
  const db = dbFor('db1');
  const objects = new Map();
  const calls = [];
  let offline = false;
  const offlineDbs = new Set();
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    calls.push(`${req.method} ${req.url}`);
    const send = (status, data, raw) => { res.writeHead(status, raw ? {} : { 'Content-Type': 'application/json' }); res.end(raw ? data : JSON.stringify(data)); };
    if (offline) { res.socket.destroy(); return; }
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { success: false, errors: [{ code: 10000, message: 'Authentication error' }] });
    const d1 = req.url.match(/\/d1\/database\/([^/]+)\/query$/);
    if (d1 && offlineDbs.has(d1[1])) { res.socket.destroy(); return; }
    if (d1) {
      const db = dbFor(d1[1]);
      const input = JSON.parse(body.toString('utf8'));
      const statements = input.batch || [input];
      try {
        db.exec('BEGIN');
        const result = statements.map(({ sql, params }) => ({ success: true, results: run(db, sql, params || []).map(row => ({ ...row })), meta: {} }));
        db.exec('COMMIT');
        return send(200, { success: true, errors: [], result });
      } catch (error) {
        try { db.exec('ROLLBACK'); } catch { /* none open */ }
        return send(400, { success: false, errors: [{ code: 7500, message: error.message }] });
      }
    }
    const object = req.url.match(/\/r2\/buckets\/([^/]+)\/objects\/(.+)$/);
    if (object) {
      if (!bucket) return send(404, { success: false, errors: [{ code: 10006, message: 'bucket not found' }] });
      const key = decodeURI(object[2]);
      if (req.method === 'PUT') { objects.set(key, body); return send(200, { success: true, result: { key } }); }
      if (req.method === 'GET') return objects.has(key) ? send(200, objects.get(key), true) : send(404, { success: false, errors: [] });
    }
    return send(404, { success: false, errors: [{ message: `no route ${req.url}` }] });
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  const api = `http://127.0.0.1:${server.address().port}/client/v4`;
  return {
    db, dbFor, objects, calls, api,
    setOffline: (value, databaseId) => { if (!databaseId) offline = value; else if (value) offlineDbs.add(databaseId); else offlineDbs.delete(databaseId); },
    close: () => new Promise(done => server.close(done)),
  };
}

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

function makeRepo({ bucket = true, envExtra = '', databaseId = 'db1', email = 'dev@example.com' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-memory-repo-'));
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', email);
  git(root, 'config', 'user.name', 'Dev');
  mkdirSync(join(root, '.claude'), { recursive: true });
  const memory = { accountId: 'acct', databaseId, database: 'repo-memory', ...(bucket ? { bucket: 'repo-memory' } : {}) };
  writeFileSync(join(root, '.claude', '.wong-stack.json'), JSON.stringify({ components: { memory } }));
  writeFileSync(join(root, '.env'), `CLOUDFLARE_MEMORY_TOKEN=${TOKEN}\nSERVICE_TOKEN=${SECRET}\n${envExtra}`);
  writeFileSync(join(root, 'README.md'), 'test\n');
  git(root, 'add', 'README.md');
  git(root, 'commit', '-q', '-m', 'init');
  const home = mkdtempSync(join(tmpdir(), 'wong-memory-home-'));
  return { root, home, claudeHome: join(home, 'claude'), codexHome: join(home, 'codex'), stateDir: join(home, 'state') };
}

function envFor(repo, fake, extra = {}) {
  return {
    ...process.env,
    WONG_MEMORY_API: fake.api,
    WONG_MEMORY_STATE_DIR: repo.stateDir,
    WONG_MEMORY_CLAUDE_HOME: repo.claudeHome,
    WONG_MEMORY_CODEX_HOME: repo.codexHome,
    CLOUDFLARE_MEMORY_TOKEN: '',
    WONG_MACHINE_FILE: join(repo.home, 'machine.json'),
    NODE_NO_WARNINGS: '1',
    ...extra,
  };
}

// Run a memory script without blocking the fake server's event loop.
export function node(repo, fake, script, args = [], { input, env = {} } = {}) {
  return new Promise(done => {
    const child = execFile(process.execPath, [join(SCRIPTS, script), ...args], { cwd: repo.root, env: envFor(repo, fake, env), encoding: 'utf8' },
      (error, stdout, stderr) => done({ code: error ? error.code ?? 1 : 0, stdout, stderr }));
    child.stdin.end(input);
  });
}

export const memory = (repo, fake, args, options) => node(repo, fake, 'memory.mjs', args, options);

export function writeJsonFile(dir, name, value) {
  const file = join(dir, name);
  writeFileSync(file, JSON.stringify(value));
  return file;
}

// A migrated fake store and a repo that points at it. Every fake closes when the test file ends.
const fakes = [];
after(() => Promise.all(fakes.map(fake => fake.close())));

export async function setup({ bucket = true } = {}) {
  const fake = await fakeCloudflare({ bucket });
  fakes.push(fake);
  const repo = makeRepo({ bucket });
  const result = await memory(repo, fake, ['migrate']);
  if (result.code !== 0) throw new Error(`migrate failed: ${result.stderr}`);
  return { fake, repo };
}

// A home repo on its own database in the same fake, recorded in the work repo's machine file.
export async function setupHome(env, { email = 'dev@example.com' } = {}) {
  const home = makeRepo({ databaseId: 'db-home', email });
  const result = await memory(home, env.fake, ['migrate'], { env: { WONG_MEMORY_STATE_DIR: home.stateDir } });
  if (result.code !== 0) throw new Error(`home migrate failed: ${result.stderr}`);
  writeFileSync(join(env.repo.home, 'machine.json'), JSON.stringify({ home: home.root }));
  return home;
}

export const homeRows = (env, sql, ...params) => env.fake.dbFor('db-home').prepare(sql).all(...params).map(row => ({ ...row }));

export const rows = (env, sql, ...params) => env.fake.db.prepare(sql).all(...params).map(row => ({ ...row }));
