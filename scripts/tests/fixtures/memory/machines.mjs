// Synthetic source-only infrastructure and intentionally nontransactional SQLite transport.
import { operatorFixture } from './operator.mjs';
import { inspectMachinePins, initializeMachineMemory, readMachineSetupStatus } from '../../../../.agents/skills/memory/scripts/lib/machine-operator.mjs';
import { issueMachineGrant, enrollMemoryMachine } from '../../../../.agents/skills/memory/scripts/lib/machine-enrollment.mjs';

export const MACHINE = 'fixture-machine'.padEnd(32, '0');
export const GRANT = 'fixture-machine-grant'.padEnd(32, '0');
export const COMMITMENT = 'c'.repeat(64);
export const CAPABILITY_HASH = 'e'.repeat(64);
export const CREDENTIAL_HASH = 'f'.repeat(64);
export const attempt = name => name.padEnd(32, '0');
export const codeRejected = code => error => error.code === code && error.message === code;

export function machineFixture(t, options) {
  const f = operatorFixture(t, options);
  const provider = f.operator.cloudflare;
  f.beforeStatement = null; f.afterStatement = null; f.statementBatches = [];
  f.operator.cloudflare = async (method, path, body) => {
    if (method !== 'POST' || !body?.batch) return provider(method, path, body);
    f.calls.push({ method, path });
    if (f.intercept) {
      const answer = await f.intercept(method, path, body);
      if (answer !== undefined) return answer;
    }
    f.batches++; f.statementBatches.push(structuredClone(body.batch));
    if (f.atomic) f.db.exec('BEGIN');
    try {
      for (const [index, statement] of body.batch.entries()) {
        if (f.beforeStatement) await f.beforeStatement(index, statement);
        if (index === f.failAt) throw new Error('Synthetic partial machine mutation');
        if (statement.params.length) f.db.prepare(statement.sql).run(...statement.params);
        else f.db.exec(statement.sql);
        if (f.afterStatement) await f.afterStatement(index, statement);
      }
      if (f.atomic) f.db.exec('COMMIT');
    } catch (error) { if (f.atomic) f.db.exec('ROLLBACK'); throw error; }
    if (f.loseResponse) { f.loseResponse = false; throw new Error('Synthetic private provider response loss'); }
    return body.batch.map(() => ({ success: true, results: [] }));
  };
  f.snapshot = () => f.db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all()
    .map(({ name }) => [name, f.db.prepare(`SELECT * FROM "${name}"`).all().map(row => ({ ...row }))]);
  return f;
}
export async function machineInput(f) {
  return { target: { ...f.target }, operationId: attempt('machine-bootstrap'), expectedInstallation: null,
    pinHash: await inspectMachinePins(f.operator, f.target) };
}
export async function preparedMachineFixture(t, options) {
  const f = machineFixture(t, options); f.input = await machineInput(f);
  f.initial = await initializeMachineMemory(f.operator, f.input);
  f.installation = f.initial.installation;
  f.expected = async () => (await readMachineSetupStatus(f.operator, { installation: f.installation })).snapshot;
  return f;
}
export async function issueInput(f, changes = {}) {
  return { installation: f.installation, attemptId: attempt('issue'), expected: await f.expected(), grantId: GRANT,
    machineCommitment: COMMITMENT, capabilityHash: CAPABILITY_HASH, scope: 'memory:read memory:write',
    expiresAt: Math.floor(Date.now() / 1000) + 600, ...changes };
}
export async function enrollInput(f, changes = {}) {
  return { installation: f.installation, attemptId: attempt('enroll'), expected: await f.expected(), grantId: GRANT, machineId: MACHINE,
    machineCommitment: COMMITMENT, capabilityHash: CAPABILITY_HASH, scope: 'memory:read memory:write', credentialHash: CREDENTIAL_HASH,
    credentialExpiresAt: Math.floor(Date.now() / 1000) + 2592000, ...changes };
}
export async function enrolledMachineFixture(t) {
  const f = await preparedMachineFixture(t);
  f.issue = await issueInput(f); await issueMachineGrant(f.operator, f.issue);
  f.enroll = await enrollInput(f); await enrollMemoryMachine(f.operator, f.enroll);
  return f;
}
export async function revokeInput(f, changes = {}) {
  return { installation: f.installation, attemptId: attempt('revoke'), expected: await f.expected(), machineId: MACHINE,
    machineRevision: 1, grantRevision: 2, ...changes };
}
