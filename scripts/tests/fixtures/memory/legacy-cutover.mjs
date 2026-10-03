// Real historical release SQL in disposable fixtures; no live targets or secrets.
import { operatorFixture, inputFor } from './operator.mjs';
import { completedSchema10 } from './schema10.mjs';
import { applyMigrations, migrationSql } from './identity.mjs';
import { initializeMemoryInstallation } from '../../../../.agents/skills/memory/scripts/lib/installation-operator.mjs';
import { legacyHash } from '../../../../.agents/skills/memory/scripts/lib/machine-legacy-inventory.mjs';

export const id = name => name.padEnd(32, '0');
export const hash = character => character.repeat(64);
export async function legacyFixture(t, version = 6) {
 const f = operatorFixture(t);
 if (version <= 6) applyMigrations(f.db, version);
 else if (version === 10) f.installation = await completedSchema10(f);
 else if (version === 11) {
  await initializeMemoryInstallation(f.operator, inputFor(f));
  const row = f.db.prepare('SELECT installation_id,repository_id FROM memory_installation').get();
  f.installation = { ...f.target, installationId: row.installation_id, repositoryId: row.repository_id };
 } else throw new Error('unsupported synthetic fixture');
 f.db.prepare(`INSERT INTO sessions(id,agent,author,machine,status,raw_key,raw_bytes,updated_at)
  VALUES('codex:legacy','codex','old@example.com','old-label','captured','old@example.com/raw/session',4,'2025-01-01')`).run();
 f.db.prepare(`INSERT INTO facts(slug,type,body,session_id,source,created_at,author)
  VALUES('business','project','Original authored decision.','codex:legacy','save','2025-01-01','old@example.com')`).run();
 f.db.prepare(`INSERT INTO facts(slug,type,body,session_id,source,created_at,author)
  VALUES('business','user','Original private preference.','codex:legacy','save','2025-01-01','old@example.com')`).run();
 f.db.prepare("INSERT INTO tags(name,definition,created_at) VALUES('legacy','Original tag.','2025-01-01')").run();
 f.db.prepare("INSERT INTO fact_tags(fact_id,tag) VALUES(1,'legacy')").run();
 if (version >= 2) f.db.prepare("INSERT INTO memory_keys(hash,email,role,created_at) VALUES(?,'old@example.com','member','fixture')").run(hash('a'));
 f.ownership = { kind: 'original-creation', accountId: f.target.accountId, databaseId: f.target.databaseId,
  method: 'POST', path: `/accounts/${f.target.accountId}/d1/database`, receiptHash: hash('b') };
 f.source = { targetHash: await legacyHash(f.target), observationId: id('source-observation'), observedAt: Math.floor(Date.now() / 1000),
  resourceOwnershipHash: await legacyHash(f.ownership), backupHash: hash('c'),
  serving: ['canonical', 'preview', 'version'].map((kind, index) => ({ id: kind, url: (kind === 'canonical' ? f.target.memoryOrigin : `https://${kind}.fixture.example`) + '/_memory/query',
   workerId: '1'.repeat(32), versionId: 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', kind, bindingHash: hash(String(index + 1)),
   methods: ['GET', 'POST'], expectedClosure: kind === 'canonical' ? 'closed-handler' : 'route-disabled', replacementSourceHash: kind === 'canonical' ? hash('a') : null })),
  credentials: [{ id: 'old-provider-id', kind: 'direct-provider', scopeHash: hash('d'), retirement: 'replace-shared', businessPermissionsHash: hash('e') },
   ...(version >= 2 ? [{ id: hash('a'), kind: 'memory-key', scopeHash: hash('f'), retirement: 'remove-key', businessPermissionsHash: null }] : [])],
  bucket: { name: f.target.bucketName, publicAccessEnabled: true, publicOrigins: ['https://fixture-public.r2.dev'], accessHash: hash('a') } };
 f.destination = { installation: f.installation ?? { ...f.target, installationId: id('new-installation'), repositoryId: id('new-repository') },
  machineId: id('destination-machine'), grantId: id('destination-grant'), machineCommitment: hash('4'), machineRevision: 1,
  grantRevision: 2, credentialGeneration: 1, scope: 'memory:read memory:write', grantEvidenceHash: hash('5') };
 f.selection = { factIds: [1, 2], sessionIds: ['codex:legacy'], rawKeys: ['old@example.com/raw/session'] };
 f.reads = [];
 f.adapter = {
  read: async (sql, params = []) => { f.reads.push({ sql, params }); return f.db.prepare(sql).all(...params).map(row => ({ ...row })); },
  readMigration: async name => migrationSql(name), inspectSource: async () => structuredClone(f.source),
  inspectRaw: async (_target, key) => ({ key, contentHash: hash('6'), bytes: 4, evidenceHash: hash('7') }),
  inspectDestination: async () => structuredClone(f.destination), inspectClosure: async () => closureFor(f),
 };
 f.reviewInput = inventory => ({ decisionId: id('operator-decision'), inventoryHash: inventory.inventoryHash, ownership: structuredClone(f.ownership),
  destination: structuredClone(f.destination), mappings: inventory.selected.map(row => ({ kind: row.kind, id: row.id, snapshotHash: row.snapshotHash,
   evidenceType: 'operator-provenance', evidenceRef: 'private-operator-evidence', evidenceHash: hash('8') })), unmapped: 'admin-only', closure: 'pending' });
 return f;
}
export function closureFor(f) {
 const revisionHash = hash('9');
 const coverage = ids => ({ accountId: f.target.accountId, queryHash: hash('a'), pages: [{ page: 1, count: ids.length, readbackHash: hash('b'), nextPage: null }], ids });
 return { targetHash: f.source.targetHash, inventoryHash: f.inventory.inventoryHash, observationId: id('closure-observation'), observedAt: Math.floor(Date.now() / 1000), revisionHash,
  coverage: { workers: coverage([...new Set(f.source.serving.map(row => row.workerId))]), versions: coverage([...new Set(f.source.serving.map(row => row.workerId + ':' + row.versionId))]),
   routes: coverage(f.source.serving.map(row => row.id)), credentials: coverage(f.source.credentials.map(row => row.id)), bucketOrigins: coverage(f.source.bucket?.publicOrigins ?? []) },
  serving: f.source.serving.map(row => ({ id: row.id, inventoryBindingHash: row.bindingHash, closedBindingHash: hash('f'), revisionHash, readbackHash: hash('1'),
   closureKind: row.expectedClosure, routeEnabled: row.expectedClosure !== 'route-disabled', legacyServing: false, handlerSourceHash: row.replacementSourceHash })),
  credentials: f.source.credentials.map(row => ({ id: row.id, originalScopeHash: row.scopeHash, state: 'retired', readbackHash: hash('2'), replacementPermissionsHash: row.businessPermissionsHash,
   directMemoryStatus: row.kind === 'direct-provider' ? 403 : null, directMemoryProbeHash: row.kind === 'direct-provider' ? hash('a') : null })),
  bucket: f.source.bucket === null ? null : { name: f.source.bucket.name, originalAccessHash: f.source.bucket.accessHash, publicAccessEnabled: false,
   closedOrigins: [...f.source.bucket.publicOrigins], readbackHash: hash('b'), revisionHash },
  probes: [...f.source.serving.flatMap(row => row.methods.flatMap(method => ['anonymous', ...f.source.credentials.map(credential => credential.id)].map(credentialId => ({ endpointId: row.id, method, credentialId, status: 403,
   redirected: false, memoryReturned: false, requestHash: hash('3'), responseHash: hash('4'), revisionHash })))),
   ...(f.source.bucket?.publicOrigins ?? []).map(origin => ({ endpointId: origin, method: 'GET', credentialId: 'anonymous', status: 404,
    redirected: false, memoryReturned: false, requestHash: hash('c'), responseHash: hash('d'), revisionHash }))] };
}
