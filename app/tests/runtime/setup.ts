import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
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

/** Build only the Worker using production transforms, in a root with no app secrets or persistence. */
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
      migrations_dir: resolve(app, "../schema/migrations") }],
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
    console.info(`runtime setup: build/start ${(builtAt - started).toFixed(0)}ms, migrations ${(performance.now() - builtAt).toFixed(0)}ms`);
    return { worker, env, close };
  } catch (error) {
    await close();
    throw error;
  }
}

const accessTables = new WeakMap<D1Database, string[]>();
async function tables(db: D1Database): Promise<string[]> {
  const known = accessTables.get(db);
  if (known) return known;
  const { results } = await db.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'wong_access_%' ORDER BY name").all<{ name: string }>();
  const names = results.map(({ name }) => name);
  accessTables.set(db, names);
  return names;
}
const quoted = (name: string) => `"${name.replaceAll('"', '""')}"`;

/** Clear only the Access fixture, retaining the migration ledger and runtime session. */
export async function resetDatabase(db: D1Database): Promise<void> {
  const names = await tables(db);
  // One real D1 batch: remove the trigger and defer constraints while deleting the fixture.
  await db.batch([db.prepare("DROP TRIGGER IF EXISTS runtime_abort_save"),
    db.prepare("PRAGMA defer_foreign_keys = ON"), ...names.map(name => db.prepare(`DELETE FROM ${quoted(name)}`))]);
}

/** Snapshot every Access table in one D1 call, so refusal and rollback cannot hide a partial write. */
export async function snapshot(db: D1Database) {
  const names = await tables(db);
  const rows = await db.batch(names.map(name => db.prepare(`SELECT * FROM ${quoted(name)} ORDER BY rowid`)));
  return Object.fromEntries(names.map((name, index) => [name, rows[index].results]));
}
