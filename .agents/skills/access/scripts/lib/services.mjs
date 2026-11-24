// Each service's definition on disk, placed by .agents/access/slots.json: `api`, `record`, refresh, the not-added
// hint and the check. wiki/stack/service-catalogue.md#each-services-definition owns the rules.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
import { PLACEHOLDER, VERSION, addExample, brokenRefs, callLines, findOperation, matching, newDefinition, newFields, operations,
  resolve, responseFor, shortView, template, typesFile, validate } from './openapi.mjs';
import { madeUp, privateFields, scrubExample } from './scrub.mjs';

const KEY = /^[a-z][a-z0-9-]*$/;
const NAME = /^[a-z0-9][a-z0-9-]*$/;
const SOURCES = ['live', 'change'];
const readJson = file => JSON.parse(readFileSync(file, 'utf8'));
export const SLOTS = join('.agents', 'access', 'slots.json');

/** Where a project keeps its service files, each path from the repo root or null when it names none. WongStack (a
 *  repo with scripts/company-api.mjs) has its own places for any it leaves out, and its own commands. */
export function layout(root) {
  let given = {};
  try { given = readJson(join(root, SLOTS)); } catch { /* none written: WongStack's, or nothing */ }
  const stack = existsSync(join(root, 'scripts', 'company-api.mjs'));
  const pick = (name, fallback) => typeof given[name] === 'string' && given[name] ? given[name] : stack ? fallback : null;
  return { definitions: pick('definitions', 'schema/services'), types: pick('types', 'app/worker/services'), notes: pick('notes', 'wiki/services'),
    keys: pick('keys', 'app/worker/keys.ts'), app: typeof given.app === 'string' ? given.app : null,
    helper: stack ? 'node scripts/company-api.mjs' : 'node .claude/skills/access/scripts/services.mjs',
    check: 'node .claude/skills/access/scripts/check-definitions.mjs' };
}
/** The one line that says what to fill before `api` and `record` work, or null. */
export const missingPlace = root => layout(root).definitions ? null
  : `Name where service definitions live: add "definitions" (such as "schema/services") to ${SLOTS}.`;
const place = root => { const where = layout(root); if (!where.definitions) throw new Error(missingPlace(root)); return where; };
const HELPER = root => layout(root).helper;

const folder = (root, key) => join(root, place(root).definitions, key);
const definitionFile = (root, key) => join(folder(root, key), 'openapi.json');
const typesPath = (root, key) => join(root, layout(root).types, `${key}.ts`);
const typed = root => { const types = layout(root).types; return types !== null && existsSync(join(root, dirname(types))); };
const lastFile = root => join(root, '.cache', 'company-api', 'last.json');
const writeJson = (file, value) => { mkdirSync(join(file, '..'), { recursive: true }); writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`); };

/** The service's definition, or null before its first call is saved. */
export const loadDefinition = (root, key) => layout(root).definitions && existsSync(definitionFile(root, key)) ? readJson(definitionFile(root, key)) : null;

/** Each saved example of a service: its name, its path from the repo root, and the exchange. */
export function examplesOf(root, key) {
  const dir = layout(root).definitions && join(folder(root, key), 'examples');
  return dir && existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5)).sort()
    .map(name => ({ name, file: relative(root, join(dir, `${name}.json`)), path: join(dir, `${name}.json`) })) : [];
}

/** How many calls a service's definition holds: 0 before the first is saved. */
export const callCount = (root, key) => operations(loadDefinition(root, key)).length;

/** The service folders under the definitions folder. */
export const serviceKeys = root => layout(root).definitions && existsSync(join(root, layout(root).definitions))
  ? readdirSync(join(root, layout(root).definitions), { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort() : [];

/** The definition and its types file, written together so the two never disagree. */
function writeDefinition(root, key, doc) {
  writeJson(definitionFile(root, key), doc);
  if (typed(root)) { mkdirSync(join(root, layout(root).types), { recursive: true }); writeFileSync(typesPath(root, key), typesFile(key, doc)); }
}

const exampleFiles = (root, key, doc, call) => examplesOf(root, key).filter(({ path }) => {
  try { return matching(doc, readJson(path).request).some(found => found.method === call.method && found.path === call.path); } catch { return false; }
});

/** `api <key> [<call>]`: one line per call, or one call's short view. `company` reads the app's own calls live. */
export async function apiCommand(client, root, key, call) {
  const helper = HELPER(root);
  if (key !== 'company') place(root);
  if (!KEY.test(key ?? '')) throw new Error(`usage: ${helper} api <key> [<call>]; the keys are in \`${helper} services\``);
  const doc = key === 'company' ? (await client.http('/api/openapi.json')).value : loadDefinition(root, key);
  if (!doc) return `No calls saved for ${key} yet. Read its notes and guide (\`${helper} services\`), make the call with ${key}.read, then save it: ${helper} record ${key} <name> --file -`;
  if (!call) return operations(doc).length ? callLines(doc).join('\n') : 'No calls yet.';
  const found = findOperation(doc, call);
  return shortView(doc, found, key === 'company' ? [] : exampleFiles(root, key, doc, found).map(({ file }) => file));
}

/** The name, address and guide of a service, from its look-up action, for its new definition file. */
async function serviceInfo(client, key) {
  const action = await client.describe(`${key}.read`);
  const own = (action.keys ?? []).find(entry => entry.id === key) ?? {};
  return { title: own.name ?? key, docs: own.docs, base: /API at (https:\/\/\S+?\/)(?=[ ,]|$)/.exec(action.description ?? '')?.[1] };
}

const requestOf = ({ method, path, query, body, contentType }) => ({ method, path, ...(query !== undefined && { query }), ...(body !== undefined && { body }),
  ...(contentType !== undefined && { contentType }) });
const answerOf = ({ status, contentType, body }) => ({ status, contentType, body });
const today = now => new Date(now).toISOString().slice(0, 10);

/** One exchange scrubbed, saved under its name, and added to the definition; the types follow. */
function save(root, key, name, example, doc) {
  const clean = scrubExample(example, { base: doc.servers?.[0]?.url });
  const before = structuredClone(doc);
  const grown = addExample(doc, clean, example.source === 'change' ? 'change' : 'read');
  writeJson(join(folder(root, key), 'examples', `${name}.json`), clean);
  writeDefinition(root, key, grown.doc);
  const call = findOperation(grown.doc, `${grown.method} ${grown.path}`);
  const old = matching(before, clean.request)[0];
  return { ...grown, call, fields: old ? newFields(answerSchema(before, old.operation, clean.answer.status), answerSchema(grown.doc, call.operation, clean.answer.status)) : [] };
}

/** The JSON schema of the answer a status is described by, followed through references. */
function answerSchema(doc, operation, status) {
  const content = resolve(doc, responseFor(operation, status))?.content ?? {};
  const entry = Object.entries(content).find(([type]) => /json/i.test(type)) ?? Object.entries(content)[0];
  return resolve(doc, entry?.[1]?.schema);
}

/** `record <key> <name>`: a look-up sent through `<key>.read`, or with `last` the change already made, saved as an
 *  example. Returns the call's short view, and asks for its summary and description while they are not written. */
export async function record(client, root, key, name, { input, last, now = Date.now() } = {}) {
  if (!KEY.test(key ?? '') || key === 'company') throw new Error(`Name a service key, such as \`${HELPER(root)} record notion search --file -\`; company is the app's own.`);
  place(root);
  if (!NAME.test(name ?? '')) throw new Error('Name the example in lowercase letters, digits and hyphens, such as search or get-page.');
  let example;
  if (last) {
    const kept = existsSync(lastFile(root)) ? readJson(lastFile(root)) : null;
    if (kept?.key !== key) throw new Error(`No change to ${key} is kept. Make the change with ${key}.change first; --last saves the last one, never sending it again.`);
    example = { source: 'change', recorded: today(now), request: requestOf(kept.request), answer: answerOf(kept.answer) };
  } else {
    const answer = await client.call(`${key}.read`, input);
    if (answer?.error) throw Object.assign(new Error(`${key}.read refused it (${answer.error.code}), so nothing was saved. Only a look-up is saved this way.`), { answer });
    example = { source: 'live', recorded: today(now), request: requestOf(input), answer: answerOf(answer) };
  }
  const doc = loadDefinition(root, key) ?? newDefinition(await serviceInfo(client, key));
  const saved = save(root, key, name, example, doc);
  const view = shortView(saved.doc, saved.call, exampleFiles(root, key, saved.doc, saved.call).map(({ file }) => file));
  const unwritten = saved.call.operation.summary === PLACEHOLDER || !saved.call.operation.description;
  return `${view}${unwritten ? `\n\nWrite this call's summary (what we use it for) and description (how we use it, its quirks) in ${relative(root, definitionFile(root, key))}.` : ''}`;
}

/** `record --refresh [<key>]`: each saved look-up asked again through `<key>.read`, checked against its call, then
 *  saved again; a kept change or a made-up request is never sent. Then the check runs on the saved files. */
export async function refresh(client, root, only, { now = Date.now() } = {}) {
  const keys = only ? [only] : serviceKeys(root);
  if (only && !loadDefinition(root, only)) throw new Error(`No definition for ${only} yet: nothing to refresh.`);
  const saved = [], fields = [], skipped = [], failed = [], misfits = [];
  for (const key of keys) {
    let doc = loadDefinition(root, key);
    if (!doc) continue;
    for (const { name, path } of examplesOf(root, key)) {
      const example = readJson(path);
      if (example.source !== 'live') { skipped.push(`${key}/${name} (a real change)`); continue; }
      if (madeUp(example.request)) { skipped.push(`${key}/${name} (its request was made up)`); continue; }
      const answer = await client.call(`${key}.read`, example.request);
      if (answer?.error || !(answer?.status < 400)) { failed.push(`${key}/${name}: ${answer?.error?.code ?? `status ${answer?.status}`}; the saved one stays`); continue; }
      const fresh = { ...example, recorded: today(now), answer: answerOf(answer) };
      misfits.push(...fitProblems(doc, fresh).map(line => `${key}/${name}: ${line}`));
      const result = save(root, key, name, fresh, doc);
      doc = result.doc;
      saved.push(`${key}/${name}`);
      if (result.fields.length) fields.push(`${key}/${name}: ${result.fields.join(', ')}`);
    }
  }
  const problems = await checkServices({ root, keys });
  const lines = [...(saved.length ? [`saved again  ${saved.join(', ')}`] : []), ...fields.map(line => `new fields   ${line}`),
    ...skipped.map(line => `not checked  ${line}`), ...failed.map(line => `not saved    ${line}`), ...[...misfits, ...problems].map(line => `doesn't fit  ${line}`)];
  return { text: lines.length ? lines.join('\n') : 'No examples to refresh.', ok: !misfits.length && !problems.length && !failed.length };
}

/** After a direct call the definition doesn't hold, the one command that saves it; null for a known call. */
export function notAddedHint(root, id, input, answer) {
  const [, key, kind] = /^([a-z][a-z0-9-]*)\.(read|change)$/.exec(id ?? '') ?? [];
  if (!key || key === 'company' || answer?.error || answer?.status >= 400 || typeof input?.method !== 'string' || typeof input?.path !== 'string') return null;
  const where = layout(root);
  if (!where.definitions) return null;
  const doc = loadDefinition(root, key);
  if (doc && matching(doc, input).length) return null;
  const name = template(input.path).replace(/[{}]/g, '').split('/').filter(Boolean).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'call';
  const how = kind === 'read' ? `${where.helper} record ${key} ${name} --file - <<'EOF'\n${JSON.stringify(input)}\nEOF` : `${where.helper} record ${key} ${name} --last`;
  return `Not in ${where.definitions}/${key} yet. Add it: ${how}`;
}

/** Keep the last change made, so `record --last` can save it without sending it again. The folder ignores itself. */
export function keepLast(root, id, input, answer) {
  const [, key] = /^([a-z][a-z0-9-]*)\.change$/.exec(id ?? '') ?? [];
  if (!key || answer?.error || answer?.status >= 400 || typeof input?.method !== 'string') return;
  const dir = join(root, '.cache', 'company-api');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  writeFileSync(join(dir, '.gitignore'), '*\n');
  writeFileSync(lastFile(root), `${JSON.stringify({ key, request: input, answer })}\n`, { mode: 0o600 });
}

/** The notes folders: the one named, and its company-knowledge copy beside a wiki one. */
const notesDirs = root => { const notes = layout(root).notes; return notes ? [...new Set([notes, notes.replace(/^wiki\//, 'knowledge/')])] : []; };
/** The notes page a key has, or would have: its path from the repo root, and whether it is written. Null for an id
 *  no page can have, or a project with no notes folder. */
export function notesPage(root, id) {
  const notes = layout(root).notes;
  return notes && /^[a-z0-9][a-z0-9-]*$/.test(id) ? { path: `${notes}/${id}.md`, exists: existsSync(join(root, notes, `${id}.md`)) } : null;
}

/** The keys a services folder may be named for: the project's registry, and each service with a notes page. */
async function knownKeys(root) {
  const registry = layout(root).keys && join(root, layout(root).keys);
  const coded = registry && existsSync(registry) ? Object.keys((await import(pathToFileURL(registry).href)).keys ?? {}) : [];
  const noted = notesDirs(root).flatMap(dir => existsSync(join(root, dir))
    ? readdirSync(join(root, dir)).filter(name => name.endsWith('.md') && name !== 'README.md').map(name => name.slice(0, -3)) : []);
  return new Set([...coded, ...noted]);
}

/** Every rule a service's definition breaks, each naming its file and field. `keys` limits it to those services. */
export async function checkServices({ root, keys } = {}) {
  const known = await knownKeys(root);
  return (keys ?? serviceKeys(root)).flatMap(key => checkService(root, key, known));
}

function checkService(root, key, known) {
  const where = relative(root, folder(root, key));
  if (key === 'company') return [`${where}: company is kept for the app's own calls (\`api company\`); name the folder for its key`];
  const { keys, notes } = layout(root);
  const problems = known.has(key) ? [] : [`${where}: no key ${key}${keys ? ` in ${keys}` : ''} and no notes page${notes ? ` ${notes}/${key}.md` : ''}`];
  const file = relative(root, definitionFile(root, key));
  let doc;
  try { doc = readJson(definitionFile(root, key)); } catch (error) { return [...problems, `${file}: ${error.code === 'ENOENT' ? 'missing' : `does not parse: ${error.message}`}`]; }
  if (doc.openapi !== VERSION) problems.push(`${file}: openapi is ${JSON.stringify(doc.openapi)}, not ${VERSION}, the app's own version`);
  problems.push(...brokenRefs(doc).map(line => `${file}: ${line}`));
  if (problems.some(line => line.includes(' names nothing') || line.includes('inside the same file'))) return problems;
  for (const call of operations(doc)) problems.push(...callProblems(call).map(line => `${file}: ${call.method} ${call.path}: ${line}`));
  for (const example of examplesOf(root, key)) problems.push(...exampleProblems(doc, example).map(line => `${example.file}: ${line}`));
  if (typed(root)) {
    const types = typesPath(root, key);
    if (!existsSync(types) || readFileSync(types, 'utf8') !== typesFile(key, doc)) problems.push(`${relative(root, types)}: out of date with ${file}; rebuild it: ${layout(root).check} --types`);
  }
  return problems;
}

const callProblems = ({ operation }) => [
  ...(operation.operationId ? [] : ['needs an operationId']),
  ...(['read', 'change'].includes(operation['x-effect']) ? [] : ['needs x-effect: read or change']),
  ...(!operation.summary?.trim() || operation.summary === PLACEHOLDER ? ['needs a summary: what we use it for'] : []),
  ...(operation.description?.trim() ? [] : ['needs a description: how we use it, and its quirks'])];

function exampleProblems(doc, { path }) {
  let example;
  try { example = readJson(path); } catch (error) { return [`does not parse: ${error.message}`]; }
  if (!SOURCES.includes(example.source) || !example.request || !example.answer) return ['needs source (live or change), request and answer'];
  return [...fitProblems(doc, example), ...privateFields(example, { base: doc.servers?.[0]?.url })];
}

/** Where an exchange doesn't fit the call its request names: no one call, no answer for its status, or a field. */
function fitProblems(doc, { request, answer }) {
  const found = matching(doc, request);
  if (found.length !== 1) return [`its request ${request.method} ${request.path} fits ${found.length} calls, not one`];
  if (!responseFor(found[0].operation, answer.status)) return [`${found[0].method} ${found[0].path} describes no answer for status ${answer.status}`];
  const schema = answerSchema(doc, found[0].operation, answer.status);
  return validate(doc, schema, answer.body).map(line => `answer.body${line.startsWith('(') ? '' : '.'}${line.replace(/^\(the whole answer\)/, '')}`);
}

/** Rewrite each service's types file from its definition; one with a broken reference is left for the check to name. */
export function writeTypes(root, keys = serviceKeys(root)) {
  for (const key of keys) { const doc = loadDefinition(root, key); if (doc && !brokenRefs(doc).length) writeDefinition(root, key, doc); }
}
