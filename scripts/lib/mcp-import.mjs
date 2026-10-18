// Bring the remote MCPs listed in this computer's Claude and Codex settings into the app, by name and address only.
// It reads three settings files and never a credentials file; it never edits one: `claude`/`codex mcp remove` do.
import { spawnSync } from 'node:child_process';
import { readFileSync, realpathSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

export const REASONS = {
  local: 'runs on this computer',
  key: 'uses a fixed key',
  sse: "uses an older connection the app doesn't speak",
  added: 'already added',
  https: "its address isn't https",
  address: 'has no address',
};
const FIXED_KEY = ['headers', 'headersHelper', 'env', 'bearer_token_env_var', 'http_headers', 'env_http_headers'];
const ADD_ALL = 'node scripts/company-api.mjs mcp import --yes';

const readText = path => { try { return readFileSync(path, 'utf8'); } catch { return null; } };
const readJson = (path, read) => { try { return JSON.parse(read(path) ?? 'null') ?? {}; } catch { return {}; } };
const present = value => value !== undefined && value !== null && value !== false && (typeof value !== 'object' || Object.keys(value).length > 0);
const normal = url => { const parsed = new URL(url); parsed.pathname = parsed.pathname.replace(/\/+$/, '') || '/'; return parsed.href; };

/** What one settings entry is: `{ url }` the app can add, or `{ skip }` with the reason. Values are never kept. */
export function classify(config) {
  if (!config || typeof config !== 'object') return { skip: REASONS.address };
  if (config.command || config.type === 'stdio') return { skip: REASONS.local };
  if (FIXED_KEY.some(key => present(config[key]))) return { skip: REASONS.key };
  if (config.type === 'sse') return { skip: REASONS.sse };
  if (typeof config.url !== 'string') return { skip: REASONS.address };
  let url;
  try { url = new URL(config.url); } catch { return { skip: REASONS.https }; }
  if (url.protocol !== 'https:') return { skip: REASONS.https };
  // A key in the address itself, as `?apiKey=` or user info, is still a fixed key.
  if (url.username || url.password || url.search) return { skip: REASONS.key };
  url.hash = '';
  return { url: url.href };
}

/** Each MCP listed for this computer: `{ name, from, scope, project?, url | skip }`. */
export function localMcps({ home = homedir(), env = process.env, checkout, projects = [checkout], read = readText } = {}) {
  const claudeFile = env.CLAUDE_CONFIG_DIR ? join(env.CLAUDE_CONFIG_DIR, '.claude.json') : join(home, '.claude.json');
  const claude = readJson(claudeFile, read);
  const entries = (servers, extra) => Object.entries(servers && typeof servers === 'object' ? servers : {})
    .map(([name, config]) => ({ name, ...extra, ...classify(config) }));
  const places = [...new Set(projects.filter(Boolean).flatMap(path => { try { return [resolve(path), realpathSync(path)]; } catch { return [resolve(path)]; } }))];
  const codex = codexServers(read(join(env.CODEX_HOME || join(home, '.codex'), 'config.toml')) ?? '');
  return [
    ...entries(claude.mcpServers, { from: 'Claude', scope: 'user' }),
    ...places.flatMap(project => entries(claude.projects?.[project]?.mcpServers, { from: 'Claude', scope: 'local', project })),
    ...(checkout ? entries(readJson(join(checkout, '.mcp.json'), read).mcpServers, { from: 'Claude', scope: 'project' }) : []),
    ...entries(codex, { from: 'Codex' }),
  ];
}

/** The entries to offer, each address once, and the skipped ones; an address the app has is skipped as added. */
export function sortMcps(entries, servers = []) {
  const known = new Set(servers.map(server => { try { return normal(server.url); } catch { return null; } }));
  const offer = [], skipped = [], seen = new Set();
  for (const entry of entries) {
    if (entry.skip) { skipped.push(entry); continue; }
    const address = normal(entry.url);
    if (known.has(address)) skipped.push({ ...entry, skip: REASONS.added });
    else if (!seen.has(address)) { seen.add(address); offer.push(entry); }
  }
  return { offer, skipped };
}

const and = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names.at(-1)}` : names[0]);

/** The offer, in plain words, as the chat shows it before asking. */
export function offerText({ offer, skipped }) {
  const from = ['Claude', 'Codex'].map(app => [app, offer.filter(entry => entry.from === app).map(entry => entry.name)]).filter(([, names]) => names.length);
  const lines = offer.length
    ? [`Found ${from.map(([app, names]) => `${and(names)} in ${app}`).join(', and ')}. ${offer.length > 1 ? 'Add them? Then press Connect on each.' : 'Add it? Then press Connect.'}`,
      ...offer.map(entry => `  ${entry.name}  ${entry.url}`)]
    : ['Found no MCPs in Claude or Codex that the app can add.'];
  if (skipped.length) lines.push(`Skipped: ${skipped.map(entry => `${entry.name} (${entry.skip})`).join(', ')}.`);
  if (offer.length) lines.push(`To add ${offer.length > 1 ? 'them' : 'it'}: ${ADD_ALL}`);
  return lines.join('\n');
}

/** The app's MCP list, under the caller's own login. */
async function appServers(client) {
  const { value } = await client.http('/api/mcp/servers');
  if (value.error || !Array.isArray(value.servers)) throw new Error(value.error?.message || 'The app could not list its MCPs; it may need an update.');
  return value.servers;
}

/** Add one MCP under the caller's login: `{ server }` or `{ error }`. A dropped answer may still have added it. */
export async function addMcp(client, url, name) {
  const { value } = await client.http('/api/mcp/servers', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, ...(name && { name }) }) }, undefined, undefined, { check: ' Run `node scripts/company-api.mjs services` to see whether it was added.' });
  return value;
}

/** The line a person reads after an Add. */
export const addedText = (value, label) => (value.error
  ? `${label}: ${value.error.message}${value.error.connect ? `\n${value.error.connect}` : ''}`
  : `Added ${value.server.name}. Open this link and press Connect to sign in as yourself:\n${value.server.connect}`);

/** `mcp import [--yes]`: the offer, or each Add and its link. Returns `{ text, ok }`. */
export async function importMcps(client, { yes = false, ...where } = {}) {
  const sorted = sortMcps(localMcps(where), await appServers(client));
  if (!yes || !sorted.offer.length) return { text: offerText(sorted), ok: true };
  const lines = [];
  let ok = true;
  for (const entry of sorted.offer) {
    const value = await addMcp(client, entry.url, entry.name);
    lines.push(addedText(value, entry.name));
    if (value.error) ok = false;
    if (value.error?.code === 'unavailable') break;
  }
  if (lines.length) lines.push('After you press Connect on one, it can come out of Claude or Codex: node scripts/company-api.mjs mcp import --remove-local <name>');
  return { text: lines.join('\n'), ok };
}

const quote = word => (/^[\w./:@-]+$/.test(word) ? word : `'${word.replace(/'/g, "'\\''")}'`);
/** The command that removes one entry where it was found, or null for the project's shared `.mcp.json`. */
function removal(entry, cwd) {
  if (entry.from === 'Codex') return { program: 'codex', args: ['mcp', 'remove', entry.name], cwd };
  if (entry.scope === 'project') return null;
  return { program: 'claude', args: ['mcp', 'remove', entry.name, '-s', entry.scope], cwd: entry.project || cwd };
}
const shown = ({ program, args, cwd }, here) => `${cwd === here ? '' : `cd ${quote(cwd)} && `}${[program, ...args].map(quote).join(' ')}`;
const run = ({ program, args, cwd }) => spawnSync(program, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** `mcp import --remove-local <name> [--yes]`, only once the caller's own Connect works. Returns `{ text, ok }`. */
export async function removeLocal(client, name, { yes = false, runCommand = run, cwd = process.cwd(), ...where } = {}) {
  const listed = localMcps(where).filter(entry => entry.name === name && entry.url);
  if (!listed.length) return { text: `No MCP named ${name} that the app can use is set up in Claude or Codex here.`, ok: false };
  const servers = await appServers(client);
  const server = servers.find(item => listed.some(entry => normal(item.url) === normal(entry.url)));
  if (!server) return { text: `${name} isn't in the app yet. Add it first: ${ADD_ALL}`, ok: false };
  if (server.own?.state !== 'connected') return { text: `Press Connect on ${server.name} first, so your chats keep it, then run this again:\n${server.connect}`, ok: false };
  const lines = [], steps = listed.filter(entry => normal(entry.url) === normal(server.url)).map(entry => ({ entry, command: removal(entry, cwd) }));
  let ok = true;
  for (const { entry, command } of steps) {
    if (!command) { lines.push(`${name} is in this project's .mcp.json, which the team shares: remove its entry there and save the change as usual.`); continue; }
    if (!yes) { lines.push(shown(command, cwd)); continue; }
    const result = runCommand(command);
    if (result.status === 0) lines.push(`Removed ${name} from ${entry.from}.`);
    else { ok = false; lines.push(`${entry.from} could not remove ${name}: ${(result.stderr || result.error?.message || '').trim().split('\n')[0]}`); }
  }
  if (!yes && steps.some(step => step.command)) lines.push(`To remove it, run those, or: node scripts/company-api.mjs mcp import --remove-local ${quote(name)} --yes`);
  return { text: lines.join('\n'), ok };
}

/** The `[mcp_servers.<name>]` tables of a Codex `config.toml`, read by a TOML reader for that section alone. */
export function codexServers(text) {
  const servers = {};
  let table = [];
  try { parseToml(text, (path, value) => {
    const [root, name, key, ...rest] = [...table, ...path];
    if (root !== 'mcp_servers' || name === undefined) return;
    const server = (servers[name] ??= {});
    if (key !== undefined) server[key] = rest.length ? true : value;
    else if (value && typeof value === 'object') Object.assign(server, value);
  }, header => { table = header; if (header[0] === 'mcp_servers' && header[1] !== undefined) servers[header[1]] ??= {}; }); }
  catch { return {}; }
  return servers;
}

// Strings, arrays, inline tables, dotted and quoted keys and table headers: enough to read the names and addresses.
function parseToml(text, onValue, onTable) {
  let i = 0;
  const fail = () => { throw new Error('Unreadable TOML'); };
  const space = (lines = true) => {
    while (i < text.length) {
      if (text[i] === '#') while (i < text.length && text[i] !== '\n') i++;
      else if (text[i] === ' ' || text[i] === '\t' || text[i] === '\r' || (lines && text[i] === '\n')) i++;
      else break;
    }
  };
  const string = () => {
    const quoteMark = text[i], triple = text.startsWith(quoteMark.repeat(3), i);
    const close = triple ? quoteMark.repeat(3) : quoteMark;
    let j = i + close.length;
    while (j < text.length && !text.startsWith(close, j)) j += quoteMark === '"' && text[j] === '\\' ? 2 : 1;
    if (j >= text.length) fail();
    const raw = text.slice(i + close.length, j); i = j + close.length;
    if (quoteMark === "'") return raw;
    try { return JSON.parse(`"${raw.replace(/\n/g, '\\n')}"`); } catch { return raw; }
  };
  const key = () => {
    const parts = [];
    do {
      space(false);
      if (text[i] === '"' || text[i] === "'") parts.push(string());
      else { const bare = /^[A-Za-z0-9_-]+/.exec(text.slice(i)); if (!bare) fail(); parts.push(bare[0]); i += bare[0].length; }
      space(false);
    } while (text[i] === '.' && ++i);
    return parts;
  };
  const value = () => {
    space(false);
    if (text[i] === '"' || text[i] === "'") return string();
    if (text[i] === '[') {
      const items = []; i++;
      for (space(); text[i] !== ']'; space()) { items.push(value()); space(); if (text[i] === ',') i++; else if (text[i] !== ']') fail(); }
      i++; return items;
    }
    if (text[i] === '{') {
      const table = {}; i++;
      for (space(false); text[i] !== '}'; space(false)) {
        const path = key(); if (text[i++] !== '=') fail();
        table[path[0]] = path.length > 1 ? true : value(); space(false);
        if (text[i] === ',') i++; else if (text[i] !== '}') fail();
      }
      i++; return table;
    }
    const bare = /^[^,\]}\n#]+/.exec(text.slice(i)); if (!bare) fail();
    i += bare[0].length; return bare[0].trim();
  };
  for (space(); i < text.length; space()) {
    if (text[i] === '[') {
      const many = text[i + 1] === '['; i += many ? 2 : 1;
      const header = key();
      if (text[i] !== ']' || (many && text[i + 1] !== ']')) fail();
      i += many ? 2 : 1; onTable(header);
    } else {
      const path = key(); if (text[i++] !== '=') fail();
      onValue(path, value());
    }
  }
}
