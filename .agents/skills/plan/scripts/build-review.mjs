#!/usr/bin/env node
// Build a portable review page: parse proposal.md, or a review.md, into static, escaped HTML inside the shared kit.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, realpathSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';
import { isMain } from '../../memory/scripts/lib/cli.mjs';
import { lookCss } from './look.mjs';

const FORMAT = '<!-- wong-review:3 -->';
const SLOT = '<!-- review:content -->';
const LOOK = '/* look */';
const THEME = '<!-- theme -->';
const READY = '<div id="ready" hidden>';
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
// A `picture` fence: files from the page's own folder, checked by their first bytes, carried inside the page.
const PHOTO_TYPES = [['image/png', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]], ['image/jpeg', [0xff, 0xd8, 0xff]], ['image/webp', [0x52, 0x49, 0x46, 0x46]]];
// The Inbox keeps at most 1.6 MB a page, and base64 makes a picture a third larger, so the built page is measured.
const KB = 1024;
const PHOTO_WARN = 150 * KB, PHOTO_MAX = 300 * KB, PAGE_WARN = 800 * KB, PAGE_MAX = 1536 * KB, LIVE_MAX = 800 * KB;
// A live card's files: pictures and fonts by their first bytes, an SVG by its text.
const LIVE_TYPES = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml',
  woff: 'font/woff', woff2: 'font/woff2' };
const MAGIC = { 'image/gif': [0x47, 0x49, 0x46, 0x38], 'font/woff': [0x77, 0x4f, 0x46, 0x46], 'font/woff2': [0x77, 0x4f, 0x46, 0x32],
  ...Object.fromEntries(PHOTO_TYPES) };
const LIVE_CSP = "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; "
  + "media-src data: blob:; connect-src 'none'; form-action 'none'; frame-src 'none'; base-uri 'none'";
// The card's one way out: review.answer(text) posts to the port the kit hands it on each greeting.
const LIVE_SHIM = '<script>(function(){var port=null,last=null;addEventListener("message",function(e){var m=e.data;'
  + 'if(e.source!==parent||!m||m.type!=="review:hello"||!e.ports||!e.ports[0])return;port=e.ports[0];'
  + 'if(last!==null)port.postMessage({type:"review:answer",text:last});});'
  + 'window.review={answer:function(text){last=String(text);if(port)port.postMessage({type:"review:answer",text:last});}};}());</script>';
// A `form` fence: one question a line, as `<kind>: <label>`, a choice's options, or a file's types and count.
const QUESTION_KINDS = new Set(['text', 'long', 'choice', 'choices', 'pictures', 'date', 'tick', 'file']);
const FILE_KINDS = { image: ['png', 'jpg', 'jpeg', 'webp', 'gif'], pdf: ['pdf'], text: ['txt', 'csv', 'md', 'json'], office: ['docx', 'xlsx', 'pptx'], zip: ['zip'] };
const FILE_WORDS = { image: 'pictures', pdf: 'PDFs', text: 'text files', office: 'Word, Excel, or PowerPoint files', zip: 'zip files' };
const QUESTIONS_MAX = 12, FILES_MAX = 5;
const SECRET = /password|passcode|api key|\bkey\b|token|secret|card number|cvv|cvc/i;
const PRIVATE_LINK = 'wiki/development/secrets.md#receive-a-key-through-a-private-link';
const SMALLER = 'take only the visible part at phone width';
const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const USAGE = `usage: build-review.mjs <change-root> [--require-current] [--link]
       build-review.mjs <folder> --kind review [--action "<name>=<label>|<message>"]... [--confirm <name>]... [--link]
  Prints the plan as chat Markdown above the link line, for a reply that ends on the review line.
  --link  print the page's reply link, whose buttons send notes to this chat or ask it to build; the file where none can open,
          or for a change under openspec/changes/archive/
  --kind review  a page for work that is not a plan, from <folder>/review.md: # <ask>, ## Why, ## To review, optional ## Decisions
  --action  one of its buttons, 6 at most: the name, the label it shows, and the message it sends this chat
  --confirm  a button that can't be undone, which asks once more on the page`;
const kitPath = resolve(dirname(fileURLToPath(import.meta.url)), '../references/review-kit.html');
const themePath = resolve(dirname(fileURLToPath(import.meta.url)), '../references/theme.js');
// Pele draws Mermaid at build time. It loads only for a proposal that holds a Mermaid fence,
// so text-only builds load nothing new.
let pele = null;
const loadPele = () => (pele ??= createRequire(import.meta.url)('../vendor/pele.mjs'));

const esc = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
function sections(markdown, file = 'proposal.md') {
  const lines = markdown.replace(/\r\n?/g, '\n').replace(/<!--[\s\S]*?-->/g, m => m.replace(/[^\n]/g, '')).split('\n');
  const found = {};
  let current = null, fenced = false;
  lines.forEach((line, i) => {
    if (/^\s*`{3,}/.test(line)) fenced = !fenced;
    const heading = !fenced && /^## +(.+?)\s*$/.exec(line);
    if (heading) current = found[heading[1].toLowerCase()] = { title: heading[1], at: i + 1, lines: [], file };
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
      throw new Error(`${section.file} line ${at}: a table outside any bullet in ## ${section.title} (a blank line ends a bullet)`);
    }
    if (pipes && item) {
      (table ??= { at, lang: 'table', lines: [], file: section.file }).lines.push(line.trim());
      return;
    }
    settle();
    // The words after a fence's language name its tab: ```mermaid Today.
    const open = /^(\s*)`{3,}\s*([\w-]*)(?:\s+(\S.*?))?\s*$/.exec(line);
    if (open) {
      if (!item) throw new Error(`${section.file} line ${at}: a fence outside any bullet in ## ${section.title} (a blank line ends a bullet)`);
      fence = { at, lang: open[2].toLowerCase(), info: open[3] ?? '', indent: new RegExp(`^ {0,${open[1].length}}`), lines: [], file: section.file };
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
  if (fence) throw new Error(`${section.file} line ${fence.at}: ${noun} ${item.n} opens a fence that never closes`);
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
    warnings.push(`${fence.file} line ${fence.at + i + 1}: item ${item.n}, drawing line ${i + 1} is ${width} columns${more}; keep drawings under ${WIDE}: aim for 40, up to 56 side by side`);
  }
  for (const [i, edge, corner] of crooked(fence.lines.map(line => [...line]))) {
    warnings.push(`${fence.file} line ${fence.at + i + 1}: item ${item.n}, drawing line ${i + 1} has a box edge at column ${edge + 1}, but its corner is at column ${corner + 1}`);
  }
  const lines = fence.lines.map((line, i) => (line.trim()
    ? `<span class="ln" data-note="item-${item.n}-line-${first + i}" tabindex="0">${esc(line)}</span>` : esc(line)));
  return single(`<pre class="art">\n${lines.join('\n')}</pre>`, fence, 'Drawing');
}

// A labelled part of the card's view: its words name it, its kind sets how the kit fits it.
const part = (label, kind, html) => ({ label, kind, html });
// A fence drawn as one part, named by the fence's own words or else by its kind.
const single = (html, fence, name, kind = 'draw') => ({ parts: [part(fence.info || name, kind, html)] });

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
    throw new Error(`${fence.file} line ${line}: ${where}: ${message}`);
  }
  return single(frame(fence, id, where, drawn.svg, drawn.width, 'pic', 'fewer boxes in a row, or shorter labels', warnings), fence, 'Flow');
}

// The frame every picture shares; a width in em lets the kit's fit and zoom resize it, and none fills the frame.
function frame(fence, id, where, svg, width, kind, narrower, warnings) {
  const unsafe = unsafeSvg(svg);
  if (unsafe) throw new Error(`${fence.file} line ${fence.at}: ${where}: the drawn picture holds ${unsafe}; draw it without links, images, or styles`);
  if (width > PICTURE_WIDE && narrower) warnings.push(`${fence.file} line ${fence.at}: ${where} is ${Math.round(width)} px wide; keep pictures under ${PICTURE_WIDE}: ${narrower}`);
  return framed(id, kind, svg, width ? ` style="width:${Number((width / BASE_PX).toFixed(3))}em"` : '');
}
const framed = (id, kind, inner, style = '') => `<div class="art ${kind}" data-note="${id}" tabindex="0"${style}>${inner}</div>`;

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
    warnings.push(`${fence.file} line ${fence.at}: ${where} paints ${drawn.colors[0]}${more}, which will not follow dark mode; use ${[...SKETCH_COLORS].join(', ')}`);
  }
  return single(frame(fence, id, where, drawn.svg, drawn.width, 'pic sketch', 'draw it narrower, or stack its parts', warnings), fence, 'Drawing');
}

// A screen fills the frame up to 640 px, or 360 px as a phone; its controls sit in an inert box, so a tap notes it.
function screen(item, fence, k, warnings) {
  const id = `item-${item.n}-picture-${k}`, where = `item ${item.n}, picture ${k}`;
  const drawn = sketchScreen(fence.lines.join('\n'), refuser(fence, where, 'a screen', "build it from the look's parts and layout classes only"));
  return single(frame(fence, id, where, `<div class="sk" inert>${drawn.html}</div>`, drawn.phone ? PHONE_WIDE : null, 'pic screen', '', warnings), fence, 'Screen');
}

// One line naming the item, the picture, the proposal line, and the refused part.
function refuser(fence, where, what, how) {
  const source = fence.lines.join('\n');
  return (at, name) => {
    const line = fence.at + 1 + (source.slice(0, at).match(/\n/g) || []).length;
    throw new Error(`${fence.file} line ${line}: ${where}: ${what} can not hold ${name}; ${how}`);
  };
}

const outside = (from, to) => /^\.\.(?:[\\/]|$)/.test(relative(from, to)) || isAbsolute(relative(from, to));
// A file inside the page's own folder, by name and by its real path, so a link can't lead out; `base` resolves it.
function local(path, base, root, stop, missing) {
  if (isAbsolute(path) || outside(root, resolve(base, path))) stop(`${path} is outside the change's folder`);
  let real, bytes;
  try { real = realpathSync(resolve(base, path)); bytes = readFileSync(real); } catch { stop(missing); }
  if (outside(realpathSync(root), real)) stop(`${path} is outside the change's folder`);
  return { real, bytes };
}

// One picture file from the page's own folder, checked by name, real file, and first bytes, as a data URI.
function photo(path, at, where, ctx, warnings) {
  const stop = why => { throw new Error(`${ctx.file} line ${at}: ${where}: ${why}`); };
  if (/^[a-z][\w+.-]*:/i.test(path)) stop(`${path} is a web address; save the picture in the change's folder`);
  const { bytes } = local(path, ctx.root, ctx.root, stop, `no picture at ${path}`);
  const type = PHOTO_TYPES.find(([, magic]) => magic.every((b, j) => bytes[j] === b))?.[0];
  if (!type || (type === 'image/webp' && bytes.toString('latin1', 8, 12) !== 'WEBP')) stop(`${path} is not a PNG, JPEG, or WebP picture`);
  if (bytes.length > PHOTO_MAX) stop(`${path} is ${Math.ceil(bytes.length / KB)} KB; keep a picture under 300 KB: ${SMALLER}`);
  if (bytes.length > PHOTO_WARN) warnings.push(`${ctx.file} line ${at}: ${where}: ${path} is ${Math.ceil(bytes.length / KB)} KB; keep pictures under 150 KB: ${SMALLER}`);
  return `data:${type};base64,${bytes.toString('base64')}`;
}

// A `picture` fence: one `[label:] path` a line, each a part,
// or one `Try it: <https address>` line, drawn as a link to a new tab.
function photos(item, fence, k, ctx, warnings) {
  const where = `item ${item.n}, picture ${k}`;
  let tryIt = '', tryAt = '';
  const shots = fence.lines.map((line, i) => [line.trim(), fence.at + 1 + i]).filter(([line]) => line).flatMap(([line, at]) => {
    const [, label = '', path] = /^(?:([^:]+?):\s+)?(.+)$/.exec(line);
    if (/^try it$/i.test(label.trim())) {
      let url = null;
      try { url = new URL(path); } catch { /* refused below */ }
      if (url?.protocol !== 'https:' || tryIt) throw new Error(`${ctx.file} line ${at}: ${where}: Try it takes one https:// address, not ${path}`);
      tryIt = url.href; tryAt = `${ctx.file} line ${at}: ${where}`;
      return [];
    }
    return [{ name: label.trim() || basename(path).replace(/\.[^.]*$/, ''), src: photo(path, at, where, ctx, warnings) }];
  });
  if (!shots.length) throw new Error(`${ctx.file} line ${fence.at}: ${where}: a picture fence names no file`);
  return { tryIt, tryAt, parts: shots.map((shot, i) => part(shot.name, 'photo',
    `<div class="art photo" data-note="item-${item.n}-picture-${k + i}" data-label="${esc(shot.name)}" tabindex="0"><img src="${shot.src}" alt="${esc(shot.name)}"></div>`)) };
}

// An `ad` fence: one ad in its placement's frame, a part each.
const AD_LINES = ['placement', 'account', 'picture', 'text', 'headline', 'button'];
function ads(item, fences, k, ctx, warnings) {
  const where = `item ${item.n}, picture ${k}`;
  return { parts: fences.map((fence, i) => {
    const stop = (at, why) => { throw new Error(`${ctx.file} line ${at}: ${where}: ${why}`); };
    const ad = {};
    fence.lines.forEach((line, j) => {
      const at = fence.at + 1 + j, m = /^\s*([a-z]+):\s*(.*?)\s*$/.exec(line);
      if (!line.trim()) return;
      if (!m || !AD_LINES.includes(m[1]) || ad[m[1]]) stop(at, `an ad takes one line each of ${AD_LINES.join(', ')}`);
      ad[m[1]] = { value: m[2], at };
    });
    const placement = ad.placement?.value ?? 'feed';
    if (placement !== 'feed' && placement !== 'story') stop(ad.placement.at, `placement is feed or story, not ${placement}`);
    if (!ad.picture?.value) stop(fence.at, 'an ad needs a picture: line');
    const words = name => esc(ad[name]?.value ?? '');
    const line = (name, tag) => (ad[name]?.value ? `<${tag} class="ad-${name}">${words(name)}</${tag}>` : '');
    const label = fence.info || (placement === 'feed' ? 'Feed' : 'Story');
    return part(label, 'photo', `<div class="art ad ${placement}" data-note="item-${item.n}-picture-${k + i}" data-label="${esc(label)}" tabindex="0">`
      + `<p class="ad-account"><b>${words('account')}</b> <span>Sponsored</span></p>`
      + `<img src="${photo(ad.picture.value, ad.picture.at, where, ctx, warnings)}" alt="${words('headline') || words('text') || words('account') || 'ad'}">`
      + `<div class="ad-words">${line('text', 'p')}${line('headline', 'b')}${line('button', 'span')}</div></div>`);
  }) };
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

// ── a `live` fence: the chat's own page from a folder, every file carried inside it, run in a sealed frame ──
const WEB = /^(?:[a-z][\w+.-]*:)?\/\//i;
const LOCAL = ref => ref && !/^(?:#|[a-z][\w+.-]*:)/i.test(ref);
const attrOf = (tag, name) => new RegExp(`\\s${name}\\s*=\\s*("[^"]*"|'[^']*'|[^\\s>]+)`, 'i').exec(tag);
const unquote = raw => decode(/^["']/.test(raw) ? raw.slice(1, -1) : raw, m => m);

// One page and its files; `stop` names the card and the proposal line, and every address is checked once.
function inliner(root, stop, card = 'a live card') {
  const web = ref => {
    if (WEB.test(ref.trim()) || /^https?:/i.test(ref.trim())) stop(`${ref} is a web address; ${card} loads nothing from the web: copy it into the folder`);
  };
  const read = (ref, base) => local(decodeURIComponent(ref.split(/[?#]/)[0]), base, root, stop, `no file at ${ref}`);
  const asset = (ref, base) => {
    web(ref);
    if (!LOCAL(ref.trim())) return ref;
    const path = ref.trim(), ext = /\.([a-z0-9]+)(?:[?#].*)?$/i.exec(path)?.[1].toLowerCase(), type = LIVE_TYPES[ext];
    if (!type) stop(`${path} is not a picture or font ${card} can carry: PNG, JPEG, WebP, GIF, SVG, WOFF, or WOFF2`);
    const { bytes } = read(path, base);
    const svg = type === 'image/svg+xml';
    const fits = svg ? /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*(?:<!DOCTYPE[^>]*>\s*)?<svg[\s>]/i.test(bytes.toString('utf8'))
      : MAGIC[type].every((b, j) => bytes[j] === b) && (type !== 'image/webp' || bytes.toString('latin1', 8, 12) === 'WEBP');
    if (!fits) stop(`${path} is not the ${ext.toUpperCase()} file its name says`);
    if (bytes.length > PHOTO_MAX) stop(`${path} is ${Math.ceil(bytes.length / KB)} KB; keep a file under 300 KB: ${SMALLER}`);
    return `data:${type};base64,${bytes.toString('base64')}`;
  };
  const css = (text, base) => {
    if (/@import\b/i.test(text)) stop('a stylesheet @import; put the styles in one file');
    return text.replace(/url\(\s*(["']?)([^"')]*)\1\s*\)/gi, (m, q, ref) => `url("${asset(ref, base)}")`);
  };
  const srcset = (value, base) => value.split(',').map(part => {
    const [ref, ...rest] = part.trim().split(/\s+/);
    return [asset(ref, base), ...rest].join(' ');
  }).join(', ');
  const setAttr = (tag, name, value) => tag.replace(attrOf(tag, name)[0], ` ${name}="${esc(value)}"`);
  // A tag's addresses: a link's is checked, a file's is carried, and a style's url() is carried too.
  const tag = (text, base) => {
    let out = text;
    const name = /^<([\w:-]+)/.exec(text)[1].toLowerCase();
    for (const key of ['src', 'poster', 'background', 'data', 'href', 'xlink:href', 'srcset', 'action', 'formaction', 'style']) {
      const found = attrOf(out, key);
      if (!found) continue;
      const value = unquote(found[1]);
      if (key === 'style') out = setAttr(out, key, css(value, base));
      else if (key === 'srcset') out = setAttr(out, key, srcset(value, base));
      else if (key === 'href' && ['a', 'area'].includes(name)) { if (card === 'a live card') web(value); }
      else if (['action', 'formaction'].includes(key)) web(value);
      else out = setAttr(out, key, asset(value, base));
    }
    return out;
  };
  const text = (path, base, kind) => {
    web(path);
    const { real, bytes } = read(path, base);
    if (!new RegExp(`\\.(?:${kind})$`, 'i').test(real)) stop(`${path} is not a ${kind === 'css' ? 'stylesheet' : 'script'} file`);
    return { body: bytes.toString('utf8'), base: dirname(real) };
  };
  const page = (html, base) => html.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>|<style\b[^>]*>[\s\S]*?<\/style\s*>|<!--[\s\S]*?-->|<link\b[^>]*>|<[a-zA-Z][^>]*>/gi, part => {
    if (part.startsWith('<!--')) return part;
    if (/^<style/i.test(part)) return part.replace(/^(<style\b[^>]*>)([\s\S]*?)(<\/style\s*>)$/i, (m, a, body, b) => a + css(body, base) + b);
    if (/^<script/i.test(part)) {
      const src = attrOf(/^<script\b[^>]*>/i.exec(part)[0], 'src');
      if (!src) return part;
      const file = text(unquote(src[1]), base, 'js|mjs');
      const open = /^<script\b[^>]*>/i.exec(part)[0].replace(src[0], '');
      return `${open}${file.body.replace(/<\/script/gi, '<\\/script')}</script>`;
    }
    if (/^<link/i.test(part)) {
      const rel = unquote(attrOf(part, 'rel')?.[1] ?? '').toLowerCase(), href = attrOf(part, 'href');
      if (!href) return part;
      if (!rel.split(/\s+/).includes('stylesheet')) return tag(part, base);
      const file = text(unquote(href[1]), base, 'css');
      return `<style>${css(file.body, file.base).replace(/<\/style/gi, '<\\/style')}</style>`;
    }
    return tag(part, base);
  });
  return page;
}

// The page's head takes the sealing policy, and a live card's answer shim, first, before any of the page's own parts.
function sealed(html, first = `<meta http-equiv="Content-Security-Policy" content="${LIVE_CSP}">${LIVE_SHIM}`) {
  const head = /<head\b[^>]*>/i.exec(html) ?? /<html\b[^>]*>/i.exec(html);
  if (!head) return `${first}${html}`;
  const at = head.index + head[0].length;
  return html.slice(0, at) + (/^<head/i.test(head[0]) ? first : `<head>${first}</head>`) + html.slice(at);
}

function live(item, fence, k, ctx) {
  const id = `item-${item.n}-live-${k}`, where = `item ${item.n}, live card ${k}`;
  const stop = (why, at = fence.at) => { throw new Error(`${ctx.file} line ${at}: ${where}: ${why}`); };
  const spec = {};
  fence.lines.forEach((line, i) => {
    const m = /^\s*(folder|height):\s*(.*?)\s*$/.exec(line);
    if (!line.trim()) return;
    if (!m || spec[m[1]] !== undefined) stop('a live card takes one folder: line and one height: line', fence.at + 1 + i);
    spec[m[1]] = m[2];
  });
  if (!spec.folder) stop('a live card needs a folder: line');
  const height = spec.height === undefined ? 640 : Number(spec.height);
  if (!Number.isInteger(height) || height < 200 || height > 4000) stop(`height is a number of pixels from 200 to 4000, not ${spec.height}`);
  const index = join(spec.folder, 'index.html');
  const { real, bytes } = local(index, ctx.root, ctx.root, stop, `no index.html in ${spec.folder}`);
  const doc = sealed(inliner(ctx.root, stop)(bytes.toString('utf8'), dirname(real)));
  const size = Buffer.byteLength(doc);
  if (size > LIVE_MAX) stop(`the live card is ${Math.ceil(size / KB)} KB; keep a live card under 800 KB: use smaller pictures`);
  return single(`<div class="live" data-live="${id}" data-height="${height}">`
    + `<iframe sandbox="allow-scripts" title="${esc(`Live card ${item.n}`)}" srcdoc="${esc(doc)}"></iframe></div>`, fence, 'Live', 'live');
}

// ── a `page` fence: a whole page, such as an email, one `<label>: <file>.html` line a version ──

// The kit's one script in a page, run by its hash: it posts the page's height, and the link under a point.
// It stays still when only the frame's height changed: the kit did that, and a page as tall as its frame follows it.
const PAGE_SIZE = '(function(){var seen=-1;function size(){parent.postMessage({type:"review:page",h:document.documentElement.scrollHeight,'
  + 'w:innerWidth,vh:innerHeight},"*");}function changed(){if(innerHeight<=1||innerHeight===seen)size();seen=innerHeight;}'
  + 'addEventListener("load",size);addEventListener("resize",changed);new ResizeObserver(changed).observe(document.documentElement);'
  + 'addEventListener("message",function(e){var m=e.data;'
  + 'if(e.source!==parent||!m||m.type!=="review:point"||typeof m.x!=="number"||typeof m.y!=="number")return;'
  + 'var at=document.elementFromPoint(m.x,m.y),a=at&&at.closest("[data-href]");'
  + 'parent.postMessage({type:"review:link",href:a?a.getAttribute("data-href"):""},"*");});}());';
const PAGE_CSP = `default-src 'none'; script-src 'sha256-${createHash('sha256').update(PAGE_SIZE).digest('base64')}'; style-src 'unsafe-inline'; `
  + "img-src data:; font-src data:; form-action 'none'; base-uri 'none'";
const PAGE_LINKS = '<style>:where(a[data-href]){color:LinkText;text-decoration:underline;cursor:pointer}</style>';
const PAGE_STOPS = [[/<script\b/i, 'a <script>; a page runs nothing, so a page that needs a script is a live card'],
  [/<[a-z][^>]*?\son[a-z]+\s*=/i, 'an on… attribute; a page runs nothing'], [/javascript\s*:/i, 'a javascript: address; a page runs nothing'],
  [/<(?:iframe|frame|object|embed|base)\b/i, 'a frame, object, or base tag; a page shows only its own words and pictures'],
  [/<meta\b[^>]*http-equiv\s*=\s*["']?refresh/i, 'a refresh tag; a page stays where it is']];
// Each link keeps its look but goes nowhere: its address moves to data-href, and shows on hover.
const inert = html => html.replace(/<(?:a|area)\b[^>]*>/gi, tag => {
  const href = attrOf(tag, 'href');
  if (!href) return tag;
  const value = esc(unquote(href[1]));
  return tag.replace(href[0], ` data-href="${value}"${attrOf(tag, 'title') ? '' : ` title="${value}"`}`);
});
function pages(item, fence, k, ctx) {
  const where = `item ${item.n}, picture ${k}`;
  let total = 0;
  const versions = fence.lines.map((line, i) => [line.trim(), fence.at + 1 + i]).filter(([line]) => line).map(([line, at], i) => {
    const m = /^([^:]+?):\s+(\S.*?\.html?)$/i.exec(line), stop = why => { throw new Error(`${ctx.file} line ${at}: ${where}: ${why}`); };
    if (!m) stop('a page takes one "<label>: <file>.html" line a version');
    const file = why => stop(`${m[2]}: ${why}`);
    const { real, bytes } = local(m[2], ctx.root, ctx.root, stop, `no page at ${m[2]}`);
    if (bytes.length > PHOTO_MAX) file(`${Math.ceil(bytes.length / KB)} KB; keep a page file under 300 KB`);
    const source = bytes.toString('utf8'), bad = PAGE_STOPS.find(([test]) => test.test(source));
    if (bad) file(`it holds ${bad[1]}`);
    const doc = sealed(inert(inliner(ctx.root, file, 'a page card')(source, dirname(real))), `<meta http-equiv="Content-Security-Policy" content="${PAGE_CSP}">${PAGE_LINKS}<script>${PAGE_SIZE}</script>`);
    total += Buffer.byteLength(doc);
    if (total > LIVE_MAX) stop(`the page card is ${Math.ceil(total / KB)} KB; keep a page card under 800 KB: use smaller pictures`);
    const label = esc(m[1].trim());
    return part(m[1].trim(), 'page', `<div class="page" data-note="item-${item.n}-picture-${k + i}" data-label="${label}" tabindex="0">`
      + `<iframe sandbox="allow-scripts" tabindex="-1" title="${label}" srcdoc="${esc(doc)}"></iframe></div>`);
  });
  if (!versions.length) throw new Error(`${ctx.file} line ${fence.at}: ${where}: a page fence names no file`);
  return { parts: versions };
}

// ── a `form` fence: questions drawn as real inputs, each with a stable id the kit keeps its answer under ──
function question(prefix, k, line, at, stop, ctx, where) {
  const m = /^\s*([a-z]+):\s*(.*?)\s*$/.exec(line);
  if (!m || !QUESTION_KINDS.has(m[1])) stop(`a question is one of ${[...QUESTION_KINDS].join(', ')}, then a colon and its words`, at);
  const [label, ...parts] = m[2].split('|').map(part => part.trim());
  const kind = m[1], id = `${prefix}-q-${k}`, words = esc(label);
  if (!label || label.length > 200) stop('a question needs its words, 200 characters at most', at);
  if (SECRET.test(label)) stop(`the question "${label}" asks for a secret; a page never takes a password, key, or card: send its private link (${PRIVATE_LINK})`, at);
  const head = `class="q" data-q="${id}" data-kind="${kind}" data-label="${words}"`;
  if (kind === 'choice' || kind === 'choices') {
    const options = (parts[0] ?? '').split(',').map(option => option.trim()).filter(Boolean);
    if (parts.length !== 1 || !options.length || options.length > QUESTIONS_MAX) stop(`${kind} takes "| a, b" with 1 to ${QUESTIONS_MAX} options`, at);
    const type = kind === 'choice' ? 'radio' : 'checkbox';
    return `<fieldset ${head}><legend class="q-label">${words}</legend>${options.map(option =>
      `<label class="opt"><input type="${type}" name="q-${id}" value="${esc(option)}"> ${esc(option)}</label>`).join('')}</fieldset>`;
  }
  if (kind === 'pictures') {
    const files = (parts[0] ?? '').split(',').map(file => file.trim()).filter(Boolean);
    if (parts.length !== 1 || files.length < 2 || files.length > QUESTIONS_MAX) stop(`pictures takes "| a.png, b.png" with 2 to ${QUESTIONS_MAX} files`, at);
    return `<fieldset ${head}><legend class="q-label">${words}</legend><div class="picks">${files.map(file =>
      `<label class="pick"><input type="radio" name="q-${id}" value="${esc(file)}"><img src="${photo(file, at, where, ctx, ctx.warnings)}" alt="${esc(basename(file))}"></label>`).join('')}</div></fieldset>`;
  }
  if (kind === 'file') {
    const types = (parts[0] ?? '').split(',').map(type => type.trim()).filter(Boolean), count = parts[1] === undefined ? 1 : Number(parts[1]);
    const unknown = types.find(type => !FILE_KINDS[type]);
    if (!types.length || unknown || parts.length > 2) stop(`a file takes "| <types> | <count>", types from ${Object.keys(FILE_KINDS).join(', ')}${unknown ? `, not ${unknown}` : ''}`, at);
    if (!Number.isInteger(count) || count < 1 || count > FILES_MAX) stop(`a file question takes 1 to ${FILES_MAX} files, not ${parts[1]}`, at);
    const exts = types.flatMap(type => FILE_KINDS[type]);
    return `<div ${head} data-types="${exts.join(',')}" data-count="${count}"><p class="q-label">${words}</p>`
      + `<label class="drop"><input type="file" accept="${exts.map(ext => `.${ext}`).join(',')}"${count > 1 ? ' multiple' : ''}>`
      + `<span>Drop ${count > 1 ? 'files' : 'a file'} here, or tap to pick</span></label>`
      + `<p class="muted">${types.map(type => FILE_WORDS[type]).join(', ')}; ${count === 1 ? '1 file' : `up to ${count} files`}, 25 MB each. `
      + 'Never send a password, key, or card here.</p><ul class="files"></ul></div>';
  }
  if (parts.length) stop(`${kind} takes only its words`, at);
  const input = { text: `<input id="q-${id}" type="text" maxlength="2000">`, long: `<textarea id="q-${id}" rows="3" maxlength="2000"></textarea>`,
    date: `<input id="q-${id}" type="date">` }[kind];
  if (kind === 'tick') return `<div ${head}><label class="opt"><input id="q-${id}" type="checkbox"> ${words}</label></div>`;
  return `<div ${head}><label class="q-label" for="q-${id}">${words}</label>${input}</div>`;
}

function form(prefix, fence, first, ctx, where) {
  const stop = (why, at = fence.at) => { throw new Error(`${ctx.file} line ${at}: ${where}: ${why}`); };
  const lines = fence.lines.map((line, i) => [line, fence.at + 1 + i]).filter(([line]) => line.trim());
  if (!lines.length || lines.length > QUESTIONS_MAX) stop(`a form holds 1 to ${QUESTIONS_MAX} questions`);
  return { count: lines.length, html: `<div class="form">${lines.map(([line, at], i) => question(prefix, first + i, line, at, stop, ctx, where)).join('')}</div>` };
}

// ── `## What the build needs`: each bullet Ready or Needs you; one that needs you holds its questions or its link ──
const NEED = /^\*\*([^*]+)\*\*:\s*(Ready|Needs you)\b[.,;:]?\s*/;
const NOTHING = /^\*\*Nothing\b[^*]*\*\*\s*/i;
function needs(section, ctx) {
  const items = blocks(section, 'need');
  if (!items.length) return null;
  return `<ol class="needs">\n${items.map(block => {
    const at = `${ctx.file} line ${section.at}: ## ${section.title}`;
    if (!block.n) return `<li class="aside">${inline(block.text)}</li>`;
    const state = NEED.exec(block.text), nothing = !state && NOTHING.exec(block.text);
    if (!state && !nothing) throw new Error(`${at}, item ${block.n}: start with **<what>**: Ready or **<what>**: Needs you`);
    const rest = block.text.slice((state ?? nothing)[0].length).replace(/<(https:\/\/[^\s>]+)>/g, '[Open the link]($1)');
    const links = [...rest.matchAll(/\]\(([^)\s]+)\)/g)].map(m => m[1]).filter(href => /^[a-z][\w+.-]*:/i.test(href));
    if (links.some(href => !/^https:/i.test(href)) || links.length > 1) throw new Error(`${at}, item ${block.n}: a need takes one https link at most`);
    let k = 1;
    const forms = block.drawings.map(fence => {
      if (fence.lang !== 'form') throw new Error(`${ctx.file} line ${fence.at}: need ${block.n}: a need holds only a form fence`);
      const drawn = form(`need-${block.n}`, fence, k, ctx, `need ${block.n}`);
      k += drawn.count;
      return drawn.html;
    });
    const open = state?.[2] === 'Needs you';
    if (open && !forms.length && !links.length) throw new Error(`${at}, item ${block.n}: a need that needs you holds a form or its https link`);
    const tag = nothing ? '' : `<span class="${open ? 'tag-outline' : 'tag'}">${open ? 'Needs you' : 'Ready'}</span> `;
    // The source's own separator went with the state, so the name keeps a colon before its detail.
    const words = nothing ? inline(nothing[0].trim()) + (rest ? ` ${inline(rest)}` : '') : `<b>${inline(state[1])}</b>${rest ? `: ${inline(rest)}` : ''}`;
    return `<li class="need card" id="need-${block.n}" data-need="${open ? 'needs' : nothing ? 'none' : 'ready'}"><p>${tag}`
      + `${words.replace(/<a href=/g, '<a target="_blank" rel="noopener noreferrer" href=')}</p>${forms.join('')}</li>`;
  }).join('\n')}\n</ol>`;
}

// A card's view: each picture, drawing, page, and live card side by side, labelled; a click opens one full screen.
// Tables and forms stay with the words.
function view(drawn) {
  const parts = drawn.flatMap(fence => fence.parts), seen = {};
  if (!parts.length) return '';
  for (const shown of parts) {
    seen[shown.label] = (seen[shown.label] ?? 0) + 1;
    if (seen[shown.label] > 1) shown.label += ` ${seen[shown.label]}`;
  }
  const tryIt = drawn.find(fence => fence.tryIt)?.tryIt;
  return `<div class="view"${tryIt ? ` data-try="${esc(tryIt)}"` : ''}><div class="stage">${parts.map(shown => `<figure class="part" data-kind="${shown.kind}">`
    + `<div class="clip">${shown.html}</div><figcaption>${esc(shown.label)}</figcaption></figure>`).join('')}</div></div>`;
}

// A sketch stands in for a real picture only with a line that names the step that failed.
function sketchOnly(block, ctx, warnings) {
  const sketch = block.drawings.find(fence => fence.lang === 'screen' || fence.lang === 'svg');
  if (!sketch || block.drawings.some(fence => fence.lang === 'picture') || /\bNo real picture:/i.test(block.text)) return;
  warnings.push(`${ctx.file} line ${sketch.at}: item ${block.n}: a screen sketch with no real picture: run the prototype with sample data, `
    + 'or add a line "No real picture: <the step that failed>"');
}

const PICTURE_KINDS = new Set(['ads', 'mermaid', 'svg', 'screen', 'picture', 'page']);
function changes(section, warnings, ctx) {
  let html = '', open = false, wide = false;
  for (const block of blocks(section, 'item')) {
    if (!block.n) { html += `${open ? '</ol>\n' : ''}<p class="aside">${inline(block.text)}</p>\n`; open = false; continue; }
    // Text drawings number lines across the item, tables their rows;
    // each picture, page version, and ad takes the next picture number.
    let first = 1, pictures = 0, rows = 1, lives = 0, questions = 1;
    const grouped = block.drawings.reduce((all, fence) => {
      if (fence.lang === 'ad' && all.at(-1)?.lang === 'ads') all.at(-1).fences.push(fence);
      else all.push(fence.lang === 'ad' ? { lang: 'ads', fences: [fence] } : fence);
      return all;
    }, []);
    const words = [], panels = [];
    for (const fence of grouped) {
      if (fence.lang === 'form') { const drawn = form(`item-${block.n}`, fence, questions, ctx, `item ${block.n}`); questions += drawn.count; words.push(drawn.html); }
      else if (fence.lang === 'table') { words.push(table(block, fence, rows)); rows += fence.lines.length - 2; }
      else if (fence.lang === 'ads') panels.push(ads(block, fence.fences, pictures + 1, ctx, warnings));
      else if (fence.lang === 'mermaid') panels.push(picture(block, fence, pictures + 1, warnings));
      else if (fence.lang === 'svg') panels.push(sketch(block, fence, pictures + 1, warnings));
      else if (fence.lang === 'screen') panels.push(screen(block, fence, pictures + 1, warnings));
      else if (fence.lang === 'picture') panels.push(photos(block, fence, pictures + 1, ctx, warnings));
      else if (fence.lang === 'page') panels.push(pages(block, fence, pictures + 1, ctx));
      else if (fence.lang === 'live') panels.push(live(block, fence, ++lives, ctx));
      else { panels.push(drawing(block, fence, first, warnings)); first += fence.lines.length; }
      if (PICTURE_KINDS.has(fence.lang)) pictures += panels.at(-1).parts.length;
    }
    sketchOnly(block, ctx, warnings);
    // A card has one Try it link; a later one is dropped, with a warning so an older plan still builds.
    for (const extra of panels.filter(panel => panel.tryIt).slice(1)) warnings.push(`${extra.tryAt}: a card takes one Try it; dropped ${extra.tryIt}`);
    const shown = view(panels), text = block.text.replace(/\s*\(review\.html#\/[^)]*\)\s*$/, '');
    wide ||= !!shown;
    html += `${open ? '' : '<ol class="items">\n'}<li class="item card${shown ? ' has-view' : ''}" id="item-${block.n}"><div class="words"><span class="num">${block.n}</span>`
      + `<div class="body"><div class="text" data-note="item-${block.n}" tabindex="0">${inline(text)}</div></div>${words.join('')}</div>${shown}</li>\n`;
    open = true;
  }
  return { html: html + (open ? '</ol>' : ''), wide };
}

// The decisions as a list, or null when there are none: a page then shows no Decisions section.
function decisions(section) {
  const items = section ? blocks(section, 'decision').filter(block => block.n) : [];
  if (!items.length) return null;
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

// Each kind's source file and headings: a plan's cards are its changes; other work lists the things to review.
const SOURCES = {
  plan: { file: 'proposal.md', list: 'What Changes', log: 'Decision log' },
  preview: { file: 'proposal.md', list: 'What Changes', log: null },
  review: { file: 'review.md', list: 'To review', log: 'Decisions' },
};

// The one frame every page shares: Why, the numbered cards, and the decisions only when there are some.
function render(markdown, warnings, root, kind) {
  const { file, list, log } = SOURCES[kind];
  const found = sections(markdown, file);
  if (!found.why) throw new Error(`${file}: missing ## Why`);
  if (!found[list.toLowerCase()]) throw new Error(`${file}: missing ## ${list}`);
  if (kind !== 'review') technical(found, warnings);
  const why = blocks(found.why, 'paragraph').map((block, i) => {
    if (block.drawings && block.drawings.length) throw new Error(`${file}: a drawing in ## Why; put drawings in ${list} bullets`);
    return `<p data-note="why-${i + 1}" tabindex="0">${inline(block.text)}</p>`;
  });
  const decided = log && decisions(found[log.toLowerCase()]);
  const ctx = { root, file, warnings }, needed = found['what the build needs'] && needs(found['what the build needs'], ctx);
  const cards = changes(found[list.toLowerCase()], warnings, ctx);
  return `<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>\n<div class="card">\n${why.join('\n')}\n</div></section>\n`
    + `<section id="changes"${cards.wide ? ' class="wide"' : ''} aria-labelledby="changes-h"><h2 id="changes-h">${list}</h2>\n${cards.html}\n</section>`
    + (needed ? `\n<section id="needs" aria-labelledby="needs-h"><h2 id="needs-h">What the build needs</h2>\n${needed}\n</section>` : '')
    + (decided ? `\n<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>\n${decided}\n</section>` : '');
}

// A review page's ask: its one `# ` line, above the first section.
function askOf(markdown) {
  const ask = /^# +(.+?)\s*$/m.exec(markdown.split(/^## /m)[0])?.[1];
  if (!ask) throw new Error('review.md: missing # <ask>, the one line the page asks, such as # Approve these 3 ads?');
  return ask;
}

// The plan as chat Markdown, from the same parse as the page: Why, each change numbered, and the assumed decisions.
// A chat shows no pictures, so Mermaid, SVG, screen, and picture fences point to the page; tables and text print.
const PICTURE_LANGS = new Set(['mermaid', 'svg', 'screen', 'picture']);
const PAGE_ONLY = { live: '   _(live page on the review page)_', page: '   _(page on the review page)_', form: '   _(questions on the review page)_' };
export function chatCopy(name, markdown) {
  const found = sections(markdown);
  if (!found.why || !found['what changes']) return '';
  const why = blocks(found.why, 'paragraph').map(block => block.text);
  const changes = blocks(found['what changes'], 'item').map(block => {
    if (!block.n) return block.text;
    const art = block.drawings.map(fence => {
      if (PICTURE_LANGS.has(fence.lang)) return '   _(picture on the review page)_';
      if (PAGE_ONLY[fence.lang]) return PAGE_ONLY[fence.lang];
      const body = fence.lang === 'table' ? fence.lines : ['```text', ...fence.lines, '```'];
      return body.map(line => (line ? `   ${line}` : '')).join('\n');
    });
    return [`${block.n}. ${block.text.replace(/\s*\(review\.html#\/[^)]*\)\s*$/, '')}`, ...art].join('\n\n');
  });
  const assumed = (found['decision log'] ? blocks(found['decision log'], 'decision') : [])
    .map(block => block.text.replace(/^\*\*\d{4}-\d{2}-\d{2}\*\*\s*[—–-]+\s*/, ''))
    .filter(text => text.startsWith('Assumed:'))
    .map(text => `- ${text.replace(/^Assumed:\s*(.)/, (m, c) => c.toUpperCase())}`);
  const needed = found['what the build needs'] ? blocks(found['what the build needs'], 'need').filter(block => block.n).map(block => `- ${block.text}`) : [];
  return [`**Plan: ${name}**`, '**Why**', ...why, '**What changes**', ...changes, ...(needed.length ? ['**What the build needs**', needed.join('\n')] : []),
    ...(assumed.length ? ['**Assumed for you**', assumed.join('\n')] : [])].join('\n\n');
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

// Each kind's bar buttons: name, label, and what the page says once the chat has it; a `confirm` asks first.
const LIVE = "This goes live and can't be undone.";
const KIT_ACTIONS = {
  plan: [{ name: 'build', label: 'Build it', done: 'Asked the chat to build.' },
    { name: 'publish', label: 'Build and publish', done: 'Asked the chat to build and publish.', confirm: { say: "Goes live, can't be undone.", yes: 'Yes, publish', ask: `Build and publish? ${LIVE}` } }],
  preview: [{ name: 'publish', label: 'Publish', done: 'Asked the chat to publish.', confirm: { say: "Goes live, can't be undone.", yes: 'Yes, publish', ask: `Publish? ${LIVE}` } }],
};

export function assemble(name, content, kit = readFileSync(kitPath, 'utf8'), kind = 'plan', { ask, header, actions = KIT_ACTIONS[kind] ?? [] } = {}) {
  one(kit, SLOT, 'review kit');
  if (!kit.includes('CHANGE-NAME')) throw new Error('review kit: missing CHANGE-NAME');
  if ((kit.match(/<script\b/g) || []).length !== 1 || (kit.match(/<style\b/g) || []).length !== 1) {
    throw new Error('review kit: expected one <script> and one <style>');
  }
  one(kit, LOOK, 'review kit');
  one(kit, THEME, 'review kit');
  one(kit, READY, 'review kit');
  // The app's colours and parts go in the kit's one <style>, and the switch in <head>, so a saved dark choice applies
  // before the first paint; a function replacement keeps any `$` in them literal.
  const theme = `<script>\n${readFileSync(themePath, 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`;
  let [before, after] = kit.replace(LOOK, () => lookCss()).replace(THEME, () => theme).split(SLOT);
  // The kit reads the kind for its words, and draws the bar from the page's own buttons.
  if (kind !== 'plan') before = before.replace('<body ', `<body data-kind="${kind}" `);
  if (header) before = before.replace('<body ', `<body data-header="${esc(header)}" `);
  if (ask) before = before.replace('<title>Review · CHANGE-NAME', () => `<title>Review · ${esc(ask)}`).replace('<h1>CHANGE-NAME</h1>', () => `<h1>${esc(ask)}</h1>`).replace('href="#changes">Changes', 'href="#changes">To review');
  if (!content.includes('<section id="decisions"')) before = before.replace('<li><a href="#decisions">Decisions</a></li>', '');
  if (!content.includes('<section id="needs"')) before = before.replace('<li><a href="#needs">Needs</a></li>', '');
  after = after.replace(READY, () => `<div id="ready" data-actions="${esc(JSON.stringify(actions))}" hidden>`);
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
// A review page of other work: its buttons are its own.
export const WORK_ON_PAGE = 'Look it over, then tap a button or Send notes on its page.';
export const WORK_IN_CHAT = 'Look it over, then tell me your choice or paste your notes here.';

// The chat line an agent copies as printed: a path with a space or parenthesis goes in <…> so the link still parses.
export function planLink(page, what = 'the plan') {
  return `Click here to see ${what}: [review.html](${/[\s()]/.test(page) ? `<${page}>` : page})`;
}

// The fixed first line of sent and copied notes; the kit writes the same words.
export const notesHeader = name => `Notes on the plan ${name} from the review page. Don't build yet.`;
export const workNotesHeader = ask => `Notes on the review page "${ask.slice(0, 200)}". Don't go on yet.`;

// A preview page's line and its one button: the build is done, so only publishing or changing it is left.
export const previewNotesHeader = name => `Notes on the preview of ${name} from its review page. Don't publish yet.`;
export const previewActions = name => ({
  publish: `Publish: run /ship for the plan ${name}. Chosen on its preview page. Apply any attached notes first, then continue without another publish choice.`,
});

// What each button on a live page tells the chat: the person's build choice, made on the page.
export const planActions = name => ({
  build: `Build it now: run /apply for the plan ${name}. Chosen on its review page. Apply any attached review notes to this plan first, then continue without another build choice.`,
  publish: `Build and publish: run /ship for the plan ${name}. Chosen on its review page. Apply any attached review notes to this plan first, then continue without another build choice.`,
});

// A review page's own buttons: `<name>=<label>|<message>`, 6 at most; a --confirm name asks once more on the page.
// The page's bar uses yes, cancel, and send for itself.
const ACTION_NAME = /^[a-z][a-z0-9-]{0,30}$/;
export function workActions(pairs = [], confirm = []) {
  if (pairs.length > 6) throw new Error('--action: 6 at most');
  const actions = pairs.map(pair => {
    const [, name, label, message] = /^([^=]*)=([^|]*)\|(.*)$/s.exec(pair) ?? [];
    if (!ACTION_NAME.test(name ?? '') || ['yes', 'cancel', 'send'].includes(name)) throw new Error(`--action takes "<name>=<label>|<message>", a lowercase name other than yes, cancel, or send: ${pair}`);
    if (!label.trim() || label.length > 40 || !message.trim() || /[\r\n]/.test(message) || message.length > 300) {
      throw new Error(`--action ${name}: a label of 40 characters at most and a one-line message of 300 at most`);
    }
    const text = label.trim(), lower = text[0].toLowerCase() + text.slice(1);
    return { name, label: text, message: message.trim(), done: `Sent to the chat: ${text}.`,
      ...(confirm.includes(name) && { confirm: { say: "Can't be undone.", yes: `Yes, ${lower}`, ask: `${text}? This can't be undone.` } }) };
  });
  const names = actions.map(action => action.name);
  if (new Set(names).size !== names.length) throw new Error('--action: each name once');
  const unknown = confirm.find(name => !names.includes(name));
  if (unknown) throw new Error(`--confirm ${unknown} names no --action`);
  return actions;
}

// The page's reply link when one can open, else its file.
async function linked(page, header, actions) {
  const { openReplyLink } = await import('../../hand-over/scripts/reply-link.mjs');
  return (await openReplyLink({ file: page, header, ...(actions && { actions }) })) ?? page;
}

export function buildReview(changeRoot, { requireCurrent = false, kind = 'plan', actions } = {}) {
  const sourcePath = join(changeRoot, SOURCES[kind].file);
  const reviewPath = join(changeRoot, 'review.html');
  if (!existsSync(sourcePath)) throw new Error(`missing ${sourcePath}`);
  // The Inbox keeps a page's notes under its folder name only when the name fits `[\w-]{1,100}`.
  const name = basename(resolve(changeRoot));
  if (kind === 'review' && !/^[\w-]{1,100}$/.test(name)) throw new Error(`a review folder name is letters, digits, - and _, up to 100: ${name}`);
  const markdown = readFileSync(sourcePath, 'utf8');
  const page = existsSync(reviewPath) ? readFileSync(reviewPath, 'utf8') : null;
  if (page === null && !requireCurrent && kind !== 'review') return { kind: 'no-page', changed: false, warnings: [] };
  if (page !== null && !page.startsWith(FORMAT) && kind !== 'review') {
    return { kind: 'proposal-only', changed: writeIfDifferent(reviewPath, legacyRefresh(page, markdown)), warnings: [] };
  }
  const warnings = [];
  const ask = kind === 'review' ? askOf(markdown) : undefined;
  const extra = kind === 'review' ? { ask, header: workNotesHeader(ask), actions: actions.map(({ message: _message, ...shown }) => shown) } : {};
  const next = assemble(name, render(markdown, warnings, changeRoot, kind), undefined, kind, extra);
  const size = Buffer.byteLength(next);
  if (size > PAGE_MAX) throw new Error(`the page is ${Math.ceil(size / KB)} KB; keep a page under 1.5 MB so the Inbox takes it: show fewer pictures, or ${SMALLER}`);
  if (size > PAGE_WARN) warnings.push(`the page is ${Math.ceil(size / KB)} KB; a page over 800 KB is slow on a phone: show fewer pictures, or ${SMALLER}`);
  return { kind: 'current', changed: writeIfDifferent(reviewPath, next), warnings, ...(ask && { ask }) };
}

// A review page of other work: built every time, its link carrying its own buttons' messages.
async function printWork(root, values) {
  const actions = workActions(values.action, values.confirm);
  const result = buildReview(root, { kind: 'review', actions });
  for (const warning of result.warnings) console.error(`review: warning: ${warning}`);
  console.log(`review: ${result.kind}, ${result.changed ? 'updated' : 'unchanged'}`);
  const page = resolve(root, 'review.html');
  const messages = Object.fromEntries(actions.map(action => [action.name, action.message]));
  const link = values.link ? await linked(page, workNotesHeader(result.ask), messages) : page;
  console.log(`${planLink(link, 'the review')}\n\n${link === page ? WORK_IN_CHAT : WORK_ON_PAGE}`);
}

if (isMain(import.meta.url)) {
  let args;
  try {
    args = parseArgs({ options: { 'require-current': { type: 'boolean' }, link: { type: 'boolean' }, help: { type: 'boolean' },
      kind: { type: 'string' }, action: { type: 'string', multiple: true }, confirm: { type: 'string', multiple: true } }, allowPositionals: true, strict: true });
  } catch (error) { console.error(`${error.message}\n${USAGE}`); process.exit(2); }
  const [root, ...extra] = args.positionals;
  const { kind = 'plan' } = args.values;
  if (args.values.help) console.log(USAGE);
  else if (!root || extra.length || !['plan', 'review'].includes(kind) || (kind === 'plan' && (args.values.action || args.values.confirm))) { console.error(USAGE); process.exitCode = 2; }
  else if (kind === 'review') {
    try { await printWork(root, args.values); } catch (error) { console.error(`review: ${error.message}`); process.exitCode = 1; }
  } else {
    try {
      const result = buildReview(root, { requireCurrent: args.values['require-current'] === true });
      for (const warning of result.warnings) console.error(`review: warning: ${warning}`);
      console.log(`review: ${result.kind}, ${result.changed ? 'updated' : 'unchanged'}`);
      const page = resolve(root, 'review.html');
      const name = basename(resolve(root));
      // A shipped plan's link is its saved file: a live page would wait on the person again, with build buttons.
      const shipped = /[\\/]openspec[\\/]changes[\\/]archive[\\/]/.test(page);
      const link = args.values.link && result.kind === 'current' && !shipped ? await linked(page, notesHeader(name), planActions(name)) : page;
      const next = link === page ? REVIEW_IN_CHAT : REVIEW_ON_PAGE;
      const copy = result.kind === 'current' ? chatCopy(name, readFileSync(join(root, 'proposal.md'), 'utf8')) : '';
      // The link comes first: a chat that folds a long reply would hide a link at its end.
      if (result.kind !== 'no-page') console.log([planLink(link), copy, next].filter(Boolean).join('\n\n'));
    } catch (error) { console.error(`review: ${error.message}`); process.exitCode = 1; }
  }
}
