// Complete immutable generations, one index per real checkout, no private fact data.
import { randomUUID } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { setTimeout as pause } from 'node:timers/promises';
import { machineIdFile } from '../machine-id.mjs';
import { hashText } from './corpus.mjs';

export const REFRESH_MS = 300000;
export const readState = file => { try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return null; } };
export function atomicJson(file, data) {
  mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
  const temporary = `${file}.${randomUUID()}.tmp`;
  writeFileSync(temporary, JSON.stringify(data), { mode: 0o600 });
  renameSync(temporary, file);
}
export function documentPaths(ctx, { dataDir = join(dirname(machineIdFile()), 'documents') } = {}) {
  const root = realpathSync(ctx.root), repository = ctx.commonDir ? realpathSync(ctx.commonDir) : root;
  const identity = hashText(`${repository}\0${root}`).slice(0, 32);
  return { root, base: dataDir, state: join(dataDir, 'worktrees', identity), runtime: join(dataDir, 'runtime-2.8.3'),
    models: join(dataDir, 'models'), identity };
}
export function generation(paths) {
  const pointer = readState(join(paths.state, 'current.json'));
  if (!pointer || !/^[a-z0-9-]+$/.test(pointer.generation)) return null;
  const dir = join(paths.state, 'generations', pointer.generation);
  const manifest = readState(join(dir, 'manifest.json'));
  return manifest?.complete === true && manifest.generation === pointer.generation ? { dir, manifest } : null;
}
export function diffCorpus(corpus, manifest) {
  const old = manifest?.entries || {};
  return { changed: Object.keys(corpus.entries).filter(path => corpus.entries[path].hash !== old[path]?.hash),
    removed: Object.keys(old).filter(path => !corpus.entries[path]) };
}
export function pruneGenerations(paths, { keep = [], now = Date.now(), graceMs = 300000 } = {}) {
  const dir = join(paths.state, 'generations');
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    if (keep.includes(name) || !/^[a-z0-9-]+$/.test(name)) continue;
    const file = join(dir, name);
    if (now - statSync(file).mtimeMs > graceMs) rmSync(file, { recursive: true, force: true });
  }
}
export function acquireRefresh(paths, { now = Date.now(), lifetime = REFRESH_MS, alive = pid => { try { process.kill(pid, 0); return true; } catch { return false; } } } = {}) {
  mkdirSync(paths.state, { recursive: true, mode: 0o700 });
  const lock = join(paths.state, 'refresh-lock'), token = randomUUID();
  try { mkdirSync(lock, { mode: 0o700 }); } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const owner = readState(join(lock, 'owner.json'));
    // Even a live hung refresh has a fixed lifetime. Its publication token is revoked.
    if (owner && now - owner.at < lifetime + 10000 && alive(owner.pid)) return null;
    if (!owner) {
      // A process could be between mkdir and writing owner; avoid stealing a new lock.
      if (now - statSync(lock).mtimeMs < 10000) return null;
    }
    const abandoned = `${lock}.abandoned-${token}`;
    try { renameSync(lock, abandoned); } catch { return null; }
    rmSync(abandoned, { recursive: true, force: true });
    return acquireRefresh(paths, { now, alive, lifetime });
  }
  atomicJson(join(lock, 'owner.json'), { pid: process.pid, at: now, token });
  return { token, owns: () => readState(join(lock, 'owner.json'))?.token === token,
    release: () => { if (readState(join(lock, 'owner.json'))?.token === token) rmSync(lock, { recursive: true, force: true }); } };
}
export async function refreshIndex(ctx, corpus, paths, { prepare = async () => ({ embedded: false }), signal, force = false, waitMs = 0 } = {}) {
  if (realpathSync(ctx.root) !== paths.root || corpus.root !== paths.root) throw new Error('Document index belongs to a different checkout');
  const waitUntil = Date.now() + waitMs;
  let lock = acquireRefresh(paths);
  while (!lock && Date.now() < waitUntil && !signal?.aborted) {
    await pause(Math.min(100, waitUntil - Date.now()), undefined, { signal });
    lock = acquireRefresh(paths);
  }
  if (!lock) return { state: 'partial', reason: 'refresh already running' };
  const before = generation(paths), delta = diffCorpus(corpus, before?.manifest);
  const id = `${Date.now()}-${randomUUID()}`, dir = join(paths.state, 'generations', id);
  try {
    if (!force && !delta.changed.length && !delta.removed.length && before) return { state: 'ok', generation: before.manifest.generation, changed: 0, removed: 0 };
    mkdirSync(dir, { recursive: true, mode: 0o700 });
    if (before) {
      cpSync(join(before.dir, 'corpus'), join(dir, 'corpus'), { recursive: true });
      if (existsSync(join(before.dir, 'index.sqlite'))) cpSync(join(before.dir, 'index.sqlite'), join(dir, 'index.sqlite'));
    }
    for (const path of delta.removed) rmSync(join(dir, 'corpus', before.manifest.entries[path].role, path), { force: true });
    for (const path of delta.changed) {
      const entry = corpus.entries[path], file = join(dir, 'corpus', entry.role, path);
      mkdirSync(dirname(file), { recursive: true, mode: 0o700 });
      writeFileSync(file, entry.text, { mode: 0o600 });
    }
    for (const role of ['wiki', 'specs', 'active', 'archive']) mkdirSync(join(dir, 'corpus', role), { recursive: true, mode: 0o700 });
    const runtime = await prepare(dir, delta, signal);
    if (signal?.aborted || !lock.owns()) throw new Error('refresh deadline or ownership lost');
    const entries = Object.fromEntries(Object.entries(corpus.entries).map(([path, { text: _text, ...entry }]) => [path, entry]));
    const manifest = { version: 1, complete: true, generation: id, root: paths.root, at: new Date().toISOString(),
      entries, embedded: Boolean(runtime.embedded), deep: Boolean(runtime.deep), runtime: runtime.version || null };
    atomicJson(join(dir, 'manifest.json'), manifest);
    atomicJson(join(paths.state, 'current.json'), { generation: id });
    atomicJson(join(paths.state, 'refresh.json'), { state: 'ok', at: Date.now() });
    pruneGenerations(paths, { keep: [id, before?.manifest.generation] });
    return { state: 'ok', generation: id, changed: delta.changed.length, removed: delta.removed.length };
  } catch (error) {
    if (lock.owns()) atomicJson(join(paths.state, 'refresh.json'), { state: 'failed', at: Date.now(), reason: 'index refresh failed; previous generation retained' });
    rmSync(dir, { recursive: true, force: true });
    throw error;
  } finally { lock.release(); }
}
