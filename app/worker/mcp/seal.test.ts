import { expect, it } from "vitest";
import { seal, sealReady, unseal } from "./seal";
import { SEAL_VALUE } from "../../tests/mcp";

const env = { WONG_MCP_SEAL: SEAL_VALUE };
it("opens a sealed value only in its own place, with its own secret", async () => {
  const sealed = await seal(env, "place", { access: "token" });
  expect(sealed).toMatch(/^v1\./); expect(sealed).not.toContain("token");
  expect(await unseal(env, "place", sealed)).toEqual({ access: "token" });
  expect(await unseal(env, "elsewhere", sealed)).toBeNull();
  expect(await unseal({ WONG_MCP_SEAL: "another-secret-just-as-long-as-the-first" }, "place", sealed)).toBeNull();
  expect(await unseal({}, "place", sealed)).toBeNull();
  for (const broken of [null, "", "v2.a.b", "v1.!.!"]) expect(await unseal(env, "place", broken)).toBeNull();
});
it("needs a secret of at least 32 characters", () => {
  expect(sealReady(env)).toBe(true);
  expect(sealReady({ WONG_MCP_SEAL: "short" })).toBe(false);
  expect(sealReady({})).toBe(false);
});
