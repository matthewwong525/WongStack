const RS256 = { name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" };

/** A fresh RS256 pair, the kind Cloudflare Access signs a sign-in with. */
export async function signingPair(): Promise<CryptoKeyPair> {
  const made = await crypto.subtle.generateKey(RS256, true, ["sign", "verify"]);
  if ("privateKey" in made) return made;
  throw new Error("generateKey made one key, not a pair");
}

/** A public key as the certs address publishes it. */
export async function jwk(key: CryptoKey): Promise<JsonWebKey> {
  const exported = await crypto.subtle.exportKey("jwk", key);
  if (exported instanceof ArrayBuffer) throw new Error("exportKey gave bytes, not a JWK");
  return exported;
}
