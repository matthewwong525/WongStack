// Where a payload file lands in an install, .agents/skills/wong-sync/scripts/install-path.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';

import { installPath, installText, mappedDirs } from '../../.agents/skills/wong-sync/scripts/install-path.mjs';

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
  assert.equal(installText('.claude/skills/continue/SKILL.md', '[m](../../plugins/memory/SKILL.md)', mapped), '[m](../memory/SKILL.md)');
});

test('a module page keeps its links inside the module, and moves a link out of it', () => {
  const page = '[facts](references/writing-facts.md) [sync](../../skills/wong-sync/SKILL.md)';
  assert.equal(installText('.claude/plugins/memory/SKILL.md', page, mapped), '[facts](references/writing-facts.md) [sync](../wong-sync/SKILL.md)');
  assert.equal(installText('.claude/plugins/memory/scripts/x.mjs', page, mapped), page);
  assert.equal(installText('wiki/page.md', page, []), page);
});
