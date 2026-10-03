export const MEMORY_PREFIX: string;
export const TEAM_HEADER: string;
export const ROLE_HEADER: string;
export const MAX_TRANSCRIPT_BYTES: number;
export function handleMemory(request: Request, env: object): Promise<Response>;
export function hashKey(key: string): Promise<string>;
