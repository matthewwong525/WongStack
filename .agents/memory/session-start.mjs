// WongStack's part of each session start: the teammate copy, the tidy-up, company knowledge, and the sign-in lines.
// Daily starts its own worker from its hooks. The profile's `sessionStart`; it returns lines and never throws.
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { detached } from '../skills/memory/scripts/lib/store.mjs';
import { loadConfig, memoryOrigin, signIn, signInHelp } from './d1/connect.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const TIDY = join(HERE, '../skills/schedule/scripts/tidy.mjs');
// Moves a clean teammate's copy forward in the background: wiki/stack/employee-project.md#update-the-copy
const UPDATE = join(HERE, '../loop/routes/update-copy.mjs');
const KNOWLEDGE = join(HERE, 'knowledge.mjs');
// The last tidy-up's one line, read and cleared in-process, then the next tidy-up, detached; WONG_TIDY=0
// skips starting it. The tidy-up runs at most every 6 hours on its own.
async function tidyUp(ctx) {
  if (!existsSync(TIDY)) return '';
  let line = '';
  try { line = (await import(pathToFileURL(TIDY).href)).takeReport(ctx.commonDir); } catch { /* no line */ }
  // A tidy-up that does not start is tried again next session.
  if (process.env.WONG_TIDY !== '0') detached(TIDY, ['sweep'], { cwd: ctx.root });
  return line;
}

// A sign-in that ends soon (a 30-day sign-in can not renew on its own), and a branch that records another memory
// address than the main checkout, which memory ignores.
function configLines(ctx) {
  try {
    const config = loadConfig(ctx), origin = memoryOrigin(config), person = origin && signIn(origin);
    return [person?.state === 'near' && `Memory: your company sign-in ends in ${person.days} day${person.days === 1 ? '' : 's'}; ${signInHelp(origin)}.`,
      config.branchWorker && `Memory: this branch names another memory address (${config.branchWorker}); memory uses the main checkout's.`];
  } catch { return []; }
}

// Company knowledge: link this workspace to the computer's copy, update it in the background, and name pages left
// unsaved or a lost history. wiki/stack/company-knowledge.md
async function knowledgeLine(ctx) {
  try {
    const { linkCopy, place, unsaved } = await import(pathToFileURL(KNOWLEDGE).href);
    const k = place(ctx.root);
    const copy = existsSync(join(k.copy, '.git'));
    if (!copy && !k.address) return '';
    if (copy) linkCopy(k);
    if (process.env.WONG_KNOWLEDGE_UPDATE !== '0') detached(KNOWLEDGE, ['update'], { cwd: ctx.root });
    if (!copy) return '';
    const pages = unsaved(k);
    if (existsSync(join(k.copy, '.git', 'wong-knowledge-rewritten'))) return 'Knowledge: the published history lost saves this computer holds; `knowledge.mjs restore` puts them back.';
    return pages.length ? `Knowledge: ${pages.length} page${pages.length === 1 ? '' : 's'} with edits not saved yet: ${pages.slice(0, 5).map(page => `knowledge/${page}`).join(', ')}.` : '';
  } catch { return ''; }
}

/** The lines WongStack adds before the digest, in order; the slow parts run while the digest loads. */
export async function sessionStart(ctx) {
  await import(pathToFileURL(UPDATE).href).then(module => module.updateCopy(ctx.root), () => {});
  const [tidied, known] = await Promise.all([tidyUp(ctx), knowledgeLine(ctx)]);
  const [signInLine, branchLine] = configLines(ctx);
  return [signInLine, tidied, known, branchLine].filter(Boolean);
}
