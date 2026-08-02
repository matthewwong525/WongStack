#!/usr/bin/env node
// Resolve every internal link in the payload AS A TARGET REPO WOULD SEE IT.
//
// WHY THIS CANNOT BE A PLAIN LINK CHECK IN THIS REPO
//
// Every link in the payload resolves here, because this repo contains the whole
// payload plus everything around it. A page that cites `wiki/development/
// adding-a-skill.md` looks fine in the source and dangles in a target, because
// that page is not in the manifest. So the check has to build the set of files a
// target would actually receive, and resolve links against THAT — not against
// the working tree.
//
// Run it as part of releasing a payload change, next to the VERSION bump and the
// CHANGELOG entry:  node scripts/check-payload-links.mjs
//
// Exits 0 when every internal link resolves, 1 with a list when any dangle.

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The manifest, as paths. Mirrors payload-manifest.md — when that list changes,
// this one changes with it. Kept here rather than parsed out of the prose,
// because a parser that silently matched nothing would report a clean run.
const SKILLS = [
  "explore", "plan", "apply", "save", "continue",
  "ship", "dream", "improve", "wong-sync",
];
const PACK_SKILLS = ["wong-cloudflare", "walk"];

const DOCS = [
  "wiki/wiki-style.md",
  "wiki/voice.md",
  "wiki/contributing.md",
  "wiki/agent-knowledge-center.md",
  "wiki/development/secrets.md",
  "wiki/development/the-change-loop.md",
  "wiki/development/required-tools.md",
  "wiki/ux-principles.md", // UI-bearing repos only
];

const PACK_FILES = [
  "scripts/cf-build.sh", "scripts/cf-deploy.sh", "scripts/reset-staging-d1.mjs",
  "scripts/cf-secrets.mjs", "scripts/lib-wrangler-config.sh", "scripts/lib-wrangler-config.mjs",
  ".github/workflows/deploy.yml", "schema/seed.sql", "schema/migrations/.gitkeep",
  ".dev.vars.example",
];

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    // Never payload, and full of third-party READMEs with their own broken links.
    if (entry === "node_modules" || entry === "dist" || entry === ".wrangler") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(relative(ROOT, full));
  }
  return out;
}

/** The files a target receives, given which optional categories it took. */
// Files a target has that the payload does not supply, but may legitimately link
// to: the repo's own root files, and the wiki hubs `/wong-setup` seeds. A link to
// one of these is not dangling — it resolves in any real repo.
const TARGET_PROVIDED = [
  "README.md", ".gitignore", "package.json",
  "wiki/README.md", "wiki/development/README.md",
];

function payloadFor({ pack, scaffold, ui }) {
  const files = new Set(["notes/README.md", "CLAUDE.md"]);
  for (const s of SKILLS) walk(join(ROOT, ".claude/skills", s)).forEach((f) => files.add(f));
  for (const d of DOCS) {
    if (d.endsWith("ux-principles.md") && !ui) continue;
    files.add(d);
  }
  if (pack) {
    PACK_FILES.forEach((f) => files.add(f));
    for (const s of PACK_SKILLS) walk(join(ROOT, ".claude/skills", s)).forEach((f) => files.add(f));
    walk(join(ROOT, "wiki/stack")).forEach((f) => files.add(f));
  }
  if (scaffold) {
    walk(join(ROOT, "app"))
      .filter((f) => f !== "app/wrangler.jsonc")
      .forEach((f) => files.add(f));
  }
  return files;
}

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

function checkLinks(files) {
  const dangling = [];
  // Link targets = what ships, plus what the target already has. Scanned files =
  // what ships, only. A target's own README is a legitimate destination but its
  // contents are the target's business, not ours to lint.
  const targets = new Set([...files, ...TARGET_PROVIDED]);
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const abs = join(ROOT, file);
    if (!existsSync(abs)) continue;
    let raw = readFileSync(abs, "utf8");
    // CLAUDE.md's unit is the block, not the file — only what sits between the
    // markers travels, so only that is checked. Everything outside belongs to
    // this repo and may reference anything it likes.
    if (file === "CLAUDE.md") {
      const block = raw.match(/WONG-STACK:BEGIN[\s\S]*?WONG-STACK:END/);
      if (!block) continue;
      raw = block[0];
    }
    const body = raw
      // Skip fenced code blocks and inline code — examples in backticks are not
      // links, and flagging them is how a checker cries wolf.
      .replace(/```[\s\S]*?```/g, "")
      .replace(/`[^`\n]*`/g, "");

    for (const [, target] of body.matchAll(LINK)) {
      if (/^(https?:|mailto:|#)/.test(target)) continue;
      const path = target.split("#")[0];
      if (!path) continue;
      const resolved = normalize(join(dirname(file), path));
      // A link into a directory resolves if the directory itself ships.
      const hit =
        targets.has(resolved) ||
        targets.has(resolved.replace(/\/$/, "")) ||
        [...targets].some((f) => f.startsWith(resolved.replace(/\/$/, "") + "/"));
      if (!hit) dangling.push({ file, target, resolved });
    }
  }
  return dangling;
}

const SHAPES = [
  { name: "plain repo (no pack, no scaffold, no UI)", pack: false, scaffold: false, ui: false },
  { name: "UI repo, no pack", pack: false, scaffold: false, ui: true },
  { name: "pack, own app", pack: true, scaffold: false, ui: true },
  { name: "pack + app scaffold", pack: true, scaffold: true, ui: true },
];

// The fullest install — everything opted in. A link that dangles even here
// points at something no repo ever receives, and is dead in every target.
const EVERYTHING = payloadFor({ pack: true, scaffold: true, ui: true });

let dead = 0;
const conditional = new Map();

for (const shape of SHAPES) {
  const dangling = checkLinks(payloadFor(shape));
  // Split the two failure kinds. A link that resolves in the fullest install but
  // not in this shape is CONDITIONAL — it points into an opt-in category this
  // repo declined. That is a boundary question about how the payload references
  // gated content, not a broken link, so it is reported and does not fail.
  const hard = dangling.filter((d) => !EVERYTHING.has(d.resolved));
  for (const d of dangling) {
    if (EVERYTHING.has(d.resolved)) {
      const key = `${d.file} -> ${d.target}`;
      conditional.set(key, (conditional.get(key) ?? 0) + 1);
    }
  }
  if (hard.length === 0) {
    console.log(`  ok      ${shape.name}`);
  } else {
    dead += hard.length;
    console.log(`  FAIL    ${shape.name} — ${hard.length} dead`);
    for (const d of hard) console.log(`            ${d.file} -> ${d.target}`);
  }
}

if (conditional.size) {
  console.log(`\n${conditional.size} conditional link(s) — resolve only where the`);
  console.log("target took the opt-in category they point into:");
  for (const key of [...conditional.keys()].sort()) console.log(`  ~ ${key}`);
}

if (dead) {
  console.error(`\n${dead} dead link(s): they resolve in NO install shape.`);
  console.error("Either add the referenced page to the manifest, or generalize the reference.");
  process.exit(1);
}
console.log("\nNo dead links: every internal link resolves wherever its category ships.");
