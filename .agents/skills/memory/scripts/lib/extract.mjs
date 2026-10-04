import { mkdirSync, writeFileSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { readFacts } from './read-facts.mjs';
import { openStore } from './store.mjs';
import { bytes, EXTRACT_LIMITS, withTask } from './extract-ledger.mjs';
import { prepareExtractHost } from './extract-host.mjs';
import { renderExtractPacket } from './extract-packet.mjs';
const MODEL_GAPS = new Set(['no_match', 'more_evidence']);
// Ownership fields stay in the enforced selector, outside the model's context.
export const candidateFact = fact => Object.fromEntries(['id', 'slug', 'type', 'body', 'author', 'created_at', 'session_id', 'superseded_by', 'state'].map(key => [key, fact[key] ?? null]));
export function validateSelection(text, pool) {
  if (typeof text !== 'string' || bytes(text) > 4096) throw new Error('invalid reply');
  const data = JSON.parse(text);
  if (!data || Array.isArray(data) || Object.keys(data).sort().join(',') !== 'gaps,queries,select,version' || data.version !== 1
    || !Array.isArray(data.select) || data.select.length > 20 || data.select.some(id => !Number.isSafeInteger(id) || !pool.has(id))
    || new Set(data.select).size !== data.select.length
    || !Array.isArray(data.queries) || data.queries.length > 2 || data.queries.some(query => typeof query !== 'string' || !query.trim() || bytes(query) > 160 || !/^[\p{L}\p{N}\s,.'?-]+$/u.test(query))
    || !Array.isArray(data.gaps) || data.gaps.length > 2 || data.gaps.some(gap => !MODEL_GAPS.has(gap))) throw new Error('invalid reply');
  return data;
}
export function admitCandidates(facts, maxBytes = 4096) {
  const admitted = [];
  for (const original of facts.slice(0, 20)) {
    const fact = candidateFact(original);
    admitted.push(fact);
    if (bytes(JSON.stringify(admitted)) > maxBytes) admitted.pop();
  }
  return { facts: admitted, truncated: admitted.length < facts.length || facts.length === 20 };
}
export const selectionPrompt = (question, scope, pool, round) => JSON.stringify({ question, scope, round, candidates: [...pool.values()] });
const forbidden = error => ['auth', 'forbidden'].includes(error.kind);
export async function extractMemory(ctx, { task, identity, scope = {}, question, loaded = [], agent, model, usageReport = false }, dependencies = {}) {
  const started = Date.now(), deadline = started + EXTRACT_LIMITS.deadline;
  const report = { version: 1, experimental: true, evidence: dependencies.host ? 'recorded protocol' : 'live host', agent: agent || 'unknown', model: model || null, inputBytes: 0, outputBytes: 0, candidateSearches: 0, storeRequests: 0, modelCalls: 0, usage: [], tokenUsage: 'unknown' };
  const requestAbort = new AbortController();
  const timer = setTimeout(() => requestAbort.abort(), EXTRACT_LIMITS.deadline);
  let host;
  try {
    return await withTask(ctx, task, identity, deadline, async ({ ledger, reserve, reserveWork, remember }) => {
      if (EXTRACT_LIMITS.output - ledger.output < bytes(renderExtractPacket([], { status: 'partial', gaps: ['output_limit'] }).text)) {
        report.status = 'partial'; report.gaps = ['output_limit']; report.returned = [];
        return { text: '', ids: [], omitted: 0, status: 'partial', code: 3, report };
      }
      let store, initial = [], selected = [], status = 'selected'; const gaps = [], pool = new Map();
      const remaining = () => Math.max(0, deadline - Date.now());
      const query = async (terms, ids) => {
        if (remaining() <= 0) throw new Error('deadline');
        return readFacts(ctx, { values: { ...scope, limit: 20 }, positionals: ids ? [] : [terms], ...(ids ? { ids } : {}) }, store);
      };
      const search = async terms => {
        if (!reserve('searches', 1)) { gaps.push('search_limit'); return []; }
        report.candidateSearches += 1;
        const admitted = admitCandidates((await query(terms)).facts);
        if (admitted.truncated) gaps.push('candidate_limit');
        for (const fact of admitted.facts) pool.set(fact.id, fact);
        return admitted.facts;
      };
      try {
        store = dependencies.store ? { ...dependencies.store, query: (...args) => { report.storeRequests += 1; return dependencies.store.query(...args); } } : openStore(ctx, { signal: requestAbort.signal, timeoutMs: EXTRACT_LIMITS.deadline, onRequest: () => { report.storeRequests += 1; } });
        initial = await search(question);
        selected = initial.map(fact => fact.id);
        // Empty initial hits can still need reformulation; the model never sees unrelated full chats.
        host = dependencies.host || await prepareExtractHost({ agent, model, signal: AbortSignal.any([requestAbort.signal, AbortSignal.timeout(Math.max(1, remaining() - 3000))]) });
        if (!host.supported) { status = 'fallback'; gaps.push(host.reason || 'unsupported_host'); }
        else {
          for (let round = 1; round <= 2; round += 1) {
            if (ledger.calls >= EXTRACT_LIMITS.calls) { status = 'fallback'; gaps.push('call_limit'); selected = initial.map(fact => fact.id); break; }
            // Later reformulated hits get first room; retain first-round selections next.
            const initialIds = new Set(initial.map(fact => fact.id));
            const selectedIds = new Set(selected);
            const ordered = round === 1 ? [...pool.values()] : [...pool.values()].sort((a, b) => Number(initialIds.has(a.id)) - Number(initialIds.has(b.id)) || Number(selectedIds.has(b.id)) - Number(selectedIds.has(a.id)));
            const suppliedPool = new Map(ordered.map(fact => [fact.id, fact]));
            let prompt = selectionPrompt(question, scope, suppliedPool, round);
            while (suppliedPool.size && host.inputBytes(prompt) > EXTRACT_LIMITS.input - ledger.input) {
              suppliedPool.delete([...suppliedPool.keys()].at(-1));
              prompt = selectionPrompt(question, scope, suppliedPool, round);
              if (!gaps.includes('input_limit')) gaps.push('input_limit');
            }
            const supplied = host.inputBytes(prompt);
            if (remaining() <= 3000) throw new Error('deadline');
            if (!reserveWork(supplied)) { status = 'fallback'; gaps.push('input_limit'); selected = initial.map(fact => fact.id); break; }
            report.inputBytes += supplied;
            report.modelCalls += 1;
            const modelSignal = AbortSignal.any([requestAbort.signal, AbortSignal.timeout(remaining() - 3000)]);
            const reply = await host.call(prompt, modelSignal);
            report.usage.push(reply.usage || null); report.model = reply.model || report.model;
            const choice = validateSelection(reply.text, suppliedPool);
            selected = choice.select; gaps.push(...choice.gaps);
            if (round === 2 || !choice.queries.length) { if (round === 2 && choice.queries.length) gaps.push('more_evidence'); break; }
            for (const terms of choice.queries) await search(terms);
          }
        }
      } catch (error) {
        if (forbidden(error)) { status = 'denied'; gaps.push('store_denied'); selected = []; }
        else if (error.kind) { status = 'unavailable'; gaps.push('store_unavailable'); selected = []; }
        else { status = 'fallback'; gaps.push(/deadline|timeout/i.test(error.message) ? 'deadline' : /reply|JSON/i.test(error.message) ? 'invalid_reply' : 'model_unavailable'); selected = initial.map(fact => fact.id); }
      }
      const seen = new Set([...ledger.returned, ...loaded]);
      if (selected.some(id => seen.has(id))) gaps.push('already_supplied');
      selected = selected.filter(id => !seen.has(id)).slice(0, 20);
      let verified = [];
      if (selected.length) {
        try {
          const fresh = (await query('', selected)).facts;
          const byId = new Map(fresh.map(fact => [fact.id, fact]));
          verified = selected.flatMap(id => byId.has(id) ? [byId.get(id)] : []);
          if (verified.length !== selected.length) { gaps.push('changed_evidence'); status = 'partial'; }
          if (verified.some(fact => JSON.stringify(candidateFact(fact)) !== JSON.stringify(pool.get(fact.id)))) { gaps.push('changed_evidence'); status = 'partial'; }
        } catch (error) { verified = []; status = forbidden(error) ? 'denied' : 'unavailable'; gaps.push(forbidden(error) ? 'store_denied' : 'store_unavailable'); }
      }
      if (status === 'selected') status = verified.length ? (gaps.length ? 'partial' : 'selected') : (gaps.length ? 'partial' : 'empty');
      const packet = renderExtractPacket(verified, { status, gaps, maxBytes: EXTRACT_LIMITS.output - ledger.output });
      if (!reserve('output', bytes(packet.text))) throw new Error('output reservation failed');
      remember(packet.ids);
      report.outputBytes = bytes(packet.text); report.status = packet.status; report.gaps = packet.gaps; report.returned = packet.ids;
      return { ...packet, code: packet.text ? Number(['denied', 'unavailable'].includes(packet.status)) : 3, report };
    });
  } finally {
    clearTimeout(timer); requestAbort.abort(); host?.close?.();
    report.elapsedMs = Date.now() - started;
    if (report.usage.length && report.usage.every(usage => usage && Number.isFinite(usage.input_tokens) && Number.isFinite(usage.output_tokens))) report.tokenUsage = 'provider-reported';
    if (usageReport) {
      const directory = join(ctx.stateDir, 'extract-reports'); mkdirSync(directory, { recursive: true, mode: 0o700 });
      writeFileSync(join(directory, `${randomUUID()}.json`), JSON.stringify(report), { mode: 0o600 });
    }
  }
}
