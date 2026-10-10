import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { GATES, proveChecks } from '../check-app-checks.mjs';

const scripts = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const script = join(scripts, 'check-app-checks.mjs');

// The registry is real TypeScript, as in an installed repo: the proof reads a secret's name from it.
const REGISTRY = `type Key = { title: string; secrets: readonly string[] };
export const keys = {
  stripe: { title: "Stripe", secrets: ["STRIPE_SECRET_KEY"] },
} as const satisfies Record<string, Key>;
`;
const SCRIPTS = {
  lint: 'oxlint --deny-warnings',
  'test:runtime': 'vitest run --config vitest.config.runtime.ts',
  test: 'npm run lint && tsc -b && vitest run --coverage && npm run test:runtime && knip && jscpd && node ../scripts/check-app-keys.mjs',
};

// A throwaway repo whose app holds each gate's settings file and an installed package, with a
// temp folder of its own so a test can see what the proof leaves behind.
function repo(t, { scripts: listed = SCRIPTS, without = [], registry = REGISTRY, more = {} } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'wong-test-app-checks-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const files = {
    'app/package.json': JSON.stringify({ type: 'module', scripts: listed }),
    'app/.oxlintrc.json': '{}\n',
    'app/tsconfig.json': '{ "files": [] }\n',
    'app/tsconfig.app.json': '{}\n',
    'app/worker-configuration.d.ts': 'interface Env {}\n',
    'app/vitest.config.ts': 'export default { test: { setupFiles: ["src/setup.ts", "src/absent.ts"] } };\n',
    'app/vitest.config.runtime.ts': 'export default {};\n',
    'app/tests/runtime/setup.ts': 'export {};\n',
    'app/src/setup.ts': 'export {};\n',
    'app/knip.jsonc': '{}\n',
    'app/.jscpd.json': '{}\n',
    'app/worker/keys.ts': registry,
    'app/node_modules/sample-package/index.js': '',
    'app/node_modules/.bin/sample-tool': '',
    'app/node_modules/.cache/kept-out': '',
    ...more,
  };
  for (const [path, text] of Object.entries(files)) {
    if (without.includes(path)) continue;
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), text);
  }
  const temp = join(root, 'temp');
  mkdirSync(temp);
  return { root, app: join(root, 'app'), temp };
}

// A tool doing its job: it fails, and names each sample with the reason.
const caught = ({ samples, requires }) => ({ status: 1, output: [requires, ...samples.map(sample => `${sample.file}: ${sample.says}`)].filter(Boolean).join('\n') });

// Run the proof with stand-in tools; `tool(name)` answers for one gate, or nothing to let it catch.
async function prove(f, tool = () => undefined, watch = () => {}) {
  const said = [];
  const commands = [];
  const ok = await proveChecks({ app: f.app, temp: f.temp, log: line => said.push(line), run: (command, cwd, proving) => {
    commands.push(command.replace(/ --root .*$/, ' --root'));
    watch(command, cwd, proving);
    return tool(proving.name, proving) ?? caught(proving);
  } });
  return { ok, said, commands };
}

test('every gate that catches its samples passes: each step of `npm test`, in a folder that is gone afterwards', async t => {
  const f = repo(t);
  const folders = {};
  const { ok, said, commands } = await prove(f, undefined, (command, cwd, { name }) => {
    folders[name] = cwd;
    const has = path => existsSync(join(cwd, path));
    if (name === 'lint') {
      assert.equal(readFileSync(join(cwd, '.oxlintrc.json'), 'utf8'), '{}\n', 'the real settings, copied');
      assert.ok(has('package.json'));
      assert.match(readFileSync(join(cwd, '.gitignore'), 'utf8'), /^node_modules$/m);
      assert.ok(lstatSync(join(cwd, 'node_modules/sample-package')).isSymbolicLink(), 'packages are linked, not copied');
      assert.ok(has('node_modules/.bin/sample-tool'));
      assert.equal(has('node_modules/.cache'), false, 'a tool\'s cache is not shared with the real install');
      assert.equal(readFileSync(join(cwd, 'src/too-long.ts'), 'utf8').trimEnd().split('\n').length, 501);
      assert.ok(has('src/apps/first/App.tsx') && has('src/apps/second/value.ts'));
      assert.equal(has('tsconfig.json'), false, 'another gate\'s settings stay out');
    }
    if (name === 'types') assert.ok(has('tsconfig.json') && has('tsconfig.app.json') && has('worker-configuration.d.ts') && has('worker/wrong-type-in-test.test.ts'));
    if (name === 'coverage') assert.deepEqual([has('src/setup.ts'), has('src/absent.ts'), has('src/one-branch.test.ts')], [true, false, true]);
    if (name === 'saved keys') {
      // The keys check reads a whole repo: it runs in the real app, pointed at the samples.
      assert.equal(cwd, f.app);
      const root = /--root '(.*)'$/.exec(command)[1];
      assert.equal(readFileSync(join(root, 'app/worker/keys.ts'), 'utf8'), REGISTRY);
      assert.match(readFileSync(join(root, 'app/worker/apps/sample/unlisted-key.ts'), 'utf8'), /env\.STRIPE_SECRET_KEY\b/);
    }
  });
  assert.equal(ok, true);
  assert.deepEqual(commands, ['npm run lint', 'tsc -b', 'vitest run --coverage', 'npm run test:runtime', 'knip', 'jscpd', 'node ../scripts/check-app-keys.mjs --root']);
  assert.deepEqual(said, ['lint: caught 5 bad samples', 'types: caught 4 bad samples', 'coverage: caught 1 bad sample', 'runtime: caught 1 bad sample',
    'unused code: caught 1 bad sample', 'repeated code: caught 2 bad samples', 'saved keys: caught 1 bad sample',
    'app checks: no gate let a bad sample through']);
  assert.equal(new Set(Object.values(folders)).size, GATES.length, 'one folder per gate');
  assert.deepEqual(readdirSync(f.temp), [], 'the throwaway folder is removed');
  assert.deepEqual(readdirSync(join(f.app, 'worker')), ['keys.ts'], 'no sample is written into the app');
});

test('a gate that exits zero on its bad sample is named, and the proof fails', async t => {
  const f = repo(t);
  // jscpd ignoring its settings: it still reports the clone, and passes.
  const { ok, said } = await prove(f, (name, proving) => (name === 'repeated code' ? { ...caught(proving), status: 0 } : undefined));
  assert.equal(ok, false);
  const line = said.find(text => text.startsWith('repeated code:'));
  assert.match(line, /^repeated code: passed a bad sample \(src\/repeated-first\.ts, worker\/repeated-second\.ts\); `jscpd` exited 0 and said:\n {4}src\/repeated-first\.ts: Clone found/);
  assert.equal(said.at(-1), 'app checks: 1 of 7 gates no longer prove they can fail: repeated code. Put back the settings or the tool each line names, then run `npm run test:checks` again.');
  assert.equal(said.filter(text => / caught \d/.test(text)).length, 6, 'the other gates are still proven');
  assert.deepEqual(readdirSync(f.temp), []);
});

test('a gate that fails without naming its sample, or without the reason, is named too', async t => {
  const f = repo(t);
  const { ok, said } = await prove(f, (name, proving) => {
    // A rule fell out of the list: four samples are caught, one is not.
    if (name === 'lint') return caught({ samples: proving.samples.filter(sample => sample.says !== 'max-lines') });
    // The files are named, for another reason than a wrong type.
    if (name === 'types') return { status: 2, output: proving.samples.map(sample => `${sample.file}: error TS9999`).join('\n') };
    // The tool never started.
    if (name === 'coverage') return { status: null, output: `${'noise\n'.repeat(30)}sh: vitest: not found\n` };
    return undefined;
  });
  assert.equal(ok, false);
  assert.match(said[0], /^lint: passed a bad sample \(src\/too-long\.ts\); `npm run lint` exited 1/);
  assert.match(said[1], /^types: passed a bad sample \(src\/wrong-type\.ts, worker\/wrong-type-server\.ts, worker\/wrong-type-in-test\.test\.ts, tests\/runtime\/wrong-type\.ts\); `tsc -b` exited 2/);
  assert.match(said[2], /^coverage: passed a bad sample \(src\/half-tested\.ts\); `vitest run --coverage` exited null and said:\n/);
  assert.equal(said[2].split('\n').length, 16, 'only the end of a long output is shown');
  assert.match(said[2], /sh: vitest: not found$/);
  assert.match(said.at(-1), /^app checks: 3 of 7 gates no longer prove they can fail: lint, types, coverage\./);
});

test('a missing settings file is reported, not skipped, and so is a gate `npm test` no longer runs', async t => {
  const f = repo(t, { without: ['app/.jscpd.json'], scripts: { test: 'pnpm run lint && vitest run --coverage && npm run test:runtime && knip && jscpd && node ../scripts/check-app-keys.mjs', lint: 'oxlint' } });
  const { ok, said, commands } = await prove(f);
  assert.equal(ok, false);
  assert.deepEqual(said.slice(0, 6), ['lint: caught 5 bad samples', 'types: `npm test` no longer runs it', 'coverage: caught 1 bad sample',
    'runtime: `npm test` no longer runs it', 'unused code: caught 1 bad sample', 'repeated code: its settings file .jscpd.json is missing']);
  assert.deepEqual(commands, ['pnpm run lint', 'vitest run --coverage', 'knip', 'node ../scripts/check-app-keys.mjs --root'], 'neither gate ran');
  assert.match(said.at(-1), /3 of 7 gates no longer prove they can fail: types, runtime, repeated code/);
  // An app whose package.json runs no tests proves nothing.
  for (const emptied of [{}, null]) {
    const bare = await prove(repo(t, { scripts: emptied }));
    assert.equal(bare.ok, false);
    assert.deepEqual(bare.commands, []);
    assert.equal(bare.said.filter(text => text.endsWith('`npm test` no longer runs it')).length, GATES.length);
  }
});

test('a registry with no saved key leaves the keys gate nothing to catch', async t => {
  for (const registry of ['export const keys = {};\n', 'export const keys = { plain: { title: "Plain" } };\n', 'export const other = 1;\n']) {
    const { ok, said, commands } = await prove(repo(t, { registry }));
    assert.equal(ok, true, registry);
    assert.equal(said.at(-2), 'saved keys: no saved key is registered, so there is nothing to catch');
    assert.equal(commands.length, GATES.length - 1);
  }
});

test('an app with no package.json, or no installed packages, is told so and makes no folder', async t => {
  const none = repo(t, { without: ['app/package.json'] });
  assert.deepEqual(await prove(none), { ok: false, said: [`app checks: no package.json in ${none.app}, so there is no app to prove`], commands: [] });
  const bare = repo(t, { without: ['app/node_modules/sample-package/index.js', 'app/node_modules/.bin/sample-tool', 'app/node_modules/.cache/kept-out'] });
  assert.deepEqual(await prove(bare), { ok: false, said: [`app checks: the app's packages are not installed; run \`npm ci\` in ${bare.app} first`], commands: [] });
  assert.deepEqual(readdirSync(bare.temp), []);
});

test('a tool that throws still leaves no folder behind', async t => {
  const f = repo(t);
  await assert.rejects(prove(f, () => { throw new Error('the tool crashed'); }), /the tool crashed/);
  assert.deepEqual(readdirSync(f.temp), []);
});

// Stand-ins on PATH, as `node_modules/.bin` holds the real tools: each names every file it finds with
// every reason, as a tool that catches its samples would, and says how colour was set for it.
const TOOL = `#!/bin/sh
find src worker tests -type f 2>/dev/null | sed 's/$/: no-explicit-any max-lines complexity rules-of-hooks no-restricted-imports TS2322 threshold RUNTIME_ASSERTION_PROOF Unused files Clone found/'
echo "runtime proof: workerd ready"
echo "colour:$NO_COLOR:$FORCE_COLOR"
exit "\${STAND_IN_STATUS:-1}"
`;
// The keys check's stand-in: it reads the repo it is pointed at, and repeats the sample it finds there.
const KEYS_CHECK = `import { readFileSync } from 'node:fs';
import { join } from 'node:path';
const root = process.argv[process.argv.indexOf('--root') + 1];
console.log('worker/apps/sample/unlisted-key.ts', readFileSync(join(root, 'app/worker/apps/sample/unlisted-key.ts'), 'utf8'));
process.exit(1);
`;

test('the command runs each step through the shell with the app\'s own tools, and exits 1 when one passes a bad sample', t => {
  const tools = Object.fromEntries(['oxlint', 'tsc', 'vitest', 'knip'].map(name => [`app/node_modules/.bin/${name}`, TOOL]));
  const f = repo(t, { scripts: { ...SCRIPTS, test: SCRIPTS.test.replace('npm run lint', SCRIPTS.lint) }, more: {
    ...tools,
    // Only this stand-in can be told to pass.
    'app/node_modules/.bin/jscpd': TOOL.replace('STAND_IN_STATUS', 'JSCPD_STATUS'),
    'scripts/check-app-keys.mjs': KEYS_CHECK,
  } });
  for (const name of ['oxlint', 'tsc', 'vitest', 'knip', 'jscpd']) chmodSync(join(f.app, 'node_modules/.bin', name), 0o755);
  const run = (vars = {}) => spawnSync(process.execPath, [script, '--root', f.root], { encoding: 'utf8', env: { ...process.env, TMPDIR: f.temp, FORCE_COLOR: '1', ...vars } });
  const proven = run();
  assert.equal(proven.status, 0, `${proven.stdout}${proven.stderr}`);
  assert.deepEqual(proven.stdout.trimEnd().split('\n'), ['lint: caught 5 bad samples', 'types: caught 4 bad samples', 'coverage: caught 1 bad sample', 'runtime: caught 1 bad sample',
    'unused code: caught 1 bad sample', 'repeated code: caught 2 bad samples', 'saved keys: caught 1 bad sample',
    'app checks: no gate let a bad sample through']);
  const quiet = run({ JSCPD_STATUS: '0' });
  assert.equal(quiet.status, 1, `${quiet.stdout}${quiet.stderr}`);
  assert.match(quiet.stdout, /^repeated code: passed a bad sample \(src\/repeated-first\.ts, worker\/repeated-second\.ts\); `jscpd` exited 0 and said:$/m);
  assert.match(quiet.stdout, /^ {4}colour:1:$/m, 'the tools are asked for plain output');
  assert.match(quiet.stdout, /^app checks: 1 of 7 gates no longer prove they can fail: repeated code\./m);
  assert.deepEqual(readdirSync(f.temp), []);
});


test('runtime proof needs a successful workerd request before the marked wrong assertion', async t => {
  for (const output of ['runtime.test.ts: RUNTIME_ASSERTION_PROOF', '  console.log("runtime proof: workerd ready");\nruntime.test.ts: RUNTIME_ASSERTION_PROOF', 'runtime proof: workerd ready\nruntime.test.ts: startup failed']) {
    const result = await prove(repo(t), name => name === 'runtime' ? { status: 1, output } : undefined);
    assert.equal(result.ok, false);
    assert.match(result.said.find(line => line.startsWith('runtime:')), /passed a bad sample/);
  }
});

test('missing runtime config or setup is reported before the runtime proof can run', async t => {
  for (const path of ['vitest.config.runtime.ts', 'tests/runtime/setup.ts']) {
    const result = await prove(repo(t, { without: [`app/${path}`] }));
    assert.equal(result.ok, false);
    assert.equal(result.said.find(line => line.startsWith('runtime:')), `runtime: its settings file ${path} is missing`);
    assert.equal(result.commands.includes('npm run test:runtime'), false);
  }
});
