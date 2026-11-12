// Search and evidence briefs: one `facts` read; the store applies who sees what.
import { openStore } from './store.mjs';

const FILTERS = ['type', 'slug', 'since', 'until', 'author', 'tag', 'branch', 'change', 'state'];
// Whether search terms hold a word the store can match: three letters or more.
export const hasTerms = text => /[\p{L}\p{N}_]{3,}/u.test(String(text));

export async function readFacts(ctx, { values = {}, positionals = [], ids }, given) {
  const store = await (given ?? openStore(ctx));
  if (ids && (!ids.length || ids.length > 20 || ids.some(id => !Number.isSafeInteger(id) || id <= 0))) throw new Error('invalid bounded fact IDs');
  const terms = positionals.join(' ');
  const limit = Number(values.limit) || 30;
  // The state comes from this checkout's change folders, not the store, so it filters before the limit here.
  const [found] = await store.facts([{ terms, ids, type: values.type, slug: values.slug, since: values.since, until: values.until,
    author: values.author, branch: values.branch, change: values.change, tags: values.tag ? [values.tag] : undefined,
    all: Boolean(values.all), everyone: Boolean(values.everyone), withTags: Boolean(values.withTags), limit: values.state ? undefined : limit }]);
  const state = (await store.profile?.slugState?.(ctx)) ?? (() => undefined);
  const facts = found.map(fact => ({ ...fact, state: state(fact.slug) })).filter(fact => !values.state || fact.state === values.state).slice(0, limit);
  const filters = Object.fromEntries(FILTERS.filter(key => values[key]).map(key => [key, values[key]]));
  return { version: 1, filters: { terms, ...filters, all: Boolean(values.all), everyone: Boolean(values.everyone), personal: !values.everyone, limit }, facts };
}
