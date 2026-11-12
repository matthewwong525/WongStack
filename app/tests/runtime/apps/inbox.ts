// The Inbox on the seeded database: Fay's items, an item and a schedule saved and read back, and her waiting pages.
import { beforeAll, expect, it } from "vitest";
import { call, type AppTests } from "../context.ts";
import { resetToSeed } from "../setup.ts";

const FAY = "fay@example.invalid";
const ITEM = "e0000000000000000000000000000001";
const COMPUTER = "e0000000000000000000000000000002";

export const inbox: AppTests = context => {
  const db = () => context().runtime.env.DB;
  const asFay = (method: string, route: string, body?: object) =>
    call(context(), `/apps/inbox/api/${route}`, { token: context().signed.fay, method, body });
  const row = (sql: string, ...values: unknown[]) => db().prepare(sql).bind(FAY, ...values).first();

  beforeAll(async () => { await resetToSeed(db()); });

  it("lists Fay's seeded open items", async () => {
    const { results } = await db().prepare(`SELECT id FROM inbox_items WHERE email = ? AND closed_at IS NULL AND hidden = 0
      AND closes_at > ? ORDER BY id`).bind(FAY, Date.now()).all<{ id: string }>();
    expect(results.length).toBeGreaterThan(0);
    const response = await asFay("GET", "items");
    expect(response.status).toBe(200);
    const { items } = await response.json() as { items: { id: string }[] };
    expect(items.map(({ id }) => id).sort()).toEqual(results.map(({ id }) => id));
  });

  it("puts an item, then closes it, each read back from the database", async () => {
    const put = await asFay("PUT", "item", { id: ITEM, kind: "approval", title: "Send the BFCM brief?", workspace: "bfcm-brief",
      body: JSON.stringify({ text: "Send the brief to the ads team?" }), actions: ["yes"], version: "v1", closesAt: Date.now() + 3_600_000 });
    expect([put.status, await put.json()]).toEqual([200, { id: ITEM, version: "v1" }]);
    expect(await row("SELECT kind, title, closed_at FROM inbox_items WHERE email = ? AND id = ?", ITEM))
      .toEqual({ kind: "approval", title: "Send the BFCM brief?", closed_at: null });
    const closed = await asFay("POST", "item-close", { id: ITEM });
    expect([closed.status, await closed.json()]).toEqual([200, { closed: true }]);
    expect(await row("SELECT body, closed_at IS NOT NULL AS closed FROM inbox_items WHERE email = ? AND id = ?", ITEM))
      .toEqual({ body: "", closed: 1 });
  });

  it("saves a schedule on the app's clock and reads it back from the database", async () => {
    const saved = await asFay("PUT", "schedule", { key: "runtime-digest", computer: COMPUTER, name: "Runtime digest",
      summary: "Sum up the week.", instructions: "Sum up the week's orders.", run: {},
      timing: { mode: "recurring", cron: "0 9 * * 1", timezone: "UTC", allowedLatenessMs: 0 } });
    expect(saved.status).toBe(200);
    expect(await saved.json()).toMatchObject({ schedule: { key: "runtime-digest", host: "app", state: "on", computer: COMPUTER } });
    expect(await row("SELECT host, state, computer_id, name, next_run_at > 0 AS due FROM schedules WHERE email = ? AND key = ?", "runtime-digest"))
      .toEqual({ host: "app", state: "on", computer_id: COMPUTER, name: "Runtime digest", due: 1 });
  });

  it("lists Fay's seeded waiting pages, and answers the chat list's old routes with retired, with no chats table left", async () => {
    const { waiting } = await (await asFay("GET", "reviews")).json() as { waiting: { id: string }[] };
    expect(waiting.map(({ id }) => id).sort()).toEqual(["a0000000000000000000000000000006", "a0000000000000000000000000000007"]);
    for (const [method, route] of [["GET", "chats"], ["PUT", "chat"], ["POST", "chat-close"]]) {
      const old = await asFay(method, route, method === "GET" ? undefined : { agentId: "runtime-agent" });
      expect([old.status, await old.json()]).toEqual([404, { error: { code: "retired" } }]);
    }
    expect(await db().prepare("SELECT name FROM sqlite_master WHERE name IN ('chats', 'inbox_items_chats')").first()).toBeNull();
  });
};
