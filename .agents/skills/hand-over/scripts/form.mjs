// The private form's routes and its send, mounted by `hand-over.mjs open --form <file>`, which checks the key first.
// Nothing here logs; a typed value travels only in the browser client's loopback request, never argv, env, or a file.

export const LIMITS = { fields: 12, title: 60, note: 140, label: 60, target: 200, options: 60, option: 80, value: 256, body: 16 * 1024 };
export const FORM_ROUTES = new Set(['/form', '/send', '/done']);

/** The HTML autofill field names a box's `kind` may be. */
export const AUTOFILL_TOKENS = new Set(['name', 'honorific-prefix', 'given-name', 'additional-name', 'family-name', 'honorific-suffix', 'nickname', 'username', 'new-password', 'current-password', 'one-time-code', 'organization-title', 'organization', 'street-address', 'address-line1', 'address-line2', 'address-line3', 'address-level4', 'address-level3', 'address-level2', 'address-level1', 'country', 'country-name', 'postal-code', 'cc-name', 'cc-given-name', 'cc-additional-name', 'cc-family-name', 'cc-number', 'cc-exp', 'cc-exp-month', 'cc-exp-year', 'cc-csc', 'cc-type', 'transaction-currency', 'transaction-amount', 'language', 'bday', 'bday-day', 'bday-month', 'bday-year', 'sex', 'url', 'photo', 'tel', 'tel-country-code', 'tel-national', 'tel-area-code', 'tel-local', 'tel-extension', 'email', 'impp']);
const NUMERIC_TOKENS = new Set(['cc-number', 'cc-csc', 'one-time-code']);

const isObject = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isText = (value, most) => typeof value === 'string' && Boolean(value.trim()) && value.length <= most && !/[\r\n\0]/.test(value);
const only = (value, fields) => Object.keys(value).every(field => fields.has(field));
/** A snapshot ref, `e12` or `@e12`, or a selector; never one that starts like a flag. */
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
  ['target takes a snapshot ref, like e12, or a selector', ({ target }) => !isTarget(target)],
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

/** Puts one value in its field. `undo` first gains what puts the field back: an emptying of a text box,
 * or a pick of the choice the site showed, read before the person's pick lands. Throws when a step fails. */
async function fillField(field, value, { browser, undo }) {
  if (field.options) {
    const was = await browser.value(field.target);
    await browser.select(field.target, value);
    if (was) undo.push(() => browser.select(field.target, was));
    return;
  }
  undo.push(() => browser.type(field.target, ''));
  await browser.type(field.target, value);
}

/** The whole send. A press whose step fails still asks `reached()`, since the site may have taken it; a field
 * that fails presses nothing. On `not-accepted` every field is put back, so nothing the person gave is left to see. */
export async function sendForm(form, values, { browser, reached }) {
  const undo = [];
  let moved = false;
  try {
    for (const [index, field] of form.fields.entries()) await fillField(field, values[index], { browser, undo });
    await browser.click(form.submit.target).catch(() => {});
    moved = await reached();
  } catch { /* a step that throws counts as not moved on */ }
  if (moved) return 'done';
  for (const putBack of undo) await putBack().catch(() => {});
  return 'not-accepted';
}

/** A request's JSON body, or a status: 413 past the byte limit, 400 when it isn't JSON. */
export async function readBody(request) {
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

export function reply(response, status, body) {
  const text = body ? JSON.stringify(body) : '';
  response.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-length': Buffer.byteLength(text) }).end(text);
}

/** The form routes for a checked form file. `onSend(values)` runs the one send and resolves to the receipt
 * `/send` answers with; `onCancel()` runs once `/done`'s reply has gone. */
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
