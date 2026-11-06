// A key sealed on the page or the computer, which only the publish can open: AES-256-GCM wrapped by RSA-OAEP-256.
// The browser and Node (scripts/seal-keys.mjs, company-api.mjs) share it: wiki/stack/connect-your-tools.md

/** What a sealed key holds, each part in base64: the wrapped AES key, its nonce and the encrypted value. */
type Sealed = { v: 1; wrapped: string; iv: string; data: string };

const RSA = { name: "RSA-OAEP", hash: "SHA-256" } as const;
const AES = "AES-GCM";

const toBase64 = (bytes: ArrayBuffer | Uint8Array): string => {
  let text = "";
  for (const byte of new Uint8Array(bytes)) text += String.fromCharCode(byte);
  return btoa(text);
};
const fromBase64 = (text: string): Uint8Array<ArrayBuffer> => Uint8Array.from(atob(text), letter => letter.charCodeAt(0));

/** A new pair: the public half (SPKI) seals, the private half (PKCS #8) opens; both in base64. @public */
export async function makePair(): Promise<{ publicKey: string; privateKey: string }> {
  const pair = await crypto.subtle.generateKey({ ...RSA, modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]) }, true, ["encrypt", "decrypt"]);
  const [spki, pkcs8] = await Promise.all([crypto.subtle.exportKey("spki", pair.publicKey), crypto.subtle.exportKey("pkcs8", pair.privateKey)]);
  return { publicKey: toBase64(spki), privateKey: toBase64(pkcs8) };
}

/** `value` sealed with the public half, as the JSON text the app keeps. Two seals of one value never match. */
export async function seal(value: string, publicKey: string): Promise<string> {
  const lock = await crypto.subtle.importKey("spki", fromBase64(publicKey), RSA, false, ["encrypt"]);
  const key = await crypto.subtle.generateKey({ name: AES, length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const [wrapped, data] = await Promise.all([
    crypto.subtle.exportKey("raw", key).then(raw => crypto.subtle.encrypt(RSA, lock, raw)),
    crypto.subtle.encrypt({ name: AES, iv }, key, new TextEncoder().encode(value)),
  ]);
  const sealed: Sealed = { v: 1, wrapped: toBase64(wrapped), iv: toBase64(iv), data: toBase64(data) };
  return JSON.stringify(sealed);
}

/** The value a sealed key holds, opened with the private half; throws when it is not this pair's or was changed.
 *  @public */
export async function open(sealed: string, privateKey: string): Promise<string> {
  const { v, wrapped, iv, data } = JSON.parse(sealed) as Sealed;
  if (v !== 1) throw new Error("not a sealed key this code can open");
  const unlock = await crypto.subtle.importKey("pkcs8", fromBase64(privateKey), RSA, false, ["decrypt"]);
  const raw = await crypto.subtle.decrypt(RSA, unlock, fromBase64(wrapped));
  const key = await crypto.subtle.importKey("raw", raw, AES, false, ["decrypt"]);
  return new TextDecoder("utf-8", { fatal: true }).decode(await crypto.subtle.decrypt({ name: AES, iv: fromBase64(iv) }, key, fromBase64(data)));
}

