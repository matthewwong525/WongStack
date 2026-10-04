import { SCOPES, SLUG } from './corpus.mjs';
export const MODES = ['auto', 'keyword', 'semantic', 'deep'];
export class RetrievalInputError extends Error { constructor(message) { super(message); this.code = 2; } }
export function validateRetrieval(question, values = {}, { recall = false } = {}) {
  const allowed = ['scope', 'mode', 'change', 'limit', 'json', 'help', ...(recall ? ['tag', 'type', 'slug', 'since', 'until'] : [])];
  if (Object.keys(values).some(key => !allowed.includes(key))) throw new RetrievalInputError('Unsupported retrieval option; fact-wide expansion is not supported');
  if (typeof question !== 'string' || !question.trim() || question.length > 4000 || /[\x00-\x1f\x7f]/.test(question)
    || /(?:^|\s)(?:lex|vec|hyde|intent):/i.test(question)) throw new RetrievalInputError('Question must be 1–4000 characters without newlines or typed query fields');
  const scope = values.scope || 'current', mode = values.mode || 'auto', limit = values.limit === undefined ? 5 : Number(values.limit);
  if (!Object.hasOwn(SCOPES, scope) || !MODES.includes(mode) || !Number.isInteger(limit) || limit < 1 || limit > 5)
    throw new RetrievalInputError('Use scope current|history|active|all, mode auto|keyword|semantic|deep and limit 1–5');
  if (values.change !== undefined && (values.change.length > 200 || !SLUG.test(values.change))) throw new RetrievalInputError('Invalid change slug');
  if (values.type && !['user', 'feedback', 'project', 'reference', 'thread'].includes(values.type)) throw new RetrievalInputError('Invalid fact type');
  const filters = {};
  for (const key of ['tag', 'type', 'slug', 'since', 'until']) {
    if (values[key] === undefined) continue;
    if (typeof values[key] !== 'string' || !values[key].trim() || values[key].length > 200 || /[\x00-\x1f\x7f]/.test(values[key])) throw new RetrievalInputError('Invalid fact filter');
    filters[key] = values[key];
  }
  return { question: question.trim(), scope, mode, change: values.change, limit, filters, json: Boolean(values.json) };
}
