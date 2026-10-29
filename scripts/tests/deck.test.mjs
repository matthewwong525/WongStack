import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { crc32, inflateRawSync } from 'node:zlib';
import { JSDOM } from 'jsdom';
import { DeckError, build, validate } from '../../.agents/skills/deck/scripts/deck.mjs';
import { escapeXml, layout, pptx, wrapLines } from '../../.agents/skills/deck/scripts/lib/pptx.mjs';
import { previewHtml } from '../../.agents/skills/deck/scripts/lib/preview.mjs';
import { zip } from '../../.agents/skills/deck/scripts/lib/zip.mjs';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const script = join(repo, '.agents/skills/deck/scripts/deck.mjs');
const DATE = new Date('2026-10-29T12:00:00Z');

/** Every entry of a zip, read from its central directory; each body inflated and checked against its CRC. */
function unzip(bytes) {
  const end = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(end >= 0, 'an end-of-directory record');
  const count = bytes.readUInt16LE(end + 10);
  let at = bytes.readUInt32LE(end + 16);
  const entries = new Map();
  for (let i = 0; i < count; i++) {
    assert.equal(bytes.readUInt32LE(at), 0x02014b50, 'a central directory record');
    const method = bytes.readUInt16LE(at + 10);
    const crc = bytes.readUInt32LE(at + 16);
    const size = bytes.readUInt32LE(at + 20);
    const nameLength = bytes.readUInt16LE(at + 28);
    const offset = bytes.readUInt32LE(at + 42);
    const name = bytes.subarray(at + 46, at + 46 + nameLength).toString('utf8');
    assert.equal(bytes.readUInt32LE(offset), 0x04034b50, `${name}: a local header`);
    const start = offset + 30 + bytes.readUInt16LE(offset + 26) + bytes.readUInt16LE(offset + 28);
    const body = bytes.subarray(start, start + size);
    const data = method === 8 ? inflateRawSync(body) : Buffer.from(body);
    assert.equal(crc32(data), crc, `${name}: the CRC matches`);
    entries.set(name, { method, data });
    at += 46 + nameLength + bytes.readUInt16LE(at + 30) + bytes.readUInt16LE(at + 32);
  }
  return entries;
}

const node = (id, col, row, extra = {}) => ({ id, text: id, col, row, ...extra });
const picture = (nodes, arrows) => ({ label: 'How it works', nodes, arrows });
const DECK = {
  title: 'Harness <&> "deck"',
  subtitle: "It's a test",
  slides: [
    { title: 'Opening', subtitle: 'Why we build', notes: 'Say hello.' },
    {
      title: 'Keys & <secrets>',
      problem: 'Pasted keys stay in chat.\nForever.',
      picture: picture([node('you', 0, 0), node('link', 1, 0, { color: 'blue', style: 'pill' }), node('file', 2, 0, { color: 'mint', text: 'Key file' }),
        node('chat', 1, 1, { style: 'crossed' }), node('note', 0, 2, { span: 2, style: 'dashed', color: 'purple' })],
      [{ from: 'you', to: 'link' }, { from: 'link', to: 'file', text: 'saves' }, { from: 'link', to: 'chat', text: 'never' }, { from: 'chat', to: 'you' }, { from: 'note', to: 'chat' }]),
      notes: 'Detail one.\n\nDetail two & more.',
    },
    { title: 'Wide', picture: { nodes: [node('a', 0, 0), node('b', 1, 0), node('c', 2, 0), node('d', 3, 0, { style: 'dashed' })], arrows: [{ from: 'b', to: 'a' }, { from: 'd', to: 'c' }] } },
    { title: 'Up', picture: picture([node('low', 0, 1), node('high', 0, 0)], [{ from: 'low', to: 'high', text: 'up' }]) },
    { title: 'Thanks' },
  ],
};

function folder(t, deck) {
  const dir = mkdtempSync(join(tmpdir(), 'wong-test-deck-'));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  if (deck !== undefined) writeFileSync(join(dir, 'deck.json'), typeof deck === 'string' ? deck : JSON.stringify(deck));
  return dir;
}
const cli = (...args) => spawnSync(process.execPath, [script, ...args], { encoding: 'utf8' });
const { DOMParser } = new JSDOM('').window;
const parse = xml => new DOMParser().parseFromString(xml, 'application/xml');

test('the zip reads back: a central directory, and every CRC matches its inflated body', () => {
  const noise = Buffer.from(Array.from({ length: 256 }, (_, at) => (at * 89 + 7) % 256));
  const entries = unzip(zip([{ name: 'a.xml', data: '<a>'.repeat(200) }, { name: 'noise.bin', data: noise }], new Date(1970, 0, 1)));
  assert.equal(entries.get('a.xml').method, 8, 'text that shrinks is deflated');
  assert.equal(entries.get('a.xml').data.toString(), '<a>'.repeat(200));
  assert.equal(entries.get('noise.bin').method, 0, 'bytes that do not shrink are stored');
  assert.deepEqual(entries.get('noise.bin').data, noise);
});

test('the parts and slide count match the outline, each XML part parses, and notes land in notes slides', () => {
  validate(DECK);
  const slides = layout(DECK);
  const entries = unzip(pptx(DECK, slides, DATE));
  const names = [...entries.keys()];
  assert.equal(names[0], '[Content_Types].xml');
  assert.deepEqual(names.filter(name => /^ppt\/slides\/slide\d+\.xml$/.test(name)).length, 5);
  assert.deepEqual(names.filter(name => /^ppt\/notesSlides\/notesSlide\d+\.xml$/.test(name)), ['ppt/notesSlides/notesSlide1.xml', 'ppt/notesSlides/notesSlide2.xml']);
  for (const [name, { data }] of entries) {
    const doc = parse(data.toString('utf8'));
    assert.equal(doc.getElementsByTagName('parsererror').length, 0, `${name} is well-formed XML`);
  }
  const read = name => entries.get(name).data.toString('utf8');
  assert.equal(read('ppt/presentation.xml').match(/<p:sldId /g).length, 5);
  for (let n = 1; n <= 5; n++) assert.match(read('[Content_Types].xml'), new RegExp(`/ppt/slides/slide${n}\\.xml`));
  assert.match(read('ppt/slides/_rels/slide2.xml.rels'), /notesSlides\/notesSlide2\.xml/);
  assert.doesNotMatch(read('ppt/slides/_rels/slide3.xml.rels'), /notesSlide/);
  assert.match(read('ppt/notesSlides/notesSlide2.xml'), /<a:t>Detail one\.<\/a:t>.*<a:p><\/a:p>.*<a:t>Detail two &amp; more\.<\/a:t>/);
  assert.match(read('docProps/app.xml'), /<Slides>5<\/Slides><Notes>2<\/Notes>/);
  const slide2 = read('ppt/slides/slide2.xml');
  assert.equal(slide2.match(/<p:cxnSp>/g).length, 5, 'each arrow is a connector');
  assert.match(slide2, /<a:tailEnd type="triangle"/);
  assert.match(slide2, /strike="sngStrike"[^>]*>.*?<a:t>chat<\/a:t>/);
  assert.match(slide2, /prst="roundRect"/);
  assert.match(slide2, /<a:prstDash val="dash"\/>/);
});

test('special characters are escaped everywhere they land', () => {
  const entries = unzip(pptx(DECK, layout(DECK), DATE));
  const read = name => entries.get(name).data.toString('utf8');
  assert.match(read('ppt/slides/slide2.xml'), /<a:t>Keys &amp; &lt;secrets&gt;<\/a:t>/);
  assert.match(read('docProps/core.xml'), /<dc:title>Harness &lt;&amp;&gt; &quot;deck&quot;<\/dc:title><dc:subject>It&apos;s a test<\/dc:subject>/);
  assert.equal(escapeXml('a\u0001b\u0008c\td'), 'abc\td', 'characters XML can not hold are dropped');
  const html = previewHtml(DECK, layout(DECK), Buffer.from('x'), 'a"b.pptx');
  assert.match(html, /<title>Harness &lt;&amp;&gt; &quot;deck&quot;<\/title>/);
  assert.match(html, /download="a&quot;b\.pptx"/);
  assert.doesNotMatch(html, /<secrets>/);
});

test('validation errors name the slide', () => {
  const broken = (slide, at = 1) => { const deck = structuredClone(DECK); deck.slides[at] = { ...deck.slides[at], ...slide }; return deck; };
  const cases = [
    [broken({ colour: 'red' }), /slide 2 \("Keys & <secrets>"\): unknown field "colour"/],
    [broken({ problem: 'words' }, 0), /slide 1 \("Opening"\): unknown field "problem"/],
    [broken({ title: '' }), /slide 2: "title" must be text/],
    [broken({ notes: 4 }), /slide 2 .*"notes" must be text/],
    [broken({ picture: { nodes: [] } }), /slide 2 .*"nodes" must list/],
    [broken({ picture: { nodes: [node('a', 0, 0)], extra: 1 } }), /slide 2 .* picture: unknown field "extra"/],
    [broken({ picture: { nodes: [node('a', 0, 0, { color: 'red' })] } }), /slide 2 .* node 1: color "red" is not one of gray, mint, blue, purple/],
    [broken({ picture: { nodes: [node('a', 0, 0, { style: 'cloud' })] } }), /slide 2 .* node 1: style "cloud"/],
    [broken({ picture: { nodes: [node('a', -1, 0)] } }), /node 1: "col" must be a whole number of 0 or more/],
    [broken({ picture: { nodes: [{ id: 'a', text: 'a' }] } }), /node 1: needs "col" and "row"/],
    [broken({ picture: { nodes: [node('a', 0, 0), node('a', 1, 0)] } }), /slide 2 .*two nodes have the id "a"/],
    [broken({ picture: { nodes: [node('a', 0, 0, { span: 2 }), node('b', 1, 0)] } }), /node 2: "b" and "a" share column 1, row 0/],
    [broken({ picture: { nodes: [node('a', 0, 0)], arrows: {} } }), /"arrows" must be a list/],
    [broken({ picture: { nodes: [node('a', 0, 0)], arrows: [{ from: 'a', to: 'ghost' }] } }), /slide 2 .* arrow 1: "to" names no node: "ghost"/],
    [broken({ picture: { nodes: [node('a', 0, 0)], arrows: [{ from: 'a', to: 'a' }] } }), /arrow 1: goes from "a" to itself/],
    [broken({ picture: { nodes: [node('a', 0, 0)], arrows: [{ from: 'a', to: 'a', bend: 1 }] } }), /arrow 1: unknown field "bend"/],
    [{ ...DECK, theme: 'light' }, /deck\.json: unknown field "theme"/],
    [{ ...DECK, slides: [] }, /"slides" must list at least one slide/],
    [{ ...DECK, slides: ['text'] }, /slide 1: expected an object/],
    [[], /deck\.json: expected an object/],
  ];
  for (const [deck, message] of cases) assert.throws(() => validate(deck), error => error instanceof DeckError && message.test(error.message), String(message));
});

test('an overlong label warns, naming its slide; short labels do not', () => {
  const long = { title: 'Deck', slides: [{ title: 'One', picture: { nodes: [node('a', 0, 0, { text: 'A label far too long to sit inside one small box on the grid' }), node('b', 1, 0), node('c', 2, 0)] } }] };
  assert.deepEqual(layout(long)[0].warnings, ['slide 1: "A label far too long to sit inside one small box on the grid" may not fit its box; shorten it']);
  assert.deepEqual(layout(DECK).flatMap(slide => slide.warnings), []);
  const word = { title: 'Deck', slides: [{ title: 'Supercalifragilisticexpialidocious'.repeat(2) }] };
  assert.equal(layout(word)[0].warnings.length, 1, 'one word wider than its line warns');
  assert.deepEqual(wrapLines('one two three\n\nfour', 8), { lines: ['one two', 'three', '', 'four'], long: false });
});

test('the preview draws each shape where the file puts it', () => {
  const slides = layout(DECK);
  const html = previewHtml(DECK, slides, pptx(DECK, slides, DATE), 'deck.pptx');
  const slide2 = unzip(pptx(DECK, slides, DATE)).get('ppt/slides/slide2.xml').data.toString('utf8');
  const shapes = slides[1].shapes;
  for (const shape of shapes.filter(each => each.kind === 'box')) {
    const x = Math.round(shape.x * 914400), y = Math.round(shape.y * 914400);
    assert.match(slide2, new RegExp(`<a:off x="${x}" y="${y}"/>`));
    assert.match(html, new RegExp(`<rect x="${Math.round(shape.x * 9600) / 100}" y="${Math.round(shape.y * 9600) / 100}"`));
  }
  for (const arrow of shapes.filter(each => each.kind === 'arrow')) {
    assert.match(html, new RegExp(`<line x1="${Math.round(arrow.x1 * 9600) / 100}" y1="${Math.round(arrow.y1 * 9600) / 100}" x2="${Math.round(arrow.x2 * 9600) / 100}"`));
    assert.match(slide2, new RegExp(`<a:off x="${Math.round(Math.min(arrow.x1, arrow.x2) * 914400)}" y="${Math.round(Math.min(arrow.y1, arrow.y2) * 914400)}"/>`));
  }
  assert.equal(html.match(/<svg /g).length, 5);
  assert.match(html, /href="data:application\/vnd\.openxmlformats-officedocument\.presentationml\.presentation;base64,UEsDB/);
  assert.match(html, /Slide 2: Detail one\./);
});

test('arrows join the facing edges of their boxes', () => {
  const [, keys, wide, up] = layout(DECK);
  const shape = (slide, text) => slide.shapes.find(each => each.kind === 'box' && each.text === text);
  const arrows = slide => slide.shapes.filter(each => each.kind === 'arrow');
  const [right, , down, upward] = arrows(keys);
  assert.deepEqual([right.x1, right.y1], [shape(keys, 'you').x + shape(keys, 'you').w, shape(keys, 'you').y + shape(keys, 'you').h / 2]);
  assert.deepEqual([right.x2, right.fromSite, right.toSite], [shape(keys, 'link').x, 3, 1]);
  assert.deepEqual([down.fromSite, down.toSite, down.y1], [2, 0, shape(keys, 'link').y + shape(keys, 'link').h]);
  assert.deepEqual([upward.fromSite, upward.toSite], [1, 3], 'a mostly sideways arrow uses the side edges');
  assert.deepEqual(arrows(wide).map(arrow => [arrow.fromSite, arrow.toSite]), [[1, 3], [1, 3]]);
  assert.deepEqual(arrows(up).map(arrow => [arrow.fromSite, arrow.toSite]), [[0, 2]]);
  assert.equal(shape(wide, 'a').size, 14, 'three columns or more use a smaller label');
});

test('build writes the file and the page into the deck folder, and the CLI reports them', t => {
  const dir = folder(t, DECK);
  const { file, preview, warnings } = build(dir, DATE);
  assert.deepEqual([file, preview, warnings], [join(dir, 'deck.pptx'), join(dir, 'preview.html'), []]);
  assert.equal(unzip(readFileSync(file)).size > 10, true);
  const run = cli('build', dir);
  assert.equal(run.status, 0, run.stderr);
  assert.equal(run.stdout, `DECK_FILE=${join(dir, 'deck.pptx')}\nDECK_PREVIEW=${join(dir, 'preview.html')}\n`);
  const over = folder(t, { title: 'Deck', slides: [{ title: 'One', picture: { nodes: [node('a', 0, 0, { text: 'x'.repeat(80) })] } }] });
  assert.match(cli('build', over).stdout, /^DECK_WARN=slide 1: "x+" may not fit its box; shorten it$/m);
});

test('the CLI refuses a bad outline with exit 2, naming the slide, and a bad call with its usage', t => {
  const bad = folder(t, { title: 'Deck', slides: [{ title: 'One', picture: { nodes: [node('a', 0, 0)], arrows: [{ from: 'a', to: 'b' }] } }] });
  const refused = cli('build', bad);
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /slide 1 \("One"\) arrow 1: "to" names no node: "b"/);
  assert.equal(cli('build', folder(t, '{ nope')).status, 2);
  assert.match(cli('build', folder(t)).stderr, /deck\.json: ENOENT/);
  for (const args of [[], ['make', '.'], ['build'], ['build', 'a', 'b']]) {
    const run = cli(...args);
    assert.equal(run.status, 2, args.join(' '));
    assert.match(run.stderr, /usage: deck\.mjs build <dir>/);
  }
});

test('the page sends changes through its reply link, and copies them when it can not', async t => {
  const slides = layout(DECK);
  const html = previewHtml(DECK, slides, Buffer.from('x'), 'deck.pptx');
  const open = async (url, answer) => {
    const calls = [];
    const dom = new JSDOM(html, { url, runScripts: 'dangerously', beforeParse(win) {
      win.fetch = async (path, init) => { calls.push({ path, init }); return answer(); };
    } });
    t.after(() => dom.window.close());
    const $ = selector => dom.window.document.querySelector(selector);
    const send = async text => {
      $('textarea').value = text;
      $('#changes').dispatchEvent(new dom.window.Event('submit', { cancelable: true }));
      for (let i = 0; i < 8; i++) await new Promise(done => setTimeout(done, 0));
      return $('#status').textContent;
    };
    return { $, send, calls };
  };
  const linked = await open('https://link.test/p/1/#key=k1', () => ({ ok: true, json: async () => ({ sent: true }) }));
  assert.equal(await linked.send('   '), '', 'an empty box sends nothing');
  assert.match(await linked.send('Slide 2: shorter'), /^Sent\./);
  assert.equal(linked.calls[0].path, 'send');
  assert.equal(linked.calls[0].init.headers['x-reply-key'], 'k1');
  assert.deepEqual(JSON.parse(linked.calls[0].init.body), { text: 'Slide 2: shorter' });
  const refused = await open('https://link.test/p/1/#key=k1', () => ({ ok: false, json: async () => ({}) }));
  assert.match(await refused.send('Slide 2'), /paste them into the chat/, 'a refused send is never called sent');
  const broken = await open('https://link.test/p/1/#key=k1', () => { throw new Error('offline'); });
  assert.match(await broken.send('Slide 2'), /paste them into the chat/);
  const file = await open('file:///deck/preview.html', () => assert.fail('no link, no send'));
  assert.equal(file.$('#changes button').textContent, 'Copy changes');
  assert.match(await file.send('Slide 2'), /paste them into the chat/);
  assert.equal(file.calls.length, 0);
});

test('a deck folder named for its deck gives the download its name', t => {
  const dir = join(folder(t), 'harness-problems');
  mkdirSync(dir);
  writeFileSync(join(dir, 'deck.json'), JSON.stringify(DECK));
  build(dir, DATE);
  assert.match(readFileSync(join(dir, 'preview.html'), 'utf8'), /download="harness-problems\.pptx"/);
});
