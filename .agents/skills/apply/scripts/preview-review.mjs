#!/usr/bin/env node
// After a build: one review page with each changed screen live now beside its preview, notes, and Publish.
import { execFileSync } from 'node:child_process';
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { extname, join, resolve } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { buildReview, previewActions, previewNotesHeader } from '../../plan/scripts/build-review.mjs';

const USAGE = `usage: preview-review.mjs <change-name> --pair "<title>|<live picture>|<preview picture>"... [--note <line>]... [--link]
  Builds .scratch/<change-name>-preview/review.html: each changed screen live now beside its preview.
  A new screen has no live picture: --pair "<title>||<preview picture>".
  Take each picture at phone width, the visible part only (no --full-page): a page over 500 KB stops.
  --link  print the page's reply link, whose Publish button runs /ship; the file where none can open`;
export const PREVIEW_ON_PAGE = 'Look at the preview, then tap Publish or Send notes on its page.';
export const PREVIEW_IN_CHAT = 'Look at the preview. When you\'re ready, say "publish it", or send notes.';
const fence = '```';

/** Writes the preview page's folder under `top`: its pictures, copied in, and a proposal with a bullet per screen. */
export function writePreview(top, change, pairs, notes = []) {
  // The page's notes key is `wong-review3:<change>-preview`, at most 100 characters.
  if (!/^[\w-]{1,92}$/.test(change)) throw new Error(`a change name is letters, digits, - and _, up to 92: ${change}`);
  if (!pairs.length) throw new Error('name at least one --pair');
  const dir = join(top, '.scratch', `${change}-preview`);
  rmSync(join(dir, 'pictures'), { recursive: true, force: true });
  mkdirSync(join(dir, 'pictures'), { recursive: true });
  // The pictures are for one moment: git never takes them, whatever the repo ignores.
  writeFileSync(join(dir, '.gitignore'), '*\n');
  const items = pairs.map((pair, i) => {
    const parts = pair.split('|').map(part => part.trim());
    const [title, live, preview] = parts;
    if (parts.length !== 3 || !title || !preview) throw new Error(`--pair takes "<title>|<live picture>|<preview picture>": ${pair}`);
    const copy = (from, side) => {
      const name = `pictures/${i + 1}-${side}${extname(from).toLowerCase().replace(/[^.\w]/g, '')}`;
      try { copyFileSync(resolve(from), join(dir, name)); } catch { throw new Error(`no picture at ${from}`); }
      return name;
    };
    const lines = [...(live ? [`Live now: ${copy(live, 'live')}`] : []), `Preview: ${copy(preview, 'preview')}`];
    return [`- **${title.replace(/\s+/g, ' ')}**`, `  ${fence}picture`, ...lines.map(line => `  ${line}`), `  ${fence}`].join('\n');
  });
  const why = [`Built: ${change}. Look at each changed screen, live now and in the preview, then publish or send notes.`,
    ...notes.map(note => note.replace(/\s+/g, ' ').trim()).filter(Boolean)];
  writeFileSync(join(dir, 'proposal.md'), `# Preview of ${change}\n\n## Why\n\n${why.join('\n\n')}\n\n## What Changes\n\n${items.join('\n')}\n`);
  return dir;
}

if (isMain(import.meta.url)) {
  const { values, positionals } = parseCli({ usage: USAGE, allowPositionals: true, options: {
    pair: { type: 'string', multiple: true }, note: { type: 'string', multiple: true }, link: { type: 'boolean' } } });
  if (positionals.length !== 1 || !values.pair) usageError(USAGE);
  const [change] = positionals;
  try {
    let top;
    try { top = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { throw new Error('run it inside the change\'s checkout'); }
    const dir = writePreview(top, change, values.pair, values.note);
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
