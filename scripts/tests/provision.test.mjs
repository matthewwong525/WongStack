// The shared provisioning script, .agents/skills/wong-setup/scripts/provision.mjs, against a fake
// Cloudflare over HTTP and a fake `gh`. Children run asynchronously, so the fake keeps answering.
import assert from 'node:assert/strict';
import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

import {
  ACCESS_KEY, ACCESS_KEY_TODO, ARTIFACTS_PROVISION, CLOUDFLARE_READ_KEY, CLOUDFLARE_READ_KEY_TODO, CODE_KEY, CODE_KEY_TODO, CloudflareError, DEPLOY_TOKEN, NAMESPACE, NORMAL_PROVISION, PROPAGATION, R2_OFF, ROUTINES_PROVISION, SNAPSHOT_DAYS, STORAGE_TOKEN, USER_GRANTS,
  accounts, artifactNamesFor, cli, cloudflare, githubRepo, names, plan, provision, readEnv, run, runnerConfig, safeName, widen, widenBy, wranglerConfig, wranglerFragment,
} from '../../.agents/skills/wong-setup/scripts/provision.mjs';
import { helperConfig } from '../../.agents/skills/save/scripts/artifacts-credential.mjs';
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
// A Worker upload, as distinct from the secret or the subdomain setting under the same script.
const SCRIPT_UPLOAD = /\/workers\/scripts\/[^/]+$/;

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
  // An open site has no sign-in to know an owner by, and no sign-in list to hold a key for.
  assert.deepEqual([config.vars.WONG_OWNER_EMAIL, config.env.staging.vars.WONG_OWNER_EMAIL], ['', '']);
  assert.deepEqual([report.accessKey, report.cloudflareReadKey], [undefined, undefined]);
  assert.deepEqual(env.fake.state.workerSecrets, {});
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
  assert.equal(env.fake.calls.filter(call => call.method === 'PUT' && SCRIPT_UPLOAD.test(call.path)).length, 0, 'the deployed Workers are adopted, not replaced');
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
  assert.deepEqual(report.todo, [CODE_KEY_TODO]);
  // The site is private now, so Access learns its owner and the live app gets its key.
  assert.deepEqual([config.vars.WONG_OWNER_EMAIL, config.env.staging.vars.WONG_OWNER_EMAIL], [EMAIL, EMAIL]);
  assert.ok(report.updated.includes('app/wrangler.jsonc WONG_OWNER_EMAIL'));
  assert.deepEqual(Object.keys(env.fake.state.workerSecrets['recipe-box']), ['WONG_ACCESS_LOGIN_MANAGEMENT', 'WONG_CLOUDFLARE_READ']);
  assert.deepEqual(Object.keys(env.fake.state.workerSecrets['recipe-box-staging']), ['WONG_CLOUDFLARE_READ']);
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
  const uploads = env.fake.calls.filter(call => call.method === 'PUT' && SCRIPT_UPLOAD.test(call.path));
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
  assert.equal(env.fake.calls.filter(call => call.method === 'PUT' && SCRIPT_UPLOAD.test(call.path)).length, 2);
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
  assert.equal(env.fake.calls.filter(call => call.method === 'PUT' && SCRIPT_UPLOAD.test(call.path)).length, 2);
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
  assert.equal(env.fake.calls.filter(call => call.method === 'PUT' && SCRIPT_UPLOAD.test(call.path)).length, 2);
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
    assert.equal(env.fake.calls.filter(call => call.method === 'PUT' && SCRIPT_UPLOAD.test(call.path)).length, 2);
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
    // The live app's key is stored as a secret: no upload, and no publication choice, changes.
    assert.equal(env.fake.calls.filter(call => ['PUT', 'POST'].includes(call.method) && call.path.includes('/workers/scripts/') && !call.path.endsWith('/secrets')).length, 0);
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

/**
 * A target with the memory skill and the app's package.json, as an install leaves it before provisioning.
 * Any other option (`paid`, `repos`) goes to the fake Cloudflare.
 */
async function setup(t, { r2 = true, email = EMAIL, subdomain, ...cloudflareOptions } = {}) {
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
  const fake = await fakeCloudflare({ r2, ...(subdomain !== undefined && { subdomain }), ...cloudflareOptions });
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
    plan: (options = {}) => plan({ ...base, ...options }),
    record: () => JSON.parse(readFileSync(join(dir, '.claude/.wong-stack.json'), 'utf8')),
    config: () => parseConfig(join(dir, 'app/wrangler.jsonc')),
  };
}

/** Asserts no secret reached gh's arguments, a report, or a file the repo would commit. */
function assertNoSecret(env, ...texts) {
  const { state } = env.fake;
  const secrets = [
    TOKEN, ...state.minted, ...state.serviceTokens.map(token => token.client_secret), readEnv(join(env.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN,
    ...Object.values(state.workerSecrets).flatMap((held) => Object.values(held)), ...state.repoTokens.map((token) => token.plaintext.split('?')[0]),
  ].filter(Boolean);
  const files = ['.claude/.wong-stack.json', 'app/wrangler.jsonc', 'app/package.json', 'scripts/check-runner/wrangler.jsonc'].map((path) => join(env.dir, path)).filter(existsSync);
  for (const text of [env.gh.calls(), ...texts, ...files.map((file) => readFileSync(file, 'utf8'))]) {
    for (const secret of secrets) assert.ok(!text.includes(secret), `a secret leaked into: ${text.slice(0, 120)}`);
  }
}

// ── the permission tables ───────────────────────────────────────────────────

const PERMISSION_GROUPS = '.agents/skills/wong-setup/references/permission-groups.md';
const ARTIFACTS_ROUTE = 'wiki/stack/artifacts-route.md';

/** The rows of the table under `### <heading>` in `file` (permission-groups.md unless named), keyed by its header cells. */
function tableRows(heading, file = PERMISSION_GROUPS) {
  const lines = readFileSync(join(repoRoot, file), 'utf8').split('\n');
  const start = lines.findIndex((line) => line.trim() === `### ${heading}`);
  assert.ok(start >= 0, `${file} has no "### ${heading}" section`);
  const table = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith('#')) break;
    if (line.trim().startsWith('|') && !/^\|[-\s|]+\|$/.test(line.trim())) table.push(line.trim().replace(/^\||\|$/g, '').split('|').map((cell) => cell.trim().replace(/^`|`$/g, '')));
  }
  const [header, ...rows] = table;
  return rows.map((cells) => Object.fromEntries(header.map((key, i) => [key.toLowerCase(), cells[i]])));
}

const scopeOf = (scope) => scope.replace(/^com\.cloudflare\.api\./, '');

test('the group constants match the tables in permission-groups.md and on the Artifacts route page', () => {
  const plain = (rows) => rows.map((row) => ({ name: row.name, scope: scopeOf(row.scope), id: row.id }));
  assert.deepEqual(plain(tableRows('What the user grants')), USER_GRANTS);
  assert.deepEqual(plain(tableRows('A normal provision')), NORMAL_PROVISION);
  const deploy = tableRows('The CI deploy token');
  assert.deepEqual(plain(deploy), DEPLOY_TOKEN.map(({ name, scope, id }) => ({ name, scope, id })));
  assert.deepEqual(deploy.map((row) => row.when === 'always'), DEPLOY_TOKEN.map((row) => row.when === 'always'));
  assert.deepEqual(plain(tableRows('The read-only look-up key')), CLOUDFLARE_READ_KEY);
  // An Artifacts install's groups, and its runner's storage key, are tabled on the route's own page.
  assert.deepEqual(plain(tableRows('An Artifacts install', ARTIFACTS_ROUTE)), ARTIFACTS_PROVISION);
  assert.deepEqual(plain(tableRows('The check runner\'s storage key', ARTIFACTS_ROUTE)), [STORAGE_TOKEN]);
  // The fake lists the same ids, so a test run proves the lookup by name.
  for (const row of [...USER_GRANTS, ...NORMAL_PROVISION, ...ARTIFACTS_PROVISION, STORAGE_TOKEN]) assert.equal(groupId(row.name), row.id, row.name);
  for (const row of CLOUDFLARE_READ_KEY) assert.equal(GROUPS.find((g) => g.name === row.name && g.scopes[0].endsWith(row.scope)).id, row.id, row.name);
});

// A group joins the look-up key only by being named, so a product that stores data is never in it.
test('the read-only look-up key is an allow-list of Read groups, with no product that stores data', () => {
  assert.equal(new Set(CLOUDFLARE_READ_KEY.map((row) => row.name)).size, 11);
  for (const { name, scope } of CLOUDFLARE_READ_KEY) {
    assert.match(name, / Read$/, name);
    assert.doesNotMatch(name, /D1|KV|R2|Queue|Vectorize|Hyperdrive|Durable Object|Secrets Store|Stream|Images/, name);
    assert.match(scope, /^(account|zone)$/, name);
  }
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

test('setup records the owner for Access and gives the live app alone its own sign-in list key', async (t) => {
  const env = await setup(t);
  const report = await env.provision();
  const config = env.config();
  assert.deepEqual([config.vars.WONG_OWNER_EMAIL, config.env.staging.vars.WONG_OWNER_EMAIL, config.env.local.vars.WONG_OWNER_EMAIL], [EMAIL, EMAIL, undefined]);
  const key = env.fake.state.accountTokens.find((token) => token.name === 'recipe-box-access');
  assert.deepEqual(key.policies, [{ effect: 'allow', resources: { [`com.cloudflare.api.account.${ACCOUNT}`]: '*' }, permission_groups: [{ id: groupId('Access: Apps and Policies Write') }] }]);
  assert.deepEqual(ACCESS_KEY, [{ name: 'Access: Apps and Policies Write', scope: 'account', id: groupId('Access: Apps and Policies Write') }]);
  // Production holds the key with the ids the app needs; staging never holds it.
  assert.deepEqual(Object.keys(env.fake.state.workerSecrets['recipe-box-staging']), ['WONG_CLOUDFLARE_READ']);
  assert.deepEqual(JSON.parse(env.fake.state.workerSecrets['recipe-box'].WONG_ACCESS_LOGIN_MANAGEMENT),
    { version: 2, token: env.fake.state.minted[1], accountId: ACCOUNT, policyId: env.record().components.access.humanPolicyId });
  assert.deepEqual(report.accessKey, { status: 'ready', id: key.id });
  assert.deepEqual(env.record().components.accessKey, report.accessKey);
  assert.ok(report.created.includes('sign-in list key recipe-box-access, stored in the live app only'));
  // The deploy token is not reused and gains no Access write.
  const deploy = env.fake.state.accountTokens.find((token) => token.name === 'recipe-box-deploy');
  assert.ok(!deploy.policies[0].permission_groups.some((g) => g.id === groupId('Access: Apps and Policies Write')));
  assert.equal(env.gh.secrets().CLOUDFLARE_API_TOKEN, env.fake.state.minted[0]);
  assert.deepEqual(report.todo, [CODE_KEY_TODO]);
  assertNoSecret(env, JSON.stringify(report));
});

test('a rerun reuses the sign-in list key, and an interrupted or lost one is rolled, never duplicated', async (t) => {
  const env = await setup(t);
  const secretPut = `PUT /accounts/${ACCOUNT}/workers/scripts/recipe-box/secrets`;
  const stored = () => JSON.parse(env.fake.state.workerSecrets['recipe-box'].WONG_ACCESS_LOGIN_MANAGEMENT).token;
  const keys = () => env.fake.state.accountTokens.filter((token) => token.name === 'recipe-box-access').length;
  env.fake.state.refuse = [secretPut];
  await assert.rejects(env.provision(), { reason: 'cloudflare' });
  assert.deepEqual(env.fake.state.workerSecrets, {});
  env.fake.state.refuse = [];
  // The value made before the interruption was never stored and can not be read back, so it is rolled.
  const finished = await env.provision();
  assert.ok(finished.updated.includes('sign-in list key recipe-box-access, stored in the live app only'));
  assert.equal(stored(), env.fake.state.minted.at(-2));
  assert.match(stored(), /^deploy-rolled-/);
  const minted = env.fake.state.minted.length;
  const puts = env.fake.count(secretPut);
  const again = await env.provision();
  assert.ok(again.reused.includes('sign-in list key recipe-box-access'));
  assert.deepEqual([again.created, again.updated, again.todo], [[], [], [CODE_KEY_TODO]]);
  assert.deepEqual([env.fake.state.minted.length, env.fake.count(secretPut), keys()], [minted, puts, 1]);
  // A live app that lost its secret gets a new value for the same key, even when the config is kept.
  env.fake.state.workerSecrets = {};
  const restored = await env.provision({ keepConfig: true });
  assert.ok(restored.updated.includes('sign-in list key recipe-box-access, stored in the live app only'));
  assert.equal(stored(), env.fake.state.minted.at(-2));
  assert.equal(keys(), 1);
  assert.deepEqual(env.record().components.accessKey, restored.accessKey);
  assertNoSecret(env, JSON.stringify([finished, again, restored]));
});

test('setup gives both Workers one read-only key for Cloudflare look-ups, made from the allow-list alone', async (t) => {
  const env = await setup(t);
  const report = await env.provision();
  const key = env.fake.state.accountTokens.find((token) => token.name === 'recipe-box-cloudflare-read');
  const ids = (scope) => CLOUDFLARE_READ_KEY.filter((row) => row.scope === scope).map(({ id }) => ({ id }));
  // Two policies: the account groups on this account, the zone groups on every zone in it. Nothing else.
  assert.deepEqual(key.policies, [
    { effect: 'allow', resources: { [`com.cloudflare.api.account.${ACCOUNT}`]: '*' }, permission_groups: ids('account') },
    { effect: 'allow', resources: { [`com.cloudflare.api.account.${ACCOUNT}`]: { 'com.cloudflare.api.account.zone.*': '*' } }, permission_groups: ids('zone') },
  ]);
  assert.deepEqual([ids('account').length, ids('zone').length], [8, 3]);
  // Both Workers hold the one value with the account id; the user token is in neither.
  for (const worker of ['recipe-box', 'recipe-box-staging']) {
    assert.deepEqual(JSON.parse(env.fake.state.workerSecrets[worker].WONG_CLOUDFLARE_READ), { version: 1, token: env.fake.state.minted[2], accountId: ACCOUNT });
  }
  assert.ok(!JSON.stringify(env.fake.state.workerSecrets).includes(TOKEN));
  assert.deepEqual(report.cloudflareReadKey, { status: 'ready', id: key.id });
  assert.deepEqual(env.record().components.cloudflareReadKey, report.cloudflareReadKey);
  assert.ok(report.created.includes('read-only Cloudflare key recipe-box-cloudflare-read, stored in both Workers'));
  assert.deepEqual(report.todo, [CODE_KEY_TODO]);
  assertNoSecret(env, JSON.stringify(report));
});

test('a rerun reuses the read-only key, and one the live app lacks is rolled onto both, never duplicated', async (t) => {
  const env = await setup(t);
  const stored = () => ['recipe-box', 'recipe-box-staging'].map((worker) => JSON.parse(env.fake.state.workerSecrets[worker].WONG_CLOUDFLARE_READ).token);
  const keys = () => env.fake.state.accountTokens.filter((token) => token.name === 'recipe-box-cloudflare-read').length;
  // A run that stops between the two Workers leaves production a value staging never got.
  env.fake.state.refuse = [`PUT /accounts/${ACCOUNT}/workers/scripts/recipe-box-staging/secrets`];
  await assert.rejects(env.provision(), { reason: 'cloudflare' });
  assert.equal(env.fake.state.workerSecrets['recipe-box-staging'], undefined);
  env.fake.state.refuse = [];
  const finished = await env.provision();
  assert.ok(finished.updated.includes('read-only Cloudflare key recipe-box-cloudflare-read, stored in both Workers'));
  assert.match(env.fake.state.minted.at(-1), /^deploy-rolled-/);
  assert.deepEqual(stored(), [env.fake.state.minted.at(-1), env.fake.state.minted.at(-1)]);
  const minted = env.fake.state.minted.length;
  const again = await env.provision();
  assert.ok(again.reused.includes('read-only Cloudflare key recipe-box-cloudflare-read'));
  assert.deepEqual([again.created, again.updated, again.todo], [[], [], [CODE_KEY_TODO]]);
  assert.deepEqual([env.fake.state.minted.length, keys()], [minted, 1]);
  // A secret gone from the live app rolls the one key; the sign-in list key is left as it is.
  delete env.fake.state.workerSecrets['recipe-box'].WONG_CLOUDFLARE_READ;
  const restored = await env.provision({ keepConfig: true });
  assert.ok(restored.reused.includes('sign-in list key recipe-box-access'));
  assert.equal(env.fake.state.minted.length, minted + 1);
  assert.deepEqual(stored(), [env.fake.state.minted.at(-1), env.fake.state.minted.at(-1)]);
  assert.equal(keys(), 1);
  assert.deepEqual(env.record().components.cloudflareReadKey, restored.cloudflareReadKey);
  assertNoSecret(env, JSON.stringify([finished, again, restored]));
});

test('a staging Worker that refuses the read-only key is left waiting: the step completes, records it, and a rerun reuses the key', async (t) => {
  const env = await setup(t);
  const waiting = '; recipe-box-staging waiting, as Cloudflare stores no secret there while a newer preview is uploaded';
  const key = () => env.fake.state.accountTokens.find((token) => token.name === 'recipe-box-cloudflare-read');
  // Every pull request uploads a preview after its staging deploy, so staging refuses a secret with code 10215.
  env.fake.state.newerPreview = ['recipe-box-staging'];
  const report = await env.provision();
  assert.deepEqual(report.cloudflareReadKey, { status: 'ready', id: key().id, waiting: ['recipe-box-staging'] });
  assert.deepEqual(env.record().components.cloudflareReadKey, report.cloudflareReadKey);
  assert.ok(report.created.includes(`read-only Cloudflare key recipe-box-cloudflare-read, stored in the live app${waiting}`));
  assert.deepEqual(report.todo, [CODE_KEY_TODO]);
  assert.deepEqual(JSON.parse(env.fake.state.workerSecrets['recipe-box'].WONG_CLOUDFLARE_READ), { version: 1, token: env.fake.state.minted.at(-1), accountId: ACCOUNT });
  assert.equal(env.fake.state.workerSecrets['recipe-box-staging'], undefined);
  // A rerun reuses the key while the live app holds it: no new value, and no second try at staging.
  const minted = env.fake.state.minted.length;
  const calls = env.fake.calls.length;
  const again = await env.provision();
  assert.ok(again.reused.includes(`read-only Cloudflare key recipe-box-cloudflare-read${waiting}`));
  assert.deepEqual(again.cloudflareReadKey, report.cloudflareReadKey);
  assert.deepEqual(again.todo, [CODE_KEY_TODO]);
  assert.equal(env.fake.state.minted.length, minted);
  assert.ok(!env.fake.calls.slice(calls).some((call) => call.method === 'PUT' && call.path.endsWith('/secrets')));
  // Staging holding no copy still reads as waiting once the newer preview is gone: the key is not replaced to try again.
  env.fake.state.newerPreview = [];
  assert.deepEqual((await env.provision()).cloudflareReadKey, report.cloudflareReadKey);
  assert.equal(env.fake.state.minted.length, minted);
  // When the live app loses its copy the key is replaced, staging takes it, and the record stops listing it as waiting.
  delete env.fake.state.workerSecrets['recipe-box'].WONG_CLOUDFLARE_READ;
  const both = await env.provision({ keepConfig: true });
  assert.deepEqual(both.cloudflareReadKey, { status: 'ready', id: key().id });
  assert.deepEqual(env.record().components.cloudflareReadKey, both.cloudflareReadKey);
  assert.ok(both.updated.includes('read-only Cloudflare key recipe-box-cloudflare-read, stored in both Workers'));
  assert.equal(env.fake.state.workerSecrets['recipe-box'].WONG_CLOUDFLARE_READ, env.fake.state.workerSecrets['recipe-box-staging'].WONG_CLOUDFLARE_READ);
  assertNoSecret(env, JSON.stringify([report, again, both]));
});

test('the live app refusing the read-only key still stops the step, and so does any other refusal from staging', async (t) => {
  const env = await setup(t);
  const refusing = (worker, code) => async (url, options) => (options.method === 'PUT' && url.endsWith(`/workers/scripts/${worker}/secrets`) && String(options.body).includes('"WONG_CLOUDFLARE_READ"')
    ? new Response(JSON.stringify({ success: false, errors: [{ code }] }), { status: 400 })
    : fetch(url, options));
  // Only the newer-preview code on a Worker after the first is waited on.
  await assert.rejects(env.provision({ fetch: refusing('recipe-box', 10215) }), { reason: 'cloudflare', message: /recipe-box\/secrets: HTTP 400 10215$/ });
  assert.equal(env.fake.state.workerSecrets['recipe-box'].WONG_CLOUDFLARE_READ, undefined);
  assert.equal(env.fake.state.workerSecrets['recipe-box-staging'], undefined);
  assert.equal(env.record().components.cloudflareReadKey, undefined);
  await assert.rejects(env.provision({ fetch: refusing('recipe-box-staging', 10014) }), { reason: 'cloudflare', message: /recipe-box-staging\/secrets: HTTP 400 10014$/ });
  assert.equal(env.record().components.cloudflareReadKey, undefined);
  // The stopped runs made one key and left it pending, so the next run replaces its value on both Workers.
  const finished = await env.provision();
  assert.deepEqual(finished.cloudflareReadKey, { status: 'ready', id: env.fake.state.accountTokens.find((token) => token.name === 'recipe-box-cloudflare-read').id });
  assert.ok(finished.updated.includes('read-only Cloudflare key recipe-box-cloudflare-read, stored in both Workers'));
  assert.equal(env.fake.state.accountTokens.filter((token) => token.name === 'recipe-box-cloudflare-read').length, 1);
});

test('a token that can not make the read-only key leaves it missing, names the step left, and stops nothing else', async (t) => {
  const env = await setup(t);
  const refused = async (url, options) => (options.method === 'POST' && String(options.body).includes('"recipe-box-cloudflare-read"')
    ? new Response(JSON.stringify({ success: false, errors: [{ code: 9109 }] }), { status: 403 })
    : fetch(url, options));
  const report = await env.provision({ fetch: refused });
  assert.deepEqual(report.cloudflareReadKey, { status: 'missing' });
  assert.deepEqual(report.todo, [CLOUDFLARE_READ_KEY_TODO, CODE_KEY_TODO]);
  assert.match(CLOUDFLARE_READ_KEY_TODO, /^the app has no read-only Cloudflare key for look-ups, because the saved Cloudflare token can not make keys/);
  assert.deepEqual(env.record().components.cloudflareReadKey, { status: 'missing' });
  // The rest of setup finished: the sign-in list key is ready, and neither Worker holds a look-up key.
  assert.equal(report.accessKey.status, 'ready');
  assert.equal(report.urls.production, 'https://recipe-box.ada.workers.dev');
  assert.deepEqual(env.fake.state.workerSecrets, { 'recipe-box': { WONG_ACCESS_LOGIN_MANAGEMENT: env.fake.state.workerSecrets['recipe-box'].WONG_ACCESS_LOGIN_MANAGEMENT } });
  assert.equal(env.fake.state.accountTokens.length, 2);
  const ready = await env.provision();
  assert.equal(ready.cloudflareReadKey.status, 'ready');
  assert.deepEqual(ready.todo, [CODE_KEY_TODO]);
  assert.ok(ready.created.includes('read-only Cloudflare key recipe-box-cloudflare-read, stored in both Workers'));
  assertNoSecret(env, JSON.stringify([report, ready]));
});

test('a look-up group Cloudflare no longer lists stops the read-only key by name, and no key is made', async (t) => {
  const env = await setup(t);
  for (const [gone, scope] of [['Billing Read', 'account'], ['DNS Read', 'zone']]) {
    const fetchWithout = async (url, init) => {
      const response = await fetch(url, init);
      if (!url.includes('permission_groups')) return response;
      const data = await response.json();
      return new Response(JSON.stringify({ ...data, result: data.result.filter((g) => g.name !== gone) }));
    };
    await assert.rejects(env.provision({ fetch: fetchWithout }), { reason: 'token', message: `Cloudflare lists no ${scope} permission group named ${gone}` });
    // Neither a narrower nor a wider key: none at all.
    assert.deepEqual(env.fake.state.accountTokens.map((token) => token.name), ['recipe-box-deploy', 'recipe-box-access']);
    assert.equal(env.fake.state.workerSecrets['recipe-box'].WONG_CLOUDFLARE_READ, undefined);
    assert.equal(env.fake.state.workerSecrets['recipe-box-staging'], undefined);
  }
  assert.equal((await env.provision()).cloudflareReadKey.status, 'ready');
});

test('the access command gives an installed repo its owner email and both keys, and names the steps left when the token can not make keys', async (t) => {
  const env = await setup(t);
  const run = async () => {
    const lines = [];
    const code = await cli(['access', '--dir', env.dir], { env: env.env, out: (text) => lines.push(text), err: () => {} });
    return { code, text: lines.join('\n'), report: JSON.parse(lines.join('\n')) };
  };
  // A repo with no private sign-in on record has nothing for Access to hold.
  const none = await run();
  assert.equal(none.code, 1);
  assert.equal(none.report.error.reason, 'repo');
  assert.match(none.report.error.cause, /no private sign-in on record/);
  await env.provision();
  // An install from before Access knew its owner: no owner line in the config, and no key anywhere.
  const file = join(env.dir, 'app/wrangler.jsonc');
  writeFileSync(file, readFileSync(file, 'utf8').replace(/^[ \t]*"WONG_OWNER_EMAIL".*\n/gm, ''));
  const record = env.record();
  delete record.components.accessKey;
  delete record.components.cloudflareReadKey;
  writeFileSync(join(env.dir, '.claude/.wong-stack.json'), `${JSON.stringify(record, null, 2)}\n`);
  env.fake.state.accountTokens = env.fake.state.accountTokens.filter((token) => token.name === 'recipe-box-deploy');
  env.fake.state.workerSecrets = {};
  env.fake.state.forbidTokens = true;
  const missing = await run();
  assert.equal(missing.code, 0, 'a token that can not make keys stops nothing');
  assert.deepEqual([missing.report.accessKey, missing.report.cloudflareReadKey], [{ status: 'missing' }, { status: 'missing' }]);
  assert.deepEqual(missing.report.todo, [ACCESS_KEY_TODO, CLOUDFLARE_READ_KEY_TODO, CODE_KEY_TODO]);
  for (const todo of missing.report.todo.slice(0, 2)) assert.match(todo, /wiki\/development\/secrets\.md#receive-a-key-through-a-private-link.*`provision\.mjs access`/);
  assert.deepEqual(env.fake.state.workerSecrets, {});
  // The owner email does not wait for the key: Access opens and names the one step left.
  assert.deepEqual([env.config().vars.WONG_OWNER_EMAIL, env.config().env.staging.vars.WONG_OWNER_EMAIL, env.config().env.local.vars.WONG_OWNER_EMAIL], [EMAIL, EMAIL, undefined]);
  assert.ok(missing.report.updated.includes('app/wrangler.jsonc WONG_OWNER_EMAIL'));
  assert.match(readFileSync(file, 'utf8'), /\/\/ Session memory, production only/, 'the config keeps its comments');
  assert.deepEqual([env.record().components.accessKey, env.record().components.cloudflareReadKey], [{ status: 'missing' }, { status: 'missing' }]);
  env.fake.state.forbidTokens = false;
  const ready = await run();
  assert.equal(ready.code, 0);
  assert.equal(ready.report.accessKey.status, 'ready');
  assert.deepEqual(ready.report.todo, [CODE_KEY_TODO]);
  assert.deepEqual(Object.keys(env.fake.state.workerSecrets['recipe-box']), ['WONG_ACCESS_LOGIN_MANAGEMENT', 'WONG_CLOUDFLARE_READ']);
  assert.deepEqual(env.record().components.accessKey, ready.report.accessKey);
  // The same step setup runs: one read-only key, made from the live group list, on both Workers.
  const readKey = env.fake.state.accountTokens.find((token) => token.name === 'recipe-box-cloudflare-read');
  assert.deepEqual(readKey.policies.map((policy) => policy.permission_groups.length), [8, 3]);
  assert.deepEqual(ready.report.cloudflareReadKey, { status: 'ready', id: readKey.id });
  assert.deepEqual(env.record().components.cloudflareReadKey, ready.report.cloudflareReadKey);
  assert.deepEqual(JSON.parse(env.fake.state.workerSecrets['recipe-box-staging'].WONG_CLOUDFLARE_READ), { version: 1, token: env.fake.state.minted.at(-1), accountId: ACCOUNT });
  assert.equal(env.fake.state.workerSecrets['recipe-box'].WONG_CLOUDFLARE_READ, env.fake.state.workerSecrets['recipe-box-staging'].WONG_CLOUDFLARE_READ);
  // It makes nothing else, and a second run reuses the key.
  const calls = env.fake.calls.length;
  const again = await run();
  assert.deepEqual([again.report.created, again.report.updated, again.report.reused], [[], [], ['sign-in list key recipe-box-access', 'read-only Cloudflare key recipe-box-cloudflare-read']]);
  assert.ok(env.fake.calls.slice(calls).every((call) => call.method === 'GET'));
  assert.equal(env.fake.state.databases.length, 3);
  assertNoSecret(env, none.text, missing.text, ready.text, again.text);
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
  assert.equal(env.fake.state.minted.length, 3, 'the deploy token, the sign-in list key and the read-only key, each made once');
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
    assert.deepEqual(env.fake.state.accountTokens.map((token) => token.name), ['recipe-box-deploy', 'recipe-box-access', 'recipe-box-cloudflare-read']);
    assert.equal(env.fake.rows('recipe-box-memory', 'SELECT count(*) AS n FROM memory_keys')[0].n, 1);
    // The app's two keys are minted last and go to the Workers, never to GitHub.
    assert.equal(env.gh.secrets().CLOUDFLARE_API_TOKEN, env.fake.state.minted.at(-3));
    assert.equal(JSON.parse(env.fake.state.workerSecrets['recipe-box'].WONG_ACCESS_LOGIN_MANAGEMENT).token, env.fake.state.minted.at(-2));
    assert.equal(JSON.parse(env.fake.state.workerSecrets['recipe-box-staging'].WONG_CLOUDFLARE_READ).token, env.fake.state.minted.at(-1));
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
  assert.equal(env.fake.state.minted.length, 3, 'the secret stays; only the policy changes');
  assert.equal(readEnv(join(env.dir, '.env')).CLOUDFLARE_MEMORY_TOKEN, key);
});

test('a config with no top-level env is left for a hand edit when a bucket arrives', async (t) => {
  const env = await setup(t, { r2: false });
  writeFileSync(join(env.dir, 'app/wrangler.jsonc'), '{ "name": "recipe-box" }\n');
  env.fake.state.r2 = true;
  const report = await env.provision();
  assert.deepEqual(report.todo, [
    'add "WONG_OWNER_EMAIL" with the owner sign-in email to the production and staging vars in app/wrangler.jsonc',
    'add MEMORY_BUCKET for recipe-box-memory to app/wrangler.jsonc',
    'add "WONG_CODE_REPOSITORY" to production and staging in app/wrangler.jsonc, as wiki/stack/employee-project.md describes',
  ]);
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

test('the command line lists five commands, and refuses bad usage with 2', async () => {
  const help = lines();
  assert.equal(await cli(['--help'], help.io), 0);
  for (const command of ['widen', 'accounts', 'plan', 'names', 'provision']) assert.match(help.out[0], new RegExp(`^  ${command}\\b`, 'm'));
  assert.match(help.out[0], /--route github\|artifacts/);
  for (const argv of [[], ['nope'], ['widen', 'extra'], ['--nope'], ['names'], ['provision', '--repo', REPO], ['widen', '--route']]) {
    const bad = lines();
    assert.equal(await cli(argv, { ...bad.io, env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT } }), 2, argv.join(' '));
  }
  // A route is checked once the token is found, so these runs carry one; none of them makes a request.
  for (const argv of [['widen', '--route', 'nonsense'], ['plan', '--route', 'GitHub'], ['provision', '--repo', REPO, '--base', 'recipe-box', '--route', 'cloudflare']]) {
    const bad = lines();
    assert.equal(await cli(argv, { ...bad.io, env: { CLOUDFLARE_ACCOUNT_ID: ACCOUNT, CLOUDFLARE_API_TOKEN: TOKEN }, fetch: () => assert.fail('a bad route makes no request') }), 2, argv.join(' '));
    assert.match(bad.err[0], /^--route is github or artifacts\n/);
    assert.deepEqual(bad.out, []);
  }
  const noAccount = lines();
  assert.equal(await cli(['plan', '--dir', join(repoRoot, 'scripts/tests/fixtures')], { ...noAccount.io, env: {} }), 2, 'plan needs an account');
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

// ── the Artifacts route: a target with a check runner, and tools that never leave the machine ──

const RUNNER_FILES = ['wrangler.template.jsonc', 'package.json', 'package-lock.json', 'worker.mjs', 'pipeline.mjs', 'run-id.mjs'];
const RUNNER_CONFIG = 'scripts/check-runner/wrangler.jsonc';
const STATE_FILE = '.git/wong-stack-provision.json';
const REMOTE = `https://${ACCOUNT}.artifacts.cloudflare.net/git/${NAMESPACE}/recipe-box.git`;
/** The tree of a commit with no files. */
const EMPTY_TREE = '4b825dc642cb6eb9a060e54bf8d69288fbee4904';
const sha256 = (text) => createHash('sha256').update(text).digest('hex');

/** Git's own arguments, past the `-C <dir>` and `-c <setting>` that lead them. */
function gitVerb(args) {
  let at = 0;
  while (args[at] === '-C' || args[at] === '-c') at += 2;
  return args.slice(at);
}

/**
 * An `exec` for the Artifacts route. `node`, `gh` and git's local calls run for real, against the temp
 * repo and the fake `gh`. `npm` and `npx` never run, and neither do git's calls to the remote
 * (`ls-remote`, `push`, `fetch`): each is recorded and answered here. `calls` holds every argument list,
 * `ran` each npm or npx call with its folder and whether the Cloudflare token was in its environment,
 * and `remote` git's remote calls. A faked `wrangler deploy` makes the Worker its config names on the
 * fake Cloudflare, as a real one does, so the secrets that follow have a Worker to land on.
 */
function fakeTools(fake) {
  const calls = [];
  const ran = [];
  const remote = [];
  const done = { stdout: '', stderr: '' };
  let head = '';
  const exec = async (file, args, options = {}) => {
    calls.push([file, ...args]);
    if (file === 'npm' || file === 'npx') {
      ran.push({ file, args, cwd: options.cwd, token: options.env?.CLOUDFLARE_API_TOKEN === TOKEN });
      if (args.includes('deploy')) {
        const { name } = JSON.parse(stripJsonc(readFileSync(join(options.cwd, 'wrangler.jsonc'), 'utf8')));
        if (!fake.state.workers.includes(name)) fake.state.workers.push(name);
      }
      return done;
    }
    const verb = file === 'git' ? gitVerb(args) : [];
    if (!['ls-remote', 'push', 'fetch'].includes(verb[0])) return run(file, args, options);
    remote.push(verb);
    if (verb[0] === 'ls-remote') return { stdout: head ? `${head}\trefs/heads/main\n` : '', stderr: '' };
    if (verb[0] === 'push') head = verb.at(-1).split(':')[0];
    return done;
  };
  return { exec, calls, ran, remote };
}

/**
 * A target ready for the Artifacts route: the check runner's folder and the save skill as the pack
 * ships them, a git name beside the email, and `provision` and `names` run through the faked tools.
 */
async function artifactsSetup(t, setupOptions) {
  const env = await setup(t, setupOptions);
  execFileSync('git', ['-C', env.dir, 'config', 'user.name', 'Ada']);
  mkdirSync(join(env.dir, 'scripts/check-runner'), { recursive: true });
  for (const file of RUNNER_FILES) cpSync(join(repoRoot, 'scripts/check-runner', file), join(env.dir, 'scripts/check-runner', file));
  cpSync(join(repoRoot, '.agents/skills/save'), join(env.dir, '.agents/skills/save'), { recursive: true });
  const tools = fakeTools(env.fake);
  return {
    ...env, tools,
    provision: (options = {}) => env.provision({ exec: tools.exec, ...options }),
    names: (options = {}) => env.names({ exec: tools.exec, ...options }),
    git: (...args) => execFileSync('git', ['-C', env.dir, ...args], { env: env.env, encoding: 'utf8' }).trim(),
  };
}

/** The runner's own part of the fake Cloudflare, copied, to compare before and after a run. */
const delivered = ({ state }) => structuredClone({ repos: state.repos, repoTokens: state.repoTokens, buckets: state.buckets, lifecycles: state.lifecycles, tokens: state.accountTokens, values: state.tokenValues, secrets: state.workerSecrets, minted: state.minted });

// ── the Artifacts route: the plan, the widen, names ─────────────────────────

test('an Artifacts install on a free account stops with plan before anything is made, and the plan says why', async (t) => {
  const env = await artifactsSetup(t, { paid: false });
  const before = structuredClone(env.fake.state);
  const dotEnv = readFileSync(join(env.dir, '.env'), 'utf8');
  await assert.rejects(env.provision({ route: 'artifacts' }), { reason: 'plan', message: /Workers Paid plan.*\$5 a month.*GitHub/ });

  assert.ok(env.fake.calls.length > 0, 'the plan was read');
  assert.deepEqual(env.fake.calls.filter((call) => call.method !== 'GET'), [], 'Cloudflare was only read');
  assert.deepEqual(env.fake.state, before);
  for (const path of [STATE_FILE, '.claude/.wong-stack.json', 'app/wrangler.jsonc', RUNNER_CONFIG]) assert.equal(existsSync(join(env.dir, path)), false, path);
  assert.equal(readFileSync(join(env.dir, '.env'), 'utf8'), dotEnv);
  assert.equal(env.git('remote'), '', 'no origin');
  assert.deepEqual(env.tools.ran, [], 'neither npm nor npx ran');
  assert.deepEqual(env.tools.remote, [], 'nothing was pushed');
  assert.equal(env.gh.calls(), '');

  // The plan command answers the same question without stopping, and Windows without asking Cloudflare.
  const requests = env.fake.calls.length;
  assert.deepEqual(await env.plan({ platform: 'win32' }), { route: 'github', reason: 'windows' });
  assert.equal(env.fake.calls.length, requests, 'Windows is answered with no request');
  const free = await env.plan({ platform: 'linux' });
  assert.equal(free.route, 'github');
  assert.equal(free.reason, 'free-plan');
  assert.match(free.cost, /\$5 a month/);
  assert.deepEqual(env.fake.calls.slice(requests).map((call) => `${call.method} ${call.path}`), [`GET /accounts/${ACCOUNT}/subscriptions`]);
  env.fake.state.paid = true;
  assert.deepEqual(await env.plan({ platform: 'darwin' }), { route: 'artifacts', plan: 'Workers Paid' });
  env.fake.state.refuse = [`GET /accounts/${ACCOUNT}/subscriptions`];
  await assert.rejects(env.plan({ platform: 'linux' }), { reason: 'cloudflare' });
});

test('an Artifacts widen adds its three groups and reads the plan, stops with cloudflare when refused, and a plain widen asks for neither', async (t) => {
  const env = await setup(t);
  const heldIds = () => env.fake.state.policies.flatMap((policy) => policy.permission_groups.map((group) => group.id));
  const planReads = () => env.fake.count(`GET /accounts/${ACCOUNT}/subscriptions`);
  const lacksArtifacts = (why) => {
    for (const row of ARTIFACTS_PROVISION) assert.ok(!heldIds().includes(row.id), `${row.name}: ${why}`);
    assert.equal(planReads(), 0, why);
  };

  const plain = await env.widen({ account: ACCOUNT });
  assert.deepEqual(plain.granted, NORMAL_PROVISION.map((row) => row.name));
  lacksArtifacts('a plain widen');

  env.fake.state.refuse = ['PUT /user/tokens/tok1'];
  await assert.rejects(env.widen({ account: ACCOUNT, route: 'artifacts' }), { reason: 'cloudflare', message: 'Cloudflare PUT /user/tokens/tok1: HTTP 500 1000' });
  lacksArtifacts('a refused widen');

  env.fake.state.refuse = [];
  const report = await env.widen({ account: ACCOUNT, route: 'artifacts' });
  assert.deepEqual(report.granted, ARTIFACTS_PROVISION.map((row) => row.name));
  assert.deepEqual(report.held, [...USER_GRANTS, ...NORMAL_PROVISION].map((row) => row.name));
  assert.deepEqual(report.probed, [ACCOUNT]);
  const onAccount = env.fake.state.policies.find((policy) => `com.cloudflare.api.account.${ACCOUNT}` in policy.resources).permission_groups.map((group) => group.id);
  for (const row of ARTIFACTS_PROVISION) assert.ok(onAccount.includes(row.id), row.name);
  assert.deepEqual(env.fake.state.policies.map((policy) => policy.resources), startingPolicies().map((policy) => policy.resources));
  assert.equal(planReads(), 1);

  const again = await env.widen({ account: ACCOUNT, route: 'artifacts' });
  assert.deepEqual(again.granted, []);
  assert.equal(env.fake.state.puts.length, 2, 'a token that holds every group is not widened again');
});

test('a routines widen adds the routine groups alone, keeps every other group, and reads the plan', async (t) => {
  const env = await setup(t);
  await env.widen({ account: ACCOUNT });
  const heldIds = () => env.fake.state.policies.flatMap((policy) => policy.permission_groups.map((group) => group.id));
  const before = heldIds();
  const planReads = () => env.fake.count(`GET /accounts/${ACCOUNT}/subscriptions`);
  const base = { token: TOKEN, api: env.fake.api, account: ACCOUNT, rows: ROUTINES_PROVISION, sleep: async (ms) => env.sleeps.push(ms) };
  const routineGroups = ['Workers Containers Write', 'Billing Read', 'AI Gateway Write', 'AI Gateway Run', 'Workers AI Read'];

  env.fake.state.refuse = ['PUT /user/tokens/tok1'];
  await assert.rejects(widenBy(base), { reason: 'cloudflare', message: 'Cloudflare PUT /user/tokens/tok1: HTTP 500 1000' });
  assert.deepEqual(heldIds(), before, 'a refused widen changes nothing');
  assert.equal(planReads(), 0);

  env.fake.state.refuse = [];
  const report = await widenBy(base);
  assert.deepEqual(report, { granted: routineGroups, held: [], probed: [ACCOUNT] });
  assert.deepEqual(heldIds().filter((id) => !before.includes(id)).sort(), ROUTINES_PROVISION.map((row) => row.id).sort(), 'only the routine groups were added');
  for (const id of before) assert.ok(heldIds().includes(id), 'a group the token held is still held');
  assert.ok(!heldIds().includes(ARTIFACTS_PROVISION.find((row) => row.name === 'Artifacts Write').id), 'a routine needs no repository group');
  assert.deepEqual(env.fake.state.policies.map((policy) => policy.resources), startingPolicies().map((policy) => policy.resources));
  assert.equal(planReads(), 1, 'the plan read is the one probe');

  const again = await widenBy(base);
  assert.deepEqual([again.granted, again.held], [[], routineGroups]);
  assert.equal(env.fake.state.puts.length, 2, 'a token that holds every routine group is not widened again');
  // The two groups an Artifacts install already holds are its own, by name, scope and id.
  for (const row of ROUTINES_PROVISION.slice(0, 2)) assert.deepEqual(ARTIFACTS_PROVISION.find((each) => each.name === row.name), row);
  for (const row of ROUTINES_PROVISION) assert.equal(groupId(row.name), row.id, row.name);
  await assert.rejects(widenBy({ ...base, rows: [{ name: 'No Such Group', scope: 'account' }] }), { reason: 'token', message: /lists no account permission group named No Such Group/ });
});

test('a repository name another project holds is reported taken, and stops the install before the runner', async (t) => {
  const env = await artifactsSetup(t, { repos: ['recipe-box'] });
  const theirs = structuredClone(env.fake.state.repos);

  // Without the route, names asks nothing about repositories and reports what it always did.
  const plain = await env.names();
  assert.equal(plain.base, 'recipe-box');
  assert.deepEqual(plain.names, { worker: 'recipe-box', staging: 'recipe-box-staging', db: 'recipe-box-db', stagingDb: 'recipe-box-db-staging', memory: 'recipe-box-memory', deploy: 'recipe-box-deploy' });
  assert.deepEqual(plain.checked.map((item) => `${item.kind} ${item.name} ${item.status}`), [
    'worker recipe-box free', 'worker recipe-box-staging free', 'database recipe-box-db free', 'database recipe-box-db-staging free',
    'database recipe-box-memory free', 'bucket recipe-box-memory free', 'token recipe-box-deploy free',
  ]);
  assert.equal(env.fake.count(`GET /accounts/${ACCOUNT}/artifacts`), 0);

  const found = await env.names({ route: 'artifacts' });
  assert.equal(found.derived, 'recipe-box');
  assert.deepEqual(found.checked.slice(plain.checked.length), [
    { kind: 'repository', name: 'recipe-box', status: 'taken' },
    { kind: 'worker', name: 'recipe-box-checks', status: 'free' },
    { kind: 'bucket', name: 'recipe-box-checks', status: 'free' },
    { kind: 'token', name: 'recipe-box-checks-storage', status: 'free' },
  ]);
  assert.deepEqual(found.checked.slice(0, plain.checked.length), plain.checked);
  assert.equal(found.base, 'recipe-box-2');
  assert.deepEqual(artifactNamesFor('recipe-box-2'), { repo: 'recipe-box-2', runner: 'recipe-box-2-checks', storage: 'recipe-box-2-checks-storage' });
  assert.deepEqual(found.names, {
    worker: 'recipe-box-2', staging: 'recipe-box-2-staging', db: 'recipe-box-2-db', stagingDb: 'recipe-box-2-db-staging', memory: 'recipe-box-2-memory', deploy: 'recipe-box-2-deploy',
    ...artifactNamesFor('recipe-box-2'),
  });

  // Provisioning under the taken name stops at the repository: it is not adopted, and no runner follows.
  await assert.rejects(env.provision({ route: 'artifacts' }), { reason: 'cloudflare', message: /already has a repository named recipe-box that this install did not make/ });
  assert.deepEqual(env.fake.state.repos, theirs, 'the other project\'s repository is untouched');
  assert.deepEqual(env.fake.calls.filter((call) => call.method !== 'GET' && call.path.includes('/artifacts/')), []);
  assert.deepEqual(env.tools.ran, [], 'no runner was installed or deployed');
  assert.deepEqual(env.fake.state.workerSecrets, {});
  assert.ok(!env.fake.state.workers.includes('recipe-box-checks'));
  assert.ok(!env.fake.state.buckets.includes('recipe-box-checks'));
  assert.equal(existsSync(join(env.dir, RUNNER_CONFIG)), false);
  assert.equal(env.record().components.delivery, undefined);
  assert.equal(env.git('remote'), '', 'no origin');
  assert.deepEqual(env.tools.remote, []);
});

test('with no namespace yet, an Artifacts install\'s names are all free', async (t) => {
  const env = await artifactsSetup(t);
  const found = await env.names({ route: 'artifacts' });
  assert.equal(found.base, 'recipe-box');
  assert.equal(found.checked.length, 11);
  assert.ok(found.checked.every((item) => item.status === 'free'), JSON.stringify(found.checked));
  assert.deepEqual(env.fake.state.namespaces, [], 'looking makes no namespace');
});

// ── the Artifacts route: provision ──────────────────────────────────────────

test('a fresh Artifacts install makes the repository, the check runner and its keys, and main\'s first commit, with no GitHub', async (t) => {
  const env = await artifactsSetup(t);
  const report = await env.provision({ route: 'artifacts' });
  const { state } = env.fake;

  // The report: what was made, the route, the cost, and that there are no pull requests.
  for (const made of ['repository recipe-box', 'bucket recipe-box-checks', 'storage key recipe-box-checks-storage', 'deploy token recipe-box-deploy', 'the first, empty commit on main']) {
    assert.ok(report.created.includes(made), `${made}: ${JSON.stringify(report.created)}`);
  }
  assert.equal(report.delivery.route, 'artifacts');
  assert.equal(report.delivery.pullRequests, false);
  assert.match(report.delivery.monthlyCost, /\$5 a month/);
  assert.equal(report.delivery.remote, REMOTE);
  assert.deepEqual(report.todo, []);

  // The install record, origin, and Git's credential helper for this account's Artifacts host.
  assert.deepEqual(env.record().components.delivery, {
    route: 'artifacts', accountId: ACCOUNT, namespace: 'wongstack', repo: 'recipe-box', remote: REMOTE,
    runner: 'recipe-box-checks', workflow: 'recipe-box-checks', bucket: 'recipe-box-checks',
  });
  assert.equal(NAMESPACE, 'wongstack');
  assert.equal(env.git('remote', 'get-url', 'origin'), REMOTE);
  const helper = helperConfig(ACCOUNT);
  assert.equal(helper.length, 2);
  for (const [key, value] of helper) assert.equal(env.git('config', '--get', key), value, key);
  assert.ok(existsSync(join(env.dir, '.claude/skills/save/scripts/artifacts-credential.mjs')), 'the helper the config names is in the target');

  // The runner's config, filled from the template; its tools installed and deployed from its own folder.
  const folder = join(env.dir, 'scripts/check-runner');
  const text = readFileSync(join(env.dir, RUNNER_CONFIG), 'utf8');
  assert.ok(!text.includes('<'), 'no placeholder is left');
  const config = JSON.parse(text);
  assert.equal(config.name, 'recipe-box-checks');
  assert.equal(config.account_id, ACCOUNT);
  assert.equal(config.artifacts[0].namespace, NAMESPACE);
  assert.deepEqual(config.triggers.events[0].filter, { namespace: NAMESPACE, repo_name: 'recipe-box' });
  assert.deepEqual(config.triggers.events[0].targets, [{ type: 'workflow', workflow_name: 'recipe-box-checks' }]);
  assert.equal(config.r2_buckets[0].bucket_name, 'recipe-box-checks');
  assert.deepEqual(env.tools.ran.map((tool) => [tool.file, tool.cwd]), [['npm', folder], ['npx', folder]]);
  const [npm, npx] = env.tools.ran;
  assert.equal(npm.args[0], 'ci');
  assert.ok(npm.args.includes('--ignore-scripts'), npm.args.join(' '));
  assert.deepEqual(npx.args.slice(0, 3), ['--no-install', 'wrangler', 'deploy']);
  assert.equal(npx.token, true, 'the deploy gets the token in its environment');
  assert.ok(state.workers.includes('recipe-box-checks'));

  // The runner's secrets: the deploy token's value, and the storage key as the pair R2 takes.
  const deploy = state.accountTokens.find((token) => token.name === 'recipe-box-deploy');
  const storage = state.accountTokens.find((token) => token.name === 'recipe-box-checks-storage');
  // The live app's own sign-in key and the read-only look-up key are made on this route too, last, as on GitHub.
  assert.deepEqual(state.accountTokens.map((token) => token.name), ['recipe-box-deploy', 'recipe-box-checks-storage', 'recipe-box-access', 'recipe-box-cloudflare-read']);
  assert.deepEqual(state.workerSecrets['recipe-box-checks'], { CF_TOKEN: state.tokenValues[deploy.id], R2_ACCESS_KEY_ID: storage.id, R2_SECRET_ACCESS_KEY: sha256(state.tokenValues[storage.id]) });
  assert.deepEqual(Object.keys(state.workerSecrets), ['recipe-box-checks', 'recipe-box', 'recipe-box-staging']);
  assert.deepEqual(Object.keys(state.workerSecrets['recipe-box']), ['WONG_ACCESS_LOGIN_MANAGEMENT', 'WONG_CLOUDFLARE_READ']);
  // Staging holds the look-up key and never the sign-in key.
  assert.deepEqual(Object.keys(state.workerSecrets['recipe-box-staging']), ['WONG_CLOUDFLARE_READ']);
  assert.equal(report.accessKey.status, 'ready');
  assert.match(state.workerSecrets['recipe-box-checks'].R2_SECRET_ACCESS_KEY, /^[0-9a-f]{64}$/);
  assert.deepEqual(storage.policies, [{
    effect: 'allow', resources: { [`com.cloudflare.edge.r2.bucket.${ACCOUNT}_default_recipe-box-checks`]: '*' },
    permission_groups: [{ id: STORAGE_TOKEN.id }],
  }]);
  assert.deepEqual(Object.keys(deploy.policies[0].resources), [`com.cloudflare.api.account.${ACCOUNT}`]);

  // The runner's bucket, beside the memory store's, with the rule that deletes old snapshots.
  assert.deepEqual(state.buckets, ['recipe-box-memory', 'recipe-box-checks']);
  assert.deepEqual(Object.keys(state.lifecycles), ['recipe-box-checks']);
  const [rule, ...others] = state.lifecycles['recipe-box-checks'];
  assert.deepEqual(others, []);
  assert.equal(rule.enabled, true);
  assert.deepEqual(rule.deleteObjectsTransition, { condition: { type: 'Age', maxAge: SNAPSHOT_DAYS * 24 * 60 * 60 } });

  // One repository, in the shared namespace, and the token Cloudflare returned with it revoked.
  assert.deepEqual(state.namespaces, [NAMESPACE]);
  assert.deepEqual(state.repos.map((repo) => [repo.namespace, repo.name, repo.default_branch, repo.remote]), [[NAMESPACE, 'recipe-box', 'main', REMOTE]]);
  assert.deepEqual(state.repoTokens.map((token) => token.state), ['revoked']);

  // Main's first commit: empty, pushed without force, and the folder's unborn main now points at it.
  const head = env.git('rev-parse', '--verify', 'refs/heads/main');
  assert.equal(env.git('rev-parse', `${head}^{tree}`), EMPTY_TREE);
  assert.equal(env.git('rev-parse', 'HEAD'), head);
  assert.deepEqual(env.tools.remote, [['ls-remote', 'origin', 'refs/heads/main'], ['push', 'origin', `${head}:refs/heads/main`], ['fetch', 'origin', 'main']]);

  // No GitHub, and no secret in the report, the record, the runner's config, Git's config, or an argument.
  assert.equal(env.gh.calls(), '');
  assert.ok(env.tools.calls.every(([file]) => file !== 'gh'));
  assertNoSecret(env, JSON.stringify(report), JSON.stringify(env.tools.calls), readFileSync(join(env.dir, '.git/config'), 'utf8'));
});

test('a second Artifacts run makes nothing new, pushes no second first commit, and leaves the runner\'s keys alone', async (t) => {
  const env = await artifactsSetup(t);
  await env.provision({ route: 'artifacts' });
  const before = delivered(env.fake);
  const head = env.git('rev-parse', '--verify', 'refs/heads/main');
  const files = () => [RUNNER_CONFIG, '.claude/.wong-stack.json', 'app/wrangler.jsonc'].map((path) => readFileSync(join(env.dir, path), 'utf8'));
  const kept = files();
  // Provisioning's own state, outside every commit, is what says the repository is this install's.
  const owned = () => JSON.parse(readFileSync(join(env.dir, STATE_FILE), 'utf8')).delivery;
  assert.deepEqual(owned(), { repoId: env.fake.state.repos[0].id });
  const account = `/accounts/${ACCOUNT}`;
  const writes = () => [`POST ${account}/artifacts`, `DELETE ${account}/artifacts`, `POST ${account}/tokens`, `PUT ${account}/tokens`, `POST ${account}/r2/buckets`, `PUT ${account}/workers/scripts/recipe-box-checks/secrets`].map((prefix) => env.fake.count(prefix));
  const made = writes();
  assert.equal(made.at(-1), 3, 'three secrets, set once');

  const report = await env.provision({ route: 'artifacts' });
  assert.deepEqual(report.created, []);
  assert.deepEqual(report.updated, ['check runner recipe-box-checks'], 'the runner is deployed again, and nothing else changes');
  for (const same of ['repository recipe-box', 'bucket recipe-box-checks', 'deploy token recipe-box-deploy', 'storage key recipe-box-checks-storage']) {
    assert.ok(report.reused.includes(same), `${same}: ${JSON.stringify(report.reused)}`);
  }
  assert.deepEqual(report.todo, []);
  assert.deepEqual(writes(), made);
  assert.deepEqual(delivered(env.fake), before);
  assert.deepEqual(files(), kept);
  assert.deepEqual(owned(), { repoId: env.fake.state.repos[0].id });
  assert.equal(env.git('remote'), 'origin');
  for (const [key, value] of helperConfig(ACCOUNT)) assert.equal(env.git('config', '--get-all', key), value, `${key} is set once`);
  assert.deepEqual(env.tools.remote.map(([verb]) => verb), ['ls-remote', 'push', 'fetch', 'ls-remote'], 'the second run only looks at the remote');
  assert.equal(env.git('rev-parse', '--verify', 'refs/heads/main'), head);
  assert.deepEqual(env.tools.ran.map((tool) => tool.file), ['npm', 'npx', 'npm', 'npx']);
  assert.equal(env.gh.calls(), '');

  // The names it took are now its own.
  const found = await env.names({ route: 'artifacts' });
  assert.equal(found.base, 'recipe-box');
  assert.deepEqual(found.checked.slice(-4), [
    { kind: 'repository', name: 'recipe-box', status: 'ours' },
    { kind: 'worker', name: 'recipe-box-checks', status: 'ours' },
    { kind: 'bucket', name: 'recipe-box-checks', status: 'ours' },
    { kind: 'token', name: 'recipe-box-checks-storage', status: 'ours' },
  ]);
  assertNoSecret(env, JSON.stringify(report), JSON.stringify(env.tools.calls));
});

test('an Artifacts install with R2 off stops before the runner is installed, and finishes once R2 is on', async (t) => {
  const env = await artifactsSetup(t, { r2: false });
  await assert.rejects(env.provision({ route: 'artifacts' }), { reason: 'cloudflare', message: /R2 storage, which is off on this account/ });
  assert.deepEqual(env.tools.ran, [], 'no runner was installed or deployed');
  assert.deepEqual(env.fake.state.workerSecrets, {});
  assert.deepEqual(env.fake.state.buckets, []);
  assert.deepEqual(env.fake.state.lifecycles, {});
  assert.equal(existsSync(join(env.dir, RUNNER_CONFIG)), false);
  assert.equal(env.record().components.delivery, undefined);
  assert.equal(env.git('remote'), '', 'no origin');
  assert.deepEqual(env.tools.remote, []);

  env.fake.state.r2 = true;
  const report = await env.provision({ route: 'artifacts' });
  assert.equal(env.fake.state.repos.length, 1, 'the repository the first run made is reused, not made twice');
  assert.ok(report.reused.includes('repository recipe-box'), JSON.stringify(report.reused));
  assert.ok(report.created.includes('bucket recipe-box-checks'), JSON.stringify(report.created));
  assert.deepEqual(Object.keys(env.fake.state.workerSecrets['recipe-box-checks']).sort(), ['CF_TOKEN', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY']);
  assert.equal(env.git('remote', 'get-url', 'origin'), REMOTE);
  assert.equal(env.tools.remote.filter(([verb]) => verb === 'push').length, 1);
});

// ── the Artifacts route: the runner's config and the command line ───────────

test('the runner config fills every placeholder, and a new placeholder fails', () => {
  const demo = { account: ACCOUNT, repo: 'demo', runner: 'demo-checks' };
  const text = runnerConfig(demo, readFileSync(join(repoRoot, 'scripts/check-runner/wrangler.template.jsonc'), 'utf8'));
  assert.ok(!text.includes('<'), 'no placeholder is left');
  const config = JSON.parse(text);
  assert.equal(config.name, 'demo-checks');
  assert.equal(config.workflows[0].name, 'demo-checks');
  assert.deepEqual(JSON.parse(config.vars.WONG_RUNNER), { account: ACCOUNT, namespace: NAMESPACE, repo: 'demo' });
  assert.equal(runnerConfig(demo, '// Setup fills every <placeholder>.\n{ "name": "<runner>" }\n'), '{ "name": "demo-checks" }\n', 'a comment line is dropped, not filled');
  assert.throws(() => runnerConfig(demo, '{ "name": "<runner>", "extra": "<your-new-thing>" }\n'), { reason: 'repo', message: /<your-new-thing>/ });
});

test('the command line prints the plan as one JSON report, and passes --route on', async (t) => {
  const env = await setup(t);
  const command = async (...argv) => {
    const { out, err, io } = lines();
    const code = await cli([...argv, '--dir', env.dir], { ...io, env: { WONG_CLOUDFLARE_API: env.fake.api }, sleep: noSleep });
    return { code, out, err };
  };
  const paid = await command('plan');
  assert.equal(paid.code, 0, paid.err.join('\n'));
  assert.equal(paid.out.length, 1);
  assert.deepEqual(JSON.parse(paid.out[0]), { route: 'artifacts', plan: 'Workers Paid' });

  env.fake.state.paid = false;
  const free = await command('plan');
  assert.equal(free.code, 0, free.err.join('\n'));
  assert.equal(JSON.parse(free.out[0]).reason, 'free-plan');

  const requests = env.fake.calls.length;
  const bad = await command('plan', '--route', 'nonsense');
  assert.equal(bad.code, 2);
  assert.deepEqual(bad.out, []);
  assert.equal(env.fake.calls.length, requests, 'a bad route makes no request');

  const widened = await command('widen', '--route', 'artifacts');
  assert.equal(widened.code, 0, widened.err.join('\n'));
  assert.deepEqual(JSON.parse(widened.out[0]).granted, [...NORMAL_PROVISION, ...ARTIFACTS_PROVISION].map((row) => row.name));
  const named = await command('names', '--repo', REPO, '--route', 'artifacts');
  assert.equal(named.code, 0, named.err.join('\n'));
  assert.equal(JSON.parse(named.out[0]).names.repo, 'recipe-box');
  assert.equal(JSON.parse((await command('names', '--repo', REPO)).out[0]).names.repo, undefined);
  assertNoSecret(env, paid.out[0], widened.out[0], named.out[0]);
});

// ── the project Connect your assistant hands out ────────────────────────────

/** `provision.mjs access`, as an update runs it. */
async function accessCommand(env) {
  const lines = [];
  const code = await cli(['access', '--dir', env.dir], { env: env.env, out: (text) => lines.push(text), err: () => {} });
  return { code, text: lines.join('\n'), report: JSON.parse(lines.join('\n')) };
}
const codeVars = (env) => [env.config().vars.WONG_CODE_REPOSITORY, env.config().env.staging.vars.WONG_CODE_REPOSITORY, env.config().env.local.vars.WONG_CODE_REPOSITORY];

test('a GitHub install names its project for both Workers and reports the read-only key as the one step left, until both hold it', async (t) => {
  const env = await setup(t);
  const report = await env.provision();
  assert.deepEqual(codeVars(env), [REPO, REPO, undefined]);
  assert.ok(report.created.includes('app/wrangler.jsonc'));
  // The owner's steps: one repository, contents read-only, nothing else. They fit the key link's guide.
  assert.deepEqual(report.codeKey, { status: 'missing', kept: 'github', repository: REPO, key: 'WONG_CODE_READ', url: 'https://github.com/settings/personal-access-tokens/new', steps: CODE_KEY.steps(REPO) });
  assert.ok(report.codeKey.steps.length <= 6 && report.codeKey.steps.every((line) => line.length <= 140));
  assert.match(report.codeKey.steps.join('\n'), /Only select repositories, then pick ada\/recipe-box\n.*Contents, Read-only\nAdd no other permission/);
  assert.ok(report.todo.includes(CODE_KEY_TODO));
  assert.match(CODE_KEY_TODO, /wiki\/development\/secrets\.md#receive-a-key-through-a-private-link.*WONG_CODE_READ.*secrets:push/);
  // No binding and no key is made for a GitHub project, and no Artifacts permission is asked for.
  assert.deepEqual([env.config().artifacts, env.config().env.staging.artifacts], [undefined, undefined]);
  assert.ok(!env.fake.state.accountTokens.some((token) => /code/.test(token.name)));

  // The access step, as an update runs it: nothing to change, and the same one step left.
  const waiting = await accessCommand(env);
  assert.equal(waiting.code, 0);
  assert.deepEqual([waiting.report.codeKey, waiting.report.todo, waiting.report.updated, waiting.report.created], [report.codeKey, [CODE_KEY_TODO], [], []]);
  // One Worker holding the key is not enough: a preview must hand the project out too.
  env.fake.state.workerSecrets['recipe-box'].WONG_CODE_READ = 'github_pat_synthetic';
  assert.equal((await accessCommand(env)).report.codeKey.status, 'missing');
  env.fake.state.workerSecrets['recipe-box-staging'].WONG_CODE_READ = 'github_pat_synthetic';
  const calls = env.fake.calls.length;
  const ready = await accessCommand(env);
  assert.deepEqual([ready.report.codeKey, ready.report.todo, ready.report.updated, ready.report.created], [{ status: 'ready', kept: 'github', repository: REPO }, [], [], []]);
  assert.ok(env.fake.calls.slice(calls).every((call) => call.method === 'GET'), 'a second run changes nothing');
  assert.deepEqual((await env.provision()).codeKey, ready.report.codeKey);
  assertNoSecret(env, waiting.text, ready.text);
  assert.ok(!ready.text.includes('github_pat_synthetic'));

  // An install from before this: no line in the config. The step adds it, from where `origin` points, and keeps the comments.
  const file = join(env.dir, 'app/wrangler.jsonc');
  writeFileSync(file, readFileSync(file, 'utf8').replace(/^[ \t]*"WONG_CODE_REPOSITORY".*\n/gm, ''));
  assert.deepEqual(codeVars(env), [undefined, undefined, undefined]);
  execFileSync('git', ['-C', env.dir, 'remote', 'add', 'origin', 'git@github.com:ada/renamed-box.git']);
  const added = await accessCommand(env);
  assert.deepEqual([codeVars(env), added.report.updated, added.report.codeKey.repository], [['ada/renamed-box', 'ada/renamed-box', undefined], ['app/wrangler.jsonc WONG_CODE_REPOSITORY'], 'ada/renamed-box']);
  assert.match(readFileSync(file, 'utf8'), /\/\/ Session memory, production only/, 'the config keeps its comments');
  assert.deepEqual((await accessCommand(env)).report.updated, []);
  // A config with no place for it is left alone, with a plain to-do.
  const before = readFileSync(file, 'utf8').replace(/^[ \t]*"(?:WONG_CODE_REPOSITORY|WONG_ENVIRONMENT)".*\n/gm, '');
  writeFileSync(file, before);
  const stuck = await accessCommand(env);
  assert.deepEqual(stuck.report.codeKey, { status: 'missing' });
  assert.ok(stuck.report.todo.some((todo) => todo.startsWith('add "WONG_CODE_REPOSITORY" to production and staging in app/wrangler.jsonc')));
});

test('reads owner/name from a GitHub address in any of its forms, and nothing from another host', () => {
  for (const url of ['https://github.com/ada/recipe-box', 'https://github.com/ada/recipe-box.git', 'https://github.com/ada/recipe-box/', 'git@github.com:ada/recipe-box.git', 'ssh://git@github.com/ada/recipe-box.git', ' https://github.com/ada/recipe-box.git\n']) {
    assert.equal(githubRepo(url), REPO, url);
  }
  for (const url of ['', undefined, 'https://gitlab.com/ada/recipe-box.git', 'https://github.com/ada', 'https://github.com/ada/recipe-box/tree/main', 'https://github.com.evil.example/ada/recipe-box', `https://${ACCOUNT}.artifacts.cloudflare.net/git/wongstack/recipe-box.git`]) {
    assert.equal(githubRepo(url), null, String(url));
  }
});

test('an install kept in Cloudflare binds both Workers to its own repository, so no key is made or asked for', async (t) => {
  const env = await artifactsSetup(t);
  const report = await env.provision({ route: 'artifacts' });
  const binding = [{ binding: 'ARTIFACTS', namespace: NAMESPACE }];
  assert.deepEqual([env.config().artifacts, env.config().env.staging.artifacts, env.config().env.local.artifacts], [binding, binding, undefined]);
  assert.deepEqual(codeVars(env), ['recipe-box', 'recipe-box', undefined]);
  assert.deepEqual(report.codeKey, { status: 'ready', kept: 'cloudflare', repository: 'recipe-box' });
  assert.ok(!report.todo.includes(CODE_KEY_TODO));
  // The account token never reaches a Worker, and neither Worker is given a project key.
  for (const worker of ['recipe-box', 'recipe-box-staging']) assert.ok(!Object.keys(env.fake.state.workerSecrets[worker]).includes('WONG_CODE_READ'));
  const text = readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8');
  assert.ok(!text.includes(TOKEN));
  assert.match(text, /\/\/ Session memory, production only/, 'the config keeps its comments');

  // The access step reads the route from the install record, asks Git nothing, and changes nothing that is right.
  const again = await accessCommand(env);
  assert.deepEqual([again.code, again.report.codeKey, again.report.updated, again.report.todo], [0, report.codeKey, [], []]);
  assert.equal(readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8'), text);
  // An install from before this gains the name and both bindings from the step alone.
  writeFileSync(join(env.dir, 'app/wrangler.jsonc'), text.replace(/^[ \t]*(?:"WONG_CODE_REPOSITORY"|"artifacts"|\/\/ The project's own repository).*\n/gm, ''));
  assert.deepEqual([env.config().artifacts, env.config().env.staging.artifacts, codeVars(env)[0]], [undefined, undefined, undefined]);
  const updated = await accessCommand(env);
  assert.deepEqual(updated.report.updated, ['app/wrangler.jsonc WONG_CODE_REPOSITORY', 'app/wrangler.jsonc ARTIFACTS']);
  assert.deepEqual([env.config().artifacts, env.config().env.staging.artifacts, codeVars(env)], [binding, binding, ['recipe-box', 'recipe-box', undefined]]);
  assert.equal(updated.report.codeKey.status, 'ready');
  // Only staging missing its twin is mended too; a config with no staging block is restored and left a to-do.
  const whole = readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8');
  const lines = whole.split('\n');
  lines.splice(lines.findLastIndex((line) => line.includes('"artifacts"')), 1);
  writeFileSync(join(env.dir, 'app/wrangler.jsonc'), lines.join('\n'));
  assert.deepEqual((await accessCommand(env)).report.updated, ['app/wrangler.jsonc ARTIFACTS']);
  assert.deepEqual(env.config().env.staging.artifacts, binding);
  const broken = lines.join('\n').replace(/"staging"(\s*:\s*\{)/, '"preview"$1');
  writeFileSync(join(env.dir, 'app/wrangler.jsonc'), broken);
  const stuck = await accessCommand(env);
  assert.equal(readFileSync(join(env.dir, 'app/wrangler.jsonc'), 'utf8'), broken, 'a config it can not finish is restored');
  assert.deepEqual(stuck.report.codeKey, { status: 'missing' });
  assert.ok(stuck.report.todo.some((todo) => /"artifacts" binding ARTIFACTS for the wongstack namespace/.test(todo)));
});
