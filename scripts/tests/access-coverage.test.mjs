import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPrivateAccess } from '../check-private-access.mjs';
import { pack, logger } from './fixtures/pack.mjs';

const account = 'a'.repeat(32), productionId = 'b'.repeat(32), stagingId = 'c'.repeat(32);
const vars = environment => ({ WONG_ENVIRONMENT: environment, CF_ACCESS_TEAM_DOMAIN: 'team.cloudflareaccess.com', CF_ACCESS_AUD: 'aud', CF_ACCESS_APP_ID: 'app', CF_ACCESS_WORKER_ID: environment === 'production' ? productionId : stagingId });
const config = { account_id: account, name: 'demo', assets: { run_worker_first: true }, vars: vars('production'), env: { staging: { name: 'demo-staging', vars: vars('staging') } } };
const memory = [{ behavior: 'public', path_pattern: '/_memory/*' }];
function resources() {
  return {
    '/workers/workers/demo': { name: 'demo', id: productionId, references: { domains: [{ hostname: 'app.example.com' }] } },
    '/workers/workers/demo-staging': { name: 'demo-staging', id: stagingId },
    '/workers/scripts/demo/secrets': [], '/workers/scripts/demo-staging/secrets': [],
    '/workers/scripts': [{ id: 'demo' }, { id: 'demo-staging' }],
    '/workers/subdomain': { subdomain: 'example' },
    '/access/apps/app': { id: 'app', type: 'self_hosted', aud: 'aud', domain: 'demo.example.workers.dev', destinations: [
      { overrides: memory, worker_id: productionId, type: 'worker' }, { worker_id: stagingId, type: 'worker' }, { overrides: memory, uri: 'demo.example.workers.dev', type: 'public' },
    ], policies: [{ id: 'human' }, { id: 'machine' }] },
    '/access/apps/app/policies': [
      { id: 'human', decision: 'allow', include: [{ email: { email: 'owner@example.com' } }], exclude: [], require: [] },
      { id: 'machine', decision: 'non_identity', include: [{ service_token: { token_id: 'service' } }], exclude: [], require: [] },
    ],
    '/access/apps': [{ id: 'app' }],
  };
}
const provider = data => async route => {
  const key = route.replace(`/accounts/${account}`, '').split('?')[0];
  assert.ok(key in data, key);
  return structuredClone(data[key]);
};

test('read-only coverage validates actual Workers, reordered provider keys, exact policies and memory scope', async () => {
  for (const environment of ['production', 'staging']) {
    assert.equal((await checkPrivateAccess(config, environment, provider(resources()))).protection, 'configured');
  }
});

test('missing coverage, broad exceptions, policies, precedence and secret overrides stop publication', async () => {
  const mutations = [
    data => { data['/access/apps/app'].destinations.pop(); },
    data => { data['/workers/workers/demo'].id = 'd'.repeat(32); },
    data => { data['/access/apps/app'].destinations[0].overrides[0].path_pattern = '/*'; },
    data => { data['/access/apps/app/policies'][0].include = [{ everyone: {} }]; },
    data => { data['/access/apps/app/policies'][1].decision = 'bypass'; },
    data => { data['/access/apps/app'].policies.pop(); },
    data => { data['/access/apps'].push({ id: 'foreign', domain: 'app.example.com/admin' }); },
    data => { data['/access/apps'].push({ id: 'foreign', destinations: [{ type: 'preview_worker', worker_id: stagingId }] }); },
    data => { data['/workers/scripts/demo-staging/secrets'] = [{ name: 'SKIP_AUTH' }]; },
  ];
  for (const mutate of mutations) {
    const data = resources(); mutate(data);
    await assert.rejects(checkPrivateAccess(config, 'staging', provider(data)));
  }
  await assert.rejects(checkPrivateAccess(config, 'staging', provider(resources()), { ...config.env.staging, assets: config.assets, vars: vars('local') }));
  await assert.rejects(checkPrivateAccess(config, 'production', async () => { throw new Error('403'); }), /403/);
});

test('both CI backends and host previews fail before a content command when provider protection is missing', t => {
  const scripts = ['cf-deploy.sh', 'cf-preview.sh', 'check-private-access.mjs', 'lib-access-config.mjs', 'lib-wrangler-config.sh', 'lib-wrangler-config.mjs', 'lib-cli.mjs'];
  const fixture = pack(t, { scripts, config: JSON.stringify(config), tools: { npx: logger('npx '), npm: logger('npm ') } });
  fixture.write('deny.mjs', "globalThis.fetch = async () => ({ok:false,status:403,json:async()=>({success:false})});\n");
  const common = { CLOUDFLARE_API_TOKEN: 'private-fixture', NODE_OPTIONS: `--import=${fixture.root}/deny.mjs` };
  for (const env of [{ CF_BRANCH: 'main' }, { WORKERS_CI_BRANCH: 'feature' }]) {
    const result = fixture.run('cf-deploy.sh', [], { env: { ...common, CF_PRODUCTION_BRANCH: 'main', ...env } });
    assert.equal(result.status, 1, result.out);
    assert.match(result.out, /read-only protection check failed/);
    assert.deepEqual(result.calls, [], 'no deploy, versions upload or asset publication');
    assert.doesNotMatch(result.out, /private-fixture/);
  }
  const preview = fixture.run('cf-preview.sh', ['--alias', 'test'], { env: common });
  assert.equal(preview.status, 1, preview.out);
  assert.deepEqual(preview.calls, [], 'protection fails before dependency install, migrations or build');
});
