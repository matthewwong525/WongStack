import type { Level, Registry } from "./levels.mjs";
/** What the services list reads of the caller's policy: `decide`'s answer. */
export type ServicesPolicy = { state: string; role?: string; keys?: ReadonlyMap<string, Level> | null };
export declare function servicesRoute(ctx: {
  request: Request; caller: unknown; policy: ServicesPolicy; refusal: Response | null; registry: Registry;
  secret?: (name: string) => unknown; leaks?: (value: unknown) => boolean;
}): Promise<Response>;
