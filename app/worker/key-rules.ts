// The rules a key used directly meets, whether the code lists it or a chat saved it: one rule set for the app's
// tests, the tool save route and scripts/check-app-keys.mjs. wiki/stack/company-api.md#use-a-key-directly
import { TOOL_NAME } from "./api/mcp.ts";
import type { Forward } from "./keys.ts";

/** What the rules read of a key. */
export type RuledKey = { purpose?: string; docs?: string; secrets: readonly string[]; setup?: true; alone?: true; forward?: Forward };

const METHOD = "GET|HEAD|POST|PUT|PATCH|DELETE";

/** A path that can only name something under the address it is joined to: plain characters, no empty part but a
 *  last one, and nothing a `.`, a `..` or an encoded slash, dot or backslash could turn into another path. */
const plain = (path: string): boolean => !/[\p{Cc}\s\\?#]|%(?:2e|2f|5c)/iu.test(path) &&
  !path.split("/").some((part, at, parts) => part === "." || part === ".." || (part === "" && at < parts.length - 1));

/** The address to ask, or null: under the service's own address and nowhere else. */
export function address(forward: Forward, path: string, query = ""): URL | null {
  if (!plain(path) || !URL.canParse(path, forward.base)) return null;
  const base = new URL(forward.base);
  const url = new URL(path, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
  url.search = query;
  return url;
}

/** A credential that matches the key's secrets: both `secret` and `header` with secrets, neither without. */
function credentialProblem(key: RuledKey, forward: Forward): string | null {
  if (!key.secrets.length) return forward.secret ?? forward.header ?? forward.prefix ? "a key with no secrets names no secret, header or prefix" : null;
  if (!forward.secret || !key.secrets.includes(forward.secret)) return "secret must be one of the key's own secrets";
  return forward.header && /^[A-Za-z0-9-]+$/.test(forward.header) ? null : "header must be one request header name";
}

/** An MCP entry's path stays under base, and each of its look-ups is a tool's name. */
function mcpProblem(forward: Forward): string | null {
  if (!forward.mcp) return null;
  if (forward.lookups) return "an MCP server's tools decide what reads, so it takes no lookups";
  if (!forward.mcp.path || !address(forward, forward.mcp.path)) return "the MCP path must stay under base";
  const bad = forward.mcp.reads.find(tool => !TOOL_NAME.test(tool));
  return bad === undefined ? null : `the MCP look-up "${bad}" must be a tool's name`;
}

/** A token address is HTTPS on base's own host, the key names the ID's secret beside its own, and no MCP server. */
function exchangeProblem(key: RuledKey, forward: Forward): string | null {
  if (!forward.exchange) return null;
  if (forward.mcp) return "a token address goes with an API, not an MCP server";
  if (!key.secrets.includes(`${forward.secret}_ID`)) return "a token address needs the ID's secret too: the secret's name and _ID";
  const url = URL.canParse(forward.exchange.url) ? new URL(forward.exchange.url) : null;
  return url?.protocol === "https:" && url.host === new URL(forward.base).host && !url.username && !url.password ? null
    : `the token address ${forward.exchange.url} must be HTTPS on base's own host`;
}

/** What is wrong with a key's `forward` entry, or null. */
export function forwardProblem(id: string, key: RuledKey, forward: Forward): string | null {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) return "a key used directly needs an id in lowercase letters, digits and hyphens";
  if (key.setup || key.alone) return "a key setup makes, or the Worker's own route uses, takes no forward";
  if (!/^https:\/\/[^/?#@\s]+\/(?:[^?#\s]*\/)?$/.test(forward.base) || !URL.canParse(forward.base) || !plain(new URL(forward.base).pathname.slice(1))) return "base must be an HTTPS address ending in /";
  const wrong = credentialProblem(key, forward) ?? mcpProblem(forward) ?? exchangeProblem(key, forward);
  if (wrong) return wrong;
  const bad = (forward.lookups ?? []).find(entry => !new RegExp(`^(?:${METHOD}) [^ ]+$`).test(entry) || !plain(entry.split(" ")[1]));
  return bad === undefined ? null : `the look-up "${bad}" must be METHOD path, with a path that stays under base`;
}

/** Each key with no one-line purpose, or used directly with no HTTPS API guide, named. */
export const undescribed = (registry: Readonly<Record<string, { purpose?: string; docs?: string; forward?: object }>>): string[] => Object.entries(registry).flatMap(([id, key]) => [
  ...(!key.purpose?.trim() || key.purpose.length > 80 || /\n/.test(key.purpose) ? [`${id}: needs a purpose of one line, at most 80 characters`] : []),
  ...(key.docs !== undefined && !/^https:\/\/[^\s]+$/.test(key.docs) ? [`${id}: docs must be an HTTPS address`] : []),
  ...(key.forward && key.docs === undefined ? [`${id}: a key used directly needs docs, the service's API guide`] : []),
]);

/** Every rule a key breaks, named: its purpose and guide, and its `forward` entry. */
export const keyProblems = (registry: Readonly<Record<string, RuledKey>>): string[] => [...undescribed(registry),
  ...Object.entries(registry).flatMap(([id, key]) => {
    const wrong = key.forward && forwardProblem(id, key, key.forward);
    return wrong ? [`${id}: ${wrong}`] : [];
  })];
