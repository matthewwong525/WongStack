// The rules a key used directly meets, whether the project lists it or a chat saved it: one rule set for the
// project's tests, the tool save route and the key checks. wiki/stack/company-api.md#use-a-key-directly

const METHOD = 'GET|HEAD|POST|PUT|PATCH|DELETE';

/** A path that can only name something under the address it is joined to: plain characters, no empty part but a
 *  last one, and nothing a `.`, a `..` or an encoded slash, dot or backslash could turn into another path. */
const plain = path => !/[\p{Cc}\s\\?#]|%(?:2e|2f|5c)/iu.test(path) &&
  !path.split('/').some((part, at, parts) => part === '.' || part === '..' || (part === '' && at < parts.length - 1));

/** The address to ask, or null: under the service's own address and nowhere else. */
export function address(forward, path, query = '') {
  if (!plain(path) || !URL.canParse(path, forward.base)) return null;
  const base = new URL(forward.base);
  const url = new URL(path, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
  url.search = query;
  return url;
}

/** A credential that matches the key's secrets: both `secret` and `header` with secrets, neither without. */
function credentialProblem(key, forward) {
  if (!key.secrets.length) return forward.secret ?? forward.header ?? forward.prefix ? 'a key with no secrets names no secret, header or prefix' : null;
  if (!forward.secret || !key.secrets.includes(forward.secret)) return "secret must be one of the key's own secrets";
  return forward.header && /^[A-Za-z0-9-]+$/.test(forward.header) ? null : 'header must be one request header name';
}

/** A token address is HTTPS on base's own host, and the key names the ID's secret beside its own. */
function exchangeProblem(key, forward) {
  if (!forward.exchange) return null;
  if (!key.secrets.includes(`${forward.secret}_ID`)) return "a token address needs the ID's secret too: the secret's name and _ID";
  const url = URL.canParse(forward.exchange.url) ? new URL(forward.exchange.url) : null;
  return url?.protocol === 'https:' && url.host === new URL(forward.base).host && !url.username && !url.password ? null
    : `the token address ${forward.exchange.url} must be HTTPS on base's own host`;
}

/** What is wrong with a key's `forward` entry, or null. */
export function forwardProblem(id, key, forward) {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) return 'a key used directly needs an id in lowercase letters, digits and hyphens';
  if (key.setup || key.alone) return "a key setup makes, or the Worker's own route uses, takes no forward";
  if (!/^https:\/\/[^/?#@\s]+\/(?:[^?#\s]*\/)?$/.test(forward.base) || !URL.canParse(forward.base) || !plain(new URL(forward.base).pathname.slice(1))) return 'base must be an HTTPS address ending in /';
  const wrong = credentialProblem(key, forward) ?? exchangeProblem(key, forward);
  if (wrong) return wrong;
  const bad = (forward.lookups ?? []).find(entry => !new RegExp(`^(?:${METHOD}) [^ ]+$`).test(entry) || !plain(entry.split(' ')[1]));
  return bad === undefined ? null : `the look-up "${bad}" must be METHOD path, with a path that stays under base`;
}

/** Each key with no one-line purpose, or used directly with no HTTPS API guide, named. */
export const undescribed = registry => Object.entries(registry).flatMap(([id, key]) => [
  ...(!key.purpose?.trim() || key.purpose.length > 80 || /\n/.test(key.purpose) ? [`${id}: needs a purpose of one line, at most 80 characters`] : []),
  ...(key.docs !== undefined && !/^https:\/\/[^\s]+$/.test(key.docs) ? [`${id}: docs must be an HTTPS address`] : []),
  ...(key.forward && key.docs === undefined ? [`${id}: a key used directly needs docs, the service's API guide`] : []),
]);

/** Every rule a key breaks, named: its purpose and guide, and its `forward` entry. */
export const keyProblems = registry => [...undescribed(registry),
  ...Object.entries(registry).flatMap(([id, key]) => {
    const wrong = key.forward && forwardProblem(id, key, key.forward);
    return wrong ? [`${id}: ${wrong}`] : [];
  })];
