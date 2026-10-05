// What the key registry means to the rest of the Worker: titles, levels, and which secrets a route may see.
import { keys, type Level } from "../keys.ts";

export type { Level };
type Entry = { title: string; secrets: readonly string[]; levels?: readonly Level[]; setup?: true };
const registry: Readonly<Record<string, Entry>> = keys;

export const keyIds = (): string[] => Object.keys(registry);
export const registered = (id: string): boolean => Object.hasOwn(registry, id);
export const keyTitle = (id: string): string => registry[id].title;
export const madeBySetup = (id: string): boolean => registry[id].setup === true;
/** The levels a key offers, lowest first. Every key offers Read. */
export const offered = (id: string): readonly Level[] => registry[id].levels ?? ["read", "write"];
export const levelName = (level: Level): string => level === "read" ? "Read" : "Read & write";
/** Read & write covers everything; Read covers looking up. */
export const holds = (level: Level | undefined, need: Level): boolean => level === "write" || level === need;

/** Every key at its highest level: the owner, and the machine that checks previews. */
export const everyKey = (): Map<string, Level> => new Map(keyIds().map(id => [id, offered(id).at(-1)!]));

/** Stored levels as they count now: an unregistered key is ignored, and a level a key does not offer reads as Read. */
export const heldLevels = (stored: Readonly<Record<string, Level>>): Map<string, Level> => new Map(Object.entries(stored)
  .filter(([id]) => registered(id)).map(([id, level]) => [id, offered(id).includes(level) ? level : "read"]));

/** A key is saved when every one of its secrets is a non-empty string here. Only this yes or no leaves the Worker. */
export const saved = (env: object, id: string): boolean => registered(id) && registry[id].secrets.every(name => {
  const value: unknown = Reflect.get(env, name);
  return typeof value === "string" && value !== "";
});

/** A copy of the bindings without the secrets of any registered key the route does not list. */
export function scopedEnv<E extends object>(env: E, listed: readonly string[]): E {
  const copy = { ...env } as E & Record<string, unknown>;
  for (const id of keyIds()) {
    if (!listed.includes(id)) for (const name of registry[id].secrets) delete copy[name];
  }
  return copy;
}
