// Knowledge as a preview has it: no knowledge store is reached, so who may open it and its not-set-up answer.
// Page content stays in the fast tests, with their stand-in reader (app/worker/apps/knowledge/*.test.ts).
import { beforeAll, expect, it } from "vitest";
import { call, type AppTests } from "../context.ts";
import { site } from "../identity.ts";
import { resetToSeed } from "../setup.ts";

const READS = ["pages", "page?path=how-we-work/refunds", "search?q=refund"];

export const knowledge: AppTests = context => {
  const read = (route: string, token?: string) => call(context(), `/apps/knowledge/api/${route}`, { token });

  beforeAll(async () => { await resetToSeed(context().runtime.env.DB); });

  it("answers an Admin's pages, page and search as not set up", async () => {
    expect(await context().runtime.env.DB.prepare("SELECT role_id FROM wong_access_member_roles WHERE email = 'fay@example.invalid'").first())
      .toEqual({ role_id: "admin" });
    for (const route of READS) {
      const response = await read(route, context().signed.fay);
      expect([route, response.status, await response.json()]).toMatchObject([route, 503, { error: { code: "not_set_up" } }]);
    }
  });

  it("refuses a person who holds no app, and a caller with no sign-in", async () => {
    for (const route of READS) {
      expect([route, (await read(route, context().signed.eli)).status]).toEqual([route, 403]);
      expect([route, (await read(route)).status]).toEqual([route, 401]);
    }
  });

  it("answers the public address with its one not-found page, as with no repository", async () => {
    const response = await context().runtime.worker.fetch(`${site.origin}/public/how-we-work/refunds`);
    expect([response.status, response.headers.get("Cache-Control"), (await response.text()).includes("<h1>Page not found</h1>")])
      .toEqual([404, "no-store", true]);
  });
};
