import { describe, expect, test } from "vitest";
import { checkStore } from "../../../.agents/skills/access/store/contract.mjs";
import { database } from "../../tests/employee-access/connections.ts";
import { d1Store } from "./index.ts";

checkStore(() => d1Store(database().DB), "the D1 store", { describe, test });

describe("the D1 store around the first open", () => {
  test("answers empty, and refuses a write that needs the installation", async () => {
    const store = d1Store(database().DB);
    expect(await store.policy("someone@example.com")).toBeNull();
    expect(await store.status()).toBeNull();
    expect(await store.started()).toEqual({ policy: false, keys: false });
    await store.listApps(["orders"]);
    await store.audit("someone@example.com", "nothing");
    expect(await store.audited("nothing")).toBe(false);
    await expect(store.installation()).rejects.toThrow("no installation");
  });

  test("lists a new app once the installation exists", async () => {
    const { DB, sql } = database();
    const store = d1Store(DB);
    await store.open({ origin: "https://shop.example", owner: "owner@example.com", subject: "s" });
    await store.listApps(["orders", "orders"]);
    expect(sql.prepare("SELECT app_id FROM wong_access_apps").all().map(row => row.app_id)).toEqual(["orders"]);
  });

  test("hands back a stored level as it is, for the rules to judge", async () => {
    const { DB, sql } = database();
    const store = d1Store(DB);
    await store.open({ origin: "https://shop.example", owner: "owner@example.com", subject: "s" });
    sql.exec("DROP TABLE wong_access_key_grants; CREATE TABLE wong_access_key_grants (installation_id, email, key_id, level, revision)");
    sql.exec(`INSERT INTO wong_access_key_grants VALUES ('${await store.installation()}', 'e@example.com', 'k', 'not json', 1)`);
    sql.exec(`INSERT INTO wong_access_members VALUES ('${await store.installation()}', 'e@example.com', 'active', 0, 1, 'now')`);
    const row = await store.policy("e@example.com");
    expect(row).toMatchObject({ status: "active", apps: [], keys: { k: "not json" } });
  });
});
