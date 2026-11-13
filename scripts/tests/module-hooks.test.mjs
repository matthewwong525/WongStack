// Each module's hook list, hooks/claude.json and hooks/codex.json, runs from WongStack's own settings, once per group,
// and the settings run no module script that no module lists. wiki/maintaining/adding-a-module.md
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SETTINGS = { claude: '.agents/settings.json', codex: '.agents/hooks.json' };
const MODULE_SCRIPT = /\.claude\/skills\/([\w.-]+)\/scripts\//;

const readHooks = path => (existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')).hooks ?? {} : {});
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Each module's hook groups for one agent, keyed by module name. */
function moduleHooks(root, agent) {
  const dir = join(root, '.agents/plugins');
  return Object.fromEntries(readdirSync(dir, { withFileTypes: true }).filter(entry => entry.isDirectory())
    .map(entry => [entry.name, readHooks(join(dir, entry.name, 'hooks', `${agent}.json`))]));
}

/** A line per module hook group the settings miss, change, or hold twice, and per settings command that runs a
 *  module's script no module lists. */
function hookProblems(settings, modules) {
  const problems = [];
  const listed = new Set();
  for (const [name, hooks] of Object.entries(modules)) {
    for (const [event, groups] of Object.entries(hooks)) {
      for (const group of groups) {
        for (const hook of group.hooks) listed.add(hook.command);
        const count = (settings[event] ?? []).filter(other => same(other, group)).length;
        if (count !== 1) problems.push(`${name} ${event} group ${count ? `runs ${count} times` : 'is missing or differs'}`);
      }
    }
  }
  for (const [event, groups] of Object.entries(settings)) {
    for (const hook of groups.flatMap(group => group.hooks)) {
      const module = hook.command.match(MODULE_SCRIPT)?.[1];
      if (module && module in modules && !listed.has(hook.command)) problems.push(`${event} runs ${module}'s script, which no module lists: ${hook.command}`);
    }
  }
  return problems;
}

for (const [agent, file] of Object.entries(SETTINGS)) {
  test(`${file} runs each module's ${agent} hooks once, and no other module script`, () => {
    const modules = moduleHooks(repo, agent);
    assert.ok(['memory', 'daily', 'access'].every(name => Object.keys(modules[name]).length), 'memory, Daily, and Access list hooks');
    assert.deepEqual(hookProblems(readHooks(join(repo, file)), modules), []);
  });
}

test('a module hook file names project paths, never a plugin root', () => {
  for (const agent of Object.keys(SETTINGS)) {
    for (const [name, hooks] of Object.entries(moduleHooks(repo, agent))) {
      for (const hook of Object.values(hooks).flat().flatMap(group => group.hooks)) {
        assert.doesNotMatch(hook.command, /PLUGIN_ROOT/, `${name} ${agent}`);
        assert.equal(hook.command.match(MODULE_SCRIPT)?.[1], name, `${name} ${agent} runs its own folder's script`);
      }
    }
  }
});

test('a missing, changed, doubled, or unlisted hook is a problem', () => {
  const group = { hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/skills/daily/scripts/a.mjs"' }] };
  const modules = { daily: { Stop: [group] } };
  assert.deepEqual(hookProblems({ Stop: [group] }, modules), []);
  assert.deepEqual(hookProblems({}, modules), ['daily Stop group is missing or differs']);
  assert.deepEqual(hookProblems({ Stop: [{ ...group, matcher: 'x' }] }, modules), ['daily Stop group is missing or differs']);
  assert.deepEqual(hookProblems({ Stop: [group, group] }, modules), ['daily Stop group runs 2 times']);
  const stray = { hooks: [{ type: 'command', command: 'node "$CLAUDE_PROJECT_DIR/.claude/skills/daily/scripts/b.mjs"' }] };
  assert.deepEqual(hookProblems({ Stop: [group], Notification: [stray] }, modules),
    [`Notification runs daily's script, which no module lists: ${stray.hooks[0].command}`]);
});
