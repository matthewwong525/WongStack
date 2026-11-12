import { loadProfile, openStore } from '../store.mjs';
import { loadAreas } from '../areas.mjs';
import { filesBehind } from '../files.mjs';
import { readFacts } from '../read-facts.mjs';
import { recordUse, weakAnswer } from '../usage.mjs';
import { scanCorpus, verifyPassage } from './corpus.mjs';
import { interleaveSources, lexicalSearch } from './lexical.mjs';
import { validateRetrieval } from './input.mjs';
import { retrieveDocuments } from './retrieve.mjs';
import { renderPacket } from './packet.mjs';
const REFUSED = ['auth', 'forbidden', 'signin'];
const FILES_MS = 1500;

// The files behind the facts, within FILES_MS and the recall deadline; a failure leaves the facts as they are.
async function factFiles(ctx, facts, { profile, deadline }) {
  if (!facts.length) return { files: [], state: 'empty' };
  try {
    const chosen = profile === undefined ? await loadProfile(ctx) : profile;
    return await filesBehind(ctx, facts.slice(0, 8), { profile: chosen, areas: await loadAreas(ctx, chosen), limit: 16,
      deadline: Math.min(deadline, Date.now() + FILES_MS) });
  } catch { return { files: [], state: 'unavailable' }; }
}

export async function recallPacket(ctx, options, { includeFacts = true,
  factsRead = (signal) => readFacts(ctx, { positionals: [options.question], values: { ...options.filters, limit: 8, withTags: true } }, openStore(ctx, { signal, timeoutMs: 16000 })),
  documentsRead = retrieveDocuments, timeoutMs = 19000, profile } = {}) {
  const deadline = Date.now() + Math.min(19000, timeoutMs), controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Math.max(1, deadline - Date.now()));
  let onDocumentTimeout;
  const factPromise = includeFacts ? Promise.resolve().then(() => factsRead(controller.signal)).then(result => ({ facts: result.facts,
    filters: result.filters, factSource: { state: result.facts.length ? 'ok' : 'empty' } })).catch(error => ({ facts: [],
    factSource: REFUSED.includes(error.kind) ? { state: 'denied', reason: error.kind === 'signin' ? 'not signed in to the company app; documents remain usable' : 'fact access refused' }
      : { state: 'unavailable', reason: 'fact memory unavailable; documents remain usable' } }))
    : Promise.resolve({ facts: [], factSource: { state: 'empty', reason: 'not requested' } });
  // A dependency that ignores cancellation cannot hold the packet past its deadline.
  const boundedFacts = Promise.race([factPromise, new Promise(resolve => {
    controller.signal.addEventListener('abort', () => resolve({ facts: [], factSource: { state: 'unavailable', reason: 'fact deadline reached' } }), { once: true });
  })]);
  try {
    const documentPromise = Promise.resolve().then(() => documentsRead(ctx, options, { deadline: deadline - 2000 }))
      .catch(() => ({ documents: [], documentSource: { state: 'unavailable', reason: 'document corpus unavailable' } }));
    const boundedDocuments = Promise.race([documentPromise, new Promise(resolve => {
      onDocumentTimeout = () => {
        let documents = [];
        try { documents = interleaveSources(lexicalSearch(scanCorpus(ctx, { deadline: Date.now() + 400 }), options.question, { ...options, deadline: Date.now() + 800 })
          .map(hit => verifyPassage(ctx, hit)).filter(Boolean), options.limit); } catch { /* unavailable below */ }
        resolve({ documents, documentSource: { state: documents.length ? 'partial' : 'unavailable', reason: 'document deadline reached; verified keyword evidence retained' } });
      };
      controller.signal.addEventListener('abort', onDocumentTimeout, { once: true });
    })]);
    const withFiles = boundedFacts.then(async fact => {
      if (!includeFacts) return fact;
      const { files, state } = await factFiles(ctx, fact.facts, { profile, deadline });
      return { ...fact, files, fileSource: state === 'unavailable' ? { state, reason: 'file history unavailable; facts and documents remain usable' } : undefined };
    });
    const [fact, documents] = await Promise.all([withFiles, boundedDocuments]);
    const rendered = renderPacket({ ...options, ...fact, ...documents,
      filters: Object.fromEntries(Object.entries(fact.filters || options.filters).filter(([key]) => ['tag', 'type', 'slug', 'since', 'until'].includes(key))) }, { json: options.json });
    const usable = ['ok', 'empty', 'partial'].includes(fact.factSource.state) && includeFacts
      || ['ok', 'empty', 'partial'].includes(documents.documentSource.state);
    return { ...rendered, code: usable ? 0 : 1, found: { facts: fact.facts, documents: documents.documents || [], state: fact.factSource.state } };
  } finally { clearTimeout(timer); controller.signal.removeEventListener('abort', onDocumentTimeout); controller.abort(); }
}
const lookup = includeFacts => async (ctx, { positionals, values }) => {
  const options = validateRetrieval(positionals.join(' '), values, { recall: includeFacts });
  const result = await recallPacket(ctx, options, { includeFacts });
  process.stdout.write(result.text); process.exitCode = result.code;
  if (includeFacts) recordUse(ctx, recallUse(options.question, result.found));
};
// A recall as a use count: the facts and their tags it gave, or a miss when a readable memory gave no answer.
function recallUse(words, { facts, documents, state }) {
  const miss = ['ok', 'empty'].includes(state) && weakAnswer(words, [...facts.map(fact => fact.body), ...documents.map(doc => doc.text)]);
  return { command: 'recall', facts: miss ? [] : facts.map(fact => fact.id), topics: miss ? [] : facts.flatMap(fact => fact.tags || []), miss, words };
}
export const DOCUMENT_COMMANDS = { documents: lookup(false), recall: lookup(true) };
