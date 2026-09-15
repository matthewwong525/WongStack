#!/usr/bin/env node
// Splice a change's Why + What Changes into its review.html.
//
// Usage: node sync-review-proposal.mjs <change-root>
//
// The review page shows the proposal beside the visuals. proposal.md is the
// source of truth and it keeps changing while the change is implemented, so
// the page is a mirror that /save regenerates on every checkpoint — the same
// rule the PR body follows. Nothing here is a judgment call, which is why it
// is a script and not a step that asks a model to copy text.
//
// Owner: .claude/skills/save/SKILL.md (Step 4). No dependencies; exit 0 on
// every ordinary "nothing to do" so a checkpoint is never gated on it.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const START = '<!-- proposal:start -->';
const END = '<!-- proposal:end -->';
const SECTIONS = ['Why', 'What Changes'];

const root = process.argv[2];
if (!root) {
  console.error('usage: sync-review-proposal.mjs <change-root>');
  process.exit(2);
}

const proposalPath = join(root, 'proposal.md');
const reviewPath = join(root, 'review.html');

if (!existsSync(reviewPath)) {
  console.log(`review-sync: no review.html in ${root} — nothing to sync`);
  process.exit(0);
}
if (!existsSync(proposalPath)) {
  console.log(`review-sync: no proposal.md in ${root} — left review.html unchanged`);
  process.exit(0);
}

// Take each section from its "## <name>" heading up to the next "## " heading.
function section(markdown, name) {
  const lines = markdown.split('\n');
  const start = lines.findIndex((l) => l.trim() === `## ${name}`);
  if (start === -1) return null;
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i].startsWith('## ')) { end = i; break; }
  }
  return lines.slice(start, end).join('\n').replace(/\s+$/, '');
}

const proposal = readFileSync(proposalPath, 'utf8');
const blocks = SECTIONS.map((name) => section(proposal, name)).filter(Boolean);

if (!blocks.length) {
  console.log(`review-sync: proposal.md has no ${SECTIONS.join(' or ')} section — left review.html unchanged`);
  process.exit(0);
}

const review = readFileSync(reviewPath, 'utf8');
const from = review.indexOf(START);
const to = review.indexOf(END);

if (from === -1 || to === -1 || to < from) {
  console.log(`review-sync: ${reviewPath} has no proposal:start/proposal:end markers — left unchanged`);
  process.exit(0);
}

const next =
  review.slice(0, from + START.length) +
  '\n' + blocks.join('\n\n') + '\n' +
  review.slice(to);

if (next === review) {
  console.log('review-sync: review.html already matches proposal.md');
  process.exit(0);
}

writeFileSync(reviewPath, next);
console.log(`review-sync: spliced ${blocks.length} section(s) into ${reviewPath}`);
