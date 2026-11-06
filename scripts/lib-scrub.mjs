// Swaps the private values in a saved service exchange for made-up ones of the same kind, the same way every time.
// wiki/stack/testing.md#service-examples says what it keeps and why.

// A field whose name holds one of these words is free text about a person or a business: it is always replaced.
const HINTS = new Set(['name', 'email', 'phone', 'address', 'title', 'text', 'content', 'description', 'plain']);
const ISO = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;
const UUID = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;
const PREFIXED = /^([a-z]{2,8})_([A-Za-z0-9]{8,})$/;
const HEX = /^[0-9a-f]{16,}$/i;
const BASE62 = /^(?=.*\d)(?=.*[A-Za-z])[A-Za-z0-9]{20,}$/;
const PHONE = /^\+?[\d\s().-]{7,20}$/;
const TOKEN = /^[a-z0-9_.-]{1,32}$/;

// What a made-up value looks like, so a second scrub keeps it.
const FAKE = [/^[^\s@]+@example\.(?:com|org|net)$/i, /^00000000-0000-4000-8000-\d{12}$/,
  /^(?:[a-z]{2,8}_)?0{3,}\d+$/, /^\+1 555 01\d\d$/, /^Sample text \d+$/, /^https:\/\/example\.com\/\d+$/];

/** Whether a field name says its value is about a person or holds free text. */
export const hinted = key => typeof key === 'string' && key.split(/[_\-\s]|(?=[A-Z])/).some(part => HINTS.has(part.toLowerCase()));

/** The kind of private value `text` is, or null when it is kept as it is. */
export function kind(text, key, base) {
  if (FAKE.some(fake => fake.test(text))) return null;
  if (EMAIL.test(text)) return 'email';
  if (hinted(key)) return phoneLike(text) ? 'phone' : 'text';
  if (ISO.test(text)) return null;
  if (/^https?:\/\//i.test(text)) return ownHost(text, base) ? 'own-url' : 'url';
  if (UUID.test(text)) return 'id';
  if (PREFIXED.test(text) || HEX.test(text) || BASE62.test(text)) return 'id';
  if (phoneLike(text)) return 'phone';
  return TOKEN.test(text) ? null : 'text';
}

const phoneLike = text => PHONE.test(text) && text.replace(/\D/g, '').length >= 7;
const ownHost = (text, base) => {
  try { return !!base && new URL(text).host === new URL(base).host; } catch { return false; }
};

/** A path part that names one thing: an ID of any kind the scrubber knows. */
export const idPart = part => UUID.test(part) || PREFIXED.test(part) || HEX.test(part) || BASE62.test(part) || /^\d{4,}$/.test(part);

/** One example's scrubber: the same real value gets the same made-up value across its request and answer. */
export function scrubber({ base } = {}) {
  const seen = new Map(), counts = {};
  const next = type => (counts[type] = (counts[type] ?? 0) + 1);
  const remember = (type, value, make) => {
    const id = `${type}:${value}`;
    if (!seen.has(id)) seen.set(id, make(next(type)));
    return seen.get(id);
  };
  const fakeId = text => {
    if (UUID.test(text)) {
      const fake = remember('uuid', text.replaceAll('-', '').toLowerCase(), n => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`);
      return text.includes('-') ? fake : fake.replaceAll('-', '');
    }
    const [, prefix, body] = PREFIXED.exec(text) ?? ['', '', text];
    return `${prefix ? `${prefix}_` : ''}${remember('id', text, n => `000${n}`.padStart(body.length, '0'))}`;
  };
  const part = text => (TOKEN.test(text) && !idPart(text)) || FAKE.some(fake => fake.test(text)) ? text
    : idPart(text) ? fakeId(text) : remember('part', text, n => `sample-${n}`);
  const path = text => text.split('/').map(piece => piece && part(piece)).join('/');
  const ownUrl = text => { const url = new URL(text); return `${url.origin}${path(url.pathname)}`; };
  const string = (text, key) => {
    switch (kind(text, key, base)) {
      case null: return text;
      case 'email': return remember('email', text.toLowerCase(), n => `person${n}@example.com`);
      case 'own-url': return ownUrl(text);
      case 'url': return remember('url', text, n => `https://example.com/${n}`);
      case 'id': return fakeId(text);
      case 'phone': return remember('phone', text.replace(/\D/g, ''), n => `+1 555 01${String(n).padStart(2, '0')}`);
      default: return remember('text', text, n => `Sample text ${n}`);
    }
  };
  const value = (item, key) => {
    if (typeof item === 'string') return string(item, key);
    if (Array.isArray(item)) return item.map(entry => value(entry, key));
    if (item && typeof item === 'object') return Object.fromEntries(Object.entries(item).map(([name, entry]) => [name, value(entry, name)]));
    return item;
  };
  const query = text => new URLSearchParams([...new URLSearchParams(text)].map(([name, entry]) => [name, string(entry, name)])).toString();
  return { value, path, query };
}

/** A whole value scrubbed on its own. */
export const scrub = (value, options) => scrubber(options).value(value);

/** One saved exchange with its request and answer scrubbed together; its source and date stay. */
export function scrubExample(example, { base } = {}) {
  const clean = scrubber({ base });
  const { method, path, query, body, contentType } = example.request;
  return { ...example,
    request: { method, path: clean.path(path), ...(query !== undefined && { query: clean.query(query) }), ...(body !== undefined && { body: clean.value(body) }),
      ...(contentType !== undefined && { contentType }) },
    answer: { ...example.answer, body: clean.value(example.answer.body) } };
}

// `sample-<n>` is a made-up path part too; FAKE leaves it out because a scrub keeps any short token.
const MADE_UP = [...FAKE, /^sample-\d+$/];
const strings = value => typeof value === 'string' ? [value] : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

/** Whether a saved request holds a value a scrub made up, so sending it again would ask for something else. */
export const madeUp = ({ path, query, body }) => [path, ...new URLSearchParams(query ?? '').values(), ...strings(body)]
  .some(text => typeof text === 'string' && [text, ...text.split('/')].some(piece => MADE_UP.some(fake => fake.test(piece))));

/** Each field of an example whose value a scrub would change, as `request.body.email: an email`. */
export function privateFields(example, { base } = {}) {
  const clean = scrubExample(example, { base });
  const found = [];
  const walk = (left, right, at) => {
    if (left && typeof left === 'object') {
      for (const name of Object.keys(left)) walk(left[name], right?.[name], Array.isArray(left) ? `${at}[${name}]` : `${at}.${name}`);
    } else if (left !== right) found.push(`${at.slice(1)}: ${describe(left, at, base)}`);
  };
  walk({ request: example.request, answer: example.answer }, { request: clean.request, answer: clean.answer }, '');
  return found;
}

const NAMES = { email: 'an email', 'own-url': 'an address with an ID or query', url: 'an outside address', id: 'an ID or token', phone: 'a phone number', text: 'free text' };
const describe = (value, at, base) => /^\.request\.(?:path|query)$/.test(at) ? 'looks private (an ID or value in the address)'
  : typeof value === 'string' ? `looks private (${NAMES[kind(value, at.split(/[.[\]]/).filter(Boolean).at(-1), base)] ?? 'a path part'})` : 'looks private';
