// Reads and grows a service's OpenAPI file: the one-line list and short view a chat reads, a call built from a saved
// exchange, the answer check and the types file. wiki/stack/service-catalogue.md#each-services-definition
import { idPart } from './lib-scrub.mjs';

export const VERSION = '3.2.0';
/** A recorded call's summary until a chat writes what the call is for. */
export const PLACEHOLDER = 'Recorded call: describe it';
const METHODS = ['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace', 'query'];
// The short view cuts an object nested deeper than this to {…}.
const DEPTH = 3;

const isObject = value => !!value && typeof value === 'object' && !Array.isArray(value);
const list = value => value === undefined ? [] : [].concat(value);

/** The value a local `#/…` reference names; throws naming a reference that names nothing. */
export function pointer(doc, ref) {
  if (typeof ref !== 'string' || !ref.startsWith('#/')) throw new Error(`${ref}: only a reference inside the same file is read`);
  return ref.slice(2).split('/').map(part => part.replaceAll('~1', '/').replaceAll('~0', '~')).reduce((node, part) => {
    if (!isObject(node) && !Array.isArray(node) || !Object.hasOwn(node, part)) throw new Error(`${ref} names nothing`);
    return node[part];
  }, doc);
}

/** A schema with its references followed; a reference back to itself reads as any value. */
export function resolve(doc, schema, seen = new Set()) {
  while (isObject(schema) && typeof schema.$ref === 'string') {
    if (seen.has(schema.$ref)) return {};
    seen.add(schema.$ref);
    schema = pointer(doc, schema.$ref);
  }
  return schema;
}

/** Each reference in the file that names nothing, with where it sits. */
export function brokenRefs(doc) {
  const found = [];
  const walk = (node, at) => {
    if (!node || typeof node !== 'object') return;
    if (typeof node.$ref === 'string') try { pointer(doc, node.$ref); } catch (error) { found.push(`${at || '/'}: ${error.message}`); }
    for (const [name, child] of Object.entries(node)) walk(child, `${at}/${name}`);
  };
  walk(doc, '');
  return found;
}

/** Every call in the file: method, path with no leading slash, the operation, and its parameters. */
export const operations = doc => Object.entries(doc?.paths ?? {}).flatMap(([path, item]) => METHODS.filter(method => isObject(item?.[method]))
  .map(method => ({ method: method.toUpperCase(), path: path.replace(/^\//, ''), operation: item[method],
    parameters: [...list(item.parameters), ...list(item[method].parameters)].map(parameter => resolve(doc, parameter)) })));

const pattern = template => new RegExp(`^${template.split('/').map(part => /^\{[^}]+\}$/.test(part) ? '[^/]+'
  : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('/')}$`);

/** The calls a request is one of, by its method and path. */
export const matching = (doc, { method, path }) => operations(doc)
  .filter(call => call.method === String(method).toUpperCase() && pattern(call.path).test(String(path).replace(/^\//, '')));

/** One line per call: method, path and what it is for. */
export function callLines(doc) {
  const calls = operations(doc);
  const methods = Math.max(4, ...calls.map(call => call.method.length)), paths = Math.max(0, ...calls.map(call => call.path.length));
  return calls.map(call => `${call.method.padEnd(methods)} ${call.path.padEnd(paths)}  ${call.operation.summary ?? ''}`.trimEnd());
}

const distance = (a, b) => {
  let row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
};
const words = call => [...call.path.split('/').map(part => part.replace(/[{}]/g, '')), ...String(call.operation.operationId ?? '').split(/[^A-Za-z0-9]+|(?=[A-Z])/)]
  .filter(Boolean).map(word => word.toLowerCase());
const named = call => `${call.method} ${call.path}`;

/** The one call `query` names: its operationId, its path or a real path it matches, `METHOD path`, or a word only
 *  its path or operationId holds. Throws naming the closest call when none or several fit. */
export function findOperation(doc, query) {
  const calls = operations(doc), text = String(query).replace(/^\//, '');
  const [, method, path] = /^([A-Za-z]+) (.+)$/.exec(text) ?? [];
  const tries = [call => call.operation.operationId === text, call => call.path === text || pattern(call.path).test(text),
    call => !!method && call.method === method.toUpperCase() && (call.path === path || pattern(call.path).test(path.replace(/^\//, ''))),
    call => words(call).includes(text.toLowerCase())];
  for (const fits of tries) {
    const found = calls.filter(fits);
    if (found.length === 1) return found[0];
    if (found.length > 1) throw new Error(`"${query}" fits ${found.length} calls: ${found.map(named).join(', ')}. Name one by its method and path.`);
  }
  const closest = calls.map(call => [call, Math.min(...[call.path, call.operation.operationId ?? '', ...words(call)].map(word => distance(word.toLowerCase(), text.toLowerCase())))])
    .sort((a, b) => a[1] - b[1])[0]?.[0];
  throw new Error(`No call "${query}" yet.${closest ? ` Closest: ${named(closest)}.` : ''}`);
}

const identifier = name => /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name);
const grouped = text => / [|&] /.test(text) ? `(${text})` : text;

/** A schema as a TypeScript-like type: one line, objects past `cut` levels as {…}; or, with `indent`, a block. */
export function typeText(doc, schema, { depth = 1, cut = Infinity, indent, seen = new Set() } = {}) {
  if (isObject(schema) && typeof schema.$ref === 'string') {
    if (seen.has(schema.$ref)) return 'unknown';
    return typeText(doc, pointer(doc, schema.$ref), { depth, cut, indent, seen: new Set([...seen, schema.$ref]) });
  }
  if (!isObject(schema)) return 'unknown';
  const inner = (child, more = 0) => typeText(doc, child, { depth: depth + more, cut, indent: indent === undefined ? undefined : indent + more * 2, seen });
  if (schema.enum) return schema.enum.map(value => JSON.stringify(value)).join(' | ');
  if (schema.oneOf ?? schema.anyOf) return (schema.oneOf ?? schema.anyOf).map(child => inner(child)).join(' | ');
  if (schema.allOf) return schema.allOf.map(child => grouped(inner(child))).join(' & ');
  const types = list(schema.type ?? (schema.properties ? 'object' : schema.items ? 'array' : undefined));
  if (!types.length) return 'unknown';
  const one = type => {
    if (type === 'object') return objectText(schema, depth, cut, indent, inner);
    if (type === 'array') return `${grouped(inner(schema.items))}[]`;
    return type === 'integer' ? 'number' : ['string', 'number', 'boolean', 'null'].includes(type) ? type : 'unknown';
  };
  return types.map(one).join(' | ');
}

function objectText(schema, depth, cut, indent, inner) {
  const properties = Object.entries(schema.properties ?? {});
  if (!properties.length) return isObject(schema.additionalProperties) ? `Record<string, ${inner(schema.additionalProperties)}>` : 'Record<string, unknown>';
  if (depth > cut) return '{…}';
  const required = new Set(schema.required ?? []);
  const fields = properties.map(([name, child]) => `${identifier(name)}${required.has(name) ? '' : '?'}: ${inner(child, 1)}`);
  if (indent === undefined) return `{ ${fields.join(', ')} }`;
  const pad = ' '.repeat(indent + 2);
  return `{\n${fields.map(field => `${pad}${field};`).join('\n')}\n${' '.repeat(indent)}}`;
}

const jsonSchema = content => Object.entries(content ?? {}).find(([type]) => /json/i.test(type))?.[1]?.schema
  ?? Object.values(content ?? {})[0]?.schema;
const successes = operation => Object.entries(operation.responses ?? {}).filter(([status]) => status.startsWith('2'));
const first = text => String(text ?? '').split('\n')[0].trim();

/** One line per top-level field with a description, under the line it explains. */
function fieldNotes(doc, schema) {
  const properties = resolve(doc, schema)?.properties ?? {};
  return Object.entries(properties).flatMap(([name, child]) => {
    const note = first(resolve(doc, child)?.description);
    return note ? [`    ${name}: ${note}`] : [];
  });
}

const parameterSchema = parameters => ({ type: 'object', required: parameters.filter(parameter => parameter.required).map(parameter => parameter.name),
  properties: Object.fromEntries(parameters.map(parameter => [parameter.name, { ...parameter.schema, ...(parameter.description && { description: parameter.description }) }])) });

/** One call as a chat reads it: what it is for, how we use it, what to send, what comes back and its examples. */
export function shortView(doc, call, examples = []) {
  const { method, path, operation, parameters } = call;
  const lines = [`${method} ${path} — ${operation.summary ?? ''}`.trimEnd(), ...String(operation.description ?? '').trim().split('\n').filter(Boolean).map(line => `  ${line.trim()}`)];
  const section = (label, schema) => [`  ${label} ${typeText(doc, schema, { cut: DEPTH })}`, ...fieldNotes(doc, schema)];
  for (const where of ['path', 'query']) {
    const own = parameters.filter(parameter => parameter.in === where);
    if (own.length) lines.push(...section(where, parameterSchema(own)));
  }
  const body = resolve(doc, operation.requestBody);
  if (body?.content) lines.push(...section('send', jsonSchema(body.content)));
  for (const [status, answer] of successes(operation)) {
    const content = resolve(doc, answer)?.content;
    lines.push(...(content ? section(`answer ${status}`, jsonSchema(content)) : [`  answer ${status} (no body)`]));
  }
  return [...lines, ...examples.map(file => `  example: ${file}`)].join('\n');
}

/** The answer a status is described by: its own code, its class such as 2XX, or the default. */
export const responseFor = (operation, status) => operation.responses?.[String(status)] ?? operation.responses?.[`${String(status)[0]}XX`]
  ?? operation.responses?.default;

const typeOf = value => value === null ? 'null' : Array.isArray(value) ? 'array' : typeof value === 'number' ? (Number.isInteger(value) ? 'integer' : 'number') : typeof value;
const fits = (type, value) => type === typeOf(value) || (type === 'number' && typeOf(value) === 'integer');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Where `value` breaks `schema`, as `at: what`. Reads type, properties, required, items, enum, oneOf, anyOf, allOf
 *  and $ref; any other keyword is left unchecked. */
export function validate(doc, schema, value, at = '') {
  schema = resolve(doc, schema);
  if (!isObject(schema)) return [];
  const here = at || '(the whole answer)';
  const types = list(schema.type);
  if (types.length && !types.some(type => fits(type, value))) return [`${here}: is ${typeOf(value)}, not ${types.join(' or ')}`];
  const problems = [];
  if (schema.enum && !schema.enum.some(option => same(option, value))) problems.push(`${here}: ${JSON.stringify(value)} is not one of ${schema.enum.map(option => JSON.stringify(option)).join(', ')}`);
  if (isObject(value)) {
    for (const name of schema.required ?? []) if (!Object.hasOwn(value, name)) problems.push(`${at ? `${at}.` : ''}${name}: missing`);
    for (const [name, child] of Object.entries(schema.properties ?? {})) if (Object.hasOwn(value, name)) problems.push(...validate(doc, child, value[name], `${at ? `${at}.` : ''}${name}`));
  }
  if (Array.isArray(value) && schema.items) value.forEach((item, index) => problems.push(...validate(doc, schema.items, item, `${at}[${index}]`)));
  for (const child of schema.allOf ?? []) problems.push(...validate(doc, child, value, at));
  if (schema.anyOf && !schema.anyOf.some(child => !validate(doc, child, value, at).length)) problems.push(`${here}: fits none of its anyOf choices`);
  if (schema.oneOf) {
    const count = schema.oneOf.filter(child => !validate(doc, child, value, at).length).length;
    if (count !== 1) problems.push(`${here}: fits ${count} of its oneOf choices, not exactly one`);
  }
  return problems;
}

/** The shape of one value: every field it holds is required, a null is its own type, and no format is guessed. */
export function schemaOf(value) {
  const type = typeOf(value) === 'integer' ? 'number' : typeOf(value);
  if (type === 'array') return { type, items: value.map(schemaOf).reduce((a, b) => widen(a, b), undefined) ?? {} };
  if (type !== 'object') return { type };
  const keys = Object.keys(value);
  return { type, properties: Object.fromEntries(keys.map(key => [key, schemaOf(value[key])])), ...(keys.length && { required: keys }) };
}

/** `old` widened to also fit `next`: types join, a field is required only when both require it, and every word a
 *  person wrote stays. A hand-written choice (`$ref`, `oneOf`, `anyOf`, `allOf`, `enum`) is left as it is. */
export function widen(old, next) {
  if (!old) return next;
  if (['$ref', 'oneOf', 'anyOf', 'allOf', 'enum'].some(word => Object.hasOwn(old, word))) return old;
  // A shape not known yet, such as an empty list's items, takes the new one and keeps its words.
  if (old.type === undefined && !old.properties && !old.items) return { ...next, ...old };
  const had = list(old.type ?? (old.properties ? 'object' : 'array'));
  const types = [...new Set([...had, ...list(next.type)])];
  const result = { ...old, type: types.length === 1 ? types[0] : types };
  if (list(next.type).includes('object')) Object.assign(result, had.includes('object') ? joinObjects(old, next) : { properties: next.properties, required: next.required });
  if (list(next.type).includes('array')) result.items = had.includes('array') ? widen(old.items, next.items) : next.items;
  for (const word of ['properties', 'required', 'items']) if (result[word] === undefined) delete result[word];
  return result;
}

function joinObjects(old, next) {
  const properties = { ...old.properties };
  for (const [name, child] of Object.entries(next.properties ?? {})) properties[name] = Object.hasOwn(properties, name) ? widen(properties[name], child) : child;
  const required = (old.required ?? []).filter(name => (next.required ?? []).includes(name));
  return { properties, required: required.length ? required : undefined };
}

/** Each field `after` names that `before` does not, as a path such as `results[].archived`. */
export function newFields(before, after, at = '') {
  if (!isObject(after)) return [];
  const own = Object.entries(after.properties ?? {}).flatMap(([name, child]) => before?.properties && Object.hasOwn(before.properties, name)
    ? newFields(before.properties[name], child, `${at}${at ? '.' : ''}${name}`) : [`${at}${at ? '.' : ''}${name}`]);
  return [...own, ...(after.items ? newFields(before?.items, after.items, `${at}[]`) : [])];
}

const mediaType = type => String(type || 'application/json').split(';')[0].trim();
const pascal = text => text.split(/[^A-Za-z0-9]+/).filter(Boolean).map(word => word[0].toUpperCase() + word.slice(1)).join('');

/** A path with each ID part as `{id}`, `{id2}`, …. */
export function template(path) {
  let count = 0;
  return String(path).replace(/^\//, '').split('/').map(part => idPart(part) ? `{id${++count === 1 ? '' : count}}` : part).join('/');
}

/** A new call built from one saved exchange: its shape, a stable name, whether it reads or changes, and the
 *  placeholder summary a chat replaces. */
export function buildOperation(example, effect) {
  const { method, path, query, body, contentType } = example.request;
  const route = template(path);
  const names = route.split('/').map(part => part.replace(/^\{(.+)\}$/, 'by $1'));
  const parameters = [...[...route.matchAll(/\{([^}]+)\}/g)].map(([, name]) => ({ name, in: 'path', required: true, schema: { type: 'string' } })),
    ...[...new URLSearchParams(query ?? '').keys()].map(name => ({ name, in: 'query', schema: { type: 'string' } }))];
  return {
    operationId: `${String(method).toLowerCase()}${pascal(names.join(' '))}`, summary: PLACEHOLDER, 'x-effect': effect,
    ...(parameters.length && { parameters }),
    ...(body !== undefined && { requestBody: { content: { [mediaType(contentType)]: { schema: sentShape(body) } } } }),
    responses: { [String(example.answer.status)]: answerOf(example.answer) },
  };
}

/** What we sent: its shape, with no field required, since one request shows what we chose to send, not what the
 *  service needs. */
const sentShape = body => optional(schemaOf(body));
const optional = schema => Object.fromEntries(Object.entries(schema).filter(([word]) => word !== 'required').map(([word, value]) => [word,
  word === 'items' ? optional(value) : word === 'properties' ? Object.fromEntries(Object.entries(value).map(([name, child]) => [name, optional(child)])) : value]));
const answerOf = answer => ({ description: 'Recorded answer', content: { [mediaType(answer.contentType)]: { schema: schemaOf(answer.body) } } });

/** `operation` widened by one more exchange of the same call; its names and descriptions stay. */
export function widenOperation(doc, operation, example) {
  const result = structuredClone(operation);
  const { query, body } = example.request;
  const known = new Set(list(result.parameters).map(parameter => resolve(doc, parameter)?.name));
  const added = [...new URLSearchParams(query ?? '').keys()].filter(name => !known.has(name)).map(name => ({ name, in: 'query', schema: { type: 'string' } }));
  if (added.length) result.parameters = [...list(result.parameters), ...added];
  const sent = result.requestBody?.content && jsonSchemaEntry(result.requestBody.content);
  if (body !== undefined && sent) sent[1].schema = widen(sent[1].schema, sentShape(body));
  else if (body !== undefined && !result.requestBody) result.requestBody = { content: { [mediaType(example.request.contentType)]: { schema: sentShape(body) } } };
  const status = String(example.answer.status);
  const key = [status, `${status[0]}XX`, 'default'].find(name => result.responses?.[name]);
  const answer = key && result.responses[key].content && jsonSchemaEntry(result.responses[key].content);
  if (answer) answer[1].schema = widen(answer[1].schema, schemaOf(example.answer.body));
  else if (!key) result.responses = { ...result.responses, [status]: answerOf(example.answer) };
  return result;
}

const jsonSchemaEntry = content => Object.entries(content).find(([type]) => /json/i.test(type)) ?? Object.entries(content)[0];

/** The file with one more exchange in it: its call widened, or a new call built. Throws when it fits two calls. */
export function addExample(doc, example, effect) {
  const found = matching(doc, example.request);
  if (found.length > 1) throw new Error(`${example.request.method} ${example.request.path} fits ${found.length} calls: ${found.map(named).join(', ')}`);
  const result = structuredClone(doc);
  result.paths ??= {};
  if (found.length) {
    const key = Object.keys(result.paths).find(path => path.replace(/^\//, '') === found[0].path);
    const method = found[0].method.toLowerCase();
    result.paths[key][method] = widenOperation(doc, found[0].operation, example);
    return { doc: result, path: found[0].path, method: found[0].method, added: false };
  }
  const route = template(example.request.path);
  const method = String(example.request.method).toLowerCase();
  result.paths[`/${route}`] = { ...result.paths[`/${route}`], [method]: buildOperation(example, effect) };
  return { doc: result, path: route, method: method.toUpperCase(), added: true };
}

/** A new service's file: the version, its name, address and guide, and no calls yet. */
export const newDefinition = ({ title, base, docs }) => ({ openapi: VERSION, info: { title, version: 'recorded' },
  ...(docs && { externalDocs: { url: docs } }), ...(base && { servers: [{ url: base }] }), paths: {} });

/** The types file for one service: a request and an answer type per call, named from the service and its path. */
export function typesFile(key, doc) {
  const calls = operations(doc);
  const shared = path => calls.filter(call => call.path === path).length > 1;
  const blocks = calls.flatMap(call => {
    const name = `${pascal(key)}${shared(call.path) ? pascal(call.method.toLowerCase()) : ''}${pascal(call.path.replace(/[{}]/g, ''))}`;
    const body = resolve(doc, call.operation.requestBody)?.content;
    const answer = successes(call.operation).map(([, response]) => resolve(doc, response)?.content).find(Boolean);
    return [...(body ? [`export type ${name}Request = ${typeText(doc, jsonSchema(body), { indent: 0 })};`] : []),
      ...(answer ? [`export type ${name}Answer = ${typeText(doc, jsonSchema(answer), { indent: 0 })};`] : [])];
  });
  return `// Generated from schema/services/${key}/openapi.json by scripts/company-api.mjs record; do not edit by hand.\n`
    + `// Type a service's answer with it, such as \`body as ${pascal(key)}…Answer\`: wiki/stack/testing.md#service-examples\n`
    + `${blocks.length ? blocks.join('\n\n') : 'export {};'}\n`;
}
