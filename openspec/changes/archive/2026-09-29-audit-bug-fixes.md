<!-- openspec-archive v1 2026-09-29-audit-bug-fixes -->
<!-- file proposal.md utf8 6546 -->
# Fix four bugs a repo audit found

**Status:** ready-to-ship
**Branch:** discrepancies-elegance
**Open questions:** none

## Why

A read-through of the repo on 2026-09-29 found four real bugs among its loose ends. One could let a test branch change the live app's data. One could put a mini app's test file on the public site. The other two break a step for anyone who reaches it. Each fix is small, so fixing them now costs little.

## What Changes

- **A test branch can never touch the live app's data.** If a setup mistake points the test copy of the app at the live database, every test-copy step now stops before it touches it. That covers each branch push, each test deploy, each preview, and each staging reset. Today only the preview and the reset check, and only by name: a copied entry with a new name but the same database gets past all of them.
  ```text
  push a branch
        │
        ▼
  same name or id as live database? ──▶ stop
        │ no
        ▼
  migrate staging, build, deploy
  ```
- **A mini app's test files stay private.** One rule now decides what counts as a test file. CI runs the tests it names, the build leaves them off the site, the app refuses to serve them, and the check for switched-off tests reads them. Today a file named like `foo_test.mjs` runs as a test and is also published under `/apps/`.
- **`/verify`'s staging reset runs.** After a failed check, `/verify` resets staging with a command that fails, because it looks for the app's settings in the wrong folder. It now runs the reset script directly.
- **Setup keeps your keys in the right place.** When setup can't find the main copy of the repo, it now stops and says why. Today it saves the keys in whatever folder it runs from, which may be a temporary copy that gets deleted.

Non-goals: the audit's other findings, being planned in their own workspaces ("Docs that disagree", "Tidy the code", "Reshape the wiki").

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `stack-pack`: every staging step refuses a staging D1 entry that names production's database by `database_name` or `database_id`, before any wrangler call.
- `mini-apps`: one shared rule names a mini app's test files, for the CI run, the build copy, the Worker's refusal, and the loosened-check guard.

## Impact

- `scripts/lib-wrangler-config.mjs`: a `stagingDatabase` check and CLI command; `scripts/cf-build.sh`, `scripts/cf-deploy.sh`, `scripts/cf-preview.sh`, `scripts/reset-staging-d1.mjs` call it.
- New `mini-apps/is-test-file.mjs`, used by `mini-apps/router.mjs`, `scripts/mini-dashboard.mjs`, `.github/scripts/loosened-checks.mjs`, and `.github/workflows/test.yml`; listed in `payload-files.json`.
- `.agents/skills/verify/SKILL.md` step 6; `.agents/skills/wong-setup/scripts/provision.mjs` `durableEnv`.
- Tests: `scripts/tests/wrangler-config.test.mjs`, `mini-apps.test.mjs`, `loosened-checks.test.mjs`, `provision.test.mjs`.
- A payload change: a patch `## Next` CHANGELOG entry.

## Decision log

- **2026-09-29** — Asked which audit findings to take on → chose all four groups: real bugs, docs that disagree, tidying the code, reshaping the wiki.
- **2026-09-29** — Asked how to split them → chose the bugs here and a new workspace for each other group; opened "Docs that disagree", "Tidy the code", and "Reshape the wiki".
- **2026-09-29** — Asked how to handle the overlap with "Team memory segmentation" → it had shipped, so this workspace moved to the latest main (v27.0.0) first.
- **2026-09-29** — Assumed: staging counts as production's database when either its `database_name` or its `database_id` matches, because a copied entry renamed by hand keeps production's id, and that is the case today's name check misses.
- **2026-09-29** — Assumed: the check also runs in `cf-deploy.sh`, because a staging Worker bound to production's database writes real data even when the build migrated nothing.
- **2026-09-29** — Assumed: the one test-file rule is the union of Node's default test patterns (what `node --test` runs, `test/` folders included) and the `.spec.` and `test_` names the loosened-check guard already reads, so no file any runner treats as a test is published or escapes the guard.
- **2026-09-29** — Assumed: the rule lives in a new `mini-apps/is-test-file.mjs`, beside the router that enforces it; every install takes the scaffold, so the core `test.yml` and `loosened-checks.mjs` can import it. A reviewer can move it cheaply.
- **2026-09-29** — Assumed: `/verify` runs `node "$ROOT/scripts/reset-staging-d1.mjs"` rather than `npm --prefix app run db:reset:staging`, because the script finds its config itself and works wherever the app folder lives.
- **2026-09-29** — Assumed: setup uses the shared `primaryRoot()` and stops when it fails, because the secrets spec already requires that and every other script works this way; no spec change is needed.
- **2026-09-29** — Check: `.github/scripts/loosened-checks.mjs` now reads test files by the shared rule in `mini-apps/is-test-file.mjs`, because that rule is wider than its old one (it adds `foo_test.mjs`, `test-foo.mjs`, and `test/` folders), so more skipped tests get caught, not fewer.
- **2026-09-29** — Check: `.github/workflows/test.yml` lists a mini app's tests with `mini-apps/is-test-file.mjs` and runs exactly those, because its old `find` and Node's default patterns missed `.spec.` and `test_` files the rule names; no test that ran before is dropped.
- **2026-09-29** — Check: `.github/workflows/payload.yml` lints the new `mini-apps/is-test-file.mjs` beside `router.mjs` and `routes.mjs`, because the Worker bundles it; this adds a check and removes none.
- **2026-09-29** — Assumed: the test-file CLI prints the files it finds and CI passes them to `node --test`, because Node's default patterns skip `.spec.` and `test_` names, and the spec says CI runs every file the rule names.
- **2026-09-29** — Assumed: the rule's file is named `is-test-file.mjs`, not `test-files.mjs`, because a `test-` name matches the rule itself, so the loosened-check guard and `node --test` would treat it as a test.
- **2026-09-29** — Assumed: the plan's "run /save" task is dropped, because `/ship`'s own checkpoint runs CI after the archive.
- **2026-09-29** — Archived and checkpointed for /ship as 27.1.3, after merging main at 27.1.2 (Docs that disagree, Reshape the wiki).
- **2026-09-29** — Renumbered 27.2.1 at merge, because main reached 27.2.0 (save your passwords for the agent's browser) first.

<!-- end proposal.md -->
<!-- file design.md utf8 4975 -->
# Design

## Context

Four independent fixes from the 2026-09-29 audit, each checked against the code on v27.0.0:

- `scripts/cf-build.sh:117-121` runs `wrangler d1 migrations apply` on the staging entry with no production check. `cf-preview.sh:106-111` and `reset-staging-d1.mjs:47-62` compare `database_name` only; `cf-deploy.sh` compares Worker names only.
- Four test-file rules: `test.yml`'s `find` (Node's default patterns, minus `test/` folders), `loosened-checks.mjs:68` (`.test.`, `.spec.`, `test_`), `mini-dashboard.mjs:66` (`.test.` only), `router.mjs:17` (`.test.[cm]?js` only).
- `verify/SKILL.md:53` runs `npm run db:reset:staging` from the repo root; the script is defined only in `app/package.json`, and there is no root `package.json`.
- `provision.mjs:203-206` `durableEnv` falls back to `join(dir, '.env')` when the common dir does not end in `/.git`, which the secrets convention forbids.

## Goals / Non-Goals

**Goals:** close each bug with one shared rule where there were several; tests pin each.

**Non-Goals:** deduplicating the shell guards generally, the `isMain` copies, or the config lookup. The "Tidy the code" workspace owns those, and it will reuse the new D1 check.

## Decisions

### One staging-database check in `lib-wrangler-config.mjs`

Add `stagingDatabase(config)`:

- Returns `null` when neither production nor staging binds an app D1.
- Throws `WranglerConfigError` when production binds one and staging doesn't (today's "needs its own d1_databases entry" message).
- Throws when staging's first app entry matches production's by `database_name` or by `database_id`. The id comparison applies only when both ids are set.
- Otherwise returns staging's `database_name`.

The CLI gains `staging-database`, which prints the name or an empty line and exits 1 on the error.

The callers:

- **`cf-build.sh`** reads `DB_NAME=$(wong_config staging-database)` on the staging branch. An error stops it under `set -e`, before `wrangler`. The production branch keeps `database-name`.
- **`cf-preview.sh`** replaces its two inline blocks (lines 100-111) with the same call.
- **`cf-deploy.sh`** calls it on the staging path before `wrangler deploy`. The value is discarded; only the check matters.
- **`reset-staging-d1.mjs`**'s `stagingDatabase` becomes a thin wrapper that keeps its "Refusing to reset staging" prefix, plus one extra rule: with no staging database it refuses, since there is nothing to reset.

The alternative was a guard in each script. That is today's pattern, and the copies drifted.

### One test-file rule in `mini-apps/is-test-file.mjs`

The module exports:

- **`TEST_FILE`**: the union of Node's defaults (`*.test.*`, `*-test.*`, `*_test.*`, `test-*`, `test.*`, and anything under a `test/` folder) with `*.spec.*` and `test_*`. It is extension-agnostic, so a `.ts` test counts too.
- **`isTestFile(path)`**.
- **A CLI**, `node mini-apps/is-test-file.mjs <dir>`, which prints each test file Node can run (skipping `node_modules`), so CI runs exactly that list; it exits 0 when there is one and 1 when there is none.

The users:

- **`router.mjs`**'s `SOURCE` becomes `.ts` sources, plus `api.mjs`, plus `isTestFile`.
- **`mini-dashboard.mjs`**'s copy filter tests the path relative to the app folder, so a `test/` folder is dropped whole.
- **`loosened-checks.mjs`** imports `TEST_FILE`.
- **`test.yml`**'s `find` becomes the CLI call, and `node --test` runs the files it prints.

The module is plain JavaScript with no Node imports at the top level (the CLI part loads `node:fs` dynamically), so the Worker bundle stays free of Node built-ins.

Placement alternative: `.github/scripts/is-test-file.mjs`. It sits beside the core check, but the Worker would then import from `.github/`.

### `/verify` runs the reset script directly

`node "$ROOT/scripts/reset-staging-d1.mjs"`, with `ROOT` already set at step 1. It needs no npm and works whether the app is at the root or in `app/`.

### Setup finds the primary through `primaryRoot()`

`durableEnv` imports `primaryRoot` from `../../memory/scripts/lib/primary-root.mjs`, as `ship/scripts/worktree-secrets.mjs` does, and returns `join(primary, '.env')`. A `PrimaryRootError` becomes `ProvisionError('repo', …)` naming the cause.

`commonDir` stays for the provisioning state file, which belongs in the shared git folder.

## Risks / Trade-offs

- **A repo that deleted `mini-apps/`** would break the core loosened-check import. Every install takes the scaffold (payload manifest), and the scaffold ships `is-test-file.mjs`, so this needs a deliberate deletion; the failure is a loud import error, not a silent pass.
- **Staging entries without a `database_id`** (a hand-written config before provisioning) skip the id comparison, since two missing ids are not a match. The name comparison still runs.
- **`primaryRoot()` is synchronous** and uses real git, not provision's injectable `exec`. The provision tests already use a real git repository, so they cover it.

<!-- end design.md -->
<!-- file tasks.md utf8 2007 -->
## 1. Staging database guard

- [x] 1.1 Add `stagingDatabase(config)` and the `staging-database` CLI command to `scripts/lib-wrangler-config.mjs`, refusing a staging entry that matches production by `database_name` or `database_id`
- [x] 1.2 `scripts/cf-build.sh`: read the staging database through `wong_config staging-database` on non-production branches
- [x] 1.3 `scripts/cf-preview.sh`: replace the inline D1 blocks with the same call
- [x] 1.4 `scripts/cf-deploy.sh`: run the check on the staging path before `wrangler deploy`
- [x] 1.5 `scripts/reset-staging-d1.mjs`: build its refusal on `stagingDatabase`
- [x] 1.6 Tests in `scripts/tests/wrangler-config.test.mjs` and `scripts/tests/mini-apps.test.mjs`: a same-id, renamed entry stops build, deploy, preview, and reset before any wrangler call; a distinct entry still migrates

## 2. One test-file rule

- [x] 2.1 Add `mini-apps/is-test-file.mjs` (`TEST_FILE`, `isTestFile`, the folder CLI) and list it in `.agents/skills/wong-sync/references/payload-files.json` under `scaffold`
- [x] 2.2 `mini-apps/router.mjs` and `scripts/mini-dashboard.mjs` use it; the copy filter drops `test/` folders
- [x] 2.3 `.github/scripts/loosened-checks.mjs` imports `TEST_FILE`; `.github/workflows/test.yml` replaces its `find` with the CLI
- [x] 2.4 Tests: `foo_test.mjs` and `test/x.mjs` are neither copied nor served; a `test.skip` in `foo_test.mjs` is flagged; the CLI finds and misses tests as expected

## 3. Skill and setup fixes

- [x] 3.1 `.agents/skills/verify/SKILL.md` step 6 runs `node "$ROOT/scripts/reset-staging-d1.mjs"`; fix the reset script's `Usage:` header to match
- [x] 3.2 `.agents/skills/wong-setup/scripts/provision.mjs`: `durableEnv` uses `primaryRoot()` and stops with a `repo` error when it fails
- [x] 3.3 Test in `scripts/tests/provision.test.mjs`: provisioning from a linked worktree writes the key to the primary's `.env`

## 4. Release

- [x] 4.1 Add a `## Next (patch) — Four bug fixes from a repo audit` entry to `CHANGELOG.md`

<!-- end tasks.md -->
<!-- file specs/mini-apps/spec.md utf8 809 -->
## ADDED Requirements

### Requirement: One rule names a mini app's test files

One shared rule SHALL decide which files are tests: every name Node's test runner picks up by default, plus `.spec.` and `test_` names. CI SHALL run those files as a mini app's tests, the build SHALL leave them out of the published pages, the Worker SHALL refuse to serve them, and the loosened-check guard SHALL read them for switched-off tests.

#### Scenario: An underscore test file

- **WHEN** a mini app holds `foo_test.mjs`
- **THEN** CI runs it as a test, and `/apps/<name>/foo_test.mjs` is neither copied into the build nor served

#### Scenario: A skipped test in a mini app

- **WHEN** a branch adds `test.skip` to a mini app's `foo_test.mjs` with no recorded reason
- **THEN** the test check fails and names the file

<!-- end specs/mini-apps/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 799 -->
## ADDED Requirements

### Requirement: Staging never binds the production database

Every step that acts on staging (the branch build, the staging deploy, the preview upload, and the staging reset) SHALL stop before any Cloudflare call when the staging D1 entry names production's database by `database_name` or by `database_id`, and SHALL name the fix.

#### Scenario: A copied entry renamed by hand

- **WHEN** `env.staging` holds a D1 entry with its own `database_name` but production's `database_id`, and a branch is pushed
- **THEN** the build stops before migrating, and no staging step deploys or writes

#### Scenario: Staging has its own database

- **WHEN** the staging entry's name and id both differ from production's
- **THEN** the branch build migrates the staging database as before

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-29

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 38786 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-29-audit-bug-fixes</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-29-audit-bug-fixes">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-29-audit-bug-fixes</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A read-through of the repo on 2026-09-29 found four real bugs among its loose ends. One could let a test branch change the live app's data. One could put a mini app's test file on the public site. The other two break a step for anyone who reaches it. Each fix is small, so fixing them now costs little.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A test branch can never touch the live app's data.</b> If a setup mistake points the test copy of the app at the live database, every test-copy step now stops before it touches it. That covers each branch push, each test deploy, each preview, and each staging reset. Today only the preview and the reset check, and only by name: a copied entry with a new name but the same database gets past all of them.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">push a branch</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">same name or id as live database? ──▶ stop</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">      │ no</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">migrate staging, build, deploy</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A mini app's test files stay private.</b> One rule now decides what counts as a test file. CI runs the tests it names, the build leaves them off the site, the app refuses to serve them, and the check for switched-off tests reads them. Today a file named like <code>foo_test.mjs</code> runs as a test and is also published under <code>/apps/</code>.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b><code>/verify</code>'s staging reset runs.</b> After a failed check, <code>/verify</code> resets staging with a command that fails, because it looks for the app's settings in the wrong folder. It now runs the reset script directly.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Setup keeps your keys in the right place.</b> When setup can't find the main copy of the repo, it now stops and says why. Today it saves the keys in whatever folder it runs from, which may be a temporary copy that gets deleted.</div></div></li>
</ol>
<p class="aside">Non-goals: the audit's other findings, being planned in their own workspaces (&quot;Docs that disagree&quot;, &quot;Tidy the code&quot;, &quot;Reshape the wiki&quot;).</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked which audit findings to take on → chose all four groups: real bugs, docs that disagree, tidying the code, reshaping the wiki.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked how to split them → chose the bugs here and a new workspace for each other group; opened &quot;Docs that disagree&quot;, &quot;Tidy the code&quot;, and &quot;Reshape the wiki&quot;.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked how to handle the overlap with &quot;Team memory segmentation&quot; → it had shipped, so this workspace moved to the latest main (v27.0.0) first.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: staging counts as production's database when either its <code>database_name</code> or its <code>database_id</code> matches, because a copied entry renamed by hand keeps production's id, and that is the case today's name check misses.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the check also runs in <code>cf-deploy.sh</code>, because a staging Worker bound to production's database writes real data even when the build migrated nothing.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the one test-file rule is the union of Node's default test patterns (what <code>node --test</code> runs, <code>test/</code> folders included) and the <code>.spec.</code> and <code>test_</code> names the loosened-check guard already reads, so no file any runner treats as a test is published or escapes the guard.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the rule lives in a new <code>mini-apps/is-test-file.mjs</code>, beside the router that enforces it; every install takes the scaffold, so the core <code>test.yml</code> and <code>loosened-checks.mjs</code> can import it. A reviewer can move it cheaply.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>/verify</code> runs <code>node &quot;$ROOT/scripts/reset-staging-d1.mjs&quot;</code> rather than <code>npm --prefix app run db:reset:staging</code>, because the script finds its config itself and works wherever the app folder lives.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: setup uses the shared <code>primaryRoot()</code> and stops when it fails, because the secrets spec already requires that and every other script works this way; no spec change is needed.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-29</p>Check: <code>.github/scripts/loosened-checks.mjs</code> now reads test files by the shared rule in <code>mini-apps/is-test-file.mjs</code>, because that rule is wider than its old one (it adds <code>foo_test.mjs</code>, <code>test-foo.mjs</code>, and <code>test/</code> folders), so more skipped tests get caught, not fewer.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-29</p>Check: <code>.github/workflows/test.yml</code> lists a mini app's tests with <code>mini-apps/is-test-file.mjs</code> and runs exactly those, because its old <code>find</code> and Node's default patterns missed <code>.spec.</code> and <code>test_</code> files the rule names; no test that ran before is dropped.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-29</p>Check: <code>.github/workflows/payload.yml</code> lints the new <code>mini-apps/is-test-file.mjs</code> beside <code>router.mjs</code> and <code>routes.mjs</code>, because the Worker bundles it; this adds a check and removes none.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the test-file CLI prints the files it finds and CI passes them to <code>node --test</code>, because Node's default patterns skip <code>.spec.</code> and <code>test_</code> names, and the spec says CI runs every file the rule names.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the rule's file is named <code>is-test-file.mjs</code>, not <code>test-files.mjs</code>, because a <code>test-</code> name matches the rule itself, so the loosened-check guard and <code>node --test</code> would treat it as a test.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the plan's &quot;run /save&quot; task is dropped, because <code>/ship</code>'s own checkpoint runs CI after the archive.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-29</p>Archived and checkpointed for /ship as 27.1.3, after merging main at 27.1.2 (Docs that disagree, Reshape the wiki).</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-29</p>Renumbered 27.2.1 at merge, because main reached 27.2.0 (save your passwords for the agent's browser) first.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
