#!/usr/bin/env node
/**
 * Load the Worker's runtime secrets into both Workers, and check they agree.
 *
 *     node scripts/cf-secrets.mjs push     # .dev.vars  -> production + staging
 *     node scripts/cf-secrets.mjs check    # do the two Workers still match?
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
 * Names only. No secret value is read, printed, logged, or diffed anywhere in
 * this file — including on error paths — because `check` runs in CI, where its
 * output is retained in build logs.
 *
 * Zero-config: no Worker name, environment id, or secret key is baked in here.
 * Every repo ships this file byte-for-byte identical.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, realpathSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";

// Only the exports that exist in every v8 copy of the library. `/wong-sync`
// never modifies a file the target already has, so a repo that installed the
// pack earlier still has the older library — importing anything newer would
// make this file crash the moment it was copied in. Hence the local JSONC
// parsing further down rather than a library addition.
import { findWranglerConfig, repoRoot } from "./lib-wrangler-config.mjs";

const STAGING_ENV = "staging";

/** The config filenames wrangler accepts, in the order it prefers them. */
const CONFIG_NAMES = ["wrangler.jsonc", "wrangler.json", "wrangler.toml"];

/**
 * The library's `findWranglerConfig()` without the `process.exit(1)`: returns
 * the path, or `null` when the repo has no wrangler config at all. Same search
 * order — repo root first, then each immediate subdirectory (the `app/` layout)
 * — so the two agree on which file they'd pick; they differ only in what
 * happens when there isn't one.
 */
function findWranglerConfigOrNull() {
  const firstIn = (dir) => {
    for (const name of CONFIG_NAMES) {
      const candidate = resolve(dir, name);
      if (existsSync(candidate)) return candidate;
    }
    return null;
  };

  const atRoot = firstIn(repoRoot);
  if (atRoot) return atRoot;

  for (const entry of readdirSync(repoRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const found = firstIn(resolve(repoRoot, entry.name));
    if (found) return found;
  }
  return null;
}

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
const SUSPICIOUS_KEY = /^(CLOUDFLARE_|CF_ACCESS_|CF_API)/;

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
 * Strip `//` and block comments and trailing commas so `JSON.parse` accepts a
 * JSONC file. Scans character by character rather than running a regex over the
 * whole text, so a `//` or `,` inside a string literal survives — a database id
 * or a queue name containing either would otherwise corrupt the parse.
 */
function stripJsonc(text) {
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

/** The parsed wrangler config, or null when it can't be read as an object. */
function parseConfig(configPath) {
  if (configPath.endsWith(".toml")) return null;
  try {
    return JSON.parse(stripJsonc(readFileSync(configPath, "utf8")));
  } catch {
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

function push(appDir, override) {
  // An explicit file is allowed — and is exactly the path someone reaches for
  // when they want "the file with the secrets in it". That is why the guard
  // below exists and why it runs before anything is read or sent.
  const source = override ? resolve(process.cwd(), override) : resolve(appDir, SOURCE);
  if (!existsSync(source)) {
    fail(
      override
        ? `no such file: ${override}`
        : `no ${SOURCE} next to the wrangler config (${appDir}). Create it — see ${EXAMPLE} for the keys this Worker expects.`,
    );
  }
  guardSourceFile(source);

  // Production, then staging. Staging falls back to the same file, which makes
  // identical values across both Workers the zero-config default; a repo needing
  // divergence adds `.dev.vars.staging` and changes no command.
  const stagingSource = resolve(appDir, `${SOURCE}.${STAGING_ENV}`);
  const targets = [
    { env: null, label: "production", file: source },
    {
      env: STAGING_ENV,
      label: STAGING_ENV,
      file: !override && existsSync(stagingSource) ? stagingSource : source,
    },
  ];

  for (const target of targets) {
    guardSourceFile(target.file);
    const names = readKeyNames(target.file);
    if (names.length === 0) {
      fail(`${basename(target.file)} declares no keys — refusing to push.`);
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
      // Producer and consumer are separate halves; a missing consumer is how
      // staging messages end up on the production consumer.
      names = [
        ...(value.producers ?? []).map((p) => `producer:${p.binding ?? p.queue}`),
        ...(value.consumers ?? []).map((c) => `consumer:${c.queue}`),
      ];
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
  if (!config) {
    warn(
      "could not parse the wrangler config as JSON (a .toml config is not read) — skipping the binding comparison.",
    );
    return [];
  }

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
      if (!present.includes(name)) {
        problems.push(
          `\`${key}\` binding '${name}' is declared at the top level but absent from env.${STAGING_ENV} — an environment inherits no binding it does not redeclare, so staging simply does not have it.`,
        );
      }
    }
  }

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
  for (const name of production) {
    if (!staging.includes(name)) {
      problems.push(`secret '${name}' is set on production but missing from ${STAGING_ENV}.`);
    }
  }
  for (const name of staging) {
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
      if (!declared.includes(name)) {
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
    ...checkBindings(parseConfig(configPath)),
    ...checkSecrets(appDir),
  ];

  if (problems.length > 0) {
    console.error("");
    console.error(
      `cf-secrets: ERROR — production and ${STAGING_ENV} have drifted:`,
    );
    for (const problem of problems) console.error(`cf-secrets:   • ${problem}`);
    console.error("cf-secrets:");
    console.error(
      "cf-secrets: Run `npm run secrets:push` to load both Workers from .dev.vars,",
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

/* ── entry ─────────────────────────────────────────────────────────────────── */

const mode = process.argv[2];
if (mode !== "push" && mode !== "check") {
  console.error("Usage: node scripts/cf-secrets.mjs <push|check> [file]");
  console.error("");
  console.error(`  push   load ${SOURCE} into the production and staging Workers`);
  console.error("  check  fail if the two Workers' secrets or bindings disagree");
  console.error("");
  console.error(
    `  [file] push only: read a file other than ${SOURCE}. Account-credential`,
  );
  console.error("         files such as .env are refused.");
  process.exit(1);
}

// `check` resolves the config WITHOUT exiting, because a repo with no config at
// all is the pack's shipping state — before `/wong-cloudflare` runs there is
// nothing to check, and the gate's requirement is to skip rather than fail.
// `push` keeps the library's aborting lookup: it has real work to do and cannot
// do it without a config. The lookup is duplicated here rather than added to
// `lib-wrangler-config.mjs` because copy-if-absent never updates a library a
// repo already has — a script that must work the moment it lands cannot depend
// on a library export newer than itself.
const configPath =
  mode === "check" ? findWranglerConfigOrNull() : findWranglerConfig();

if (mode === "check" && !configPath) {
  // The first of the three skip conditions, and the one that occurs earliest in
  // every adoption: no config has been written yet. Joins no-`env.staging` and
  // unparseable-config as a skip, not an abort.
  console.log(
    "cf-secrets: no wrangler config yet — skipping the parity check (run /wong-cloudflare to configure and provision)",
  );
  process.exit(0);
}

const appDir = dirname(configPath);
console.log(`cf-secrets: ${mode} (config: ${configPath.slice(repoRoot.length + 1)})`);

if (mode === "push") push(appDir, process.argv[3]);
else check(appDir, configPath);
