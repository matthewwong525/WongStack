// Sign-ins are sealed before they reach the shared database: any mini app's route can read it, none is handed this
// secret (scopedEnv strips it, scripts/check-app-keys.mjs refuses its name outside this folder).
export const SEAL = "WONG_MCP_SEAL";
export type SealEnv = { WONG_MCP_SEAL?: string };

const bytes = (text: string) => new TextEncoder().encode(text);
const encode = (data: ArrayBuffer | Uint8Array) => btoa(String.fromCharCode(...new Uint8Array(data)));
const decode = (text: string) => Uint8Array.from(atob(text), char => char.charCodeAt(0));

/** Whether the app holds a sealing secret long enough to use. */
export const sealReady = (env: SealEnv): boolean => typeof env.WONG_MCP_SEAL === "string" && env.WONG_MCP_SEAL.length >= 32;

async function key(env: SealEnv): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", bytes(env.WONG_MCP_SEAL!));
  return crypto.subtle.importKey("raw", digest, "AES-GCM", false, ["encrypt", "decrypt"]);
}

/** `value` as sealed text. `context` names where it is kept, so a sealed value moved to another row does not open. */
export async function seal(env: SealEnv, context: string, value: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const sealed = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: bytes(context) }, await key(env), bytes(JSON.stringify(value)));
  return `v1.${encode(iv)}.${encode(sealed)}`;
}

/** The sealed value, or null when it is missing, was sealed elsewhere, or with another secret. */
export async function unseal<T>(env: SealEnv, context: string, sealed: string | null): Promise<T | null> {
  const [version, iv, data] = sealed?.split(".") ?? [];
  if (version !== "v1" || !sealReady(env)) return null;
  try {
    const opened = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(iv), additionalData: bytes(context) }, await key(env), decode(data));
    return JSON.parse(new TextDecoder().decode(opened)) as T;
  } catch { return null; }
}
