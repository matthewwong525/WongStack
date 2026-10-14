#!/usr/bin/env node
// Does the wiki hold? One run on every push, docs-only included, in every repo; a repo with no wiki/ passes.
// wiki/wiki-style.md owns the rules; the memory skill's lib/links.mjs reads links, as `memory.mjs areas` does.

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkWiki, WIKI_PAGE_WORDS, wikiPages } from '../../.agents/skills/memory/scripts/lib/links.mjs';

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../..', import.meta.url)));
const problems = checkWiki(root);
if (problems.length) {
  console.log(`### Wiki checks\n\nFix each, then publish again:\n\n${problems.map(problem => `- ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log(`Wiki: ${wikiPages(root).length} pages, all linked, each under ${WIKI_PAGE_WORDS.toLocaleString('en-US')} words.`);
