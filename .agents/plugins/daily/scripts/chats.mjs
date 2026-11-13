// The step mark a chat's name starts with, and the Paseo label on a chat a schedule's run opened.
// wiki/development/daily.md
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { moduleRepo } from './lib/slot.mjs';

/** Each loop step's mark; a host name `<mark> <task>` starts with one. The step words stay inside: skills and state. */
export const STEP_MARKS = { EXPLORE: '🔍', PLAN: '📝', APPLY: '🔨', SHIP: '🚀', DONE: '✅' };
export const STEPS = Object.keys(STEP_MARKS);
/** A typed loop verb's step; null waits for its skill's `set`, because it can plan or build first. */
export const LOOP_STEPS = { explore: 'EXPLORE', plan: 'PLAN', 'improve-code': 'PLAN', apply: null, continue: null, ship: null };
/** A host's name for a step and its task words; a step with no mark, such as an old `VERIFY`, shows the task. */
export const stepName = (step, task) => (STEP_MARKS[step] ? `${STEP_MARKS[step]} ${task}` : task);
/** An old name's skill word: its name in capitals minus `wong-`, as `VERIFY: x` was written before the marks. */
export const skillStep = name => name.replace(/^wong-/, '').toUpperCase();

/** Every old step word a host name can start with: the loop's and each other skill in the repo's `.claude/skills`,
 *  with each module's nested command in its `skills/`, such as Daily's `schedule`. */
export function stepWords(skills = join(moduleRepo(), '.claude', 'skills')) {
  const list = dir => { try { return readdirSync(dir).filter(name => existsSync(join(dir, name, 'SKILL.md'))); } catch { return []; } };
  const names = list(skills).filter(name => !(name in LOOP_STEPS))
    .flatMap(name => [name, ...list(join(skills, name, 'skills'))]);
  return [...new Set([...STEPS, ...names.map(skillStep)])];
}
let leading = null;
// A mark and a space, or the old `<WORD>: `; an optional U+FE0F, as some hosts add it to ✅.
const leadingStep = () => (leading ??=
  new RegExp(`^(?:(${Object.values(STEP_MARKS).join('|')})\\uFE0F?\\s+|(${stepWords().join('|')}):\\s*)`, 'u'));
const markStep = Object.fromEntries(Object.entries(STEP_MARKS).map(([step, mark]) => [mark, step]));
/** A host name minus a leading step mark or old step word. */
export const withoutStep = name => String(name ?? '').replace(leadingStep(), '').trim();
/** A host name's step word, from its mark or old word, or null. */
export function stepOf(name) {
  const [, mark, word] = leadingStep().exec(String(name ?? '').trim()) ?? [];
  return markStep[mark] ?? word ?? null;
}

/** The Paseo label on a chat a schedule's run opened. */
export const SCHEDULE_LABEL = 'wong-schedule';
