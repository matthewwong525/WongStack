import type { KeyEntry, Level, Registry } from "./levels.mjs";
import type { CurrentPolicy, Refusal, RouteAccess } from "./policy.mjs";
import type { Store } from "../store/interface.mjs";

export type { CurrentPolicy, KeyEntry, Level, Refusal, Registry, RouteAccess, Store };
/** Who the sign-in says is asking: a person, a machine the wall admits, or nobody. */
export type Caller = { email: string; subject: string } | { machine: string } | null;
/** The pass of the owner or an Admin, made only inside the module. `email` is always the owner's. */
export type Pass = Readonly<{ origin: string; email: string; actor: string; owner: boolean; subject: string; live: boolean }>;
/** The sign-in list adapter `signin/cloudflare-list.mjs` makes. */
export type SignInList = {
  ready(): boolean;
  admitted(options: { store: Store }): Promise<string[]>;
  reconcile(options: { store: Store; owner: string; holder: string; kind: "policy" | "sessions" }): Promise<void>;
};
/** What a module route or an extra is handed. */
export type RouteContext = {
  request: Request; url: URL; path: string; pass: Pass | null; caller: Caller; store: Store; registry: Registry; slots: Slots;
  policy?: CurrentPolicy; json(limit: number): Promise<unknown>; reply(body: object, status?: number): Response;
  refuse(code: string, status: number, message?: string): Response; start(): Promise<string | null>; reconcile(): Promise<void>;
  wait(work: Promise<unknown>): void;
};
/** The timed job's context: no request, the live app's own pass. */
export type ScheduledContext = Omit<RouteContext, "request" | "url" | "pass"> & { request: null; url: null; pass: Pass };
export type Extra = { path: string; need: { key: string; level?: Level } | "manage"; handle(ctx: RouteContext): Response | Promise<Response> };
export type Slots = {
  signIn(request: Request): Caller | Promise<Caller>;
  store(): Store;
  owner(): string | null | undefined;
  apps?(): readonly { id: string; title: string; description: string }[];
  keys?(): Registry;
  signInList?: SignInList;
  secret?(name: string): unknown;
  sealing?: { publicKey?: string };
  environment?(): "live" | "preview" | "local";
  checker?(machine: string): boolean;
  extras?: readonly Extra[];
  status?(pass: Pass): object | Promise<object>;
  leaks?(value: unknown): boolean;
  /** Where the Access API answers; default `/api/access/`. */
  prefix?: string;
  /** Where the page is: `serve()` answers its HTML at each address under it that names no file; default `/apps/access/`. */
  page?: string;
  /** True while the app is open to anyone, so a request with no caller passes; else it is refused. */
  open?(): boolean;
};
export type Access = {
  caller(request: Request): Promise<Caller>;
  decide(request: Request): Promise<CurrentPolicy>;
  gate(request: Request, need: RouteAccess | undefined, level?: Level): Promise<Response | null>;
  allows(policy: CurrentPolicy, need: RouteAccess | undefined, level?: Level, registry?: Registry): boolean;
  denied(policy: CurrentPolicy, lacking?: Refusal, registry?: Registry): Response;
  registry(request: Request): Promise<Registry>;
  manages(request: Request): Promise<Pass | null>;
  serve(request: Request, options?: { wait?: (work: Promise<unknown>) => void }): Promise<Response | null>;
  scheduled(work?: (ctx: ScheduledContext) => Promise<void>): Promise<void>;
};
export declare function access(slots: Slots): Access;
