// Search and evidence briefs share one access-filtered selection path.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { FACT_COLUMNS, personalFilter } from './digest.mjs';
import { openStore } from './store.mjs';
import { FTS_HITS } from '../../worker/statements.mjs';

const F_COLUMNS = FACT_COLUMNS.split(', ').map(column => `f.${column}`).join(', ');

// Change state of every slug, from one read of the archive folder.
export function stateOf(root) {
  const archive = join(root, 'openspec', 'changes', 'archive');
  const shipped = new Set(existsSync(archive) ? readdirSync(archive).map(name => name.replace(/^\d{4}-\d{2}-\d{2}-/, '')) : []);
  return slug => existsSync(join(root, 'openspec', 'changes', slug)) ? 'active' : shipped.has(slug) ? 'shipped' : 'conversation';
}

// Words too common to match on their own: a fact sharing only *how* or *should* with a question is noise.
const FILLER = new Set(('how should what when which does the and for with that this from into about have been would could there their '
  + 'them then than also just only some any all our your you are was were can will not').split(' '));

// FTS5 query: every significant word, OR-joined, so a paraphrase that shares a few words still ranks. Filler
// words drop out, unless nothing else is left.
export function ftsQuery(text) {
  const all = [...new Set(text.toLowerCase().match(/[\p{L}\p{N}_]{3,}/gu) || [])];
  const meant = all.filter(word => !FILLER.has(word));
  const words = (meant.length ? meant : all).slice(0, 24);
  return words.length ? words.map(word => `"${word}"`).join(' OR ') : null;
}

// Facts carrying any of these tags or their aliases, as a WHERE fragment on alias `f`.
export const tagClause = tags => ({
  sql: `f.id IN (SELECT fact_id FROM fact_tags WHERE tag IN (SELECT name FROM tags WHERE coalesce(alias_of, name) IN (
    SELECT coalesce(alias_of, name) FROM tags WHERE name IN (${tags.map(() => '?').join(', ')}))))`,
  params: tags,
});

export async function readFacts(ctx, { values = {}, positionals = [] }, store = openStore(ctx)) {
  const joins = [];
  const where = [];
  const params = [];
  const match = ftsQuery(positionals.join(' '));
  // The full-text search goes through the one fragment the memory Worker lets every key run.
  if (match) { joins.push(`JOIN ${FTS_HITS} hits ON hits.rowid = f.id`); params.push(match); }
  // The sessions a search reads: those that started on --branch, and those that wrote a fact on --change, so a
  // session whose branch was renamed still counts. Both together is one set, under one limit.
  const sessions = [];
  if (values.branch) { sessions.push('f.session_id IN (SELECT id FROM sessions WHERE branch = ?)'); params.push(values.branch); }
  if (values.change) { sessions.push('f.session_id IN (SELECT DISTINCT session_id FROM facts WHERE slug = ? AND session_id IS NOT NULL)'); params.push(values.change); }
  if (sessions.length) where.push(`(${sessions.join(' OR ')})`);
  if (!values.all) where.push('f.superseded_by IS NULL');
  const personal = values.everyone ? null : await personalFilter(ctx, store);
  if (personal) { where.push(personal.clause); params.push(...personal.params); }
  const filters = { type: 'f.type = ?', slug: 'f.slug = ?', since: 'f.created_at >= ?', until: 'f.created_at <= ?', author: 'f.author LIKE ?' };
  for (const [key, clause] of Object.entries(filters)) {
    if (!values[key]) continue;
    where.push(clause);
    params.push(key === 'author' ? `%${values[key]}%` : values[key]);
  }
  if (values.tag) {
    const tag = tagClause([values.tag]);
    where.push(tag.sql);
    params.push(...tag.params);
  }
  const limit = Number(values.limit) || 30;
  const sql = `SELECT ${F_COLUMNS} FROM facts f ${joins.join(' ')} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY ${match ? 'hits.rank,' : ''} f.created_at DESC, f.id DESC${values.state ? '' : ` LIMIT ${limit}`}`;
  const state = stateOf(ctx.root);
  // The state comes from this checkout's change folders, not the store, so it filters before the limit here.
  const facts = (await store.query(sql, params)).map(fact => ({ ...fact, state: state(fact.slug) }))
    .filter(fact => !values.state || fact.state === values.state).slice(0, limit);
  return { version: 1, filters: { terms: positionals.join(' '), ...Object.fromEntries(Object.keys(filters).concat(['tag', 'branch', 'change', 'state']).filter(key => values[key]).map(key => [key, values[key]])), all: Boolean(values.all), everyone: Boolean(values.everyone), personal: Boolean(personal), limit }, facts };
}

