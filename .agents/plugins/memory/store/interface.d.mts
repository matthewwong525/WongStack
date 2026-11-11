// The shapes every memory store answers in; interface.mjs lists the operations.
export interface Fact {
  id: number; slug: string; type: 'user' | 'feedback' | 'project' | 'reference' | 'thread'; body: string;
  author: string | null; created_at: string; session_id: string | null; superseded_by: number | null;
  owner_subject: string | null; shared: 0 | 1; sources: string[]; tags?: string[];
}

// One read. The backend adds the caller's visibility to each.
export interface FactQuery {
  terms?: string; ids?: number[]; slug?: string; notSlug?: string; type?: string; notType?: string;
  tags?: string[]; since?: string; until?: string; author?: string; branch?: string; change?: string;
  all?: boolean; everyone?: boolean; order?: 'rank' | 'newest' | 'threads-first'; limit?: number; withTags?: boolean;
}

// The backend sets the author, owner, sharing, and time from the caller, never from here.
export type FactWrite =
  | { slug?: string; type: string; body: string; tags?: string[]; supersedes?: number[]; sources?: string[] }
  | { restate: number; tags: string[] }
  | { close: number; body: string };

export const OPERATIONS: Record<string, string>;
export const TEAM_HEADER: string;
export const ROLE_HEADER: string;
export const MAX_TRANSCRIPT_BYTES: number;
export class StoreError extends Error {
  constructor(reason: string, options?: { kind?: string; help?: string });
  kind: string;
  reason: string;
  readonly spoolable: boolean;
}
export function httpStore(options: {
  url: string; headers?: () => Record<string, string> | Promise<Record<string, string>>; timeoutMs?: number;
  signal?: AbortSignal; onRequest?: (op: string) => void;
}): Record<string, (args?: unknown, bytes?: Uint8Array) => Promise<unknown>>;
export function serve(request: Request, options: { prefix: string; caller: unknown; store: unknown }): Promise<Response>;
