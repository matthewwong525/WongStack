/**
 * Locate the repo's wrangler config, wherever the app lives.
 *
 * The pipeline scripts sit at `<repo>/scripts/`, but the Worker they drive may
 * live at the repo root (`wrangler.jsonc`) or in a subdirectory (`app/`, the
 * layout the SPA pack ships). Assuming one or the other is what broke these
 * scripts; resolving it at runtime keeps every repo's copy byte-identical.
 *
 * Exported so all three pipeline scripts share one resolution rule.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const CONFIG_NAMES = ["wrangler.jsonc", "wrangler.json", "wrangler.toml"];

/** The repo root — the parent of the `scripts/` directory this file lives in. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function firstConfigIn(dir) {
  for (const name of CONFIG_NAMES) {
    const candidate = resolve(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Find the wrangler config: repo root first, then each immediate subdirectory.
 * Exits with a clear message rather than a raw ENOENT if there isn't one.
 */
export function findWranglerConfig() {
  const atRoot = firstConfigIn(repoRoot);
  if (atRoot) return atRoot;

  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const found = firstConfigIn(resolve(repoRoot, entry.name));
    if (found) return found;
  }

  console.error(
    `Could not find a wrangler config (${CONFIG_NAMES.join(", ")}) at ${repoRoot} ` +
      "or in any immediate subdirectory — aborting.",
  );
  process.exit(1);
}

/**
 * Read `database_name` out of the wrangler config.
 *
 * With an `env` argument, read the name declared *inside* that environment's
 * block — staging binds a twin database, which has its own name — by scanning
 * from the environment's key onwards. The `env.staging` block must therefore
 * declare its own `d1_databases` entry (see the stack-pack config fragments).
 * `cf-build.sh` applies the identical rule in bash; keep the two in step.
 */
export function readDatabaseName(configPath, env) {
  const file = readFileSync(configPath, "utf8");

  let haystack = file;
  if (env) {
    const key = new RegExp(`"${env}"\\s*[:=]`);
    const at = file.search(key);
    if (at === -1) {
      console.error(
        `Could not find the \`${env}\` environment in ${configPath} — aborting.`,
      );
      process.exit(1);
    }
    haystack = file.slice(at);
  }

  const match = haystack.match(/"?database_name"?\s*[:=]\s*"([^"]+)"/);
  if (!match) {
    console.error(
      env
        ? `Could not read \`database_name\` for the \`${env}\` environment in ${configPath} — it needs its own d1_databases entry. Aborting.`
        : `Could not read \`database_name\` from ${configPath} — aborting.`,
    );
    process.exit(1);
  }
  return match[1];
}
