// Authenticated encryption binds private material to the installation and receipt.
import { AccessError } from "./core.ts";
export const encode = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
export const decode = (value: string) => Uint8Array.from(atob(value.replaceAll("-", "+").replaceAll("_", "/")), char => char.charCodeAt(0));
const bytes = (value: string) => new TextEncoder().encode(value);
export async function digest(value: string): Promise<string> {
  return encode(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes(value))));
}
async function key(value: string | undefined): Promise<CryptoKey> {
  if (!value) throw new AccessError("private_sealing_setup_required");
  const raw = decode(value);
  if (raw.byteLength !== 32) throw new AccessError("private_sealing_setup_required");
  return crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt", "decrypt"]);
}
export async function seal(value: string, secret: string | undefined, context: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: bytes(context) }, await key(secret), bytes(value));
  return `${encode(iv)}.${encode(new Uint8Array(encrypted))}`;
}
export async function unseal(value: string, secret: string | undefined, context: string): Promise<string> {
  const parts = value.split(".");
  if (parts.length !== 2) throw new AccessError("private_material_invalid");
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: decode(parts[0]), additionalData: bytes(context) }, await key(secret), decode(parts[1]));
  return new TextDecoder().decode(decrypted);
}
