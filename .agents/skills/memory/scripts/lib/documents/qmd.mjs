import { execFile } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, delimiter, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { COLLECTIONS } from './corpus.mjs';
import { readState } from './state.mjs';
import { validateRetrieval } from './input.mjs';
import { redact } from '../scan.mjs';

export const RUNTIME = JSON.parse(readFileSync(new URL('./runtime.json', import.meta.url), 'utf8'));
const diagnosticText = text => Array.from(redact(String(text || '').slice(-1600), [])).filter(char => {
  const code = char.charCodeAt(0);
  return code === 9 || code === 10 || code >= 32 && code !== 127;
}).join('');
export const runtimeEntry = paths => join(paths.runtime, 'node_modules', '@tobilu', 'qmd', 'dist', 'cli', 'qmd.js');
export function runtimeEnvironment(paths, dir, { embedding, reranking, cpu = false } = {}) {
  const home = join(paths.runtime, 'home');
  // No inherited secrets, update hooks, project config, provider keys or CI test-mode flag.
  return { HOME: home, USERPROFILE: home, PATH: [dirname(process.execPath), ...(process.platform === 'win32' ? [] : ['/usr/local/bin', '/usr/bin', '/bin'])].join(delimiter),
    ...(process.platform === 'win32' && process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}),
    XDG_CONFIG_HOME: join(dir, 'config'), QMD_CONFIG_DIR: join(dir, 'config'), XDG_CACHE_HOME: join(paths.base, 'cache'),
    INDEX_PATH: join(dir, 'index.sqlite'), QMD_EMBED_MODEL: embedding || join(paths.models, 'not-prepared-embedding.gguf'),
    QMD_RERANK_MODEL: reranking || join(paths.models, 'not-prepared-reranking.gguf'),
    QMD_GENERATE_MODEL: join(paths.models, 'expansion-disabled.gguf'), ...(cpu ? { QMD_FORCE_CPU: '1' } : {}),
    ...(process.platform === 'darwin' ? { GGML_METAL_NO_RESIDENCY: '1' } : {}),
    LANG: 'C.UTF-8', NO_COLOR: '1', NODE_NO_WARNINGS: '1' };
}
export function executeFile(command, args, { signal, timeout = 15000, ...options } = {}) {
  return new Promise((resolve, reject) => {
    const child = execFile(command, args, { ...options, signal, timeout, killSignal: 'SIGKILL', windowsHide: true,
      encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
      if (error) reject(Object.assign(new Error(error.name === 'AbortError' || error.killed ? 'document backend deadline' : 'document backend failed'),
        { code: error.code, safeDiagnostic: diagnosticText(stderr) }));
      else resolve({ stdout, stderr });
    });
    child.stdin?.end();
  });
}
export function runtimeReady(paths, { deep = false, platform = process.platform, nodeVersion = process.versions.node } = {}) {
  const marker = readState(join(paths.runtime, 'ready.json'));
  if (Number(nodeVersion.split('.')[0]) < RUNTIME.nodeMinimum || platform === 'win32') return { ready: false, reason: 'QMD native host unsupported; keyword fallback available' };
  if (!marker || marker.version !== RUNTIME.version || !existsSync(runtimeEntry(paths))) return { ready: false, reason: 'QMD not prepared; run documents-setup' };
  try {
    const installed = JSON.parse(readFileSync(join(paths.runtime, 'node_modules', '@tobilu', 'qmd', 'package.json'), 'utf8'));
    if (installed.version !== RUNTIME.version) return { ready: false, reason: 'managed QMD version mismatch; run documents-setup' };
  } catch { return { ready: false, reason: 'managed QMD unavailable; run documents-setup' }; }
  const models = marker.models || {};
  for (const name of deep ? ['embedding', 'reranking'] : ['embedding']) {
    try {
      if (!models[name]?.path || !models[name].path.startsWith(`${paths.models}/`) || !statSync(models[name].path).isFile()
        || statSync(models[name].path).size !== models[name].bytes) return { ready: false, reason: `${name} model unavailable; run documents-setup${deep ? ' --deep' : ''}` };
    } catch { return { ready: false, reason: `${name} model unavailable; run documents-setup` }; }
  }
  return { ready: true, marker };
}
export function writeQmdConfig(paths, dir, marker) {
  const collections = Object.fromEntries(Object.entries(COLLECTIONS).map(([name, description]) => [name, {
    path: join(dir, 'corpus', name), pattern: '**/*.md', includeByDefault: true, context: { '/': description },
  }]));
  mkdirSync(join(dir, 'config'), { recursive: true, mode: 0o700 });
  mkdirSync(join(paths.runtime, 'home'), { recursive: true, mode: 0o700 });
  writeFileSync(join(dir, 'config', 'wongstack.yml'), JSON.stringify({ collections, models: {
    embed: marker.models.embedding.path, ...(marker.models.reranking ? { rerank: marker.models.reranking.path } : {}),
    generate: join(paths.models, 'expansion-disabled.gguf'),
  } }), { mode: 0o600 });
}
export async function runQmd(paths, dir, args, { marker, signal, timeout = 15000, execute = executeFile } = {}) {
  const ready = marker || runtimeReady(paths).marker;
  if (!ready) throw new Error('QMD not prepared');
  return execute(process.execPath, [runtimeEntry(paths), '--index', 'wongstack', ...args], {
    cwd: paths.runtime, env: runtimeEnvironment(paths, dir, { embedding: ready.models.embedding.path,
      reranking: ready.models.reranking?.path, cpu: ready.cpu }), signal, timeout,
  });
}
export function searchArguments(question, role, mode) {
  validateRetrieval(question, { mode });
  if (!Object.hasOwn(COLLECTIONS, role)) throw new Error('Invalid document collection');
  // Typed fields are fixed by us. The person's input is a single data line.
  const typed = mode === 'semantic' ? `vec: ${question}` : `lex: ${question}\nvec: ${question}`;
  return mode === 'keyword' ? ['search', question, '-c', role, '-n', '8', '--format', 'json']
    : ['query', typed, '-c', role, '-n', '8', '--candidate-limit', '8', '--format', 'json', ...(mode === 'deep' ? [] : ['--no-rerank'])];
}
export function parseCandidates(stdout, role, manifest) {
  let rows;
  try { rows = JSON.parse(stdout); } catch { throw new Error('malformed QMD response'); }
  if (!Array.isArray(rows) || rows.length > 64) throw new Error('malformed QMD response');
  return rows.map(row => {
    if (!row || typeof row.file !== 'string' || !Number.isFinite(row.score) || !Number.isInteger(row.line) || row.line < 1)
      throw new Error('malformed QMD candidate');
    const virtual = row.file.startsWith('qmd://');
    let normalized = virtual ? row.file.slice(6) : row.file;
    if (virtual && normalized.includes('?')) {
      const suffix = '?index=wongstack';
      if (!normalized.endsWith(suffix) || normalized.slice(0, -suffix.length).includes('?')) throw new Error('QMD returned an external index');
      normalized = normalized.slice(0, -suffix.length);
    }
    const prefix = `${role}/`;
    if (!normalized.startsWith(prefix)) throw new Error('QMD returned an external collection');
    const path = normalized.slice(prefix.length);
    const entry = manifest.entries[path];
    if (!entry || entry.role !== role) throw new Error('QMD returned a source outside its manifest');
    return { path, role, hash: entry.hash, anchor: row.line, score: row.score };
  });
}
export async function prepareIndex(paths, dir, delta, signal, marker, { execute } = {}) {
  writeQmdConfig(paths, dir, marker);
  await runQmd(paths, dir, ['update'], { marker, signal, timeout: 300000, execute });
  // QMD hashes content; retained database vectors make this changed-only embedding work.
  await runQmd(paths, dir, ['embed'], { marker, signal, timeout: 300000, execute });
  return { embedded: true, deep: Boolean(marker.models.reranking), version: RUNTIME.version, changed: delta.changed.length };
}
export const runtimeMetadata = fileURLToPath(new URL('./runtime/', import.meta.url));
