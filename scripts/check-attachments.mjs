#!/usr/bin/env node
// Release check: each attachment in site/attachments/ names the WongStack files it is written from. A change that
// edits one of those files must touch the attachment too. Owner: wiki/maintaining/attachments.md
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_URL, parseAttachment } from '../site/attachments/parse.mjs';
import { isMain, parseCli } from './lib-cli.mjs';

const USAGE = `usage: node scripts/check-attachments.mjs  (run from the repo root)

Check every site/attachments/<slug>.md: its fields, its bullets, its last bullet's link to the repository, and that
a change to one of its sources also changes it. Changed files are this branch's commits since origin/main, plus
uncommitted work here. With no origin/main, only the shape is checked.`;

const DIR = 'site/attachments';
const PAGE = 'wiki/maintaining/attachments.md';
const FIELDS = ['title', 'problem', 'fix', 'checked'];

const git = (root, args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
const lines = text => text.split('\n').filter(Boolean);

/** Every file this branch changes against origin/main, committed or not; null with no base to compare. */
export function changedFiles(root) {
  const base = git(root, ['merge-base', 'origin/main', 'HEAD']);
  if (base.status !== 0) return null;
  const committed = git(root, ['diff', '--name-only', '--no-renames', base.stdout.trim(), 'HEAD']).stdout;
  const uncommitted = git(root, ['diff', '--name-only', '--no-renames', 'HEAD']).stdout;
  const untracked = git(root, ['ls-files', '--others', '--exclude-standard']).stdout;
  return new Set([committed, uncommitted, untracked].flatMap(lines));
}

/** What is wrong with the shape of one parsed attachment: its fields and its body. */
export function shapeProblems(attachment) {
  const problems = FIELDS.filter(field => !attachment[field]).map(field => `\`${field}:\` is missing`);
  if (!Number.isFinite(attachment.order)) problems.push('`order:` is missing or not a number');
  if (!attachment.sources?.length) problems.push('`sources:` lists no file');
  const [opener, gap, ...bullets] = attachment.body.split('\n');
  if (!opener || opener.startsWith('>') || gap !== '' || !bullets.length) {
    problems.push('the body is not one opening line, an empty line, then the bullets');
  }
  bullets.forEach((line, index) => {
    if (!line.startsWith('> ')) problems.push(`body line ${index + 3} does not start with \`> \``);
  });
  if (!bullets.at(-1)?.includes(REPO_URL)) problems.push(`the last bullet does not link ${REPO_URL}`);
  return problems;
}

/** Every failure line for the attachments under `root`, each naming the file and the fix. */
export function checkAttachments(root, changed) {
  const dir = join(root, DIR);
  const files = existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.md')).sort() : [];
  const failures = [];
  for (const name of files) {
    const path = `${DIR}/${name}`;
    const attachment = parseAttachment(readFileSync(join(root, path), 'utf8'));
    for (const problem of shapeProblems(attachment)) failures.push(`${path}: ${problem}. Fix it by ${PAGE}.`);
    for (const source of attachment.sources ?? []) {
      if (!existsSync(join(root, source))) {
        failures.push(`${path}: source ${source} does not exist. Name the file it moved to, or remove it from \`sources:\`.`);
      } else if (changed?.has(source) && !changed.has(path)) {
        failures.push(`${path}: ${source} changed. Rewrite it by ${PAGE}, or set \`checked:\` to today if the fix is unchanged.`);
      }
    }
  }
  return { files, failures };
}

if (isMain(import.meta.url)) {
  parseCli({ usage: USAGE });
  const root = process.cwd();
  const changed = changedFiles(root);
  const { files, failures } = checkAttachments(root, changed);
  if (failures.length) {
    for (const failure of failures) console.error(failure);
    process.exit(1);
  }
  const scope = changed ? 'match their sources' : 'have their shape (no origin/main to compare)';
  console.log(`attachments: ${files.length} attachment(s) ${scope}`);
}
