import { bytes, EXTRACT_LIMITS } from './extract-ledger.mjs';
export const GAP_CODES = Object.freeze(['no_match', 'more_evidence', 'candidate_limit', 'input_limit', 'output_limit', 'search_limit', 'call_limit', 'deadline', 'unsupported_host', 'model_unavailable', 'invalid_reply', 'changed_evidence', 'already_supplied', 'store_unavailable', 'store_denied']);
export const factEntry = fact => `Fact #${fact.id} · ${fact.created_at} · author: ${fact.author || '(unknown)'} · session: ${fact.session_id || '(none)'}\n${fact.body}\n`;
export function renderExtractPacket(facts, { status = 'selected', gaps = [], maxBytes = EXTRACT_LIMITS.output } = {}) {
  const validGaps = [...new Set(gaps.filter(gap => GAP_CODES.includes(gap)))];
  const admitted = [];
  // Always budget the final omission/status notice before admitting another whole body.
  const render = () => `Memory extract (experimental) · ${status}\nSource: source <fact-id>\n${admitted.map(factEntry).join('\n')}\nGaps: ${[...validGaps, ...(admitted.length < facts.length ? ['output_limit'] : [])].join(', ') || 'none reported'}; selected ${facts.length}; returned ${admitted.length}; other matches may exist.\n`;
  if (bytes(render()) > maxBytes) return { text: '', ids: [], omitted: facts.length, status: 'partial', gaps: [...validGaps, 'output_limit'] };
  for (const fact of facts) {
    admitted.push(fact);
    if (bytes(render()) > maxBytes) admitted.pop();
  }
  if (admitted.length < facts.length && status === 'selected') status = 'partial';
  return { text: render(), ids: admitted.map(fact => fact.id), omitted: facts.length - admitted.length, status, gaps: [...validGaps, ...(admitted.length < facts.length ? ['output_limit'] : [])] };
}
