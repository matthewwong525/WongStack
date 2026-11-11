// Credential hygiene: replace known .env values and token-shaped strings, and detect them without printing them.
const PLACEHOLDER = '[redacted:.env]';
const TOKEN_PLACEHOLDER = '[redacted:token]';
const MIN_SECRET_LENGTH = 8;

const TOKEN_PATTERNS = [
  ['GitHub token', /\bgh[pousr]_[A-Za-z0-9]{20,}/],
  ['GitHub fine-grained token', /\bgithub_pat_[A-Za-z0-9_]{20,}/],
  ['API key (sk-)', /\bsk-[A-Za-z0-9_-]{20,}/],
  ['AWS access key', /\bAKIA[0-9A-Z]{16}\b/],
  ['JWT', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/],
  ['Memory login marker', /\bwongl_[A-Za-z0-9_-]{43}\b/],
  ['Memory key', /\bwongm_[A-Za-z0-9_-]+\.[A-Za-z0-9_-]{20,}/],
  // The word stays and only the token is replaced, so a transcript still reads as a header.
  ['Bearer header', /\b(Bearer\s+)[A-Za-z0-9._~+/=-]{20,}/],
];
const GLOBAL_PATTERNS = TOKEN_PATTERNS.map(([, pattern]) => new RegExp(pattern.source, 'g'));

// Values worth guarding: long enough that replacing them cannot mangle ordinary text. Longest first.
export function secretValues(env) {
  return [...new Set(Object.values(env).filter(value => typeof value === 'string' && value.length >= MIN_SECRET_LENGTH))]
    .sort((a, b) => b.length - a.length);
}

// .env values in one pass, however many there are, then every token shape. No placeholder holds a quote or a
// backslash, so a JSONL line stays valid JSON.
export function redact(text, values) {
  const known = values.length
    ? text.replace(new RegExp(values.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'g'), PLACEHOLDER)
    : text;
  return GLOBAL_PATTERNS.reduce((out, pattern) => out.replace(pattern, (_, bearer) => `${typeof bearer === 'string' ? bearer : ''}${TOKEN_PLACEHOLDER}`), known);
}

// Returns the name of the first rule that matches, or null. Never returns the matched text.
export function findCredential(text, values) {
  if (values.some(value => text.includes(value))) return 'a value from .env';
  return TOKEN_PATTERNS.find(([, pattern]) => pattern.test(text))?.[0] ?? null;
}
