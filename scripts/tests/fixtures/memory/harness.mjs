// Test harness for the memory scripts: a fake Cloudflare D1 + R2 REST API on node:sqlite,
// and a throwaway git repo configured to use it.
import { execFile, execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import { d1Query } from '../d1.mjs';

const REPO = resolve(fileURLToPath(new URL('../../../..', import.meta.url)));
const SCRIPTS = join(REPO, '.agents/skills/memory/scripts');
const TOKEN = 'test-memory-token-value';
export const SECRET = 'super-secret-value-123';

async function fakeCloudflare({ bucket = true } = {}) {
  const db = new DatabaseSync(':memory:');
  const objects = new Map();
  const calls = [];
  let offline = false;
  const server = createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    calls.push(`${req.method} ${req.url}`);
    const send = (status, data, raw) => { res.writeHead(status, raw ? {} : { 'Content-Type': 'application/json' }); res.end(raw ? data : JSON.stringify(data)); };
    if (offline === 'hang') return;
    if (offline) { res.socket.destroy(); return; }
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return send(401, { success: false, errors: [{ code: 10000, message: 'Authentication error' }] });
    const d1 = req.url.match(/\/d1\/database\/([^/]+)\/query$/);
    if (d1) return send(...d1Query(db, JSON.parse(body.toString('utf8'))));
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
    db, objects, calls, api,
    // true drops each connection; 'hang' never answers, so the caller's timeout fires.
    setOffline: value => { offline = value; },
    close: () => new Promise(done => { server.closeAllConnections(); server.close(done); }),
  };
}

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

// A throwaway temp dir, removed when the test ends.
export function tempDir(t, prefix) {
  const dir = mkdtempSync(join(tmpdir(), `wong-test-${prefix}`));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function makeRepo(t, { bucket = true } = {}) {
  const root = tempDir(t, 'memory-repo-');
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'dev@example.com');
  git(root, 'config', 'user.name', 'Dev');
  mkdirSync(join(root, '.claude'), { recursive: true });
  const memory = { accountId: 'acct', databaseId: 'db1', database: 'repo-memory', ...(bucket ? { bucket: 'repo-memory' } : {}) };
  writeFileSync(join(root, '.claude', '.wong-stack.json'), JSON.stringify({ components: { memory } }));
  writeFileSync(join(root, '.env'), `CLOUDFLARE_MEMORY_TOKEN=${TOKEN}\nSERVICE_TOKEN=${SECRET}\n`);
  writeFileSync(join(root, 'README.md'), 'test\n');
  git(root, 'add', 'README.md');
  git(root, 'commit', '-q', '-m', 'init');
  const home = tempDir(t, 'memory-home-');
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
    NODE_NO_WARNINGS: '1',
    // The hook's tidy-up sweeps this machine's temp folder; a test that wants it turns it on.
    WONG_TIDY: '0',
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

// A migrated fake store and a repo that points at it, both gone when the test ends.
export async function setup(t, { bucket = true } = {}) {
  const fake = await fakeCloudflare({ bucket });
  t.after(fake.close);
  const repo = makeRepo(t, { bucket });
  const result = await memory(repo, fake, ['migrate']);
  if (result.code !== 0) throw new Error(`migrate failed: ${result.stderr}`);
  return { fake, repo };
}

export const rows = (env, sql, ...params) => env.fake.db.prepare(sql).all(...params).map(row => ({ ...row }));
