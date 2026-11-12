import type { KeyEntry, Level } from "./levels.mjs";
/** A tool as the store keeps it. */
export type ToolRow = { id: string; title: string; purpose: string; docs: string; forward_json: string; levels_json: string };
/** A tool as a chat saves it, after its check. */
export type ToolInput = { title: string; purpose: string; docs: string; forward: NonNullable<KeyEntry["forward"]>; levels: readonly Level[] };
export declare const TOOL_ID: RegExp;
export declare const toolSecret: (id: string) => string;
export declare function toolInput(value: unknown): { tool: ToolInput } | { problem: string };
export declare function checkedTool(id: string, tool: ToolInput): { entry: KeyEntry } | { problem: string };
export declare function storedTools(rows: readonly ToolRow[], options?: { audit?: (id: string) => unknown }):
  Promise<{ entries: Record<string, KeyEntry>; skipped: string[] }>;
export declare function readTools(store: { tools(): Promise<readonly ToolRow[]>; audited(event: string): Promise<boolean>;
  audit(actor: string, event: string): Promise<unknown> }, actor?: string): Promise<Record<string, KeyEntry>>;
/** PUT or DELETE <prefix>tools/<id>; `ctx` is the module's route context. */
export declare function toolsRoute(ctx: unknown): Promise<Response>;
