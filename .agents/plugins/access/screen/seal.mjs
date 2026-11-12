// A key sealed on the page or the computer, which only the publish can open: AES-256-GCM wrapped by RSA-OAEP-256.
// The browser and Node (scripts/lib/seal-keys.mjs) share it, so it uses only what both have: Web Crypto and base64.

const RSA = { name: "RSA-OAEP", hash: "SHA-256" };
const AES = "AES-GCM";

const toBase64 = bytes => {
  let text = "";
  for (const byte of new Uint8Array(bytes)) text += String.fromCharCode(byte);
  return btoa(text);
};
const fromBase64 = text => Uint8Array.from(atob(text), letter => letter.charCodeAt(0));

/** A new pair: the public half (SPKI) seals, the private half (PKCS #8) opens; both in base64.
 *  @returns {Promise<{ publicKey: string, privateKey: string }>} */
export async function makePair() {
  const pair = await crypto.subtle.generateKey({ ...RSA, modulusLength: 3072, publicExponent: new Uint8Array([1, 0, 1]) }, true, ["encrypt", "decrypt"]);
  const [spki, pkcs8] = await Promise.all([crypto.subtle.exportKey("spki", pair.publicKey), crypto.subtle.exportKey("pkcs8", pair.privateKey)]);
  return { publicKey: toBase64(spki), privateKey: toBase64(pkcs8) };
}

/** `value` sealed with the public half, as the JSON text the app keeps: `{ v: 1, wrapped, iv, data }`, each in base64.
 *  Two seals of one value never match. @returns {Promise<string>} */
export async function seal(value, publicKey) {
  const lock = await crypto.subtle.importKey("spki", fromBase64(publicKey), RSA, false, ["encrypt"]);
  const key = await crypto.subtle.generateKey({ name: AES, length: 256 }, true, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const [wrapped, data] = await Promise.all([
    crypto.subtle.exportKey("raw", key).then(raw => crypto.subtle.encrypt(RSA, lock, raw)),
    crypto.subtle.encrypt({ name: AES, iv }, key, new TextEncoder().encode(value)),
  ]);
  return JSON.stringify({ v: 1, wrapped: toBase64(wrapped), iv: toBase64(iv), data: toBase64(data) });
}

/** The value a sealed key holds, opened with the private half; throws when it is not this pair's or was changed.
 *  @returns {Promise<string>} */
export async function open(sealed, privateKey) {
  const { v, wrapped, iv, data } = JSON.parse(sealed);
  if (v !== 1) throw new Error("not a sealed key this code can open");
  const unlock = await crypto.subtle.importKey("pkcs8", fromBase64(privateKey), RSA, false, ["decrypt"]);
  const raw = await crypto.subtle.decrypt(RSA, unlock, fromBase64(wrapped));
  const key = await crypto.subtle.importKey("raw", raw, AES, false, ["decrypt"]);
  return new TextDecoder("utf-8", { fatal: true }).decode(await crypto.subtle.decrypt({ name: AES, iv: fromBase64(iv) }, key, fromBase64(data)));
}
