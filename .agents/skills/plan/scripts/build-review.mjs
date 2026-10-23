#!/usr/bin/env node
// Build a portable review page: parse proposal.md into static, escaped HTML inside the shared kit.
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { lookCss } from './look.mjs';

const FORMAT = '<!-- wong-review:3 -->';
const SLOT = '<!-- review:content -->';
const LOOK = '/* look */';
const THEME = '<!-- theme -->';
const start = '<!-- proposal:start -->';
const end = '<!-- proposal:end -->';
const WIDE = 60;
const TECHNICAL = 12;
const PICTURE_WIDE = 640;
const BASE_PX = 13;
const PICTURE_FONT = 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';
const UNSAFE_SVG = ['<script', '<style', '<foreignObject', 'url(', 'href=', 'src='];
// A hand-drawn `svg` fence passes only these, then the builder writes it out again itself.
const SKETCH_TAGS = new Set(['svg', 'g', 'rect', 'circle', 'ellipse', 'line', 'polyline', 'polygon', 'path', 'text', 'tspan', 'title']);
const SKETCH_ATTRS = new Set(['xmlns', 'viewBox', 'width', 'height', 'x', 'y', 'x1', 'y1', 'x2', 'y2', 'cx', 'cy', 'r', 'rx', 'ry', 'dx', 'dy',
  'points', 'd', 'transform', 'fill', 'stroke', 'stroke-width', 'stroke-dasharray', 'stroke-linecap', 'stroke-linejoin', 'opacity',
  'fill-opacity', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline']);
// Kit colour names: the kit paints each class from the look, so the light and dark switch repaints the sketch.
const SKETCH_COLORS = new Set(['bg', 'fg', 'muted', 'subtle', 'line', 'card', 'danger']);
// A `screen` fence passes only these: the look's parts (look.css) and the kit's layout helpers, as inert HTML.
const SCREEN_TAGS = new Set(['div', 'span', 'p', 'h3', 'h4', 'b', 'i', 'small', 'ul', 'ol', 'li', 'hr', 'table', 'thead', 'tbody', 'tr', 'th',
  'td', 'label', 'button', 'input', 'textarea', 'select', 'option']);
const SCREEN_EMPTY = new Set(['hr', 'input']);
const SCREEN_ATTRS = new Set(['class', 'type', 'placeholder', 'value', 'colspan', 'rowspan']);
const SCREEN_FLAGS = new Set(['checked', 'disabled', 'selected']);
const SCREEN_TYPES = new Set(['text', 'checkbox', 'radio']);
const SCREEN_CLASSES = new Set(['card', 'btn', 'btn-primary', 'primary', 'btn-ghost', 'field', 'tag', 'tag-outline', 'skeleton',
  'row', 'col', 'grow', 'gap', 'phone', 'muted', 'danger', 'bar', 'sep']);
const PHONE_WIDE = 360;
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const USAGE = `usage: build-review.mjs <change-root> [--require-current] [--link]
  --link  print the page's reply link, whose buttons send notes to this chat or ask it to build; the file where none can open`;
const kitPath = resolve(dirname(fileURLToPath(import.meta.url)), '../references/review-kit.html');
const themePath = resolve(dirname(fileURLToPath(import.meta.url)), '../references/theme.js');
// Pele draws Mermaid at build time. It loads only for a proposal that holds a Mermaid fence,
// so text-only builds load nothing new.
let pele = null;
const loadPele = () => (pele ??= createRequire(import.meta.url)('../vendor/pele.mjs'));

const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const scheduledGoal = root => {
  try { return /^schema:[ \t]*(?:scheduled-work|'scheduled-work'|"scheduled-work")[ \t]*(?:#.*)?$/m.test(readFileSync(join(root, '.openspec.yaml'), 'utf8')); } catch { return false; }
};
// Labels are text nodes, escaped by Pele: check only the markup, so a label like `src=x` stays a label.
export const unsafeSvg = svg => UNSAFE_SVG.find(bad => svg.replace(/>[^<]*</g, '><').includes(bad));
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
// In What Changes, pipe lines over a separator row become a table drawing; other pipe lines stay text.
const SEPARATOR = /^\|(?:\s*:?-+:?\s*\|)+$/;
function blocks(section, noun) {
  const out = [];
  let item = null, para = null, fence = null, table = null, count = 0;
  const settle = () => {
    if (!table) return;
    if (table.lines.length > 1 && SEPARATOR.test(table.lines[1])) item.drawings.push(table);
    else item.text.push(...table.lines);
    table = null;
  };
  section.lines.forEach((line, i) => {
    const at = section.at + i + 1;
    if (fence) {
      if (/^\s*`{3,}\s*$/.test(line)) fence = null;
      else fence.lines.push(line.replace(fence.indent, ''));
      return;
    }
    const pipes = noun === 'item' && /^\|.+\|$/.test(line.trim());
    if (pipes && !item && SEPARATOR.test(section.lines[i + 1]?.trim() ?? '')) {
      throw new Error(`proposal.md line ${at}: a table outside any bullet in ## ${section.title} (a blank line ends a bullet)`);
    }
    if (pipes && item) {
      (table ??= { at, lang: 'table', lines: [] }).lines.push(line.trim());
      return;
    }
    settle();
    const open = /^(\s*)`{3,}\s*([\w-]*)\s*$/.exec(line);
    if (open) {
      if (!item) throw new Error(`proposal.md line ${at}: a fence outside any bullet in ## ${section.title} (a blank line ends a bullet)`);
      fence = { at, lang: open[2].toLowerCase(), indent: new RegExp(`^ {0,${open[1].length}}`), lines: [] };
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
  settle();
  return out.map(block => ({ ...block, text: block.text.join(' ') }));
}

// A box's right edge must sit under its ┐: a │ or ┘ within two columns below it means a miscounted line.
// Anything else means the ┐ was no box's corner, as in ┌──┴──┐. + and | are skipped: ordinary text has them.
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

// A Mermaid fence becomes an inline SVG picture, drawn once here; the page runs no renderer.
// The wrapper's width is in em so the kit's font-size fit and zoom resize it like a text drawing.
function picture(item, fence, k, warnings) {
  const id = `item-${item.n}-picture-${k}`, where = `item ${item.n}, picture ${k}`;
  let drawn;
  try {
    drawn = loadPele().render(fence.lines.join('\n'), { idPrefix: id, autoDirection: false, fontFamily: PICTURE_FONT, links: false, images: false, now: 0 });
  } catch (error) {
    const line = error && error.name === 'PeleError' && error.line > 0 ? fence.at + error.line : fence.at;
    // Pele's message adds the source and a caret on later lines; the status line keeps only the first.
    const message = String(error && error.message ? error.message : error).split('\n')[0].replace(/:\s*$/, '');
    throw new Error(`proposal.md line ${line}: ${where}: ${message}`);
  }
  return frame(fence, id, where, drawn.svg, drawn.width, 'pic', 'fewer boxes in a row, or shorter labels', warnings);
}

// The folded frame every picture shares; a width in em lets the kit's fit and zoom resize it, and none fills the frame.
function frame(fence, id, where, svg, width, kind, narrower, warnings) {
  const unsafe = unsafeSvg(svg);
  if (unsafe) throw new Error(`proposal.md line ${fence.at}: ${where}: the drawn picture holds ${unsafe}; draw it without links, images, or styles`);
  if (width > PICTURE_WIDE && narrower) warnings.push(`proposal.md line ${fence.at}: ${where} is ${Math.round(width)} px wide; keep pictures under ${PICTURE_WIDE}: ${narrower}`);
  const style = width ? ` style="width:${Number((width / BASE_PX).toFixed(3))}em"` : '';
  return '<details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary>'
    + `<div class="frame"><div class="art ${kind}" data-note="${id}" tabindex="0"${style}>${svg}</div></div></details>`;
}

// Character references: the five XML names and numeric ones decode; any other name refuses the picture.
function decode(raw, refuse) {
  return raw.replace(/&(#x[0-9a-f]+|#\d+|[a-z][\w.-]*);/gi, (m, ref) => {
    if (ref[0] !== '#') return ENTITIES[ref] ?? refuse(m);
    const code = ref[1] === 'x' || ref[1] === 'X' ? parseInt(ref.slice(2), 16) : Number(ref.slice(1));
    try { return String.fromCodePoint(code); } catch { return refuse(m); }
  });
}

// Read a fence's tags and text; `rules` judges each element and attribute, so nothing typed reaches the page verbatim.
function markup(source, rules, fail) {
  const parts = [], stack = [];
  let pos = 0;
  const tag = /<(\/?)([A-Za-z][\w:.-]*)((?:\s+[^\s=/>]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/y;
  while (pos < source.length) {
    const lt = source.indexOf('<', pos);
    const text = source.slice(pos, lt < 0 ? undefined : lt);
    if (text) {
      if (!stack.length && text.trim()) rules.loose?.(pos);
      parts.push(esc(decode(text, ref => fail(pos, ref))));
    }
    if (lt < 0) break;
    pos = lt;
    const special = /^<(?:!([A-Za-z]+)|!\[CDATA\[|\?[\w-]*)/.exec(source.slice(pos, pos + 12));
    if (special) fail(pos, special[1] ? `<!${special[1]}>` : special[0]);
    tag.lastIndex = pos;
    const m = tag.exec(source);
    if (!m) fail(pos, `an unreadable tag ${JSON.stringify(source.slice(pos, pos + 20).split('\n')[0])}`);
    const [whole, end, name, attrs, self] = m;
    const empty = rules.empty?.has(name);
    if (!rules.tags.has(name) || (end && empty)) fail(pos, `<${end}${name}>`);
    if (end) {
      const open = stack.pop();
      if (attrs.trim() || self || open !== name) fail(pos, open ? `</${name}> while <${open}> is open` : `</${name}> with nothing open`);
      parts.push(`</${name}>`);
      if (!stack.length) rules.rootEnd?.();
    } else {
      if (!stack.length) rules.root?.(name, attrs, pos);
      const seen = new Set(), out = [], classes = [];
      for (const [, key, quoted] of attrs.matchAll(/([^\s=/>]+)(?:\s*=\s*("[^"]*"|'[^']*'))?/g)) {
        if (seen.has(key)) fail(pos, `${key} twice`);
        seen.add(key);
        const value = quoted === undefined ? null : decode(quoted.slice(1, -1), ref => fail(pos, ref));
        if (value !== null && /url\s*\(/i.test(value)) fail(pos, 'url(');
        const kept = rules.attr(key, value, classes, what => fail(pos, what ?? `${key}=`));
        if (kept !== undefined) out.push(kept === null ? ` ${key}` : ` ${key}="${esc(kept)}"`);
      }
      const shut = rules.html ? (self && !empty ? `></${name}>` : '>') : self ? '/>' : '>';
      parts.push(`<${name}${classes.length ? ` class="${classes.join(' ')}"` : ''}${out.join('')}${shut}`);
      if (!self && !empty) stack.push(name);
      else if (!stack.length) rules.rootEnd?.();
    }
    pos += whole.length;
  }
  if (stack.length) fail(source.length, `<${stack[stack.length - 1]}>, which never closes`);
  return parts.join('').trim();
}

// An `svg` fence: one <svg> root with a viewBox; named colours become kit classes, any other colour is reported.
export function sketchSvg(source, refuse) {
  const colors = [];
  let root = null, closed = false;
  const svg = markup(source, {
    tags: SKETCH_TAGS,
    loose: at => refuse(at, 'text outside <svg>'),
    root(name, attrs, at) {
      if (closed || name !== 'svg') refuse(at, closed ? `a second root <${name}>` : `<${name}> as the root; a sketch is one <svg>`);
      const box = /^\s*(-?[\d.]+)[\s,]+(-?[\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)\s*$/.exec(decode(/viewBox\s*=\s*("[^"]*"|'[^']*')/.exec(attrs)?.[1].slice(1, -1) ?? '', () => ''));
      if (!box || !(Number(box[3]) > 0) || !(Number(box[4]) > 0)) refuse(at, '<svg> without a viewBox of four numbers');
      root = { width: Number(box[3]) };
    },
    rootEnd: () => { closed = true; },
    attr(key, value, classes, no) {
      if (!SKETCH_ATTRS.has(key) || value === null) no();
      const paint = key === 'fill' || key === 'stroke';
      if (paint && SKETCH_COLORS.has(value)) return void classes.push(`${key[0]}-${value}`);
      if (paint && !/^(?:none|currentColor)$/.test(value)) colors.push(value);
      return value;
    },
  }, refuse);
  if (!root) refuse(0, 'no <svg> root with a viewBox');
  return { svg, width: root.width, colors };
}

// A `screen` fence: HTML in the look's parts and layout classes, inert form controls, no styles, links, or images.
export function sketchScreen(source, refuse) {
  let phone = false;
  const html = markup(source, {
    tags: SCREEN_TAGS, empty: SCREEN_EMPTY, html: true,
    attr(key, value, classes, no) {
      if (SCREEN_FLAGS.has(key)) return value === null || value === '' || value === key ? null : no();
      if (value === null || !SCREEN_ATTRS.has(key)) no();
      if (key === 'type' && !SCREEN_TYPES.has(value)) no();
      if (key !== 'class') return value;
      for (const name of value.split(/\s+/).filter(Boolean)) {
        if (!SCREEN_CLASSES.has(name)) no(`class "${name}"`);
        if (name === 'phone') phone = true;
        // The page's own footer is `.bar`: the placeholder is written as `sk-bar` so neither styles the other.
        classes.push(name === 'bar' ? 'sk-bar' : name);
      }
    },
  }, refuse);
  return { html, phone };
}

// A hand-drawn sketch shares the Mermaid picture's frame, counter, and note; its colours follow the look.
function sketch(item, fence, k, warnings) {
  const id = `item-${item.n}-picture-${k}`, where = `item ${item.n}, picture ${k}`;
  const drawn = sketchSvg(fence.lines.join('\n'), refuser(fence, where, 'a sketch', 'draw with shapes, text, and named colors only'));
  if (drawn.colors.length) {
    const more = drawn.colors.length > 1 ? ` (and ${drawn.colors.length - 1} more)` : '';
    warnings.push(`proposal.md line ${fence.at}: ${where} paints ${drawn.colors[0]}${more}, which will not follow dark mode; use ${[...SKETCH_COLORS].join(', ')}`);
  }
  return frame(fence, id, where, drawn.svg, drawn.width, 'pic sketch', 'draw it narrower, or stack its parts', warnings);
}

// A screen fills the frame up to 640 px, or 360 px as a phone; its controls sit in an inert box, so a tap notes it.
function screen(item, fence, k, warnings) {
  const id = `item-${item.n}-picture-${k}`, where = `item ${item.n}, picture ${k}`;
  const drawn = sketchScreen(fence.lines.join('\n'), refuser(fence, where, 'a screen', "build it from the look's parts and layout classes only"));
  return frame(fence, id, where, `<div class="sk" inert>${drawn.html}</div>`, drawn.phone ? PHONE_WIDE : null, 'pic screen', '', warnings);
}

// One line naming the item, the picture, the proposal line, and the refused part.
function refuser(fence, where, what, how) {
  const source = fence.lines.join('\n');
  return (at, name) => {
    const line = fence.at + 1 + (source.slice(0, at).match(/\n/g) || []).length;
    throw new Error(`proposal.md line ${line}: ${where}: ${what} can not hold ${name}; ${how}`);
  };
}

// A Markdown table: a header, a separator, and body rows, each row a note target named by its number in the item.
function table(item, fence, first) {
  const cells = line => line.slice(1, -1).split(/(?<!\\)\|/).map(cell => inline(cell.trim().replace(/\\\|/g, '|')));
  const [head, , ...body] = fence.lines.map(cells);
  const pad = row => head.map((cell, i) => row[i] ?? '');
  return `<div class="table"><table class="tbl"><thead><tr>${head.map(cell => `<th>${cell}</th>`).join('')}</tr></thead><tbody>`
    + body.map((row, i) => `<tr data-note="item-${item.n}-row-${first + i}" tabindex="0">${pad(row).map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')
    + '</tbody></table></div>';
}

function changes(section, warnings) {
  let html = '', open = false;
  for (const block of blocks(section, 'item')) {
    if (!block.n) { html += `${open ? '</ol>\n' : ''}<p class="aside">${inline(block.text)}</p>\n`; open = false; continue; }
    // Text drawings number lines across the item, tables their rows; Mermaid, SVG, and screen pictures share one count.
    let first = 1, pictures = 0, rows = 1;
    const art = block.drawings.map(fence => {
      if (fence.lang === 'mermaid') return picture(block, fence, ++pictures, warnings);
      if (fence.lang === 'svg') return sketch(block, fence, ++pictures, warnings);
      if (fence.lang === 'screen') return screen(block, fence, ++pictures, warnings);
      if (fence.lang === 'table') { const out = table(block, fence, rows); rows += fence.lines.length - 2; return out; }
      const out = drawing(block, fence, first, warnings); first += fence.lines.length; return out;
    });
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

export function assemble(name, content, kit = readFileSync(kitPath, 'utf8')) {
  one(kit, SLOT, 'review kit');
  if (!kit.includes('CHANGE-NAME')) throw new Error('review kit: missing CHANGE-NAME');
  if ((kit.match(/<script\b/g) || []).length !== 1 || (kit.match(/<style\b/g) || []).length !== 1) {
    throw new Error('review kit: expected one <script> and one <style>');
  }
  one(kit, LOOK, 'review kit');
  one(kit, THEME, 'review kit');
  // The app's colours and parts go in the kit's one <style>, and the switch in <head>, so a saved dark choice applies
  // before the first paint; a function replacement keeps any `$` in them literal.
  const theme = `<script>\n${readFileSync(themePath, 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`;
  const [before, after] = kit.replace(LOOK, () => lookCss()).replace(THEME, () => theme).split(SLOT);
  return `${FORMAT}\n${before.split('CHANGE-NAME').join(esc(name))}${content}${after.split('CHANGE-NAME').join(esc(name))}`;
}

function writeIfDifferent(path, next) {
  if (existsSync(path) && readFileSync(path, 'utf8') === next) return false;
  const tmp = `${path}.${process.pid}.${Math.random().toString(36).slice(2)}.tmp`;
  try { writeFileSync(tmp, next); renameSync(tmp, path); }
  finally { if (existsSync(tmp)) rmSync(tmp); }
  return true;
}

// The line under the link: a live page has Build it and Build and publish; a file has no buttons, so the chat builds.
export const REVIEW_ON_PAGE = 'Review the plan, then tap Build it or Build and publish on its page.';
export const REVIEW_IN_CHAT = 'Review the plan. When you\'re ready, say "build it" or "build and publish".';

// The chat line an agent copies as printed: a path with a space or parenthesis goes in <…> so the link still parses.
export function planLink(page) {
  return `Click here to see the plan: [review.html](${/[\s()]/.test(page) ? `<${page}>` : page})`;
}

// The fixed first line of sent and copied notes; the kit writes the same words.
export const notesHeader = name => `Notes on the plan ${name} from the review page. Don't build yet.`;

// What each button on a live page tells the chat: the person's build choice, made on the page.
export const planActions = name => ({
  build: `Build it now: run /apply for the plan ${name}. Chosen on its review page. Apply any attached review notes to this plan first, then continue without another build choice.`,
  publish: `Build and publish: run /ship for the plan ${name}. Chosen on its review page. Apply any attached review notes to this plan first, then continue without another build choice.`,
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
      const goal = scheduledGoal(root);
      const link = args.values.link && result.kind === 'current' ? await linked(page, basename(resolve(root)), goal) : page;
      const next = goal ? 'Use `/schedule` to confirm this record and its execution destination.' : link === page ? REVIEW_IN_CHAT : REVIEW_ON_PAGE;
      if (result.kind !== 'no-page') console.log(`${planLink(link)}\n\n${next}`);
    } catch (error) { console.error(`review: ${error.message}`); process.exitCode = 1; }
  }
}
