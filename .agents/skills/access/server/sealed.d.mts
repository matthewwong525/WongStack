import type { KeyEntry } from "./levels.mjs";
export declare const pasted: (key: Pick<KeyEntry, "setup" | "alone">) => boolean;
/** The keys/ routes; `ctx` is the module's route context. */
export declare function keysRoute(ctx: unknown): Promise<Response>;
export declare const waitingKeys: (store: { sealed(): Promise<Map<string, string>> }) => Promise<Map<string, string>>;
