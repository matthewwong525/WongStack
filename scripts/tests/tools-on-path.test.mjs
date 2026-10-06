// A later chat finds the tools setup put in the person's own folder, ~/.local/bin.
// Two shipped texts do that, and this file runs both as they ship, never a copy:
//
// - setup's snippet in .agents/skills/wong-setup/references/tools.md, which puts
//   the PATH line first in the shell's start-up file. Codex reads that file.
// - the first SessionStart hook in .agents/settings.json, which tells Claude Code,
//   since it reads no start-up file.
//
// Every child starts with `env -i`, SHLVL=1, and no stdin. A bash with no SHLVL
// and a socket on stdin reads ~/.bashrc on its own, and would pass a broken line.
// wiki/development/required-tools.md#where-an-assistant-finds-its-tools
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, symlinkSync, writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = path => readFileSync(join(repo, path), 'utf8');

const TOOLS = '.agents/skills/wong-setup/references/tools.md';
const SETTINGS = '.agents/settings.json';
const CODEX_HOOKS = '.agents/hooks.json';
const LINE = 'export PATH="$HOME/.local/bin:$PATH"';
const PREFIX = 'PATH="$HOME/.local/bin:$PATH" ';
const TOOL = 'wong-fake-tool';
// Nothing installs to the user folder on Windows, and these cases need bash.
const unix = { skip: process.platform === 'win32' && 'the user folder is not used on Windows' };

// Ubuntu's two stock guards, and its two ~/.profile files, as it ships them.
const GUARDS = {
  "root's guard": '[ -z "$PS1" ] && return',
  "a user's guard": 'case $- in\n    *i*) ;;\n      *) return;;\nesac',
};
const PROFILES = {
  "root's profile": 'if [ "$BASH" ]; then\n  if [ -f ~/.bashrc ]; then\n    . ~/.bashrc\n  fi\nfi\n',
  "a user's profile": 'if [ -n "$BASH_VERSION" ]; then\n    if [ -f "$HOME/.bashrc" ]; then\n\t. "$HOME/.bashrc"\n    fi\nfi\n\nif [ -d "$HOME/.local/bin" ] ; then\n    PATH="$HOME/.local/bin:$PATH"\nfi\n',
};
const bashrc = guard => `# ~/.bashrc: executed by bash(1) for non-login shells.\n\n# If not running interactively, don't do anything\n${guard}\n\nHISTCONTROL=ignoreboth\n`;

// How an assistant starts a shell: Codex's login shell, and the two ways a
// start-up file is read by name.
const STARTS = {
  'bash -lc': run => ['-lc', run],
  "bash -c 'source ~/.bashrc; …'": run => ['-c', `source ~/.bashrc; ${run}`],
  "bash -c -l 'source ~/.bashrc; …'": run => ['-c', '-l', `source ~/.bashrc; ${run}`],
};

/** Setup's snippet, as tools.md ships it. */
function snippet() {
  const found = read(TOOLS).match(/```bash\n(L='export PATH=[\s\S]*?)\n```/);
  assert.ok(found, `${TOOLS} no longer holds the fenced bash snippet that starts L='export PATH=. Setup writes its PATH line with it, and this test runs it.`);
  return found[1];
}

/** Claude Code's SessionStart hooks, in order, and the one that adds the folder. */
function sessionHooks() {
  const hooks = (JSON.parse(read(SETTINGS)).hooks?.SessionStart ?? []).flatMap(entry => entry.hooks ?? []);
  const adds = hooks.find(hook => hook.command?.includes('CLAUDE_ENV_FILE'));
  assert.ok(adds, `${SETTINGS} no longer holds a SessionStart hook that writes to CLAUDE_ENV_FILE. Claude Code finds the user folder's tools only through it.`);
  return { hooks, adds };
}

const allCommands = () => Object.values(JSON.parse(read(SETTINGS)).hooks ?? {})
  .flatMap(entries => entries.flatMap(entry => entry.hooks ?? []))
  .map(hook => hook.command);

/** A throwaway home holding a fake tool in ~/.local/bin, unless `tool` is false. */
function home(t, { tool = true } = {}) {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'wong-test-path-')));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  if (tool) {
    mkdirSync(join(dir, '.local/bin'), { recursive: true });
    writeFileSync(join(dir, '.local/bin', TOOL), '#!/bin/sh\necho found\n');
    chmodSync(join(dir, '.local/bin', TOOL), 0o755);
  }
  return dir;
}

/** A child as a real one starts: an empty environment, SHLVL=1, and no stdin. */
function child(dir, command, args, env = {}) {
  const vars = Object.entries({ HOME: dir, SHLVL: '1', PATH: '/usr/bin:/bin', ...env }).map(([key, value]) => `${key}=${value}`);
  return spawnSync('env', ['-i', ...vars, command, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const runSnippet = (dir, shell = '/bin/bash') => {
  const result = child(dir, 'bash', ['-c', snippet()], { SHELL: shell });
  assert.equal(result.status, 0, `the snippet failed: ${result.stderr}`);
};

/** Which starts find the fake tool, by name. */
const finds = dir => Object.entries(STARTS)
  .filter(([, args]) => child(dir, 'bash', args(`command -v ${TOOL}`)).stdout.trim() === join(dir, '.local/bin', TOOL))
  .map(([name]) => name);

const firstLine = path => readFileSync(path, 'utf8').split('\n')[0];

for (const [guardName, guard] of Object.entries(GUARDS)) {
  for (const [profileName, profile] of Object.entries(PROFILES)) {
    test(`after the snippet, every start finds the tool under ${guardName} and ${profileName}`, unix, t => {
      const dir = home(t);
      const before = bashrc(guard);
      writeFileSync(join(dir, '.bashrc'), before);
      writeFileSync(join(dir, '.profile'), profile);

      runSnippet(dir);

      assert.deepEqual(finds(dir), Object.keys(STARTS));
      assert.equal(readFileSync(join(dir, '.bashrc'), 'utf8'), `${LINE}\n${before}`, 'the line goes first, and the rest of the file stays as it was');
    });
  }

  test(`with the line at the bottom, no start finds the tool under ${guardName} and root's profile`, unix, t => {
    const dir = home(t);
    writeFileSync(join(dir, '.bashrc'), `${bashrc(guard)}${LINE}\n`);
    writeFileSync(join(dir, '.profile'), PROFILES["root's profile"]);

    assert.deepEqual(finds(dir), [], 'the guard stops the file above the line, so this must find nothing; if it finds the tool, these cases prove nothing');
  });
}

test('a second run of the snippet leaves the file byte for byte the same', unix, t => {
  const dir = home(t);
  writeFileSync(join(dir, '.bashrc'), `${bashrc(GUARDS["root's guard"])}${LINE}\n`);

  runSnippet(dir);
  const once = readFileSync(join(dir, '.bashrc'));
  runSnippet(dir);

  assert.ok(once.equals(readFileSync(join(dir, '.bashrc'))), 'the second run changed the file');
  assert.ok(once.toString().endsWith(`${LINE}\n`), 'a line an earlier setup wrote lower down stays');
  assert.ok(!existsSync(join(dir, '.bashrc.new')), 'the working copy is removed');
});

test('a linked ~/.bashrc stays a link, and its target gets the line', unix, t => {
  const dir = home(t);
  mkdirSync(join(dir, 'dotfiles'));
  writeFileSync(join(dir, 'dotfiles/bashrc'), bashrc(GUARDS["a user's guard"]));
  symlinkSync('dotfiles/bashrc', join(dir, '.bashrc'));

  runSnippet(dir);

  assert.ok(lstatSync(join(dir, '.bashrc')).isSymbolicLink(), '~/.bashrc is no longer a link');
  assert.equal(firstLine(join(dir, 'dotfiles/bashrc')), LINE);
});

test('with no ~/.bashrc, the snippet creates one holding the line', unix, t => {
  const dir = home(t);

  runSnippet(dir);

  assert.equal(readFileSync(join(dir, '.bashrc'), 'utf8'), `${LINE}\n`);
});

test('for zsh, ~/.zshenv and ~/.zshrc both start with the line, and ~/.bashrc is untouched', unix, t => {
  const dir = home(t);
  const before = bashrc(GUARDS["a user's guard"]);
  writeFileSync(join(dir, '.bashrc'), before);
  writeFileSync(join(dir, '.zshrc'), '# my zsh settings\n');

  runSnippet(dir, '/bin/zsh');

  assert.equal(readFileSync(join(dir, '.zshenv'), 'utf8'), `${LINE}\n`);
  assert.equal(readFileSync(join(dir, '.zshrc'), 'utf8'), `${LINE}\n# my zsh settings\n`);
  assert.equal(readFileSync(join(dir, '.bashrc'), 'utf8'), before);
});

test('the hook that adds the folder runs first at session start, with a 3 second limit', unix, () => {
  const { hooks, adds } = sessionHooks();

  assert.equal(hooks[0], adds, `${SETTINGS}: the shell hook must come before the hooks that need Node`);
  assert.equal(adds.timeout, 3);
  assert.equal(adds.type, 'command');
});

// Each case: the home it runs in, its environment, and what the env file holds after.
const HOOK_CASES = [
  ['the folder is there and off PATH', { tool: true }, dir => ({ CLAUDE_ENV_FILE: join(dir, 'session-env') }), `${LINE}\n`],
  ['the folder is already on PATH', { tool: true }, dir => ({ CLAUDE_ENV_FILE: join(dir, 'session-env'), PATH: `/usr/bin:${dir}/.local/bin:/bin` }), null],
  ['the folder is missing', { tool: false }, dir => ({ CLAUDE_ENV_FILE: join(dir, 'session-env') }), null],
  ['CLAUDE_ENV_FILE is unset', { tool: true }, () => ({}), null],
];

for (const [name, options, env, written] of HOOK_CASES) {
  test(`the hook exits 0 and ${written ? 'writes the line' : 'writes nothing'} when ${name}`, unix, t => {
    const dir = home(t, options);
    const result = child(dir, 'sh', ['-c', sessionHooks().adds.command], env(dir));

    assert.equal(result.status, 0, `a failed hook must not block a session: ${result.stderr}`);
    assert.equal(result.stdout, '', 'the hook prints nothing into the chat');
    const file = join(dir, 'session-env');
    assert.equal(existsSync(file) ? readFileSync(file, 'utf8') : null, written);
  });
}

test("a command that reads the hook's env file finds the tool", unix, t => {
  const dir = home(t);
  const file = join(dir, 'session-env');
  child(dir, 'sh', ['-c', sessionHooks().adds.command], { CLAUDE_ENV_FILE: file });

  const result = child(dir, 'bash', ['-c', `source "${file}" && command -v ${TOOL}`]);

  assert.equal(result.stdout.trim(), join(dir, '.local/bin', TOOL));
});

test("both of Claude Code's node hooks look in the user folder, and Codex's hook file sets no PATH", unix, () => {
  const node = allCommands().filter(command => /(^|\s)node\s/.test(command));

  assert.equal(node.length, 2, `${SETTINGS} should hold two hooks that run node; found ${node.length}`);
  for (const command of node) {
    assert.ok(command.startsWith(`${PREFIX}node `), `${SETTINGS}: a node hook must start with ${PREFIX}so it finds a Node in the user folder: ${command}`);
  }
  // Codex starts a hook in a login shell, which setup's line reaches; on Windows
  // it uses cmd.exe, where a PATH= prefix is a syntax error.
  assert.doesNotMatch(read(CODEX_HOOKS), /PATH=/, `${CODEX_HOOKS} must not set PATH`);
});
