// The committed paseo.json, and schedule/scripts/presets.mjs against a fake Paseo home with fake
// `paseo`, `claude`, and `codex` commands on a PATH that holds nothing else.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadPresets, plan, withPresets } from '../../.agents/skills/schedule/scripts/presets.mjs';

const repo = new URL('../..', import.meta.url).pathname;
const cli = path.join(repo, '.agents/skills/schedule/scripts/presets.mjs');
const PRESETS = loadPresets();
const names = provider => PRESETS.filter(p => p.provider === provider).map(p => p.name);

// Keys Paseo writes that the script must leave alone, and one profile the person made.
const CONFIG = {
  version: 1,
  daemon: {
    listen: '127.0.0.1:6767',
    browserTools: { enabled: false },
    autoArchiveAfterMerge: false,
    agentProfiles: [{ id: 'agent_profile_x', name: 'My own', provider: 'claude', modeId: 'default' }],
    providers: { claude: { enabled: true } },
  },
  app: { theme: 'dark' },
};

function tmp(t, prefix) {
  const dir = realpathSync(mkdtempSync(path.join(tmpdir(), `wong-test-presets-${prefix}`)));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  return dir;
}

/** A Paseo home with `config`, and a bin folder with a logging fake `paseo` plus each of `agents`. */
function machine(t, { config = CONFIG, agents = ['claude'], paseo = true } = {}) {
  const home = tmp(t, 'home-');
  const bin = tmp(t, 'bin-');
  const file = path.join(home, 'config.json');
  const log = path.join(bin, 'log.jsonl');
  if (config) {
    writeFileSync(file, `${JSON.stringify(config, null, 2)}\n`);
    chmodSync(file, 0o600);
  }
  if (paseo) {
    writeFileSync(path.join(bin, 'paseo'), `#!${process.execPath}
require('node:fs').appendFileSync(${JSON.stringify(log)}, JSON.stringify(process.argv.slice(2)) + '\\n');
if (process.env.FAKE_PASEO_DOWN) { console.error('Cannot connect to daemon: ECONNREFUSED'); process.exit(1); }
console.log('{"ok":true}');
`);
    chmodSync(path.join(bin, 'paseo'), 0o755);
  }
  for (const agent of agents) {
    writeFileSync(path.join(bin, agent), '#!/bin/sh\nexit 0\n');
    chmodSync(path.join(bin, agent), 0o755);
  }
  const run = (args = ['add'], env = {}) => {
    const r = spawnSync(process.execPath, [cli, ...args], {
      encoding: 'utf8', env: { HOME: home, PATH: bin, PASEO_HOME: home, ...env },
    });
    return { status: r.status, json: JSON.parse(r.stdout), stderr: r.stderr };
  };
  const calls = () => existsSync(log) ? readFileSync(log, 'utf8').trim().split('\n').map(l => JSON.parse(l)) : [];
  const read = () => readFileSync(file, 'utf8');
  return { home, bin, file, run, calls, read };
}

// ── paseo.json ─────────────────────────────────────────────────────────────

test('paseo.json seeds secrets on worktree setup and carries the four naming instructions', () => {
  const config = JSON.parse(readFileSync(path.join(repo, 'paseo.json'), 'utf8'));
  assert.equal(config.worktree.setup, 'node .claude/skills/ship/scripts/worktree-secrets.mjs seed');
  for (const key of ['title', 'branchName', 'commitMessage', 'pullRequest']) {
    assert.ok(config.metadataGeneration[key]?.instructions?.trim(), `metadataGeneration.${key} has instructions`);
  }
  const commit = config.metadataGeneration.commitMessage.instructions;
  assert.match(commit, /Co-Authored-By: Claude <noreply@anthropic\.com>/);
  assert.match(commit, /never add a version/i);
  assert.doesNotMatch(commit, /\bv?\d+\.\d+\.\d+\b/, 'the commit instructions name no version');
  assert.match(config.metadataGeneration.pullRequest.instructions, /Generated with \[Claude Code\]/);
});

// ── the preset data and the pure helpers ───────────────────────────────────

test('paseo-presets.json has four presets, each with a stable id, a name, and a provider', () => {
  assert.equal(PRESETS.length, 4);
  for (const p of PRESETS) {
    assert.match(p.id, /^wongstack-(claude|codex)-/);
    assert.ok(p.name && p.provider, JSON.stringify(p));
  }
  assert.equal(new Set(PRESETS.map(p => p.id)).size, 4);
  assert.deepEqual([...new Set(PRESETS.map(p => p.provider))].sort(), ['claude', 'codex']);
});

test('a preset counts as present by id or by name; a missing agent skips it', () => {
  const [a, b, c, d] = PRESETS;
  const sorted = plan([{ id: a.id, name: 'renamed' }, { id: 'random', name: b.name }], PRESETS, p => p === 'claude');
  assert.deepEqual(sorted.kept, [a, b]);
  assert.deepEqual(sorted.skipped, [c, d]);
  assert.deepEqual(sorted.added, []);
});

test('withPresets appends to agentProfiles and keeps every other key', () => {
  const out = withPresets(CONFIG, [PRESETS[0]]);
  assert.deepEqual(out.daemon.agentProfiles, [...CONFIG.daemon.agentProfiles, PRESETS[0]]);
  assert.deepEqual({ ...out, daemon: { ...out.daemon, agentProfiles: null } }, { ...CONFIG, daemon: { ...CONFIG.daemon, agentProfiles: null } });
  assert.deepEqual(Object.keys(out.daemon), Object.keys(CONFIG.daemon));
  assert.deepEqual(withPresets({ version: 1 }, [PRESETS[0]]).daemon, { agentProfiles: [PRESETS[0]] });
});

// ── the command ────────────────────────────────────────────────────────────

test('a machine with Claude only gets the two Claude presets, skips Codex, keeps the rest, and reloads', t => {
  const m = machine(t);
  const r = m.run();
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.deepEqual(r.json, { ok: true, added: names('claude'), kept: [], skipped: names('codex'), reloaded: true });
  const config = JSON.parse(m.read());
  assert.deepEqual(config.daemon.agentProfiles, [...CONFIG.daemon.agentProfiles, ...PRESETS.filter(p => p.provider === 'claude')]);
  assert.deepEqual({ ...config, daemon: { ...config.daemon, agentProfiles: null } }, { ...CONFIG, daemon: { ...CONFIG.daemon, agentProfiles: null } });
  assert.equal(statSync(m.file).mode & 0o777, 0o600);
  assert.deepEqual(readdirSync(m.home), ['config.json'], 'no temp file is left');
  assert.deepEqual(m.calls(), [['reload', '--home', m.home, '--json']]);
});

test('a preset the person already has is kept exactly as it was', t => {
  const mine = { id: 'agent_profile_abc', name: '[CLAUDE] Apply / Ship', provider: 'claude', model: 'claude-sonnet-9' };
  const m = machine(t, { config: { ...CONFIG, daemon: { ...CONFIG.daemon, agentProfiles: [mine] } }, agents: ['claude', 'codex'] });
  const r = m.run();
  assert.equal(r.status, 0);
  assert.deepEqual(r.json.kept, ['[CLAUDE] Apply / Ship']);
  assert.deepEqual(r.json.added, PRESETS.map(p => p.name).filter(n => n !== '[CLAUDE] Apply / Ship'));
  const profiles = JSON.parse(m.read()).daemon.agentProfiles;
  assert.deepEqual(profiles[0], mine);
  assert.equal(profiles.length, 4);
});

test('a second run leaves the file byte-identical, adds nothing, and does not reload', t => {
  const m = machine(t, { agents: ['claude', 'codex'] });
  assert.equal(m.run().status, 0);
  const before = m.read();
  const calls = m.calls().length;
  const r = m.run();
  assert.equal(r.status, 0);
  assert.deepEqual(r.json, { ok: true, added: [], kept: PRESETS.map(p => p.name), skipped: [], reloaded: false });
  assert.equal(m.read(), before);
  assert.equal(m.calls().length, calls);
});

test('a dry run reports what it would add and writes nothing', t => {
  const m = machine(t);
  const before = m.read();
  const r = m.run(['add', '--dry-run']);
  assert.equal(r.status, 0);
  assert.equal(r.json.dryRun, true);
  assert.deepEqual(r.json.added, names('claude'));
  assert.equal(m.read(), before);
  assert.deepEqual(m.calls(), []);
});

test('--home wins over PASEO_HOME', t => {
  const m = machine(t);
  const r = m.run(['add', '--home', m.home], { PASEO_HOME: path.join(m.home, 'nowhere') });
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.deepEqual(r.json.added, names('claude'));
});

test('no Paseo on PATH exits 3 and writes nothing', t => {
  const m = machine(t, { paseo: false });
  const before = m.read();
  const r = m.run();
  assert.equal(r.status, 3);
  assert.match(r.json.error, /not installed/);
  assert.equal(m.read(), before);
});

test('a Paseo home with no config.json exits 3 and creates nothing', t => {
  const m = machine(t, { config: null });
  const r = m.run();
  assert.equal(r.status, 3);
  assert.match(r.json.error, /not set up yet/);
  assert.deepEqual(readdirSync(m.home), []);
  assert.deepEqual(m.calls(), []);
});

test('a config not in the shape Paseo writes exits 5 and writes nothing', t => {
  const m = machine(t, { config: { daemon: { agentProfiles: {} } } });
  const before = m.read();
  const r = m.run();
  assert.equal(r.status, 5);
  assert.equal(m.read(), before);
});

test('a daemon that does not answer keeps the saved presets and reports reloaded false', t => {
  const m = machine(t);
  const r = m.run(['add'], { FAKE_PASEO_DOWN: '1' });
  assert.equal(r.status, 0, JSON.stringify(r.json));
  assert.equal(r.json.reloaded, false);
  assert.match(r.json.warning, /did not reload/);
  assert.deepEqual(r.json.added, names('claude'));
  assert.equal(JSON.parse(m.read()).daemon.agentProfiles.length, 3);
});
