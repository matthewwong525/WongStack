/**
 * Locate and read the repo's wrangler config, wherever the app lives.
 *
 * The pipeline scripts sit at `<repo>/scripts/`, but the Worker they drive may
 * live at the repo root (`wrangler.jsonc`) or in a subdirectory (`app/`, the
 * layout the SPA pack ships). Assuming one or the other is what broke these
 * scripts; resolving it at runtime keeps every repo's copy byte-identical.
 *
 * Every pack script reads the config through this one parser. A regex cannot
 * tell `database_name` from `name`, or a `"staging":` inside a comment from the
 * real key, and a staging deploy that reads production's name is the result.
 * The bash scripts call the CLI entry at the bottom via `lib-wrangler-config.sh`.
 */

import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { isMain, parseCli, usageError } from "./lib-cli.mjs";

/** Searched in this order. TOML is found only so it can be refused by name. */
const CONFIG_NAMES = ["wrangler.jsonc", "wrangler.json", "wrangler.toml"];

/** The repo root — the parent of the `scripts/` directory this file lives in. */
export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

/** A config that is missing, unreadable, or lacks a key a caller needs. */
export class WranglerConfigError extends Error {}

function firstConfigIn(dir) {
  for (const name of CONFIG_NAMES) {
    const candidate = resolve(dir, name);
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * Find the wrangler config: repo root first, then each immediate subdirectory.
 * Returns `null` when the repo has none — the pack's state before provisioning.
 */
export function findWranglerConfigOrNull() {
  const atRoot = firstConfigIn(repoRoot);
  if (atRoot) return atRoot;

  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    // mini-apps/ holds the mini-app Worker's config, never the main app's.
    if (entry.name === "node_modules" || entry.name === "mini-apps" || entry.name.startsWith(".")) continue;
    const found = firstConfigIn(resolve(repoRoot, entry.name));
    if (found) return found;
  }
  return null;
}

/** `findWranglerConfigOrNull`, but exits with a clear message when there is none. */
export function findWranglerConfig() {
  const found = findWranglerConfigOrNull();
  if (found) return found;
  console.error(
    `Could not find a wrangler config (${CONFIG_NAMES.join(", ")}) at ${repoRoot} ` +
      "or in any immediate subdirectory — aborting.",
  );
  process.exit(1);
}

/**
 * Strip `//` and block comments and trailing commas so `JSON.parse` accepts a
 * JSONC file. Scans character by character rather than running a regex over the
 * whole text, so a `//` or `,` inside a string literal survives — a database id
 * or a queue name containing either would otherwise corrupt the parse.
 */
export function stripJsonc(text) {
  let out = "";
  let inString = false;
  let inLine = false;
  let inBlock = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (inLine) {
      if (ch === "\n") {
        inLine = false;
        out += ch;
      }
      continue;
    }
    if (inBlock) {
      if (ch === "*" && next === "/") {
        inBlock = false;
        i += 1;
      }
      continue;
    }
    if (inString) {
      out += ch;
      if (ch === "\\") {
        out += next ?? "";
        i += 1;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      out += ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLine = true;
      i += 1;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlock = true;
      i += 1;
      continue;
    }
    out += ch;
  }

  // Trailing commas: `,` followed by only whitespace before a closer.
  return out.replace(/,(\s*[}\]])/g, "$1");
}

/** The parsed config. Throws on TOML, which the pack never supported, and on bad JSONC. */
export function parseConfig(configPath) {
  if (configPath.endsWith(".toml")) {
    throw new WranglerConfigError(
      `${configPath} is TOML — the pack scripts read wrangler.jsonc or wrangler.json only. Convert the config to wrangler.jsonc.`,
    );
  }
  try {
    return JSON.parse(stripJsonc(readFileSync(configPath, "utf8")));
  } catch (error) {
    throw new WranglerConfigError(`Could not parse ${configPath}: ${error.message}`);
  }
}

/** The top-level (production) block, or `env.<env>`; `undefined` when that env is absent. */
function block(config, env) {
  return env ? config.env?.[env] : config;
}

/** The Worker name. An environment without its own `name` gets wrangler's `<name>-<env>`. */
export function workerName(config, env) {
  if (!config.name) throw new WranglerConfigError("The wrangler config has no top-level `name`.");
  return env ? (block(config, env)?.name ?? `${config.name}-${env}`) : config.name;
}

/**
 * The app's D1 entries. Session memory's `MEMORY_DB` is not one: the memory
 * skill migrates it, so CI must never apply the app's migrations to it.
 */
const appDatabases = (config, env) =>
  (block(config, env)?.d1_databases ?? []).filter((entry) => entry.binding !== "MEMORY_DB");

/** Whether production (no `env`) or the environment binds an app D1 database. */
export function hasD1(config, env) {
  return appDatabases(config, env).length > 0;
}

/**
 * The first app D1 `database_name`. An environment inherits no binding, so the
 * `env.staging` block must declare its own `d1_databases` entry (see the
 * stack-pack config fragments).
 */
export function databaseName(config, env) {
  const name = appDatabases(config, env)[0]?.database_name;
  if (name) return name;
  throw new WranglerConfigError(
    env
      ? `Could not read \`database_name\` for the \`${env}\` environment — it needs its own d1_databases entry.`
      : "Could not read `database_name` from the top level of the wrangler config.",
  );
}

/** `databaseName` read straight from a config file. */
export function readDatabaseName(configPath, env) {
  return databaseName(parseConfig(configPath), env);
}

/**
 * The Worker name wrangler will actually deploy.
 *
 * Production (no `env`) ALWAYS comes from the source config: it is the thing
 * being protected, so its identity must not come from a generated file that may
 * itself be the mistake. For an environment, a @cloudflare/vite-plugin build
 * leaves `.wrangler/deploy/config.json` redirecting wrangler at a flattened
 * config, and from then on that file decides — so read its `name` when it
 * exists. Its `configPath` is relative to the redirect file's own directory.
 *
 * The asymmetry is what makes `cf-deploy.sh`'s equality check meaningful: a
 * staging build that silently produced production's config returns
 * production's name here, and the two match.
 */
export function deployedWorkerName(configPath, env) {
  const config = parseConfig(configPath);
  if (!env) return workerName(config);

  const redirectDir = resolve(dirname(configPath), ".wrangler/deploy");
  const redirect = resolve(redirectDir, "config.json");
  if (existsSync(redirect)) {
    const target = parseConfig(redirect).configPath;
    const generated = target && resolve(redirectDir, target);
    if (generated && existsSync(generated)) return workerName(parseConfig(generated));
  }
  return workerName(config, env);
}

/* ── CLI: `node lib-wrangler-config.mjs <worker-name|database-name|has-d1> [env]` ──
 * Reads the config named by $WRANGLER_CONFIG, else the one found from the repo
 * root. Prints the answer; on a config error prints it and exits 1. */

const COMMANDS = {
  "worker-name": (path, env) => deployedWorkerName(path, env),
  "database-name": (path, env) => readDatabaseName(path, env),
  "has-d1": (path, env) => String(hasD1(parseConfig(path), env)),
};

if (isMain(import.meta.url)) {
  const usage = `usage: node lib-wrangler-config.mjs <${Object.keys(COMMANDS).join("|")}> [env]`;
  const [command, env, ...extra] = parseCli({ usage, allowPositionals: true }).positionals;
  const run = COMMANDS[command];
  if (!run || extra.length) usageError(usage);
  const configPath = process.env.WRANGLER_CONFIG || findWranglerConfig();
  try {
    console.log(run(configPath, env));
  } catch (error) {
    if (!(error instanceof WranglerConfigError)) throw error;
    console.error(`wong: ERROR — ${error.message}`);
    process.exit(1);
  }
}
