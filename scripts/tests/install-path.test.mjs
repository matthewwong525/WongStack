// Where a payload file lands in an install, .agents/skills/wong-sync/scripts/install-path.mjs.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
  const OLD = /^\.claude\/(?:plugins\/(?:browser\/(?:browser|hand-over|shop)|daily\/(?:daily|schedule))|skills\/(?:hand-over|shop|schedule))(?:\/|$)/;
  assert.deepEqual(real.flat().filter(path => OLD.test(path)), [], 'a mapped entry names an old folder');
});
