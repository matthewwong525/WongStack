import type { Level, Registry } from "./levels.mjs";
export type Role = "owner" | "employee";
/** What a route asks of its caller: apps, whatever saved keys it uses; keys alone; or a reviewed exception. `direct`
 *  marks a route that passes a request on to its one key's service. */
export type RouteAccess = { apps: readonly string[]; keys?: readonly string[] } | { keys: readonly string[]; direct?: true } |
  { kind: "infrastructure" | "self-service" | "owner" };
export type CurrentPolicy = { state: "legacy" } | { state: "unavailable" } | { state: "denied" } |
  { state: "not_started"; role: Role; manages: boolean } |
  { state: "current"; role: Role; manages: boolean; revision: number; apps: ReadonlySet<string>; keys: ReadonlyMap<string, Level> | null;
    keysStarted: boolean };
/** What a refused caller lacks: an app, or one key at the level the call needs. */
export type Refusal = "app" | { key: string; need: Level };
export declare const ADMIN_ROLE: "admin";
export declare const APP_ID: RegExp;
export declare const ownerOf: (value: unknown) => string | null;
export declare const listedKeys: (access: RouteAccess | undefined) => readonly string[];
export declare const usedDirectly: (access: RouteAccess | undefined) => boolean;
export declare function policyAllows(policy: CurrentPolicy, access: RouteAccess | undefined, need?: Level, registry?: Registry, appsSlot?: boolean): boolean;
export declare function policyDenied(policy: CurrentPolicy, lacking?: Refusal, registry?: Registry): Response;
