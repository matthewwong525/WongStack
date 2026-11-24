import type { Forward } from "./levels.mjs";
/** What the rules read of a key. */
export type RuledKey = { purpose?: string; docs?: string; secrets: readonly string[]; setup?: true; alone?: true; forward?: Forward };
export declare function address(forward: Forward, path: string, query?: string): URL | null;
export declare function forwardProblem(id: string, key: RuledKey, forward: Forward): string | null;
export declare const undescribed: (registry: Readonly<Record<string, { purpose?: string; docs?: string; forward?: object }>>) => string[];
export declare const keyProblems: (registry: Readonly<Record<string, RuledKey>>) => string[];
