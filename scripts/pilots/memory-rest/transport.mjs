import { checkedPlan, need, phaseRecord, ProbeError, record } from './plan.mjs';

export function boundedTransport(context, plan, limit) {
  const base = `/accounts/${plan.target.accountId}`;
  let calls = 0;
  return async (method, path, body) => {
    const queryPath = `${base}/d1/database/${plan.target.databaseId}/query`;
    const local = path.slice(base.length).split('?')[0];
    const readAllowed = local === `/d1/database/${plan.target.databaseId}` || local === '/workers/subdomain' ||
      /^\/workers\/workers\/[a-z0-9-]+$/.test(local) ||
      /^\/workers\/scripts\/[a-z0-9-]+\/(?:settings|deployments|versions\/[a-f0-9-]+)$/.test(local) ||
      /^\/access\/(?:organizations|apps(?:\/[a-zA-Z0-9_-]+(?:\/policies)?)?)$/.test(local) ||
      /^\/r2\/buckets\/[a-z0-9-]+$/.test(local);
    need(path.startsWith(`${base}/`) && !path.includes('..') &&
      (method === 'GET' && readAllowed || method === 'POST' && path === queryPath), 'transport-scope-denied');
    need(++calls <= limit, 'request-budget-exhausted');
    // Parent transport must honor this signal. Timeout makes any write ambiguous;
    // execution stops and retains evidence/resources, rather than retrying cleanup.
    const signal = AbortSignal.timeout(plan.limits.requestTimeoutMs);
    return context.cloudflare(method, path, body, { signal });
  };
}
export async function query(transport, plan, sql, params = []) {
  const result = await transport('POST', `/accounts/${plan.target.accountId}/d1/database/${plan.target.databaseId}/query`, { sql, params });
  need(Array.isArray(result) && result.length === 1 && result[0]?.success === true && Array.isArray(result[0].results), 'query-receipt-invalid');
  return result[0].results;
}
export async function batch(transport, plan, statements) {
  const result = await transport('POST', `/accounts/${plan.target.accountId}/d1/database/${plan.target.databaseId}/query`, { batch: statements });
  need(Array.isArray(result) && result.length > 0 && result.every(row => row?.success === true), 'batch-receipt-invalid');
}
export async function emptyTarget(transport, plan) {
  const info = await transport('GET', `/accounts/${plan.target.accountId}/d1/database/${plan.target.databaseId}`);
  need(info?.uuid === plan.target.databaseId && info.name === plan.target.databaseName, 'provider-target-mismatch');
  const objects = await query(transport, plan, "SELECT name FROM sqlite_master WHERE name NOT GLOB 'sqlite_*' AND name NOT GLOB '_cf_*'");
  need(objects.length === 0, 'target-not-empty');
}

function scenario(prefix, fail) {
  const tables = ['parent', 'metadata', 'completion'].map(name => `${prefix}_${name}`);
  const [parent, metadata, completion] = tables;
  const marker = `${prefix}_expected_failure`;
  const statements = [{ sql: `CREATE TABLE ${parent} (id TEXT PRIMARY KEY);
    CREATE TABLE ${metadata} (id TEXT PRIMARY KEY REFERENCES ${parent}(id), complete INTEGER CONSTRAINT ${marker} CHECK (complete = 1));
    CREATE TABLE ${completion} (id TEXT PRIMARY KEY REFERENCES ${metadata}(id));
    CREATE TRIGGER ${prefix}_immutable BEFORE UPDATE ON ${completion} BEGIN SELECT RAISE(ABORT, 'probe completion is immutable'); END;`, params: [] },
  { sql: `INSERT INTO ${parent} (id) VALUES (?)`, params: ['one'] },
  { sql: `INSERT INTO ${metadata} (id, complete) VALUES (?, 1)`, params: ['one'] },
  { sql: `INSERT INTO ${completion} (id) VALUES (?)`, params: ['one'] }];
  if (fail) statements.push({ sql: `UPDATE ${metadata} SET complete = 0 WHERE id = ?`, params: ['one'] });
  return { tables, marker, statements };
}

// Explicit mutation entrypoint. Only the coordinating operator invokes it after review.
export async function runRestTransportProbe(context, input, expectedPlan) {
  const plan = await checkedPlan(context, input, expectedPlan);
  const transport = boundedTransport(context, plan, plan.limits.transportCalls);
  const positive = scenario(`${plan.tablePrefix}_ok`, false);
  const negative = scenario(`${plan.tablePrefix}_rollback`, true);
  const expectedTables = [...positive.tables, ...negative.tables];
  await record(context, phaseRecord(plan, 'transport', 'INTENT', { expectedTables }));
  try {
    await emptyTarget(transport, plan);
    await batch(transport, plan, positive.statements);
    const receipt = await query(transport, plan, `SELECT count(*) n FROM ${positive.tables[2]} c JOIN ${positive.tables[1]} m USING (id) JOIN ${positive.tables[0]} p USING (id)`);
    need(receipt.length === 1 && receipt[0].n === 1, 'positive-receipt-missing');
    await record(context, phaseRecord(plan, 'transport', 'POSITIVE_OBSERVED', { tables: positive.tables }));
    let expectedFailure = false;
    try { await batch(transport, plan, negative.statements); }
    catch (error) {
      // Classify privately; never print the provider's message, SQL or request body.
      expectedFailure = typeof error?.message === 'string' && error.message.includes(negative.marker);
    }
    need(expectedFailure, 'expected-constraint-not-observed');
    const leftovers = await query(transport, plan, 'SELECT name FROM sqlite_master WHERE name GLOB ?', [`${plan.tablePrefix}_rollback_*`]);
    need(leftovers.length === 0, 'rollback-left-effects');
    await record(context, phaseRecord(plan, 'transport', 'ROLLBACK_OBSERVED', { leftovers: 0 }));
    // Only the named positive-case tables created above. Never clear the database.
    await record(context, phaseRecord(plan, 'transport', 'CLEANUP_INTENT', { tables: positive.tables.toReversed() }));
    await batch(transport, plan, positive.tables.toReversed().map(name => ({ sql: `DROP TABLE ${name}`, params: [] })));
    await emptyTarget(transport, plan);
    const result = phaseRecord(plan, 'transport', 'PASS', { positiveObserved: true, rollbackObserved: true, emptyAfterCleanup: true });
    await record(context, result);
    return result;
  } catch (error) {
    const code = error instanceof ProbeError ? error.code : 'provider-or-record-failure';
    await record(context, phaseRecord(plan, 'transport', 'FAIL', { code, retainForInspection: true }));
    throw new ProbeError(code);
  }
}
