// Synthetic provider receipts and disposable SQLite; no live infrastructure or credentials.
import { DatabaseSync } from 'node:sqlite';
import { migrationSql } from './identity.mjs';

export const TARGET = Object.freeze({
  accountId: 'a'.repeat(32), databaseId: '11111111-2222-3333-4444-555555555555', bucketName: 'fixture-memory',
  appWorkerName: 'fixture-app', memoryWorkerName: 'fixture-memory',
  appUrl: 'https://fixture-app.example.workers.dev', memoryOrigin: 'https://fixture-memory.example.workers.dev',
});
export const ACCESS = Object.freeze({
  providerConfigurationId: 'fixture-provider', issuer: 'https://fixture.cloudflareaccess.com', audience: 'fixture-audience',
  appApplicationId: 'app-access', memoryApplicationId: 'memory-access',
});
export const VERSION = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
export const OPERATION = 'fixture-operation'.padEnd(32, '0');
export const inputFor = f => ({ target: { ...f.target }, operationId: OPERATION, expectedInstallation: null,
  access: f.access === null ? null : { ...f.access }, ownerIntent: { email: 'owner@example.com' } });

export function operatorFixture(t, { standalone = false, bucket = true } = {}) {
  const db = new DatabaseSync(':memory:');
  t.after(() => db.close());
  db.exec('PRAGMA foreign_keys = ON');
  const target = { ...TARGET, bucketName: bucket ? TARGET.bucketName : null };
  const access = { ...ACCESS };
  if (standalone) {
    target.memoryWorkerName = target.appWorkerName; target.memoryOrigin = target.appUrl;
    access.memoryApplicationId = access.appApplicationId;
  }
  const root = `/accounts/${target.accountId}`;
  const receipts = new Map([
    [`${root}/d1/database/${target.databaseId}`, { uuid: target.databaseId }],
    [`${root}/r2/buckets/${target.bucketName}`, { name: target.bucketName }],
    [`${root}/workers/subdomain`, { subdomain: 'example' }],
    [`${root}/access/organizations`, { auth_domain: 'fixture.cloudflareaccess.com' }],
  ]);
  const workers = new Map(); const apps = [];
  for (const [index, name] of Array.from(new Set([target.appWorkerName, target.memoryWorkerName])).entries()) {
    const id = String(index + 1).repeat(32);
    const appId = name === target.appWorkerName ? access.appApplicationId : access.memoryApplicationId;
    const audience = name === target.appWorkerName ? access.audience : 'memory-audience';
    const bindings = [
      { name: 'MEMORY_DB', type: 'd1', database_id: target.databaseId },
      ...(bucket ? [{ name: 'MEMORY_BUCKET', type: 'r2_bucket', bucket_name: target.bucketName }] : []),
      ...Object.entries({ WONG_ENVIRONMENT: 'production', CF_ACCESS_TEAM_DOMAIN: 'fixture.cloudflareaccess.com',
        CF_ACCESS_AUD: audience, CF_ACCESS_APP_ID: appId, CF_ACCESS_WORKER_ID: id }).map(([key, text]) => ({ name: key, type: 'plain_text', text })),
    ];
    const info = { name, id, references: { domains: [] } };
    const settings = { bindings };
    const active = { id: VERSION, resources: { bindings: structuredClone(bindings) } };
    const deployment = { deployments: [{ id: VERSION, strategy: 'percentage', versions: [{ version_id: VERSION, percentage: 100 }] }] };
    receipts.set(`${root}/workers/workers/${name}`, info);
    receipts.set(`${root}/workers/scripts/${name}/settings`, settings);
    receipts.set(`${root}/workers/scripts/${name}/versions/${VERSION}`, active);
    receipts.set(`${root}/workers/scripts/${name}/deployments`, deployment);
    const policy = { id: `policy-${index}`, decision: 'allow', include: [{ email: { email: 'owner@example.com' } }], exclude: [], require: [] };
    const app = { id: appId, type: 'self_hosted', aud: audience, domain: `${name}.example.workers.dev`, allowed_idps: ['fixture-idp'],
      destinations: [{ type: 'worker', worker_id: id }, { type: 'public', uri: `${name}.example.workers.dev` }], policies: [{ id: policy.id }] };
    apps.push(app);
    receipts.set(`${root}/access/apps/${appId}`, app);
    receipts.set(`${root}/access/apps/${appId}/policies`, [policy]);
    workers.set(name, { info, settings, active, deployment, app, policy });
  }
  receipts.set(`${root}/access/apps`, apps);
  const calls = [];
  const f = { db, target, access, receipts, workers, apps, calls, batches: 0, failAt: null, atomic: true, loseResponse: false, intercept: null };
  f.operator = {
    readMigration: async filename => migrationSql(filename),
    cloudflare: async (method, path, body) => {
      calls.push({ method, path });
      if (f.intercept) {
        const answer = await f.intercept(method, path, body);
        if (answer !== undefined) return answer;
      }
      if (method === 'GET' && receipts.has(path.split('?')[0])) return structuredClone(receipts.get(path.split('?')[0]));
      if (method !== 'POST' || path !== `${root}/d1/database/${target.databaseId}/query`) throw new Error('Unexpected fixture request');
      if (!body.batch) return [{ success: true, results: db.prepare(body.sql).all(...body.params).map(row => ({ ...row })) }];
      f.batches++;
      if (f.atomic) db.exec('BEGIN');
      const results = [];
      try {
        for (const [index, statement] of body.batch.entries()) {
          if (index === f.failAt) throw new Error('Synthetic transaction failure');
          if (statement.params.length) db.prepare(statement.sql).run(...statement.params);
          else db.exec(statement.sql);
          results.push({ success: true, results: [] });
        }
        if (f.atomic) db.exec('COMMIT');
      } catch (error) { if (f.atomic) db.exec('ROLLBACK'); throw error; }
      if (f.loseResponse) { f.loseResponse = false; throw new Error('Private provider details must not escape'); }
      return results;
    },
  };
  f.setBinding = (name, key, value) => {
    const worker = workers.get(name);
    for (const values of [worker.settings.bindings, worker.active.resources.bindings]) {
      const index = values.findIndex(row => row.name === key);
      if (index >= 0) values.splice(index, 1);
      if (value) values.push({ name: key, ...value });
    }
  };
  return f;
}

export function confirmFixtureOwner(f, installation) {
  const person = 'owner'.padEnd(32, 'p');
  const now = Math.floor(Date.now() / 1000);
  f.db.prepare('INSERT INTO memory_principals (id, installation_id, created_at) VALUES (?, ?, ?)').run(person, installation.installationId, now);
  f.db.prepare(`INSERT INTO memory_memberships (installation_id, repository_id, principal_id, role, status, created_at, updated_at)
    VALUES (?, ?, ?, 'owner', 'active', ?, ?)`).run(installation.installationId, installation.repositoryId, person, now, now);
  f.db.prepare(`INSERT INTO memory_identity_bindings (id, installation_id, provider_id, principal_id, issuer, subject, verified_email, status, created_at, updated_at)
    VALUES ('fixture-binding', ?, ?, ?, ?, 'verified-owner', 'owner@example.com', 'active', ?, ?)`)
    .run(installation.installationId, f.access.providerConfigurationId, person, f.access.issuer, now, now);
  f.db.prepare("UPDATE memory_owner_intents SET state = 'consumed', owner_principal_id = ? WHERE installation_id = ?").run(person, installation.installationId);
  return person;
}
