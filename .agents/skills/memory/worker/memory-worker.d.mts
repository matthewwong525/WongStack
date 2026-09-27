// Types for the app Worker's import of the memory route. `env` is the app's Env; the route reads
// MEMORY_DB, MEMORY_BUCKET, and GITHUB_REPOSITORY from it, and answers 404 when the Worker binds no memory store.
export const MEMORY_PREFIX: string;
export const TEAM_HEADER: string;
export const KEY_DAYS: number;
export const KEY_LIMIT: number;
export const MAX_TRANSCRIPT_BYTES: number;
export function handleMemory(request: Request, env: object): Promise<Response>;
export function hashKey(key: string): Promise<string>;
export function newKey(email: string): string;
export function mayTouch(grant: { email: string; role: string }, key: string): boolean;
