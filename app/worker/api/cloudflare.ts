import { z } from "zod";
import { boundedText, defineAction } from "./contract.ts";

// GET /api/cloudflare/read: one look-up in this business's own Cloudflare account, for a person
// whose Cloudflare level is Read. It belongs to the key alone, so no app is needed. Setup makes the
// key read-only and without any permission for stored data; the path rules here are the first lock
// and the key's own permissions are the second. wiki/stack/company-api.md#look-things-up-in-cloudflare
const CLOUDFLARE = "https://api.cloudflare.com/client/v4/";
// Cloudflare's answer is read up to this size; the action's own output limit leaves room to wrap it.
const LIMIT = 1_000_000;
const keySchema = z.object({ version: z.literal(1), token: z.string().min(1), accountId: z.string().regex(/^[a-f0-9]{32}$/) }).strict();
// Products that hold a business's own data: its database, files, key-value data, queues and memory.
const STORED = /^accounts\/[^/]+\/(?:d1|storage|r2|queues|vectorize|hyperdrive|secrets_store|stream|images|workers\/durable_objects)(?:\/|$)/;
const input = z.strictObject({
  path: z.string().min(1).max(500).describe("The Cloudflare API path to read, under this account or its zones, such as zones or accounts/<account id>/workers/scripts."),
  query: z.string().max(1000).optional().describe("Optional query string for the path, without the leading question mark, such as per_page=20."),
});
const envelope = z.object({ success: z.boolean(), result: z.unknown().optional(), result_info: z.unknown().optional(),
  errors: z.array(z.unknown()).default([]) });
const errors = {
  not_allowed: "Only this account's settings, logs and usage can be looked up. Stored data and other accounts are refused.",
  too_large: "The answer is too large. Narrow the request: add a filter or a smaller per_page.",
  not_ready: "The Cloudflare look-up key is not usable. Ask your assistant to finish Access setup.",
  bad_answer: "Cloudflare did not return an answer that can be shown.",
};

const refuse = (code: keyof typeof errors, status: number) => Response.json({ error: { code } }, { status });
const parse = (text: unknown): unknown => { try { return JSON.parse(String(text)); } catch { return null; } };

/**
 * The address to ask, or null. Only this account's own paths and its zones, in plain path characters,
 * nothing under a stored-data product, and nothing a `.` or `..` could turn into another path.
 */
function address(path: string, query: string | undefined, account: string): URL | null {
  const lower = path.toLowerCase();
  if (!/^[a-z0-9._/-]+$/.test(lower) || lower.includes("//") || STORED.test(lower) ||
    !new RegExp(`^(?:accounts|accounts/${account}(?:/.*)?|zones(?:/.*)?)$`).test(lower)) return null;
  const url = new URL(`${CLOUDFLARE}${path}`);
  url.search = new URLSearchParams(query).toString();
  return url.pathname === `/client/v4/${path}` ? url : null;
}

export const cloudflareRead = defineAction({
  operationId: "cloudflare.read", summary: "Look something up in Cloudflare",
  description: "Send one GET to the Cloudflare API for this business's own account and return the answer. " +
    "`path` is an API path with no leading slash: `accounts` lists the account and its id, then " +
    "`accounts/<account id>/...` or `zones/...`. `query` is an optional query string. It changes nothing. " +
    "Databases, stored files, key-value data, queues and memory are refused.",
  input, output: z.strictObject({ success: z.boolean(), result: z.unknown(), result_info: z.unknown(), errors: z.array(z.unknown()) }),
  encoding: "query", effect: "read", agentAvailable: true, keys: ["cloudflare"], errors,
  examples: [{ input: { path: "zones", query: "per_page=5" }, output: { success: true, result: [], result_info: null, errors: [] } }],
  limits: { inputBytes: 4096, outputBytes: 1_048_576, timeoutMs: 30_000 },
  async handler(_request, env, call) {
    const { path, query } = input.parse(call.input);
    const key = keySchema.safeParse(parse(Reflect.get(env, "WONG_CLOUDFLARE_READ")));
    if (!key.success) return refuse("not_ready", 503);
    const url = address(path, query, key.data.accountId);
    if (!url) return refuse("not_allowed", 400);
    const response = await fetch(url, { method: "GET", redirect: "error", signal: call.signal,
      headers: { Authorization: `Bearer ${key.data.token}`, Accept: "application/json" } });
    let text: string;
    try { text = await boundedText(response.body, LIMIT); } catch { return refuse("too_large", 413); }
    const answer = envelope.safeParse(parse(text));
    // No answer may carry the key itself.
    if (!answer.success || text.includes(key.data.token)) return refuse("bad_answer", 502);
    const { success, result, result_info, errors: problems } = answer.data;
    return Response.json({ success, result: result ?? null, result_info: result_info ?? null, errors: problems });
  },
});
