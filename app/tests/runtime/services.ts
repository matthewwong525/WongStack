// Answers the Worker's requests to an outside service from that service's saved examples, so a runtime test never
// reaches the live service. wiki/stack/testing.md#service-examples
import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { keys } from "../../worker/keys.ts";

type Exchange = { request: { method: string; path: string; query?: string; body?: unknown };
  answer: { status: number; contentType: string; body: unknown } };
type Served = { key: string; base: URL; examples: { name: string; exchange: Exchange }[] };
export type Playback = ReturnType<typeof playback>;

/** A value as text with its keys in order, so two bodies that hold the same compare equal. */
const canonical = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => item && typeof item === "object" && !Array.isArray(item)
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item) ?? "";
const parsed = (text: string): unknown => { try { return JSON.parse(text); } catch { return text; } };
const sortedQuery = (query: string) => [...new URLSearchParams(query)].sort(([a], [b]) => a.localeCompare(b)).map(pair => pair.join("=")).join("&");
const NO_BODY = new Set([204, 205, 304]);

function distance(a: string, b: string): number {
  let row = Array.from({ length: b.length + 1 }, (_, index) => index);
  for (let i = 1; i <= a.length; i++) {
    const next = [i];
    for (let j = 1; j <= b.length; j++) next[j] = Math.min(row[j] + 1, next[j - 1] + 1, row[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    row = next;
  }
  return row[b.length];
}

const closest = ({ key, examples }: Served, asked: string) => {
  const [best] = [...examples].sort((a, b) => distance(`${a.exchange.request.method} ${a.exchange.request.path}`, asked)
    - distance(`${b.exchange.request.method} ${b.exchange.request.path}`, asked));
  return best ? `${key}/${best.name}` : "none saved";
};

/** The address a key's requests go to: the code's registry, else a tool the test database holds. */
async function baseOf(key: string, db?: D1Database): Promise<string | undefined> {
  const coded = (Reflect.get(keys, key) as { forward?: { base: string } } | undefined)?.forward?.base;
  if (coded || !db) return coded;
  const row = await db.prepare("SELECT forward_json FROM tools WHERE id = ?").bind(key).first<{ forward_json: string }>();
  return row ? (JSON.parse(row.forward_json) as { base: string }).base : undefined;
}

/** The services a run answers for. `serve` adds one; `answer` replies to a request, or is undefined for an address
 *  no served service has. */
export function playback(root = resolve(process.cwd(), "..")) {
  const served: Served[] = [];
  return {
    /** Answer `key` from its examples: schema/services/<key>/ unless `dir` names another folder. */
    async serve(key: string, { dir, db }: { dir?: string; db?: D1Database } = {}) {
      const folder = join(dir ?? join(root, "schema", "services", key), "examples");
      const base = await baseOf(key, db);
      if (!base) throw new Error(`No address for ${key}: it is in neither app/worker/keys.ts nor the test database's tools`);
      const names = (await readdir(folder)).filter(name => name.endsWith(".json")).sort();
      const examples = await Promise.all(names.map(async name => ({ name: name.slice(0, -5),
        exchange: JSON.parse(await readFile(join(folder, name), "utf8")) as Exchange })));
      served.push({ key, base: new URL(base), examples });
    },
    /** The saved answer whose method, path, query and body match; a miss throws, naming the closest example. */
    async answer(request: Request): Promise<Response | undefined> {
      const url = new URL(request.url);
      const service = served.find(({ base }) => url.origin === base.origin && url.pathname.startsWith(base.pathname));
      if (!service) return undefined;
      const path = url.pathname.slice(service.base.pathname.length);
      const text = await request.text();
      const body = canonical(text ? parsed(text) : undefined);
      const hit = service.examples.find(({ exchange: { request: saved } }) => saved.method === request.method && saved.path === path &&
        sortedQuery(saved.query ?? "") === sortedQuery(url.search) && canonical(saved.body) === body);
      if (!hit) throw new Error(`No example for ${request.method} ${service.key}/${path} (closest: ${closest(service, `${request.method} ${path}`)})`);
      const { status, contentType, body: answer } = hit.exchange.answer;
      return new Response(NO_BODY.has(status) ? null : typeof answer === "string" ? answer : JSON.stringify(answer),
        { status, headers: { "content-type": contentType } });
    },
  };
}
