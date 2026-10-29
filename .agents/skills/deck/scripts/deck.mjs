#!/usr/bin/env node
// Builds a deck folder's deck.json into deck.pptx and preview.html, with only Node's own modules.
import { readFileSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';
import { isMain, parseCli, usageError } from '../../memory/scripts/lib/cli.mjs';
import { NODE_COLORS, NODE_STYLES, layout, pptx } from './lib/pptx.mjs';
import { previewHtml } from './lib/preview.mjs';

const USAGE = 'usage: deck.mjs build <dir>   (reads <dir>/deck.json; writes deck.pptx and preview.html beside it)';

export class DeckError extends Error {}

const FIELDS = {
  deck: ['title', 'subtitle', 'slides'],
  title: ['title', 'subtitle', 'notes'],
  picture: ['title', 'problem', 'picture', 'notes'],
  drawing: ['label', 'nodes', 'arrows'],
  node: ['id', 'text', 'col', 'row', 'span', 'color', 'style'],
  arrow: ['from', 'to', 'text'],
};

/** Throws a DeckError naming `where` unless `value` is an object holding only `kind`'s fields. */
function fieldsOf(value, kind, where) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new DeckError(`${where}: expected an object`);
  const extra = Object.keys(value).find(key => !FIELDS[kind].includes(key));
  if (extra) throw new DeckError(`${where}: unknown field "${extra}"; allowed: ${FIELDS[kind].join(', ')}`);
}

function text(value, name, where, required = false) {
  if (value === undefined && !required) return;
  if (typeof value !== 'string' || !value.trim()) throw new DeckError(`${where}: "${name}" must be text`);
}

function whole(value, name, where, least) {
  if (value !== undefined && !(Number.isInteger(value) && value >= least)) throw new DeckError(`${where}: "${name}" must be a whole number of ${least} or more`);
}

function checkNode(node, where, places) {
  fieldsOf(node, 'node', where);
  text(node.id, 'id', where, true);
  text(node.text, 'text', where, true);
  whole(node.col, 'col', where, 0);
  whole(node.row, 'row', where, 0);
  whole(node.span, 'span', where, 1);
  if (node.col === undefined || node.row === undefined) throw new DeckError(`${where}: needs "col" and "row"`);
  if (node.color !== undefined && !NODE_COLORS.includes(node.color)) throw new DeckError(`${where}: color "${node.color}" is not one of ${NODE_COLORS.join(', ')}`);
  if (node.style !== undefined && !NODE_STYLES.includes(node.style)) throw new DeckError(`${where}: style "${node.style}" is not one of ${NODE_STYLES.join(', ')}`);
  for (let col = node.col; col < node.col + (node.span ?? 1); col++) {
    const cell = `${col},${node.row}`;
    if (places.has(cell)) throw new DeckError(`${where}: "${node.id}" and "${places.get(cell)}" share column ${col}, row ${node.row}`);
    places.set(cell, node.id);
  }
}

function checkPicture(picture, where) {
  fieldsOf(picture, 'drawing', `${where} picture`);
  text(picture.label, 'label', `${where} picture`);
  if (!Array.isArray(picture.nodes) || !picture.nodes.length) throw new DeckError(`${where} picture: "nodes" must list at least one box`);
  const ids = new Set();
  const places = new Map();
  picture.nodes.forEach((node, at) => {
    checkNode(node, `${where} node ${at + 1}`, places);
    if (ids.has(node.id)) throw new DeckError(`${where}: two nodes have the id "${node.id}"`);
    ids.add(node.id);
  });
  if (picture.arrows !== undefined && !Array.isArray(picture.arrows)) throw new DeckError(`${where} picture: "arrows" must be a list`);
  (picture.arrows ?? []).forEach((arrow, at) => {
    const place = `${where} arrow ${at + 1}`;
    fieldsOf(arrow, 'arrow', place);
    text(arrow.text, 'text', place);
    for (const end of ['from', 'to']) if (!ids.has(arrow[end])) throw new DeckError(`${place}: "${end}" names no node: ${JSON.stringify(arrow[end])}`);
    if (arrow.from === arrow.to) throw new DeckError(`${place}: goes from "${arrow.from}" to itself`);
  });
}

/** Throws a DeckError, naming the slide, unless `deck` is a well-formed outline. */
export function validate(deck) {
  fieldsOf(deck, 'deck', 'deck.json');
  text(deck.title, 'title', 'deck.json', true);
  text(deck.subtitle, 'subtitle', 'deck.json');
  if (!Array.isArray(deck.slides) || !deck.slides.length) throw new DeckError('deck.json: "slides" must list at least one slide');
  deck.slides.forEach((slide, at) => {
    const where = `slide ${at + 1}${typeof slide?.title === 'string' && slide.title.trim() ?` ("${slide.title}")` : ''}`;
    fieldsOf(slide, slide?.picture === undefined ? 'title' : 'picture', where);
    text(slide.title, 'title', where, true);
    for (const name of ['subtitle', 'problem', 'notes']) text(slide[name], name, where);
    if (slide.picture !== undefined) checkPicture(slide.picture, where);
  });
}

/** Reads `<dir>/deck.json`, writes deck.pptx and preview.html beside it, and returns their paths and any warnings. */
export function build(dir, date = new Date()) {
  const outline = join(dir, 'deck.json');
  let deck;
  try { deck = JSON.parse(readFileSync(outline, 'utf8')); } catch (error) { throw new DeckError(`${outline}: ${error.message}`); }
  validate(deck);
  const slides = layout(deck);
  const bytes = pptx(deck, slides, date);
  const file = join(dir, 'deck.pptx');
  const preview = join(dir, 'preview.html');
  writeFileSync(file, bytes);
  writeFileSync(preview, previewHtml(deck, slides, bytes, `${basename(resolve(dir))}.pptx`));
  return { file, preview, warnings: slides.flatMap(slide => slide.warnings) };
}

if (isMain(import.meta.url)) {
  const { positionals: [command, dir, ...rest] } = parseCli({ usage: USAGE, allowPositionals: true });
  if (command !== 'build') usageError(USAGE, command ? `unknown command: ${command}` : 'missing command');
  if (!dir || rest.length) usageError(USAGE, 'build takes one folder');
  try {
    const { file, preview, warnings } = build(resolve(dir));
    console.log(`DECK_FILE=${file}`);
    console.log(`DECK_PREVIEW=${preview}`);
    for (const warning of warnings) console.log(`DECK_WARN=${warning}`);
  } catch (error) {
    if (!(error instanceof DeckError)) throw error;
    console.error(error.message);
    process.exit(2);
  }
}
