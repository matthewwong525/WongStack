#!/usr/bin/env node
// Resolve every internal link and import in the payload AS A TARGET REPO WOULD SEE IT.
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
import { parseCli } from "./lib-cli.mjs";

parseCli({ usage: "usage: check-payload-links.mjs  (exits 1 when a payload link dangles)" });

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The manifest, read from the one place that stores it. This file used to keep
// its own copy of the list, which made three restatements of one fact — the
// prose, these constants, and whatever an installing agent assembled by hand.
const MANIFEST = JSON.parse(
  readFileSync(join(ROOT, ".claude/skills/wong-sync/references/payload-files.json"), "utf8"),
);

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

// Files a target has that the payload does not supply, but may legitimately link
// to. EVERY ENTRY IS A CLAIM ABOUT `/wong-setup`: it belongs here only when a step
// in that skill demonstrably writes the path — which is why the list is read from
// the manifest's `seededBySetup` rather than kept here as a convenience.
//
// This is where the check went wrong before: it exempted `wiki/development/
// README.md` under the comment "the wiki hubs /wong-setup seeds", when setup
// seeded only the wiki root. The result was a clean run against an install with
// eight dead links — a check reporting its own assumption back to itself.
// `package.json` is gone for the same reason (nothing creates one), and a link to
// a target's own `README.md` was pointing at the wrong file anyway.
const TARGET_PROVIDED = MANIFEST.seededBySetup.files;

/** The files a target receives: every install takes every category. */
function payload() {
  const files = new Set(["CLAUDE.md"]);
  const addCategory = (cat) => {
    if (!cat) return;
    for (const f of cat.files ?? []) files.add(f);
    for (const s of cat.skillDirs ?? []) {
      walk(join(ROOT, ".claude/skills", s)).forEach((f) => files.add(f));
    }
    for (const d of cat.dirs ?? []) {
      walk(join(ROOT, d))
        .filter((f) => !(cat.exclude ?? []).includes(f))
        .forEach((f) => files.add(f));
    }
  };
  for (const category of ["core", "ui", "pack", "scaffold"]) addCategory(MANIFEST[category]);
  return files;
}

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const IMPORT = /(?:^|[ \t])@((?:\.{1,2}\/)[A-Za-z0-9_./-]*[A-Za-z0-9_/-])/gm;

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

    const references = [
      ...[...body.matchAll(LINK)].map((match) => match[1]),
      ...[...body.matchAll(IMPORT)].map((match) => match[1]),
    ];

    for (const target of references) {
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

const dead = checkLinks(payload());
if (dead.length) {
  console.error(`${dead.length} dead link(s): they resolve in no install.`);
  for (const d of dead) console.error(`  ${d.file} -> ${d.target}`);
  console.error("Either add the referenced page to the manifest, or generalize the reference.");
  process.exit(1);
}
console.log("No dead links: every internal link in the payload resolves in a target.");
