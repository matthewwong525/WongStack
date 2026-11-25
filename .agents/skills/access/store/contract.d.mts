import type { Store } from "./interface.mjs";
type Runner = { describe(name: string, body: () => void): unknown; test(name: string, body: () => Promise<void> | void): unknown };
export declare function checkStore(makeStore: () => Store | Promise<Store>, name?: string, runner?: Runner): void;
