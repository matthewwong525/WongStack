import { expect, it } from "vitest";
import { activationIdentity } from "./identity";
import type { AccessIdentity } from "../access";
import type { ActivationEnv } from "./activation";

const human: AccessIdentity = { kind: "user", id: "OWNER@EXAMPLE.COM", claims: {
  email: "OWNER@EXAMPLE.COM", sub: "verified-subject", aud: "business", iss: "https://team.cloudflareaccess.com", exp: 9999999999,
} };
const env = { WONG_ENVIRONMENT: "production", CF_ACCESS_AUD: "business", CF_ACCESS_APP_ID: "app-id", CF_ACCESS_WORKER_ID: "worker-id" } as ActivationEnv;
const call = (identity: AccessIdentity | null = human, overrides: Partial<ActivationEnv> = {}, method = "GET") =>
  activationIdentity(new Request("https://business.example.com/api/access/identity", { method }), { ...env, ...overrides }, identity);

it("returns only the signed-in person's nonsecret identity for private operator comparison", async () => {
  const response = call();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ email: "owner@example.com", subject: "verified-subject",
    issuer: human.claims.iss, audience: "business", origin: "https://business.example.com", accessAppId: "app-id", workerId: "worker-id" });
});

it("requires GET, production configuration and a verified human subject", async () => {
  expect(call(human, {}, "POST").status).toBe(405);
  for (const update of [{ WONG_ENVIRONMENT: "staging" }, { CF_ACCESS_APP_ID: undefined }, { CF_ACCESS_WORKER_ID: undefined }]) {
    expect(call(human, update).status).toBe(503);
  }
  for (const identity of [null, { ...human, kind: "service" as const },
    { ...human, claims: { ...human.claims, sub: "" } }, { ...human, claims: { ...human.claims, common_name: "machine" } }]) {
    expect(call(identity).status).toBe(403);
  }
});
