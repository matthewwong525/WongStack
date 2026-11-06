// Hello on the seeded database: who the seed lets greet, and the seed coming back after a case changes it.
import { beforeAll, expect, it } from "vitest";
import { call, type AppTests } from "../context.ts";
import { resetToSeed } from "../setup.ts";

const DANA = "dana@example.invalid";

export const hello: AppTests = context => {
  const db = () => context().runtime.env.DB;
  const greet = (token?: string) => call(context(), "/apps/hello/api/greeting?name=%20Ada%20", { token });
  const dana = () => db().prepare("SELECT status FROM wong_access_members WHERE email = ?").bind(DANA).first<{ status: string }>();

  beforeAll(async () => { await resetToSeed(db()); });

  it("greets a seeded person who holds Hello, and refuses one who holds no app or no sign-in", async () => {
    expect(await db().prepare("SELECT app_id FROM wong_access_grants WHERE email = ? AND level = 'write'").bind(DANA).first())
      .toEqual({ app_id: "hello" });
    const greeted = await greet(context().signed.dana);
    expect([greeted.status, await greeted.json()]).toEqual([200, { message: "Hello, Ada!" }]);
    expect((await greet(context().signed.eli)).status).toBe(403);
    expect((await greet()).status).toBe(401);
  });

  it("refuses a removed person, then the seed puts them back", async () => {
    expect(await dana()).toEqual({ status: "active" });
    await db().prepare("UPDATE wong_access_members SET status = 'removed' WHERE email = ?").bind(DANA).run();
    expect((await greet(context().signed.dana)).status).toBe(403);
    await resetToSeed(db());
    expect(await dana()).toEqual({ status: "active" });
    expect((await greet(context().signed.dana)).status).toBe(200);
  });
};
