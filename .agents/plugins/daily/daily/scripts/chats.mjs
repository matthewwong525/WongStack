// The step words a chat's name starts with, and the Paseo label on a chat a schedule's run opened.
// wiki/development/daily.md
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { moduleRepo } from './lib/slot.mjs';

/** The loop's step words; a host name `<STEP>: <task>` starts with one. */
export const STEPS = ['EXPLORE', 'PLAN', 'APPLY', 'SHIP', 'DONE'];
/** A typed loop verb's step; null waits for its skill's `set`, because it can plan or build first. */
export const LOOP_STEPS = { explore: 'EXPLORE', plan: 'PLAN', 'improve-code': 'PLAN', apply: null, continue: null, ship: null };
/** Another typed repo skill's step: its name in capitals minus `wong-`. */
export const skillStep = name => name.replace(/^wong-/, '').toUpperCase();

/** Every step word a host name can start with: the loop's and each other skill in the repo's `.claude/skills`. */
export function stepWords(skills = join(moduleRepo(), '.claude', 'skills')) {
  let names = [];
  try {
    names = readdirSync(skills).filter(name => !(name in LOOP_STEPS) && existsSync(join(skills, name, 'SKILL.md')));
  } catch { /* none */ }
  return [...new Set([...STEPS, ...names.map(skillStep)])];
}
let leading = null;
const leadingStep = () => (leading ??= new RegExp(`^(${stepWords().join('|')}):\\s*`));
/** A host name minus a leading step word. */
export const withoutStep = name => String(name ?? '').replace(leadingStep(), '').trim();
/** A host name's step word, or null. */
export const stepOf = name => leadingStep().exec(String(name ?? '').trim())?.[1] ?? null;

/** The Paseo label on a chat a schedule's run opened. */
export const SCHEDULE_LABEL = 'wong-schedule';
