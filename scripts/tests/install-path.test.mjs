// Where a payload file lands in an install, .agents/skills/wong-sync/scripts/install-path.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

import { INVENTORY, installPath, installText, mappedDirs } from '../../.agents/skills/wong-sync/scripts/install-path.mjs';

const mapped = [['.claude/plugins/memory', '.claude/skills/memory']];

test('the manifest maps a module folder to its install folder, and every other path stays', () => {
  assert.deepEqual(mappedDirs({ core: { mapped: { '.claude/plugins/memory': '.claude/skills/memory' } }, ui: {} }), mapped);
  assert.equal(installPath('.claude/plugins/memory/scripts/memory.mjs', mapped), '.claude/skills/memory/scripts/memory.mjs');
  assert.equal(installPath('.claude/plugins/memory-two/x.md', mapped), '.claude/plugins/memory-two/x.md');
  assert.equal(installPath('wiki/page.md', mapped), 'wiki/page.md');
});

test('a Markdown link into a module folder points at its install path; other links stay as written', () => {
  const page = [
    'See [memory](../../.agents/plugins/memory/SKILL.md#write) and [the web](https://example.test/a.md).',
    '[ref]: ../../.agents/plugins/memory/references/setup.md',
    'Stay [here](#top) and [there](../close/SKILL.md).',
  ].join('\n');
  assert.equal(installText('wiki/development/page.md', page, mapped), [
    'See [memory](../../.agents/skills/memory/SKILL.md#write) and [the web](https://example.test/a.md).',
    '[ref]: ../../.agents/skills/memory/references/setup.md',
    'Stay [here](#top) and [there](../close/SKILL.md).',
  ].join('\n'));
  assert.equal(installText('.claude/skills/close/SKILL.md', '[m](../../plugins/memory/SKILL.md)', mapped), '[m](../memory/SKILL.md)');
});

test('a module page keeps its links inside the module, and moves a link out of it', () => {
  const page = '[facts](references/writing-facts.md) [sync](../../skills/wong-sync/SKILL.md)';
  assert.equal(installText('.claude/plugins/memory/SKILL.md', page, mapped), '[facts](references/writing-facts.md) [sync](../wong-sync/SKILL.md)');
  assert.equal(installText('.claude/plugins/memory/scripts/x.mjs', page, mapped), page);
  assert.equal(installText('wiki/page.md', page, []), page);
});

// The browser and Daily moved from sibling folders into one folder each (2.0.0): each file's new source path lands in
// its module's install folder, and no mapped entry still names an old sibling folder or its install folder.
test('each old browser and Daily file lands in its module\'s one install folder', () => {
  const real = mappedDirs(JSON.parse(readFileSync(new URL(`../../${INVENTORY}`, import.meta.url), 'utf8')));
  const moves = [
    // [old source path, new source path, new install path]
    ['.claude/plugins/browser/browser/SKILL.md', '.claude/plugins/browser/SKILL.md', '.claude/skills/browser/SKILL.md'],
    ['.claude/plugins/browser/browser/scripts/browse.mjs', '.claude/plugins/browser/scripts/browse.mjs', '.claude/skills/browser/scripts/browse.mjs'],
    ['.claude/plugins/browser/hand-over/scripts/keys.mjs', '.claude/plugins/browser/skills/hand-over/scripts/keys.mjs', '.claude/skills/browser/skills/hand-over/scripts/keys.mjs'],
    ['.claude/plugins/browser/shop/references/shopping.md', '.claude/plugins/browser/skills/shop/references/shopping.md', '.claude/skills/browser/skills/shop/references/shopping.md'],
    ['.claude/plugins/daily/daily/scripts/daily.mjs', '.claude/plugins/daily/scripts/daily.mjs', '.claude/skills/daily/scripts/daily.mjs'],
    ['.claude/plugins/daily/daily/hooks/claude.json', '.claude/plugins/daily/hooks/claude.json', '.claude/skills/daily/hooks/claude.json'],
    ['.claude/plugins/daily/schedule/references/run.md', '.claude/plugins/daily/skills/schedule/references/run.md', '.claude/skills/daily/skills/schedule/references/run.md'],
  ];
  for (const [old, now, install] of moves) {
    assert.equal(installPath(now, real), install, old);
    assert.notEqual(installPath(old, real), install, `${old} is no source path now`);
  }
  // A command's SKILL.md alone may land in .claude/skills/<command>/; its folder stays in the module.
  const OLD = /^\.claude\/(?:plugins\/(?:browser\/(?:browser|hand-over|shop)|daily\/(?:daily|schedule))|skills\/(?:hand-over|shop|schedule))(?:\/|$)/;
  assert.deepEqual(real.flat().filter(path => OLD.test(path) && !path.endsWith('/SKILL.md')), [], 'a mapped entry names an old folder');
});

const daily = [['.claude/plugins/daily', '.claude/skills/daily'], ['.claude/plugins/daily/skills/schedule/SKILL.md', '.claude/skills/schedule/SKILL.md']];

test('a module command\'s SKILL.md lands in its own top-level skill folder; its other files stay in the module', () => {
  assert.equal(installPath('.claude/plugins/daily/skills/schedule/SKILL.md', daily), '.claude/skills/schedule/SKILL.md');
  assert.equal(installPath('.claude/plugins/daily/skills/schedule/scripts/schedule.mjs', daily), '.claude/skills/daily/skills/schedule/scripts/schedule.mjs');
  assert.equal(installPath('.claude/plugins/daily/SKILL.md', daily), '.claude/skills/daily/SKILL.md');
});

test('the moved SKILL.md links back into the module, and its script paths stay the module\'s', () => {
  const page = '# /daily:schedule\n[run](references/run.md) [daily](../../SKILL.md)\nnode .claude/plugins/daily/skills/schedule/scripts/schedule.mjs list';
  assert.equal(installText('.claude/plugins/daily/skills/schedule/SKILL.md', page, daily),
    '# /schedule\n[run](../daily/skills/schedule/references/run.md) [daily](../daily/SKILL.md)\nnode .claude/skills/daily/skills/schedule/scripts/schedule.mjs list');
  assert.equal(installText('.claude/plugins/daily/SKILL.md', '[schedule](./skills/schedule/SKILL.md)', daily), '[schedule](../schedule/SKILL.md)');
});

test('an install names the command /schedule in Markdown and a script, and leaves a web address alone', () => {
  assert.equal(installText('wiki/page.md', 'Run `/daily:schedule every day`. See https://example.test/daily:schedule.', daily),
    'Run `/schedule every day`. See https://example.test/daily:schedule.');
  assert.equal(installText('.claude/plugins/daily/scripts/daily.mjs', "const REMIND = 'ask /daily:schedule for one';", daily), "const REMIND = 'ask /schedule for one';");
  assert.equal(installText('wiki/page.md', '/daily:schedule-x and /daily:schedules', daily), '/daily:schedule-x and /daily:schedules');
  assert.equal(installText('wiki/page.md', '`/daily:schedule`', daily.slice(0, 1)), '`/daily:schedule`', 'a module copied alone keeps its name');
});

test('every module command outside the loop has its file entry, and no entry\'s target is another shipped skill', () => {
  const manifest = JSON.parse(readFileSync(new URL(`../../${INVENTORY}`, import.meta.url), 'utf8'));
  const real = mappedDirs(manifest);
  const plugins = new URL('../../.agents/plugins/', import.meta.url);
  const commands = readdirSync(plugins).filter(module => module !== 'loop' && existsSync(new URL(`${module}/skills`, plugins)))
    .flatMap(module => readdirSync(new URL(`${module}/skills`, plugins))
      .filter(command => existsSync(new URL(`${module}/skills/${command}/SKILL.md`, plugins)))
      .map(command => `.claude/plugins/${module}/skills/${command}/SKILL.md`));
  assert.ok(commands.length >= 4);
  for (const command of commands) assert.ok(real.some(([from]) => from === command), `${command} has no mapped file entry`);
  const names = real.map(([, to]) => to.match(/^\.claude\/skills\/([^/]+)/)?.[1]).filter(Boolean);
  const shipped = [...names, ...manifest.core.skillDirs];
  assert.deepEqual(shipped.filter((name, i) => shipped.indexOf(name) !== i), [], 'two shipped skills share a name');
});
