import { readdirSync } from "node:fs";
import { expect, it } from "vitest";
import type { AccessIdentity } from "../../access-slots";
import { handleApp } from "../index";
import { fakeEnv } from "../../../tests/env";
import { database } from "../../../tests/employee-access/connections";

// A kept page puts up to 512 KB before the columns after its body, so a row-by-row read of inbox_items walks each one.
// Each inbox statement must search an index, or scan only one that holds every column it needs.
const folder = new URL("../../../../schema/migrations/", import.meta.url);
const sam: AccessIdentity = { kind: "user", id: "sam@example.com", claims: { email: "sam@example.com", sub: "sam",
  iss: "https://business.cloudflareaccess.com", aud: "business-app", exp: 9999999999 } };
const PLAN = "a".repeat(32);

/** Each statement the inbox's routes send while a review page is put, tapped, closed, cleaned up, listed and joined. */
async function statements() {
  const db = database();
  const sent = new Set<string>();
  const prepare = db.session.prepare;
  db.session.prepare = (query: string) => { sent.add(query); return prepare(query); };
  const call = (method: string, route: string, input?: Record<string, unknown>) => handleApp(new Request(
    `https://business.example.com/apps/inbox/api/${route}${method === "GET" && input ? `?${new URLSearchParams(input as Record<string, string>)}` : ""}`,
    { method, ...(method !== "GET" && { headers: { "content-type": "application/json" }, body: JSON.stringify(input) }) }), fakeEnv({ DB: db.DB }), sam);
  await call("PUT", "item", { id: PLAN, kind: "plan", title: "One inbox", workspace: "desk", body: "<p>Plan</p>", actions: ["build"],
    version: "v1", closesAt: Date.now() + 60_000, chat: "agent-1" });
  await call("GET", "items");
  await call("GET", "item", { id: PLAN });
  await call("POST", "tap", { item: PLAN, action: "build", version: "v1" });
  await call("POST", "checkin", { items: [PLAN] });
  await call("POST", "item-close", { id: PLAN });
  await call("GET", "item", { id: PLAN });
  await call("GET", "reviews", { q: "one inbox" });
  await call("GET", "reviews", { q: "inbox", before: `${Date.now()}:${PLAN}` });
  return { sql: db.sql, sent: [...sent].filter(query => /\binbox_items\b/.test(query)) };
}

it("applies every migration in the test database", () => {
  const { sql } = database();
  const files = readdirSync(folder).filter(file => file.endsWith(".sql"));
  expect(files).toContain("20261103120000_inbox_kept_reviews.sql");
  expect(files).toContain("20261112120000_drop_inbox_chats.sql");
  expect(sql.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'index' AND name LIKE 'inbox_items_%'").get()).toEqual({ n: 3 });
});

it("reads no inbox item row by row: each statement on inbox_items searches an index, or scans one holding all it needs", async () => {
  const { sql, sent } = await statements();
  const plans = sent.map(query => ({ query, plan: sql.prepare(`EXPLAIN QUERY PLAN ${query}`).all().map(row => String(row.detail)) }));
  const each = (part: string) => plans.filter(({ query }) => query.includes(part));
  // items, item, reviews (waiting, archived), settleTaps, prune (two kinds), item-close, item-put.
  for (const part of ["AND hidden = 0 ORDER BY created_at DESC, rowid", "AND id = ?3", "hidden = 0 AND closed_at IS NULL",
    "(closed_at IS NOT NULL OR closes_at <= ?3)", "state = 'waiting' AND item_id IN", "kind <> 'plan'", "kind = 'plan' AND body = ''",
    "UPDATE inbox_items SET closed_at", "INSERT INTO inbox_items"]) expect(each(part), part).not.toEqual([]);
  for (const { query, plan } of plans) {
    expect(plan.filter(line => /^SCAN /.test(line) && !/COVERING INDEX|VIRTUAL TABLE/.test(line)), query).toEqual([]);
  }
  // The lists read their columns from the index alone; the clean-up of emptied pages uses the index of only those.
  const uses = (part: string) => each(part).flatMap(({ plan }) => plan).join("\n");
  expect(uses("hidden = 0 AND closed_at IS NULL")).toMatch(/COVERING INDEX inbox_items_(reviews|open)/);
  expect(uses("(closed_at IS NOT NULL OR closes_at <= ?3) AND title")).toMatch(/COVERING INDEX inbox_items_reviews/);
  expect(uses("state = 'waiting' AND item_id IN")).toMatch(/COVERING INDEX inbox_items_open/);
  expect(uses("kind = 'plan' AND body = ''")).toMatch(/INDEX inbox_items_emptied/);
  expect(uses("kind <> 'plan'")).toMatch(/INDEX inbox_items_open/);
});
