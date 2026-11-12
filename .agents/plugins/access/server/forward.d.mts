import type { Registry } from "./levels.mjs";
export type Kind = "read" | "change";
export type DirectInput = { method: "GET" | "HEAD" | "POST" | "PUT" | "PATCH" | "DELETE"; path: string; query?: string; body?: unknown; contentType?: string };
/** What a handler is handed beside its input: a saved value by name, the abort signal, and who asked. */
export type DirectCall = { secret: (name: string) => unknown; signal: AbortSignal; caller: string };
export type DirectAction = {
  id: string; kind: Kind; operationId: string; summary: string; description: string; effect: "read" | "external";
  errors: Record<string, string>; examples: { input: DirectInput; output: { status: number; contentType: string; body: unknown } }[];
  limits: { inputBytes: number; outputBytes: number; timeoutMs: number };
  handler: (input: unknown, call: DirectCall) => Promise<Response>;
};
export declare const LIMIT: number;
export declare const METHODS: readonly ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE"];
export declare const CONTENT_TYPE: RegExp;
export declare const FIELDS: Readonly<Record<"method" | "path" | "query" | "body" | "contentType", string>>;
export declare const ERRORS: Readonly<Record<"not_allowed" | "too_large" | "bad_answer", string>>;
export declare const NO_TOKEN: string;
export declare const LIMITS: { inputBytes: number; outputBytes: number; timeoutMs: number };
export declare function checkInput(value: unknown): { input: DirectInput } | { problem: string };
export declare function forwardActions(registry: Registry, send?: typeof fetch): {
  routes: Map<string, DirectAction>; access: Map<string, { keys: string[]; direct: true }>;
};
