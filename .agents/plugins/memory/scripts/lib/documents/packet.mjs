// One admission budget for the exact representation written to stdout.
export const PACKET_BYTES = 6144;
export const byteSize = value => Buffer.byteLength(typeof value === 'string' ? value : JSON.stringify(value));
const clipped = (value, max = 240) => {
  let text = String(value || '');
  if (byteSize(text) <= max) return text;
  const chars = Array.from(text);
  while (byteSize(chars.join('')) > max - 3) chars.pop();
  return `${chars.join('')}…`;
};
const cleanStatus = status => ({ state: status?.state || 'unavailable', ...(status?.reason ? { reason: clipped(status.reason, 180) } : {}) });

export function packetText(packet) {
  const lines = [`Recall v1 · scope ${packet.scope} · mode ${packet.mode} · backend ${packet.backend}`,
    `Facts: ${packet.sources.facts.state}${packet.sources.facts.reason ? ` (${packet.sources.facts.reason})` : ''}; documents: ${packet.sources.documents.state}${packet.sources.documents.reason ? ` (${packet.sources.documents.reason})` : ''}`,
    `Semantic coverage: ${packet.coverage}; requested mode: ${packet.requestedModeState}`];
  if (Object.keys(packet.filters).length) lines.push(`Fact filters: ${JSON.stringify(packet.filters)}`);
  if (packet.change) lines.push(`Change documents: ${packet.change}`);
  for (const fact of packet.facts) lines.push(`Fact #${fact.id} · ${fact.type} · ${fact.created_at} · author ${fact.author || 'unknown'} · session ${fact.session_id || 'none'} · slug ${fact.slug}\n${fact.body}\nSource: source ${fact.id}`);
  for (const doc of packet.documents) lines.push(`${doc.role} · ${doc.reference} · ${doc.heading || 'passage'} · lines ${doc.startLine}-${doc.endLine} · SHA256 ${doc.hash} · ${doc.freshness}\n${doc.text}${doc.truncated ? '\n[excerpt truncated; read original]' : ''}`);
  lines.push(`Omitted selected entries: facts ${packet.omitted.facts}; documents ${packet.omitted.documents}. Read cited originals before acting; history may be superseded.`);
  return `${lines.join('\n\n')}\n`;
}

function shorterDocument(document, fits) {
  const lines = document.text.split('\n');
  for (let length = lines.length; length > 0; length--) {
    const candidate = { ...document, text: lines.slice(0, length).join('\n'), endLine: document.startLine + length - 1,
      truncated: document.truncated || length < lines.length };
    if (hasBody(candidate.text) && fits(candidate)) return candidate;
  }
  return null;
}
const bodyLine = line => Boolean(line.trim()) && !/^\s*(?:#{1,6}\s|```|~~~)/.test(line);
const hasBody = text => text.split('\n').some(bodyLine);
function minimumDocument(document) {
  const lines = document.text.split('\n'), index = lines.findIndex(bodyLine);
  return index < 0 ? null : { ...document, text: lines.slice(0, index + 1).join('\n'), endLine: document.startLine + index,
    truncated: document.truncated || index + 1 < lines.length };
}

export function renderPacket({ question, scope = 'current', mode = 'auto', change = null, limit = 5, backend = 'lexical-fallback', coverage = 'unavailable',
  requestedModeState = 'ok', filters = {}, factSource, documentSource, facts = [], documents = [] }, { json = false, budget = PACKET_BYTES } = {}) {
  const packet = { version: 1, question: clipped(question), scope, mode, change, documentLimit: limit, backend, coverage, requestedModeState,
    filters, sources: { facts: cleanStatus(factSource), documents: cleanStatus(documentSource) },
    facts: [], documents: [], omitted: { facts: facts.length, documents: documents.length } };
  const serialize = () => json ? `${JSON.stringify(packet)}\n` : packetText(packet);
  const initial = byteSize(serialize());
  if (initial > budget) throw new Error('retrieval metadata exceeds packet budget');
  const available = budget - initial;
  const balanced = facts.length && documents.length;
  const factShare = balanced ? Math.floor(available / 2) : available;
  const docShare = balanced ? available - factShare : available;
  const admittedFacts = new Set(), admittedDocs = new Set();
  const admitFact = (fact, index, allowance) => {
    const selected = { id: fact.id, slug: fact.slug, type: fact.type, body: fact.body, author: fact.author,
      created_at: fact.created_at, session_id: fact.session_id || null, state: fact.state, superseded_by: null };
    const before = byteSize(serialize());
    packet.facts.push(selected); packet.omitted.facts--;
    const growth = byteSize(serialize()) - before;
    if (growth > allowance || byteSize(serialize()) > budget) { packet.facts.pop(); packet.omitted.facts++; return 0; }
    admittedFacts.add(index); return growth;
  };
  const admitDoc = (doc, index, allowance) => {
    const before = byteSize(serialize());
    const selected = shorterDocument(doc, candidate => {
      packet.documents.push(candidate); packet.omitted.documents--;
      const size = byteSize(serialize());
      packet.documents.pop(); packet.omitted.documents++;
      return size - before <= allowance && size <= budget;
    });
    if (!selected) return 0;
    packet.documents.push(selected); packet.omitted.documents--;
    admittedDocs.add(index); return byteSize(serialize()) - before;
  };
  let remainingFacts = factShare, remainingDocs = docShare;
  facts.slice(0, 8).forEach((fact, index) => { remainingFacts -= admitFact(fact, index, remainingFacts); });
  const selectedDocs = documents.slice(0, 5), minimumCosts = selectedDocs.map(doc => {
    const minimum = minimumDocument(doc);
    if (!minimum) return Infinity;
    const before = byteSize(serialize()); packet.documents.push(minimum); packet.omitted.documents--;
    const cost = byteSize(serialize()) - before; packet.documents.pop(); packet.omitted.documents++;
    return cost;
  });
  // Reserve a useful original passage per role before allocating more text to any one document.
  const firstRoles = new Set(), roleFirst = [], later = [];
  selectedDocs.forEach((doc, index) => {
    if (firstRoles.has(doc.role)) later.push(index);
    else { firstRoles.add(doc.role); roleFirst.push(index); }
  });
  const reserved = new Set(); let reservedBytes = 0;
  for (const index of [...roleFirst, ...later]) {
    if (reservedBytes + minimumCosts[index] <= docShare) { reserved.add(index); reservedBytes += minimumCosts[index]; }
  }
  const roles = new Set([...reserved].map(index => selectedDocs[index].role));
  const extraPerRole = (docShare - reservedBytes) / Math.max(1, roles.size);
  selectedDocs.forEach((doc, index) => {
    if (!reserved.has(index)) return;
    const count = [...reserved].filter(selected => selectedDocs[selected].role === doc.role).length;
    remainingDocs -= admitDoc(doc, index, Math.min(remainingDocs, minimumCosts[index] + Math.floor(extraPerRole / count)));
  });
  // Reclaim unused capacity without splitting fact bodies or adding extra entries.
  facts.slice(0, 8).forEach((fact, index) => { if (!admittedFacts.has(index)) admitFact(fact, index, budget - byteSize(serialize())); });
  documents.slice(0, 5).forEach((doc, index) => { if (!admittedDocs.has(index)) admitDoc(doc, index, budget - byteSize(serialize())); });
  // Expand already-admitted excerpts with reclaimed bytes, keeping other source evidence reserved.
  documents.slice(0, 5).forEach((doc, index) => {
    if (!admittedDocs.has(index)) return;
    const slot = packet.documents.findIndex(selected => selected.path === doc.path && selected.startLine === doc.startLine);
    if (slot < 0 || packet.documents[slot].text === doc.text) return;
    const [previous] = packet.documents.splice(slot, 1); packet.omitted.documents++;
    if (!admitDoc(doc, index, budget - byteSize(serialize()))) { packet.documents.push(previous); packet.omitted.documents--; }
  });
  packet.facts.sort((a, b) => facts.findIndex(fact => fact.id === a.id) - facts.findIndex(fact => fact.id === b.id));
  packet.documents.sort((a, b) => documents.findIndex(doc => doc.path === a.path && doc.startLine === a.startLine)
    - documents.findIndex(doc => doc.path === b.path && doc.startLine === b.startLine));
  return { packet, text: serialize(), bytes: byteSize(serialize()) };
}
