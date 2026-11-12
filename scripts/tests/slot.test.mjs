import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { loadProfile, runCommand, slot } from '../../.agents/plugins/loop/scripts/slot.mjs';

const script = new URL('../../.agents/plugins/loop/scripts/slot.mjs', import.meta.url).pathname;

// A throwaway checkout, with `profile` as its .agents/loop/profile.mjs when given.
function checkout(t, profile) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-slot-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  execFileSync('git', ['init', '-q', '-b', 'main', dir]);
  if (profile) {
    mkdirSync(join(dir, '.agents/loop'), { recursive: true });
    writeFileSync(join(dir, '.agents/loop/profile.mjs'), profile);
  }
  return dir;
}

// The CLI from inside `dir`, with no profile named by the environment.
const cli = (dir, args) => {
  const env = { ...process.env };
  delete env.WONG_LOOP_PROFILE;
  return spawnSync(process.execPath, [script, ...args], { cwd: dir, encoding: 'utf8', env });
};

const FULL = `export default {
  word: 'local',
  flag: true,
  sum: ({ args = [], a = 0, b = 0 }) => (args.length ? args.join('+') : a + b),
  code: () => 3,
  nothing: () => null,
  echo: 'printf "%s|"',
  async later({ root }) { return root; },
};
`;

test('with no profile every slot is empty, and the CLI says so with exit 0', async (t) => {
  const dir = checkout(t);
  const saved = process.env.WONG_LOOP_PROFILE;
  delete process.env.WONG_LOOP_PROFILE;
  t.after(() => { if (saved !== undefined) process.env.WONG_LOOP_PROFILE = saved; });
  assert.deepEqual(await loadProfile(dir), {});
  assert.deepEqual(await slot('route', {}, dir), { empty: true });
  for (const args of [['route'], ['--run', 'precheck', 'x']]) {
    const result = cli(dir, args);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `SLOT=${args.at(-1) === 'x' ? 'precheck' : 'route'} empty\n`);
  }
});

test('a part the profile leaves out is empty; the rest return their value', async (t) => {
  const dir = checkout(t, FULL);
  process.env.WONG_LOOP_PROFILE = join(dir, '.agents/loop/profile.mjs');
  t.after(() => { delete process.env.WONG_LOOP_PROFILE; });
  assert.deepEqual(await slot('missing', {}, dir), { empty: true });
  assert.deepEqual(await slot('word', {}, dir), { value: 'local' });
  assert.deepEqual(await slot('sum', { a: 2, b: 3 }, dir), { value: 5 });
  assert.deepEqual(await slot('later', {}, dir), { value: dir });
  assert.deepEqual(await slot('nothing', {}, dir), { value: null });
});

test('the CLI prints a value, exits with a number, and runs a command with its args', (t) => {
  const dir = checkout(t, FULL);
  mkdirSync(join(dir, 'sub'));
  assert.equal(cli(dir, ['missing']).stdout, 'SLOT=missing empty\n');
  assert.equal(cli(dir, ['word']).stdout, 'local\n');
  assert.equal(cli(dir, ['flag']).stdout, 'true\n');
  assert.equal(cli(dir, ['sum', 'x', 'y']).stdout, 'x+y\n');
  const code = cli(dir, ['code']);
  assert.equal(code.status, 3);
  assert.equal(code.stdout, '');
  // --run starts at the checkout's top, from any folder inside it, and passes each arg as one word.
  const run = cli(join(dir, 'sub'), ['--run', 'echo', 'a b', 'c']);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, 'a b|c|');
  assert.equal(cli(dir, ['--run', 'nothing']).stdout, 'SLOT=nothing empty\n');
  assert.equal(cli(dir, ['--run', 'sum']).status, 2, 'a part that is no command');
  assert.equal(cli(dir, []).status, 2, 'no name');
});

test('runCommand passes the args to the command and returns its exit code', () => {
  assert.equal(runCommand('exit 4', [], { stdio: 'ignore' }), 4);
  const out = spawnSync(process.execPath, ['--input-type=module', '-e',
    `import { runCommand } from ${JSON.stringify(script)}; runCommand('printf "%s;"', ['one two', 'three']);`], { encoding: 'utf8' });
  assert.equal(out.stdout, 'one two;three;');
});
