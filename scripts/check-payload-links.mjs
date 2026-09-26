#!/usr/bin/env node
// Two link checks, one run:
//
// 1. Resolve every internal link and import in the payload AS A TARGET REPO WOULD SEE IT.
// 2. Reject every live Markdown link that passes through a symlink, because
//    GitHub's web view and raw host do not follow a directory link.
//
// WHY CHECK 1 CANNOT BE A PLAIN LINK CHECK IN THIS REPO
//
// Every link in the payload resolves here, because this repo contains the whole
// payload plus everything around it. A page that cites `wiki/development/
// adding-a-skill.md` looks fine in the source and dangles in a target, because
// that page is not in the manifest. So the check has to build the set of files a
// target would actually receive, and resolve links against THAT — not against
// the working tree. The manifest uses logical `.claude/` paths; a target stores
// them in a real `.agents/` folder, so a link to `.agents/...` resolves against
// the same inventory.
//
// WHY CHECK 2 NEEDS THE GIT TREE
//
// `.claude` and `.codex` link to `.agents`, and `CLAUDE.md` links to `AGENTS.md`.
// On disk every path through them works, so a file-system check passes. On
// github.com, `blob/main/.claude/...` is a 404. The check reads each symlink from
// `git ls-tree -r HEAD`, the index, and the working tree (so it works before a
// commit, and on a Windows checkout that wrote the links as text files), and
// names the real path to use. Code spans and fenced code are not links: shell
// commands keep `.claude/`, which Claude Code resolves in every install.
//
// Run it as part of releasing a payload change, next to the VERSION bump and the
// CHANGELOG entry:  node scripts/check-payload-links.mjs
//
// Exits 0 when every link passes, 1 with a list when any link dangles or passes
// through a symlink.

import { execFileSync } from "node:child_process";
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, statSync } from "node:fs";
import { dirname, join, posix, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCli } from "./lib-cli.mjs";

const { values } = parseCli({
  usage:
    "usage: check-payload-links.mjs [--root <dir>]  (exits 1 when a payload link dangles or a link passes through a symlink)",
  options: { root: { type: "string" } },
});

const ROOT = values.root ? resolve(values.root) : resolve(dirname(fileURLToPath(import.meta.url)), "..");

// The manifest, read from the one place that stores it. This file used to keep
// its own copy of the list, which made three restatements of one fact — the
// prose, these constants, and whatever an installing agent assembled by hand.
// Read through the real folder: a Windows checkout without symlinks has no
// `.claude/` directory.
const MANIFEST = JSON.parse(
  readFileSync(join(ROOT, ".agents/skills/wong-sync/references/payload-files.json"), "utf8"),
);

const toPosix = (p) => p.split(sep).join("/");

/** A repo path in the manifest's logical form: `.agents/` and `.codex/` read as `.claude/`. */
const logical = (p) => p.replace(/^\.(agents|codex)(?=\/|$)/, ".claude");

/** The real path in this repo of a logical manifest path. */
const physical = (p) => p.replace(/^\.claude(?=\/|$)/, ".agents");

function git(...args) {
  try {
    return execFileSync("git", args, { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
  } catch {
    return null;
  }
}

function walk(dir) {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    // Never payload, and full of third-party READMEs with their own broken links.
    if (entry === "node_modules" || entry === "dist" || entry === ".wrangler" || entry === ".git") continue;
    const full = join(dir, entry);
    if (lstatSync(full).isSymbolicLink()) continue;
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(toPosix(relative(ROOT, full)));
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

/** The files a target receives, as logical paths: every install takes every category. */
function payload() {
  const files = new Set(["CLAUDE.md"]);
  const addCategory = (cat) => {
    if (!cat) return;
    for (const f of cat.files ?? []) files.add(f);
    for (const s of cat.skillDirs ?? []) {
      walk(join(ROOT, ".agents/skills", s)).forEach((f) => files.add(logical(f)));
    }
    for (const d of cat.dirs ?? []) {
      walk(join(ROOT, physical(d)))
        .map(logical)
        .filter((f) => !(cat.exclude ?? []).includes(f))
        .forEach((f) => files.add(f));
    }
  };
  for (const category of ["core", "ui", "pack", "scaffold"]) addCategory(MANIFEST[category]);
  return files;
}

const LINK = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const REFERENCE = /^ {0,3}\[[^\]]+\]:[ \t]*<?([^\s>]+)>?/gm;
const IMPORT = /(?:^|[ \t])@((?:\.{1,2}\/)[A-Za-z0-9_./-]*[A-Za-z0-9_/-])/gm;
const GITHUB_URL =
  /https?:\/\/(?:github\.com\/[^/\s]+\/([^/\s]+)\/(?:blob|tree|raw)\/(?:refs\/heads\/)?[^/\s]+|raw\.githubusercontent\.com\/[^/\s]+\/([^/\s]+)\/(?:refs\/heads\/)?[^/\s]+)\/([^\s)"'`<>#?]+)/g;

/**
 * Blank fenced code and code spans, keeping every newline and offset. Examples
 * and commands in backticks are not links, and flagging them is how a checker
 * cries wolf.
 */
function maskCode(text) {
  const blank = (m) => m.replace(/[^\n]/g, " ");
  return text.replace(/(`{3,}|~{3,})[\s\S]*?\1/g, blank).replace(/`[^`\n]*`/g, blank);
}

const safeDecode = (p) => {
  try {
    return decodeURI(p);
  } catch {
    return p;
  }
};

const lineAt = (text, index) => text.slice(0, index).split("\n").length;

/** Each relative link, reference definition, and (optionally) `@` import in a masked body. */
function references(body, { imports = false } = {}) {
  const found = [
    ...[...body.matchAll(LINK)].map((m) => ({ target: m[1], index: m.index })),
    ...[...body.matchAll(REFERENCE)].map((m) => ({ target: m[1], index: m.index })),
  ];
  if (imports) found.push(...[...body.matchAll(IMPORT)].map((m) => ({ target: m[1], index: m.index })));
  return found.filter(({ target }) => !/^([a-z][a-z0-9+.-]*:|#)/i.test(target));
}

// --- Check 1: dead links in a target -----------------------------------------

function checkDead(files) {
  const dangling = [];
  // Link targets = what ships, plus what the target already has. Scanned files =
  // what ships, only. A target's own README is a legitimate destination but its
  // contents are the target's business, not ours to lint.
  const targets = new Set([...files, ...TARGET_PROVIDED]);
  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const abs = join(ROOT, file === "CLAUDE.md" ? realPath("CLAUDE.md") : physical(file));
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
    for (const { target } of references(maskCode(raw), { imports: true })) {
      const path = target.split("#")[0];
      if (!path) continue;
      const resolved = logical(posix.normalize(posix.join(posix.dirname(file), path)));
      const bare = resolved.replace(/\/$/, "");
      // A link into a directory resolves if the directory itself ships.
      const hit = targets.has(resolved) || targets.has(bare) || [...targets].some((f) => f.startsWith(bare + "/"));
      if (!hit) dangling.push({ file, target });
    }
  }
  return dangling;
}

// --- Check 2: links through a symlink ----------------------------------------

/** Every symlink git knows, path -> link text, from HEAD and the index. */
function gitSymlinks() {
  const links = new Map();
  for (const listing of [git("ls-tree", "-r", "HEAD"), git("ls-files", "-s")]) {
    for (const line of (listing ?? "").split("\n")) {
      const m = line.match(/^120000 (?:blob )?([0-9a-f]+)(?: \d+)?\t(.+)$/);
      if (!m || links.has(m[2])) continue;
      const text = git("cat-file", "-p", m[1]);
      if (text != null) links.set(m[2], text.trim());
    }
  }
  return links;
}

const LINKS = gitSymlinks();

function workingTreeLink(path) {
  try {
    const abs = join(ROOT, path);
    return lstatSync(abs).isSymbolicLink() ? toPosix(readlinkSync(abs)) : null;
  } catch {
    return null;
  }
}

/** The first symlink on `path` (a prefix, or the path itself), or null. */
function firstLink(path) {
  const parts = path.split("/").filter(Boolean);
  for (let i = 1; i <= parts.length; i++) {
    const link = parts.slice(0, i).join("/");
    const text = LINKS.get(link) ?? workingTreeLink(link);
    if (text != null) return { link, text, rest: parts.slice(i).join("/") };
  }
  return null;
}

/** `path` with every symlink replaced by what it points at. */
function realPath(path) {
  let current = path.replace(/\/$/, "");
  for (let hop = 0; hop < 8; hop++) {
    const hit = firstLink(current);
    if (!hit) break;
    current = posix.normalize(posix.join(posix.dirname(hit.link), hit.text, hit.rest)).replace(/\/$/, "");
  }
  return path.endsWith("/") ? `${current}/` : current;
}

function isFile(path) {
  try {
    return statSync(join(ROOT, path)).isFile();
  } catch {
    return false;
  }
}

/** Every live Markdown file: tracked or new, outside the archive, not itself a link. */
function liveMarkdown() {
  const listed = git("ls-files", "-co", "--exclude-standard");
  const files = listed == null ? walk(ROOT) : listed.split("\n").filter(Boolean);
  return [...new Set(files)].filter(
    (f) =>
      f.endsWith(".md") &&
      !f.startsWith("openspec/changes/archive/") &&
      !/(^|\/)node_modules\//.test(f) &&
      !LINKS.has(f) &&
      !firstLink(f) &&
      existsSync(join(ROOT, f)),
  );
}

/** The part of a live file to scan, and the line it starts on. */
function scanned(file) {
  const raw = readFileSync(join(ROOT, file), "utf8");
  if (file !== "CHANGELOG.md") return { text: raw, offset: 0 };
  // Released entries are the record and are never rewritten; only the newest
  // entry is still being written.
  const start = raw.search(/^## /m);
  if (start < 0) return { text: "", offset: 0 };
  const next = raw.slice(start + 3).search(/^## /m);
  const text = next < 0 ? raw.slice(start) : raw.slice(start, start + 3 + next);
  return { text, offset: lineAt(raw, start) - 1 };
}

function repoNames() {
  const names = new Set(["wongstack"]);
  const origin = git("remote", "get-url", "origin")?.trim().match(/([^/:]+?)(?:\.git)?$/);
  if (origin) names.add(origin[1].toLowerCase());
  return names;
}

function checkSymlinked(shipped, targets) {
  const found = [];
  const names = repoNames();
  for (const file of liveMarkdown()) {
    const { text, offset } = scanned(file);
    const body = maskCode(text);
    const ships = shipped.has(logical(file));
    for (const { target, index } of references(body)) {
      const [path, anchor] = target.split(/#(.*)/s);
      if (!path) continue;
      const resolved = path.startsWith("/")
        ? posix.normalize(path.slice(1))
        : posix.normalize(posix.join(posix.dirname(file), safeDecode(path)));
      if (resolved.startsWith("..")) continue;
      const hit = firstLink(resolved);
      if (!hit) continue;
      // A page that ships may link a file its target receives as a real file:
      // `CLAUDE.md` is a link here and the target's own file there.
      if (ships && !hit.rest && isFile(realPath(resolved)) && targets.has(resolved)) continue;
      const real = realPath(resolved);
      const suggestion = (posix.relative(posix.dirname(file), real.replace(/\/$/, "")) || ".") +
        (real.endsWith("/") ? "/" : "") + (anchor != null ? `#${anchor}` : "");
      found.push({ file, line: offset + lineAt(body, index), target, real, suggestion });
    }
    for (const m of body.matchAll(GITHUB_URL)) {
      if (!names.has((m[1] ?? m[2]).toLowerCase())) continue;
      const path = safeDecode(m[3]);
      if (!firstLink(path)) continue;
      const real = realPath(path);
      found.push({
        file,
        line: offset + lineAt(body, m.index),
        target: m[0],
        real,
        suggestion: m[0].slice(0, m[0].length - m[3].length) + real,
      });
    }
  }
  return found;
}

const shipped = payload();
const dead = checkDead(shipped);
const symlinked = checkSymlinked(shipped, new Set([...shipped, ...TARGET_PROVIDED]));

if (dead.length) {
  console.error(`${dead.length} dead link(s): they resolve in no install.`);
  for (const d of dead) console.error(`  ${d.file} -> ${d.target}`);
  console.error("Either add the referenced page to the manifest, or generalize the reference.");
}
if (symlinked.length) {
  if (dead.length) console.error("");
  console.error(`${symlinked.length} link(s) pass through a symlink: github.com cannot follow them.`);
  for (const s of symlinked) {
    console.error(`  ${s.file}:${s.line} -> ${s.target}`);
    console.error(`    real path: ${s.real}   link: ${s.suggestion}`);
  }
  console.error("Link the real path. Code spans and commands may keep `.claude/`.");
}
if (dead.length || symlinked.length) process.exit(1);
console.log("No dead links: every internal link in the payload resolves in a target.");
console.log("No symlinked links: every live Markdown link names a real path.");
