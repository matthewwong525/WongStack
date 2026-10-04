import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { SCOPES, scanCorpus, scopedEntries, verifyPassage } from './corpus.mjs';
import { interleaveSources, lexicalSearch, passages, queryWords } from './lexical.mjs';
import { acquireRefresh, diffCorpus, generation, readState } from './state.mjs';
import { parseCandidates, runQmd, runtimeEnvironment, runtimeReady, searchArguments } from './qmd.mjs';

export function startRefresh(ctx, paths, { now = Date.now(), launch = spawn } = {}) {
  if (!runtimeReady(paths).ready) return false;
  const failed = readState(join(paths.state, 'refresh.json'));
  if (failed?.state === 'failed' && now - failed.at < 60000) return false;
  const lock = readState(join(paths.state, 'refresh-lock', 'owner.json'));
  if (lock && now - lock.at < 310000) return false;
  const claim = acquireRefresh({ ...paths, state: join(paths.state, 'launch') }, { lifetime: 10000, alive: () => true });
  if (!claim) return false;
  // The child needs only checkout/cache locations; it never receives fact credentials.
  const child = launch(process.execPath, [fileURLToPath(new URL('./refresh-worker.mjs', import.meta.url)), ctx.root, paths.base],
    { detached: true, stdio: 'ignore', env: runtimeEnvironment(paths, paths.state), windowsHide: true });
  child.on('error', () => {}); child.unref();
  return true;
}

export function anchoredPassage(entry, hit) {
  if (!entry || hit.hash !== entry.hash) return null;
  const lines = entry.text.split(/\r?\n/);
  if (hit.anchor > lines.length) return null;
  const start = Math.max(0, hit.anchor - 4), end = Math.min(lines.length, start + 24);
  const heading = lines.slice(0, hit.anchor).reverse().find(line => /^#{1,6}\s/.test(line));
  return { path: entry.path, role: entry.role, hash: hit.hash, heading: (heading || '').replace(/^#+\s*/, '').slice(0, 180),
    startLine: start + 1, endLine: end, text: lines.slice(start, end).join('\n'), truncated: end < lines.length || start > 0, score: hit.score };
}

export function locatedPassages(entry, hit, options, deadline = Infinity) {
  const anchored = anchoredPassage(entry, hit);
  if (!anchored) return [];
  if (options.mode === 'semantic') return [anchored];
  const words = queryWords(options.question);
  const relevant = passages(entry, options.question, new Map(), deadline, 8).filter(passage => {
    const present = new Set(queryWords(passage.text));
    return words.filter(word => present.has(word)).length >= Math.min(2, words.length);
  });
  // A located document can contain many topics. Prefer matching original sections for
  // lexical/hybrid reads, retaining the semantic anchor when the wording differs.
  const exact = relevant.find(passage => passage.text.toLowerCase().includes(options.question.trim().toLowerCase()));
  const summary = relevant.find(passage => /^(?:purpose|summary|overview)$/i.test(passage.heading));
  const preferred = exact || summary;
  const selected = preferred ? [preferred, ...relevant.filter(passage => passage !== preferred)] : relevant;
  return selected.length ? selected.slice(0, 2).map((passage, index) => ({ ...passage, score: hit.score - index * 0.001 })) : [anchored];
}

export async function retrieveDocuments(ctx, options, paths, { corpus = scanCorpus(ctx), search = runQmd, refresh = startRefresh,
  signal, beforeVerify = () => {}, deadline = Date.now() + 16000 } = {}) {
  const current = generation(paths), ready = runtimeReady(paths, { deep: options.mode === 'deep' });
  const delta = diffCorpus(corpus, current?.manifest), stale = delta.changed.length > 0 || delta.removed.length > 0 || corpus.omitted > 0;
  const semantic = options.mode !== 'keyword';
  const complete = ready.ready && Boolean(current?.manifest.embedded) && !stale;
  let candidates = [], backend = 'lexical-fallback', reason = ready.reason,
    coverage = complete ? 'complete' : current?.manifest.embedded ? 'partial' : 'unavailable', requestedModeState = 'ok';
  let lexicalPartial = false;
  const lookup = source => {
    const hits = lexicalSearch(source, options.question, { ...options, deadline: Math.min(deadline + 1000, Date.now() + 1000) });
    lexicalPartial ||= hits.partial;
    return hits;
  };
  const canRun = ready.ready && current && (!semantic || current.manifest.embedded) && (options.mode !== 'deep' || current.manifest.deep);
  if (canRun) {
    try {
      const roles = SCOPES[options.scope];
      // Each role receives its own candidate pool, so a large archive cannot hide wiki results.
      const results = [];
      // Serialize native model work to avoid loading four model contexts concurrently.
      for (const role of roles) {
        const result = await Promise.allSettled([Promise.resolve().then(async () => {
        const remaining = deadline - Date.now();
        if (remaining < 50) throw new Error('document backend deadline');
        const response = await search(paths, current.dir, searchArguments(options.question, role, options.mode),
          { marker: ready.marker, signal, timeout: remaining });
        if (options.mode === 'deep' && /(?:failed.*rerank|rerank.*failed|falling back)/i.test(response.stderr || '')) throw new Error('reranking unavailable');
          return parseCandidates(response.stdout, role, current.manifest);
        })]);
        results.push(result[0]);
      }
      if (results.every(result => result.status === 'rejected')) throw new Error('all QMD collections failed');
      const failedRoles = results.filter(result => result.status === 'rejected').length;
      const eligible = new Set(scopedEntries(corpus, options).map(entry => entry.path));
      candidates = results.filter(result => result.status === 'fulfilled').flatMap(result => result.value).filter(hit => eligible.has(hit.path))
        .flatMap(hit => locatedPassages(corpus.entries[hit.path], hit, options, deadline + 1000)).sort((a, b) => b.score - a.score);
      backend = 'qmd'; reason = stale ? 'changed sources: semantic coverage incomplete until refresh' : null;
      if (failedRoles) {
        coverage = 'partial'; reason = 'some QMD collections unavailable; successful sources and live keyword fallback retained';
        candidates.push(...lookup(corpus));
        if (options.mode === 'semantic' || options.mode === 'deep') requestedModeState = 'partial';
      }
      if (stale) {
        candidates.push(...lookup(corpus).filter(hit => delta.changed.includes(hit.path)));
        if (options.mode === 'semantic' || options.mode === 'deep') requestedModeState = 'partial';
      }
    } catch {
      reason = 'QMD failed, timed out or returned invalid evidence; live keyword fallback used';
      coverage = 'unavailable';
      candidates = lookup(corpus);
      if (options.mode === 'semantic' || options.mode === 'deep') requestedModeState = 'unavailable';
    }
  } else {
    candidates = lookup(corpus);
    if (options.mode === 'semantic' || options.mode === 'deep') requestedModeState = 'unavailable';
    reason ||= 'prepared document index unavailable; run documents-refresh';
  }
  let rejected = 0;
  candidates.sort((a, b) => b.score - a.score);
  const verified = interleaveSources(candidates, 32).map(candidate => {
    const result = Date.now() >= deadline + 1500 ? null : verifyPassage(ctx, candidate, { beforeRead: beforeVerify });
    if (!result) rejected++; return result;
  }).filter(Boolean);
  // A race can invalidate an unchanged hit; rescan for fresh keyword evidence once.
  if (rejected) {
    const fresh = scanCorpus(ctx, { deadline: Math.min(deadline, Date.now() + 1500) });
    verified.push(...interleaveSources(lookup(fresh), 32).map(hit => Date.now() >= deadline + 1500 ? null : verifyPassage(ctx, hit)).filter(Boolean));
    coverage = 'partial'; reason = 'sources changed during lookup; refreshed keyword passages returned';
  }
  if (stale && ready.ready && !corpus.omitted) refresh(ctx, paths);
  const documents = interleaveSources(verified, options.limit);
  const partial = Boolean(corpus.omitted || lexicalPartial || rejected || (backend === 'qmd' && (stale || coverage === 'partial')));
  if (lexicalPartial) reason = 'keyword ranking deadline reached; selected evidence is incomplete';
  return { documents, backend, coverage, requestedModeState,
    documentSource: { state: partial ? 'partial' : documents.length ? 'ok' : 'empty', ...(reason ? { reason } : {}) } };
}
