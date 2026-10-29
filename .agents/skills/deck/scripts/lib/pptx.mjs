// A deck outline laid out as shapes in inches, and those shapes written as a PowerPoint file.
// The preview draws from the same layout, so it shows what the file holds.
import { zip } from './zip.mjs';

const EMU = 914400;
/** A 16:9 slide, in inches. */
export const SLIDE = { w: 12192000 / EMU, h: 6858000 / EMU };
export const COLORS = { bg: '0A0A0A', text: 'FFFFFF', muted: 'A3A3A3', card: '1C1C1C', line: '3A3A3A', mint: '86D5C1', blue: '93C5FD', purple: 'C4B5FD' };
export const NODE_COLORS = ['gray', 'mint', 'blue', 'purple'];
export const NODE_STYLES = ['box', 'pill', 'dashed', 'crossed'];
const FONT = 'Arial';
const PICTURE = { x: 5.9, y: 2.6, w: 6.53, h: 4.2 };

/** `text`'s paragraphs wrapped at `perLine` characters; `long` is true when one word is wider than a line. */
export function wrapLines(text, perLine) {
  const lines = [];
  let long = false;
  for (const paragraph of String(text).split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (word.length > perLine) long = true;
      if (line && line.length + 1 + word.length > perLine) {
        lines.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    lines.push(line);
  }
  return { lines, long };
}

/** Line height and average character width, in inches, for a size in points. */
export const lineHeight = size => (size * 1.2) / 72;
const charWidth = (size, bold) => ((bold ? 0.6 : 0.55) * size) / 72;

/** The text's lines inside its shape, and whether they likely spill out of it. */
export function fitText(shape) {
  const inner = shape.w - 2 * shape.inset;
  const { lines, long } = wrapLines(shape.text, Math.max(1, Math.floor(inner / charWidth(shape.size, shape.bold))));
  const room = Math.floor((shape.h - 2 * shape.inset) / lineHeight(shape.size) + 0.01);
  return { lines, overflows: long || lines.length > room };
}

const text = (x, y, w, h, value, size, extra = {}) => ({ kind: 'text', x, y, w, h, text: value, size, color: COLORS.text, align: 'l', anchor: 't', inset: 0.04, ...extra });
const box = (x, y, w, h, extra = {}) => ({ kind: 'box', x, y, w, h, text: '', size: 16, color: COLORS.text, align: 'ctr', anchor: 'ctr', inset: 0.08, geom: 'rect', ...extra });

/** A node's fill, line and text colours for its colour and style. */
function nodeLook(node) {
  const accent = COLORS[node.color] ?? null;
  const style = node.style ?? 'box';
  if (style === 'crossed') return { fill: null, line: COLORS.line, color: COLORS.muted, strike: true };
  if (style === 'dashed') return { fill: null, line: accent ?? COLORS.muted, dash: true, color: COLORS.text };
  return accent ? { fill: accent, line: null, color: COLORS.bg } : { fill: COLORS.card, line: COLORS.muted, color: COLORS.text };
}

/** Each node's box on the picture's grid, keyed by id: cells shrink to fit, and the grid sits centred. */
function placeNodes(nodes) {
  const cols = Math.max(...nodes.map(node => node.col + (node.span ?? 1)));
  const rows = Math.max(...nodes.map(node => node.row)) + 1;
  const cellW = Math.min(PICTURE.w / cols, 3.3);
  const cellH = Math.min(PICTURE.h / rows, 1.8);
  const left = PICTURE.x + (PICTURE.w - cellW * cols) / 2;
  const top = PICTURE.y + (PICTURE.h - cellH * rows) / 2;
  const gapX = Math.min(0.75, cellW * 0.35);
  const boxH = Math.min(1.3, cellH * 0.7);
  const size = cols >= 3 ? 14 : 16;
  return new Map(nodes.map(node => {
    const look = nodeLook(node);
    const shape = box(left + node.col * cellW + gapX / 2, top + node.row * cellH + (cellH - boxH) / 2, cellW * (node.span ?? 1) - gapX, boxH, {
      text: node.text, size, color: look.color, fill: look.fill, line: look.line, dash: look.dash, strike: look.strike,
      geom: 'roundRect', radius: node.style === 'pill' ? 50000 : 16000, bold: Boolean(look.fill) });
    return [node.id, shape];
  }));
}

/** The connection sites where `from` and `to` face each other: 0 top, 1 left, 2 bottom, 3 right, in PowerPoint. */
function sites(from, to) {
  const dx = (to.x + to.w / 2) - (from.x + from.w / 2);
  const dy = (to.y + to.h / 2) - (from.y + from.h / 2);
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? [3, 1] : [1, 3];
  return dy >= 0 ? [2, 0] : [0, 2];
}
const sitePoint = (shape, site) => [
  [shape.x + shape.w / 2, shape.y], [shape.x, shape.y + shape.h / 2], [shape.x + shape.w / 2, shape.y + shape.h], [shape.x + shape.w, shape.y + shape.h / 2],
][site];

/** An arrow from one node's facing edge to the other's, and its label beside the line. */
function arrowShapes(arrow, from, to) {
  const [fromSite, toSite] = sites(from, to);
  const [x1, y1] = sitePoint(from, fromSite);
  const [x2, y2] = sitePoint(to, toSite);
  const line = { kind: 'arrow', x1, y1, x2, y2, from, fromSite, to, toSite, color: COLORS.muted };
  if (!arrow.text) return [line];
  const midX = (x1 + x2) / 2, midY = (y1 + y2) / 2;
  const across = fromSite === 3 || fromSite === 1;
  const label = across
    ? text(Math.min(x1, x2), midY - 0.34, Math.abs(x2 - x1), 0.3, arrow.text, 11, { color: COLORS.muted, align: 'ctr', anchor: 'b', inset: 0.02 })
    : text(midX + 0.08, midY - 0.15, 2.0, 0.3, arrow.text, 11, { color: COLORS.muted });
  return [line, label];
}

function pictureSlide(slide) {
  const nodes = placeNodes(slide.picture.nodes);
  return [
    text(0.6, 0.45, 12.13, 0.9, slide.title, 36, { bold: true }),
    box(0.6, 1.45, 0.8, 0.06, { fill: COLORS.mint }),
    text(0.6, 1.9, 4.6, 4.9, slide.problem ?? '', 26),
    box(5.6, 1.8, 7.13, 5.2, { geom: 'roundRect', radius: 4000, fill: COLORS.card, line: COLORS.line }),
    text(5.9, 2.0, 6.53, 0.4, slide.picture.label ?? '', 14, { bold: true, color: COLORS.mint }),
    ...nodes.values(),
    ...(slide.picture.arrows ?? []).flatMap(arrow => arrowShapes(arrow, nodes.get(arrow.from), nodes.get(arrow.to))),
  ];
}

function titleSlide(slide) {
  return [
    box(0.9, 1.95, 1.0, 0.08, { fill: COLORS.mint }),
    text(0.9, 2.2, 11.5, 1.8, slide.title, 48, { bold: true }),
    text(0.9, 4.1, 11.5, 1.2, slide.subtitle ?? '', 24, { color: COLORS.muted }),
  ];
}

/** Every slide's shapes, in inches, with its notes and a warning for each label that likely spills out of its box. */
export function layout(deck) {
  return deck.slides.map((slide, index) => {
    const shapes = (slide.picture ? pictureSlide(slide) : titleSlide(slide)).filter(shape => shape.kind !== 'text' || shape.text);
    shapes.forEach((shape, at) => { shape.id = at + 2; });
    const warnings = shapes.filter(shape => shape.text && fitText(shape).overflows)
      .map(shape => `slide ${index + 1}: "${shape.text}" may not fit its box; shorten it`);
    return { shapes, notes: slide.notes ?? '', warnings };
  });
}

// The rest writes the file. XML 1.0 can't hold most control characters, so they go.
export const escapeXml = value => String(value).replace(/[^\t\n\r -퟿-�\u{10000}-\u{10FFFF}]/gu, '')
  .replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]);
const emu = inches => Math.round(inches * EMU);
const NS = 'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"';
const XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CT = 'application/vnd.openxmlformats-officedocument.presentationml';
const solid = color => `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`;
const TREE_TOP = '<p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>'
  + '<p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>';

function rels(list) {
  const items = list.map(([id, type, target]) => `<Relationship Id="${id}" Type="${type.startsWith('http') ? type : `${REL}/${type}`}" Target="${target}"/>`);
  return `${XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${items.join('')}</Relationships>`;
}

function paragraphs(shape) {
  const run = `<a:rPr lang="en-US" sz="${shape.size * 100}"${shape.bold ? ' b="1"' : ''}${shape.strike ? ' strike="sngStrike"' : ''} dirty="0">`
    + `${solid(shape.color)}<a:latin typeface="${FONT}"/><a:cs typeface="${FONT}"/></a:rPr>`;
  return String(shape.text).split('\n').map(line => `<a:p><a:pPr algn="${shape.align}"/>`
    + (line ? `<a:r>${run}<a:t>${escapeXml(line)}</a:t></a:r>` : '')
    + `<a:endParaRPr lang="en-US" sz="${shape.size * 100}" dirty="0"/></a:p>`).join('');
}

function shapeXml(shape) {
  const at = `<a:xfrm><a:off x="${emu(shape.x)}" y="${emu(shape.y)}"/><a:ext cx="${emu(shape.w)}" cy="${emu(shape.h)}"/></a:xfrm>`;
  const geom = shape.geom === 'roundRect' ? `<a:prstGeom prst="roundRect"><a:avLst><a:gd name="adj" fmla="val ${shape.radius}"/></a:avLst></a:prstGeom>` : '<a:prstGeom prst="rect"><a:avLst/></a:prstGeom>';
  const fill = shape.fill ? solid(shape.fill) : '<a:noFill/>';
  const line = shape.line ? `<a:ln w="19050">${solid(shape.line)}${shape.dash ? '<a:prstDash val="dash"/>' : ''}</a:ln>` : '<a:ln><a:noFill/></a:ln>';
  const inset = emu(shape.inset);
  const body = `<p:txBody><a:bodyPr wrap="square" lIns="${inset}" tIns="${inset}" rIns="${inset}" bIns="${inset}" anchor="${shape.anchor}" rtlCol="0"><a:noAutofit/></a:bodyPr>`
    + `<a:lstStyle/>${paragraphs(shape)}</p:txBody>`;
  const kind = shape.kind === 'text' ? 'Text' : 'Shape';
  return `<p:sp><p:nvSpPr><p:cNvPr id="${shape.id}" name="${kind} ${shape.id}"/><p:cNvSpPr${shape.kind === 'text' ? ' txBox="1"' : ''}/><p:nvPr/></p:nvSpPr>`
    + `<p:spPr>${at}${geom}${fill}${line}</p:spPr>${body}</p:sp>`;
}

function arrowXml(shape) {
  const flip = `${shape.x2 < shape.x1 ? ' flipH="1"' : ''}${shape.y2 < shape.y1 ? ' flipV="1"' : ''}`;
  const at = `<a:xfrm${flip}><a:off x="${emu(Math.min(shape.x1, shape.x2))}" y="${emu(Math.min(shape.y1, shape.y2))}"/>`
    + `<a:ext cx="${emu(Math.abs(shape.x2 - shape.x1))}" cy="${emu(Math.abs(shape.y2 - shape.y1))}"/></a:xfrm>`;
  return `<p:cxnSp><p:nvCxnSpPr><p:cNvPr id="${shape.id}" name="Arrow ${shape.id}"/><p:cNvCxnSpPr>`
    + `<a:stCxn id="${shape.from.id}" idx="${shape.fromSite}"/><a:endCxn id="${shape.to.id}" idx="${shape.toSite}"/></p:cNvCxnSpPr><p:nvPr/></p:nvCxnSpPr>`
    + `<p:spPr>${at}<a:prstGeom prst="straightConnector1"><a:avLst/></a:prstGeom>`
    + `<a:ln w="22225">${solid(shape.color)}<a:tailEnd type="triangle" w="med" len="med"/></a:ln></p:spPr></p:cxnSp>`;
}

const slideXml = shapes => `${XML}<p:sld ${NS}><p:cSld><p:spTree>${TREE_TOP}`
  + `${shapes.map(shape => shape.kind === 'arrow' ? arrowXml(shape) : shapeXml(shape)).join('')}</p:spTree></p:cSld>`
  + '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>';

const notesXml = notes => `${XML}<p:notes ${NS}><p:cSld><p:spTree>${TREE_TOP}`
  + '<p:sp><p:nvSpPr><p:cNvPr id="2" name="Slide Image 1"/><p:cNvSpPr><a:spLocks noGrp="1" noRot="1" noChangeAspect="1"/></p:cNvSpPr><p:nvPr><p:ph type="sldImg"/></p:nvPr></p:nvSpPr><p:spPr/></p:sp>'
  + '<p:sp><p:nvSpPr><p:cNvPr id="3" name="Notes 2"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr><p:nvPr><p:ph type="body" idx="1"/></p:nvPr></p:nvSpPr><p:spPr/>'
  + `<p:txBody><a:bodyPr/><a:lstStyle/>${notes.split('\n').map(line => `<a:p>${line ? `<a:r><a:rPr lang="en-US" dirty="0"/><a:t>${escapeXml(line)}</a:t></a:r>` : ''}</a:p>`).join('')}</p:txBody></p:sp>`
  + '</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:notes>';

function theme(name) {
  const scheme = { dk1: COLORS.bg, lt1: COLORS.text, dk2: COLORS.card, lt2: COLORS.muted, accent1: COLORS.mint, accent2: COLORS.blue, accent3: COLORS.purple,
    accent4: COLORS.muted, accent5: COLORS.line, accent6: COLORS.text, hlink: COLORS.blue, folHlink: COLORS.purple };
  const fills = `${solid(COLORS.card)}${solid(COLORS.card)}${solid(COLORS.card)}`;
  const lines = [6350, 12700, 19050].map(w => `<a:ln w="${w}">${solid(COLORS.line)}</a:ln>`).join('');
  return `${XML}<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="${name}"><a:themeElements>`
    + `<a:clrScheme name="WongStack">${Object.entries(scheme).map(([key, value]) => `<a:${key}><a:srgbClr val="${value}"/></a:${key}>`).join('')}</a:clrScheme>`
    + `<a:fontScheme name="WongStack"><a:majorFont><a:latin typeface="${FONT}"/><a:ea typeface=""/><a:cs typeface=""/></a:majorFont>`
    + `<a:minorFont><a:latin typeface="${FONT}"/><a:ea typeface=""/><a:cs typeface=""/></a:minorFont></a:fontScheme>`
    + `<a:fmtScheme name="WongStack"><a:fillStyleLst>${fills}</a:fillStyleLst><a:lnStyleLst>${lines}</a:lnStyleLst>`
    + '<a:effectStyleLst><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle><a:effectStyle><a:effectLst/></a:effectStyle></a:effectStyleLst>'
    + `<a:bgFillStyleLst>${fills}</a:bgFillStyleLst></a:fmtScheme></a:themeElements><a:objectDefaults/><a:extraClrSchemeLst/></a:theme>`;
}

const CLR_MAP = 'accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"';
const level = size => `<a:lvl1pPr><a:defRPr sz="${size}"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr>`;
const MASTER = `${XML}<p:sldMaster ${NS}><p:cSld><p:bg><p:bgPr>${solid(COLORS.bg)}<a:effectLst/></p:bgPr></p:bg><p:spTree>${TREE_TOP}</p:spTree></p:cSld>`
  + `<p:clrMap bg1="dk1" tx1="lt1" bg2="dk2" tx2="lt2" ${CLR_MAP}/>`
  + '<p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>'
  + `<p:txStyles><p:titleStyle>${level(4400)}</p:titleStyle><p:bodyStyle>${level(2000)}</p:bodyStyle><p:otherStyle>${level(1800)}</p:otherStyle></p:txStyles></p:sldMaster>`;
const LAYOUT = `${XML}<p:sldLayout ${NS} type="blank" preserve="1"><p:cSld name="Blank"><p:spTree>${TREE_TOP}</p:spTree></p:cSld>`
  + '<p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sldLayout>';
const placeholder = (id, name, type, [x, y, w, h], extra = '') => `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>`
  + `<p:nvPr><p:ph type="${type}"${type === 'body' ? ' idx="1"' : ''}/></p:nvPr></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm>`
  + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></p:spPr>${extra}</p:sp>`;
const NOTES_MASTER = `${XML}<p:notesMaster ${NS}><p:cSld><p:bg><p:bgPr>${solid('FFFFFF')}<a:effectLst/></p:bgPr></p:bg><p:spTree>${TREE_TOP}`
  + placeholder(2, 'Slide Image 1', 'sldImg', [1143000, 685800, 4572000, 2571750])
  + placeholder(3, 'Notes 2', 'body', [685800, 3429000, 5486400, 4114800], '<p:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr lang="en-US"/></a:p></p:txBody>')
  + `</p:spTree></p:cSld><p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" ${CLR_MAP}/>`
  + `<p:notesStyle><a:lvl1pPr marL="0" algn="l"><a:defRPr sz="1200"><a:solidFill><a:schemeClr val="tx1"/></a:solidFill><a:latin typeface="+mn-lt"/></a:defRPr></a:lvl1pPr></p:notesStyle></p:notesMaster>`;

function presentation(count) {
  const ids = Array.from({ length: count }, (_, at) => `<p:sldId id="${256 + at}" r:id="rId${10 + at}"/>`).join('');
  return `${XML}<p:presentation ${NS} saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>`
    + `<p:notesMasterIdLst><p:notesMasterId r:id="rId2"/></p:notesMasterIdLst><p:sldIdLst>${ids}</p:sldIdLst>`
    + '<p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>';
}

function contentTypes(count, notes) {
  const part = (name, type) => `<Override PartName="${name}" ContentType="${type}"/>`;
  return `${XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">`
    + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
    + part('/ppt/presentation.xml', `${CT}.presentation.main+xml`) + part('/ppt/slideMasters/slideMaster1.xml', `${CT}.slideMaster+xml`)
    + part('/ppt/slideLayouts/slideLayout1.xml', `${CT}.slideLayout+xml`) + part('/ppt/notesMasters/notesMaster1.xml', `${CT}.notesMaster+xml`)
    + part('/ppt/theme/theme1.xml', 'application/vnd.openxmlformats-officedocument.theme+xml') + part('/ppt/theme/theme2.xml', 'application/vnd.openxmlformats-officedocument.theme+xml')
    + part('/ppt/presProps.xml', `${CT}.presProps+xml`) + part('/ppt/tableStyles.xml', `${CT}.tableStyles+xml`)
    + Array.from({ length: count }, (_, at) => part(`/ppt/slides/slide${at + 1}.xml`, `${CT}.slide+xml`)).join('')
    + notes.map(at => part(`/ppt/notesSlides/notesSlide${at}.xml`, `${CT}.notesSlide+xml`)).join('')
    + part('/docProps/core.xml', 'application/vnd.openxmlformats-package.core-properties+xml')
    + part('/docProps/app.xml', 'application/vnd.openxmlformats-officedocument.extended-properties+xml') + '</Types>';
}

function docProps(deck, slides, date) {
  const when = date.toISOString().replace(/\.\d+Z$/, 'Z');
  const core = `${XML}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"`
    + ' xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    + `<dc:title>${escapeXml(deck.title)}</dc:title>${deck.subtitle ? `<dc:subject>${escapeXml(deck.subtitle)}</dc:subject>` : ''}<dc:creator>WongStack</dc:creator>`
    + `<dcterms:created xsi:type="dcterms:W3CDTF">${when}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${when}</dcterms:modified></cp:coreProperties>`;
  const app = `${XML}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">`
    + `<Application>WongStack</Application><Slides>${slides.length}</Slides><Notes>${slides.filter(slide => slide.notes).length}</Notes></Properties>`;
  return { core, app };
}

/** The deck as a .pptx file's bytes, from its laid-out `slides`. */
export function pptx(deck, slides, date = new Date()) {
  const noted = slides.flatMap((slide, at) => slide.notes ? [at + 1] : []);
  const { core, app } = docProps(deck, slides, date);
  const files = [
    ['[Content_Types].xml', contentTypes(slides.length, noted)],
    ['_rels/.rels', rels([['rId1', 'officeDocument', 'ppt/presentation.xml'],
      ['rId2', 'http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties', 'docProps/core.xml'], ['rId3', 'extended-properties', 'docProps/app.xml']])],
    ['docProps/core.xml', core],
    ['docProps/app.xml', app],
    ['ppt/presentation.xml', presentation(slides.length)],
    ['ppt/_rels/presentation.xml.rels', rels([['rId1', 'slideMaster', 'slideMasters/slideMaster1.xml'], ['rId2', 'notesMaster', 'notesMasters/notesMaster1.xml'],
      ['rId3', 'theme', 'theme/theme1.xml'], ['rId4', 'presProps', 'presProps.xml'], ['rId5', 'tableStyles', 'tableStyles.xml'],
      ...slides.map((_, at) => [`rId${10 + at}`, 'slide', `slides/slide${at + 1}.xml`])])],
    ['ppt/presProps.xml', `${XML}<p:presentationPr ${NS}/>`],
    ['ppt/tableStyles.xml', `${XML}<a:tblStyleLst xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" def="{5C22544A-7EE6-4342-B048-85BDC9FD1C3A}"/>`],
    ['ppt/slideMasters/slideMaster1.xml', MASTER],
    ['ppt/slideMasters/_rels/slideMaster1.xml.rels', rels([['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ['rId2', 'theme', '../theme/theme1.xml']])],
    ['ppt/slideLayouts/slideLayout1.xml', LAYOUT],
    ['ppt/slideLayouts/_rels/slideLayout1.xml.rels', rels([['rId1', 'slideMaster', '../slideMasters/slideMaster1.xml']])],
    ['ppt/notesMasters/notesMaster1.xml', NOTES_MASTER],
    ['ppt/notesMasters/_rels/notesMaster1.xml.rels', rels([['rId1', 'theme', '../theme/theme2.xml']])],
    ['ppt/theme/theme1.xml', theme('WongStack')],
    ['ppt/theme/theme2.xml', theme('WongStack Notes')],
    ...slides.flatMap((slide, at) => {
      const n = at + 1;
      const own = [['rId1', 'slideLayout', '../slideLayouts/slideLayout1.xml'], ...(slide.notes ? [['rId2', 'notesSlide', `../notesSlides/notesSlide${n}.xml`]] : [])];
      return [
        [`ppt/slides/slide${n}.xml`, slideXml(slide.shapes)],
        [`ppt/slides/_rels/slide${n}.xml.rels`, rels(own)],
        ...(slide.notes ? [[`ppt/notesSlides/notesSlide${n}.xml`, notesXml(slide.notes)],
          [`ppt/notesSlides/_rels/notesSlide${n}.xml.rels`, rels([['rId1', 'notesMaster', '../notesMasters/notesMaster1.xml'], ['rId2', 'slide', `../slides/slide${n}.xml`]])]] : []),
      ];
    }),
  ];
  return zip(files.map(([name, data]) => ({ name, data })), date);
}
