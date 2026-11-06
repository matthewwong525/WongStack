// A fake Camoufox under a test's own HOME: a venv `python` for browse.mjs's install and pin checks, and BROWSE_ENV,
// which starts fake-camofox-server.mjs as the server and sets long wait caps, so a wait ends by its state.

import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SERVER = join(dirname(fileURLToPath(import.meta.url)), 'fake-camofox-server.mjs');
export const BROWSE_ENV = { BROWSE_SETTLE_MS: '15000', BROWSE_SETTLE_GAP_MS: '10', BROWSE_COMMAND_MS: '15000', BROWSE_START_MS: '15000', BROWSE_SERVER_SCRIPT: SERVER };
/** The versions browse.mjs pins, as the fake library answers its check. */
export const PINNED = { library: '0.5.9', build: '158.0.1-beta.41' };

/** A fake Python: `-m venv <dir>` makes `<dir>/bin/python` a copy of itself; pip and `camoufox fetch` pass unless
 * `fail-pip` is set; launch-config.py prints `check.json`, else the pinned pair. Each run goes to `python.jsonl`. */
export function fakePython(file, control) {
  writeFileSync(file, `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const control = ${JSON.stringify(control)};
const args = process.argv.slice(2);
fs.appendFileSync(path.join(control, 'python.jsonl'), JSON.stringify({ python: __filename, args, cache: process.env.XDG_CACHE_HOME, tmp: process.env.TMPDIR }) + '\\n');
if (args[0] === '-I' && args[1] === '-c') process.exit(0);
if (args[0] === '-m' && args[1] === 'venv') {
  fs.mkdirSync(path.join(args[2], 'bin'), { recursive: true });
  fs.copyFileSync(__filename, path.join(args[2], 'bin', 'python'));
  fs.chmodSync(path.join(args[2], 'bin', 'python'), 0o755);
  process.exit(0);
}
if (args[0] === '-m') {
  if (fs.existsSync(path.join(control, 'fail-pip'))) { console.error('pip error: no space left on device'); process.exit(1); }
  process.exit(0);
}
const check = fs.existsSync(path.join(control, 'check.json')) ? fs.readFileSync(path.join(control, 'check.json'), 'utf8') : ${JSON.stringify(JSON.stringify(PINNED))};
console.log(check);
process.exit(JSON.parse(check).error ? 3 : 0);
`);
  chmodSync(file, 0o755);
  return file;
}

/** `installed: false` leaves the venv out. */
export function fakeCamofox(home, { installed = true } = {}) {
  const install = join(home, '.wong-stack', 'camoufox');
  const control = join(home, 'fake-camofox');
  mkdirSync(control, { recursive: true });
  const file = name => join(control, name);
  if (installed) {
    mkdirSync(join(install, 'venv', PINNED.library, 'bin'), { recursive: true });
    fakePython(join(install, 'venv', PINNED.library, 'bin', 'python'), control);
  }
  const json = name => (existsSync(file(name)) ? JSON.parse(readFileSync(file(name), 'utf8')) : null);
  const lines = name => (existsSync(file(name)) ? readFileSync(file(name), 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : []);
  const serverPid = () => { try { return JSON.parse(readFileSync(join(install, 'server.json'), 'utf8')).pid; } catch { return null; } };
  return {
    install,
    control,
    set: (name, value = '') => writeFileSync(file(name), typeof value === 'string' ? value : JSON.stringify(value)),
    unset: name => rmSync(file(name), { force: true }),
    has: name => existsSync(file(name)),
    env: () => json('env.json'),
    tabs: () => json('tabs.json') ?? [],
    /** Each run of the fake Python, `{python, args, cache, tmp}`. */
    pythonRuns: () => lines('python.jsonl'),
    starts: () => (existsSync(file('starts.log')) ? readFileSync(file('starts.log'), 'utf8').trim().split('\n').length : 0),
    /** The stacks of the server's crashes, '' when none: a failing test prints them. */
    errors: () => (existsSync(file('errors.log')) ? readFileSync(file('errors.log'), 'utf8') : ''),
    requests: () => lines('requests.jsonl'),
    /** Each request as `METHOD /path`, with each tab's id written `:tab`. */
    calls() { return this.requests().map(({ method, path }) => `${method} ${path.replace(/\/tabs\/[0-9a-f-]{36}/, '/tabs/:tab')}`); },
    serverPid,
    /** Kills the server a test started. */
    stop() {
      for (const name of ['hold-click', 'hold-type']) rmSync(file(name), { force: true });
      const pid = serverPid();
      if (pid) try { process.kill(pid, 'SIGKILL'); } catch { /* gone */ }
    },
  };
}
