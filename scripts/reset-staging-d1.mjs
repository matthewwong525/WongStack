#!/usr/bin/env node
/**
 * Rebuild the staging D1 from a checked-in seed: drop every object, apply the
 * migrations, then apply `schema/seed.sql` (data-only INSERTs).
 *
 * Staging is a seeded fixture database, NOT a mirror of production. This
 * script never reads, exports, or copies production data, and never touches
 * the production database — it targets the twin database declared by the
 * `staging` environment in wrangler.jsonc, via `--env staging`.
 *
 * Zero-config: the staging database's name is read from that environment's
 * block in wrangler.jsonc, so every repo ships this file byte-for-byte
 * identical.
 *
 * Usage: node scripts/reset-staging-d1.mjs  (from any folder: it finds the config itself)
 */

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";

import {
  findWranglerConfig,
  parseConfig,
  repoRoot,
  stagingDatabase as sharedStagingDatabase,
  WranglerConfigError,
} from "./lib-wrangler-config.mjs";
import { parseCli } from "./lib-cli.mjs";

parseCli({ usage: "usage: node scripts/reset-staging-d1.mjs  (rebuilds the staging D1 from schema/seed.sql)" });
const root = repoRoot;
const wranglerPath = findWranglerConfig();
const STAGING_ENV = "staging";
const DB = stagingDatabase(wranglerPath);
const STAGING_FLAGS = ["--remote", "--env", STAGING_ENV];

// Run wrangler from the config's own directory so config-relative paths
// (migrations_dir, assets) resolve the way wrangler expects.
const wranglerCwd = dirname(wranglerPath);

/**
 * The staging database's name. Stops, before any wrangler call, when the config
 * cannot be read, when staging binds no database (nothing to reset), or when
 * staging names the production database: `--env staging` would then point
 * every DROP below at production.
 */
function stagingDatabase(configPath) {
  try {
    const name = sharedStagingDatabase(parseConfig(configPath));
    if (!name) throw new WranglerConfigError(`env.${STAGING_ENV} binds no D1 database, so there is nothing to reset.`);
    return name;
  } catch (error) {
    if (!(error instanceof WranglerConfigError)) throw error;
    console.error(`Refusing to reset staging: ${error.message}`);
    process.exit(1);
  }
}

function exec(args, { json = false } = {}) {
  const result = execFileSync("npx", ["wrangler", ...args], {
    cwd: wranglerCwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  return json ? JSON.parse(result) : result;
}

function listStagingObjects() {
  const out = exec([
    "d1", "execute", DB, ...STAGING_FLAGS, "--json", "--command",
    "SELECT type, name FROM sqlite_master WHERE type IN ('table','view','trigger') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
  ], { json: true });
  const results = Array.isArray(out) ? out[0]?.results : out.results;
  return (results ?? []).map((r) => ({ type: r.type, name: r.name }));
}

const DROP_KEYWORD = { table: "TABLE", view: "VIEW", trigger: "TRIGGER" };

// One batched command. With foreign keys off, no drop order can fail on a
// reference, so there is no retry loop. D1 defers the checks instead, so both.
function dropAllStagingObjects() {
  const objects = listStagingObjects();
  console.log(`Dropping ${objects.length} object(s) from ${DB} (staging)…`);
  if (objects.length === 0) return;
  const drops = objects.map(({ type, name }) => `DROP ${DROP_KEYWORD[type]} IF EXISTS "${name}";`);
  exec([
    "d1", "execute", DB, ...STAGING_FLAGS, "--command",
    ["PRAGMA foreign_keys=OFF;", "PRAGMA defer_foreign_keys=ON;", ...drops].join(" "),
  ]);
}

dropAllStagingObjects();

console.log("Applying migrations to staging…");
exec(["d1", "migrations", "apply", DB, ...STAGING_FLAGS]);

console.log("Applying schema/seed.sql to staging…");
exec(["d1", "execute", DB, ...STAGING_FLAGS, `--file=${resolve(root, "schema", "seed.sql")}`]);

console.log("Staging rebuilt from seed.");
