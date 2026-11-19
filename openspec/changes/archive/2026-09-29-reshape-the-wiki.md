<!-- openspec-archive v1 2026-09-29-reshape-the-wiki -->
<!-- file proposal.md utf8 7126 -->
# Reshape the wiki: its own section for WongStack upkeep, and a page for database fixes

**Status:** ready-to-ship
**Branch:** soft-skunk
**Open questions:** none

## Why

The wiki's "Development" section mixes two readers: pages every install relies on sit beside two guides only this repo ever uses, and its description says it is about cutting releases. The deploy page runs to about 400 lines, with the guides for fixing a broken live database buried at the bottom. A few how-tos are written out in two or three places, so one copy goes stale, and a few pages open without saying what they are.

## What Changes

- **WongStack's own upkeep gets its own section.** The guide to adding a skill and the guide to the folder layout move out of "Development" into a new "Maintaining WongStack" section, with the release notes that were in Development's opening. Development keeps what every install uses, and its description says so: how work gets planned, built, checked, and published.
  ```text
   BEFORE                  AFTER
   Development             Development
   ├ the change loop       ├ the change loop
   ├ memory, browsing      ├ memory, browsing
   ├ secrets, tools        └ secrets, tools
   ├ adding a skill ─┐
   └ repo layout ────┤     Maintaining WongStack
                     └───▶ ├ adding a skill
                           └ repo layout
  ```
- **The database fix-it guides get their own page.** The three guides for when the live database breaks (undo a bad update, never change it by hand, repair its record of updates) move off the deploy page onto one page, listed in the stack section and linked from the deploy page.
- **Each how-to lives in one place.** Sending an improvement to WongStack, cutting a release, and the folder links each get one home, and the other pages link to it. The release rule also gains what *patch*, *minor*, and *major* mean, which only the contributing page said.
- **Pages open by saying what they are.** The wiki's front page, the Cloudflare token page, and the login-wall page start with what the page covers. The wiki rulebook's "Adding a page" section becomes a real short checklist, with no more words than today.

**Non-goals:** splitting the login-wall page; renaming the Development folder, which every install links; the wording fixes planned in "Docs that disagree".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `stack-pack` requirement that `wiki/stack/` hold the recovery runbooks stays true: they move within that section. `.openspec.yaml` sets `skip_specs: true`.

## Impact

- **Wiki (source only):** new `wiki/maintaining/{README,adding-a-skill,repo-layout}.md` (the last two moved from `wiki/development/`); `wiki/README.md`; `wiki/development/README.md`.
- **Wiki (payload):** new `wiki/stack/d1-recovery.md`; `wiki/stack/{d1-pipeline,README,cloudflare-credentials,cloudflare-access}.md`; `wiki/contributing.md`; `wiki/wiki-style.md`; `wiki/development/required-tools.md` if its layout sentence restates more than the Windows setting.
- **Rules and checks:** `.agents/rules/payload.md` (level meanings, `paths:`, the repo-layout link, the closing hub link); `scripts/retired-names.json`; the example path in `scripts/check-payload-links.mjs`'s comment.
- **GitHub:** `.github/CONTRIBUTING.md`.
- **Release:** a `## Next (patch)` entry in `CHANGELOG.md`.
- **Unchanged, checked:** `payload-files.json` (neither moved page is listed; `wiki/stack` ships as a folder, so the new page ships with it); `server/install-wongstack.mjs`, whose seeded Development hub already reads "How this repo plans, builds, checks, and ships changes"; `.agents/skills/memory/scripts/memory.mjs`, which no longer has a `HOME_PAGE` path.
- **Overlap:** "Docs that disagree" edits pages in `wiki/development/` and `wiki/stack/`; whichever publishes second catches up.

## Decision log

- **2026-09-29** — Asked (earlier /explore audit) whether to fix the wiki's mixed Development section, the long deploy page, the duplicated how-tos, and the weak opening sentences → chose fix them, as this part of a four-part request.
- **2026-09-29** — Assumed: the browser rules part is already done, because 27.0.0 moved them to `wiki/development/browsing.md`; and no `HOME_PAGE` update is needed, because `memory.mjs` no longer has that constant.
- **2026-09-29** — Assumed: the new section is `wiki/maintaining/`, titled "Maintaining WongStack", with a hub and the two moved pages, because the wiki's folder rule allows a folder once a step has several pages, and the name says who it is for.
- **2026-09-29** — Assumed: `wiki/development/` keeps its folder name and only its source hub is retitled, because every install's pages and skills link that path; installs already get the right hub title from setup.
- **2026-09-29** — Assumed: only the recovery guides move off `d1-pipeline.md`, into `wiki/stack/d1-recovery.md`, with headings that drop the "Recovery:" prefix and the old anchors retired, because the request named those guides; the Cloudflare Access page stays whole and only its first sentence changes.
- **2026-09-29** — Assumed: `.github/CONTRIBUTING.md` owns the fork-to-pull-request steps and `wiki/contributing.md` keeps the bar, the scope, and the install-only cautions, linking the steps by URL, because the GitHub page is where outside contributors land and already carries the checks.
- **2026-09-29** — Assumed: the payload rule owns the release steps and the patch, minor, and major meanings; the other pages keep one line and a link, because the rule already says every other page links to it.
- **2026-09-29** — Assumed: the payload manifest's "The agent folder" owns the folder-link layout; `repo-layout.md` keeps only editing, linking, and auditing through the links, and `required-tools.md` only the Windows setting, because the manifest is what setup and sync follow.
- **2026-09-29** — Assumed: the "Adding a page" checklist adds no words, because the start-up load stood at 2,199 of 2,200 words on 2026-09-29 and `wiki-style.md` counts toward it.
- **2026-09-29** — Assumed: one patch release, because the payload edits move and trim wording and change no behavior.
- **2026-09-29** — Assumed: `AGENTS.md`'s meta-repo line and the README's "Working on WongStack" link now point at `wiki/maintaining/`, because both describe changing the toolkit itself and sit outside the `WONG-STACK` block.
- **2026-09-29** — Assumed: `development/adding-a-skill.md` and `development/repo-layout.md` are retired names too, because the payload rule retires a moved page's old path.
- **2026-09-29** — Assumed: the footers of four shipped Development pages now say "development", not "working on WongStack", because the hub they link is titled Development in every install.
- **2026-09-29** — Assumed: checkpoint inside /ship for task 5.3; all other tasks built and the four release checks pass locally.
- **2026-09-29** — Assumed: archived and numbered 27.1.1 after merging 27.1.0 from main, because /ship numbers the release from main at its checkpoint.

<!-- end proposal.md -->
<!-- file design.md utf8 6188 -->
# Design

## Context

See proposal.md for why. Checked against `main` at 3c7ff20:

- `wiki/development/` holds nine pages. `payload-files.json` ships seven (`secrets`, `the-change-loop`, `required-tools`, `staging-walkthrough`, `repository-improvement`, `memory`, `browsing`); `adding-a-skill.md` and `repo-layout.md` never ship, and the hub `README.md` is `seededBySetup`, so each install writes its own. `server/install-wongstack.mjs:163` seeds it as "Development: How this repo plans, builds, checks, and ships changes"; the source `wiki/README.md` describes the section as "editing the payload and cutting a release".
- Links into the two moving pages: `wiki/development/README.md:13,16`, `adding-a-skill.md` → `repo-layout.md`, `.agents/rules/payload.md:35` (`repo-layout.md#linking`), and the example path in `scripts/check-payload-links.mjs:14-15`. Archived changes also name them; archives are history and stay.
- `wiki/stack/d1-pipeline.md` is 409 lines; the three `## Recovery: …` sections are lines 358-402, and lines 7, 278, and 292 link `#recovery-a-bad-migration-reached-production`. Nothing outside the page links a recovery anchor.
- The start-up load (`node scripts/measure-context.mjs --check`) counts `wiki/wiki-style.md` and stood at 2,199 of its 2,200-word ceiling.

## Goals / Non-Goals

**Goals:**
- No shipped page links a page that does not ship, and every hub links each of its children.
- Each procedure named in the proposal has one owning page; the rest link it.

**Non-Goals:**
- Changing what ships: `payload-files.json` stays as it is.
- Rewording beyond the moved, trimmed, and opening sentences; "Docs that disagree" owns the payload and stack-optional wording.

## Decisions

### A root-level `wiki/maintaining/` section

`wiki/maintaining/README.md` ("Maintaining WongStack") takes the payload paragraph and the release sentence from `wiki/development/README.md`'s opening, and lists `adding-a-skill.md`, `repo-layout.md`, and [the payload rule](../../../.agents/rules/payload.md). The two pages move with `git mv` so history follows; their `Part of [working on WongStack](README.md)` footers point at the new hub, and their `../../` links stay valid at the same depth. `wiki/README.md` links the section; `wiki/development/README.md` keeps only shipped pages plus `/routine` and contributing, and opens with the line setup seeds.

*Alternatives:* `wiki/development/maintaining/` keeps the audiences in one tree and still makes shipped pages sit beside unshipped ones in the hub list. Renaming `wiki/development/` itself breaks every install's links and every skill's `wiki/development/…` path.

The section is not payload, so `payload-files.json` does not change. `.agents/rules/payload.md` adds `wiki/maintaining/**` to its `paths:` so the release rule loads while editing those pages, and its closing line points at the new hub. `scripts/tests/payload-rule-paths.test.mjs` only checks that payload files are covered, so an extra path passes.

### Recovery guides move to `wiki/stack/d1-recovery.md`

The new page, "Fix a broken production database", holds the three sections unchanged except their headings, which drop the `Recovery:` prefix the title now carries: `## A bad migration reached production`, `## Never hand-apply schema to production`, `## Production schema drifted from d1_migrations`. `d1-pipeline.md` keeps one sentence at line 7 and a `## Next` entry linking it, and its two Time Travel links point at the new page's first section. `wiki/stack/README.md` lists the page and drops "and the prod-recovery runbooks" from the pipeline's line. `wiki/stack` ships as a folder, so the page ships with no manifest edit.

The three old anchors go in `scripts/retired-names.json` (`#recovery-a-bad-migration-reached-production`, `#recovery-never-hand-apply-schema-to-production`, `#recovery-production-schema-drifted-from-d1_migrations`), so a missed link fails the check. *Alternative:* keep the old headings on the new page; then the anchors survive but the page repeats its own title in every heading.

### One owner per procedure

| Procedure | Owner | Others keep |
|---|---|---|
| Fork to pull request | `.github/CONTRIBUTING.md` | `wiki/contributing.md` keeps the bar, the scope, the cache-clone warning, *generalize it*, and *argue generality in the PR body*, and links the steps by URL (targets have no `.github/CONTRIBUTING.md`) |
| Release steps and level meanings | `.agents/rules/payload.md` step 1 gains *patch for wording, minor for new behavior, major for breaking* | `contributing.md`, `.github/CONTRIBUTING.md`, `adding-a-skill.md` step 3, and the maintaining hub each keep one line and a link |
| The folder links in an install | `payload-manifest.md` "The agent folder" | `repo-layout.md` keeps Editing, Linking, and Auditing; its "Why it's this way" restatement becomes one sentence linking the manifest. `required-tools.md` keeps only the Windows setting and the Codex check |

`wiki/contributing.md` links the payload rule by its GitHub URL today, because the rule is meta-only; keep that form.

### Opening sentences and the checklist

- `wiki/README.md:3`: open with what the wiki is ("This wiki is what WongStack has learned: …"), then who it serves.
- `wiki/stack/cloudflare-credentials.md:3`: fold line 5's "This page is the token screen in detail" into the first sentence.
- `wiki/stack/cloudflare-access.md:3`: open with "This page puts a login wall in front of your app with Cloudflare Access, …".
- `wiki/wiki-style.md`: `## Adding a page — the checklist` becomes `## Adding a page` with three numbered steps built from the current sentence's words. No page links the old anchor. The start-up count must not rise.

## Risks / Trade-offs

- An install's own page may link a retired recovery anchor → the changelog's **Updating.** note says to point it at the new page; `/wong-sync` adapts local pages anyway.
- "Docs that disagree" edits some of the same pages → whichever publishes second rebases and keeps both edits; neither changes page locations.
- The start-up ceiling has one word of room → count before and after the checklist edit; cut a word elsewhere in `wiki-style.md` if needed.

<!-- end design.md -->
<!-- file tasks.md utf8 3277 -->
# Tasks

## 1. Maintaining section

- [x] 1.1 `git mv` `wiki/development/adding-a-skill.md` and `wiki/development/repo-layout.md` to `wiki/maintaining/`; repoint their footers and any sibling links; verify every `../../` link still resolves.
- [x] 1.2 Write `wiki/maintaining/README.md` ("Maintaining WongStack") with the payload paragraph and release line from `wiki/development/README.md`, linking both pages and `.agents/rules/payload.md`; verify it links every child and up to `wiki/README.md`.
- [x] 1.3 Retitle `wiki/development/README.md`: open with "How this repo plans, builds, checks, and ships changes", drop the payload paragraph and the two moved entries; update its line in `wiki/README.md` to match and add a Maintaining WongStack entry.
- [x] 1.4 Repoint `.agents/rules/payload.md` (the `repo-layout.md#linking` link and the closing hub line), add `wiki/maintaining/**` to its `paths:`, and update the example path in `scripts/check-payload-links.mjs`'s comment; verify `grep -rn "development/adding-a-skill\|development/repo-layout" --exclude-dir=archive .agents wiki scripts AGENTS.md README.md .github` finds nothing.

## 2. Database recovery page

- [x] 2.1 Move the three `## Recovery: …` sections from `wiki/stack/d1-pipeline.md` into a new `wiki/stack/d1-recovery.md` ("Fix a broken production database"), headings without the prefix, with up and sideways links; verify the moved text is otherwise unchanged.
- [x] 2.2 Repoint `d1-pipeline.md`'s line 7 and Time Travel links, add it to the page's `## Next`, and list the new page in `wiki/stack/README.md`; retire the three old anchors in `scripts/retired-names.json`.

## 3. One owner per procedure

- [x] 3.1 Add the patch, minor, and major meanings to step 1 of `.agents/rules/payload.md`; cut the restated release steps in `wiki/contributing.md`, `.github/CONTRIBUTING.md`, and `wiki/maintaining/adding-a-skill.md` step 3 to one line and a link.
- [x] 3.2 Make `.github/CONTRIBUTING.md` the fork-to-pull-request owner: trim `wiki/contributing.md`'s route to its install-only cautions plus a link to the GitHub page's steps.
- [x] 3.3 Cut `repo-layout.md`'s layout restatement to a sentence linking the manifest's "The agent folder", and `wiki/development/required-tools.md`'s symlink section to the Windows setting and the Codex check.

## 4. Opening sentences

- [x] 4.1 Rewrite the first sentences of `wiki/README.md`, `wiki/stack/cloudflare-credentials.md`, and `wiki/stack/cloudflare-access.md` to say what the page is.
- [x] 4.2 Turn `wiki/wiki-style.md`'s "Adding a page — the checklist" into `## Adding a page` with three numbered steps; verify `node scripts/measure-context.mjs --check` passes.

## 5. Release and checks

- [x] 5.1 Add a `## Next (patch) — The wiki keeps WongStack upkeep apart, and database fixes on their own page` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: a page of yours that links the deploy page's recovery sections should link the new database fixes page.
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`; fix each failure.
- [x] 5.3 Run `/save` and confirm the `payload` and `test` checks pass in CI.

<!-- end tasks.md -->
<!-- file .openspec.yaml utf8 57 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-29
skip_specs: true

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 38561 fence=~~~ -->
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
<title>Review · 2026-09-29-reshape-the-wiki</title>
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
<body data-change="2026-09-29-reshape-the-wiki">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-29-reshape-the-wiki</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The wiki's &quot;Development&quot; section mixes two readers: pages every install relies on sit beside two guides only this repo ever uses, and its description says it is about cutting releases. The deploy page runs to about 400 lines, with the guides for fixing a broken live database buried at the bottom. A few how-tos are written out in two or three places, so one copy goes stale, and a few pages open without saying what they are.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>WongStack's own upkeep gets its own section.</b> The guide to adding a skill and the guide to the folder layout move out of &quot;Development&quot; into a new &quot;Maintaining WongStack&quot; section, with the release notes that were in Development's opening. Development keeps what every install uses, and its description says so: how work gets planned, built, checked, and published.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0"> BEFORE                  AFTER</span>
<span class="ln" data-note="item-1-line-2" tabindex="0"> Development             Development</span>
<span class="ln" data-note="item-1-line-3" tabindex="0"> ├ the change loop       ├ the change loop</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> ├ memory, browsing      ├ memory, browsing</span>
<span class="ln" data-note="item-1-line-5" tabindex="0"> ├ secrets, tools        └ secrets, tools</span>
<span class="ln" data-note="item-1-line-6" tabindex="0"> ├ adding a skill ─┐</span>
<span class="ln" data-note="item-1-line-7" tabindex="0"> └ repo layout ────┤     Maintaining WongStack</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">                   └───▶ ├ adding a skill</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">                         └ repo layout</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The database fix-it guides get their own page.</b> The three guides for when the live database breaks (undo a bad update, never change it by hand, repair its record of updates) move off the deploy page onto one page, listed in the stack section and linked from the deploy page.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Each how-to lives in one place.</b> Sending an improvement to WongStack, cutting a release, and the folder links each get one home, and the other pages link to it. The release rule also gains what <i>patch</i>, <i>minor</i>, and <i>major</i> mean, which only the contributing page said.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Pages open by saying what they are.</b> The wiki's front page, the Cloudflare token page, and the login-wall page start with what the page covers. The wiki rulebook's &quot;Adding a page&quot; section becomes a real short checklist, with no more words than today.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> splitting the login-wall page; renaming the Development folder, which every install links; the wording fixes planned in &quot;Docs that disagree&quot;.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-29</p>Asked (earlier /explore audit) whether to fix the wiki's mixed Development section, the long deploy page, the duplicated how-tos, and the weak opening sentences → chose fix them, as this part of a four-part request.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the browser rules part is already done, because 27.0.0 moved them to <code>wiki/development/browsing.md</code>; and no <code>HOME_PAGE</code> update is needed, because <code>memory.mjs</code> no longer has that constant.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the new section is <code>wiki/maintaining/</code>, titled &quot;Maintaining WongStack&quot;, with a hub and the two moved pages, because the wiki's folder rule allows a folder once a step has several pages, and the name says who it is for.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>wiki/development/</code> keeps its folder name and only its source hub is retitled, because every install's pages and skills link that path; installs already get the right hub title from setup.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: only the recovery guides move off <code>d1-pipeline.md</code>, into <code>wiki/stack/d1-recovery.md</code>, with headings that drop the &quot;Recovery:&quot; prefix and the old anchors retired, because the request named those guides; the Cloudflare Access page stays whole and only its first sentence changes.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>.github/CONTRIBUTING.md</code> owns the fork-to-pull-request steps and <code>wiki/contributing.md</code> keeps the bar, the scope, and the install-only cautions, linking the steps by URL, because the GitHub page is where outside contributors land and already carries the checks.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the payload rule owns the release steps and the patch, minor, and major meanings; the other pages keep one line and a link, because the rule already says every other page links to it.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the payload manifest's &quot;The agent folder&quot; owns the folder-link layout; <code>repo-layout.md</code> keeps only editing, linking, and auditing through the links, and <code>required-tools.md</code> only the Windows setting, because the manifest is what setup and sync follow.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the &quot;Adding a page&quot; checklist adds no words, because the start-up load stood at 2,199 of 2,200 words on 2026-09-29 and <code>wiki-style.md</code> counts toward it.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: one patch release, because the payload edits move and trim wording and change no behavior.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>AGENTS.md</code>'s meta-repo line and the README's &quot;Working on WongStack&quot; link now point at <code>wiki/maintaining/</code>, because both describe changing the toolkit itself and sit outside the <code>WONG-STACK</code> block.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: <code>development/adding-a-skill.md</code> and <code>development/repo-layout.md</code> are retired names too, because the payload rule retires a moved page's old path.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: the footers of four shipped Development pages now say &quot;development&quot;, not &quot;working on WongStack&quot;, because the hub they link is titled Development in every install.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: checkpoint inside /ship for task 5.3; all other tasks built and the four release checks pass locally.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-29</p>Assumed: archived and numbered 27.1.1 after merging 27.1.0 from main, because /ship numbers the release from main at its checkpoint.</li>
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
