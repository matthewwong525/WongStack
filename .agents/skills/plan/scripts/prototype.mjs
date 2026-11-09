#!/usr/bin/env node
// A throwaway copy of the app for a plan's screens: real After pictures and a Try it link before the build.
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';

const USAGE = `usage: prototype.mjs start|upload|serve|finish <change-name> [--wait <seconds>]
  start   make the copy at .scratch/<change-name>-prototype from this commit, with any earlier finish's diff, and print its path
  upload  put the copy on the change's preview address; a new database migration stops it
  serve   run the copy on this computer when upload can't, print PROTOTYPE_URL=<address> once it answers, and stop it on exit;
          --wait is how long it may take to answer, 90 seconds unless set
  finish  keep the copy's changes as .scratch/<change-name>-prototype.diff for the build, and remove the copy`;

const git = (cwd, args) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

export function copyOf(top, change) {
  if (!/^[\w-]{1,92}$/.test(change)) throw new Error(`a change name is letters, digits, - and _, up to 92: ${change}`);
  return join(top, '.scratch', `${change}-prototype`);
}

function needCopy(copy) {
  if (!existsSync(copy)) throw new Error(`no prototype at ${copy}: run start first`);
}

export function start(top, change) {
  const copy = copyOf(top, change);
  if (existsSync(copy)) return copy;
  mkdirSync(join(top, '.scratch'), { recursive: true });
  git(top, ['worktree', 'add', '--detach', copy, 'HEAD']);
  // A finished prototype's diff comes back, so a later note keeps the earlier edits.
  const diff = join(top, '.scratch', `${change}-prototype.diff`);
  if (existsSync(diff) && statSync(diff).size) {
    try { git(copy, ['apply', '--binary', diff]); } catch {
      git(top, ['worktree', 'remove', '--force', copy]);
      throw new Error(`${diff} does not apply to this commit: fix or remove it, then start again`);
    }
  }
  // The copy builds with the checkout's installed packages, so it needs no install of its own.
  if (existsSync(join(top, 'app', 'node_modules')) && existsSync(join(copy, 'app'))) symlinkSync(join(top, 'app', 'node_modules'), join(copy, 'app', 'node_modules'));
  return copy;
}

// The preview shares the staging database, so a prototype shows sample data in the screen, never a migration.
export function upload(top, change) {
  const copy = copyOf(top, change);
  needCopy(copy);
  if (git(copy, ['status', '--porcelain', '--untracked-files=all', '--', 'schema/migrations']).trim()) {
    throw new Error('the prototype changes schema/migrations: write sample data into the screen instead');
  }
  return spawnSync('bash', ['scripts/cf-preview.sh', '--alias', change], { cwd: copy, stdio: 'inherit' }).status ?? 1;
}

const freePort = () => new Promise((done, fail) => {
  const probe = createServer().once('error', fail).listen(0, '127.0.0.1', () => { const { port } = probe.address(); probe.close(() => done(port)); });
});

// The copy's dev server, in its own process group so a stop takes its children too, on exit or a signal;
// resolves with the address once it answers.
export async function serve(top, change, wait = 90) {
  const copy = copyOf(top, change);
  needCopy(copy);
  const port = await freePort(), url = `http://localhost:${port}`;
  const server = spawn('npm', ['run', 'dev', '--', '--port', String(port), '--strictPort', '--host', '127.0.0.1'],
    { cwd: join(copy, 'app'), detached: true, stdio: ['ignore', 2, 2] });
  const stop = () => { try { process.kill(-server.pid, 'SIGTERM'); } catch { /* already gone */ } };
  // Registered before the wait, so a Ctrl-C while the app starts stops it too.
  process.on('exit', stop);
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(signal, () => process.exit(0));
  let ended = null;
  server.once('exit', code => { ended = code ?? 1; });
  for (const at = Date.now(); Date.now() - at < wait * 1000; await new Promise(done => setTimeout(done, 250))) {
    if (ended !== null) throw new Error(`the copy's app stopped before it answered (npm run dev exited with ${ended})`);
    if (await fetch(`http://127.0.0.1:${port}/`).then(() => true, () => false)) return { url, server };
  }
  stop();
  throw new Error(`the copy's app did not answer at ${url} within ${wait} seconds`);
}

export function finish(top, change) {
  const copy = copyOf(top, change);
  needCopy(copy);
  // The linked packages are not the prototype's: a `node_modules/` rule skips a folder, not a link.
  git(copy, ['add', '-A']);
  git(copy, ['rm', '--cached', '-q', '--ignore-unmatch', 'app/node_modules']);
  const diff = join(top, '.scratch', `${change}-prototype.diff`);
  writeFileSync(diff, git(copy, ['diff', '--cached', '--binary', 'HEAD']));
  git(top, ['worktree', 'remove', '--force', copy]);
  return diff;
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true, options: { wait: { type: 'string' } } });
  const [verb, change] = positionals, wait = values.wait === undefined ? 90 : Number(values.wait);
  if (positionals.length !== 2 || !['start', 'upload', 'serve', 'finish'].includes(verb) || !(wait > 0)) usageError(USAGE);
  try {
    let top;
    try { top = git(process.cwd(), ['rev-parse', '--show-toplevel']).trim(); } catch { throw new Error('run it inside the change\'s checkout'); }
    if (verb === 'upload') process.exitCode = upload(top, change);
    else if (verb === 'serve') {
      const { url, server } = await serve(top, change, wait);
      console.log(`PROTOTYPE_URL=${url}`);
      server.on('exit', code => { process.exitCode = code ?? 0; });
    }
    else console.log(verb === 'start' ? start(top, change) : finish(top, change));
  } catch (error) { console.error(`prototype: ${error.message}`); process.exitCode = 1; }
}
