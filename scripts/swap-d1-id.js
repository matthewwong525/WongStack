#!/usr/bin/env node
/**
 * Point `database_id` in `wrangler.jsonc` at the staging (preview) D1 so a
 * `wrangler deploy` on a preview branch binds the staging database.
 *
 * It swaps `database_id` and `preview_database_id` with a regex edit — not a
 * JSONC parse — so the file's comments survive the round-trip. Both ids are
 * read from the file itself: no database id is baked into this script, so
 * every repo ships it byte-for-byte identical.
 *
 * `scripts/cf-build.sh` runs it once per CI build, on a non-production branch,
 * from a fresh clone — the file is always in production state when it runs, so
 * a single swap is correct. It is not a general toggle: run it twice and it
 * swaps back.
 *
 * Usage: node scripts/swap-d1-id.js staging
 */

import { readFileSync, writeFileSync } from "node:fs";

import { findWranglerConfig } from "./lib-wrangler-config.mjs";

const target = process.argv[2];
if (target !== "staging") {
  console.error(`Usage: swap-d1-id.js staging  (got: ${target ?? "<none>"})`);
  process.exit(1);
}

const wranglerPath = findWranglerConfig();
const original = readFileSync(wranglerPath, "utf8");

const dbIdRe = /("database_id"\s*:\s*")([^"]+)(")/;
const previewIdRe = /("preview_database_id"\s*:\s*")([^"]+)(")/;

const dbMatch = original.match(dbIdRe);
const previewMatch = original.match(previewIdRe);

if (!dbMatch) {
  console.error("Could not find `database_id` in wrangler.jsonc — swap aborted.");
  process.exit(1);
}
if (!previewMatch) {
  console.error("Could not find `preview_database_id` in wrangler.jsonc — swap aborted.");
  process.exit(1);
}

const currentDbId = dbMatch[2];
const currentPreviewId = previewMatch[2];

if (currentDbId === currentPreviewId) {
  console.error("`database_id` and `preview_database_id` are identical — nothing to swap.");
  process.exit(1);
}

const swapped = original
  .replace(dbIdRe, `$1${currentPreviewId}$3`)
  .replace(previewIdRe, `$1${currentDbId}$3`);

if (swapped === original) {
  console.error("Regex replace produced no change — wrangler.jsonc layout may have shifted. Aborting.");
  process.exit(1);
}

writeFileSync(wranglerPath, swapped);
console.log(
  `Swapped wrangler.jsonc: database_id now ${currentPreviewId.slice(0, 8)}… (staging).`,
);
