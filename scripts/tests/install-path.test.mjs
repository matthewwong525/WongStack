// Where an older release's payload file landed in an install, .agents/skills/wong-sync/scripts/install-path.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

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

const daily = [['.claude/plugins/daily', '.claude/skills/daily'], ['.claude/plugins/daily/skills/schedule/SKILL.md', '.claude/skills/schedule/SKILL.md']];

test('a module command\'s SKILL.md lands in its own top-level skill folder; its other files stay in the module', () => {
  assert.equal(installPath('.claude/plugins/daily/skills/schedule/SKILL.md', daily), '.claude/skills/schedule/SKILL.md');
  assert.equal(installPath('.claude/plugins/daily/skills/schedule/scripts/schedule.mjs', daily), '.claude/skills/daily/skills/schedule/scripts/schedule.mjs');
  assert.equal(installPath('.claude/plugins/daily/SKILL.md', daily), '.claude/skills/daily/SKILL.md');
});

test('the moved SKILL.md links back into the module, and its script paths stay the module\'s', () => {
  const page = '# /schedule\n[run](references/run.md) [daily](../../SKILL.md)\nnode .claude/plugins/daily/skills/schedule/scripts/schedule.mjs list';
  assert.equal(installText('.claude/plugins/daily/skills/schedule/SKILL.md', page, daily),
    '# /schedule\n[run](../daily/skills/schedule/references/run.md) [daily](../daily/SKILL.md)\nnode .claude/skills/daily/skills/schedule/scripts/schedule.mjs list');
  assert.equal(installText('.claude/plugins/daily/SKILL.md', '[schedule](./skills/schedule/SKILL.md)', daily), '[schedule](../schedule/SKILL.md)');
});

test('an older release\'s /daily:schedule installs as /schedule in Markdown and a script, and a web address stays', () => {
  assert.equal(installText('wiki/page.md', 'Run `/daily:schedule every day`. See https://example.test/daily:schedule.', daily),
    'Run `/schedule every day`. See https://example.test/daily:schedule.');
  assert.equal(installText('.claude/plugins/daily/scripts/daily.mjs', "const REMIND = 'ask /daily:schedule for one';", daily), "const REMIND = 'ask /schedule for one';");
  assert.equal(installText('wiki/page.md', '/daily:schedule-x and /daily:schedules', daily), '/daily:schedule-x and /daily:schedules');
  assert.equal(installText('wiki/page.md', '`/daily:schedule`', daily.slice(0, 1)), '`/daily:schedule`', 'a module copied alone keeps its name');
});

// The current list maps nothing: each command ships as its own whole folder, so no two shipped skills share a name.
test('the current file list maps no folder, and ships each command as one skill folder', () => {
  const manifest = JSON.parse(readFileSync(new URL(`../../${INVENTORY}`, import.meta.url), 'utf8'));
  assert.deepEqual(mappedDirs(manifest), []);
  const shipped = manifest.core.skillDirs;
  for (const name of ['memory', 'daily', 'schedule', 'access', 'services', 'browser', 'hand-over', 'shop', 'plan', 'save']) {
    assert.ok(shipped.includes(name), name);
    assert.ok(existsSync(new URL(`../../.agents/skills/${name}/SKILL.md`, import.meta.url)), name);
  }
  assert.deepEqual(shipped.filter((name, i) => shipped.indexOf(name) !== i), [], 'two shipped skills share a name');
});
