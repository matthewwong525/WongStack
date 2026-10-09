#!/usr/bin/env node
// Build a portable review page: parse proposal.md into static, escaped HTML inside the shared kit.
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';

const FORMAT = '<!-- wong-review:3 -->';
const SLOT = '<!-- review:content -->';
const start = '<!-- proposal:start -->';
const end = '<!-- proposal:end -->';
const WIDE = 60;
const TECHNICAL = 12;
const USAGE = `usage: build-review.mjs <change-root> [--require-current] [--link]
  --link  print the page's reply link, whose buttons send notes to this chat or ask it to build; the file where none can open`;
const kitPath = resolve(dirname(fileURLToPath(import.meta.url)), '../references/review-kit.html');

const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const scheduledGoal = root => {
  try { return /^schema:[ \t]*(?:scheduled-work|'scheduled-work'|"scheduled-work")[ \t]*(?:#.*)?$/m.test(readFileSync(join(root, '.openspec.yaml'), 'utf8')); } catch { return false; }
};
const safeHref = href => !/^[a-z][\w+.-]*:/i.test(href) || /^(?:https?|mailto):/i.test(href);

function one(text, marker, name) {
  if (text.split(marker).length !== 2) throw new Error(`${name}: expected one ${marker}`);
}

// Markdown inline: code spans first, so bold, italics, and links never reach inside them.
function inline(md) {
  const codes = [];
  const html = esc(md).replace(/`([^`]+)`/g, (m, code) => `\uE000${codes.push(code) - 1}\uE000`)
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => (safeHref(href) ? `<a href="${href}">${text}</a>` : text))
    .replace(/\*\*(?=\S)(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^\w*])\*(?=\S)([^*]*?\S)\*(?!\w)/g, '$1<i>$2</i>');
  return html.replace(/\uE000(\d+)\uE000/g, (m, i) => `<code>${codes[i]}</code>`);
}

// Level-2 sections, fence-aware. HTML comments are blanked in place so line numbers hold.
function sections(markdown) {
  const lines = markdown.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, '')).split('\n');
  const found = {};
  let current = null, fenced = false;
  lines.forEach((line, i) => {
    if (/^\s*`{3,}/.test(line)) fenced = !fenced;
    const heading = !fenced && /^## +(.+?)\s*$/.exec(line);
    if (heading) current = found[heading[1].toLowerCase()] = { title: heading[1], at: i + 1, lines: [] };
    else if (current) current.lines.push(line);
  });
  return found;
}

// A bullet runs to the next bullet or a blank line outside a fence; a fence inside a bullet is its drawing.
function blocks(section, noun) {
  const out = [];
  let item = null, para = null, fence = null, count = 0;
  section.lines.forEach((line, i) => {
    const at = section.at + i + 1;
    if (fence) {
      if (/^\s*`{3,}\s*$/.test(line)) fence = null;
      else fence.lines.push(line.replace(fence.indent, ''));
      return;
    }
    const open = /^(\s*)`{3,}\s*[\w-]*\s*$/.exec(line);
    if (open) {
      if (!item) throw new Error(`proposal.md line ${at}: a fence outside any bullet in ## ${section.title} (a blank line ends a bullet)`);
      fence = { at, indent: new RegExp(`^ {0,${open[1].length}}`), lines: [] };
      item.drawings.push(fence);
      return;
    }
    const bullet = /^(?:[-*+]|\d+[.)])\s+(.*)$/.exec(line);
    if (bullet) { para = null; out.push(item = { n: ++count, text: [bullet[1]], drawings: [] }); }
    else if (!line.trim()) item = para = null;
    else if (item) item.text.push(line.trim());
    else if (para) para.text.push(line.trim());
    else out.push(para = { text: [line.trim()] });
  });
  if (fence) throw new Error(`proposal.md line ${fence.at}: ${noun} ${item.n} opens a fence that never closes`);
  return out.map(block => ({ ...block, text: block.text.join(' ') }));
}

// A box's right edge must sit under its ┐. Walk down from each ┐: │ ┤ ┼ continue the box and ┘ closes it.
// A │ or ┘ within two columns means a miscounted line; anything else means the ┐ was no box's corner, as in ┌──┴──┐.
// + and | are skipped: they show up in ordinary text.
function crooked(rows) {
  const found = [];
  rows.forEach((row, top) => row.forEach((char, corner) => {
    if (char !== '┐') return;
    for (let i = top + 1; i < rows.length; i++) {
      const here = rows[i][corner];
      if (here === '┘') return;
      if (here === '│' || here === '┤' || here === '┼') continue;
      const edge = [corner - 1, corner + 1, corner - 2, corner + 2].find(c => rows[i][c] === '│' || rows[i][c] === '┘');
      if (edge !== undefined) found.push([i, edge, corner]);
      return;
    }
  }));
  return found;
}

function drawing(item, fence, first, warnings) {
  const wide = fence.lines.map((line, i) => [i, [...line.trimEnd()].length]).filter(([, width]) => width > WIDE);
  if (wide.length) {
    const [i, width] = wide[0], more = wide.length > 1 ? ` (and ${wide.length - 1} more over ${WIDE})` : '';
    warnings.push(`proposal.md line ${fence.at + i + 1}: item ${item.n}, drawing line ${i + 1} is ${width} columns${more}; keep drawings under ${WIDE}: aim for 40, up to 56 side by side`);
  }
  for (const [i, edge, corner] of crooked(fence.lines.map(line => [...line]))) {
    warnings.push(`proposal.md line ${fence.at + i + 1}: item ${item.n}, drawing line ${i + 1} has a box edge at column ${edge + 1}, but its corner is at column ${corner + 1}`);
  }
  const lines = fence.lines.map((line, i) => (line.trim()
    ? `<span class="ln" data-note="item-${item.n}-line-${first + i}" tabindex="0">${esc(line)}</span>` : esc(line)));
  return '<details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary>'
    + `<div class="frame"><pre class="art">\n${lines.join('\n')}</pre></div></details>`;
}

function changes(section, warnings) {
  let html = '', open = false;
  for (const block of blocks(section, 'item')) {
    if (!block.n) { html += `${open ? '</ol>\n' : ''}<p class="aside">${inline(block.text)}</p>\n`; open = false; continue; }
    let first = 1;
    const art = block.drawings.map(fence => { const out = drawing(block, fence, first, warnings); first += fence.lines.length; return out; });
    const text = block.text.replace(/\s*\(review\.html#\/[^)]*\)\s*$/, '');
    html += `${open ? '' : '<ol class="items">\n'}<li class="item card" id="item-${block.n}"><span class="num">${block.n}</span><div class="body">`
      + `<div class="text" data-note="item-${block.n}" tabindex="0">${inline(text)}</div></div>${art.join('')}</li>\n`;
    open = true;
  }
  return html + (open ? '</ol>' : '');
}

function decisions(section) {
  const items = section ? blocks(section, 'decision').filter(block => block.n) : [];
  if (!items.length) return '<p class="card">No decision is recorded yet.</p>';
  return `<ol class="decisions">\n${items.map(block => {
    const dated = /^\*\*(\d{4}-\d{2}-\d{2})\*\*\s*[—–-]+\s*/.exec(block.text);
    const text = dated ? block.text.slice(dated[0].length) : block.text;
    const label = /^Asked\b/.test(text) ? 'asked' : /^Assumed\b/.test(text) ? 'assumed' : text.startsWith('Check:') ? 'check' : 'log';
    return `<li class="decision card" id="decision-${block.n}" data-note="decision-${block.n}" tabindex="0">`
      + `<p class="meta"><span class="tag ${label}">${label}</span>${dated ? dated[1] : ''}</p>${inline(text)}</li>`;
  }).join('\n')}\n</ol>`;
}

// Code spans in Why and What Changes prose, drawings excluded: a summary full of file names reads as a diff.
function technical(sectionsFound, warnings) {
  const spans = ['why', 'what changes'].flatMap(name => blocks(sectionsFound[name], 'item'))
    .reduce((total, block) => total + (block.text.match(/`[^`]+`/g) || []).length, 0);
  if (spans > TECHNICAL) warnings.push(`Why and What Changes name ${spans} files or commands; move them to the design and tasks`);
}

function render(markdown, warnings) {
  const found = sections(markdown);
  if (!found.why) throw new Error('proposal.md: missing ## Why');
  if (!found['what changes']) throw new Error('proposal.md: missing ## What Changes');
  technical(found, warnings);
  const why = blocks(found.why, 'paragraph').map((block, i) => {
    if (block.drawings && block.drawings.length) throw new Error('proposal.md: a drawing in ## Why; put drawings in What Changes bullets');
    return `<p data-note="why-${i + 1}" tabindex="0">${inline(block.text)}</p>`;
  });
  return `<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>\n<div class="card">\n${why.join('\n')}\n</div></section>\n`
    + `<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>\n${changes(found['what changes'], warnings)}\n</section>\n`
    + `<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>\n${decisions(found['decision log'])}\n</section>`;
}

function renderGoal(markdown, root) {
  const found = sections(markdown);
  const headings = ['goal', 'instructions', 'completion source', 'authority', 'timing', 'questions and cancellation'];
  for (const name of headings) if (!found[name]) throw new Error(`proposal.md: missing ## ${name}`);
  const paragraphs = section => blocks(section, 'paragraph').map((block, i) => `<p data-note="goal-${section.at}-${i + 1}" tabindex="0">${inline(block.text)}</p>`).join('\n');
  const binding = JSON.parse(readFileSync(join(root, 'binding.json'), 'utf8'));
  const destination = `<p class="card">Execution destination: ${esc(binding.execution?.host ?? 'unavailable')}. Live timing is read from that host.</p>`;
  const limits = headings.slice(1).map(name => `<h3>${esc(found[name].title)}</h3><div class="card">${paragraphs(found[name])}</div>`).join('\n');
  return `<section id="why"><h2>Goal</h2><div class="card">${paragraphs(found.goal)}</div>${destination}</section>`
    + `<section id="changes"><h2>Instructions and limits</h2>${limits}</section>`
    + `<section id="decisions"><h2>Published goal checklist</h2><pre class="card">${esc(readFileSync(join(root, 'tasks.md'), 'utf8'))}</pre><h2>Decisions</h2>${decisions(found['decision log'])}</section>`;
}

// Older pages (wong-review:2 and before) keep their viewer; only the proposal block between their markers is refreshed.
function legacySection(markdown, title) {
  const lines = markdown.split('\n');
  const at = lines.findIndex(line => line.trim() === `## ${title}`);
  if (at < 0) throw new Error(`proposal.md: missing ## ${title}`);
  const after = lines.findIndex((line, i) => i > at && line.startsWith('## '));
  return lines.slice(at, after < 0 ? undefined : after).join('\n').trimEnd();
}

function legacyRefresh(markup, markdown) {
  one(markup, start, 'review.html (older format)');
  one(markup, end, 'review.html (older format)');
  const a = markup.indexOf(start) + start.length;
  const b = markup.indexOf(end);
  if (b < a) throw new Error('review.html: reversed proposal markers');
  const text = [legacySection(markdown, 'Why'), legacySection(markdown, 'What Changes')].join('\n\n').replace(/<\s*\/\s*script/gi, '<\\/script');
  return markup.slice(0, a) + '\n' + text + '\n' + markup.slice(b);
}

function assemble(name, content) {
  const kit = readFileSync(kitPath, 'utf8');
  one(kit, SLOT, 'review kit');
  if (!kit.includes('CHANGE-NAME')) throw new Error('review kit: missing CHANGE-NAME');
  if ((kit.match(/<script\b/g) || []).length !== 1 || (kit.match(/<style\b/g) || []).length !== 1) {
    throw new Error('review kit: expected one <script> and one <style>');
  }
  const [before, after] = kit.split(SLOT);
  return `${FORMAT}\n${before.split('CHANGE-NAME').join(esc(name))}${content}${after.split('CHANGE-NAME').join(esc(name))}`;
}

function writeIfDifferent(path, next) {
  if (existsSync(path) && readFileSync(path, 'utf8') === next) return false;
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try { writeFileSync(tmp, next); renameSync(tmp, path); }
  finally { if (existsSync(tmp)) rmSync(tmp); }
  return true;
}

// The line under the link on the *Review the plan* reply only; the rule, not the builder, decides when to copy it.
export const NEXT_STEP = "When you're ready, type `/apply` to build it.";

// The chat line an agent copies as printed: a path with a space or parenthesis goes in <…> so the Markdown link still parses.
export function planLink(page) {
  return `Click here to see the plan: [review.html](${/[\s()]/.test(page) ? `<${page}>` : page})`;
}

// The fixed first line of sent and copied notes; the kit writes the same words.
export const notesHeader = name => `Notes on the plan ${name} from the review page. Don't build yet.`;

// What each button on a live page tells the chat: the person's choice at the finished-plan question.
export const planActions = name => ({
  build: `Build it now: run /apply for the plan ${name}. Chosen on its review page.`,
  publish: `Build and publish: run /ship for the plan ${name}. Chosen on its review page.`,
});

// The page's reply link when one can open, else its file.
async function linked(page, name, goal = false) {
  const { openReplyLink } = await import('../../hand-over/scripts/reply-link.mjs');
  return (await openReplyLink({ file: page, header: notesHeader(name), ...(goal ? {} : { actions: planActions(name) }) })) ?? page;
}

export function buildReview(changeRoot, { requireCurrent = false } = {}) {
  const proposalPath = join(changeRoot, 'proposal.md');
  const reviewPath = join(changeRoot, 'review.html');
  if (!existsSync(proposalPath)) throw new Error(`missing ${proposalPath}`);
  const markdown = readFileSync(proposalPath, 'utf8');
  const goal = scheduledGoal(changeRoot);
  const page = existsSync(reviewPath) ? readFileSync(reviewPath, 'utf8') : null;
  if (page === null && !requireCurrent && !goal) return { kind: 'no-page', changed: false, warnings: [] };
  if (page !== null && !page.startsWith(FORMAT) && !goal) {
    return { kind: 'proposal-only', changed: writeIfDifferent(reviewPath, legacyRefresh(page, markdown)), warnings: [] };
  }
  const warnings = [];
  let next = assemble(basename(resolve(changeRoot)), goal ? renderGoal(markdown, changeRoot) : render(markdown, warnings));
  if (goal) next = next.replace('href="#why">Why', 'href="#why">Goal').replace('href="#changes">Changes', 'href="#changes">Instructions');
  return { kind: 'current', changed: writeIfDifferent(reviewPath, next), warnings };
}

if (isMain(import.meta.url)) {
  let args;
  try {
    args = parseArgs({ options: { 'require-current': { type: 'boolean' }, link: { type: 'boolean' }, help: { type: 'boolean' } }, allowPositionals: true, strict: true });
  } catch (error) { console.error(`${error.message}\n${USAGE}`); process.exit(2); }
  const [root, ...extra] = args.positionals;
  if (args.values.help) console.log(USAGE);
  else if (!root || extra.length) { console.error(USAGE); process.exitCode = 2; }
  else {
    try {
      const result = buildReview(root, { requireCurrent: args.values['require-current'] === true });
      for (const warning of result.warnings) console.error(`review: warning: ${warning}`);
      console.log(`review: ${result.kind}, ${result.changed ? 'updated' : 'unchanged'}`);
      const page = resolve(root, 'review.html');
      const live = args.values.link && result.kind === 'current';
      if (result.kind !== 'no-page') console.log(`${planLink(live ? await linked(page, basename(resolve(root)), scheduledGoal(root)) : page)}\n\n${scheduledGoal(root) ? 'Use `/schedule` to confirm this record and its execution destination.' : NEXT_STEP}`);
    } catch (error) { console.error(`review: ${error.message}`); process.exitCode = 1; }
  }
}
