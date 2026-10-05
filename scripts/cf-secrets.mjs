#!/usr/bin/env node
/**
 * Load the Worker's runtime secrets into both Workers, and check they agree.
 *
 *     node scripts/cf-secrets.mjs push     # app/.dev.vars -> production + staging
 *     node scripts/cf-secrets.mjs check    # do the two Workers still match?
 *     node scripts/cf-secrets.mjs shared   # which keys does staging share with production?
 *
 * Wire them up as `secrets:push` and `secrets:check` in package.json.
 *
 * ── Why this is a script and not two documented commands ─────────────────────
 * `wrangler secret bulk <file>` would be the whole of `push`. The reason it is
 * wrapped is the file it must never be pointed at.
 *
 *     .env       what CI and these scripts authenticate WITH.
 *                Holds CLOUDFLARE_API_TOKEN — a user-scoped credential that can
 *                widen its own permissions and create account resources — plus
 *                the Access service tokens.
 *     .dev.vars  what the WORKER reads off `env` at runtime.
 *
 * They look interchangeable and are not. Putting `.env` into a Worker's secret
 * store means any log leak or code-execution bug in that Worker escalates to
 * the entire Cloudflare account. A person typing the command by hand, reaching
 * for "the file with the secrets in it", picks the wrong one exactly once. So
 * the refusal below is a check in code rather than a line in the docs.
 *
 * ── What `check` actually compares ───────────────────────────────────────────
 * `.dev.vars` is git-ignored, so it does not exist in CI — which is the one
 * place this needs to run. A check defined as "diff the Workers against
 * .dev.vars" is therefore unrunnable where it matters.
 *
 * So the assertion that FAILS is Worker against Worker: production's secret
 * names against staging's. No file, no value, no local state — and a more
 * direct statement of the property we want, which is parity between the two
 * environments. `.dev.vars.example` (committed, values blank) is consulted when
 * present, but only ever to WARN: it is uncorroborated, and a repo may set a
 * secret out of band for good reasons.
 *
 * Names only. No secret value is printed or logged anywhere in this file —
 * including on error paths — because `check` runs in CI, where its output is
 * retained in build logs. Only `shared` reads values, to compare them.
 *
 * ── What `shared` reports ─────────────────────────────────────────────────────
 * `push` loads staging from `.dev.vars` unless `.dev.vars.staging` exists, so
 * by default staging holds production's keys and an outside service called from
 * staging reaches real people. `shared` compares the two files, on this machine
 * and with no network call, and prints each key name under `own` (staging's
 * value differs) or `shared` (the same value, or no staging file). `/verify`
 * uses a service only when its key is `own`. It reads the files, not the
 * Workers: a deployed secret can not be read back, so a Worker loaded before
 * the files changed may differ until the next `push`.
 *
 * Worker names and ordinary business keys come from config/files. The private
 * Access management name is explicitly production-only. The read-only
 * Cloudflare key is setup-made: refused in every file, and allowed on
 * production alone while staging waits for it. Every repo ships this file
 * byte-for-byte identical.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, relative, resolve } from "node:path";

import {
  findWranglerConfig,
  findWranglerConfigOrNull,
  parseConfig,
  repoRoot,
  WranglerConfigError,
} from "./lib-wrangler-config.mjs";
import { primaryRoot } from "../.claude/skills/memory/scripts/lib/primary-root.mjs";
import { parseCli, usageError } from "./lib-cli.mjs";

const STAGING_ENV = "staging";
// Setup stores the sign-in list key on the production Worker alone; no file here holds it.
const PRIVATE_ACCESS = new Set(["WONG_ACCESS_LOGIN_MANAGEMENT"]);
// Setup stores the read-only Cloudflare key itself, on staging only when Cloudflare takes it; no file here holds it either.
const SETUP_MADE = "WONG_CLOUDFLARE_READ";

/** The file the Worker's runtime secrets are declared in. */
const SOURCE = ".dev.vars";
/** Committed, values blank — the reviewable list of expected key names. */
const EXAMPLE = ".dev.vars.example";

/**
 * Never load these into a Worker. `.env` is the account-root credential file;
 * `.env.example` and the example below carry no real values but also no real
 * secrets, so pushing them would quietly blank the Worker's store.
 */
const REFUSED_FILES = new Set([".env", ".env.local", ".env.example", EXAMPLE]);

/**
 * A backstop, not the control. The file boundary above is what actually keeps
 * account credentials out of Workers; a name list fails open on any credential
 * nobody thought to name. This catches the case where someone has pasted one
 * into `.dev.vars` directly.
 */
const SUSPICIOUS_KEY = /^(CLOUDFLARE_|CF_ACCESS_|CF_API|SKIP_AUTH$|WONG_ENVIRONMENT$)/;

/**
 * Bindings that must be twinned in `env.staging`. Durable Objects are absent
 * deliberately: DO storage is per-Worker, so a separate Worker is already
 * isolated and there is nothing to redeclare.
 */
const BINDING_KEYS = [
  "d1_databases",
  "kv_namespaces",
  "r2_buckets",
  "queues",
  "vectorize",
  "hyperdrive",
  "analytics_engine_datasets",
  "services",
  "mtls_certificates",
  "dispatch_namespaces",
  "send_email",
  "vars",
];

let warnings = 0;

function warn(message) {
  warnings += 1;
  console.warn(`cf-secrets: WARNING — ${message}`);
}

function fail(message) {
  console.error(`cf-secrets: ERROR — ${message}`);
  process.exit(1);
}

/* ── config ────────────────────────────────────────────────────────────────── */

/**
 * The parsed wrangler config, or null with a warning when the shared parser
 * refuses it (TOML, bad JSONC). An unreadable config skips the binding
 * comparison rather than failing the gate.
 */
function readConfigOrNull(configPath) {
  try {
    return parseConfig(configPath);
  } catch (error) {
    if (!(error instanceof WranglerConfigError)) throw error;
    warn(`${error.message} (skipping the binding comparison)`);
    return null;
  }
}

/* ── dotenv ────────────────────────────────────────────────────────────────── */

/**
 * The KEY names declared in a dotenv file. Values are deliberately discarded at
 * the parse boundary — nothing downstream can print what was never returned.
 */
function readKeyNames(file) {
  const names = [];
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=/);
    if (match) names.push(match[1]);
  }
  return names;
}

/**
 * Each KEY with a digest of its value, for `shared` to compare. The value
 * itself never leaves this function. One pair of matching quotes is dropped,
 * so `"x"` in one file and `x` in the other still count as the same key.
 */
function readKeyDigests(file) {
  const digests = new Map();
  for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
    const match = rawLine.trim().match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/);
    if (!match || rawLine.trim().startsWith("#")) continue;
    const value = match[2].trim().replace(/^(["'])(.*)\1$/, "$2");
    digests.set(match[1], createHash("sha256").update(value).digest("hex"));
  }
  return digests;
}

/* ── wrangler ──────────────────────────────────────────────────────────────── */

function wrangler(args, { cwd, capture = false }) {
  return execFileSync("npx", ["wrangler", ...args], {
    cwd,
    encoding: "utf8",
    stdio: capture ? ["ignore", "pipe", "pipe"] : "inherit",
  });
}

/**
 * The secret NAMES held by one environment, or null if they can't be read.
 *
 * `--format json` is the documented default on current wrangler, but the pack
 * pins no wrangler version, so an older CLI that rejects the flag gets a second
 * attempt without it. Either way the output is parsed defensively: returning
 * null (reported as "could not read") is correct, where returning an empty list
 * would assert a parity that was never actually observed.
 */
function readSecretNames(appDir, env) {
  const base = ["secret", "list", ...(env ? ["--env", env] : [])];
  for (const args of [[...base, "--format", "json"], base]) {
    let raw;
    try {
      raw = wrangler(args, { cwd: appDir, capture: true });
    } catch {
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map((entry) => entry?.name ?? entry).filter(Boolean).sort();
      }
    } catch {
      // Fall through to the next attempt.
    }
  }
  return null;
}

/* ── push ──────────────────────────────────────────────────────────────────── */

function guardSourceFile(file) {
  // Resolve symlinks before judging the name: `.dev.vars -> .env` is the way a
  // repo talks itself into "one file for everything" and would otherwise walk
  // straight past a check on the literal path.
  let real = file;
  try {
    real = realpathSync(file);
  } catch {
    // Unreadable is handled by the caller; judge the literal name.
  }

  if (REFUSED_FILES.has(basename(file)) || REFUSED_FILES.has(basename(real))) {
    console.error(
      `cf-secrets: ERROR — refusing to load '${basename(file)}' into a Worker.`,
    );
    console.error("cf-secrets:");
    console.error(
      "cf-secrets:   .env       credentials CI and these scripts authenticate WITH",
    );
    console.error(
      "cf-secrets:              (CLOUDFLARE_API_TOKEN can widen its own permissions",
    );
    console.error(
      "cf-secrets:              and create account resources — it must never sit in",
    );
    console.error("cf-secrets:              a Worker's runtime environment)");
    console.error(
      `cf-secrets:   ${SOURCE}  the secrets the Worker itself reads — push this one`,
    );
    console.error("cf-secrets:");
    console.error(`cf-secrets: Put the Worker's secrets in ${SOURCE} and re-run.`);
    process.exit(1);
  }
}

/**
 * The folder to read `.dev.vars` from. A linked worktree that has no copy of
 * its own reads the primary checkout's, at the same repo-relative folder — the
 * secrets convention keeps real values there. A local copy always wins.
 */
function secretsDir(appDir) {
  if (existsSync(resolve(appDir, SOURCE))) return appDir;
  let primary;
  try {
    ({ primary } = primaryRoot(appDir));
  } catch {
    return appDir;
  }
  const primaryDir = resolve(primary, relative(repoRoot, appDir));
  if (primaryDir === appDir || !existsSync(resolve(primaryDir, SOURCE))) return appDir;
  console.log(
    `cf-secrets: no ${SOURCE} in this worktree — reading the primary checkout's ${resolve(primaryDir, SOURCE)}`,
  );
  return primaryDir;
}

function push(appDir, override) {
  // An explicit file is allowed — and is exactly the path someone reaches for
  // when they want "the file with the secrets in it". That is why the guard
  // below exists and why it runs before anything is read or sent.
  let dir = appDir;
  let source;
  if (override) {
    source = resolve(process.cwd(), override);
  } else {
    dir = secretsDir(appDir);
    source = resolve(dir, SOURCE);
  }
  if (!existsSync(source)) {
    fail(
      override
        ? `no such file: ${override}`
        : `no ${relative(repoRoot, source)} next to the wrangler config. Create it — see ${relative(repoRoot, resolve(appDir, EXAMPLE))} for the keys this Worker expects.`,
    );
  }
  guardSourceFile(source);

  // Production, then staging. Staging falls back to the same file, which makes
  // identical values across both Workers the zero-config default; a repo needing
  // divergence adds `.dev.vars.staging` and changes no command.
  const stagingSource = resolve(dir, `${SOURCE}.${STAGING_ENV}`);
  const targets = [
    { env: null, label: "production", file: source },
    {
      env: STAGING_ENV,
      label: STAGING_ENV,
      file: !override && existsSync(stagingSource) ? stagingSource : source,
    },
  ];

  // Validate BOTH files/config before the first provider write; no partial push
  // can leak production login-management authority into a preview.
  const config = parseConfig(findWranglerConfig());
  const stagingBindings = [...bindingsIn(config.env?.[STAGING_ENV]).values()].flat();
  if (stagingBindings.some(name => PRIVATE_ACCESS.has(name))) fail("staging must omit private Access management bindings.");
  for (const target of targets) {
    guardSourceFile(target.file);
    const names = readKeyNames(target.file);
    if (names.length === 0) {
      fail(`${basename(target.file)} declares no keys — refusing to push.`);
    }
    if (target.env === STAGING_ENV && names.some(name => PRIVATE_ACCESS.has(name))) {
      fail("staging secret source must omit private Access management bindings; create a separate .dev.vars.staging before any push.");
    }
    if (names.includes(SETUP_MADE)) {
      fail(`${basename(target.file)} must not declare ${SETUP_MADE}: setup stores it itself. Remove the line and re-run.`);
    }
    // `secret bulk` takes at most 100 per call. Far beyond any realistic repo,
    // but say so rather than letting a truncated load look like a success.
    if (names.length > 100) {
      fail(
        `${basename(target.file)} declares ${names.length} keys; \`wrangler secret bulk\` accepts at most 100 per call.`,
      );
    }
    // Fatal, not a warning. The file boundary is the primary control, but if a
    // Cloudflare account credential has been pasted into `.dev.vars` directly,
    // warning and then pushing anyway produces exactly the outcome this script
    // exists to prevent — the credential lands in the Worker either way.
    const suspicious = names.filter((n) => SUSPICIOUS_KEY.test(n));
    if (suspicious.length > 0) {
      const many = suspicious.length > 1;
      console.error(
        `cf-secrets: ERROR — ${basename(target.file)} declares ${suspicious
          .map((n) => `'${n}'`)
          .join(", ")}, which ${many ? "look" : "looks"} like ${
          many ? "Cloudflare account credentials" : "a Cloudflare account credential"
        }.`,
      );
      console.error(
        `cf-secrets: A Worker must not hold ${many ? "them" : "one"} — move ${
          many ? "them" : "it"
        } to .env and re-run.`,
      );
      process.exit(1);
    }

  }
  for (const target of targets) {
    const names = readKeyNames(target.file);
    console.log(
      `cf-secrets: ${target.label} — loading ${names.length} secret(s) from ${basename(target.file)}`,
    );
    wrangler(
      ["secret", "bulk", target.file, ...(target.env ? ["--env", target.env] : [])],
      { cwd: appDir },
    );
  }

  console.log("cf-secrets: both Workers loaded");
}

/* ── check ─────────────────────────────────────────────────────────────────── */

// Session memory binds only the production Worker (MEMORY_DB, MEMORY_BUCKET):
// it has no staging twin by design. wiki/development/memory.md
const PRODUCTION_ONLY = "MEMORY_";

/** Binding names declared under one config block, keyed by binding type. */
function bindingsIn(block) {
  const found = new Map();
  if (!block) return found;

  for (const key of BINDING_KEYS) {
    const value = block[key];
    if (!value) continue;

    let names;
    if (key === "vars") {
      names = Object.keys(value);
    } else if (key === "queues") {
      // A producer has a stable `binding` name that survives twinning, so it
      // compares by name like every other binding. A consumer has only the
      // queue it reads, and the twin rule requires that queue to DIFFER between
      // environments, so consumers compare by count in `checkQueueConsumers`.
      names = (value.producers ?? []).map((p) => `producer:${p.binding ?? p.queue}`);
    } else if (Array.isArray(value)) {
      names = value.map((entry) => entry.binding ?? entry.name).filter(Boolean);
    } else {
      continue;
    }

    if (names.length > 0) found.set(key, names);
  }
  return found;
}

/** Presence of every production binding inside env.staging. Returns failures. */
function checkBindings(config) {
  if (!config) return [];

  const staging = config.env?.[STAGING_ENV];
  if (!staging) {
    // Not a failure. A repo that has not adopted the staging model — or has not
    // reached that step of the adoption runbook — would otherwise get a
    // permanently red check, which is precisely what the pack's CI avoids. The
    // gate exists to catch drift WITHIN the two-Worker model, not to demand it.
    console.log(
      `cf-secrets: no \`env.${STAGING_ENV}\` in the wrangler config — skipping the binding comparison (repo is not on the two-Worker model)`,
    );
    return [];
  }

  const problems = [];
  const production = bindingsIn(config);
  const stagingBindings = bindingsIn(staging);

  for (const [key, names] of production) {
    const present = stagingBindings.get(key) ?? [];
    for (const name of names) {
      if (!present.includes(name) && !name.startsWith(PRODUCTION_ONLY) && !PRIVATE_ACCESS.has(name)) {
        problems.push(
          `\`${key}\` binding '${name}' is declared at the top level but absent from env.${STAGING_ENV} — an environment inherits no binding it does not redeclare, so staging simply does not have it.`,
        );
      }
    }
  }

  for (const names of stagingBindings.values()) {
    for (const name of names) if (PRIVATE_ACCESS.has(name)) problems.push(`staging binding '${name}' contains private Access management authority; remove it.`);
  }
  problems.push(...checkQueueConsumers(config, staging));

  // The quiet one: copied into the environment but never repointed. A shared
  // downstream service is a legitimate if rare choice, so this warns.
  for (const entry of staging.services ?? []) {
    const twin = (config.services ?? []).find((s) => s.binding === entry.binding);
    if (twin && twin.service === entry.service) {
      warn(
        `service binding '${entry.binding}' targets '${entry.service}' in both production and env.${STAGING_ENV} — staging code would call the production service.`,
      );
    }
  }

  return problems;
}

/** Queue consumers: staging needs as many as production, each on its twin. Returns failures. */
function checkQueueConsumers(config, staging) {
  const production = config.queues?.consumers ?? [];
  const stagingConsumers = staging.queues?.consumers ?? [];
  const problems = [];

  // A missing consumer is how staging messages end up on the production Worker.
  if (stagingConsumers.length < production.length) {
    problems.push(
      `env.${STAGING_ENV} declares ${stagingConsumers.length} queue consumer(s) but production declares ${production.length} — an environment inherits no binding it does not redeclare, so a message produced on staging would be handled by the production Worker.`,
    );
  }

  const productionQueues = new Set(production.map((c) => c.queue));
  for (const entry of stagingConsumers) {
    if (productionQueues.has(entry.queue)) {
      warn(
        `queue consumer in env.${STAGING_ENV} reads '${entry.queue}', which production also consumes — the binding was copied into the environment but never repointed at its twin.`,
      );
    }
  }

  return problems;
}

/** Worker-against-Worker secret name parity. Returns failures. */
function checkSecrets(appDir) {
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    console.log(
      "cf-secrets: no CLOUDFLARE_API_TOKEN — skipping the secret comparison (repo not provisioned yet)",
    );
    return [];
  }

  const production = readSecretNames(appDir, null);
  const staging = readSecretNames(appDir, STAGING_ENV);
  if (!production || !staging) {
    warn(
      "could not read secret names from wrangler — skipping the secret comparison rather than reporting a parity that was not observed.",
    );
    return [];
  }

  const problems = [];
  for (const name of new Set([...production, ...staging])) {
    if (name === 'SKIP_AUTH' || name === 'WONG_ENVIRONMENT') problems.push(`secret '${name}' overrides deployed authentication configuration; remove it before deploying.`);
  }
  for (const name of production) {
    if (staging.includes(name) || PRIVATE_ACCESS.has(name)) continue;
    // Cloudflare stores no secret on staging while a newer preview is uploaded, so setup may leave this one waiting.
    if (name === SETUP_MADE) console.log(`cf-secrets: '${name}' is on production only — the preview is waiting for it`);
    else problems.push(`secret '${name}' is set on production but missing from ${STAGING_ENV}.`);
  }
  for (const name of staging) {
    if (PRIVATE_ACCESS.has(name)) problems.push(`secret '${name}' must never be set on staging; remove it.`);
    if (!production.includes(name)) {
      problems.push(`secret '${name}' is set on ${STAGING_ENV} but missing from production.`);
    }
  }

  // The declared list warns only — it is uncorroborated, and this is also the
  // one case Worker-against-Worker parity cannot see: a key missing from both.
  const example = resolve(appDir, EXAMPLE);
  if (existsSync(example)) {
    const declared = readKeyNames(example);
    const held = new Set([...production, ...staging]);
    for (const name of declared) {
      if (!held.has(name)) {
        warn(`${EXAMPLE} declares '${name}', which neither Worker holds.`);
      }
    }
    for (const name of held) {
      // Setup stores its two keys itself, so the example file never lists them.
      if (!declared.includes(name) && !PRIVATE_ACCESS.has(name) && name !== SETUP_MADE) {
        warn(`secret '${name}' is set but not declared in ${EXAMPLE}.`);
      }
    }
  }

  if (problems.length === 0) {
    console.log(
      `cf-secrets: secret names match across both Workers (${production.length} secret(s))`,
    );
  }
  return problems;
}

function check(appDir, configPath) {
  // The binding half needs no credential, so it runs even on an unprovisioned
  // repo — that much signal is available before provisioning.
  const problems = [
    ...checkBindings(readConfigOrNull(configPath)),
    ...checkSecrets(appDir),
  ];

  if (problems.length > 0) {
    console.error("");
    console.error(
      `cf-secrets: ERROR — production and ${STAGING_ENV} have drifted:`,
    );
    for (const problem of problems) console.error(`cf-secrets:   • ${problem}`);
    console.error("cf-secrets:");
    const source = relative(repoRoot, resolve(secretsDir(appDir), SOURCE));
    console.error(
      `cf-secrets: Run \`npm run secrets:push\` to load both Workers from ${source},`,
    );
    console.error(
      `cf-secrets: or redeclare the missing binding inside env.${STAGING_ENV}.`,
    );
    process.exit(1);
  }

  console.log(
    warnings > 0
      ? `cf-secrets: no drift (${warnings} warning(s))`
      : "cf-secrets: no drift",
  );
}

/* ── shared ────────────────────────────────────────────────────────────────── */

/**
 * Which keys staging holds with its own value, and which with production's.
 * A key the staging file leaves out is in neither list: `push` loads staging
 * from that file alone, so staging does not hold it.
 */
function shared(appDir) {
  const dir = secretsDir(appDir);
  const source = resolve(dir, SOURCE);
  const stagingSource = resolve(dir, `${SOURCE}.${STAGING_ENV}`);
  const lists = { own: [], shared: [] };
  if (!existsSync(source)) {
    console.log(`cf-secrets: no ${relative(repoRoot, source)} on this machine — no key to compare`);
  } else if (!existsSync(stagingSource)) {
    console.log(`cf-secrets: read ${relative(repoRoot, source)}; no ${basename(stagingSource)}, so staging holds production's value for every key`);
    lists.shared = readKeyNames(source);
  } else {
    console.log(`cf-secrets: read ${relative(repoRoot, source)} and ${basename(stagingSource)}`);
    const production = readKeyDigests(source);
    for (const [name, digest] of readKeyDigests(stagingSource)) {
      lists[production.get(name) === digest ? "shared" : "own"].push(name);
    }
    const absent = [...production.keys()].filter((name) => !lists.own.includes(name) && !lists.shared.includes(name));
    if (absent.length > 0) console.log(`cf-secrets: ${basename(stagingSource)} leaves out ${absent.join(", ")} — staging does not hold ${absent.length > 1 ? "them" : "it"}`);
  }
  for (const [label, names] of Object.entries(lists)) console.log(`${label}: ${[...new Set(names)].sort().join(" ")}`);
}

/* ── entry ─────────────────────────────────────────────────────────────────── */

const USAGE = [
  "usage: node scripts/cf-secrets.mjs <push|check|shared> [file]",
  "",
  `  push   load ${SOURCE} into the production and staging Workers`,
  "  check  fail if the two Workers' secrets or bindings disagree",
  "  shared list key names only: `own` when staging has its own value, `shared` when it has production's",
  "",
  `  [file] push only: read a file other than ${SOURCE}. Account-credential`,
  "         files such as .env are refused.",
].join("\n");
const [mode, file, ...extra] = parseCli({ usage: USAGE, allowPositionals: true }).positionals;
if (!["push", "check", "shared"].includes(mode) || extra.length || (file && mode !== "push")) usageError(USAGE);

// `check` resolves the config WITHOUT exiting, because a repo with no config at
// all is the pack's shipping state — before setup's Cloudflare provisioning runs there is
// nothing to check, and the gate's requirement is to skip rather than fail.
// `push` keeps the library's aborting lookup: it has real work to do and cannot
// do it without a config.
const configPath =
  mode === "push" ? findWranglerConfig() : findWranglerConfigOrNull();

if (mode === "shared" && !configPath) {
  console.log("cf-secrets: no wrangler config yet — no key to compare\nown: \nshared: ");
  process.exit(0);
}

if (mode === "check" && !configPath) {
  // The first of the three skip conditions, and the one that occurs earliest in
  // every adoption: no config has been written yet. Joins no-`env.staging` and
  // unparseable-config as a skip, not an abort.
  console.log(
    "cf-secrets: no wrangler config yet — skipping the parity check (run /wong-sync to plan provisioning)",
  );
  process.exit(0);
}

const appDir = dirname(configPath);
console.log(`cf-secrets: ${mode} (config: ${configPath.slice(repoRoot.length + 1)})`);

if (mode === "push") push(appDir, file);
else if (mode === "shared") shared(appDir);
else check(appDir, configPath);
