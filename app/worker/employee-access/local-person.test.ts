import { expect, it } from "vitest";
import { getAccessIdentity } from "../access";
import { humanEmail } from "./policy";

// The local stand-in reaches person-only routes, the inbox and its line, only where all three local conditions hold.
it("takes the local stand-in as a person only on a local run with sign-in skipped, from this computer", async () => {
  const local = { WONG_ENVIRONMENT: "local", SKIP_AUTH: "true" };
  expect(humanEmail(await getAccessIdentity(new Request("http://localhost:5173/apps/inbox/"), local))).toBe("dev@example.com");
  for (const [url, bindings] of [["http://app.example.com/apps/inbox/", local], ["http://localhost:5173/", { ...local, WONG_ENVIRONMENT: "staging" }],
    ["http://localhost:5173/", { WONG_ENVIRONMENT: "local" }]] as const) {
    expect(humanEmail(await getAccessIdentity(new Request(url), bindings))).toBeNull();
  }
});
