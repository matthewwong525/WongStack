#!/usr/bin/env node
/**
 * Keep a linked worktree's copies of the live secrets files in step with the
 * primary checkout.
 *
 *     node .claude/skills/ship/scripts/worktree-secrets.mjs seed      # new worktree: copy + baseline
 *     node .claude/skills/ship/scripts/worktree-secrets.mjs status    # what this branch changed
 *     node .claude/skills/ship/scripts/worktree-secrets.mjs promote   # after the merge: apply it
 *
 * A branch writes an add or a rotation to both copies at once, and keeps a
 * deletion or a branch-only value in its own copy until the merge. `promote`
 * then applies to the primary only what this branch changed. It compares three
 * ways against the baseline `seed` recorded, so a key another branch added to
 * the primary is not read as a deletion here. The baseline holds value hashes,
 * never values, in this worktree's own Git directory.
 *
 * Output is JSON of paths and key names. No command prints a value.
 * The convention: wiki/development/secrets.md
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { chmodSync, copyFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

const LIVE_FILE = /^(\.env|\.dev\.vars)(\..+)?$/;
const ENTRY = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=(.*)$/;
const BASE_FILE = "wongstack-secrets-base.json";
const KINDS = ["add", "remove", "change", "conflict", "unresolved"];

const git = (cwd, ...args) =>
  execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

function isIgnored(root, rel) {
  try {
    execFileSync("git", ["check-ignore", "-q", rel], { cwd: root, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function context() {
  const [root, gitDir, commonDir] = git(
    process.cwd(), "rev-parse", "--path-format=absolute", "--show-toplevel", "--absolute-git-dir", "--git-common-dir",
  ).split("\n");
  const primary = dirname(commonDir);
  const linked = gitDir !== commonDir;
  if (linked && git(primary, "rev-parse", "--show-toplevel") !== primary) {
    throw new Error(`the parent of ${commonDir} is not the primary checkout`);
  }
  return { root, gitDir, primary, linked };
}

/** Repo-relative live secrets files at the root and in each immediate subfolder. */
function liveFiles(root) {
  const found = [];
  const scan = (rel) => {
    for (const entry of readdirSync(join(root, rel), { withFileTypes: true })) {
      if (entry.isFile() && LIVE_FILE.test(entry.name) && !entry.name.endsWith(".example")) {
        found.push(rel ? `${rel}/${entry.name}` : entry.name);
      }
    }
  };
  scan("");
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory() && entry.name !== "node_modules" && !entry.name.startsWith(".")) scan(entry.name);
  }
  return found;
}

const hash = (value) => createHash("sha256").update(value).digest("hex");

/** key -> { value, line } for one file, or null when the file does not exist. */
function readEntries(path) {
  if (!existsSync(path)) return null;
  const entries = new Map();
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(ENTRY);
    if (match) entries.set(match[1], { value: match[2].trimEnd(), line });
  }
  return entries;
}

const hashes = (entries) => Object.fromEntries([...(entries ?? [])].map(([key, { value }]) => [key, hash(value)]));

function loadBase(ctx) {
  const path = join(ctx.gitDir, BASE_FILE);
  return existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
}

function saveBase(ctx, base) {
  writeFileSync(join(ctx.gitDir, BASE_FILE), `${JSON.stringify(base, null, 2)}\n`, { mode: 0o600 });
}

/* ── seed ──────────────────────────────────────────────────────────────────── */

function seed(ctx) {
  const base = loadBase(ctx) ?? { files: {} };
  const result = { seeded: [], adopted: [], unseeded: [], skipped: [] };

  for (const rel of liveFiles(ctx.primary)) {
    if (base.files[rel]) continue;
    const source = join(ctx.primary, rel);
    const target = join(ctx.root, rel);
    let outcome;
    if (!existsSync(dirname(target))) {
      result.skipped.push({ path: rel, reason: "folder does not exist in this worktree" });
    } else if (!isIgnored(ctx.root, rel)) {
      result.skipped.push({ path: rel, reason: "not git-ignored in this worktree" });
    } else if (!existsSync(target)) {
      copyFileSync(source, target);
      chmodSync(target, 0o600);
      outcome = "seeded";
    } else if (readFileSync(source, "utf8") === readFileSync(target, "utf8")) {
      outcome = "adopted";
    } else {
      result.unseeded.push(rel);
    }
    if (outcome) {
      base.files[rel] = hashes(readEntries(source));
      result[outcome].push(rel);
    }
  }
  saveBase(ctx, base);
  return result;
}

/* ── status ────────────────────────────────────────────────────────────────── */

/**
 * Classify one key from the worktree (hw), primary (hp), and baseline (hb)
 * hashes. `undefined` means the key is absent there.
 */
function classify(hw, hp, hb, seeded) {
  if (hw === hp) return null;
  if (!seeded) return hw !== undefined && hp === undefined ? "add" : "unresolved";
  if (hp === hb) {
    if (hw === undefined) return "remove";
    return hp === undefined ? "add" : "change";
  }
  if (hw === hb) return null; // only the primary moved: keep it
  return "conflict";
}

/** A file is seeded when `seed` recorded a baseline for it; any other file is report-only. */
function diffFile(ctx, base, rel) {
  const mine = readEntries(join(ctx.root, rel));
  const hw = hashes(mine);
  const hp = hashes(readEntries(join(ctx.primary, rel)));
  const baseline = base?.files[rel];
  const diff = { path: rel, ...Object.fromEntries(KINDS.map((kind) => [kind, []])) };
  for (const key of [...new Set([...Object.keys(hw), ...Object.keys(hp)])].sort()) {
    const kind = classify(hw[key], hp[key], baseline?.[key], Boolean(baseline));
    if (kind) diff[kind].push(key);
  }
  return { diff, mine };
}

function allFiles(ctx, base) {
  return [...new Set([...liveFiles(ctx.root), ...liveFiles(ctx.primary), ...Object.keys(base?.files ?? {})])].sort();
}

const hasChanges = (diff) => KINDS.some((kind) => diff[kind].length);

function status(ctx) {
  const base = loadBase(ctx);
  const files = allFiles(ctx, base)
    .map((rel) => diffFile(ctx, base, rel).diff)
    .filter(hasChanges);
  return { seeded: Object.keys(base?.files ?? {}).sort(), files };
}

/* ── promote ───────────────────────────────────────────────────────────────── */

/** Remove, replace, or append only the named lines; keep every other line. */
function applyLines(text, diff, mine) {
  const drop = new Set(diff.remove);
  const replace = new Set(diff.change);
  const lines = [];
  for (const line of text.split("\n")) {
    const key = line.match(ENTRY)?.[1];
    if (key && drop.has(key)) continue;
    lines.push(key && replace.has(key) ? mine.get(key).line : line);
  }
  if (diff.add.length) {
    if (lines.length && lines[lines.length - 1] === "") lines.pop();
    lines.push(...diff.add.map((key) => mine.get(key).line), "");
  }
  return lines.join("\n");
}

function promote(ctx) {
  const base = loadBase(ctx);
  const result = { promoted: [], skipped: [], unresolved: [] };

  for (const rel of allFiles(ctx, base)) {
    const { diff, mine } = diffFile(ctx, base, rel);
    const keys = [...diff.add, ...diff.remove, ...diff.change];
    if (diff.conflict.length) result.skipped.push({ path: rel, keys: diff.conflict, reason: "both sides changed" });
    if (diff.unresolved.length) result.unresolved.push({ path: rel, keys: diff.unresolved });
    if (!keys.length) continue;

    const target = join(ctx.primary, rel);
    if (!existsSync(dirname(target)) || !isIgnored(ctx.primary, rel)) {
      result.skipped.push({ path: rel, keys, reason: "not git-ignored in the primary checkout" });
      continue;
    }
    const text = existsSync(target) ? readFileSync(target, "utf8") : "";
    writeFileSync(target, applyLines(text, diff, mine), { mode: 0o600 });
    result.promoted.push({ path: rel, keys });

    const baseline = base?.files[rel];
    if (baseline) {
      for (const key of diff.remove) delete baseline[key];
      for (const key of [...diff.add, ...diff.change]) baseline[key] = hash(mine.get(key).value);
    }
  }
  if (base) saveBase(ctx, base);
  return result;
}

/* ── main ──────────────────────────────────────────────────────────────────── */

const COMMANDS = { seed, status, promote };
const command = COMMANDS[process.argv[2]];
if (!command) {
  console.error("usage: worktree-secrets.mjs seed|status|promote");
  process.exit(2);
}

let ctx;
try {
  ctx = context();
} catch (error) {
  console.error(`worktree-secrets: ${error.stderr ? "not inside a Git checkout" : error.message}`);
  process.exit(1);
}

const output = ctx.linked ? command(ctx) : { primary: true, message: "primary checkout; nothing to do" };
console.log(JSON.stringify(output, null, 2));
