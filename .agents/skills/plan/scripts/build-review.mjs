#!/usr/bin/env node
// Assemble a portable review page from the shared viewer and change inputs.
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const start = '<!-- proposal:start -->';
const end = '<!-- proposal:end -->';
const slot = '<!-- review:visuals -->';
const format = '<!-- wong-review:2 -->';
const kitPath = resolve(dirname(fileURLToPath(import.meta.url)), '../references/review-kit.html');

function one(text, marker, name) {
  if (text.split(marker).length !== 2) throw new Error(`${name}: expected one ${marker}`);
}

function section(markdown, title) {
  const lines = markdown.split('\n');
  const at = lines.findIndex(line => line.trim() === `## ${title}`);
  if (at < 0) throw new Error(`proposal.md: missing ## ${title}`);
  const after = lines.findIndex((line, i) => i > at && line.startsWith('## '));
  return lines.slice(at, after < 0 ? undefined : after).join('\n').trimEnd();
}

function proposalText(markdown) {
  return [section(markdown, 'Why'), section(markdown, 'What Changes')]
    .join('\n\n').replace(/<\s*\/\s*script/gi, '<\\/script');
}

function splice(markup, value) {
  one(markup, start, 'review');
  one(markup, end, 'review');
  const a = markup.indexOf(start) + start.length;
  const b = markup.indexOf(end);
  if (b < a) throw new Error('review: reversed proposal markers');
  return markup.slice(0, a) + '\n' + value + '\n' + markup.slice(b);
}

function checkFragment(fragment) {
  const banned = /<\s*\/?\s*(?:script|style|link|base|iframe|object|embed|meta|img|svg|video|audio|source|form)\b|\s(?:on[a-z]+|style)\s*=|\b(?:src|srcset)\s*=|url\s*\(|\bhref\s*=\s*['"]?\s*(?:javascript|data):/i;
  const match = fragment.match(banned);
  if (match) throw new Error(`review-visuals.html: forbidden author markup ${match[0].trim()}`);
  if (fragment.includes(slot) || fragment.includes(start) || fragment.includes(end)) {
    throw new Error('review-visuals.html: template marker in author input');
  }
}

function writeIfDifferent(path, next) {
  if (existsSync(path) && readFileSync(path, 'utf8') === next) return false;
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try { writeFileSync(tmp, next); renameSync(tmp, path); }
  finally { if (existsSync(tmp)) rmSync(tmp); }
  return true;
}

export function buildReview(changeRoot, { requireCurrent = false } = {}) {
  const proposalPath = join(changeRoot, 'proposal.md');
  const visualPath = join(changeRoot, 'review-visuals.html');
  const reviewPath = join(changeRoot, 'review.html');
  if (!existsSync(proposalPath)) throw new Error(`missing ${proposalPath}`);
  const proposal = proposalText(readFileSync(proposalPath, 'utf8'));
  if (existsSync(visualPath)) {
    const kit = readFileSync(kitPath, 'utf8');
    const fragment = readFileSync(visualPath, 'utf8');
    one(kit, slot, 'review kit');
    for (const marker of [start, end, 'id="proposal"', 'id="panel"', 'id="_landing"', 'id="_text"']) one(kit, marker, 'review kit');
    if ((kit.match(/<script\b/g) || []).length !== 2 || (kit.match(/<style\b/g) || []).length !== 1) {
      throw new Error('review kit: unexpected script or style structure');
    }
    checkFragment(fragment);
    const name = changeRoot.replace(/\/$/, '').split('/').pop();
    const titled = kit.replaceAll('CHANGE-NAME', name);
    const next = `${format}\n` + splice(titled.replace(slot, fragment.trimEnd()), proposal);
    return { kind: 'current', changed: writeIfDifferent(reviewPath, next) };
  }
  if (requireCurrent || (existsSync(reviewPath) && readFileSync(reviewPath, 'utf8').startsWith(format))) {
    throw new Error(`missing ${visualPath} for a current-format review`);
  }
  if (!existsSync(reviewPath)) return { kind: 'legacy-skip', changed: false };
  const old = readFileSync(reviewPath, 'utf8');
  if (!old.includes(start) || !old.includes(end)) return { kind: 'legacy-skip', changed: false };
  return { kind: 'legacy', changed: writeIfDifferent(reviewPath, splice(old, proposal)) };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = process.argv[2];
  if (!root) { console.error('usage: build-review.mjs <change-root> [--require-current]'); process.exitCode = 2; }
  else {
    try {
      const result = buildReview(root, { requireCurrent: process.argv.includes('--require-current') });
      console.log(`review: ${result.kind}, ${result.changed ? 'updated' : 'unchanged'}`);
    } catch (error) { console.error(`review: ${error.message}`); process.exitCode = 1; }
  }
}
