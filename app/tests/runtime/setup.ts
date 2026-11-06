import { copyFile, cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { createBuilder, type Plugin } from "vite";
import { cloudflare } from "@cloudflare/vite-plugin";
import type { WorkerHandle } from "wrangler";

import { stripJsonc } from "../../../scripts/lib-wrangler-config.mjs";

// Share the plugin's installed Wrangler instead of loading a second copy of its large CLI.
const { createTestHarness } = createRequire(import.meta.resolve("@cloudflare/vite-plugin"))("wrangler") as typeof import("wrangler");

export type RuntimeEnv = { DB: D1Database; [key: string]: unknown };
export type Runtime = { worker: WorkerHandle<RuntimeEnv>; env: RuntimeEnv; close: () => Promise<void> };

/** Sorts after every dated migration, so Wrangler's own runner applies the staging seed last, as staging does. */
const SEED_MIGRATION = "99999999999999_staging_seed.sql";

/** Build only the Worker using production transforms, in a root with no app secrets or persistence.
 *  Its database holds the real migrations, then staging's seed. */
export async function startRuntime(vars: Record<string, string> = {}): Promise<Runtime> {
  const started = performance.now();
  const app = resolve(process.cwd());
  const compatibility = JSON.parse(stripJsonc(await readFile(join(app, "wrangler.jsonc"), "utf8")));
  if (!/^\d{4}-\d{2}-\d{2}$/.test(compatibility.compatibility_date) ||
      !Array.isArray(compatibility.compatibility_flags) ||
      !compatibility.compatibility_flags.every((flag: unknown) => typeof flag === "string")) {
    throw new Error("Runtime tests require Wrangler compatibility_date and compatibility_flags");
  }
  const root = await mkdtemp(join(tmpdir(), "wong-runtime-"));
  const configPath = join(root, "wrangler.json");
  const config = {
    name: "runtime-test", main: join(app, "worker/index.ts"),
    compatibility_date: compatibility.compatibility_date,
    compatibility_flags: compatibility.compatibility_flags,
    send_metrics: false, vars, d1_databases: [{ binding: "DB", database_name: "runtime-test", database_id: "local-runtime-test",
      migrations_dir: join(root, "migrations") }],
    // No secret file or process environment value is a binding in this test configuration.
    secrets: { required: [] },
  };
  const server = createTestHarness();
  const close = async () => {
    try { await server.close(); }
    finally { await rm(root, { recursive: true, force: true }); }
  };
  try {
    await writeFile(configPath, JSON.stringify(config));
    await cp(resolve(app, "../schema/migrations"), join(root, "migrations"), { recursive: true });
    await copyFile(resolve(app, "../schema/seed.sql"), join(root, "migrations", SEED_MIGRATION));
    const graphCheck: Plugin = {
      name: "runtime-production-graph",
      generateBundle(_options, bundle) {
        const modules = Object.values(bundle).flatMap(chunk => chunk.type === "chunk" ? chunk.moduleIds : []);
        if (modules.some(path => /\/tests\/runtime\/|vitest\.config|\/vitest\//.test(path))) {
          throw new Error("Runtime fixtures or Vitest entered the deployed Worker graph");
        }
        console.info(`runtime build graph: ${modules.length} production modules; no runtime fixtures or Vitest`);
      },
    };
    const builder = await createBuilder({
      root, configFile: false, envDir: false, publicDir: false, logLevel: "error",
      plugins: [graphCheck, cloudflare({ configPath, viteEnvironment: { name: "worker" }, persistState: false,
        inspectorPort: false, remoteBindings: false, tunnel: false })],
      build: { outDir: join(root, "output"), minify: false, sourcemap: false },
    });
    const environment = builder.environments.worker;
    if (!environment) throw new Error("Runtime tests could not find the Vite Worker environment");
    await builder.build(environment);
    const built = JSON.parse(await readFile(join(root, "output/worker/wrangler.json"), "utf8"));
    // Read only the generated entry, not generated assets or inherited binding settings.
    await server.update({ root, workers: [{ config: { ...config,
      main: resolve(root, "output/worker", built.main), no_bundle: true,
      find_additional_modules: true } }] });
    await server.listen();
    const builtAt = performance.now();
    const worker = server.getWorker<RuntimeEnv>();
    await worker.applyD1Migrations("DB");
    const env = await worker.getEnv();
    await saveSeed(env.DB);
    console.info(`runtime setup: build/start ${(builtAt - started).toFixed(0)}ms, migrations ${(performance.now() - builtAt).toFixed(0)}ms`);
    return { worker, env, close };
  } catch (error) {
    await close();
    throw error;
  }
}

const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`;
type Seed = { triggers: string[]; tables: Record<string, Record<string, unknown>[]> };
const seeds = new WeakMap<D1Database, Seed>();

/** Keep every row and trigger now in `db` as what resetToSeed puts back; the migration ledger and SQLite's own stay.
 *  Rows hold only stored columns: a generated column can't be inserted, and a WITHOUT ROWID table has no rowid. */
export async function saveSeed(db: D1Database): Promise<void> {
  const { results } = await db.prepare(`SELECT type, name, sql FROM sqlite_master WHERE type IN ('table', 'trigger')
    AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%' AND name <> 'd1_migrations' ORDER BY name`).all<{ type: string; name: string; sql: string }>();
  const names = results.filter(({ type }) => type === "table").map(({ name }) => name);
  const columns = await db.batch<{ name: string }>(names.map(name => db.prepare("SELECT name FROM pragma_table_xinfo(?) WHERE hidden = 0").bind(name)));
  const rows = await db.batch(names.map((name, index) => db.prepare(`SELECT ${columns[index].results.map(({ name }) => quoted(name)).join(", ")} FROM ${quoted(name)}`)));
  seeds.set(db, { triggers: results.filter(({ type }) => type === "trigger").map(({ sql }) => sql),
    tables: Object.fromEntries(names.map((name, index) => [name, rows[index].results as Record<string, unknown>[]])) });
}

/** Put back the staging seed in one D1 batch: every trigger goes, the rows return, and the migrations' triggers
 *  return last, so a test's own trigger is gone and a protected row can be cleared. */
export async function resetToSeed(db: D1Database): Promise<void> {
  const seed = seeds.get(db);
  if (!seed) throw new Error("resetToSeed needs the database startRuntime seeded");
  const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'trigger'").all<{ name: string }>();
  const tables = Object.entries(seed.tables);
  await db.batch([db.prepare("PRAGMA defer_foreign_keys = ON"),
    ...results.map(({ name }) => db.prepare(`DROP TRIGGER ${quoted(name)}`)),
    ...tables.map(([name]) => db.prepare(`DELETE FROM ${quoted(name)}`)),
    ...tables.flatMap(([name, rows]) => rows.map(row => db.prepare(`INSERT INTO ${quoted(name)} (${Object.keys(row).map(quoted).join(", ")})
      VALUES (${Object.keys(row).map(() => "?").join(", ")})`).bind(...Object.values(row)))),
    ...seed.triggers.map(sql => db.prepare(sql))]);
}
