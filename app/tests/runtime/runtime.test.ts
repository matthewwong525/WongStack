// The one runtime entry: it builds and starts the Worker once, on the seeded database, and runs each app's file in
// its own `describe`. A server app's file is apps/<name>.ts, imported here. wiki/stack/testing.md
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { access } from "./apps/access.ts";
import { hello } from "./apps/hello.ts";
import { inbox } from "./apps/inbox.ts";
import { knowledge } from "./apps/knowledge.ts";
import { budget } from "./budget.ts";
import type { Context } from "./context.ts";
import { identities, site } from "./identity.ts";
import { resetToSeed, saveSeed, startRuntime } from "./setup.ts";

// Access runs first: it clears the Access tables to prove a fresh install's first start, and each later app resets.
const APPS = { access, hello, inbox, knowledge };
const timing = budget(Object.keys(APPS));
const JWKS = `https://${site.domain}/cdn-cgi/access/certs`;
const outbound: string[] = [];
let context: Context;

beforeAll(async () => {
  const signed = await identities();
  // Wrangler routes Worker outbound requests through host fetch; any non-JWKS call fails.
  vi.stubGlobal("fetch", async (input: string | URL | Request) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    outbound.push(url);
    if (url !== JWKS) throw new Error(`Unexpected runtime outbound request: ${url}`);
    return Response.json({ keys: [signed.publicKey] });
  });
  const runtime = await startRuntime({ WONG_ENVIRONMENT: "staging", WONG_OWNER_EMAIL: site.owner,
    CF_ACCESS_TEAM_DOMAIN: site.domain, CF_ACCESS_AUD: site.audience });
  context = { runtime, signed };
});
afterAll(async () => {
  try { await context?.runtime.close(); }
  finally { vi.unstubAllGlobals(); }
  expect(outbound.every(url => url === JWKS)).toBe(true);
  timing.check();
});

for (const [name, tests] of Object.entries(APPS)) {
  describe(name, () => {
    timing.track(name);
    tests(() => context);
  });
}

// The seed reset itself, on table shapes a later migration may add; the tables go and the seed is saved back after.
describe("seed", () => {
  it("puts back a WITHOUT ROWID table and a table with a generated column", async () => {
    const db = context.runtime.env.DB;
    const read = () => db.batch([db.prepare("SELECT * FROM runtime_keyed"), db.prepare("SELECT * FROM runtime_generated")])
      .then(results => results.map(({ results }) => results));
    await resetToSeed(db);
    await db.batch([db.prepare("CREATE TABLE runtime_keyed (key TEXT PRIMARY KEY, value TEXT) WITHOUT ROWID"),
      db.prepare("CREATE TABLE runtime_generated (id INTEGER PRIMARY KEY, value INTEGER, doubled INTEGER GENERATED ALWAYS AS (value * 2))"),
      db.prepare("INSERT INTO runtime_keyed VALUES ('a', 'seed')"), db.prepare("INSERT INTO runtime_generated (id, value) VALUES (1, 2)")]);
    try {
      await saveSeed(db);
      await db.batch([db.prepare("UPDATE runtime_keyed SET value = 'changed'"), db.prepare("UPDATE runtime_generated SET value = 5"),
        db.prepare("INSERT INTO runtime_keyed VALUES ('b', 'new')")]);
      await resetToSeed(db);
      expect(await read()).toEqual([[{ key: "a", value: "seed" }], [{ id: 1, value: 2, doubled: 4 }]]);
    } finally {
      await db.batch([db.prepare("DROP TABLE runtime_keyed"), db.prepare("DROP TABLE runtime_generated")]);
      await saveSeed(db);
    }
  });
});
