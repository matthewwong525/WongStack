// Credential hygiene: replace known .env values, and detect token-shaped strings without printing them.
const PLACEHOLDER = '[redacted:.env]';
const MIN_SECRET_LENGTH = 8;

const TOKEN_PATTERNS = [
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{20,}/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{20,}/],
  ['API key (sk-)', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  ['Bearer header', /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}/],
];

// Values worth guarding: long enough that replacing them cannot mangle ordinary text. Longest first.
export function secretValues(env) {
  return [...new Set(Object.values(env).filter(value => typeof value === 'string' && value.length >= MIN_SECRET_LENGTH))]
    .sort((a, b) => b.length - a.length);
}

// One pass over the text, however many values there are.
export function redact(text, values) {
  if (!values.length) return text;
  const pattern = new RegExp(values.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g');
  return text.replace(pattern, PLACEHOLDER);
}

// Returns the name of the first rule that matches, or null. Never returns the matched text.
export function findCredential(text, values) {
  if (values.some(value => text.includes(value))) return 'a value from .env';
  return TOKEN_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}
