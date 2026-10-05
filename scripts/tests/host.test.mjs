// routine/scripts/lib: the helpers every script shares (cli.mjs), the Paseo ones that build on
// them (paseo.mjs), and the host check and workspace marker (host.mjs).
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { CliError, EXIT, git as cliGit, parseCommand } from '../../.agents/skills/routine/scripts/lib/cli.mjs';
import {
  MARKER, markerFile, plainParent, readMarker, workspaceHost, writeMarker,
} from '../../.agents/skills/routine/scripts/lib/host.mjs';
import * as paseoLib from '../../.agents/skills/routine/scripts/lib/paseo.mjs';

function tmp(t, prefix) {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), `wong-test-host-${prefix}`)));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

function git(cwd, ...args) {
  return execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

/** A folder holding an executable `paseo` that does nothing. */
function paseoDir(t) {
  const dir = tmp(t, 'bin-');
  writeFileSync(path.join(dir, 'paseo'), '#!/bin/sh\nexit 0\n');
  chmodSync(path.join(dir, 'paseo'), 0o755);
  return dir;
}

/** A repo with one commit and one linked worktree. */
function repo(t) {
  const base = tmp(t, 'repo-');
  const primary = path.join(base, 'primary');
  execFileSync('git', ['init', '-q', '-b', 'main', primary]);
  git(primary, 'config', 'user.email', 'fixture@example.invalid');
  git(primary, 'config', 'user.name', 'Fixture');
  writeFileSync(path.join(primary, 'README.md'), 'readme\n');
  git(primary, 'add', '--all');
  git(primary, 'commit', '-q', '-m', 'first');
  const linked = path.join(base, 'linked');
  git(primary, 'worktree', 'add', '-q', '-b', 'part', linked);
  return { base, primary, linked };
}

// ---------------------------------------------------------------------------
// cli.mjs and paseo.mjs

test('the exit codes keep their numbers, under a Paseo name and a neutral one', () => {
  assert.deepEqual(EXIT, { ok: 0, input: 2, noPaseo: 3, notReady: 3, noDaemon: 4, noAnswer: 4, client: 5 });
  assert.equal(paseoLib.EXIT, EXIT);
  assert.equal(paseoLib.git, cliGit);
  assert.equal(paseoLib.CliError, CliError);
});

test('a CliError carries a code and extras, and a PaseoError is one', () => {
  const plain = new CliError(EXIT.notReady, 'not ready', { needs: 'setup' });
  assert.equal(plain.code, 3);
  assert.equal(plain.message, 'not ready');
  assert.deepEqual(plain.extra, { needs: 'setup' });
  assert.deepEqual(new CliError(2, 'x').extra, {});
  assert.ok(!(plain instanceof paseoLib.PaseoError));
  const fromPaseo = new paseoLib.PaseoError(EXIT.noDaemon, 'down');
  assert.ok(fromPaseo instanceof CliError);
  assert.equal(fromPaseo.code, 4);
  assert.deepEqual(fromPaseo.extra, {});
});

test('parseCommand refuses with a CliError, and through paseo.mjs with a PaseoError', () => {
  const options = { values: ['name'], booleans: { '--dry-run': 'dryRun' }, positional: true, unknown: arg => `Unknown ${arg}.` };
  const parsed = { command: 'pause', flags: { name: 'daily', dryRun: true }, positional: ['x'] };
  assert.deepEqual(parseCommand(['pause', 'x', '--name', 'daily', '--dry-run'], options), parsed);
  assert.deepEqual(paseoLib.parseCommand(['pause', 'x', '--name', 'daily', '--dry-run'], options), parsed);
  for (const [argv, message] of [[['ls', '--nope'], 'Unknown --nope.'], [['ls', '--name'], '--name needs a value.']]) {
    assert.throws(() => parseCommand(argv, options),
      error => error instanceof CliError && !(error instanceof paseoLib.PaseoError) && error.code === 2 && error.message === message);
    assert.throws(() => paseoLib.parseCommand(argv, options),
      error => error instanceof paseoLib.PaseoError && error.code === 2 && error.message === message);
  }
});

test('findPaseo names a missing Paseo with exit 3, as a PaseoError', t => {
  const empty = tmp(t, 'empty-');
  assert.throws(() => paseoLib.findPaseo({ PATH: empty }, 'X_PASEO_BIN'),
    error => error instanceof paseoLib.PaseoError && error.code === EXIT.noPaseo && /not installed/.test(error.message));
});

// ---------------------------------------------------------------------------
// host.mjs: which host

test('the host is paseo with `paseo` on PATH, and plain without it', t => {
  const bin = paseoDir(t);
  const empty = tmp(t, 'empty-');
  assert.equal(workspaceHost({ PATH: `${empty}${path.delimiter}${bin}` }), 'paseo');
  assert.equal(workspaceHost({ PATH: empty }), 'plain');
  assert.equal(workspaceHost({ PATH: '' }), 'plain');
  assert.equal(workspaceHost({}), 'plain');
});

test('an override names the command in place of PATH, for either script', t => {
  const bin = paseoDir(t);
  const empty = tmp(t, 'empty-');
  const command = path.join(bin, 'paseo');
  const missing = path.join(empty, 'paseo');
  for (const name of ['WORKSPACE_PASEO_BIN', 'TIDY_PASEO_BIN']) {
    assert.equal(workspaceHost({ PATH: empty, [name]: command }), 'paseo', `${name} set, PATH empty`);
    assert.equal(workspaceHost({ PATH: bin, [name]: missing }), 'plain', `${name} points at no command`);
    assert.equal(workspaceHost({ PATH: bin, [name]: '' }), 'paseo', `an empty ${name} falls back to PATH`);
  }
  assert.equal(workspaceHost({ PATH: empty, WORKSPACE_PASEO_BIN: missing, TIDY_PASEO_BIN: command }, 'TIDY_PASEO_BIN'), 'paseo');
  assert.equal(workspaceHost({ PATH: empty, WORKSPACE_PASEO_BIN: missing, TIDY_PASEO_BIN: command }, 'WORKSPACE_PASEO_BIN'), 'plain');
});

test('a Paseo whose daemon is down is still the host', t => {
  const bin = tmp(t, 'down-');
  writeFileSync(path.join(bin, 'paseo'), '#!/bin/sh\necho "Cannot connect to daemon" >&2\nexit 1\n');
  chmodSync(path.join(bin, 'paseo'), 0o755);
  assert.equal(workspaceHost({ PATH: bin }), 'paseo');
});

// ---------------------------------------------------------------------------
// host.mjs: the marker

test('the marker lives in a linked worktree\'s own git directory, never in the working tree', t => {
  const { primary, linked } = repo(t);
  const gitDir = git(linked, 'rev-parse', '--path-format=absolute', '--git-dir');
  assert.equal(MARKER, 'wong-workspace.json');
  assert.equal(markerFile(linked), path.join(gitDir, 'wong-workspace.json'));
  assert.equal(readMarker(linked), null, 'a worktree made by hand has none');
  const marker = { title: 'Thinner specs', madeAt: '2026-10-05T09:00:00.000Z', closedAt: null };
  writeMarker(linked, marker);
  assert.deepEqual(readMarker(linked), marker);
  assert.deepEqual(JSON.parse(readFileSync(path.join(gitDir, MARKER), 'utf8')), marker);
  assert.ok(!existsSync(path.join(linked, MARKER)));
  assert.equal(git(linked, 'status', '--porcelain'), '');
  writeMarker(linked, { ...marker, closedAt: '2026-10-06T09:00:00.000Z' });
  assert.equal(readMarker(linked).closedAt, '2026-10-06T09:00:00.000Z');
  git(primary, 'worktree', 'remove', linked);
  assert.ok(!existsSync(gitDir), 'the marker goes when the worktree goes');
});

test('the primary checkout, a folder outside git, and a broken marker have no marker', t => {
  const { base, primary, linked } = repo(t);
  assert.equal(markerFile(primary), null);
  assert.equal(readMarker(primary), null);
  assert.throws(() => writeMarker(primary, { title: 'x' }), /not a linked worktree/);
  assert.ok(!existsSync(path.join(primary, '.git', MARKER)));
  const outside = tmp(t, 'outside-');
  assert.equal(markerFile(outside), null);
  assert.equal(readMarker(outside), null);
  for (const text of ['not json', '[]', '"text"', 'null']) {
    writeFileSync(markerFile(linked), text);
    assert.equal(readMarker(linked), null, text);
  }
  assert.equal(plainParent(primary), path.join(base, 'primary-workspaces'));
});
