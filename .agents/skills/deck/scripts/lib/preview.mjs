// The deck's page: each slide drawn as SVG from the same layout as the file, a Download button holding the file,
// and a box whose text goes to the chat when the page is open at a reply link.
import { lookCss } from '../../../plan/scripts/look.mjs';
import { COLORS, SLIDE, escapeXml, fitText, lineHeight } from './pptx.mjs';

const PX = 96;
const px = inches => Math.round(inches * PX * 100) / 100;
const paint = color => color ? `#${color}` : 'none';

function textSvg(shape) {
  const { lines } = fitText(shape);
  const step = lineHeight(shape.size);
  const block = lines.length * step;
  const top = shape.anchor === 'ctr' ? shape.y + (shape.h - block) / 2 : shape.anchor === 'b' ? shape.y + shape.h - shape.inset - block : shape.y + shape.inset;
  const x = shape.align === 'ctr' ? shape.x + shape.w / 2 : shape.x + shape.inset;
  const style = `font-size="${px(shape.size / 72)}" fill="#${shape.color}"${shape.bold ? ' font-weight="700"' : ''}${shape.strike ? ' text-decoration="line-through"' : ''}`;
  const spans = lines.map((line, at) => `<tspan x="${px(x)}" y="${px(top + at * step + (shape.size / 72) * 0.95)}">${escapeXml(line)}</tspan>`).join('');
  return `<text text-anchor="${shape.align === 'ctr' ? 'middle' : 'start'}" ${style}>${spans}</text>`;
}

function shapeSvg(shape) {
  if (shape.kind === 'arrow') {
    return `<line x1="${px(shape.x1)}" y1="${px(shape.y1)}" x2="${px(shape.x2)}" y2="${px(shape.y2)}" stroke="#${shape.color}" stroke-width="2.3" marker-end="url(#head)"/>`;
  }
  const radius = shape.geom === 'roundRect' ? px((Math.min(shape.w, shape.h) * shape.radius) / 100000) : 0;
  const frame = shape.kind === 'box'
    ? `<rect x="${px(shape.x)}" y="${px(shape.y)}" width="${px(shape.w)}" height="${px(shape.h)}" rx="${radius}" fill="${paint(shape.fill)}"`
      + ` stroke="${paint(shape.line)}" stroke-width="2"${shape.dash ? ' stroke-dasharray="8 6"' : ''}/>`
    : '';
  return frame + (shape.text ? textSvg(shape) : '');
}

/** One slide as an SVG drawing, 96 units to the inch. */
export function slideSvg(slide, index) {
  const head = `<defs><marker id="head" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">`
    + `<path d="M0 0L10 5L0 10z" fill="#${COLORS.muted}"/></marker></defs>`;
  return `<svg viewBox="0 0 ${px(SLIDE.w)} ${px(SLIDE.h)}" role="img" aria-label="Slide ${index + 1}" font-family="Arial, Helvetica, sans-serif">${head}`
    + `<rect width="100%" height="100%" fill="#${COLORS.bg}"/>${slide.shapes.map(shapeSvg).join('')}</svg>`;
}

const STYLE = 'body{margin:0;line-height:1.5}main{max-width:64rem;margin:0 auto;padding:1.5rem 1rem 4rem}'
  + 'header{display:flex;flex-wrap:wrap;gap:.75rem;align-items:center;justify-content:space-between;margin-bottom:1.5rem}h1{margin:0;font-size:1.5rem}'
  + 'figure{margin:0 0 1.5rem}svg{display:block;width:100%;height:auto;border-radius:.5rem;border:1px solid var(--border)}'
  + 'figcaption{margin-top:.5rem;color:var(--muted-foreground);font-size:.875rem;white-space:pre-wrap}'
  + 'form{display:grid;gap:.5rem}textarea{min-height:7rem;font:inherit;padding:.5rem;border-radius:.5rem;border:1px solid var(--border);background:var(--card);color:inherit}'
  + 'a.btn{text-decoration:none}.muted{color:var(--muted-foreground)}';

// The page's own script: send the box's text through the reply link, or copy it when no link is open.
const SCRIPT = `const key = new URLSearchParams(location.hash.slice(1)).get('key');
const form = document.getElementById('changes'), box = form.querySelector('textarea'), status = document.getElementById('status');
if (!key) form.querySelector('button').textContent = 'Copy changes';
async function send(text) {
  try {
    const response = await fetch('send', { method: 'POST', headers: { 'content-type': 'application/json', 'x-reply-key': key }, body: JSON.stringify({ text }) });
    return response.ok && (await response.json()).sent === true;
  } catch { return false; }
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  const text = box.value.trim();
  if (!text) return;
  if (key && await send(text)) {
    status.textContent = 'Sent. Reload this page when the chat says the deck is ready.';
    box.value = '';
    return;
  }
  try { await navigator.clipboard.writeText(text); status.textContent = 'Copied your changes: paste them into the chat.'; }
  catch { status.textContent = 'Copy your changes from the box and paste them into the chat.'; }
});`;

/** The deck's page, with every slide, its notes, the file to download as `file`, and the changes box. */
export function previewHtml(deck, slides, bytes, file) {
  const figures = slides.map((slide, at) => `<figure>${slideSvg(slide, at)}`
    + `<figcaption>Slide ${at + 1}${slide.notes ? `: ${escapeXml(slide.notes)}` : ''}</figcaption></figure>`).join('\n');
  const href = `data:application/vnd.openxmlformats-officedocument.presentationml.presentation;base64,${Buffer.from(bytes).toString('base64')}`;
  return `<!doctype html><html lang="en" class="dark"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<title>${escapeXml(deck.title)}</title><style>${lookCss()}${STYLE}</style></head><body><main>`
    + `<header><div><h1>${escapeXml(deck.title)}</h1><span class="muted">${slides.length} slides</span></div>`
    + `<a class="btn btn-primary" download="${escapeXml(file)}" href="${href}">Download</a></header>\n${figures}\n`
    + '<form id="changes"><label for="change-text">Changes to the deck</label><textarea id="change-text" placeholder="Slide 3: shorter title"></textarea>'
    + '<div><button class="btn-primary" type="submit">Send changes</button></div><p id="status" class="muted" role="status"></p></form>'
    + `</main><script>${SCRIPT}</script></body></html>\n`;
}
