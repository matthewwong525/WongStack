// What the key registry means to the rest of the Worker: titles, levels, and which secrets a route may see.
// A request's registry is the code's keys plus the tools added from a chat: wiki/stack/connect-your-tools.md
import { keys, type Forward, type Level } from "../keys.ts";
import { codeSource } from "./code.ts";
import { storedTools } from "./tools.ts";

export type { Level };
/** One key as the registry holds it. `chat`: a tool added from a chat, kept in the app's data. */
export type KeyEntry = { title: string; purpose: string; docs?: string; secrets: readonly string[]; levels?: readonly Level[]; setup?: true; liveOnly?: true; alone?: true; bindings?: readonly string[]; forward?: Forward; chat?: true };
export type Registry = Readonly<Record<string, KeyEntry>>;
type ToolEnv = Parameters<typeof storedTools>[0];

/** Where a request's registry rides on its bindings: every copy of them keeps it. */
const REGISTRY = Symbol("key registry");
/** The registry a request's bindings carry; bindings with none hold the code's keys alone. */
export const registryOf = (env: object): Registry => (Reflect.get(env, REGISTRY) as Registry | undefined) ?? keys;
/** The code's keys, then each stored tool whose id no code key takes: the code wins. */
export async function registryFor(env: ToolEnv): Promise<Registry> {
  const tools = Object.entries(await storedTools(env)).filter(([id]) => !Object.hasOwn(keys, id));
  return { ...keys, ...Object.fromEntries(tools) };
}
/** The bindings with this request's registry on them, read once. */
export const withTools = async <E extends ToolEnv>(env: E): Promise<E> => ({ ...env, [REGISTRY]: await registryFor(env) });
/** The tools added from a chat alone. */
export const chatTools = (registry: Registry): Registry => Object.fromEntries(Object.entries(registry).filter(([, key]) => key.chat));

export const keyIds = (registry: Registry): string[] => Object.keys(registry);
export const registered = (registry: Registry, id: string): boolean => Object.hasOwn(registry, id);
export const keyTitle = (registry: Registry, id: string): string => registry[id].title;
export const madeBySetup = (registry: Registry, id: string): boolean => registry[id].setup === true;
/** A key only the live app may hold: a preview never gets it. */
export const liveOnly = (registry: Registry, id: string): boolean => registry[id].liveOnly === true;
/** A key the Worker's own route uses: it works with no app. */
export const worksAlone = (registry: Registry, id: string): boolean => registry[id].alone === true;
/** The levels a key offers, lowest first. Every key offers Read. */
export const offered = (registry: Registry, id: string): readonly Level[] => registry[id].levels ?? ["read", "write"];
/** Whether a key's service is set up to be used directly through the app. */
export const forwards = (registry: Registry, id: string): boolean => registry[id].forward !== undefined;
/** The path of that service's MCP server, called through the app one tool at a time, or null for another service. */
export const mcpPath = (registry: Registry, id: string): string | null => registry[id].forward?.mcp?.path ?? null;
/** What a key is for, and its service's API guide when it is used directly. */
export const described = (registry: Registry, id: string): { purpose: string; docs?: string } =>
  ({ purpose: registry[id].purpose, ...(registry[id].docs && { docs: registry[id].docs }) });
/** What a tool added from a chat counts as reads beyond GET and HEAD: its look-ups, or its MCP server's read tools. */
export const reads = (registry: Registry, id: string): readonly string[] => registry[id].forward?.mcp?.reads ?? registry[id].forward?.lookups ?? [];
export const levelName = (level: Level): string => level === "read" ? "Read" : "Read & write";
/** Read & write covers everything; Read covers looking up. */
export const holds = (level: Level | undefined, need: Level): boolean => level === "write" || level === need;

/** Every key at its highest level: the owner, and the machine that checks previews. */
export const everyKey = (registry: Registry): Map<string, Level> => new Map(keyIds(registry).map(id => [id, offered(registry, id).at(-1)!]));

/** Stored levels as they count now: an unregistered key is ignored, and a level a key does not offer reads as Read. */
export const heldLevels = (registry: Registry, stored: Readonly<Record<string, Level>>): Map<string, Level> => new Map(Object.entries(stored)
  .filter(([id]) => registered(registry, id)).map(([id, level]) => [id, offered(registry, id).includes(level) ? level : "read"]));

/** A key is saved when every one of its secrets is a non-empty string here. Only this yes or no leaves the Worker.
 *  Project code is saved when the project can be handed out: a Cloudflare-kept one needs no secret. */
export const saved = (env: object, id: string): boolean => {
  const registry = registryOf(env);
  return registered(registry, id) && (id === "code" ? codeSource(env) !== null : registry[id].secrets.every(name => {
    const value: unknown = Reflect.get(env, name);
    return typeof value === "string" && value !== "";
  }));
};

/** A copy of the bindings without the secrets of any registered key the route does not list, and without any tool
 *  secret it does not list. A key the Worker's own route uses is handed to no route, listed or not. */
export function scopedEnv<E extends object>(env: E, listed: readonly string[]): E {
  const registry = registryOf(env);
  const copy = { ...env } as E & Record<string, unknown>;
  const kept = new Set<string>();
  for (const id of keyIds(registry)) {
    const names = [...registry[id].secrets, ...registry[id].bindings ?? []];
    if (!listed.includes(id) || worksAlone(registry, id)) for (const name of names) delete copy[name];
    else for (const name of names) kept.add(name);
  }
  for (const name of Object.keys(copy)) if (name.startsWith("TOOL_") && !kept.has(name)) delete copy[name];
  return copy;
}
