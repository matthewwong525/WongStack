#!/usr/bin/env node
// SessionStart hook. When the repo has not named its slots yet, it has the AI ask once whether to set Access up.
// It starts nothing, stays quiet on a resumed chat, and never fails the chat. references/setup.md
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export const SLOTS_FILE = '.agents/access/slots.json';
const GUIDE = 'https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/access/references/setup.md';
export const ASK = `Access is not set up in this repo. Ask the person "Access isn't set up yet. Set it up now?" Only on a yes, follow ${GUIDE}.`;

/** The repo root: the nearest folder up from `start` that holds `.git`, or `start` itself. */
export function repoRoot(start) {
  for (let dir = resolve(start); ; dir = dirname(dir)) {
    if (existsSync(join(dir, '.git'))) return dir;
    if (dirname(dir) === dir) return resolve(start);
  }
}

/** The line to print, or '' when the slots file is there or the chat is resumed. */
export function startLine({ cwd = process.cwd(), source } = {}) {
  if (source && source !== 'startup') return '';
  return existsSync(join(repoRoot(cwd), SLOTS_FILE)) ? '' : `${ASK}\n`;
}

function main() {
  let input = {};
  try { input = JSON.parse(readFileSync(0, 'utf8') || '{}'); } catch { /* no input */ }
  return startLine({ cwd: input.cwd || process.cwd(), source: input.source });
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let out = '';
  try { out = main(); } catch { /* a failure never stops the chat */ }
  process.stdout.write(out, () => process.exit(0));
}
