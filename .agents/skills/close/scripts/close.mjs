#!/usr/bin/env node
// Closes this chat's workspace: its private link, its knowledge folder, then the workspace itself. Doc: ../SKILL.md
// Exit 7 means wiki pages wait, 8 that the knowledge folder could not be removed yet; other exits are tidy.mjs close's.
import { execFileSync, spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { isMain } from '../../../loop/scripts/lib/cli.mjs';

const KNOWLEDGE = join(import.meta.dirname, '../../../memory/knowledge.mjs');
// `node` by name, as the shell scripts call it, so a test's stand-in node answers too.
const run = (args, options = {}) => spawnSync('node', args, { stdio: 'inherit', ...options }).status ?? 1;

/** Removes this workspace's company folder before the close: unsaved or clashing pages stop it (7) unless discarded;
 * a busy lock or git refusal is 8. A folder that is not the copy's is left alone and the close goes on. */
function removeKnowledge(root, discard) {
  const result = spawnSync('node', [KNOWLEDGE, 'remove', ...(discard ? ['--discard'] : [])], { cwd: root, encoding: 'utf8' });
  const said = result.stdout ?? '';
  if (result.status === 0) return 0;
  process.stdout.write(said);
  if (/^(unsaved|conflict)=/m.test(said)) return 7;
  return /^folder=blocked$/m.test(said) ? 0 : 8;
}

/** Closes the workspace at `root` with `args` for tidy.mjs close, such as `--discard` or `--dry-run`; its exit code. */
export function closeWorkspace(root, args = []) {
  const skills = join(root, '.claude/skills');
  const tidy = join(skills, 'schedule/scripts/tidy.mjs');
  if (!args.includes('--dry-run')) {
    // tidy.mjs's own refusals (the main checkout, no Paseo workspace) come before anything is removed.
    const check = spawnSync('node', [tidy, 'close', ...args, '--dry-run'], { cwd: root, encoding: 'utf8' });
    if (check.status !== 0) { process.stdout.write(check.stdout ?? ''); return check.status ?? 1; }
    const kept = removeKnowledge(root, args.includes('--discard'));
    if (kept) return kept;
  }
  run([join(skills, 'hand-over/scripts/hand-over.mjs'), 'close'], { cwd: root, stdio: 'ignore' });
  return run([tidy, 'close', ...args], { cwd: root });
}

if (isMain(import.meta.url)) {
  if (process.argv.includes('--help')) {
    console.log('usage: close.mjs [--discard] [--dry-run]  close this chat\'s workspace after its knowledge folder');
    process.exit(0);
  }
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  process.exitCode = closeWorkspace(root, process.argv.slice(2));
}
