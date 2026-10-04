// The shared provisioning script, .agents/skills/wong-setup/scripts/provision.mjs, against a fake
// Cloudflare over HTTP and a fake `gh`. Children run asynchronously, so the fake keeps answering.
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  CloudflareError, DEPLOY_TOKEN, NORMAL_PROVISION, PROPAGATION, R2_OFF, USER_GRANTS,
  accounts, cli, cloudflare, names, provision, readEnv, run, safeName, widen, wranglerConfig, wranglerFragment,
} from '../../.agents/skills/wong-setup/scripts/provision.mjs';
import { databaseName, parseConfig, stripJsonc, workerName } from '../lib-wrangler-config.mjs';
import { ACCOUNT, GROUPS, TOKEN, fakeCloudflare, fakeGh, groupId, startingPolicies } from './fixtures/cloudflare.mjs';
import { humanEmails } from '../../.agents/skills/wong-setup/scripts/private-access.mjs';
import { privateDeployment } from '../lib-access-config.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SCRIPT = join(repoRoot, '.agents/skills/wong-setup/scripts/provision.mjs');
const REPO = 'ada/recipe-box';
const TODAY = '2026-09-27';
const EMAIL = 'ada@example.com';
const noSleep = async () => {};

test('private setup rejects unreachable owner identities before any provider mutation', async (t) => {
  const env = await setup(t);
  for (const ownerEmail of ['', 'bad', 'user@workspace.invalid', '42+ada@users.noreply.github.com']) {
    await assert.rejects(env.provision({ ownerEmail }), { reason: 'access', message: /reachable owner email/ });
  }
  assert.equal(env.fake.calls.length, 0);
  const report = await env.provision({ ownerEmail: ' ADA@Example.COM ' });
  assert.equal(report.access.ownerEmail, EMAIL);
  assert.equal(report.access.humanLogin, 'unverified');
});

test('organization and PIN setup recover after an interruption without changing existing settings', async (t) => {
  const env = await setup(t);
  env.fake.state.organization = null;
  env.fake.state.identityProviders = [{ id: 'keep-oidc', type: 'oidc' }];
  env.fake.state.refuse = [`POST /accounts/${ACCOUNT}/access/identity_providers`];
  await assert.rejects(env.provision(), { reason: 'access', message: /finish Zero Trust onboarding/ });
  assert.deepEqual(env.fake.state.databases, []);
  assert.equal(existsSync(join(env.dir, 'app/wrangler.jsonc')), false);
  const organization = structuredClone(env.fake.state.organization);
  env.fake.state.refuse = [];
  await env.provision();
  await env.provision();
  assert.deepEqual(env.fake.state.organization, organization);
  assert.equal(env.fake.count(`POST /accounts/${ACCOUNT}/access/organizations`), 1);
  assert.equal(env.fake.state.identityProviders.filter(p => p.type === 'onetimepin').length, 1);
  assert.deepEqual(env.fake.state.identityProviders[0], { id: 'keep-oidc', type: 'oidc' });
});

test('an onboarding refusal stays closed and the widen uses account-scoped Access groups', async (t) => {
  const env = await setup(t);
  await env.widen();
  const held = env.fake.state.policies.flatMap(p => p.permission_groups.map(g => g.id));
  assert.ok(held.includes(groupId('Access: Apps and Policies Write')));
  assert.ok(!held.includes('959972745952452f8be2452be8cbb9f2'));
  env.fake.state.organization = null;
  env.fake.state.refuse = [`POST /accounts/${ACCOUNT}/access/organizations`];
  await assert.rejects(env.provision(), { reason: 'access', message: /no business content was published/ });
  assert.deepEqual(env.fake.state.workers, []);
  assert.deepEqual(env.fake.state.databases, []);
  assert.deepEqual(env.gh.secrets(), {});
});

/** An account whose Zero Trust organization Cloudflare refuses until onboarding (a card) is done. */
const needsOnboarding = (env) => {
  env.fake.state.organization = null;
  env.fake.state.needsOnboarding = true;
};

test('an outage on the Zero Trust step stops even with --open-without-login', async (t) => {
  const env = await setup(t);
  env.fake.state.organization = null;
  env.fake.state.refuse = [`POST /accounts/${ACCOUNT}/access/organizations`];
  await assert.rejects(env.provision({ openWithoutLogin: true }), { reason: 'access' });
  assert.equal(existsSync(join(env.dir, 'app/wrangler.jsonc')), false);
  assert.deepEqual(env.gh.secrets(), {});
});

test('with --open-without-login an onboarding refusal finishes open; without it, setup stops', async (t) => {
  const env = await setup(t);
  needsOnboarding(env);
  await assert.rejects(env.provision(), { reason: 'access', message: /finish Zero Trust onboarding/ });
  const report = await env.provision({ openWithoutLogin: true });
  assert.deepEqual(report.access, { mode: 'open', reason: 'zero-trust-onboarding', onboardingUrl: `https://one.dash.cloudflare.com/${ACCOUNT}/`, ownerEmail: EMAIL, humanLogin: 'none' });
  assert.deepEqual(env.fake.state.workers, [], 'no bootstrap Workers: the first deploy makes them');
  assert.deepEqual(env.fake.state.accessApps, []);
  assert.deepEqual(env.fake.state.serviceTokens, []);
  assert.equal(env.fake.state.databases.length, 3);
  assert.ok(env.gh.secrets().CLOUDFLARE_API_TOKEN);
  assert.deepEqual(env.record().components.access, report.access);
  const config = env.config();
  for (const environment of ['production', 'staging']) {
    assert.deepEqual(privateDeployment(config, environment), { name: environment === 'production' ? 'recipe-box' : 'recipe-box-staging', environment, open: true });
  }
  assert.equal(config.vars.WORKSPACE_LOGIN, 'off');
  assert.equal(config.env.staging.vars.WORKSPACE_LOGIN, 'off');
  assert.equal(config.env.local.vars.WORKSPACE_LOGIN, undefined);
  const again = await env.provision({ openWithoutLogin: true });
  assert.equal(again.access.mode, 'open');
  assert.deepEqual(again.updated, []);
});

test('a later Access error stops even with --open-without-login, and a private site never opens', async (t) => {
  const env = await setup(t);
  env.fake.state.refuse = [`POST /accounts/${ACCOUNT}/access/apps`];
  await assert.rejects(env.provision({ openWithoutLogin: true }), /Cloudflare POST/);
  assert.equal(existsSync(join(env.dir, 'app/wrangler.jsonc')), false);
  assert.deepEqual(env.gh.secrets(), {});
  env.fake.state.refuse = [];
  const report = await env.provision({ openWithoutLogin: true });
  const before = readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8');
  env.fake.state.refuse = [`GET /accounts/${ACCOUNT}/access/organizations`];
  await assert.rejects(env.provision({ openWithoutLogin: true }), { reason: 'access' });
  assert.equal(readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8'), before);
  assert.deepEqual(env.record().components.access, report.access);
});

test('a rerun after the card turns an open site private in its committed config', async (t) => {
  const env = await setup(t);
  needsOnboarding(env);
  await env.provision({ openWithoutLogin: true });
  // The first CI deploy made both Workers, open.
  env.fake.state.workers.push('recipe-box', 'recipe-box-staging');
  env.fake.state.needsOnboarding = false;
  const report = await env.provision({ openWithoutLogin: true });
  assert.equal(report.access.mode, undefined);
  assert.equal(env.fake.state.accessApps.length, 1);
  assert.equal(env.fake.calls.filter(call => call.method === 'PUT' && call.path.includes('/workers/scripts/')).length, 0, 'the deployed Workers are adopted, not replaced');
  assert.ok(report.updated.includes('app/wrangler.jsonc: private login on, WORKSPACE_LOGIN removed'));
  const text = readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8');
  assert.ok(!text.includes('WORKSPACE_LOGIN'));
  assert.match(text, /\/\/ Session memory, production only/);
  const config = env.config();
  const [production, staging] = ['production', 'staging'].map(environment => privateDeployment(config, environment));
  assert.equal(production.appId, env.fake.state.accessApps[0].id);
  assert.deepEqual([production.workerId, staging.workerId], report.access.workers.map(worker => worker.id));
  assert.equal(production.teamDomain, report.access.teamDomain);
  assert.equal(env.record().components.access.appId, production.appId);
  assert.equal(env.record().components.access.mode, undefined);
  assert.deepEqual(report.todo, []);
});

test('an open config provisioning cannot edit goes to todo, unchanged', async (t) => {
  const env = await setup(t);
  needsOnboarding(env);
  await env.provision({ openWithoutLogin: true });
  const file = join(env.dir, 'app/wrangler.jsonc');
  const edited = readFileSync(file, 'utf8').replace('"local": {', '"extra": { "vars": { "CF_ACCESS_AUD": "" } },\n    "local": {');
  writeFileSync(file, edited);
  env.fake.state.needsOnboarding = false;
  const report = await env.provision({ openWithoutLogin: true });
  assert.equal(readFileSync(file, 'utf8'), edited);
  assert.deepEqual(report.todo, ['fill the CF_ACCESS_* vars from components.access and remove WORKSPACE_LOGIN in app/wrangler.jsonc']);
  assert.ok(report.access.appId);
});

test('private bootstrap precedes app publication and records real Worker IDs', async (t) => {
  const env = await setup(t);
  const report = await env.provision();
  assert.deepEqual(report.access.workers.map(w => w.name), ['recipe-box', 'recipe-box-staging']);
  assert.ok(report.access.workers.every(w => /^[a-f0-9]{32}$/.test(w.id) && w.id !== w.name));
  assert.deepEqual(env.fake.state.workerSubdomains, {
    'recipe-box': { enabled: true, previews_enabled: false },
    'recipe-box-staging': { enabled: false, previews_enabled: false },
  });
  const uploads = env.fake.calls.filter(call => call.method === 'PUT' && call.path.includes('/workers/scripts/'));
  assert.equal(uploads.length, 2);
  for (const upload of uploads) {
    assert.match(upload.body, /status:503/);
    assert.ok(!upload.body.includes('assets'));
  }
  const [app] = env.fake.state.accessApps;
  assert.equal(app.domain, 'recipe-box.ada.workers.dev');
  assert.deepEqual(app.destinations.filter(d => d.type === 'worker').map(d => d.worker_id), report.access.workers.map(w => w.id));
  assert.equal(env.record().components.access.appId, app.id);
  const activation = env.fake.calls.findIndex(call => call.method === 'POST' && call.path.endsWith('/workers/scripts/recipe-box/subdomain') && JSON.parse(call.body).enabled);
  const policyReadback = env.fake.calls.findLastIndex((call, index) => index < activation && call.method === 'GET' && call.path.includes(`/access/apps/${app.id}/policies`));
  assert.ok(policyReadback > 0 && activation > policyReadback);
  assert.ok(env.fake.calls.slice(0, activation).some(call => call.method === 'GET' && call.path.endsWith(`/access/apps/${app.id}`)));
  const writes = env.fake.count(`POST /accounts/${ACCOUNT}/workers/scripts/recipe-box/subdomain`);
  await env.provision();
  assert.equal(env.fake.state.accessApps.length, 1);
  assert.equal(env.fake.calls.filter(call => call.method === 'PUT' && call.path.includes('/workers/scripts/')).length, 2);
  assert.equal(env.fake.count(`POST /accounts/${ACCOUNT}/workers/scripts/recipe-box/subdomain`), writes);
});

test('interrupted bootstrap reuses owned Workers without opening preview publication', async (t) => {
  const env = await setup(t);
  env.fake.state.refuse = [`POST /accounts/${ACCOUNT}/access/apps`];
  await assert.rejects(env.provision(), /Cloudflare POST/);
  const saved = JSON.parse(readFileSync(join(env.dir, '.git/wong-stack-provision.json'), 'utf8'));
  assert.equal(saved.workers['recipe-box'].bootstrapLoginPending, true);
  assert.equal(env.fake.state.workerSubdomains['recipe-box'].enabled, false);
  assert.equal(existsSync(join(env.dir, 'app/wrangler.jsonc')), false);
  assert.deepEqual(env.gh.secrets(), {});
  env.fake.state.refuse = [];
  await env.provision();
  assert.equal(env.fake.state.workers.length, 2);
  assert.equal(env.fake.state.accessApps.length, 1);
});

test('machine policy failure retains a closed recoverable bootstrap anchor', async t => {
  const env = await setup(t);
  const fetchWithoutMachine = async (url, options) => {
    if (options.method === 'POST' && String(options.body).includes('"decision":"non_identity"')) throw new Error('interrupted policy write');
    return fetch(url, options);
  };
  await assert.rejects(env.provision({ fetch: fetchWithoutMachine }), /Cloudflare POST/);
  assert.equal(env.fake.state.workerSubdomains['recipe-box'].enabled, false);
  assert.equal(env.fake.state.accessApps[0].policies.length, 1);
  assert.equal(existsSync(join(env.dir, 'app/wrangler.jsonc')), false);
  await env.provision();
  assert.deepEqual(env.fake.state.workerSubdomains['recipe-box'], { enabled: true, previews_enabled: false });
  assert.equal(env.fake.state.accessApps[0].policies.length, 2);
  assert.equal(env.fake.calls.filter(call => call.method === 'PUT' && call.path.includes('/workers/scripts/')).length, 2);
});

test('an interrupted bootstrap upload retains ownership and resumes without another content upload', async t => {
  const env = await setup(t);
  const lostUpload = async (url, options) => {
    const response = await fetch(url, options);
    if (url.endsWith('/workers/scripts/recipe-box') && options.method === 'PUT') throw new Error('lost upload receipt');
    return response;
  };
  await assert.rejects(env.provision({ fetch: lostUpload }), /Cloudflare PUT/);
  const saved = JSON.parse(readFileSync(join(env.dir, '.git/wong-stack-provision.json'), 'utf8'));
  assert.deepEqual(saved.workers['recipe-box'], { name: 'recipe-box', pending: true, bootstrapLoginPending: true });
  assert.equal(env.fake.state.accessApps.length, 0);
  await env.provision();
  assert.deepEqual(env.fake.state.workerSubdomains['recipe-box'], { enabled: true, previews_enabled: false });
  assert.equal(env.fake.calls.filter(call => call.method === 'PUT' && call.path.includes('/workers/scripts/')).length, 2);
});

test('missing publication settings or ignored activation remain recoverable failures', async t => {
  for (const missing of [true, false]) {
    const env = await setup(t);
    const brokenPublication = async (url, options) => {
      const response = await fetch(url, options);
      if (url.endsWith('/workers/scripts/recipe-box/subdomain') && options.method === 'GET') {
        return new Response(JSON.stringify({ success: true, result: missing ? {} : { enabled: false, previews_enabled: false } }));
      }
      return response;
    };
    await assert.rejects(env.provision({ fetch: brokenPublication }), { reason: 'access', message: /bootstrap/ });
    assert.equal(JSON.parse(readFileSync(join(env.dir, '.git/wong-stack-provision.json'), 'utf8')).workers['recipe-box'].bootstrapLoginPending, true);
    await env.provision();
    assert.equal(JSON.parse(readFileSync(join(env.dir, '.git/wong-stack-provision.json'), 'utf8')).workers['recipe-box'].bootstrapLoginPending, undefined);
    assert.deepEqual(env.fake.state.workerSubdomains['recipe-box'], { enabled: true, previews_enabled: false });
  }
});

test('bootstrap activation failure and lost receipts retry without rewriting content or publication choices', async t => {
  for (const applied of [false, true]) {
    const env = await setup(t);
    const interruptedFetch = async (url, options) => {
      if (url.endsWith('/workers/scripts/recipe-box/subdomain') && options.method === 'POST' && JSON.parse(options.body).enabled) {
        if (applied) await fetch(url, options);
        throw new Error('interrupted activation');
      }
      return fetch(url, options);
    };
    await assert.rejects(env.provision({ fetch: interruptedFetch }), /Cloudflare POST/);
    assert.equal(JSON.parse(readFileSync(join(env.dir, '.git/wong-stack-provision.json'), 'utf8')).workers['recipe-box'].bootstrapLoginPending, true);
    assert.equal(env.fake.state.workerSubdomains['recipe-box'].enabled, applied);
    await env.provision();
    assert.equal(JSON.parse(readFileSync(join(env.dir, '.git/wong-stack-provision.json'), 'utf8')).workers['recipe-box'].bootstrapLoginPending, undefined);
    assert.deepEqual(env.fake.state.workerSubdomains['recipe-box'], { enabled: true, previews_enabled: false });
    assert.equal(env.fake.count(`POST /accounts/${ACCOUNT}/workers/scripts/recipe-box/subdomain`), 2);
    assert.equal(env.fake.calls.filter(call => call.method === 'PUT' && call.path.includes('/workers/scripts/')).length, 2);
    const chosen = { enabled: false, previews_enabled: true };
    env.fake.state.workerSubdomains['recipe-box'] = chosen;
    await env.provision();
    assert.deepEqual(env.fake.state.workerSubdomains['recipe-box'], chosen);
    assert.equal(env.fake.count(`POST /accounts/${ACCOUNT}/workers/scripts/recipe-box/subdomain`), 2);
  }
});

test('provider policy or app readback mismatch prevents bootstrap anchor activation', async t => {
  for (const field of ['human', 'machine', 'app']) {
    const env = await setup(t);
    const mismatchedFetch = async (url, options) => {
      const response = await fetch(url, options);
      if (options.method !== 'GET' || !url.includes('/access/apps/')) return response;
      const data = await response.json();
      if (Array.isArray(data.result) && data.result.length === 2) {
        const policy = data.result.find(item => item.decision === (field === 'human' ? 'allow' : 'non_identity'));
        if (field !== 'app') policy.include = [{ everyone: {} }];
      } else if (field === 'app' && data.result.destinations?.[0].overrides) data.result.aud = 'wrong-audience';
      return new Response(JSON.stringify(data), { status: response.status });
    };
    await assert.rejects(env.provision({ fetch: mismatchedFetch }), { reason: 'access', message: /did not retain/ });
    assert.equal(env.fake.state.workerSubdomains['recipe-box'].enabled, false);
    assert.equal(env.fake.count(`POST /accounts/${ACCOUNT}/workers/scripts/recipe-box/subdomain`), 1);
    assert.equal(existsSync(join(env.dir, 'app/wrangler.jsonc')), false);
  }
});

test('adopted Workers retain all existing publication choices without bootstrap uploads', async t => {
  for (const enabled of [true, false]) {
    const env = await setup(t);
    env.fake.state.workers = ['recipe-box', 'recipe-box-staging'];
    env.fake.state.workerSubdomains = {
      'recipe-box': { enabled, previews_enabled: true },
      'recipe-box-staging': { enabled: !enabled, previews_enabled: true },
    };
    const chosen = structuredClone(env.fake.state.workerSubdomains);
    writeFileSync(join(env.dir, '.claude/.wong-stack.json'), JSON.stringify({ components: { memory: { accountId: ACCOUNT, worker: 'https://recipe-box.ada.workers.dev/_memory' } } }));
    await env.provision();
    assert.deepEqual(env.fake.state.workerSubdomains, chosen);
    assert.equal(env.fake.calls.filter(call => ['PUT', 'POST'].includes(call.method) && call.path.includes('/workers/scripts/')).length, 0);
  }
});

test('unowned Workers and higher-precedence apps are untouched and block protected success', async (t) => {
  const env = await setup(t);
  env.fake.state.workers.push('recipe-box');
  await assert.rejects(env.provision(), { reason: 'access', message: /not owned/ });
  assert.equal(env.fake.count(`PUT /accounts/${ACCOUNT}/workers/scripts/recipe-box`), 0);
  env.fake.state.workers = [];
  await env.provision();
  const workerId = env.record().components.access.workers[0].id;
  env.fake.state.workerDetails['recipe-box'] = {
    id: workerId, name: 'recipe-box',
    routes: [{ pattern: 'https://*.business.example.com/path/*' }],
    references: { domains: [{ hostname: 'private.example.com' }] },
  };
  for (const destination of [
    { type: 'preview_worker', worker_id: workerId },
    { type: 'public', uri: 'old-version-recipe-box.ada.workers.dev/private' },
    { type: 'public', uri: '*.ada.workers.dev/private' },
    { type: 'public', uri: 'private.example.com/private' },
    { type: 'public', uri: 'app.business.example.com/path' },
  ]) {
    const conflict = { id: 'unowned-conflict', destinations: [destination], policies: [{ decision: 'bypass' }] };
    env.fake.state.accessApps.push(conflict);
    await assert.rejects(env.provision(), { reason: 'access', message: /hostname\/path\/preview precedence/ });
    assert.deepEqual(env.fake.state.accessApps.at(-1), conflict);
    env.fake.state.accessApps.pop();
  }
  env.fake.state.accessApps.push({ id: 'other-app', destinations: [{ type: 'worker', worker_id: 'f'.repeat(32) }] });
  await env.provision();
  assert.equal(env.fake.state.accessApps.length, 2);
});

test('exact human emails retain the owner and exclude synthetic workspace identities', () => {
  assert.deepEqual(humanEmails(' ADA@Example.COM ', ['Friend@example.com', ' friend@EXAMPLE.com ', 'extra@workspace.invalid', 'ada@example.com']), ['ada@example.com', 'friend@example.com']);
  assert.deepEqual(humanEmails(EMAIL, []), [EMAIL]);
  assert.throws(() => humanEmails('extra@workspace.invalid', []), /reachable owner email/);
  assert.throws(() => humanEmails(EMAIL, ['not-an-email']), /reachable owner email/);
});

test('human membership changes preserve separate machine permissions and only production memory is exempt', async (t) => {
  const env = await setup(t);
  const first = await env.provision({ teammateEmails: ['Friend@Example.com', 'extra@workspace.invalid'] });
  const [app] = env.fake.state.accessApps;
  const machine = structuredClone(app.policies.find(p => p.decision === 'non_identity'));
  assert.deepEqual(app.policies.find(p => p.decision === 'allow').include, [{ email: { email: EMAIL } }, { email: { email: 'friend@example.com' } }]);
  const override = [{ behavior: 'public', path_pattern: '/_memory/*' }];
  assert.deepEqual(app.destinations[0].overrides, override);
  assert.equal(app.destinations[1].overrides, undefined);
  assert.deepEqual(app.destinations[2].overrides, override);
  assert.ok(!JSON.stringify(app.destinations).includes('/public'));
  const saved = readEnv(join(env.dir, '.env'));
  assert.equal(saved.CF_ACCESS_CLIENT_SECRET, env.fake.state.serviceTokens[0].client_secret);
  assert.equal(first.access.serviceTokenId, env.fake.state.serviceTokens[0].id);
  assertNoSecret(env, JSON.stringify(first));
  await env.provision();
  assert.equal(app.policies.find(p => p.decision === 'allow').include.length, 2, 'a setup rerun retains the existing roster');
  await env.provision({ teammateEmails: [] });
  assert.deepEqual(app.policies.find(p => p.decision === 'allow').include, [{ email: { email: EMAIL } }]);
  assert.deepEqual(app.policies.find(p => p.decision === 'non_identity'), machine);
  assert.equal(env.fake.state.serviceTokens.length, 1);
  assert.equal(readEnv(join(env.dir, '.env')).CF_ACCESS_CLIENT_SECRET, saved.CF_ACCESS_CLIENT_SECRET);
});

test('generated environments share the owned app and keep authentication substitution local', async (t) => {
  const env = await setup(t);
  const report = await env.provision();
  const config = env.config();
  assert.equal(config.assets.run_worker_first, true);
  for (const [vars, worker] of [[config.vars, report.access.workers[0]], [config.env.staging.vars, report.access.workers[1]]]) {
    assert.equal(vars.CF_ACCESS_APP_ID, report.access.appId);
    assert.equal(vars.CF_ACCESS_AUD, report.access.audience);
    assert.equal(vars.CF_ACCESS_TEAM_DOMAIN, report.access.teamDomain);
    assert.equal(vars.CF_ACCESS_WORKER_ID, worker.id);
    assert.equal(vars.SKIP_AUTH, undefined);
  }
  assert.deepEqual(config.env.local.vars, { WONG_ENVIRONMENT: 'local', SKIP_AUTH: 'true' });
  assert.equal(config.env.local.d1_databases[0].remote, false);
  assert.equal(config.env.local.d1_databases.some(db => db.binding.startsWith('MEMORY')), false);
});

test('provider object-key reordering does not invalidate semantic coverage', async (t) => {
  const env = await setup(t);
  await env.provision();
  const [app] = env.fake.state.accessApps;
  app.destinations = app.destinations.map(destination => ({
    ...(destination.overrides && { overrides: destination.overrides.map(({ behavior, path_pattern }) => ({ path_pattern, behavior })) }),
    ...(destination.worker_id && { worker_id: destination.worker_id }),
    ...(destination.uri && { uri: destination.uri }), type: destination.type,
  }));
  for (const policy of app.policies) policy.include = policy.include.map(rule => Object.fromEntries(Object.entries(rule).reverse()));
  const updatedBefore = env.fake.count(`PUT /accounts/${ACCOUNT}/access/apps/`);
  await env.provision();
  assert.equal(env.fake.count(`PUT /accounts/${ACCOUNT}/access/apps/`), updatedBefore, 'reordering requires no provider mutation');
});

test('human sessions default to thirty days while reviewed shorter settings and machine lifetimes persist', async (t) => {
  const env = await setup(t);
  const first = await env.provision();
  const [app] = env.fake.state.accessApps;
  const human = app.policies.find(policy => policy.decision === 'allow');
  const machine = structuredClone(env.fake.state.serviceTokens[0]);
  assert.equal(first.access.sessionDuration, '720h');
  assert.equal(human.session_duration, '720h');
  assert.equal(machine.duration, '8760h');
  app.session_duration = '168h';
  human.session_duration = '30m';
  const updated = await env.provision({ teammateEmails: ['friend@example.com'] });
  assert.equal(updated.access.sessionDuration, '168h');
  assert.equal(human.session_duration, '30m');
  assert.deepEqual(env.fake.state.serviceTokens[0], machine);
});

test('an interrupted one-time machine secret handoff recovers only the owned service token', async (t) => {
  const env = await setup(t);
  await env.provision();
  const secretFile = join(env.dir, '.env');
  writeFileSync(secretFile, readFileSync(secretFile, 'utf8').split('\n').filter(line => !line.startsWith('CF_ACCESS_CLIENT_SECRET=')).join('\n'));
  env.fake.state.serviceTokens.push({ id: 'unrelated-service', name: 'Other app verification', client_id: 'other.access', client_secret: 'other-secret' });
  const unrelated = structuredClone(env.fake.state.serviceTokens[1]);
  const recovered = await env.provision();
  assert.equal(env.fake.state.serviceTokens.length, 2);
  assert.deepEqual(env.fake.state.serviceTokens[1], unrelated);
  assert.equal(readEnv(secretFile).CF_ACCESS_CLIENT_SECRET, env.fake.state.serviceTokens[0].client_secret);
  assert.ok(recovered.updated.includes('workspace verification service secret recovered in .env'));
  assertNoSecret(env, JSON.stringify(recovered));
});

// ── a target repo, a fake Cloudflare, a fake gh ─────────────────────────────

/** A target with the memory skill and the app's package.json, as an install leaves it before provisioning. */
async function setup(t, { r2 = true, email = EMAIL, subdomain } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-provision-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dir = join(root, 'recipe-box');
  mkdirSync(join(dir, '.agents', 'skills'), { recursive: true });
  execFileSync('git', ['init', '-q', '-b', 'main', dir]);
  writeFileSync(join(dir, '.git/info/exclude'), '.env*\n');
  if (email) execFileSync('git', ['-C', dir, 'config', 'user.email', email]);
  cpSync(join(repoRoot, '.agents/skills/memory'), join(dir, '.agents/skills/memory'), { recursive: true });
  symlinkSync('.agents', join(dir, '.claude'));
  mkdirSync(join(dir, 'app'));
  cpSync(join(repoRoot, 'app/package.json'), join(dir, 'app/package.json'));
  writeFileSync(join(dir, '.env'), `CLOUDFLARE_API_TOKEN=${TOKEN}\nCLOUDFLARE_ACCOUNT_ID=${ACCOUNT}\n`);
  const fake = await fakeCloudflare({ r2, ...(subdomain !== undefined && { subdomain }) });
  t.after(fake.close);
  const gh = fakeGh(join(root, 'gh'));
  const env = { ...process.env, HOME: root, XDG_DATA_HOME: join(root, 'data'), XDG_CONFIG_HOME: join(root, 'config'), GIT_CONFIG_NOSYSTEM: '1', PATH: `${gh.bin}:${process.env.PATH}`, WONG_CLOUDFLARE_API: fake.api, CLOUDFLARE_MEMORY_TOKEN: '', NODE_NO_WARNINGS: '1' };
  delete env.WONG_MEMORY_API;
  delete env.CLOUDFLARE_API_TOKEN;
  delete env.CLOUDFLARE_ACCOUNT_ID;
  const sleeps = [];
  const base = { token: TOKEN, api: fake.api, account: ACCOUNT, repo: REPO, dir, env, sleep: async (ms) => sleeps.push(ms) };
  return {
    root, dir, fake, gh, env, sleeps,
    provision: (options = {}) => provision({ ...base, base: 'recipe-box', today: TODAY, ...options }),
    names: (options = {}) => names({ ...base, ...options }),
    widen: (options = {}) => widen({ ...base, ...options }),
    record: () => JSON.parse(readFileSync(join(dir, '.claude/.wong-stack.json'), 'utf8')),
    config: () => parseConfig(join(dir, 'app/wrangler.jsonc')),
  };
}

/** Asserts no secret reached gh's arguments, a report, or a file the repo would commit. */
function assertNoSecret(env, ...texts) {
  const secrets = [TOKEN, ...env.fake.state.minted, ...env.fake.state.serviceTokens.map(token => token.client_secret), readEnv(join(env.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN].filter(Boolean);
  const files = ['.claude/.wong-stack.json', 'app/wrangler.jsonc', 'app/package.json'].map((path) => join(env.dir, path)).filter(existsSync);
  for (const text of [env.gh.calls(), ...texts, ...files.map((file) => readFileSync(file, 'utf8'))]) {
    for (const secret of secrets) assert.ok(!text.includes(secret), `a secret leaked into: ${text.slice(0, 120)}`);
  }
}

// ── the permission tables ───────────────────────────────────────────────────

/** The rows of the table under `### <heading>` in permission-groups.md, keyed by its header cells. */
function tableRows(heading) {
  const lines = readFileSync(join(repoRoot, '.agents/skills/wong-setup/references/permission-groups.md'), 'utf8').split('\n');
  const start = lines.findIndex((line) => line.trim() === `### ${heading}`);
  assert.ok(start >= 0, `permission-groups.md has no "### ${heading}" section`);
  const table = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('#')) break;
    if (line.trim().startsWith('|') && !/^\|[-\s|]+\|$/.test(line.trim())) table.push(line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim().replace(/^`|`$/g, '')));
  }
  const [header, ...rows] = table;
  return rows.map((cells) => Object.fromEntries(header.map((key, i) => [key.toLowerCase(), cells[i]])));
}

const scopeOf = (scope) => scope.replace(/^com\.cloudflare\.api\./, '');

test('the group constants match the tables in permission-groups.md', () => {
  const plain = (rows) => rows.map((row) => ({ name: row.name, scope: scopeOf(row.scope), id: row.id }));
  assert.deepEqual(plain(tableRows('What the user grants')), USER_GRANTS);
  assert.deepEqual(plain(tableRows('A normal provision')), NORMAL_PROVISION);
  const deploy = tableRows('The CI deploy token');
  assert.deepEqual(plain(deploy), DEPLOY_TOKEN.map(({ name, scope, id }) => ({ name, scope, id })));
  assert.deepEqual(deploy.map((row) => row.when === 'always'), DEPLOY_TOKEN.map((row) => row.when === 'always'));
  // The fake lists the same ids, so a test run proves the lookup by name.
  for (const row of [...USER_GRANTS, ...NORMAL_PROVISION]) assert.equal(groupId(row.name), row.id, row.name);
});

test('the token link on the credentials page asks for exactly the two groups the user grants', () => {
  const page = readFileSync(join(repoRoot, 'wiki/stack/cloudflare-credentials.md'), 'utf8');
  const links = [...page.matchAll(/\((https:\/\/dash\.cloudflare\.com\/profile\/api-tokens\?[^)\s]+)\)/g)].map((m) => new URL(m[1]));
  assert.equal(links.length, 1, 'the credentials page needs one token link');
  const [link] = links;
  const keys = tableRows('What the user grants').map((row) => row.key);
  assert.equal(keys.length, 2);
  assert.deepEqual(JSON.parse(link.searchParams.get('permissionGroupKeys')), keys.map((key) => ({ key, type: 'edit' })));
  assert.equal(link.searchParams.get('accountId'), '*');
  assert.equal(link.searchParams.get('zoneId'), 'all');
  assert.equal(link.searchParams.get('name'), 'WongStack');
});

// ── the widen ───────────────────────────────────────────────────────────────

test('the widen grants a normal provision, keeps both token groups, its resources and condition, and waits out a 403', async (t) => {
  const env = await setup(t);
  env.fake.state.condition = { request_ip: { in: ['192.0.2.1/32'] } };
  env.fake.state.refusedPolls = 2;
  const report = await env.widen({ account: ACCOUNT });
  assert.deepEqual(report.granted, NORMAL_PROVISION.map((row) => row.name));
  assert.deepEqual(report.held, USER_GRANTS.map((row) => row.name));
  const [put] = env.fake.state.puts;
  assert.deepEqual(put.condition, env.fake.state.condition);
  assert.deepEqual(put.policies.map((p) => p.resources), startingPolicies().map((p) => p.resources));
  const granted = put.policies.flatMap((p) => p.permission_groups.map((g) => g.id));
  for (const row of [...USER_GRANTS, ...NORMAL_PROVISION]) assert.ok(granted.includes(row.id), row.name);
  assert.ok(!granted.includes(GROUPS.find((g) => g.scopes[0].endsWith('zone') && g.name === 'D1 Write').id), 'never the zone-scoped copy');
  assert.deepEqual(env.sleeps, [2000, 4000]);
});

test('the widen waits out a 401 as well, as Cloudflare answers while new groups take effect', async (t) => {
  const env = await setup(t);
  env.fake.state.refusedStatus = 401;
  env.fake.state.refusedPolls = 1;
  const report = await env.widen({ account: ACCOUNT });
  assert.deepEqual(report.probed, [ACCOUNT]);
  assert.deepEqual(env.sleeps, [2000]);
});

test('a token that holds every group is not widened again, and with no account every account is probed', async (t) => {
  const env = await setup(t);
  env.fake.state.accounts = [{ id: ACCOUNT, name: 'Ada' }, { id: ACCOUNT, name: 'Again' }];
  await env.widen();
  const again = await env.widen({ account: undefined });
  assert.deepEqual(again.granted, []);
  assert.deepEqual(again.probed, [ACCOUNT, ACCOUNT]);
  assert.equal(env.fake.state.puts.length, 1);
});

test('a refused or wrong-kind token stops with token; a failed or untaken widen with cloudflare', async (t) => {
  const env = await setup(t);
  env.fake.state.refuse = ['GET /user/tokens/verify'];
  await assert.rejects(env.widen(), { reason: 'token', message: 'Cloudflare GET /user/tokens/verify: HTTP 500 1000' });
  env.fake.state.refuse = [];
  env.fake.state.policies = [{ effect: 'allow', resources: { 'com.cloudflare.api.user.u1': '*' }, permission_groups: [] }];
  await assert.rejects(env.widen(), { reason: 'token', message: 'the token has no account policy for Account API Tokens Write' });
  env.fake.state.policies = [
    { effect: 'deny', resources: { 'com.cloudflare.api.user.u1': '*' }, permission_groups: [] },
    { effect: 'allow', resources: { 'com.cloudflare.api.account.zone.z1': '*' }, permission_groups: [] },
  ];
  await assert.rejects(env.widen(), { reason: 'token', message: 'the token has no user policy for API Tokens Write' });
  env.fake.state.policies = startingPolicies();
  env.fake.state.refuse = ['PUT /user/tokens/tok1'];
  await assert.rejects(env.widen({ account: ACCOUNT }), { reason: 'cloudflare' });
  env.fake.state.refuse = [];
  env.fake.state.refusedPolls = 99;
  await assert.rejects(env.widen({ account: ACCOUNT }), { reason: 'cloudflare', message: /HTTP 403 10000/ });
  assert.deepEqual(env.sleeps, [2000, 4000, 8000, 15000, 30000]);
  env.fake.state.refusedPolls = 0;
  env.fake.state.refuse = [`GET /accounts/${ACCOUNT}/d1`];
  const before = env.fake.count(`GET /accounts/${ACCOUNT}/d1`);
  await assert.rejects(env.widen({ account: ACCOUNT }), { reason: 'cloudflare' });
  assert.equal(env.fake.count(`GET /accounts/${ACCOUNT}/d1`) - before, 1, 'an error that is neither 401 nor 403 is not retried');
});

test('an Access probe still refused stops the widen, unless the caller will finish open', async (t) => {
  const env = await setup(t);
  env.fake.state.refusedAccessPolls = 99;
  await assert.rejects(env.widen({ account: ACCOUNT }), { reason: 'cloudflare', message: new RegExp(`GET /accounts/${ACCOUNT}/access/apps: HTTP 403 10000`) });
  assert.deepEqual(env.sleeps, [2000, 4000, 8000, 15000, 30000]);
  env.sleeps.length = 0;
  const probes = () => ['apps', 'identity_providers', 'service_tokens'].map((surface) => env.fake.count(`GET /accounts/${ACCOUNT}/access/${surface}`));
  const before = probes();
  const report = await env.widen({ account: ACCOUNT, openWithoutLogin: true });
  assert.deepEqual(report.accessPending, ['apps', 'identity_providers', 'service_tokens']);
  assert.deepEqual(env.sleeps, [2000, 4000, 8000, 15000, 30000], 'one full wait, not three');
  assert.deepEqual(probes().map((count, i) => count - before[i]), [PROPAGATION.length + 1, 1, 1], 'the later surfaces get one try each');
});

test('on the open path a probe that clears is not pending, and the database probe still stops', async (t) => {
  const env = await setup(t);
  env.fake.state.refusedAccessPolls = 1;
  const cleared = await env.widen({ account: ACCOUNT, openWithoutLogin: true });
  assert.deepEqual(cleared.accessPending, []);
  assert.deepEqual(env.sleeps, [2000]);
  const closed = await env.widen({ account: ACCOUNT });
  assert.equal('accessPending' in closed, false);
  env.fake.state.refusedPolls = 99;
  await assert.rejects(env.widen({ account: ACCOUNT, openWithoutLogin: true }), { reason: 'cloudflare', message: /d1\/database: HTTP 403 10000/ });
  env.fake.state.refusedPolls = 0;
  env.fake.state.refuse = [`GET /accounts/${ACCOUNT}/access/identity_providers`];
  await assert.rejects(env.widen({ account: ACCOUNT, openWithoutLogin: true }), { reason: 'cloudflare', message: /HTTP 500/ });
});

test('a permission group Cloudflare does not list stops with token', async (t) => {
  const env = await setup(t);
  const fetchWithout = async (url, init) => {
    const response = await fetch(url, init);
    if (!url.includes('permission_groups')) return response;
    const data = await response.json();
    return new Response(JSON.stringify({ ...data, result: data.result.filter((g) => g.name !== 'Workers CI Read') }));
  };
  await assert.rejects(env.widen({ fetch: fetchWithout }), { reason: 'token', message: 'Cloudflare lists no account permission group named Workers CI Read' });
});

// ── accounts and names ──────────────────────────────────────────────────────

test('accounts lists what the token sees', async (t) => {
  const env = await setup(t);
  assert.deepEqual(await accounts({ token: TOKEN, api: env.fake.api }), { accounts: [{ id: ACCOUNT, name: 'Ada' }] });
  env.fake.state.refuse = ['GET /accounts'];
  await assert.rejects(accounts({ token: TOKEN, api: env.fake.api }), { reason: 'token' });
});

test('names are derived from the repo, and a clash moves every name to the first free suffix', async (t) => {
  const env = await setup(t);
  const fresh = await env.names();
  assert.equal(fresh.base, 'recipe-box');
  assert.ok(fresh.checked.every((item) => item.status === 'free'));
  assert.deepEqual(fresh.names, { worker: 'recipe-box', staging: 'recipe-box-staging', db: 'recipe-box-db', stagingDb: 'recipe-box-db-staging', memory: 'recipe-box-memory', deploy: 'recipe-box-deploy' });

  env.fake.state.workers.push('recipe-box');
  env.fake.state.databases.push({ uuid: 'theirs', name: 'recipe-box-2-memory' });
  env.fake.state.buckets.push('recipe-box-3-memory');
  env.fake.state.accountTokens.push({ id: 'x', name: 'recipe-box-4-deploy', policies: [] });
  const clash = await env.names();
  assert.equal(clash.derived, 'recipe-box');
  assert.equal(clash.base, 'recipe-box-5');
  assert.deepEqual(clash.checked.filter((item) => item.status === 'taken'), [{ kind: 'worker', name: 'recipe-box', status: 'taken' }]);

  // Once this repo provisions under a base, that base is ours.
  await env.provision({ base: clash.base });
  const rerun = await env.names();
  assert.equal(rerun.base, 'recipe-box-5');
  assert.ok(rerun.checked.filter((item) => item.kind !== 'worker').every((item) => item.status === 'ours'), JSON.stringify(rerun.checked));
  assert.equal(env.fake.state.databases.find((d) => d.uuid === 'theirs').name, 'recipe-box-2-memory', 'nothing of the other project is touched');
});

test('names read the base from the install record, and skip buckets when R2 is off', async (t) => {
  const env = await setup(t, { r2: false });
  mkdirSync(join(env.dir, '.claude'), { recursive: true });
  writeFileSync(join(env.dir, '.claude/.wong-stack.json'), JSON.stringify({ components: { memory: { database: 'older-memory' } } }));
  const report = await env.names();
  assert.equal(report.base, 'older');
  env.fake.state.refuse = [`GET /accounts/${ACCOUNT}/workers/scripts`];
  await assert.rejects(env.names(), { reason: 'cloudflare' });
});

test('safeName makes a Workers and D1 name, and falls back to wongstack', () => {
  assert.equal(safeName('My_Repo.v2'), 'my-repo-v2');
  assert.equal(safeName('--a..b--'), 'a-b');
  assert.equal(safeName('x'.repeat(50)), 'x'.repeat(40));
  assert.equal(safeName('___'), 'wongstack');
});

// ── provision ───────────────────────────────────────────────────────────────

test('a fresh provision with R2 on makes the memory store, the key, both databases, the config, and the deploy token', async (t) => {
  const env = await setup(t);
  const report = await env.provision();

  // The memory store, recorded with the Worker that serves it, migrated, with the admin key in .env.
  assert.equal(report.r2, true);
  assert.deepEqual(env.record().components.companyApi, { origin: "https://recipe-box.ada.workers.dev" });
  assert.deepEqual(env.fake.state.buckets, ['recipe-box-memory']);
  assert.deepEqual(env.record().components.memory, {
    accountId: ACCOUNT, databaseId: 'uuid-recipe-box-memory', database: 'recipe-box-memory', bucket: 'recipe-box-memory',
    worker: 'https://recipe-box.ada.workers.dev/_memory',
  });
  assert.ok(env.fake.rows('recipe-box-memory', 'SELECT version FROM schema_migrations').length >= 3);
  const [admin] = env.fake.rows('recipe-box-memory', 'SELECT email, role, github_id, machine_id, login_link_hash, expires_at IS NOT NULL AS ends FROM memory_keys');
  assert.equal(admin.email, EMAIL); assert.equal(admin.role, 'admin'); assert.equal(admin.github_id, null); assert.equal(admin.ends, 0);
  assert.match(admin.machine_id, /^[0-9a-f-]{36}$/); assert.match(admin.login_link_hash, /^[0-9a-f]{64}$/);
  assert.match(report.appUrl, /memory_login_link=wongl_/);
  assert.deepEqual(env.fake.rows('recipe-box-memory', 'SELECT github_id, login, email FROM memory_admins'), []);
  assert.match(readEnv(join(env.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN, /^wongm_/);
  assert.equal(readEnv(join(env.dir, '.env')).CLOUDFLARE_API_TOKEN, TOKEN, 'the other .env lines stay');

  // The app's databases and config, from the fragment, through the pipeline's own parser.
  assert.deepEqual(env.fake.state.databases.map((d) => d.name).sort(), ['recipe-box-db', 'recipe-box-db-staging', 'recipe-box-memory']);
  const config = env.config();
  assert.equal(workerName(config), 'recipe-box');
  assert.equal(workerName(config, 'staging'), 'recipe-box-staging');
  assert.equal(databaseName(config), 'recipe-box-db');
  assert.equal(databaseName(config, 'staging'), 'recipe-box-db-staging');
  assert.equal(config.compatibility_date, TODAY);
  assert.deepEqual(config.d1_databases[1], { binding: 'MEMORY_DB', database_name: 'recipe-box-memory', database_id: 'uuid-recipe-box-memory' });
  assert.deepEqual(config.r2_buckets, [{ binding: 'MEMORY_BUCKET', bucket_name: 'recipe-box-memory' }]);
  assert.equal(config.env.staging.triggers, undefined);
  assert.deepEqual(config.env.staging.d1_databases.map((d) => d.database_id), ['uuid-recipe-box-db-staging']);
  const text = readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8');
  assert.match(text, /\/\/ Session memory, production only/, 'the fragment keeps its comments');
  assert.doesNotMatch(text, /<[^<>\n]+>/, 'no placeholder is left');
  const scripts = Object.keys(JSON.parse(readFileSync(join(env.dir, 'app/package.json'), 'utf8')).scripts);
  assert.deepEqual(scripts.slice(scripts.indexOf('build:app'), scripts.indexOf('build:app') + 3), ['build:app', 'db:migrate:staging', 'db:migrate:prod']);

  // The deploy token: the always rows plus R2, on this account only, straight into the secret.
  const deploy = env.fake.state.accountTokens.find((token) => token.name === 'recipe-box-deploy');
  assert.deepEqual(deploy.policies, [{
    effect: 'allow', resources: { [`com.cloudflare.api.account.${ACCOUNT}`]: '*' },
    permission_groups: ['Access: Apps and Policies Read', 'Workers Scripts Write', 'D1 Write', 'Account Settings Read', 'Workers R2 Storage Write'].map((name) => ({ id: groupId(name) })),
  }]);
  assert.deepEqual(env.gh.secrets(), { CLOUDFLARE_API_TOKEN: env.fake.state.minted[0], CLOUDFLARE_ACCOUNT_ID: ACCOUNT });

  assert.deepEqual(report.urls, { production: 'https://recipe-box.ada.workers.dev', previews: 'https://<branch>-recipe-box-staging.ada.workers.dev' });
  assert.ok(report.created.includes('deploy token recipe-box-deploy'));
  assert.deepEqual(report.reused, ['Zero Trust organization', 'one-time PIN identity provider']);
  assertNoSecret(env, JSON.stringify(report));
});

test('with R2 off the store has no bucket, the config binds none, and the deploy token gets no R2 row', async (t) => {
  const env = await setup(t, { r2: false });
  const report = await env.provision();
  assert.equal(report.r2, false);
  assert.equal(env.record().components.memory.bucket, null);
  assert.equal(env.config().r2_buckets, undefined);
  assert.doesNotMatch(readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8'), /Only when the memory store has a bucket/);
  const [deploy] = env.fake.state.accountTokens;
  assert.ok(!deploy.policies[0].permission_groups.some((g) => g.id === groupId('Workers R2 Storage Write')));
});

// The key lives in the primary checkout's .env, never in a worktree that may be deleted. The primary
// records the memory Worker, as an installed primary does, so the worktree's memory script can reach it.
test('provisioning from a linked worktree keeps the key in the primary checkout\'s .env', async (t) => {
  const env = await setup(t);
  const git = (...args) => execFileSync('git', ['-C', env.dir, '-c', 'user.name=Ada', ...args], { env: env.env });
  writeFileSync(join(env.dir, '.gitignore'), '.env\n');
  writeFileSync(join(env.dir, '.claude/.wong-stack.json'), JSON.stringify({ components: { memory: { worker: 'https://recipe-box.ada.workers.dev/_memory' } } }));
  git('add', '-A');
  git('commit', '-q', '-m', 'install');
  const worktree = join(env.root, 'recipe-box-wt');
  git('worktree', 'add', '-q', '-b', 'wt', worktree);

  const report = await env.provision({ dir: worktree });
  assert.ok(report.created.includes('admin machine memory key in .env'), JSON.stringify(report));
  assert.match(readEnv(join(env.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN, /^wongm_/);
  const branchEnv = readEnv(join(worktree, '.env'));
  assert.equal(branchEnv.CLOUDFLARE_MEMORY_TOKEN, undefined, 'the admin memory key stays in the primary checkout');
  assert.equal(branchEnv.CLOUDFLARE_API_TOKEN, undefined, 'the user token is not copied');
  assert.equal(branchEnv.CF_ACCESS_CLIENT_SECRET, readEnv(join(env.dir, '.env')).CF_ACCESS_CLIENT_SECRET, 'verification credentials follow the branch-copy convention');
});

// A bare repository's worktree has no primary checkout; setup once saved the keys in the worktree itself.
test('provisioning stops, naming why, when the main copy of the repo is unknown', async (t) => {
  const env = await setup(t);
  const git = (cwd, ...args) => execFileSync('git', ['-C', cwd, '-c', 'user.name=Ada', '-c', `user.email=${EMAIL}`, ...args], { env: env.env });
  const bare = join(env.root, 'bare.git');
  git(env.root, 'init', '-q', '--bare', '-b', 'main', bare);
  git(env.dir, 'commit', '-q', '--allow-empty', '-m', 'start');
  git(env.dir, 'push', '-q', bare, 'main');
  const worktree = join(env.root, 'bare-wt');
  git(bare, 'worktree', 'add', '-q', worktree, 'main');
  await assert.rejects(env.provision({ dir: worktree }), { reason: 'repo', message: /could not find the main copy of this repo.*primary worktree is unknown/ });
  assert.equal(existsSync(join(worktree, '.env')), false);
  assert.deepEqual(env.fake.state.databases, [], 'nothing was made on Cloudflare');
});

test('a second run creates nothing, keeps the key, and leaves the secrets alone', async (t) => {
  const env = await setup(t);
  await env.provision();
  const key = readEnv(join(env.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN;
  const config = readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8');
  const calls = env.gh.calls();
  const report = await env.provision({ today: '2027-01-01' });
  assert.deepEqual(report.created, []);
  assert.deepEqual(report.updated, []);
  assert.ok(report.reused.includes('admin memory key in .env'));
  assert.equal(readEnv(join(env.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN, key);
  assert.equal(readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8'), config);
  assert.equal(env.gh.calls().slice(calls.length), `secret list -R ${REPO}\n`);
  assert.equal(env.fake.state.minted.length, 1);
});

// A run that stops at each step, then runs again, ends with one of everything.
for (const [where, refuse] of [
  ['the R2 check', `GET /accounts/${ACCOUNT}/r2/buckets`],
  ['the bucket', `POST /accounts/${ACCOUNT}/r2/buckets`],
  ['the subdomain', `GET /accounts/${ACCOUNT}/workers/subdomain`],
  ['the app databases', `GET /accounts/${ACCOUNT}/d1/database?name=recipe-box-db`],
  ['the deploy token', `POST /accounts/${ACCOUNT}/tokens`],
  ['the secret', 'gh'],
]) {
  test(`a run that stops at ${where} finishes on the next run with no duplicate`, async (t) => {
    const env = await setup(t);
    if (refuse === 'gh') env.gh.fail();
    else env.fake.state.refuse = [refuse];
    await assert.rejects(env.provision(), { reason: 'cloudflare' });
    env.fake.state.refuse = [];
    env.gh.fail(false);
    await env.provision();
    assert.equal(env.fake.state.databases.length, 3);
    assert.deepEqual(env.fake.state.buckets, ['recipe-box-memory']);
    assert.equal(env.fake.state.accountTokens.length, 1);
    assert.equal(env.fake.rows('recipe-box-memory', 'SELECT count(*) AS n FROM memory_keys')[0].n, 1);
    assert.equal(env.gh.secrets().CLOUDFLARE_API_TOKEN, env.fake.state.minted.at(-1));
    assert.ok(env.config().name);
  });
}

test('a store with no bucket, on an account that now has R2, gets one, in the record, the config, and the deploy token', async (t) => {
  const env = await setup(t, { r2: false });
  await env.provision();
  const key = readEnv(join(env.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN;
  env.fake.state.r2 = true;
  const report = await env.provision();
  assert.deepEqual(env.fake.state.buckets, ['recipe-box-memory']);
  assert.equal(env.record().components.memory.bucket, 'recipe-box-memory');
  assert.deepEqual(env.config().r2_buckets, [{ binding: 'MEMORY_BUCKET', bucket_name: 'recipe-box-memory' }]);
  assert.equal(env.config().env.staging.r2_buckets, undefined, 'staging never binds memory');
  const [deploy] = env.fake.state.accountTokens;
  assert.ok(deploy.policies[0].permission_groups.some((g) => g.id === groupId('Workers R2 Storage Write')));
  assert.ok(report.updated.includes('deploy token recipe-box-deploy: Workers R2 Storage Write'));
  assert.equal(env.fake.state.minted.length, 1, 'the secret stays; only the policy changes');
  assert.equal(readEnv(join(env.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN, key);
});

test('a config with no top-level env is left for a hand edit when a bucket arrives', async (t) => {
  const env = await setup(t, { r2: false });
  writeFileSync(join(env.dir, 'app/wrangler.jsonc'), '{ "name": "recipe-box" }\n');
  env.fake.state.r2 = true;
  const report = await env.provision();
  assert.deepEqual(report.todo, ['add MEMORY_BUCKET for recipe-box-memory to app/wrangler.jsonc']);
  assert.equal(readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8'), '{ "name": "recipe-box" }\n');
});

test('keepConfig leaves the committed files alone and adds no bucket they would need', async (t) => {
  const env = await setup(t, { r2: false });
  await env.provision();
  const files = ['app/wrangler.jsonc', 'app/package.json', '.claude/.wong-stack.json'].map((path) => readFileSync(join(env.dir, path), 'utf8'));
  env.fake.state.r2 = true;
  rmSync(join(env.gh.bin, '..', 'secrets'), { recursive: true });
  mkdirSync(join(env.gh.bin, '..', 'secrets'));
  const report = await env.provision({ keepConfig: true });
  assert.deepEqual(['app/wrangler.jsonc', 'app/package.json', '.claude/.wong-stack.json'].map((path) => readFileSync(join(env.dir, path), 'utf8')), files);
  assert.deepEqual(env.fake.state.buckets, []);
  assert.deepEqual(Object.keys(env.gh.secrets()).sort(), ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'], 'a rebuilt host sets the secrets again');
  assert.ok(report.updated.includes('deploy token recipe-box-deploy: new value sent to GitHub'));
});

test('memory admin issuance needs no git email or GitHub account, while the website keeps its reachable owner', async (t) => {
  const env = await setup(t, { email: null });
  const report = await env.provision({ ownerEmail: EMAIL });
  const [key] = env.fake.rows('recipe-box-memory', 'SELECT machine_id, role, expires_at, github_id FROM memory_keys');
  assert.match(key.machine_id, /^[0-9a-f-]{36}$/); assert.equal(key.role, 'admin'); assert.equal(key.expires_at, null); assert.equal(key.github_id, null);
  assert.match(report.appUrl, /memory_login_link=wongl_/);
});

test('the memory schema is retried while the store takes effect', async (t) => {
  const env = await setup(t);
  env.fake.state.d1Failures = 2;
  await env.provision();
  assert.deepEqual(env.sleeps, [2000, 4000]);
});

test('an account with no workers.dev subdomain gets one named for the owner, with a number on a clash', async (t) => {
  const env = await setup(t, { subdomain: null });
  const report = await env.provision();
  assert.equal(env.fake.state.subdomain, 'ada-2');
  assert.ok(report.created.includes('workers.dev subdomain ada-2'));
  assert.equal(env.record().components.memory.worker, 'https://recipe-box.ada-2.workers.dev/_memory');
  assert.equal(env.record().components.companyApi.origin, 'https://recipe-box.ada-2.workers.dev');
});

test('five taken subdomains stop with cloudflare', async (t) => {
  const env = await setup(t, { subdomain: null });
  env.fake.state.refuse = [`PUT /accounts/${ACCOUNT}/workers/subdomain`];
  await assert.rejects(env.provision(), { reason: 'cloudflare' });
  assert.equal(env.fake.count(`PUT /accounts/${ACCOUNT}/workers/subdomain`), 5);
});

// ── the config fragment ─────────────────────────────────────────────────────

test('the wrangler config fills every placeholder, and a new placeholder fails', () => {
  const ids = { db: 'id-db', stagingDb: 'id-staging', memory: 'id-memory' };
  const text = wranglerConfig({ base: 'demo', ids, bucket: null, today: TODAY });
  const config = JSON.parse(stripJsonc(text));
  assert.equal(config.assets.binding, 'ASSETS');
  assert.equal(config.main, 'worker/index.ts');
  assert.deepEqual(config.env.staging.d1_databases[0], { binding: 'DB', database_name: 'demo-db-staging', database_id: 'id-staging', migrations_dir: '../schema/migrations' });
  assert.equal(config.vars.WORKSPACE_LOGIN, undefined);
  const open = JSON.parse(stripJsonc(wranglerConfig({ base: 'demo', ids, bucket: null, today: TODAY, access: { mode: 'open' } })));
  assert.deepEqual([open.vars.WORKSPACE_LOGIN, open.env.staging.vars.WORKSPACE_LOGIN, open.env.local.vars.WORKSPACE_LOGIN], ['off', 'off', undefined]);
  assert.equal(open.vars.CF_ACCESS_AUD, '');
  assert.throws(() => wranglerConfig({ base: 'demo', ids, bucket: null, today: TODAY }, `${wranglerFragment()}// <your-new-thing>\n`), { reason: 'repo', message: /<your-new-thing>/ });
  const other = join(mkdtempSync(join(tmpdir(), 'wong-test-fragment-')), 'none.md');
  writeFileSync(other, '# Nothing here\n');
  assert.throws(() => wranglerFragment(other), { reason: 'repo' });
  rmSync(dirname(other), { recursive: true });
});

// ── the helpers ─────────────────────────────────────────────────────────────

test('a Cloudflare error names the call and codes, never the token or the query', async () => {
  const refused = cloudflare(TOKEN, { api: 'http://x', fetch: async () => new Response(JSON.stringify({ success: false, errors: [{ code: 9109 }, { code: R2_OFF }] }), { status: 403 }) });
  await assert.rejects(refused('GET', '/user/tokens?per_page=100'), (error) => {
    assert.ok(error instanceof CloudflareError);
    assert.equal(error.message, `Cloudflare GET /user/tokens: HTTP 403 9109,${R2_OFF}`);
    return true;
  });
  const garbled = cloudflare(TOKEN, { api: 'http://x/', fetch: async () => new Response('not json', { status: 502 }) });
  await assert.rejects(garbled('POST', '/x', {}), { message: 'Cloudflare POST /x: HTTP 502' });
  const offline = cloudflare(TOKEN, { api: 'http://x', fetch: async () => { throw new TypeError(`fetch failed for ${TOKEN}`); } });
  await assert.rejects(offline('GET', '/y'), { message: 'Cloudflare GET /y: unreachable' });
});

test('readEnv handles export, quotes, and comments', (t) => {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-env-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  writeFileSync(join(dir, '.env'), '# note\nexport A=1\nB="two # kept"\nC=three # cut\nnot a line\n');
  assert.deepEqual(readEnv(join(dir, '.env')), { A: '1', B: 'two # kept', C: 'three' });
  assert.deepEqual(readEnv(join(dir, 'missing')), {});
});

test('run feeds stdin, returns output, and rejects with the last line of stderr', async () => {
  assert.equal((await run('cat', [], { input: 'hello' })).stdout, 'hello');
  await assert.rejects(run('sh', ['-c', 'echo first >&2; echo last >&2; exit 3']), { message: 'sh exited with 3: last' });
  await assert.rejects(run('sh', ['-c', 'exit 4']), { message: 'sh exited with 4' });
  await assert.rejects(run('/no/such/command', []), { code: 'ENOENT' });
});

// ── the command line ────────────────────────────────────────────────────────

const lines = () => {
  const out = [];
  const err = [];
  return { out, err, io: { out: (line) => out.push(line), err: (line) => err.push(line) } };
};

test('the command line lists four commands, and refuses bad usage with 2', async () => {
  const help = lines();
  assert.equal(await cli(['--help'], help.io), 0);
  for (const command of ['widen', 'accounts', 'names', 'provision']) assert.match(help.out[0], new RegExp(`^  ${command}\\b`, 'm'));
  for (const argv of [[], ['nope'], ['widen', 'extra'], ['--nope'], ['names'], ['provision', '--repo', REPO]]) {
    const bad = lines();
    assert.equal(await cli(argv, { ...bad.io, env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT } }), 2, argv.join(' '));
  }
});

test('the command line reads the token from the target .env and prints one JSON report', async (t) => {
  const env = await setup(t);
  const io = lines();
  assert.equal(await cli(['widen', '--dir', env.dir], { ...io.io, env: { WONG_CLOUDFLARE_API: env.fake.api } }), 0);
  assert.deepEqual(JSON.parse(io.out[0]).probed, [ACCOUNT]);
  const none = lines();
  assert.equal(await cli(['accounts', '--dir', join(env.dir, 'app')], { ...none.io, env: {} }), 1);
  assert.deepEqual(JSON.parse(none.out[0]), { error: { reason: 'token', cause: 'CLOUDFLARE_API_TOKEN is not set in the environment or the target .env' } });
  const badAccount = lines();
  assert.equal(await cli(['names', '--repo', REPO, '--account', 'nope', '--dir', env.dir], { ...badAccount.io, env: {} }), 1);
  assert.equal(JSON.parse(badAccount.out[0]).error.reason, 'token');
  const refused = lines();
  env.fake.state.refuse = ['GET /user/tokens/verify'];
  assert.equal(await cli(['widen', '--dir', env.dir], { ...refused.io, env: { WONG_CLOUDFLARE_API: env.fake.api }, sleep: noSleep }), 1);
  assert.equal(JSON.parse(refused.out[0]).error.reason, 'token');
  assert.equal(refused.err[0], 'provision: Cloudflare GET /user/tokens/verify: HTTP 500 1000');
});

test('the command line passes --open-without-login to provision', async (t) => {
  const env = await setup(t);
  needsOnboarding(env);
  const argv = ['provision', '--repo', REPO, '--base', 'recipe-box', '--dir', env.dir];
  const stopped = lines();
  assert.equal(await cli(argv, { ...stopped.io, env: env.env, sleep: noSleep }), 1);
  assert.equal(JSON.parse(stopped.out[0]).error.reason, 'access');
  const open = lines();
  assert.equal(await cli([...argv, '--open-without-login'], { ...open.io, env: env.env, sleep: noSleep }), 0, open.err.join('\n'));
  assert.equal(JSON.parse(open.out[0]).access.mode, 'open');
});

test('the script runs end to end as a process, and prints no secret', async (t) => {
  const env = await setup(t);
  const cli = (args) => new Promise((done) => {
    execFile(process.execPath, [SCRIPT, ...args, '--dir', env.dir], { env: env.env, encoding: 'utf8' }, (error, stdout, stderr) => done({ code: error ? error.code : 0, stdout, stderr }));
  });
  const found = await cli(['names', '--repo', REPO]);
  assert.equal(found.code, 0, found.stderr);
  const { base } = JSON.parse(found.stdout);
  const made = await cli(['provision', '--repo', REPO, '--base', base]);
  assert.equal(made.code, 0, made.stderr);
  assert.equal(JSON.parse(made.stdout).memory.worker, 'https://recipe-box.ada.workers.dev/_memory');
  assertNoSecret(env, made.stdout, made.stderr, found.stdout);
});
