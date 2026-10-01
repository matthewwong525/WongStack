#!/usr/bin/env node
// Do the wiki's links hold? One run on every push, docs-only included, in every repo.
//
// A wiki page nothing links to is lost: no reader drills down to it. A link to a
// page that moved or went away is a dead end. A hub (a folder's README.md) that
// skips a page beside it breaks the tree. wiki/wiki-style.md owns the rules; the
// memory skill's lib/links.mjs owns how a link is read, so `memory.mjs areas`
// and this check never disagree.
//
// Prints one line per problem and exits 1, or one summary line and exits 0.
// A repo with no wiki/ passes. Needs only the runner's Node.
//
// Usage: node .github/scripts/wiki-links.mjs [repo root]

import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkWiki, wikiPages } from '../../.agents/skills/memory/scripts/lib/links.mjs';

const root = resolve(process.argv[2] ?? fileURLToPath(new URL('../..', import.meta.url)));
const problems = checkWiki(root);
if (problems.length) {
  console.log(`### Wiki links\n\nFix each, then publish again:\n\n${problems.map(problem => `- ${problem}`).join('\n')}`);
  process.exit(1);
}
console.log(`Wiki links: ${wikiPages(root).length} pages, all linked.`);
