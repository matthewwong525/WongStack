// Locate and read the repo's wrangler config, at the repo root or in a subfolder such as `app/`.
// Every pack script reads it through this one parser; bash calls the CLI below via `lib-wrangler-config.sh`.

import { copyFileSync, existsSync, lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join, normalize, relative, resolve, sep } from "node:path";
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

// Find the wrangler config: repo root first, then each immediate subdirectory.
// Returns `null` when the repo has none, the pack's state before provisioning.
export function findWranglerConfigOrNull() {
  const atRoot = firstConfigIn(repoRoot);
  if (atRoot) return atRoot;

  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
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

// Strip comments and trailing commas so `JSON.parse` accepts JSONC. Scans character by character,
// so a `//` or `,` inside a string literal survives.
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

// The app's D1 entries. Session memory's `MEMORY_DB` is left out: the memory skill migrates it, never CI.
const appDatabases = (config, env) =>
  (block(config, env)?.d1_databases ?? []).filter((entry) => entry.binding !== "MEMORY_DB");

/** Whether production (no `env`) or the environment binds an app D1 database. */
export function hasD1(config, env) {
  return appDatabases(config, env).length > 0;
}

// The first app D1 `database_name`. An environment inherits no binding, so `env.staging` declares its own.
export function databaseName(config, env) {
  const name = appDatabases(config, env)[0]?.database_name;
  if (name) return name;
  throw new WranglerConfigError(
    env
      ? `Could not read \`database_name\` for the \`${env}\` environment — it needs its own d1_databases entry.`
      : "Could not read `database_name` from the top level of the wrangler config.",
  );
}

// The staging database's name, or `null` when no app D1 is bound. Throws when staging binds none while
// production does, or names production's database by name or id: staging writes would land on live data.
export function stagingDatabase(config) {
  const [prod] = appDatabases(config);
  if (!prod && !hasD1(config, "staging")) return null;
  const name = databaseName(config, "staging");
  if (!prod) return name;
  const staging = appDatabases(config, "staging")[0];
  const sameId = Boolean(staging.database_id && staging.database_id === prod.database_id);
  if (name === prod.database_name || sameId) {
    throw new WranglerConfigError(
      `env.staging binds the production database '${prod.database_name}' (same ${sameId ? "database_id" : "database_name"}), ` +
        "so a staging step would write real data. Give env.staging its own d1_databases entry, " +
        "with its own database_name and database_id.",
    );
  }
  return name;
}

// The Worker name wrangler will deploy. Production always reads the source config; an environment reads
// `.wrangler/deploy/config.json` when a @cloudflare/vite-plugin build left one, as wrangler does.
export function deployedWorkerName(configPath, env) {
  const config = parseConfig(configPath);
  if (!env) return workerName(config);

  const generated = redirectedConfig(configPath);
  return generated ? workerName(parseConfig(generated)) : workerName(config, env);
}

/** The generated config a plugin build redirected wrangler at, or `null`. */
export function redirectedConfig(configPath) {
  const redirectDir = resolve(dirname(configPath), ".wrangler/deploy");
  const redirect = resolve(redirectDir, "config.json");
  if (!existsSync(redirect)) return null;
  const target = parseConfig(redirect).configPath;
  const generated = target && resolve(redirectDir, target);
  return generated && existsSync(generated) ? generated : null;
}

// The folder wrangler uploads as static assets after a build, relative to the config that names it:
// a plugin build's generated config, else the source config.
export function assetsDirectory(configPath) {
  const from = redirectedConfig(configPath) ?? configPath;
  const directory = parseConfig(from).assets?.directory;
  if (!directory) throw new WranglerConfigError("The built wrangler config names no `assets.directory` — build the app first.");
  return resolve(dirname(from), directory);
}

// The routes a Worker attaches: an environment inherits the top-level `route`/`routes` when it names none.
export function routesOf(config, env) {
  const own = (entry) => entry?.routes ?? (entry?.route ? [entry.route] : undefined);
  return own(block(config, env)) ?? (env ? own(config) : undefined) ?? [];
}

// Where `cf-deploy.sh --take-build` keeps the default branch's own config, before a build is copied over it.
const TRUSTED_CONFIG = ".wong/trusted-wrangler.jsonc";

const inside = (root, path) => {
  const rel = relative(root, path);
  return rel !== ".." && !rel.startsWith(`..${sep}`) && !isAbsolute(rel);
};

// Keys whose strings are not files wrangler reads: the Worker's own settings, and where a build ran.
const NOT_PATHS = new Set(["vars", "configPath", "userConfigPath", "run_worker_first"]);

/** The first string under `value` that names a file outside `root`, or null. */
function strayPath(value, base, root) {
  if (typeof value === "string") {
    return value.startsWith("~") || isAbsolute(value) || !inside(root, resolve(base, value)) ? value : null;
  }
  if (!value || typeof value !== "object") return null;
  for (const [key, inner] of Object.entries(value)) {
    const found = NOT_PATHS.has(key) ? null : strayPath(inner, base, root);
    if (found) return found;
  }
  return null;
}

const sameDatabase = (entry, prod) =>
  Boolean((entry.database_name && entry.database_name === prod.database_name) || (entry.database_id && entry.database_id === prod.database_id));

const sameEntry = (entry, want) => entry.database_name === want.database_name && entry.database_id === want.database_id;
const databasesOf = (entries) => entries.map((entry) => `'${entry.database_name}' (${entry.database_id})`).join(", ");

// Why a preview's databases are not the default branch's own staging ones, or null. Every D1 entry, memory's
// included, must be one of main's `env.staging` entries by name and id: never production's, never a branch's pick.
function stagingDatabaseProblem(trusted, built, source) {
  const bound = [...(built.d1_databases ?? []), ...(source.env?.staging?.d1_databases ?? [])];
  const taken = bound.find((entry) => (trusted.d1_databases ?? []).some((prod) => sameDatabase(entry, prod)));
  if (taken) return `it binds the production database '${taken.database_name ?? taken.database_id}'.`;
  stagingDatabase(source);
  const allowed = trusted.env?.staging?.d1_databases ?? [];
  const other = bound.find((entry) => !allowed.some((want) => sameEntry(entry, want)));
  if (!other) return null;
  const named = other.database_name ?? other.database_id;
  return allowed.length
    ? `it binds the database '${named}', not ${databasesOf(allowed)}, the default branch's staging database.`
    : `it binds the database '${named}', and the default branch's staging Worker binds none; a new database previews once published.`;
}

// Why a production build's databases or routes are not main's own top-level ones, or null. Wrangler deploys the
// generated config, not main's, so a build that adds a database or a web address must not reach the live Worker.
function productionBindingProblem(trusted, built) {
  const key = (entries) => JSON.stringify((entries ?? []).map((entry) => [entry.database_name, entry.database_id]).sort());
  if (key(built.d1_databases) !== key(trusted.d1_databases)) {
    return `it binds ${databasesOf(built.d1_databases ?? []) || "no database"}, not ${databasesOf(trusted.d1_databases ?? []) || "none"}, the default branch's own databases.`;
  }
  if (JSON.stringify(routesOf(built)) !== JSON.stringify(routesOf(trusted))) {
    return "its routes or custom domains differ from the default branch's own.";
  }
  return null;
}

// Why a copied build must not deploy, or null; `trusted` is main's config. Production is branch code until built, and
// wrangler deploys its generated config: it gets a preview's refusals, its name, databases and routes held to main's.
function buildProblem(trusted, configPath, root, production) {
  const appDir = dirname(configPath);
  const source = parseConfig(configPath);
  const generatedPath = redirectedConfig(configPath);
  if (!generatedPath || !inside(appDir, generatedPath)) {
    return "it left no generated config inside the app folder (.wrangler/deploy/config.json), so it is not a finished build.";
  }
  if (parseConfig(resolve(appDir, ".wrangler/deploy/config.json")).auxiliaryWorkers?.length) {
    return "it deploys extra Workers (auxiliaryWorkers); a deploy sends the app's own Worker alone.";
  }
  const built = parseConfig(generatedPath);
  const want = production ? workerName(trusted) : workerName(trusted, "staging");
  if (workerName(built) !== want) {
    return `it names the Worker '${built.name}', not '${want}', the ${production ? "production Worker" : "default branch's staging Worker"}.`;
  }
  if (!production && (built.route || built.routes?.length)) return "it claims a route or custom domain; a preview gets neither.";
  if ([built, source, source.env?.staging].some((entry) => entry?.build)) {
    return "it carries a `build` command of its own, which wrangler would run with the deploy key.";
  }
  const database = production ? productionBindingProblem(trusted, built) : stagingDatabaseProblem(trusted, built, source);
  if (database) return database;
  const stray = strayPath(built, dirname(generatedPath), root) ?? strayPath(source, appDir, root);
  return stray ? `it names '${stray}', a path outside the project, which wrangler would read and upload.` : null;
}

/** Why a copied build must not deploy, or null; `buildProblem` owns the rules. `trustedPath` is main's config. */
export function untrustedBuildProblem(trustedPath, configPath, { production, root = repoRoot } = {}) {
  return buildProblem(parseConfig(trustedPath), configPath, root, Boolean(production));
}

/** The first symlink on the way from `root` down to `path`, or null. */
function linkOnTheWay(root, path) {
  let at = root;
  for (const part of relative(root, path).split(sep).filter(Boolean)) {
    at = join(at, part);
    if (lstatSync(at, { throwIfNoEntry: false })?.isSymbolicLink()) return at;
  }
  return null;
}

// Copies plain files and folders from `from` to `to`; a link or device is refused, never followed. Returns the count.
export function copyTree(from, to) {
  const stat = lstatSync(from, { throwIfNoEntry: false });
  if (!stat) return 0;
  if (stat.isDirectory()) {
    mkdirSync(to, { recursive: true });
    return readdirSync(from).reduce((count, name) => count + copyTree(join(from, name), join(to, name)), 0);
  }
  if (!stat.isFile()) throw new WranglerConfigError(`${from} is not a plain file or folder; a build copies no links.`);
  mkdirSync(dirname(to), { recursive: true });
  copyFileSync(from, to);
  return 1;
}

// The migration files a build's config names, repo-relative: the top-level `*.sql` of each app database's folder.
function migrationFiles(from, app, config) {
  const entries = [...appDatabases(config), ...appDatabases(config, "staging")];
  const files = new Set();
  for (const dir of new Set(entries.map((entry) => normalize(join(app, entry.migrations_dir ?? "migrations"))))) {
    const parts = dir.split(sep);
    if (isAbsolute(dir) || parts.some((part) => part === ".." || part.startsWith(".") || part === "node_modules")) {
      throw new WranglerConfigError(`migrations_dir '${dir}' leaves the project or names a hidden or package folder.`);
    }
    const listed = lstatSync(join(from, dir), { throwIfNoEntry: false })?.isDirectory() ? readdirSync(join(from, dir), { withFileTypes: true }) : [];
    for (const entry of listed) if (entry.isFile() && entry.name.endsWith(".sql")) files.add(join(dir, entry.name));
  }
  return [...files];
}

// Copies a built app from `from` to `to`: built files and redirect, plus, unless `builtOnly`, config and migrations.
// Never a script, package file, `.npmrc` or tool, which would run with the deploy key.
export function copyBuild(configPath, from, to, { builtOnly = false } = {}) {
  const app = relative(repoRoot, dirname(configPath));
  const config = join(app, basename(configPath));
  const refuse = (path) => {
    const link = linkOnTheWay(from, join(from, path));
    if (link) throw new WranglerConfigError(`${link} is a link; a build copies no links.`);
  };
  const built = [join(app, "dist"), join(app, ".wrangler/deploy/config.json")];
  let paths = built;
  if (!builtOnly) {
    refuse(config);
    if (!lstatSync(join(from, config), { throwIfNoEntry: false })?.isFile()) throw new WranglerConfigError(`the build has no ${config}.`);
    paths = [config, ...built, ...migrationFiles(from, app, parseConfig(join(from, config)))];
  }
  let count = 0;
  for (const path of paths) {
    refuse(path);
    count += copyTree(join(from, path), join(to, path));
  }
  return `copied ${count} built files`;
}

// Keeps main's config aside, once: a second take would keep the build's. Production keeps main's config and
// migrations, so its deploy migrates main's SQL; a preview takes the branch's, checked against main's.
export function takeBuild(configPath, from, mode) {
  if (!["production", "staging"].includes(mode)) throw new WranglerConfigError("take-build takes production or staging.");
  const kept = resolve(repoRoot, TRUSTED_CONFIG);
  if (existsSync(kept)) throw new WranglerConfigError(`${TRUSTED_CONFIG} already exists: this checkout already took a build.`);
  mkdirSync(dirname(kept), { recursive: true });
  writeFileSync(kept, readFileSync(configPath));
  return copyBuild(configPath, from, repoRoot, { builtOnly: mode === "production" });
}

// The staging database `cf-build.sh --migrate` targets: the default branch's own when this checkout took a build,
// else this config's. Empty when none is bound.
function migrateDatabase(configPath) {
  const kept = resolve(repoRoot, TRUSTED_CONFIG);
  return stagingDatabase(parseConfig(existsSync(kept) ? kept : configPath)) ?? "";
}

/** Refuses a taken build `untrustedBuildProblem` names; a checkout that took none has nothing to check. */
function refuseUntrustedBuild(configPath, mode) {
  if (!["production", "staging"].includes(mode)) throw new WranglerConfigError("refuse-untrusted-build takes production or staging.");
  const kept = resolve(repoRoot, TRUSTED_CONFIG);
  if (!existsSync(kept)) return "no build was taken; nothing to check";
  const problem = untrustedBuildProblem(kept, configPath, { production: mode === "production" });
  if (problem) throw new WranglerConfigError(`this build can not deploy: ${problem}`);
  return `the build stays on the ${mode} Worker`;
}

// CLI for `lib-wrangler-config.sh`: `config-path` exits 3 when there is no config; every other answer reads
// $WRANGLER_CONFIG, else the config found from the repo root, and exits 1 on a config error.

const config = () => process.env.WRANGLER_CONFIG || findWranglerConfig();
const COMMANDS = {
  "config-path": () => findWranglerConfigOrNull() ?? process.exit(3),
  "worker-name": (env) => deployedWorkerName(config(), env),
  "database-name": (env) => databaseName(parseConfig(config()), env),
  "staging-database": () => stagingDatabase(parseConfig(config())) ?? "",
  "migrate-database": () => migrateDatabase(config()),
  "has-d1": (env) => String(hasD1(parseConfig(config()), env)),
  "assets-dir": () => assetsDirectory(config()),
  routes: (env) => JSON.stringify(routesOf(parseConfig(config()), env)),
  "refuse-untrusted-build": (mode) => refuseUntrustedBuild(config(), mode),
  "take-build": (from, mode) => takeBuild(config(), resolve(from), mode),
  "copy-build": (from, to) => copyBuild(config(), resolve(from), resolve(to)),
  "copy-tree": (from, to) => {
    const count = copyTree(resolve(from), resolve(to));
    if (!count) throw new WranglerConfigError(`${from} holds no files to copy.`);
    return `copied ${count} files`;
  },
};
// Commands that take exactly this many words; every other takes an optional environment.
const ARITY = { "config-path": 0, "migrate-database": 0, "refuse-untrusted-build": 1, "take-build": 2, "copy-build": 2, "copy-tree": 2 };

if (isMain(import.meta.url)) {
  const usage = `usage: node lib-wrangler-config.mjs <${Object.keys(COMMANDS).join("|")}> [env | from [to | mode]]`;
  const [command, ...args] = parseCli({ usage, allowPositionals: true }).positionals;
  const run = COMMANDS[command];
  if (!run || (command in ARITY ? args.length !== ARITY[command] : args.length > 1)) usageError(usage);
  try {
    console.log(run(...args));
  } catch (error) {
    if (!(error instanceof WranglerConfigError)) throw error;
    console.error(`wong: ERROR — ${error.message}`);
    process.exit(1);
  }
}
