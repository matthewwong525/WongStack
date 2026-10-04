// Explicit host setup is the only path that installs packages or fetches models.
import { closeSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, readSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { scanCorpus, verifyPassage } from './corpus.mjs';
import { acquireRefresh, atomicJson, generation, readState, refreshIndex } from './state.mjs';
import { executeFile, parseCandidates, prepareIndex, RUNTIME, runQmd, runtimeEntry, runtimeEnvironment, runtimeMetadata, runtimeReady, searchArguments } from './qmd.mjs';
import { anchoredPassage } from './retrieve.mjs';

const MODEL_PREPARATION = `
import { pathToFileURL } from 'node:url';
const [modulePath, cacheDir, modelsJson] = process.argv.slice(1);
const { pullModels } = await import(pathToFileURL(modulePath).href);
const results = await pullModels(JSON.parse(modelsJson), { cacheDir, cli: false });
console.log(JSON.stringify(results));
`;

export async function setupDocuments(ctx, paths, { deep = false, cpu = false, execute = executeFile, corpus = scanCorpus(ctx) } = {}) {
  if (Number(process.versions.node.split('.')[0]) < RUNTIME.nodeMinimum || process.platform === 'win32')
    throw new Error('This QMD setup requires a supported Node 22+ native host; portable keyword retrieval is available');
  mkdirSync(paths.runtime, { recursive: true, mode: 0o700 });
  const lock = acquireRefresh({ ...paths, state: paths.runtime }, { lifetime: 900000 });
  if (!lock) throw new Error('Document setup already running; use documents-status');
  // A failed setup keeps a previous checked runtime usable, but never creates a new ready marker.
  const previous = readState(join(paths.runtime, 'ready.json'));
  let stage = 'dependency installation';
  try {
    const env = runtimeEnvironment(paths, paths.runtime, { cpu });
    mkdirSync(paths.models, { recursive: true, mode: 0o700 });
    mkdirSync(join(paths.runtime, 'home'), { recursive: true, mode: 0o700 });
    for (const name of ['package.json', 'package-lock.json']) cpSync(join(runtimeMetadata, name), join(paths.runtime, name));
    if (!existsSync(runtimeEntry(paths))) await execute('npm', ['ci', '--prefix', paths.runtime, '--no-audit', '--no-fund'],
      { cwd: paths.runtime, env, timeout: 300000 });
    stage = 'runtime verification';
    const installed = JSON.parse(readFileSync(join(paths.runtime, 'node_modules', '@tobilu', 'qmd', 'package.json'), 'utf8'));
    if (installed.version !== RUNTIME.version) throw new Error('Managed QMD version differs from the pinned descriptor');
    const version = await execute(process.execPath, [runtimeEntry(paths), '--version'], { cwd: paths.runtime, env, timeout: 15000 });
    if (!/^qmd 2\.8\.3(?:\s|$)/.test(version.stdout.trim())) throw new Error('Managed QMD version check failed');
    const names = deep ? ['embedding', 'reranking'] : ['embedding'];
    stage = 'model preparation';
    const pulled = await execute(process.execPath, ['--input-type=module', '-e', MODEL_PREPARATION,
      join(paths.runtime, 'node_modules', '@tobilu', 'qmd', 'dist', 'llm.js'), paths.models,
      JSON.stringify(names.map(name => RUNTIME.models[name]))], { cwd: paths.runtime, env, timeout: 300000 });
    const results = JSON.parse(pulled.stdout.trim());
    if (!Array.isArray(results) || results.length !== names.length) throw new Error('Model preparation returned invalid readiness');
    const models = { ...previous?.models };
    names.forEach((name, index) => {
      const model = results[index];
      if (!model.path || !model.path.startsWith(`${paths.models}/`) || !statSync(model.path).isFile()
        || statSync(model.path).size < 1024) throw new Error('Model preparation did not produce a valid managed GGUF');
      const header = Buffer.alloc(4), fd = openSync(model.path, 'r');
      try { readSync(fd, header, 0, 4, 0); } finally { closeSync(fd); }
      if (header.toString() !== 'GGUF') throw new Error('Model preparation did not produce a valid managed GGUF');
      models[name] = { path: model.path, bytes: statSync(model.path).size, identity: RUNTIME.models[name] };
    });
    const marker = { version: RUNTIME.version, models, cpu: Boolean(cpu), checkedAt: new Date().toISOString() };
    if (!Object.keys(corpus.entries).length || corpus.omitted) throw new Error('Setup requires a complete nonempty eligible document corpus');
    const signal = AbortSignal.timeout(300000);
    stage = 'index and embedding preparation';
    const refreshed = await refreshIndex(ctx, corpus, paths, { force: true, signal,
      prepare: (dir, delta, innerSignal) => prepareIndex(paths, dir, delta, innerSignal, marker, { execute }) });
    if (refreshed.state !== 'ok') throw new Error('Setup index refresh is incomplete');
    const current = generation(paths);
    stage = 'original semantic evidence verification';
    const entry = Object.values(corpus.entries)[0], question = entry.text.split(/\r?\n/).find(line => line.trim())?.replace(/^#+\s*/, '').slice(0, 200) || 'project guidance';
    for (const mode of deep ? ['semantic', 'deep'] : ['semantic']) {
      const probe = await runQmd(paths, current.dir, searchArguments(question, entry.role, mode), { marker, execute, timeout: 90000 });
      if (mode === 'deep' && /(?:fail.*rerank|rerank.*fail|skip.*rerank|rerank.*unavailable|falling back)/i.test(probe.stderr || '')) throw new Error('Setup reranking did not complete');
      const hits = parseCandidates(probe.stdout, entry.role, current.manifest);
      const verified = hits.map(hit => anchoredPassage(corpus.entries[hit.path], hit)).filter(Boolean).map(hit => verifyPassage(ctx, hit)).filter(Boolean);
      if (!verified.length) throw new Error(`Setup ${mode} query returned no checked evidence`);
    }
    if (!lock.owns()) throw new Error('Setup lock expired before readiness check');
    atomicJson(join(paths.runtime, 'ready.json'), marker);
    return { state: 'ok', backend: 'qmd', version: RUNTIME.version, semantic: true, deep: Boolean(models.reranking), ...refreshed };
  } catch (error) {
    throw new Error(`Document setup failed during ${stage}: ${error.message}${error.safeDiagnostic ? `\n${error.safeDiagnostic}` : ''}`);
  } finally { lock.release(); }
}

export function documentsStatus(paths, corpus) {
  const ready = runtimeReady(paths), current = generation(paths), refresh = readState(join(paths.state, 'refresh.json'));
  const entries = current?.manifest.entries || {};
  const changed = corpus ? Object.keys(corpus.entries).filter(path => entries[path]?.hash !== corpus.entries[path].hash).length : null;
  const removed = corpus ? Object.keys(entries).filter(path => !corpus.entries[path]).length : null;
  return { version: 1, runtimeVersion: ready.marker?.version || null, runtimeReady: ready.ready, reason: ready.reason || null,
    semanticReady: ready.ready && Boolean(current?.manifest.embedded) && !changed && !removed && !corpus?.omitted,
    deepReady: runtimeReady(paths, { deep: true }).ready && Boolean(current?.manifest.deep), indexAt: current?.manifest.at || null,
    generation: current?.manifest.generation || null, changed, removed, omittedSources: corpus?.omitted || 0,
    refresh: refresh?.state || 'not_run', refreshAt: refresh?.at || null,
    stateDirectory: paths.state, setup: 'node .claude/skills/memory/scripts/memory.mjs documents-setup' };
}
