// Score the mixed practice run's selected probes, observed reads, and actual final comment.
// The hidden key is supplied by the harness, never copied into the walking agent's folder.
const normalize = value => String(value ?? '').trim().toLowerCase();
const reportRows = comment => new Map(String(comment ?? '').split('\n').flatMap(line => {
  const columns = line.split('|').map(value => value.trim());
  return columns.length >= 4 ? [[normalize(columns[1]), { verdict: normalize(columns[2]), text: columns.slice(3).join(' ') }]] : [];
}));

function readbackFor(path, observations) {
  const writes = observations.filter(entry => entry.path === path && entry.method === 'POST' && entry.submitted);
  return writes.flatMap(write => {
    const start = observations.indexOf(write);
    return observations.slice(start + 1).filter(entry => entry.method === 'GET' && (entry.path === path || `/api${entry.path}` === path) && typeof entry.stored === 'string')
      .map(read => ({ submitted: write.submitted, stored: read.stored, writeAt: write.at, readAt: read.at }));
  });
}

function consumerObservation(observations) {
  return observations.some((entry, index) => {
    if (entry.path !== '/exports' || !Array.isArray(entry.titles)) return false;
    const producer = observations.slice(index + 1).find(read => read.path === '/api/notes' && Array.isArray(read.response?.notes));
    return producer && producer.response.notes.length === entry.titles.length && producer.response.notes.some((note, at) => typeof note.title === 'string' && note.title !== entry.titles[at]);
  });
}

function captureObservation(path, observations) {
  const record = observations.find(entry => entry.path === path && entry.capture !== undefined)?.capture;
  if (path.endsWith('/lookup-d')) {
    try { JSON.parse(record); return false; } catch { return typeof record === 'string'; }
  }
  if (!record || typeof record !== 'object') return false;
  if (path.endsWith('/lookup-c')) return /^[b]{40}$/.test(record.subjectSha);
  if (path.endsWith('/lookup-e')) return record.subjectSha === 'a'.repeat(40) && record.baseline && record.inputSha256 !== record.baseline.inputSha256;
  try {
    const output = JSON.parse(record.stdout);
    return record.subjectSha === 'a'.repeat(40) && record.exitCode === 0 && Array.isArray(output.docs)
      && (path.endsWith('/lookup-a') ? output.area === 'notes' && output.docs.includes('wiki/notes.md') : output.area === 'exports' && !output.docs.includes('wiki/exports.md'));
  } catch { return false; }
}

export function scoreMixed(key, { verdicts, selected = [], observations = [], comment = '' }) {
  const entries = new Map((Array.isArray(verdicts) ? verdicts : []).map(entry => [normalize(entry.scenario), entry.verdict]));
  const selections = new Set(selected.map(normalize));
  const rows = reportRows(comment);
  const scenarios = {};
  const counts = { caught: 0, missed: 0, falsePasses: 0, falseAlarms: 0, correct: 0, namedGaps: 0, unnamedGaps: 0, irrelevantSelections: 0, reportCorrect: 0, reportWrong: 0 };
  for (const [name, expected] of Object.entries(key)) {
    const verdict = entries.get(normalize(name)) ?? null;
    const selectedCheck = selections.has(normalize(name)) || entries.has(normalize(name));
    const observed = observations.some(entry => entry.path === expected.path);
    const readbacks = expected.readback ? readbackFor(expected.path, observations) : [];
    const readbackShown = !expected.readback || readbacks.some(read => expected.truth === 'broken' ? read.submitted !== read.stored : read.submitted === read.stored);
    const captureShown = !expected.path.startsWith('/practice/evidence/') || captureObservation(expected.path, observations);
    const consumerShown = !expected.consumer || consumerObservation(observations);
    const observedCheck = selectedCheck && observed && readbackShown && captureShown && consumerShown;
    const row = rows.get(normalize(name));
    const reportCorrect = observedCheck && row?.verdict === expected.report && (!expected.limit || new RegExp(expected.limit, 'i').test(row.text));
    if (expected.truth === 'control') {
      if (selectedCheck) counts.irrelevantSelections += 1;
    } else {
      if (reportCorrect) counts.reportCorrect += 1;
      else counts.reportWrong += 1;
      if (expected.truth === 'broken') {
        if (verdict === 'fail' && observedCheck) counts.caught += 1;
        else counts.missed += 1;
      } else if (expected.truth === 'works') {
        if (verdict === 'pass' && observedCheck) counts.correct += 1;
        if (['fail', 'partial'].includes(verdict)) counts.falseAlarms += 1;
      } else if (expected.truth === 'gap') {
        if (observedCheck && ['ask', 'unverified'].includes(verdict) && reportCorrect) counts.namedGaps += 1;
        else counts.unnamedGaps += 1;
      }
      if (verdict === 'pass' && (expected.truth !== 'works' || !observedCheck)) counts.falsePasses += 1;
    }
    scenarios[name] = { verdict, selected: selectedCheck, observed, observedCheck, readbacks, report: row ?? null, reportCorrect };
  }
  const consumer = Object.entries(key).find(([, value]) => value.consumer)?.[0];
  const consumerRow = consumer && scenarios[consumer];
  const consumerReason = consumerRow?.report?.text ?? '';
  return {
    ...counts, scenarios,
    consumerChecked: Boolean(consumerRow?.observedCheck),
    consumerReasoned: Boolean(consumerRow?.observedCheck && /title/i.test(consumerReason) && /notes|\/api\/notes/i.test(consumerReason)),
    practiceLabelled: /practice/i.test(comment),
    currentRevisionNamed: /aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa/.test(comment),
    overallCorrect: /^\s*(?:#{1,6}\s*)?(?:\*\*)?(?:(?:overall(?:\s+verdict)?|verdict)\s*:\s*)?FAILURE(?:\*\*)?\s*$/im.test(comment),
  };
}
