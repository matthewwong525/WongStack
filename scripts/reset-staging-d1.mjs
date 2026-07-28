#!/usr/bin/env node
/**
 * Rebuild the staging D1 from a checked-in seed: drop every object, apply the
 * migrations, then apply `schema/seed.sql` (data-only INSERTs).
 *
 * Staging is a seeded fixture database, NOT a mirror of production. This
 * script never reads, exports, or copies production data, and never touches
 * the production database — it targets staging via wrangler's `--preview`
 * flag, which resolves to `preview_database_id`.
 *
 * Zero-config: the database name is read from wrangler.jsonc, so every repo
 * ships this file byte-for-byte identical.
 *
 * Usage: npm run db:reset:staging
 */

import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";

import { findWranglerConfig, readDatabaseName, repoRoot } from "./lib-wrangler-config.mjs";

const root = repoRoot;
const wranglerPath = findWranglerConfig();
const DB = readDatabaseName(wranglerPath);
const PREVIEW_FLAGS = ["--remote", "--preview"]; // staging

// Run wrangler from the config's own directory so config-relative paths
// (migrations_dir, assets) resolve the way wrangler expects.
const wranglerCwd = dirname(wranglerPath);

function exec(args, { json = false, quiet = false } = {}) {
  const result = execFileSync("npx", ["wrangler", ...args], {
    cwd: wranglerCwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", quiet ? "pipe" : "inherit"],
  });
  return json ? JSON.parse(result) : result;
}

function listStagingObjects() {
  const out = exec([
    "d1", "execute", DB, ...PREVIEW_FLAGS, "--json", "--command",
    "SELECT type, name FROM sqlite_master WHERE type IN ('table','view','trigger') AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_cf_%'",
  ], { json: true });
  const results = Array.isArray(out) ? out[0]?.results : out.results;
  return (results ?? []).map((r) => ({ type: r.type, name: r.name }));
}

const DROP_KEYWORD = { table: "TABLE", view: "VIEW", trigger: "TRIGGER" };

function dropObject({ type, name }) {
  try {
    exec([
      "d1", "execute", DB, ...PREVIEW_FLAGS, "--command",
      `DROP ${DROP_KEYWORD[type]} IF EXISTS "${name}"`,
    ], { quiet: true });
    return true;
  } catch {
    return false;
  }
}

function dropAllStagingObjects() {
  let remaining = listStagingObjects();
  console.log(`Dropping ${remaining.length} object(s) from ${DB} (staging)…`);
  // Retry as FK references collapse: dropping a parent can unblock a child.
  let lastSize = -1;
  while (remaining.length > 0 && remaining.length !== lastSize) {
    lastSize = remaining.length;
    const stillThere = [];
    for (const obj of remaining) {
      if (!dropObject(obj)) stillThere.push(obj);
    }
    remaining = stillThere;
  }
  if (remaining.length > 0) {
    console.error(
      `Stuck — could not drop: ${remaining.map((o) => `${o.type}:${o.name}`).join(", ")} (likely an FK cycle).`,
    );
    process.exit(1);
  }
}

dropAllStagingObjects();

console.log("Applying migrations to staging…");
exec(["d1", "migrations", "apply", DB, ...PREVIEW_FLAGS]);

console.log("Applying schema/seed.sql to staging…");
exec(["d1", "execute", DB, ...PREVIEW_FLAGS, `--file=${resolve(root, "schema", "seed.sql")}`]);

console.log("Staging rebuilt from seed.");
