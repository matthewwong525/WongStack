import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, resolve } from 'node:path';
import { tempDir } from './fixtures/memory/harness.mjs';
const root = resolve(new URL('../..', import.meta.url).pathname);
const read = path => readFileSync(join(root, path), 'utf8');

test('fresh payload carries every helper dependency and memory descriptions stay independent of the app', t => {
  const inventory = JSON.parse(read('.agents/skills/wong-sync/references/payload-files.json'));
  assert.ok(inventory.pack.files.includes('scripts/company-api.mjs')); assert.ok(inventory.core.skillDirs.includes('memory'));
  const target = tempDir(t, 'company-payload-');
  cpSync(join(root, '.agents/skills/memory'), join(target, '.agents/skills/memory'), { recursive: true });
  mkdirSync(join(target, 'scripts'), { recursive: true });
  cpSync(join(root, 'scripts/company-api.mjs'), join(target, 'scripts/company-api.mjs'));
  cpSync(join(root, 'scripts/lib-cli.mjs'), join(target, 'scripts/lib-cli.mjs'));
  // The real layout is shared by both agent aliases in every installed target.
  cpSync(join(target, '.agents'), join(target, '.claude'), { recursive: true });
  assert.equal(existsSync(join(target, 'app')), false); assert.equal(existsSync(join(target, '.env')), false);
  const standalone = execFileSync(process.execPath, [join(target, '.agents/skills/memory/scripts/operations.mjs'), 'describe', 'memory.show'], { cwd: target, encoding: 'utf8' });
  assert.equal(JSON.parse(standalone).operationId, 'memory.show');
  const helper = execFileSync(process.execPath, [join(target, 'scripts/company-api.mjs'), '--help'], { cwd: target, encoding: 'utf8' });
  assert.match(helper, /usage/); assert.doesNotMatch(helper, /saved-business/);
  const agent = read('AGENTS.md'); assert.match(agent, /Company actions and memory reads/); assert.match(agent, /wiki\/stack\/company-api.md/);
  assert.ok(!read('.agents/skills/memory/scripts/session-start.mjs').includes('company-api'));
  assert.ok(!read('.agents/skills/memory/scripts/session-start.mjs').includes('openapi.json'));
  const guide = read('wiki/stack/company-api.md'); assert.match(guide, /list.*scope company/); assert.match(guide, /describe hello.greeting/); assert.match(guide, /call hello.greeting --file -/);
});
