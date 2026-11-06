import { z } from "zod";
import { boundedText, defineAction, type Action } from "./contract.ts";
import type { KeyEntry } from "../employee-access/key-levels.ts";
import type { RouteAccess } from "../employee-access/policy.ts";
import type { Forward } from "../keys.ts";
import { address, forwardProblem } from "../key-rules.ts";
import { MCP_VERSION, rpcEffect } from "./mcp.ts";

// POST /api/direct/<key>/read and /change: one request passed on to a saved key's own service, built here from the
// registry's `forward` entries. The key's level alone decides, no app. wiki/stack/company-api.md#use-a-key-directly

// The service's answer is read up to this size; the action's own output limit leaves room to wrap it.
const LIMIT = 1_000_000;
const LEVELS = ["read", "write"] as const;
const KINDS = { read: "read", write: "change" } as const;
type Kind = (typeof KINDS)[keyof typeof KINDS];
/** An MCP session id: visible ASCII only, as the protocol requires. */
const SESSION = /^[\x21-\x7e]{1,256}$/;
const input = z.strictObject({
  method: z.enum(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"]).describe("The HTTP method the service's API guide names for this request."),
  path: z.string().min(1).max(2000).describe("The API path under the service's address, with no leading slash and no query, such as pages/123."),
  query: z.string().max(4000).optional().describe("Optional query string for the path, without the leading question mark, such as page_size=20."),
  body: z.unknown().optional().describe("Optional request body: a JSON value, or a string sent as it is; an MCP message is sent as the JSON it reads as. GET and HEAD send none."),
  contentType: z.string().regex(/^[\w.+-]+\/[\w.+-]+(?:; ?charset=[\w-]+)?$/).optional()
    .describe("Optional content type of the body. Left out, the body is sent as application/json."),
  session: z.string().regex(SESSION).optional().describe("Optional MCP session id from an earlier answer's `session`, sent as Mcp-Session-Id."),
});
const output = z.strictObject({ status: z.number().int(), contentType: z.string(), body: z.unknown(),
  session: z.string().optional().describe("The MCP session id the service handed out, to send back with the next call.") });
const errors = {
  not_allowed: "The path must stay inside this service's own address: no leading slash, no dot parts, no doubled slash, no query and no other host.",
  too_large: "The answer is too large. Narrow the request: add a filter or ask for a smaller page.",
  bad_answer: "The service did not return an answer that can be shown.",
};

/** Only a key that trades an ID and a secret for a token can be refused this. */
const NO_TOKEN = "The service gave no token for the saved ID and secret. Ask the owner to send this key again.";

const refuse = (code: keyof typeof errors | "not_a_lookup" | "no_token", status: number) => Response.json({ error: { code } }, { status });
/** What a token address answers: the standard client-credentials fields alone. */
const traded = z.object({ access_token: z.string().min(1), expires_in: z.number().optional() });
/** Tokens an ID and a secret were traded for, by key, kept in this isolate until a minute before they run out. */
const tokens = new Map<string, { pair: string; token: string; until: number }>();
/** A JSON answer as a value; one that does not parse stays the text it is. */
const parse = (text: string): unknown => { try { return JSON.parse(text); } catch { return text; } };

/** A `METHOD path` look-up entry as a test of one request: `*` stands for one path part. */
const entryTest = (entry: string) => new RegExp(`^${entry.split("*").map(part => part.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]+")}$`);

/** The body as it is sent: a string as it is, any other value as JSON. An MCP message is sent as the value it was
 *  sorted by, so a repeated key a server reads differently can't make a change pass as a look-up. */
const sentBody = (forward: Forward, body: unknown): string => typeof body !== "string" ? JSON.stringify(body)
  : forward.mcp ? reserialized(body) : body;
const reserialized = (text: string): string => { try { return JSON.stringify(JSON.parse(text)); } catch { return text; } };

/** A request only reads when the web's own rules say so, or the key's setup names it as a look-up. A POST to an MCP
 *  server reads only when its one message does: wiki/stack/company-api.md#use-an-mcp-server-through-the-app */
const looksUp = (forward: Forward, method: string, path: string, body: string | undefined): boolean => method === "GET" || method === "HEAD" ||
  (forward.mcp ? method === "POST" && body !== undefined && rpcEffect(body, forward.mcp.reads).effect === "read"
    : (forward.lookups ?? []).some(entry => entryTest(entry).test(`${method} ${path}`)));

/** One record per request sent: who, which key, what kind, and where. Never the query, the body or the key. */
const record = (line: { caller: string; key: string; kind: Kind; method: string; path: string; status: number }) =>
  console.log(JSON.stringify({ event: "direct_request", ...line }));

/** A short token for a key that trades its ID and secret: the one kept, unless `fresh`, or a new one from the token
 *  address. Null when the service gives none. The trade follows no redirect, so the secret goes nowhere else. */
async function tokenFor(id: string, forward: Forward, clientId: string, secret: string, send: typeof fetch, signal: AbortSignal, fresh: boolean) {
  const pair = `${clientId}\n${secret}`;
  const held = tokens.get(id);
  if (!fresh && held?.pair === pair && held.until > Date.now()) return held.token;
  tokens.delete(id);
  const response = await send(forward.exchange!.url, { method: "POST", redirect: "manual", signal,
    headers: { Accept: "application/json", "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "client_credentials", client_id: clientId, client_secret: secret }) });
  const answer = traded.safeParse(response.ok ? parse(await boundedText(response.body, 65_536).catch(() => "")) : null);
  if (!answer.success) return null;
  const { access_token: token, expires_in: seconds = 0 } = answer.data;
  tokens.set(id, { pair, token, until: Date.now() + (seconds - 60) * 1000 });
  return token;
}

function handler(id: string, forward: Forward, kind: Kind, send: typeof fetch): Action["handler"] {
  return async (_request, env, call) => {
    const { method, path, query, body: value, contentType, session } = input.parse(call.input);
    const body = value === undefined ? undefined : sentBody(forward, value);
    if (kind === "read" && !looksUp(forward, method, path, body)) return refuse("not_a_lookup", 400);
    const url = destination(forward, path, query);
    if (!url) return refuse("not_allowed", 400);
    const secret = forward.secret === undefined ? null : String(Reflect.get(env, forward.secret));
    const clientId = forward.exchange ? String(Reflect.get(env, `${forward.secret}_ID`)) : null;
    // A key that trades for a token sends the token; any other sends its secret as it is.
    const credential = (fresh: boolean) => clientId === null ? secret : tokenFor(id, forward, clientId, secret!, send, call.signal, fresh);
    const sends = body !== undefined && method !== "GET" && method !== "HEAD";
    // A redirect comes back unfollowed, so the key is never sent on.
    const ask = (sent: string | null) => send(url, { method, redirect: "manual", signal: call.signal,
      headers: requestHeaders(forward, sent, session, sends ? contentType ?? "application/json" : null), ...(sends && { body }) });
    let status = 0;
    let response: Response;
    let sent = await credential(false);
    if (clientId !== null && sent === null) return refuse("no_token", 502);
    try {
      response = await ask(sent);
      // A token the service no longer takes is traded again, once.
      if (response.status === 401 && clientId !== null) {
        sent = await credential(true);
        if (sent === null) return refuse("no_token", 502);
        response = await ask(sent);
      }
      status = response.status;
    } finally {
      // Dispatch has already refused a call with no verified caller.
      record({ caller: call.identity!.id, key: id, kind, method, path, status });
    }
    if (status >= 300 && status < 400) return refuse("bad_answer", 502);
    let text: string;
    try { text = await boundedText(response.body, LIMIT); } catch { return refuse("too_large", 413); }
    return reply(forward, response, text, [secret, clientId, sent]);
  };
}

/** The service's answer as the action returns it, or a refusal when it carries the key itself, its ID or its token,
 *  in its body or in a header it echoes. An MCP server's session id is handed back to send with the next call. */
function reply(forward: Forward, response: Response, text: string, hidden: (string | null)[]): Response {
  const type = response.headers.get("content-type") ?? "";
  const handed = forward.mcp ? response.headers.get("mcp-session-id") : null;
  if (hidden.some(value => value !== null && `${type}\n${handed}\n${text}`.includes(value))) return refuse("bad_answer", 502);
  return Response.json({ status: response.status, contentType: type, body: /json/i.test(type) ? parse(text) : text,
    ...(handed && SESSION.test(handed) && { session: handed }) });
}

/** The address to ask: an MCP server's one path, so the key reaches no other page on the host, or any under base. */
const destination = (forward: Forward, path: string, query?: string): URL | null =>
  forward.mcp && path !== forward.mcp.path ? null : address(forward, path, query);

/** The fixed headers, what answers to accept, the body's type, and the key's own header last, so no fixed header
 *  can replace it. A key with no secret sends no credential. */
const requestHeaders = (forward: Forward, secret: string | null, session: string | undefined, contentType: string | null) => ({
  ...forward.headers, ...(forward.mcp ? mcpHeaders(session) : { Accept: "application/json" }), ...(contentType && { "Content-Type": contentType }),
  ...(secret !== null && { [forward.header!]: `${forward.prefix ?? ""}${secret}` }) });

/** What an MCP server needs to hear: both answer kinds it may send, the protocol version, and the session. */
const mcpHeaders = (session: string | undefined) => ({ Accept: "application/json, text/event-stream", "Mcp-Protocol-Version": MCP_VERSION,
  ...(session && { "Mcp-Session-Id": session }) });

function action(id: string, key: KeyEntry, forward: Forward, kind: Kind, send: typeof fetch): Action {
  const reads = kind === "read";
  const named = forward.mcp ? `a POST to ${forward.mcp.path} that opens the MCP session, lists its tools` +
    (forward.mcp.reads.length ? ` or calls ${forward.mcp.reads.join(", ")}` : "") : (forward.lookups ?? []).join(", ");
  // A key that offers Read alone has no change action to point at.
  const other = (key.levels ?? LEVELS).includes("write") ? `Anything else needs ${id}.change, which needs Read & write.` : "This key passes on nothing else.";
  return defineAction({
    operationId: `${id}.${kind}`, summary: `${reads ? "Look something up in" : "Change something in"} ${key.title}`,
    description: `Send one request to ${key.title}'s API at ${forward.base}${forward.secret ? " with the saved key" : ""}, and return the service's status and answer. ` +
      (forward.mcp ? `It is an MCP server: use \`node scripts/company-api.mjs mcp ${id} tools\`, which runs the session. `
        : "`path` is the API path under that address, with no leading slash. ") +
      (reads ? `Only look-ups run here: GET, HEAD${named && `, and ${named}`}. ${other} `
        : `It can change or send things in ${key.title}, so it needs Read & write. Use ${id}.read for a look-up. `) +
      "A status of 400 or more is the service's own refusal: read its body.",
    input, output, encoding: "json", effect: reads ? "read" : "external", agentAvailable: true,
    errors: { ...errors, not_a_lookup: `Only look-ups run here. ${other}`, ...(forward.exchange && { no_token: NO_TOKEN }) },
    examples: [reads ? { input: { method: "GET", path: "items", query: "limit=5" }, output: { status: 200, contentType: "application/json", body: { items: [] } } }
      : { input: { method: "POST", path: "items", body: { name: "Sample" } }, output: { status: 201, contentType: "application/json", body: { id: "item-1" } } }],
    limits: { inputBytes: 262_144, outputBytes: 4_194_304, timeoutMs: 30_000 },
    handler: handler(id, forward, kind, send),
  });
}

/** The direct-use routes of every key whose service is set up: a look-up action, and a change action when the key
 *  offers Read & write. Throws, naming the key, on a bad `forward` entry. `send` is the request; a test replaces it. */
export function forwardRoutes(registry: Readonly<Record<string, KeyEntry>>, send: typeof fetch = (...call) => fetch(...call)) {
  const routes = new Map<string, Action>();
  const access = new Map<string, RouteAccess>();
  for (const [id, key] of Object.entries(registry)) {
    const { forward } = key;
    if (!forward) continue;
    const wrong = forwardProblem(id, key, forward);
    if (wrong) throw new Error(`app/worker/keys.ts: ${id}: ${wrong}`);
    for (const level of key.levels ?? LEVELS) {
      const route = `POST /api/direct/${id}/${KINDS[level]}`;
      routes.set(route, action(id, key, forward, KINDS[level], send));
      access.set(route, { keys: [id], direct: true });
    }
  }
  return { routes, access };
}
