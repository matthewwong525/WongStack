// Types for the app Worker's import of the memory route. `env` is the app's Env; the route reads
// MEMORY_DB and MEMORY_BUCKET from it, and answers 404 when the Worker binds no memory store.
export const MEMORY_PREFIX: string;
export function handleMemory(request: Request, env: object): Promise<Response>;
export function hashKey(key: string): Promise<string>;
export function mayTouch(grant: { email: string; role: string }, key: string): boolean;
