// The default branch's scripts take in a branch's build as data and refuse one that would land anywhere but main's
// staging Worker. `cf-build.sh --build-only` and `--migrate` split a build from the step that needs the key.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { copyTree, untrustedBuildProblem } from '../lib-wrangler-config.mjs';
import { DEMO_CONFIG, demoRepo, fakeTools, plant, wranglerCalls } from './fixtures/workflow.mjs';

function repo(t, options) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-untrusted-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  return { ...demoRepo(root, options), root };
}

// Runs the demo app's plugin-build stand-in for staging, with `extra` laid over its generated config.
function build(root, extra = {}, env = 'staging') {
  const result = spawnSync('node', ['build.mjs'], { cwd: join(root, 'app'), encoding: 'utf8', env: {
    ...process.env, BUILD_EXTRA: JSON.stringify(extra), ...(env ? { CLOUDFLARE_ENV: env } : {}),
  } });
  assert.equal(result.status, 0, result.stderr);
  return root;
}

const script = (root, tools, name, args, env = {}) => {
  const result = spawnSync('bash', [join(root, 'scripts', name), ...args], { cwd: root, encoding: 'utf8', env: {
    PATH: `${tools.bin}:${process.env.PATH}`, HOME: root, ...tools.env, WONG_WRANGLER: tools.env.FAKE_WRANGLER,
    CF_BRANCH: 'feature-x', CF_PRODUCTION_BRANCH: 'main', ...env,
  } });
  return { ...result, log: `${result.stdout}${result.stderr}` };
};

const problem = (t, extra, { config, production = false, env } = {}) => {
  const trusted = repo(t);
  const branch = build(repo(t, { config }).root, extra, env);
  return untrustedBuildProblem(join(trusted.root, 'app/wrangler.jsonc'), join(branch, 'app/wrangler.jsonc'), { production, root: branch });
};

test('cf-build.sh --build-only builds with no remote call, --migrate migrates and builds nothing, no flag does both', t => {
  const tools = fakeTools(t);
  const only = repo(t);
  const built = script(only.root, tools, 'cf-build.sh', ['--build-only']);
  assert.equal(built.status, 0, built.log);
  assert.ok(existsSync(join(only.root, 'app/dist/demo/wrangler.json')));
  assert.equal(JSON.parse(readFileSync(join(only.root, 'app/dist/demo/wrangler.json'), 'utf8')).name, 'demo-staging');
  assert.deepEqual(wranglerCalls(tools.calls()), []);

  const migrate = repo(t);
  const migrated = script(migrate.root, tools, 'cf-build.sh', ['--migrate']);
  assert.equal(migrated.status, 0, migrated.log);
  assert.ok(!existsSync(join(migrate.root, 'app/dist')), 'the migrate built the app');
  assert.deepEqual(wranglerCalls(tools.calls()).map(call => call.args), [['d1', 'migrations', 'apply', 'demo-db-staging', '--remote', '--env', 'staging']]);

  const both = repo(t);
  assert.equal(script(both.root, tools, 'cf-build.sh', []).status, 0);
  assert.ok(existsSync(join(both.root, 'app/dist/demo/wrangler.json')));
  assert.equal(wranglerCalls(tools.calls()).length, 1);

  const local = script(repo(t).root, tools, 'cf-build.sh', ['--migrate'], { CF_BRANCH: '' });
  assert.match(local.stdout, /not in CI — nothing migrated/);
  assert.deepEqual(wranglerCalls(tools.calls()), []);
  assert.equal(script(repo(t).root, tools, 'cf-build.sh', ['--bogus']).status, 2);
});

test('a staging build that stays on main\'s staging Worker passes, a new staging-only binding included', t => {
  assert.equal(problem(t), null);
  assert.equal(problem(t, { kv_namespaces: [{ binding: 'CACHE', id: 'kv-staging' }] }), null);
  assert.equal(problem(t, {}, { production: true, env: null }), null);
});

test('a branch build is refused for each way it could leave main\'s staging Worker, naming why', t => {
  const named = structuredClone(DEMO_CONFIG);
  named.env.staging.name = 'demo';
  for (const [name, extra, words, config] of [
    ['staging named as production', {}, /names the Worker 'demo'/, named],
    ['a Worker of its own choosing', { name: 'payroll' }, /names the Worker 'payroll'/],
    ['routes', { routes: [{ pattern: 'demo.com/*', zone_name: 'demo.com' }] }, /route or custom domain/],
    ['a custom domain', { route: { pattern: 'demo.com', custom_domain: true } }, /route or custom domain/],
    ['a build command', { build: { command: 'curl https://example.com' } }, /`build` command/],
    ['production\'s database by id', { d1_databases: [{ binding: 'DB', database_name: 'other', database_id: 'prod-id' }] }, /production database/],
    ['production\'s database by name', { d1_databases: [{ binding: 'DB', database_name: 'demo-db', database_id: 'x' }] }, /production database/],
    ['assets from /proc', { assets: { directory: '/proc/self' } }, /'\/proc\/self', a path outside the project/],
    ['a Worker file above the project', { main: '../../../../etc/passwd' }, /outside the project/],
    ['a home-folder path', { tsconfig: '~/.ssh/id_rsa' }, /outside the project/],
  ]) {
    assert.match(problem(t, extra, { config }) ?? '', words, name);
  }
  assert.match(problem(t, { name: 'demo-staging' }, { production: true }), /not 'demo', the production Worker/);
});

test('a build with no redirect, or with extra Workers in it, is refused', t => {
  const trusted = repo(t);
  const branch = build(repo(t).root);
  const check = () => untrustedBuildProblem(join(trusted.root, 'app/wrangler.jsonc'), join(branch, 'app/wrangler.jsonc'), { root: branch });
  writeFileSync(join(branch, 'app/.wrangler/deploy/config.json'), JSON.stringify({ configPath: '../../dist/demo/wrangler.json', auxiliaryWorkers: [{ configPath: 'x' }] }));
  assert.match(check(), /auxiliaryWorkers/);
  rmSync(join(branch, 'app/.wrangler'), { recursive: true });
  assert.match(check(), /no generated config/);
});

test('a build copies no link, and copies only the built files, the redirect, the config and the migrations', t => {
  const from = build(repo(t).root);
  writeFileSync(join(from, 'app/.npmrc'), 'script-shell=/tmp/evil\n');
  plant(from, 'cf-deploy.sh', 'echo PLANTED');
  const to = mkdtempSync(join(tmpdir(), 'wong-test-untrusted-to-'));
  t.after(() => rmSync(to, { recursive: true, force: true }));
  // The repo's own copy of the lib: it finds the app folder from where it sits.
  const copy = target => spawnSync('node', [join(from, 'scripts/lib-wrangler-config.mjs'), 'copy-build', from, target], { encoding: 'utf8' });
  assert.match(copy(to).stdout, /copied \d+ built files/);
  for (const path of ['app/wrangler.jsonc', 'app/dist/demo/wrangler.json', 'app/dist/client/index.html', 'app/.wrangler/deploy/config.json', 'schema/migrations/0001_init.sql']) {
    assert.ok(existsSync(join(to, path)), `${path} was not copied`);
  }
  for (const path of ['app/package.json', 'app/.npmrc', 'app/build.mjs', 'scripts']) assert.ok(!existsSync(join(to, path)), `${path} was copied`);

  symlinkSync('/etc/hostname', join(from, 'app/dist/client/leak'));
  assert.match(copy(join(to, 'again')).stderr, /is not a plain file or folder/);
  assert.throws(() => copyTree(join(from, 'app/dist'), join(to, 'tree')), /a build copies no links/);
  rmSync(join(from, 'app/dist'), { recursive: true });
  symlinkSync('/etc', join(from, 'app/dist'));
  assert.match(copy(join(to, 'linked')).stderr, /is a link/);
});

test('cf-deploy.sh takes a build once, refuses a production-named one, and then deploys and migrates nothing', t => {
  const tools = fakeTools(t);
  const good = repo(t);
  const branch = repo(t);
  writeFileSync(join(branch.root, 'app/package.json'), '{"scripts":{"postinstall":"echo PLANTED"}}\n');
  build(branch.root);
  const taken = script(good.root, tools, 'cf-deploy.sh', ['--take-build', branch.root]);
  assert.equal(taken.status, 0, taken.log);
  assert.ok(!readFileSync(join(good.root, 'app/package.json'), 'utf8').includes('PLANTED'), 'the branch\'s package file was copied in');
  const again = script(good.root, tools, 'cf-deploy.sh', ['--take-build', branch.root]);
  assert.notEqual(again.status, 0);
  assert.match(again.log, /already took a build/);
  assert.equal(script(good.root, tools, 'cf-deploy.sh', []).status, 0);
  assert.deepEqual(wranglerCalls(tools.calls()).filter(call => call.args[0] === 'deploy').map(call => call.worker), ['demo-staging']);

  const bad = repo(t);
  const named = build(repo(t).root, { name: 'demo' });
  const refused = script(bad.root, tools, 'cf-deploy.sh', ['--take-build', named]);
  assert.notEqual(refused.status, 0);
  assert.match(refused.log, /this build can not deploy: it names the Worker 'demo'/);
  for (const [name, args] of [['cf-deploy.sh', []], ['cf-build.sh', ['--migrate']]]) {
    const later = script(bad.root, tools, name, args);
    assert.notEqual(later.status, 0, name);
    assert.match(later.log, /refused this build, so nothing was migrated or deployed/, name);
  }
  assert.deepEqual(wranglerCalls(tools.calls()), [], 'wrangler ran on a refused build');
});

test('the default branch takes its own production build and deploys production', t => {
  const tools = fakeTools(t);
  const main = repo(t);
  const built = build(repo(t).root, {}, null);
  const env = { CF_BRANCH: 'main' };
  assert.equal(script(main.root, tools, 'cf-deploy.sh', ['--take-build', built], env).status, 0);
  assert.equal(script(main.root, tools, 'cf-build.sh', ['--migrate'], env).status, 0);
  const deployed = script(main.root, tools, 'cf-deploy.sh', [], env);
  assert.equal(deployed.status, 0, deployed.log);
  const calls = wranglerCalls(tools.calls());
  assert.deepEqual(calls.find(call => call.args[0] === 'd1').args, ['d1', 'migrations', 'apply', 'demo-db', '--remote']);
  assert.deepEqual(calls.filter(call => call.args[0] === 'deploy').map(call => call.worker), ['demo']);
});

test('on the default branch a build command, a stray path, another database or a new route is refused before any wrangler call', t => {
  const tools = fakeTools(t);
  const env = { CF_BRANCH: 'main' };
  const payroll = { binding: 'PAYROLL', database_name: 'payroll-db', database_id: 'payroll-id' };
  for (const [name, extra, words] of [
    ['a build command', { build: { command: 'curl https://example.com' } }, /`build` command/],
    ['assets from /proc', { assets: { directory: '/proc/self' } }, /'\/proc\/self', a path outside the project/],
    ['another app\'s database', { d1_databases: [...DEMO_CONFIG.d1_databases, payroll] }, /binds 'demo-db' \(prod-id\), 'payroll-db' \(payroll-id\), not 'demo-db' \(prod-id\)/],
    ['a route', { routes: [{ pattern: 'payroll.com/*', zone_name: 'payroll.com' }] }, /routes or custom domains differ/],
    ['a custom domain', { route: { pattern: 'payroll.com', custom_domain: true } }, /routes or custom domains differ/],
  ]) {
    const main = repo(t);
    const taken = script(main.root, tools, 'cf-deploy.sh', ['--take-build', build(repo(t).root, extra, null)], env);
    assert.notEqual(taken.status, 0, name);
    assert.match(taken.log, words, name);
    for (const [file, args] of [['cf-build.sh', ['--migrate']], ['cf-deploy.sh', []]]) {
      assert.notEqual(script(main.root, tools, file, args, env).status, 0, `${name}: ${file} ran on a refused build`);
    }
  }
  const unbuilt = repo(t);
  const noRedirect = script(unbuilt.root, tools, 'cf-deploy.sh', ['--take-build', repo(t).root], env);
  assert.match(noRedirect.log, /no generated config/);
  assert.deepEqual(wranglerCalls(tools.calls()), [], 'wrangler ran on a refused production build');
});

test('on the default branch the deploy keeps main\'s own config and migrations, and takes only the built files', t => {
  const tools = fakeTools(t);
  const main = repo(t);
  const config = readFileSync(join(main.root, 'app/wrangler.jsonc'), 'utf8');
  const built = repo(t);
  built.write('schema/migrations/0002_drop.sql', 'DROP TABLE notes;\n');
  const changed = config.replace('"2026-09-25"', '"2026-01-01"');
  assert.notEqual(changed, config);
  built.write('app/wrangler.jsonc', changed);
  build(built.root, {}, null);
  const taken = script(main.root, tools, 'cf-deploy.sh', ['--take-build', built.root], { CF_BRANCH: 'main' });
  assert.equal(taken.status, 0, taken.log);
  assert.equal(readFileSync(join(main.root, 'app/wrangler.jsonc'), 'utf8'), config);
  assert.ok(!existsSync(join(main.root, 'schema/migrations/0002_drop.sql')), 'the build\'s migration was copied in');
  assert.ok(existsSync(join(main.root, 'app/dist/demo/wrangler.json')));
});

test('a preview binds and migrates only the default branch\'s own staging database', t => {
  const stagingDb = extra => ({ d1_databases: [{ binding: 'DB', migrations_dir: '../schema/migrations', ...extra }] });
  assert.equal(problem(t, stagingDb({ database_name: 'demo-db-staging', database_id: 'staging-id' })), null);
  for (const [name, extra] of [
    ['another database', { database_name: 'payroll-db', database_id: 'payroll-id' }],
    ['staging\'s name with another id', { database_name: 'demo-db-staging', database_id: 'payroll-id' }],
    ['staging\'s id with another name', { database_name: 'payroll-db', database_id: 'staging-id' }],
  ]) {
    assert.match(problem(t, stagingDb(extra)) ?? '', /not 'demo-db-staging' \(staging-id\), the default branch's staging database/, name);
  }
  assert.match(problem(t, { d1_databases: [...DEMO_CONFIG.env.staging.d1_databases, { binding: 'MEMORY_DB', database_name: 'payroll-db', database_id: 'payroll-id' }] }) ?? '',
    /binds the database 'payroll-db', not 'demo-db-staging' \(staging-id\)/, 'another database bound as MEMORY_DB');
  const branchConfig = structuredClone(DEMO_CONFIG);
  branchConfig.env.staging.d1_databases[0] = { ...branchConfig.env.staging.d1_databases[0], database_name: 'payroll-db', database_id: 'payroll-id' };
  assert.match(problem(t, {}, { config: branchConfig }) ?? '', /binds the database 'payroll-db'/, 'the branch\'s source config names another database');

  // A default branch whose staging Worker binds no database previews a new one only once published.
  const trustedConfig = { ...structuredClone(DEMO_CONFIG), d1_databases: [] };
  trustedConfig.env.staging.d1_databases = [];
  const trusted = repo(t, { config: trustedConfig });
  const branch = build(repo(t).root);
  assert.match(untrustedBuildProblem(join(trusted.root, 'app/wrangler.jsonc'), join(branch, 'app/wrangler.jsonc'), { root: branch }),
    /the default branch's staging Worker binds none; a new database previews once published/);
});

test('--migrate on a taken build targets the default branch\'s staging database, not the build\'s config', t => {
  const main = repo(t);
  main.write('.wong/trusted-wrangler.jsonc', readFileSync(join(main.root, 'app/wrangler.jsonc'), 'utf8'));
  const other = structuredClone(DEMO_CONFIG);
  other.env.staging.d1_databases[0].database_name = 'payroll-db';
  main.write('app/wrangler.jsonc', JSON.stringify(other));
  const lib = join(main.root, 'scripts/lib-wrangler-config.mjs');
  assert.equal(spawnSync('node', [lib, 'migrate-database'], { encoding: 'utf8' }).stdout.trim(), 'demo-db-staging');
  assert.equal(spawnSync('node', [lib, 'staging-database'], { encoding: 'utf8' }).stdout.trim(), 'payroll-db');
});

test('a preview may bind each of the default branch\'s staging databases, not only the first', t => {
  const two = structuredClone(DEMO_CONFIG);
  const files = { binding: 'FILES', database_name: 'demo-files-staging', database_id: 'files-id', migrations_dir: '../schema/migrations' };
  two.env.staging.d1_databases.push(files);
  const trusted = repo(t, { config: two });
  const check = (extra, config = two) => {
    const branch = build(repo(t, { config }).root, extra);
    return untrustedBuildProblem(join(trusted.root, 'app/wrangler.jsonc'), join(branch, 'app/wrangler.jsonc'), { root: branch });
  };
  assert.equal(check(), null, 'both of main\'s staging databases');
  assert.equal(check({ d1_databases: [files] }), null, 'main\'s second staging database alone');
  assert.match(check({ d1_databases: [{ ...files, database_id: 'payroll-id' }] }) ?? '',
    /binds the database 'demo-files-staging', not 'demo-db-staging' \(staging-id\), 'demo-files-staging' \(files-id\)/);
});
