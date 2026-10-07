import { z } from "zod";
import { boundedText, defineAction, type Action } from "./contract.ts";
import type { KeyEntry } from "../employee-access/key-levels.ts";
import type { RouteAccess } from "../employee-access/policy.ts";
import type { Forward } from "../keys.ts";

// POST /api/direct/<key>/read and /api/direct/<key>/change: one request passed on to a saved key's own service.
// Both are made here from the key registry, so a service is a `forward` entry there and no handler code. Each
// belongs to its key alone, so no app is needed: the person's level for the key decides, and so does the owner's
// direct-use choice for it in Access, which is off until picked. The app adds the key; the caller never holds it.
// wiki/stack/company-api.md#use-a-key-directly

// The service's answer is read up to this size; the action's own output limit leaves room to wrap it.
const LIMIT = 1_000_000;
const LEVELS = ["read", "write"] as const;
const KINDS = { read: "read", write: "change" } as const;
type Kind = (typeof KINDS)[keyof typeof KINDS];
const METHOD = "GET|HEAD|POST|PUT|PATCH|DELETE";
const input = z.strictObject({
  method: z.enum(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]).describe("The HTTP method the service's API guide names for this request."),
  path: z.string().min(1).max(2000).describe("The API path under the service's address, with no leading slash and no query, such as pages/123."),
  query: z.string().max(4000).optional().describe("Optional query string for the path, without the leading question mark, such as page_size=20."),
  body: z.unknown().optional().describe("Optional request body: a JSON value, or a string sent as it is. GET and HEAD send none."),
  contentType: z.string().regex(/^[\w.+-]+\/[\w.+-]+(?:; ?charset=[\w-]+)?$/).optional()
    .describe("Optional content type of the body. Left out, the body is sent as application/json."),
});
const output = z.strictObject({ status: z.number().int(), contentType: z.string(), body: z.unknown() });
const errors = {
  not_allowed: "The path must stay inside this service's own address: no leading slash, no dot parts, no doubled slash, no query and no other host.",
  too_large: "The answer is too large. Narrow the request: add a filter or ask for a smaller page.",
  bad_answer: "The service did not return an answer that can be shown.",
};

const refuse = (code: keyof typeof errors | "not_a_lookup", status: number) => Response.json({ error: { code } }, { status });
/** A JSON answer as a value; one that does not parse stays the text it is. */
const parse = (text: string): unknown => { try { return JSON.parse(text); } catch { return text; } };

/** A path that can only name something under the address it is joined to: plain characters, no empty part but a
 *  last one, and nothing a `.`, a `..` or an encoded slash, dot or backslash could turn into another path. */
const plain = (path: string): boolean => !/[\p{Cc}\s\\?#]|%(?:2e|2f|5c)/iu.test(path) &&
  !path.split("/").some((part, at, parts) => part === "." || part === ".." || (part === "" && at < parts.length - 1));

/** The address to ask, or null: under the service's own address and nowhere else. */
function address(forward: Forward, path: string, query = ""): URL | null {
  if (!plain(path) || !URL.canParse(path, forward.base)) return null;
  const base = new URL(forward.base);
  const url = new URL(path, base);
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return null;
  url.search = query;
  return url;
}

/** A `METHOD path` look-up entry as a test of one request: `*` stands for one path part. */
const entryTest = (entry: string) => new RegExp(`^${entry.split("*").map(part => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]+")}$`);

/** A request only reads when the web's own rules say so, or the key's setup names it as a look-up. */
const looksUp = (forward: Forward, method: string, path: string): boolean => method === "GET" || method === "HEAD" ||
  (forward.lookups ?? []).some(entry => entryTest(entry).test(`${method} ${path}`));

/** What is wrong with a key's `forward` entry, or null. Checked when the routes are built, so a mistake fails the
 *  app's tests before it can publish. */
function problem(id: string, key: KeyEntry, forward: Forward): string | null {
  if (!/^[a-z][a-z0-9-]*$/.test(id)) return "a key used directly needs an id in lowercase letters, digits and hyphens";
  if (key.setup || key.alone) return "a key setup makes, or the Worker's own route uses, takes no forward";
  if (!/^https:\/\/[^/?#@\s]+\/(?:[^?#\s]*\/)?$/.test(forward.base) || !URL.canParse(forward.base) || !plain(new URL(forward.base).pathname.slice(1))) return "base must be an HTTPS address ending in /";
  if (!key.secrets.includes(forward.secret)) return "secret must be one of the key's own secrets";
  if (!/^[A-Za-z0-9-]+$/.test(forward.header)) return "header must be one request header name";
  const bad = (forward.lookups ?? []).find(entry => !new RegExp(`^(?:${METHOD}) [^ ]+$`).test(entry) || !plain(entry.split(" ")[1]));
  return bad === undefined ? null : `the look-up "${bad}" must be METHOD path, with a path that stays under base`;
}

/** One record per request sent: who, which key, what kind, and where. Never the query, the body or the key. */
const record = (line: { caller: string; key: string; kind: Kind; method: string; path: string; status: number }) =>
  console.log(JSON.stringify({ event: "direct_request", ...line }));

function handler(id: string, forward: Forward, kind: Kind, send: typeof fetch): Action["handler"] {
  return async (_request, env, call) => {
    const { method, path, query, body, contentType } = input.parse(call.input);
    if (kind === "read" && !looksUp(forward, method, path)) return refuse("not_a_lookup", 400);
    const url = address(forward, path, query);
    if (!url) return refuse("not_allowed", 400);
    const secret = String(Reflect.get(env, forward.secret));
    const sends = body !== undefined && method !== "GET" && method !== "HEAD";
    let status = 0;
    let response: Response;
    try {
      // The key's own header comes last, so no fixed header can replace it. A redirect comes back unfollowed,
      // so the key is never sent on.
      response = await send(url, { method, redirect: "manual", signal: call.signal,
        headers: { ...forward.headers, Accept: "application/json", ...(sends && { "Content-Type": contentType ?? "application/json" }),
          [forward.header]: `${forward.prefix ?? ""}${secret}` },
        ...(sends && { body: typeof body === "string" ? body : JSON.stringify(body) }) });
      status = response.status;
    } finally {
      // Dispatch has already refused a call with no verified caller.
      record({ caller: call.identity!.id, key: id, kind, method, path, status });
    }
    if (status >= 300 && status < 400) return refuse("bad_answer", 502);
    let text: string;
    try { text = await boundedText(response.body, LIMIT); } catch { return refuse("too_large", 413); }
    const type = response.headers.get("content-type") ?? "";
    // No answer may carry the key itself, in its body or in the content type it echoes.
    if (`${type}\n${text}`.includes(secret)) return refuse("bad_answer", 502);
    return Response.json({ status, contentType: type, body: /json/i.test(type) ? parse(text) : text });
  };
}

function action(id: string, key: KeyEntry, forward: Forward, kind: Kind, send: typeof fetch): Action {
  const reads = kind === "read";
  const named = (forward.lookups ?? []).join(", ");
  // A key that offers Read alone has no change action to point at.
  const other = (key.levels ?? LEVELS).includes("write") ? `Anything else needs ${id}.change, which needs Read & write.` : "This key passes on nothing else.";
  return defineAction({
    operationId: `${id}.${kind}`, summary: `${reads ? "Look something up in" : "Change something in"} ${key.title}`,
    description: `Send one request to ${key.title}'s API at ${forward.base} with the saved key, and return the service's status and answer. ` +
      "`path` is the API path under that address, with no leading slash. " +
      (reads ? `Only look-ups run here: GET, HEAD${named && `, and ${named}`}. ${other} `
        : `It can change or send things in ${key.title}, so it needs Read & write. Use ${id}.read for a look-up. `) +
      "A status of 400 or more is the service's own refusal: read its body.",
    input, output, encoding: "json", effect: reads ? "read" : "external", agentAvailable: true,
    errors: { ...errors, not_a_lookup: `Only look-ups run here. ${other}` },
    examples: [reads ? { input: { method: "GET", path: "items", query: "limit=5" }, output: { status: 200, contentType: "application/json", body: { items: [] } } }
      : { input: { method: "POST", path: "items", body: { name: "Sample" } }, output: { status: 201, contentType: "application/json", body: { id: "item-1" } } }],
    limits: { inputBytes: 262_144, outputBytes: 4_194_304, timeoutMs: 30_000 },
    handler: handler(id, forward, kind, send),
  });
}

/**
 * The direct-use routes of every key whose service is set up: a look-up action, and a change action when the key
 * offers Read & write, each with the mapping it is judged by. Throws, naming the key, on a `forward` entry that
 * breaks a rule. `send` is the request itself, which a test replaces.
 */
export function forwardRoutes(registry: Readonly<Record<string, KeyEntry>>, send: typeof fetch = (...call) => fetch(...call)) {
  const routes = new Map<string, Action>();
  const access = new Map<string, RouteAccess>();
  for (const [id, key] of Object.entries(registry)) {
    const { forward } = key;
    if (!forward) continue;
    const wrong = problem(id, key, forward);
    if (wrong) throw new Error(`app/worker/keys.ts: ${id}: ${wrong}`);
    for (const level of key.levels ?? LEVELS) {
      const route = `POST /api/direct/${id}/${KINDS[level]}`;
      routes.set(route, action(id, key, forward, KINDS[level], send));
      access.set(route, { keys: [id], direct: level });
    }
  }
  return { routes, access };
}
