import { webcrypto } from "node:crypto";

export const site = { origin: "https://runtime.example.com", owner: "owner@example.com",
  employee: "employee@example.com", domain: "runtime.cloudflareaccess.com", audience: "runtime-audience" };
const encoded = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");

/** Node signs; the unchanged Worker verifies with workerd's Web Crypto. */
export async function identities() {
  const pair = await webcrypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048,
    publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const publicKey = { ...await webcrypto.subtle.exportKey("jwk", pair.publicKey), kid: "runtime-key", alg: "RS256" };
  const token = async (claims: Record<string, unknown>) => {
    const content = `${encoded({ kid: publicKey.kid, alg: publicKey.alg })}.${encoded({
      iss: `https://${site.domain}`, aud: site.audience, exp: Math.floor(Date.now() / 1000) + 600, ...claims })}`;
    const signature = await webcrypto.subtle.sign("RSASSA-PKCS1-v1_5", pair.privateKey, Buffer.from(content));
    return `${content}.${Buffer.from(signature).toString("base64url")}`;
  };
  // Three of staging's seeded people: Fay is an Admin, Dana holds Hello, and Eli holds no app.
  const seeded = async (name: string) => token({ email: `${name}@example.invalid`, sub: `runtime-${name}` });
  return { publicKey, owner: await token({ email: site.owner, sub: "runtime-owner" }),
    fay: await seeded("fay"), dana: await seeded("dana"), eli: await seeded("eli"),
    employee: await token({ email: site.employee, sub: "runtime-employee" }),
    service: await token({ common_name: "runtime-service", sub: "" }),
    wrongAudience: await token({ email: site.owner, aud: "another-app" }) };
}
