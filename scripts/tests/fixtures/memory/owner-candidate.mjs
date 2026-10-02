// Synthetic verified-adapter results, not JWT verification or live REST evidence.
import { operatorFixture, inputFor } from './operator.mjs';
import { initializeMemoryInstallation } from '../../../../.agents/skills/memory/scripts/lib/installation-operator.mjs';
import { resolveInitialOwnerRequest, issueInitialOwnerCsrf } from '../../../../.agents/skills/memory/worker/owner-request.mjs';
import { createInitialOwnerCandidate } from '../../../../.agents/skills/memory/worker/owner-candidates.mjs';

export async function ownerCandidateFixture(t, options) {
  const f = operatorFixture(t, options);
  const initialized = await initializeMemoryInstallation(f.operator, inputFor(f));
  let beforeBatch;
  let queue = Promise.resolve();
  const statement = (sql, params = []) => ({
    bind: (...values) => statement(sql, values),
    first: async () => { const row = f.db.prepare(sql).get(...params); return row ? { ...row } : null; },
    all: async () => ({ success: true, results: f.db.prepare(sql).all(...params).map(row => ({ ...row })) }),
  });
  const d1 = {
    prepare: sql => statement(sql),
    batch: statements => {
      const result = queue.then(async () => {
        const hook = beforeBatch; beforeBatch = undefined;
        if (hook) await hook();
        f.db.exec('BEGIN');
        try {
          const results = [];
          for (const each of statements) results.push(await each.all());
          f.db.exec('COMMIT');
          return results;
        } catch (error) { f.db.exec('ROLLBACK'); throw error; }
      });
      queue = result.catch(() => {});
      return result;
    },
  };
  const env = { MEMORY_DB: d1, WONG_ENVIRONMENT: 'production', CF_ACCESS_TEAM_DOMAIN: 'fixture.cloudflareaccess.com',
    CF_ACCESS_AUD: f.access.audience, CF_ACCESS_APP_ID: f.access.appApplicationId,
    CF_ACCESS_WORKER_ID: f.workers.get(f.target.appWorkerName).info.id };
  const human = { issuer: f.access.issuer, audience: f.access.audience, subject: 'verified-owner', email: 'owner@example.com' };
  const request = (method, { headers = {}, url, body = '{}', cookie = false } = {}) => new Request(url ?? `${f.target.appUrl}${method === 'GET' ? '/api/memory-auth/session' : '/api/memory-auth/setup/candidates'}`, {
    method, headers: {
      ...(cookie ? { Cookie: 'other=fixture; CF_Authorization=synthetic-assertion' } : { 'Cf-Access-Jwt-Assertion': 'synthetic-assertion' }),
      ...(method === 'POST' ? { Origin: f.target.appUrl, 'Content-Type': 'application/json' } : {}), ...headers,
    }, ...(method === 'POST' ? { body } : {}),
  });
  const context = (method, options, proof = human, environment = env) => resolveInitialOwnerRequest(d1, request(method, options), environment, proof);
  return { ...f, d1, env, human, request, context, installation: initialized.installation,
    beforeBatch: hook => { beforeBatch = hook; },
    row: (sql, ...params) => ({ ...f.db.prepare(sql).get(...params) }),
    csrf: async (options, proof) => issueInitialOwnerCsrf(d1, await context('GET', options, proof)),
    create: async (token, options = {}, proof) => createInitialOwnerCandidate(d1, await context('POST', {
      ...options, headers: { 'X-Memory-CSRF': token, ...options.headers },
    }, proof)),
  };
}
