// Installs fake-camofox-server.mjs where browse.mjs looks for camofox, under a test's own HOME, so
// browse.mjs starts it as it starts the real server. `fakeCamofox(home)` returns the control folder's
// helpers; fake-camofox-server.mjs lists the control files. BROWSE_ENV makes browse.mjs's waits short.

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SERVER = pathToFileURL(join(dirname(fileURLToPath(import.meta.url)), 'fake-camofox-server.mjs')).href;
export const BROWSE_ENV = { BROWSE_SETTLE_MS: '300', BROWSE_SETTLE_GAP_MS: '10', BROWSE_LOGIN_WAIT_MS: '300', BROWSE_COMMAND_MS: '15000', BROWSE_START_MS: '15000' };

/** `driver` is the playwright-core version the install holds; `installed: false` leaves camofox out. */
export function fakeCamofox(home, { driver = '1.58.2', installed = true } = {}) {
  const install = join(home, '.wong-stack', 'camofox');
  const control = join(home, 'fake-camofox');
  mkdirSync(control, { recursive: true });
  const file = name => join(control, name);
  if (installed) {
    for (const [name, version] of [['@askjo/camofox-browser', '1.18.1'], ['playwright-core', driver]]) {
      mkdirSync(join(install, 'node_modules', name), { recursive: true });
      writeFileSync(join(install, 'node_modules', name, 'package.json'), JSON.stringify({ name, version, type: 'module' }));
    }
    writeFileSync(join(install, 'node_modules/@askjo/camofox-browser/server.js'), `globalThis.FAKE_CAMOFOX_DIR = ${JSON.stringify(control)};\nawait import(${JSON.stringify(SERVER)});\n`);
  }
  const json = name => (existsSync(file(name)) ? JSON.parse(readFileSync(file(name), 'utf8')) : null);
  const serverPid = () => { try { return JSON.parse(readFileSync(join(install, 'server.json'), 'utf8')).pid; } catch { return null; } };
  return {
    install,
    control,
    set: (name, value = '') => writeFileSync(file(name), typeof value === 'string' ? value : JSON.stringify(value)),
    unset: name => rmSync(file(name), { force: true }),
    has: name => existsSync(file(name)),
    env: () => json('env.json'),
    tabs: () => json('tabs.json') ?? [],
    starts: () => (existsSync(file('starts.log')) ? readFileSync(file('starts.log'), 'utf8').trim().split('\n').length : 0),
    requests: () => (existsSync(file('requests.jsonl')) ? readFileSync(file('requests.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(line => JSON.parse(line)) : []),
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
