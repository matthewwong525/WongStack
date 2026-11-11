// Types for the app Worker's import of the memory route. `env` is the app's Env; the route reads MEMORY_DB and
// MEMORY_BUCKET from it, and answers 404 when the Worker binds no memory store.
export const MEMORY_PREFIX: string;
export type MemoryCaller = { role: 'admin' | 'member' | 'reader' | 'team'; subject: string | null; email: string | null };
export function handleMemory<E extends object>(request: Request, env: E,
  signedIn?: (request: Request, env: E) => Promise<MemoryCaller | null>, prefix?: string): Promise<Response>;
export function hashKey(key: string): Promise<string>;
export function newKey(machineId: string): string;
export function ftsQuery(text: string): string | null;
