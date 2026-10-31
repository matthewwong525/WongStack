#!/usr/bin/env node
// After a build: one review page with each changed screen live now beside its preview, notes, and Publish.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { buildReview, previewActions, previewNotesHeader } from '../../plan/scripts/build-review.mjs';

const USAGE = `usage: preview-review.mjs <change-name> [--approved "<title>|<approved picture>|<built picture>"]...
         [--pair "<title>|<live picture>|<preview picture>"]... [--note <line>]... [--link]
  Builds .scratch/<change-name>-preview/review.html: each changed screen live now beside its preview.
  A new screen has no live picture: --pair "<title>||<preview picture>".
  --approved  the plan's After picture beside the built screen, labelled Approved and Built; at least one of it or --pair.
  Take each picture at phone width, the visible part only (no --full-page): a page over 500 KB stops.
  --link  print the page's reply link, whose Publish button runs /ship; the file where none can open`;
export const PREVIEW_ON_PAGE = 'Look at the preview, then tap Publish or Send notes on its page.';
export const PREVIEW_IN_CHAT = 'Look at the preview. When you\'re ready, say "publish it", or send notes.';
const fence = '```';

// Each option's two sides: the file name each picture takes, and the label it shows.
const SIDES = {
  approved: { usage: '<title>|<approved picture>|<built picture>', sides: [['approved', 'Approved'], ['built', 'Built']] },
  pair: { usage: '<title>|<live picture>|<preview picture>', sides: [['live', 'Live now'], ['preview', 'Preview']] },
};

/** Writes the preview page's folder under `top`: its pictures, copied in, and a proposal with a bullet per screen. */
export function writePreview(top, change, pairs, notes = [], approved = []) {
  // The page's notes key is `wong-review3:<change>-preview`, at most 100 characters.
  if (!/^[\w-]{1,92}$/.test(change)) throw new Error(`a change name is letters, digits, - and _, up to 92: ${change}`);
  if (!pairs.length && !approved.length) throw new Error('name at least one --pair or --approved');
  const dir = join(top, '.scratch', `${change}-preview`);
  rmSync(join(dir, 'pictures'), { recursive: true, force: true });
  mkdirSync(join(dir, 'pictures'), { recursive: true });
  // The pictures are for one moment: git never takes them, whatever the repo ignores.
  writeFileSync(join(dir, '.gitignore'), '*\n');
  const given = [...approved.map(spec => ['approved', spec]), ...pairs.map(spec => ['pair', spec])];
  const items = given.map(([option, pair], i) => {
    const parts = pair.split('|').map(part => part.trim());
    const [title, before, after] = parts;
    const { usage, sides } = SIDES[option];
    if (parts.length !== 3 || !title || !after) throw new Error(`--${option} takes "${usage}": ${pair}`);
    const copy = (from, side) => {
      const name = `pictures/${i + 1}-${side}${extname(from).toLowerCase().replace(/[^.\w]/g, '')}`;
      try { copyFileSync(resolve(from), join(dir, name)); } catch { throw new Error(`no picture at ${from}`); }
      return name;
    };
    const lines = [before, after].map((from, k) => from && `${sides[k][1]}: ${copy(from, sides[k][0])}`).filter(Boolean);
    return [`- **${title.replace(/\s+/g, ' ')}**`, `  ${fence}picture`, ...lines.map(line => `  ${line}`), `  ${fence}`].join('\n');
  });
  const beside = approved.length ? 'beside what you approved,' : 'live now and in the preview,';
  const why = [`Built: ${change}. Look at each changed screen, ${beside} then publish or send notes.`,
    ...notes.map(note => note.replace(/\s+/g, ' ').trim()).filter(Boolean)];
  writeFileSync(join(dir, 'proposal.md'), `# Preview of ${change}\n\n## Why\n\n${why.join('\n\n')}\n\n## What Changes\n\n${items.join('\n')}\n`);
  return dir;
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true, options: {
    pair: { type: 'string', multiple: true }, approved: { type: 'string', multiple: true }, note: { type: 'string', multiple: true },
    link: { type: 'boolean' } } });
  if (positionals.length !== 1 || !(values.pair || values.approved)) usageError(USAGE);
  const [change] = positionals;
  try {
    let top;
    try { top = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { throw new Error('run it inside the change\'s checkout'); }
    const dir = writePreview(top, change, values.pair ?? [], values.note, values.approved);
    const result = buildReview(dir, { requireCurrent: true, kind: 'preview' });
    for (const warning of result.warnings) console.error(`preview: warning: ${warning}`);
    const page = join(dir, 'review.html');
    let link = page;
    if (values.link) {
      const { openReplyLink } = await import('../../hand-over/scripts/reply-link.mjs');
      link = (await openReplyLink({ file: page, header: previewNotesHeader(change), actions: previewActions(change) })) ?? page;
    }
    // A path with a space or parenthesis goes in <…> so the Markdown link still parses.
    console.log(`Click here to see the preview: [review.html](${/[\s()]/.test(link) ? `<${link}>` : link})\n\n${link === page ? PREVIEW_IN_CHAT : PREVIEW_ON_PAGE}`);
  } catch (error) { console.error(`preview: ${error.message}`); process.exitCode = 1; }
}
