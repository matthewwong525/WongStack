// Tools added from a chat, live only, held to the key rules when saved and read. PUT and DELETE <prefix>tools/<id>:
// the owner or an Admin adds or removes one, with no publish. wiki/stack/connect-your-tools.md
import { AccessError } from './errors.mjs';
import { forwardProblem, undescribed } from './key-rules.mjs';

/** A tool's id: the same shape as a key used directly, short enough for a secret name. */
export const TOOL_ID = /^[a-z][a-z0-9-]{0,39}$/;
/** The one secret a tool sends, derived from its id and never stored free-form. */
export const toolSecret = id => `TOOL_${id.toUpperCase().replaceAll('-', '_')}`;

const isObject = value => typeof value === 'object' && value !== null && !Array.isArray(value);
const text = (value, max) => typeof value === 'string' && value.length <= max;
/** The first field an object holds beyond the ones named, as a dotted path. */
const unknownField = (value, fields, at) => { const extra = Object.keys(value).find(name => !fields.includes(name)); return extra === undefined ? null : `${at}${extra}: is not a field`; };

/** What a chat saves, checked field by field, strict: name, purpose, API guide, how to reach it and what only reads.
 *  Read is the one level unless the person asked for a key that changes things. A `forward.mcp` is an unknown field. */
export function toolInput(value) {
  const fail = problem => ({ problem });
  if (!isObject(value)) return fail('tool: must be an object');
  const extra = unknownField(value, ['title', 'purpose', 'docs', 'forward', 'levels'], '');
  if (extra) return fail(extra);
  const title = typeof value.title === 'string' ? value.title.trim() : null;
  if (title === null || title.length < 1 || title.length > 60) return fail('title: must be 1 to 60 characters');
  if (typeof value.purpose !== 'string') return fail('purpose: must be text');
  if (!text(value.docs, 500)) return fail('docs: must be text of at most 500 characters');
  const { forward } = value;
  if (!isObject(forward)) return fail('forward: must be an object');
  const extraForward = unknownField(forward, ['base', 'secret', 'header', 'prefix', 'headers', 'lookups', 'exchange'], 'forward.');
  if (extraForward) return fail(extraForward);
  if (!text(forward.base, 500)) return fail('forward.base: must be text of at most 500 characters');
  for (const name of ['secret', 'prefix']) if (forward[name] !== undefined && !text(forward[name], 100)) return fail(`forward.${name}: must be text of at most 100 characters`);
  if (!text(forward.header, 100)) return fail('forward.header: must be text of at most 100 characters');
  if (forward.headers !== undefined && (!isObject(forward.headers) ||
    Object.entries(forward.headers).some(([name, given]) => !/^[A-Za-z0-9-]{1,100}$/.test(name) || !text(given, 500)))) return fail('forward.headers: must name headers with text values');
  if (forward.lookups !== undefined && (!Array.isArray(forward.lookups) || forward.lookups.length > 50 ||
    forward.lookups.some(entry => !text(entry, 300)))) return fail('forward.lookups: must be at most 50 entries of text');
  if (forward.exchange !== undefined) {
    if (!isObject(forward.exchange)) return fail('forward.exchange: must be an object');
    const extraExchange = unknownField(forward.exchange, ['url'], 'forward.exchange.');
    if (extraExchange) return fail(extraExchange);
    if (!text(forward.exchange.url, 500)) return fail('forward.exchange.url: must be text of at most 500 characters');
  }
  const levels = value.levels ?? ['read'];
  const fits = Array.isArray(levels) && levels[0] === 'read' && (levels.length === 1 || (levels.length === 2 && levels[1] === 'write'));
  if (!fits) return fail('levels: must be ["read"] or ["read", "write"]');
  return { tool: { title, purpose: value.purpose, docs: value.docs, forward, levels } };
}

/** A tool as the registry holds it: its own secret, and its ID's when it trades them for a token; live only, marked
 *  as added in a chat. */
const entry = (id, tool) => ({ title: tool.title, purpose: tool.purpose, docs: tool.docs,
  secrets: [toolSecret(id), ...(tool.forward.exchange ? [`${toolSecret(id)}_ID`] : [])], levels: tool.levels, liveOnly: true, chat: true,
  forward: { ...tool.forward, secret: tool.forward.secret ?? toolSecret(id) } });

/** The tool as stored, or the first rule it breaks, named: the same rules the checks hold a project's key to. */
export function checkedTool(id, tool) {
  if (!TOOL_ID.test(id)) return { problem: "a tool's id is lowercase letters, digits and hyphens, at most 40" };
  // TOOL_<ID>_ID is the ID of a tool that trades it for a token, so no tool's own key may take that name.
  if (id.endsWith('-id')) return { problem: "a tool's id never ends in -id" };
  const made = entry(id, tool);
  if (made.forward.secret !== toolSecret(id)) return { problem: `secret must be the tool's own, ${toolSecret(id)}` };
  const problem = undescribed({ [id]: { ...made, docs: made.docs || undefined } })[0] ?? forwardProblem(id, made, made.forward);
  return problem ? { problem: problem.replace(new RegExp(`^${id}: `), '') } : { entry: made };
}

/** The stored rows as registry entries, read back through the same rules: a row that breaks one is left out. A row
 *  with an MCP server, no longer passed on, is skipped, named in `skipped`, and `audit(id)` is called for it. */
export async function storedTools(rows, { audit } = {}) {
  const entries = {};
  const skipped = [];
  for (const row of rows) {
    let forward;
    let levels;
    try { forward = JSON.parse(row.forward_json); levels = JSON.parse(row.levels_json); } catch { continue; }
    if (isObject(forward) && Object.hasOwn(forward, 'mcp')) { skipped.push(row.id); continue; }
    const read = toolInput({ title: row.title, purpose: row.purpose, docs: row.docs, forward, levels });
    const checked = read.tool ? checkedTool(row.id, read.tool) : null;
    if (checked?.entry) entries[row.id] = checked.entry;
  }
  for (const id of skipped) await audit?.(id);
  return { entries, skipped };
}

/** The store's tools as registry entries; none when the store can not be read. The first read that skips an MCP
 *  tool writes one change-record line naming it, `tool_skipped_mcp:<id>`, and no later read writes it again. */
export async function readTools(store, actor = 'access') {
  let rows;
  try { rows = await store.tools(); } catch { return {}; }
  const { entries } = await storedTools(rows, { audit: async id => {
    const event = `tool_skipped_mcp:${id}`;
    try { if (!await store.audited(event)) await store.audit(actor, event); } catch { /* the list still loads */ }
  } });
  return entries;
}

/** What a level on a tool lets a person do: its address, its look-ups and the levels it offers. */
const reads = (forward, levels) => JSON.stringify([forward.base, forward.lookups ?? [], levels]);

/** PUT or DELETE <prefix>tools/<id>, for a caller the module has already found to manage Access. */
export async function toolsRoute(ctx) {
  const { request, pass, store, slots, reply, refuse } = ctx;
  try {
    const id = ctx.path.slice('tools/'.length);
    if (!TOOL_ID.test(id) || !['PUT', 'DELETE'].includes(request.method)) return refuse('not_found', 404);
    // A preview runs branch code, so it holds no tool; a project key's name stays the project's.
    if (!pass.live) return refuse('live_only', 409);
    // The keys slot may carry the saved tools too, as WongStack's does: only a key the code lists is the project's.
    const own = slots.keys?.() ?? {};
    if (Object.hasOwn(own, id) && !own[id].chat) return refuse('code_key', 409);
    // As Access's first read does, so a fresh install's first look-up right after a save is not refused.
    await ctx.start();
    const before = (await store.tools()).find(row => row.id === id);
    if (request.method === 'DELETE') {
      if (!before) return refuse('not_found', 404);
      await store.removeTool(id, pass.actor);
      return reply({ removed: true });
    }
    const read = toolInput(await ctx.json(16_384));
    if (read.problem) return refuse('bad_tool', 400, read.problem);
    const checked = checkedTool(id, read.tool);
    if (checked.problem) return refuse('bad_tool', 400, checked.problem);
    const { title, purpose, docs, forward, levels } = checked.entry;
    // A level given for what the tool read before does not carry over to what it reads now.
    let changed = false;
    if (before) {
      try { changed = reads(JSON.parse(before.forward_json), JSON.parse(before.levels_json)) !== reads(forward, levels); } catch { changed = true; }
    }
    await store.saveTool({ row: { id, title, purpose, docs, forward_json: JSON.stringify(forward), levels_json: JSON.stringify(levels) },
      actor: pass.actor, clearLevels: changed });
    return reply({ id, secret: toolSecret(id) });
  } catch (error) {
    return error instanceof AccessError ? refuse(error.code, error.status) : refuse('access_unavailable', 503);
  }
}
