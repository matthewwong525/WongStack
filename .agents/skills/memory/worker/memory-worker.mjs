// All legacy REST, GitHub join and custom SQL routes are retired.
export { MAX_TRANSCRIPT_BYTES } from './machine-core-transcripts.mjs';
export { handleMachineCore as handleMemory } from './machine-core.mjs';
export const MEMORY_PREFIX='/_memory';
export const TEAM_HEADER='Wong-Memory-Team';
export const ROLE_HEADER='Wong-Memory-Role';
export const hashKey=async key=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(key))),b=>b.toString(16).padStart(2,'0')).join('');
