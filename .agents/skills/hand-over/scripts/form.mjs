// The private form's routes and its send, mounted by `hand-over.mjs open --form <file>`, which checks
// the key first.
//
// `checkForm` runs at `open`, before any tunnel, on the `--form` file the agent wrote from its own
// snapshot: `{title, note, fields, submit}`. `title` (60 characters) says who is paid or what is asked,
// and the optional `note` (140) is the line under it. `fields` holds 1 to 12 boxes, each `{label, kind,
// target, options}`: `label` (60) as on the site; `kind`, optional, one HTML autofill name such as
// `cc-number`, so a password manager can fill the box; `target`, the site's field as a snapshot ref
// (`@e12`) or a selector (200), never starting with `-`; and `options`, which makes the box a dropdown
// of up to 60 `{value, text}` choices. `submit` is `{label, target}`, the site's own button. The first
// fault is returned as `<where>: <reason>`.
//
// `GET /form` gives the page `{title, note, fields, submit, closesAt, now}`: each field's label, autofill
// name, box type, keyboard, and choices, and the button's label, never a target. `POST /send` takes
// `{values: [...]}`, one string per field in order, in a 16 KB body: a text value is 1 to 256 characters
// on one line, a dropdown's one of its choices. The first well-formed send is the only one: every later
// one answers 409. `POST /done` cancels a form nothing was sent from.
//
// `sendForm` is the send. It fills the site's fields in order: a text box is cleared and focused
// (`agent-browser fill <target> ""`, `focus <target>`) and its value typed as key presses over
// agent-browser's local live feed; a dropdown's own choice is read (`get value <target>`), then it runs
// `select <target> <value>`, a choice the agent supplied. With every field in, it runs `click <submit target>` once and asks `reached()` whether the
// site moved on. A step that fails stops before the click. When the site did not move on, each text box
// it typed into is emptied by target, each dropdown is put back to the choice it had, and the result is
// `not-accepted`. Nothing here logs, it reads only a dropdown's choice before the person's pick, and no
// typed value reaches argv, env, or a file.

export const LIMITS = { fields: 12, title: 60, note: 140, label: 60, target: 200, options: 60, option: 80, value: 256, body: 16 * 1024 };
export const FORM_ROUTES = new Set(['/form', '/send', '/done']);
const FEED_WAIT_MS = 5000;
const SETTLE_MS = 150;
const OPEN = 1;
const sleep = ms => new Promise(done => setTimeout(done, ms));

/** The HTML autofill field names a box's `kind` may be. */
export const AUTOFILL_TOKENS = new Set(['name', 'honorific-prefix', 'given-name', 'additional-name', 'family-name', 'honorific-suffix', 'nickname', 'username', 'new-password', 'current-password', 'one-time-code', 'organization-title', 'organization', 'street-address', 'address-line1', 'address-line2', 'address-line3', 'address-level4', 'address-level3', 'address-level2', 'address-level1', 'country', 'country-name', 'postal-code', 'cc-name', 'cc-given-name', 'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency', 'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month', 'bday-year', 'sex', 'url', 'photo', 'tel', 'tel-country-code', 'tel-national', 'tel-area-code', 'tel-local', 'tel-extension', 'email', 'impp']);
const NUMERIC_TOKENS = new Set(['cc-number', 'cc-csc', 'one-time-code']);

// ---------------------------------------------------------------------------
// The form file

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isText = (value, most) => typeof value === 'string' && Boolean(value.trim()) && value.length <= most && !/[\r\n\0]/.test(value);
const only = (value, fields) => Object.keys(value).every(field => fields.has(field));
/** A snapshot ref or a selector; one starting with `-` would read as a flag on agent-browser's command line. */
const isTarget = value => isText(value, LIMITS.target) && value === value.trim() && (/^@e\d+$/.test(value) || !/^[-@]/.test(value));
const CHOICE_FIELDS = new Set(['value', 'text']);
const isChoice = choice => isObject(choice) && only(choice, CHOICE_FIELDS) && isText(choice.value, LIMITS.option) && !choice.value.startsWith('-') && (choice.text === undefined || isText(choice.text, LIMITS.option));
const isSubmit = submit => isObject(submit) && only(submit, new Set(['label', 'target'])) && isText(submit.label, LIMITS.label) && isTarget(submit.target);

const FORM_FIELDS = new Set(['title', 'note', 'fields', 'submit']);
/** Each reason a form file is refused, with the test that finds it. */
const FORM_FAULTS = [
  ['takes only title, note, fields, and submit', form => !only(form, FORM_FIELDS)],
  [`title takes 1 to ${LIMITS.title} characters on one line`, ({ title }) => !isText(title, LIMITS.title)],
  [`note takes 1 to ${LIMITS.note} characters on one line`, ({ note }) => note !== undefined && !isText(note, LIMITS.note)],
  [`fields takes 1 to ${LIMITS.fields} boxes`, ({ fields }) => !(Array.isArray(fields) && fields.length && fields.length <= LIMITS.fields)],
  [`submit takes a label of 1 to ${LIMITS.label} characters and a target`, ({ submit }) => !isSubmit(submit)],
];
const BOX_FIELDS = new Set(['label', 'kind', 'target', 'options']);
/** Each reason one box is refused. */
const BOX_FAULTS = [
  ['takes only label, kind, target, and options', box => !only(box, BOX_FIELDS)],
  [`label takes 1 to ${LIMITS.label} characters on one line`, ({ label }) => !isText(label, LIMITS.label)],
  ['kind takes an autofill name, like cc-number', ({ kind }) => kind !== undefined && !AUTOFILL_TOKENS.has(kind)],
  ['target takes a snapshot ref, like @e12, or a selector', ({ target }) => !isTarget(target)],
  [`options takes 1 to ${LIMITS.options} choices, each a value and an optional text of 1 to ${LIMITS.option} characters`, ({ options }) => options !== undefined && !(Array.isArray(options) && options.length && options.length <= LIMITS.options && options.every(isChoice))],
];

/** Checks the parsed `--form` file. Resolves to `{form}`, or to `{fault: '<where>: <reason>'}` for the first fault. */
export function checkForm(form) {
  if (!isObject(form)) return { fault: 'form: takes a JSON object' };
  const whole = FORM_FAULTS.find(([, found]) => found(form))?.[0];
  if (whole) return { fault: `form: ${whole}` };
  for (const [index, box] of form.fields.entries()) {
    const reason = isObject(box) ? BOX_FAULTS.find(([, found]) => found(box))?.[0] : 'takes an object';
    if (reason) return { fault: `fields[${index}]: ${reason}` };
  }
  return { form };
}

/** A box's autofill name with the `type` and `inputmode` it implies. */
export function boxFor(kind = '') {
  const type = kind.endsWith('-password') ? 'password' : kind === 'email' || kind === 'tel' ? kind : 'text';
  return { autocomplete: kind, type, inputmode: NUMERIC_TOKENS.has(kind) ? 'numeric' : '' };
}

/** What the page draws: labels, autofill names, choices, and the button's label, never a target. */
export function describeForm({ title, note, fields, submit }) {
  return {
    title,
    ...(note && { note }),
    fields: fields.map(({ label, kind, options }) => ({ label, ...boxFor(kind), ...(options && { options: options.map(({ value, text }) => ({ value, text: text ?? value })) }) })),
    submit: submit.label,
  };
}

/** A send's values, one per field in order, or 400: a text value on one line, a dropdown's one of its choices. */
export function checkValues(body, form) {
  const values = body?.values;
  if (!Array.isArray(values) || values.length !== form.fields.length) return 400;
  const fits = (value, { options }) => (options ? options.some(option => option.value === value) : isText(value, LIMITS.value));
  return values.every((value, index) => fits(value, form.fields[index])) ? values : 400;
}

// ---------------------------------------------------------------------------
// The send

/** The `input_keyboard` pair for one typed character, as agent-browser's own dashboard sends it. */
function keyEvents(char) {
  const keyCode = /^[a-z0-9]$/i.test(char) ? char.toUpperCase().charCodeAt(0) : 0;
  const code = /^[a-z]$/i.test(char) ? `Key${char.toUpperCase()}` : /^\d$/.test(char) ? `Digit${char}` : '';
  const base = { type: 'input_keyboard', key: char, code, windowsVirtualKeyCode: keyCode, modifiers: 0 };
  return [{ ...base, eventType: 'keyDown', text: char }, { ...base, eventType: 'keyUp' }];
}

/** Presses `text` into the focused field over `socket`; true once the feed has taken every key. */
async function typeText(socket, text) {
  for (const char of Array.from(text)) {
    for (const event of keyEvents(char)) {
      if (socket.readyState !== OPEN) return false;
      socket.send(JSON.stringify(event));
    }
  }
  const end = Date.now() + FEED_WAIT_MS;
  while (socket.bufferedAmount > 0 && Date.now() < end) await sleep(10);
  // The feed passes keys on without an answer; a pause lets the browser take them before the next command.
  await sleep(SETTLE_MS);
  return socket.readyState === OPEN && socket.bufferedAmount === 0;
}

/**
 * Opens agent-browser's live feed on `port` for typing. Resolves to `{type(text), close()}`, or null
 * when it does not open. It asks for one picture at a time and acknowledges none, so no picture of the
 * page follows the first, and it reads nothing the feed sends.
 */
export function openFeed(port, Socket = globalThis.WebSocket) {
  return new Promise(done => {
    let socket;
    try {
      socket = new Socket(`ws://127.0.0.1:${port}/?pacing=ack&maxFps=1`);
    } catch {
      return done(null);
    }
    const timer = setTimeout(() => { socket.close(); done(null); }, FEED_WAIT_MS);
    socket.onerror = () => { clearTimeout(timer); done(null); };
    socket.onopen = () => { clearTimeout(timer); done({ type: text => typeText(socket, text), close: () => socket.close() }); };
  });
}

/**
 * Puts one value in its field. `undo` first gains the command that puts the field back: an emptying
 * fill for a text box, or a pick of the choice the site showed, read before the person's pick lands.
 * False when a step fails.
 */
async function fillField(field, value, { browser, feed, undo }) {
  if (field.options) {
    const was = await browser(['get', 'value', field.target]);
    if (was === null || (await browser(['select', field.target, value])) === null) return false;
    if (!was.startsWith('-')) undo.push(['select', field.target, was]);
    return true;
  }
  if (!feed || (await browser(['fill', field.target, ''])) === null || (await browser(['focus', field.target])) === null) return false;
  undo.push(['fill', field.target, '']);
  return feed.type(value);
}

/**
 * Fills each field in order, then presses the submit target once; `undo` gains what puts each filled
 * field back. True once the press was tried, even when its command fails, since the site may still
 * have taken it; false when a field's step failed, with nothing pressed.
 */
async function fillAndSubmit(form, values, { browser, openFeed: open, undo }) {
  const feed = form.fields.some(field => !field.options) ? await open() : null;
  try {
    for (const [index, field] of form.fields.entries()) {
      if (!(await fillField(field, values[index], { browser, feed, undo }))) return false;
    }
    await browser(['click', form.submit.target]);
    return true;
  } finally {
    feed?.close();
  }
}

/**
 * The whole send: fill, press once, and ask `reached()` whether the site moved on. Resolves to `done`,
 * or to `not-accepted` after emptying each text box it typed into and putting each dropdown back, so
 * nothing the person gave is left to see. `browser(args)` runs agent-browser and resolves to its
 * output, or null on failure; `openFeed()` opens the live feed.
 */
export async function sendForm(form, values, { browser, openFeed: open, reached }) {
  const undo = [];
  let moved = false;
  try {
    moved = (await fillAndSubmit(form, values, { browser, openFeed: open, undo })) && (await reached());
  } catch { /* a step that throws counts as not moved on */ }
  if (moved) return 'done';
  for (const command of undo) await browser(command);
  return 'not-accepted';
}

// ---------------------------------------------------------------------------
// Routes

/** A request's JSON body, or a status: 413 past the byte limit, 400 when it isn't JSON. */
async function readBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size <= LIMITS.body) chunks.push(chunk);
  }
  if (size > LIMITS.body) return 413;
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return 400;
  }
}

function reply(response, status, body) {
  const text = body ? JSON.stringify(body) : '';
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(text) }).end(text);
}

/**
 * The form routes for `form`, a checked form file. `onSend(values)` runs the one send and resolves to
 * the receipt `/send` answers with; `onCancel()` runs once `/done`'s reply has gone. `closesAt` is the
 * deadline `GET /form` reports.
 */
export function formRoutes(form, { onSend = async () => null, onCancel = () => {}, isOpen = () => true, closesAt } = {}) {
  let ended = false;
  return async (pathname, request, response) => {
    if (pathname === '/form') return request.method === 'GET' ? reply(response, 200, { ...describeForm(form), closesAt, now: Date.now() }) : reply(response, 405);
    if (request.method !== 'POST') return reply(response, 405);
    const body = pathname === '/done' ? null : await readBody(request);
    // No await sits between this check and `ended = true`, so two sends at once can not both pass.
    if (ended) return reply(response, 409);
    if (!isOpen()) return reply(response, 410);
    if (pathname === '/done') {
      ended = true;
      response.once('finish', () => onCancel());
      return reply(response, 200, { ok: true });
    }
    const values = typeof body === 'number' ? body : checkValues(body, form);
    if (typeof values === 'number') return reply(response, values);
    ended = true;
    const receipt = await onSend(values);
    reply(response, 200, { receipt });
  };
}
