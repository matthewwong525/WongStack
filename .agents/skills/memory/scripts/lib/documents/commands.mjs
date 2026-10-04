import { openStore } from '../store.mjs';
import { readFacts } from '../read-facts.mjs';
import { scanCorpus, verifyPassage } from './corpus.mjs';
import { interleaveSources, lexicalSearch } from './lexical.mjs';
import { validateRetrieval, RetrievalInputError } from './input.mjs';
import { documentPaths, refreshIndex } from './state.mjs';
import { prepareIndex, runtimeReady } from './qmd.mjs';
import { documentsStatus, setupDocuments } from './setup.mjs';
import { retrieveDocuments } from './retrieve.mjs';
import { renderPacket } from './packet.mjs';

export async function recallPacket(ctx, options, { includeFacts = true, paths = documentPaths(ctx),
  factsRead = (signal) => readFacts(ctx, { positionals: [options.question], values: { ...options.filters, limit: 8 } }, openStore(ctx, { signal, timeoutMs: 16000 })),
  documentsRead = retrieveDocuments, timeoutMs = 19000 } = {}) {
  const deadline = Date.now() + Math.min(19000, timeoutMs), controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, deadline - Date.now()));
  let onDocumentTimeout;
  const factPromise = includeFacts ? Promise.resolve().then(() => factsRead(controller.signal)).then(result => ({ facts: result.facts,
    filters: result.filters, factSource: { state: result.facts.length ? 'ok' : 'empty' } })).catch(error => ({ facts: [],
    factSource: { state: ['auth', 'forbidden'].includes(error.kind) ? 'denied' : 'unavailable', reason: ['auth', 'forbidden'].includes(error.kind) ? 'fact access refused' : 'fact memory unavailable; documents remain usable' } }))
    : Promise.resolve({ facts: [], factSource: { state: 'empty', reason: 'not requested' } });
  // A dependency that ignores cancellation cannot hold the packet past its deadline.
  const boundedFacts = Promise.race([factPromise, new Promise(resolve => {
    controller.signal.addEventListener('abort', () => resolve({ facts: [], factSource: { state: 'unavailable', reason: 'fact deadline reached' } }), { once: true });
  })]);
  try {
    const documentPromise = Promise.resolve().then(() => documentsRead(ctx, options, paths, { signal: controller.signal, deadline: deadline - 2000 }))
      .catch(() => ({ documents: [], backend: 'lexical-fallback', coverage: 'unavailable', requestedModeState: 'unavailable',
        documentSource: { state: 'unavailable', reason: 'document corpus unavailable' } }));
    const boundedDocuments = Promise.race([documentPromise, new Promise(resolve => {
      onDocumentTimeout = () => {
        let documents = [];
        try { documents = interleaveSources(lexicalSearch(scanCorpus(ctx, { deadline: Date.now() + 400 }), options.question, { ...options, deadline: Date.now() + 800 })
          .map(hit => verifyPassage(ctx, hit)).filter(Boolean), options.limit); } catch { /* explicit unavailable source below */ }
        resolve({ documents, backend: 'lexical-fallback', coverage: 'unavailable', requestedModeState: 'unavailable',
          documentSource: { state: documents.length ? 'partial' : 'unavailable', reason: 'document deadline reached; verified keyword evidence retained' } });
      };
      controller.signal.addEventListener('abort', onDocumentTimeout, { once: true });
    })]);
    const [fact, documents] = await Promise.all([boundedFacts, boundedDocuments]);
    const rendered = renderPacket({ ...options, ...fact, ...documents,
      filters: Object.fromEntries(Object.entries(fact.filters || options.filters).filter(([key]) => ['tag', 'type', 'slug', 'since', 'until'].includes(key))) }, { json: options.json });
    const usable = ['ok', 'empty', 'partial'].includes(fact.factSource.state) && includeFacts
      || ['ok', 'empty', 'partial'].includes(documents.documentSource.state);
    return { ...rendered, code: usable ? 0 : 1 };
  } finally { clearTimeout(timer); controller.signal.removeEventListener('abort', onDocumentTimeout); controller.abort(); }
}
const lookup = includeFacts => async (ctx, { positionals, values }) => {
  const options = validateRetrieval(positionals.join(' '), values, { recall: includeFacts });
  const result = await recallPacket(ctx, options, { includeFacts });
  process.stdout.write(result.text); process.exitCode = result.code;
};
function controlInput(values, keys) {
  if (Object.keys(values).some(key => !keys.includes(key))) throw new RetrievalInputError('Unsupported document management option');
}
export const DOCUMENT_COMMANDS = {
  documents: lookup(false), recall: lookup(true),
  'documents-status': (ctx, { values }) => { controlInput(values, ['json', 'help']); console.log(JSON.stringify(documentsStatus(documentPaths(ctx), scanCorpus(ctx)))); },
  'documents-setup': async (ctx, { values }) => { controlInput(values, ['deep', 'cpu', 'json', 'help']);
    console.log(JSON.stringify(await setupDocuments(ctx, documentPaths(ctx), { deep: values.deep, cpu: values.cpu }))); },
  'documents-refresh': async (ctx, { values }) => {
    controlInput(values, ['json', 'help']);
    const paths = documentPaths(ctx), ready = runtimeReady(paths), corpus = scanCorpus(ctx);
    if (corpus.omitted) throw new Error('Document scan incomplete; split oversized sources or retry');
    const signal = AbortSignal.timeout(300000);
    const result = await refreshIndex(ctx, corpus, paths, { signal, waitMs: 20000, prepare: ready.ready
      ? (dir, delta, signal) => prepareIndex(paths, dir, delta, signal, ready.marker) : undefined });
    console.log(JSON.stringify({ ...result, backend: ready.ready ? 'qmd' : 'lexical-fallback', ...(ready.reason ? { reason: ready.reason } : {}) }));
  },
};
