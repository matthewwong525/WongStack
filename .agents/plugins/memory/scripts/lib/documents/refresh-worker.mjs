// Detached refresh has a five-minute ceiling and never touches private memory.
import { repoContext } from '../store.mjs';
import { scanCorpus } from './corpus.mjs';
import { documentPaths, refreshIndex } from './state.mjs';
import { prepareIndex, runtimeReady } from './qmd.mjs';

try {
  const ctx = repoContext(process.argv[2]), paths = documentPaths(ctx, { dataDir: process.argv[3] });
  const ready = runtimeReady(paths), signal = AbortSignal.timeout(300000);
  if (!ready.ready) process.exitCode = 1;
  else {
    const corpus = scanCorpus(ctx);
    if (corpus.omitted) throw new Error('bounded scan incomplete');
    await refreshIndex(ctx, corpus, paths, { signal, prepare: (dir, delta, signal) => prepareIndex(paths, dir, delta, signal, ready.marker) });
  }
} catch { process.exitCode = 1; }
