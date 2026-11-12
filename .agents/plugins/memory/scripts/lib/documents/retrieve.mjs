import { scanCorpus, verifyPassage } from './corpus.mjs';
import { interleaveSources, lexicalSearch } from './lexical.mjs';

// One path: scan the checkout, rank by words, then reopen each original before it is returned.
export async function retrieveDocuments(ctx, options, { corpus = scanCorpus(ctx), beforeVerify = () => {}, deadline = Date.now() + 16000 } = {}) {
  let lexicalPartial = false, reason = null;
  const lookup = source => {
    const hits = lexicalSearch(source, options.question, { ...options, deadline: Math.min(deadline + 1000, Date.now() + 1000) });
    lexicalPartial ||= hits.partial;
    return hits;
  };
  let rejected = 0;
  const verified = interleaveSources(lookup(corpus), 32).map(candidate => {
    const result = Date.now() >= deadline + 1500 ? null : verifyPassage(ctx, candidate, { beforeRead: beforeVerify });
    if (!result) rejected++; return result;
  }).filter(Boolean);
  // A race can invalidate a ranked hit; rescan for fresh keyword evidence once.
  if (rejected) {
    const fresh = scanCorpus(ctx, { deadline: Math.min(deadline, Date.now() + 1500) });
    verified.push(...interleaveSources(lookup(fresh), 32).map(hit => Date.now() >= deadline + 1500 ? null : verifyPassage(ctx, hit)).filter(Boolean));
    reason = 'sources changed during lookup; refreshed keyword passages returned';
  }
  const documents = interleaveSources(verified, options.limit);
  const partial = Boolean(corpus.omitted || lexicalPartial || rejected);
  if (corpus.omitted && !reason) reason = 'document scan incomplete; some sources were not read';
  if (lexicalPartial) reason = 'keyword ranking deadline reached; selected evidence is incomplete';
  return { documents, documentSource: { state: partial ? 'partial' : documents.length ? 'ok' : 'empty', ...(reason ? { reason } : {}) } };
}
