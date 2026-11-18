<!-- openspec-archive v1 2026-09-26-lighten-the-loop -->
<!-- file proposal.md utf8 19467 -->
# Lighten the loop and open it to any work

**Status:** ready-to-ship
**Branch:** explore-lightweight-loop
**Open questions:** none

## Why

Each change pays the same fixed cost, whatever its size. The cost is not CI: on PR #114, Deploy took 38 s and Test took 80 s. The cost is overhead. A design subagent draws HTML visuals, a browser checks them, and a one-go `/ship` runs two checkpoints that each wait on CI. The loop also serves only code. The user's bet is that building is becoming very easy. WongStack should then make building and doing things feel as direct as a chat assistant: ask for something and get a link, with the full review path kept for changes to the main app.

## What Changes

- **A verb you invoke works for any work, not only code.** A plain request still needs no verb, as #118 set. When you invoke a verb for work that changes no repo file, `/plan` writes a short to-do in chat. `/apply` does the work and asks before each action that leaves the conversation, such as a sent message or a write to a service. `/save` keeps a memory thread, and `/continue` resumes it. `/ship` stays for repo changes. There is no separate chat or home mode.
  ```text
  What do you want?
  ├─ a plain request ──▶ done, no verb
  ├─ non-code work
  │    /plan   to-do in chat
  │    /apply  asks before each send
  │    /save   memory thread
  ├─ a mini app ──▶ item 2
  └─ a change to the main app
       /explore ▶ /plan ▶ /apply
       ▶ /ship (one CI run, walk)
  ```
- **A mini app goes from a request to a link in under a minute, however large the main app is.** "Make me a …" builds a small app in its own folder, `mini-apps/apps/<name>/`, with no question round unless the agent cannot act without an answer. All mini apps run on one small Worker with no build step, beside the main app and apart from its build, lint, and tests. `/apply` uploads a preview of that Worker from the agent host in seconds, on staging data; a preview expires after seven days. Each mini app carries its own tests. `/save` runs them on the host, then pushes straight to `main`, like a prose save: no branch and no PR. CI on `main` runs the tests again and deploys only the production mini Worker, so the app is live on production data. A diff outside the app's folder, such as a migration, or a rejected push falls back to a PR, which `/ship` merges with no OpenSpec change and no walk. A script builds a dashboard of every mini app from each app's `app.json`.
  ```text
  "make me a tip calculator"
    │
    ▼
  mini-apps/apps/tips/
    │  host upload, seconds
    ▼
  preview link (staging, 7 days)
    │  /save
    ▼
  tests on host ─▶ push to main
    │  CI: tests, deploy
    ▼
  live on production
    │
    ▼
  dashboard lists it
  ```
- **BREAKING: The review page gets lighter.** `/plan` draws each visual as a narrow ASCII text block inside its bullet in `proposal.md`. The page is one scrolling document: Why, What Changes with their visuals, and Decisions labeled *asked* or *assumed*. Each visual opens fitted to its width; you drag to pan and pinch or use buttons to zoom. Tap or click an item to add a note; there is no annotate mode, and a drag still scrolls. The design subagent, `review-visuals.html`, the author guide, the examples file, and the browser checker are removed.
  ```text
  ┌──────────────────────────────┐
  │ lighten-the-loop     2 notes │
  │ Why · Changes · Decisions    │
  ├──────────────────────────────┤
  │ 1 A verb works for any work  │
  │   ┌ drawing ─── [−][Fit][+] ┐│
  │   │ fitted; pinch to zoom   ││
  │   └─────────────────────────┘│
  │ 2 …        tap ▸ [Add note]  │
  ├──────────────────────────────┤
  │ asked    one big change      │
  │ assumed  one scrolling page  │
  ├──────────────────────────────┤
  │ 2 notes        [Copy notes]  │
  └──────────────────────────────┘
  ```
- **BREAKING: A one-go `/ship` runs CI once.** When `/ship` pulls in `/apply`, `/apply` returns without a checkpoint, and `/ship` archives and then saves once. `/verify` still walks the preview before the merge, so a mistake is fixed in the same PR. One script does the merge, retarget, branch delete, and sync. The wiki catch-up that #118 rewrote stays in `/ship`.
- **A branch that leaves the main app untouched skips its Test and Deploy.** That covers docs-only changes and mini-app changes; a mini-app push runs only the changed apps' tests. The check runs inside each job, so the required `test` check still reports green. It compares the whole branch with the default branch, not only the last commit. Payload checks still run in this repo, because skill Markdown is the payload here.
- **Release 22.0.0, on top of #118 and #120.** The loop page, README, `WONG-STACK` block, OpenSpec config rules, and payload manifest describe the new loop.

**Non-goals:** a home or chat mode; connectors to email, calendar, or chat services; saving review notes to a database; rebuilding archived review pages; serving mini apps at the main app's address; porting a mini app into `app/` (an ordinary change when needed).

## Capabilities

### New Capabilities

- `work-verbs`: the verbs apply to work that changes no repo file, with the plan, record, and outward actions that such work needs.
- `mini-apps`: a requested app is built in its own folder on a separate small Worker, previewed from the agent host, saved straight to the default branch after its tests pass on the host, and listed on a generated dashboard.

### Modified Capabilities

- `request-routing` (added by #118): a verb the person invokes applies to any work, and a new standalone page takes the mini-app path instead of the full loop.
- `ux-wireframes`: the review page is one scrolling document with text visuals and decisions, tap-to-note, and no visual author or browser check.
- `ship-full-cycle`: a one-go ship has one checkpoint before its walk; a mini-app fallback PR ships with no change record and no walk.
- `delivery-gate`: `/ship` archives nothing and walks nothing for a mini-app PR, and merges with one script; a preview upload is not a gate; a mini-app direct save runs its app's tests on the host.
- `apply-completion-handoff`: `/apply` returns to `/ship` without a checkpoint when `/ship` pulled it in.
- `apply-plan-handoff`: the plan `/apply` needs depends on the kind of work.
- `ci-tests`: the test job skips the main app's suite when a branch leaves the main app untouched, and runs only the changed mini apps' tests.
- `stack-pack`: the main app's deploy is skipped when the main app is untouched; the pack adds the mini-app Worker, its host preview, its CI deploy, and its dashboard script.
- `context-economy`: the routine visual-author contract is removed, and save gains a mini-app route.

## Impact

- Skills: `explore`, `plan`, `apply`, `save`, `continue`, `ship`. `plan/references/review-author.md`, `plan/references/review-examples.html`, and `plan/scripts/check-review.js` are removed. `plan/references/review-kit.html` and `plan/scripts/build-review.mjs` are rewritten. New `ship/scripts/merge.sh` and a mini-app reference.
- CI: `.github/workflows/test.yml`, `.github/workflows/deploy.yml`, and a new core check for a branch that leaves the main app untouched.
- Stack pack: a new `mini-apps/` scaffold (Worker, config, dashboard), a new `scripts/cf-mini.sh` for its preview and deploy, and a new `wiki/stack/mini-apps.md`. Provisioning writes the mini Worker's config.
- Docs: `wiki/development/the-change-loop.md`, `wiki/agent-knowledge-center.md`, `wiki/ux-principles.md`, `README.md`, the `WONG-STACK` block, `openspec/config.yaml`, and the payload manifest.
- Tests: review, mini-app script, dashboard, main-app-untouched check, merge-script, and PR-body suites.
- Depends on #118 (`add-home-repo`, 20.0.0): this branch takes it in before it edits the files both touch.
- Targets get the new loop on their next `/wong-sync`. An active change planned in the old format keeps its page with a proposal-only refresh.

## Decision log

- **2026-09-26** — The user asked for a lighter explore, plan, apply, and ship loop, with mini apps on fast previews, closer to Grok Bot and Muse. Measured: CI takes about 80 s; the cost is the per-change overhead.
- **2026-09-26** — Asked how a mini app gets its preview URL → chose **upload from the agent host**. Production still deploys only through CI after a merge.
- **2026-09-26** — Asked what a mini app leaves before "keep it" → chose **a branch and a memory fact**, with no OpenSpec change and no PR.
- **2026-09-26** — Asked what happens to `review.html` → the user proposed a hosted review mini app. After push-back they chose **keep a single HTML file, lighter, with ASCII flowcharts instead of HTML visuals**, and **annotate without a mode**: tap an item to get a note option, while scrolling still works.
- **2026-09-26** — The user added that docs-only changes should not run the test CI → included. `test` and `payload` are required checks in the `main` ruleset, so the skip runs inside each job; a workflow-level `paths-ignore` would leave the check pending and block the merge.
- **2026-09-26** — The user added that the verbs should serve any productive work, not only building → included as `work-verbs`.
- **2026-09-26** — Asked what `/ship` means for non-code work → chose **act during `/apply` with a confirm**; `/ship` stays for repo changes.
- **2026-09-26** — Asked where a review mini app would run → superseded: the user chose to keep a single HTML file.
- **2026-09-26** — Asked how to split the work → chose **one big change**, against the recommended sequence. Tasks are grouped by area so a partial checkpoint stays coherent.
- **2026-09-26** — Asked what the review page shows → chose **Why, What Changes, and decisions** labeled asked or assumed.
- **2026-09-26** — Asked how much home mode goes in → chose **none**. The user rejects a split between home and work; the verbs now cover any work.
- **2026-09-26** — Assumed: the review page is one scrolling document instead of a panel, stage, and phone sheet, because the user asked to "still be able to scroll around" and one document is the lightest kit that works on a phone.
- **2026-09-26** — The user added that an ASCII visual must support drag to pan and zoom in and out, to see all of it → included. At the fitted zoom a drag scrolls the page; zoomed in, a drag inside the visual pans it.
- **2026-09-26** — Assumed: ASCII visuals aim for 40 columns and read top to bottom, because the user reviews on a phone. The builder warns above 60 columns.
- **2026-09-26** — Assumed: each Decision-log bullet is one decision starting with *Asked* or *Assumed*, so the page can label it without a second copy of the decisions.
- **2026-09-26** — Assumed: review notes stay copy-into-chat for now; saving them to D1 is later work.
- **2026-09-26** — Assumed: `/verify` runs only on request, because it costs a browser walk on every ship and gates nothing.
- **2026-09-26** — The user pointed at #118, about to merge → read it. It is also 20.0.0, so this change is 21.0.0. It rewrote `/ship`'s wiki catch-up on purpose, so the earlier assumption to move that step to `/improve` is dropped. Its `request-routing` keeps the verbs for code; the user now wants a verb they invoke to serve any work, so this change modifies that rule and keeps plain requests verb-free.
- **2026-09-26** — Assumed: one script replaces the merge, retarget, branch-delete, and sync steps, because they run the same way every time.
- **2026-09-26** — Assumed: "docs-only" means every changed path is under `wiki/` or `openspec/`, or ends in `.md`. The check is one core script that both workflows call.
- **2026-09-26** — Assumed: a major version, because `/ship`, `/apply`, and the review page change their contracts.
- **2026-09-26** — This plan's own page used the current kit as a baseline: the design subagent took about 8 minutes and 112k tokens for two visuals, and the browser check passed with no issues.
- **2026-09-26** — The user asked whether a mini app builds the whole `app/` (a 1M-line app would make the preview slow) and proposed a small scaffold deployed by itself → yes, the first draft built the whole app. Mini apps now live apart from the main app, on one small Worker.
- **2026-09-26** — The user asked whether this also makes `/apply` faster → yes for mini apps: no main-app build, no suite, and no CI wait before the preview. Main-app changes still build and test the whole app once.
- **2026-09-26** — Asked what "keep it" does → the user chose **a script that makes it reachable from a dashboard of every mini app made**. The dashboard is generated from each app's `app.json`, with no model step.
- **2026-09-26** — Asked where mini apps live → the user was not sure and expected them under the main app after ship. Assumed: code stays in `mini-apps/<name>/` beside `app/` and does not move at ship, because inside `app/` the main app's build, lint, and tests would scan it. The dashboard is what joins mini apps to the product. Serving them at the main app's address is later work.
- **2026-09-26** — Assumed: all mini apps share one Worker, `<repo>-mini`, with a staging twin, bound to the repo's D1 (staging for previews), as `wongos` shares `wong-db`. Pages have no build step; wrangler bundles the small Worker.
- **2026-09-26** — Assumed: keeping a mini app writes no OpenSpec change. The folder, its `app.json`, and the PR are the record, so a keep costs one PR and one short CI run. This replaces the earlier assumption that `/plan` writes a record.
- **2026-09-26** — Assumed: the host preview deploys the mini Worker's staging twin when it does not exist yet, so a new repo does not wait for CI. This touches only the mini Worker's staging twin.
- **2026-09-26** — Assumed: CI skips the main app's Test and Deploy when every changed path is docs or under `mini-apps/`, the same in-job check as docs-only, widened.
- **2026-09-26** — The user asked that a mini app keep its own tests, merged with it at keep → included. Tests live in the app's folder and run with Node's built-in runner; on a mini-app branch the `test` check runs only the changed apps' tests.
- **2026-09-26** — The user added that building a mini app should not need a PR → already the plan: the branch is pushed without a PR, and a PR opens only at "keep it", because the `main` ruleset takes changes only through a PR.
- **2026-09-26** — The user asked to keep `/verify` before the merge, to catch mistakes and fix them in the same PR → restored; this replaces the assumption that `/verify` runs only on request. `/ship` runs archive, one save, the walk, then the merge.
- **2026-09-26** — Assumed: a mini-app keep skips the walk, because a mini app has no OpenSpec scenarios, the person already used its preview, and its own tests gate the merge.
- **2026-09-26** — The user asked whether a Worker can be switched off after a while. An idle Worker costs nothing, and Cloudflare can not delete one preview alias, so the risk is exposure and clutter. Asked how previews should end → chose **expire after 7 days**: each non-production upload carries an expiry, after which the mini Worker answers 410. Kept apps never expire.
- **2026-09-26** — Asked what next → chose **implement now**.
- **2026-09-26** — Converted this change's own page to the new format as the first real use: three drawings, because this one change has three separate user-facing parts (the work paths, the mini-app flow, and the review page itself).
- **2026-09-26** — Asked (in session hallowed-jellyfish-34, relayed to this session) how a mini app should be saved → chose **straight to `main`**, like the prose route: `/save` runs the app's tests on the host, then pushes `HEAD:main` through the admin ruleset bypass; CI on `main` runs the tests again and deploys only the production mini Worker. Each save goes live on production data, so the person tries changes on the host preview first. A diff outside the app's folder or a rejected push falls back to a PR, which `/ship` merges with no change record and no walk. This replaces the `mini/<name>` branch, the try and keep forms, the keep PR as the normal path, and the `mini-<name>` fact: the folder on `main` and the dashboard are the record.
- **2026-09-26** — Assumed: `/apply` no longer saves a mini app on its own, because a save now puts the app live on production; it reports the preview and the person saves when it is right.
- **2026-09-26** — Assumed: a mini app's handler is plain JavaScript (`api.mjs`), not TypeScript, because the agent host's distro Node 22 has no type stripping and the direct save runs the tests there. `node --test` from the app's folder then works on any Node.
- **2026-09-26** — Assumed: the pack's config resolver skips `mini-apps/`, because it takes the first `wrangler.jsonc` in a subfolder, and `mini-apps` sorts before a main app in `site/` or `web/`.
- **2026-09-26** — Rehearsed on real Cloudflare from the agent host: `cf-mini.sh preview --alias rehearsal` created `wongstack-mini-staging` and uploaded a preview in 28 s; a second upload took 12 s. The dashboard, `/hello/`, and `/hello/api/greeting` answered 200, and `api.mjs`, the test file, and `routes.gen.ts` answered 404. Production `wongstack` did not change; a `wongstack-staging` deploy in the same minute came from the `server-setup-script` branch's CI, per its job log.
- **2026-09-26** — Assumed: `cf-mini.sh` uses the main app's installed wrangler when there is one, else `npx wrangler@4` with `npm_config_yes`, because a mini-only CI run skips the app's install and an unpinned `npx wrangler` would fetch whatever is newest.
- **2026-09-26** — Checkpoint: every task but the CI ones is done. 229 script tests and the app's `npm test` pass locally (Stryker 100%). Merged `origin/main` (20.1.0 incremental mutation testing, 20.1.1 qs override) before the push; this change stays 21.0.0 above them. The mini-app agent's two findings were fixed in this change: plain-JavaScript handlers, and a config resolver that skips `mini-apps/`.
- **2026-09-26** — At ship time `main` had taken #120 (team memory) as 21.0.0, so this change is renumbered to 22.0.0 above it; main's shipped release keeps its number. Merged `origin/main` and kept both sides of the setup naming table (the mini Worker and the shared memory Worker).
- **2026-09-26** — Wiki catch-up at ship: no repeatable fact left to place. The two live facts are already on their pages: `/verify` before the merge (so a failure is fixed in the same PR) in `wiki/development/the-change-loop.md`, and plain-JavaScript handlers that run on any Node in `wiki/stack/mini-apps.md`. The two open threads stay in memory.
- **2026-09-26** — Archive checkpoint: every task checked (35 of 35), the deltas were already synced into `openspec/specs/` and confirmed equal, so the archive used `--skip-specs`. Version 22.0.0.

<!-- end proposal.md -->
<!-- file design.md utf8 18703 -->
## Context

The loop has one weight class. A one-go `/ship` runs a design subagent for HTML visuals, a browser check, two `/save` checkpoints that each wait on CI, and a `/verify` walk. A `/save` is expensive because of the session it inherits (median about 220k tokens at start), so every extra checkpoint costs a full-context turn sequence. CI itself is short: Test about 80 s, Deploy about 40 s.

PR #118 (`add-home-repo`, 20.0.0) is about to merge. It adds `request-routing` (plain requests need no verb; no repo has a mode), widens the wiki to repeatable knowledge, and rewrites `/ship`'s wiki catch-up. This change builds on it and edits several of the same files: `AGENTS.md`, `README.md`, `wiki/development/the-change-loop.md`, `wiki/development/memory.md`, `wiki/agent-knowledge-center.md`, `.agents/skills/ship/SKILL.md`, and the payload manifest.

The `main` ruleset requires the `test` and `payload` checks, and allows squash merges only.

## Goals / Non-Goals

**Goals:**

- A one-go `/ship` runs CI once, then walks the preview before the merge.
- `/plan` makes its review page with no second agent and no browser.
- A mini app goes from a request to a preview URL in under a minute, and each later tweak in seconds, however large the main app is.
- An invoked verb serves non-code work without creating git or OpenSpec records.
- A branch that leaves the main app untouched (docs or mini apps) does not install, run, or deploy the main app.

**Non-Goals:**

- A home or chat mode, or any setting that selects a verb's form.
- Connectors to email, calendar, or chat services.
- Saving review notes to a database.
- Rebuilding archived review pages, or changing an active old-format page beyond a proposal-only refresh.
- Serving mini apps at the main app's address, and porting a mini app into `app/`.

## Decisions

### 1. Take #118 in first

The first task confirms #118 is on `main` and merges `origin/main` into this branch before any shared file is edited. That keeps its catch-up, `request-routing`, and wiki scope intact, and gives this change the 21.0.0 slot. The `request-routing` delta validates against #118's spec once it is on `main`.

### 2. The builder renders content; the kit adds behavior

`build-review.mjs` parses `proposal.md` in Node and writes static, escaped HTML for the Why, the numbered items with their drawings, and the Decisions. The kit's one script only adds zoom, pan, notes, drafts, and copy. The content then reads with scripts off, the parser is unit-tested without a browser, and the kit shrinks from about 710 lines to about 300.

- Format marker `<!-- wong-review:3 -->`. A page with the `:2` marker keeps its embedded viewer: the builder splices only the proposal block between the existing markers, which is today's proposal-only path. A `review-visuals.html` beside it is left in place and unused.
- Parsing rules: a bullet runs to the next bullet or a blank line outside a fence. A fence (three backticks, optional `text`) inside a bullet belongs to it. A trailing `(review.html#/…)` is stripped from the shown text. Decision-log bullets are labeled by the first word after `**YYYY-MM-DD** — `: `Asked` → asked, `Assumed` → assumed, else log.
- Diagnostics: a missing `## Why` or `## What Changes`, an unclosed fence, a fence outside a bullet, and missing kit markers are errors that keep the old page. A drawing line over 60 code points is a warning on stderr with the item and line.
- Alternative rejected: keep parsing in the browser (today). It duplicates Markdown logic in the kit and needs jsdom for every parser test.

### 3. Fit first, then zoom and pan

Each drawing sits in a frame. On load and resize, the scale is `min(1, frameWidth / drawingWidth)`, so a narrow drawing shows at full size and a wide one shows whole. The buttons step the scale by 1.25 between fit and 4. A two-pointer pinch and a Ctrl or Cmd wheel set it too. At fit, the frame has `touch-action: pan-y`, so a vertical drag scrolls the page. Past fit, it has `touch-action: none`, and a one-pointer drag translates the drawing, clamped to its edges. The frame's height follows the scaled drawing, capped at 70% of the viewport height. The page never scrolls sideways, because the frame clips.

This resolves the conflict between "drag scrolls" and "drag pans": the drawing captures a drag only after the reader has zoomed in on purpose.

### 4. Tap to note, with no mode

Every Why paragraph, item text, drawing line, and decision carries a `data-note` id. A pointer that goes down and up within 8 px and 500 ms on one of them, and not on a link, button, or input, shows a small "Add note" chip beside it. The chip opens the editor. A drag, a pinch, a wheel, or a tap on a control never shows the chip. Enter or Space on a focused element shows it too.

- Storage key `wong-review3:<change>`, so the old kit's differently shaped notes are never parsed as new ones.
- Copy format keeps its first two lines. Locations become `#/why`, `#/<n>`, and `#/decisions/<n>`.

### 5. The planning agent draws

`/plan` writes each drawing while it writes the bullet: top to bottom, about 40 columns, plain characters, inside a fenced `text` block. The author guide, the examples file, the browser checker, and the subagent step go. The `openspec/config.yaml` rules for `proposal`, `design`, and `tasks` change to match: no anchors, a screen is sketched in its bullet, and `### Review` names the items.

### 6. One checkpoint in a one-go ship

When `/ship` invokes `/apply`, it says so in the handoff, and `/apply` returns on completion instead of invoking `/save`. `/ship` then archives in the working tree, invokes `/save` once, runs `/verify` once, and merges. On the default branch, that save cuts the feature branch from the change name, as `/save` does today for a dirty default branch. The Step 1 rule "on the default branch with uncommitted changes, invoke `/save`" applies only before a pull-in, not after one.

Standalone `/apply` still saves on completion. A task-driven `/save` inside `/apply` still runs when a task needs the gate.

### 7. One merge script

`ship/scripts/merge.sh` runs today's Step 5 and Step 6: squash merge with `--match-head-commit`, confirm `MERGED`, retarget open PRs based on the branch, delete the remote branch (after `git ls-remote --exit-code --heads`), `git fetch --prune`, then fast-forward the checkout that has `main` out, or advance the `main` ref when none has it. It prints `key=value` lines for the report. Exit 0 means merged (a skipped sync is reported, not an error). Exit 1 means not merged and nothing deleted. Exit 2 means merged, but a retarget failed and the branch was kept. A test drives it with fake `gh` and `git` on `PATH`, like `wait-for-checks.test.mjs`.

### 8. Mini apps live on their own small Worker

A mini app must preview in seconds even when `app/` is a 1M-line codebase, so it never touches the main app's build.

```text
repo/
├─ app/               main app, untouched
└─ mini-apps/
   ├─ wrangler.jsonc  <repo>-mini + staging
   ├─ worker.ts       /<name>/api/* router
   └─ apps/           static assets root
      ├─ .assetsignore  *.ts
      ├─ index.html     dashboard (generated)
      ├─ routes.gen.ts  (generated)
      └─ tips/
         ├─ index.html
         ├─ app.json    title, description
         └─ api.mjs     optional handler
```

- **No build step.** A page is HTML, CSS, and plain JS modules, and a handler is plain JavaScript. wrangler bundles `worker.ts`, the generated route table, and each `api.mjs` with esbuild, which takes about a second. The generated files are git-ignored.
- **One Worker, one staging twin.** Both bind the repo's D1: production and staging, with the same ids as the main app, as `wongos` shares `wong-db`. A mini app that needs a table adds a migration to the shared `schema/migrations/`.
- **`scripts/cf-mini.sh`**, a pack script:
  - `preview [--alias <name>]` (host): `/apply` passes `--alias mini-<name>`, because a mini app has no branch of its own; without it, derive the alias from the branch and refuse the default branch. Then run `scripts/mini-dashboard.mjs`, which validates each `app.json` and writes `index.html` and `routes.gen.ts`; apply pending staging migrations; `wrangler deploy --env staging` only when the staging twin does not exist; `wrangler versions upload --env staging --preview-alias <alias>`; harvest and print the URL. It uses the same alias rule as `cf-deploy.sh`, so `mini/tips` becomes `mini-tips`.
  - `ci`: when `mini-apps/` changed, deploy staging plus the alias on a feature branch, or production on the default branch.
  - Both modes stop when the staging name resolves to the production name. They never touch `app/`.
- **Expiry.** Every non-production upload or deploy passes `--var PREVIEW_EXPIRES:<epoch ms, now + 7 days>`. `worker.ts` checks it first and answers 410 with a short "This preview expired — ask to rebuild it" page when it has passed. The production deploy passes no such var. An idle Worker costs nothing, so this is for exposure and clutter, not cost.
- **Credential.** The skill sources the primary worktree's `.env`, as [the secrets convention](../../../wiki/development/secrets.md) says.
- **Access.** Access can not gate `workers.dev`, so a preview link is public but unlisted, like the main app's previews; the seven-day expiry closes it. A repo with a custom domain adds the mini Worker's hostnames the same way as the app's; [the Access guide](../../../wiki/stack/cloudflare-access.md) says so.
- **Provisioning.** Like `app/wrangler.jsonc`, `mini-apps/wrangler.jsonc` carries live ids, so it is excluded from the payload; setup creates it from a new fragment in `stack-pack-fragments.md` with the names and the same D1 ids. This repo keeps its own real copy, so its CI can deploy the mini Worker. The first host preview creates the staging twin; the first merge creates production.
- **Save: straight to `main`.** A new `save/references/mini-app-save.md` is the second direct route beside the prose route. When the whole save diff is inside `mini-apps/apps/<name>/` and the commits ahead of `origin/main` touch only that folder:
  1. Run `(cd mini-apps/apps/<name> && node --test)` on the host. A failure stops the save with nothing pushed. A folder with no test file says so and goes on; `/apply` writes tests whenever the app has logic.
  2. Commit the folder's paths with `feat(mini): <name> — <what changed>` and push `HEAD:main`, as the prose route does. The admin ruleset bypass allows it.
  3. Report in two lines: the commit on `main`, and that the app goes live on production data at its production URL once CI deploys. No `SAVE_GATE_RESULT` line; nothing waited.

  CI on `main` runs the app's tests again (the `test` job) and deploys only the production mini Worker (§10). The route table row: the session built a mini app, and every changed path is inside one app's folder.
- **Fallback: a pull request.** A diff outside the folder (a migration under `schema/migrations/`, `mini-apps/worker.ts`, `mini-apps/wrangler.jsonc`) or a rejected push (no bypass, not fast-forward — never forced) takes save's normal PR route, with the body from `render-pr-body.mjs` in its `mini-app` mode. `/ship` on that branch skips the change selection, the archive, and the walk, invokes `/save` once to update the PR and wait for CI, and merges with `merge.sh`.
- **Tests.** `/apply` writes `mini-apps/apps/<name>/*.test.mjs` with `node:test` for the app's logic. A handler is plain JavaScript, `api.mjs`, so a test imports it directly and `node --test` runs it from the app's folder on any Node, with no install and no type stripping. (A distro Node 22 on the agent host had no type stripping, and Node 22 reads a folder argument to `--test` as a file.) The host runs them before a direct save; CI runs them after the push.
- **No branch and no fact.** `/apply` passes `--alias mini-<name>` to the preview, so no branch is needed. The folder on `main` and the dashboard are the record. `/apply` does not save on its own: a save goes live on production, so the person saves when the preview is right.
- **Later, not here.** The main app can mount `/apps/*` onto the mini Worker through a service binding, so mini apps share its address. Porting a mini app into `app/` is an ordinary change.

### 9. Non-code verbs

- `/plan` writes a numbered to-do in chat and marks outward steps with `(outward)`.
- `/apply` asks before each outward step in [the shared ask format](../../../.agents/skills/explore/references/asking-the-user.md), showing the exact payload.
- `/save` writes a `thread` fact with a topic slug.
- `/continue`'s menu adds open threads from `memory.mjs search --type thread --state conversation`, beside active changes.
- `/ship` says the work finishes in `/apply`.

`request-routing` keeps plain requests verb-free; this only defines what an invoked verb does.

### 10. The main-app-untouched check

`.github/scripts/app-untouched.sh` is core payload, so both `test.yml` (core) and `deploy.yml` (pack) can call it. The base is:

- on `pull_request`, `origin/$GITHUB_BASE_REF`;
- on a push to another branch, the merge base with `origin/<default>`;
- on a push to the default branch, `github.event.before`.

With an all-zero `before`, a failed fetch, or an empty diff, it prints `untouched=false`. Otherwise it prints `true` only when every path matches `wiki/*`, `openspec/*`, `mini-apps/*`, or `*.md`. It also prints `mini_apps=<names>`, the folders under `mini-apps/apps/` that the diff touches. When the main app is untouched, `test.yml` runs `node --experimental-strip-types --test mini-apps/apps/<name>/` for each named app, inside the same required `test` job. Both workflows check out with `fetch-depth: 0`, run it first, and gate the main app's steps on it. The job still reports, so the required check is satisfied. The mini Worker step in `deploy.yml` has its own condition (`mini-apps/` changed) and runs even when the main app is untouched. `payload.yml` does not use the check.

### 11. Release

22.0.0, with a newest-first `CHANGELOG.md` entry. `payload-files.json` adds `.github/scripts/app-untouched.sh` (core), `scripts/cf-mini.sh`, `scripts/mini-dashboard.mjs`, and `wiki/stack/mini-apps.md` (pack), and `mini-apps/` (scaffold). The plan skill directory drops three files. `scripts/fixtures/context-baseline.json` and the inventory in `scripts/measure-context.mjs` drop the visual-author route and add the mini-app save route. The main-spec Purpose lines of `ux-wireframes`, `staging-walkthrough`, and `ship-full-cycle` are edited directly, because a delta can not change a Purpose.

## UX

### Brief

- **Who:** the person who asked for the change, often on a phone, sometimes a teammate on a laptop.
- **Job:** read what will change and why, see the drawings, check each decision (above all the assumed ones), leave notes, and paste them back into `/continue`.
- **Done:** the reviewer has read every item and decision and copied their notes, or has found nothing to change.
- **Context:** opened from a file in a mobile or desktop browser, often offline, for two to ten minutes per plan.
- **Common case:** three to eight items, one or two drawings, five to twenty decisions.
- **Edge cases:** a drawing wider than the phone; no Decision log; a page refreshed after notes were saved.
- **Closest screen:** today's `review.html`; this keeps its note and copy behavior and drops its panel, stage, and sheet.

### Flow

Open the file. Scroll through Why, the items, and the decisions. Tap an item or a decision, choose "Add note", type, and save. Pinch or press + on a drawing to read a detail, drag to pan, and press Fit to return. Press Copy notes and paste the block into `/continue`.

### Hierarchy

The one primary action is Copy notes, in a bar that stays at the bottom. Item text comes before its drawing. Decisions come last, each with an `asked`, `assumed`, or `log` label in text, not color alone.

### Components

- Header with the change name, the note count, and jump links to Why, Changes, and Decisions.
- Item cards, numbered, holding the full text and an optional drawing frame with −, Fit, and + controls.
- Decision rows with a text label.
- An "Add note" chip, the note editor (beside the target on desktop, docked on a phone), numbered pins, and a notes list with Draft indicators.
- The bottom bar with the note count and Copy notes.

### Review

[review.html](review.html) shows the sketch of the new page in What Changes item 3, and the verbs' paths after this change in item 1.

## Risks / Trade-offs

- **One big diff.** → The tasks are grouped by area. A partial `/save` after each group leaves a coherent checkpoint.
- **A host upload deploys code that CI has not tested.** → Only the mini Worker's staging twin and its preview aliases. The guard blocks production, and production still deploys only from a merge.
- **Staging migrations run from the host.** → The same migrations CI would apply to the same seeded staging database. Production's database is never touched.
- **ASCII can not show a real screen layout.** → The drawings are low fidelity by design. For UI work, the mini-app preview shows the real thing.
- **A mini-app save runs tests on the host and pushes to `main` with no PR.** → This bends "nothing builds locally": for this one route, the host test run replaces the PR gate. It is scoped to one app's folder, it runs only that app's tests with no install, CI runs them again on `main`, and the app runs on its own Worker, so it can not break the main app. A save goes live on production data, so the person tries the change on the staging preview first.
- **A mini-app PR has no walk.** → Its own tests gate the merge, the person has already used its preview, and the app can not break the main app.
- **Mini apps share the main app's database.** → On purpose, as `wongos` does. Previews write only to staging. A migration from a mini app always takes the fallback PR, so a person reviews it.
- **Label parsing depends on how decisions are written.** → `/plan` writes each decision as its own bullet starting with `Asked` or `Assumed`. Anything else shows as `log`, so nothing is lost.
- **The untouched check trusts path patterns.** → A `.md` file that code reads at build time would skip tests. In WongStack's layouts, only the payload does that, and Payload checks always run in this repo. A mini app under `mini-apps/` can not change `app/`, so skipping the main app's suite for it is safe.
- **Targets with an active old-format change.** → Those pages get a proposal-only refresh and keep working. The next plan uses the new kit.

<!-- end design.md -->
<!-- file tasks.md utf8 9805 -->
## 1. Base

- [x] 1.1 Confirm #118 (`add-home-repo`) is merged to `main`. Ask the user to confirm merging `origin/main` into this branch, then merge it; resolve any conflict as the union of intent. Do this before any file that #118 touched is edited
- [x] 1.2 Re-run `openspec validate lighten-the-loop --strict --no-interactive` with #118 on the branch, so the `request-routing` delta is checked against its base spec

## 2. Review page (plan skill)

- [x] 2.1 Rewrite `.agents/skills/plan/scripts/build-review.mjs` per design §2: parse Why, What Changes with fenced drawings, and the Decision log with `asked`/`assumed`/`log` labels into static escaped HTML; write the `wong-review:3` marker; keep the proposal-only refresh for `wong-review:2` pages; report the defined errors (old page kept) and the 60-column warning; leave unchanged output untouched
- [x] 2.2 Rewrite `.agents/skills/plan/references/review-kit.html` as one scrolling page per What Changes item 3: header with jump links and note count, numbered item cards, drawing frames with fit, zoom, and pan (design §3), decisions with text labels, the tap-to-note chip with no mode (design §4), the editor beside the target or docked on a phone, pins, a notes list with drafts, and the bottom Copy notes bar. Keep the in-page script-error report and no optional chaining
- [x] 2.3 Delete `.agents/skills/plan/references/review-author.md`, `.agents/skills/plan/references/review-examples.html`, and `.agents/skills/plan/scripts/check-review.js`
- [x] 2.4 Rewrite `scripts/tests/review.test.mjs` for the builder: wrapped bullets, a fence with a blank line, a fence outside a bullet, an unclosed fence, a stripped old anchor, decision labels, a drawing holding `</script>`, identical output on rebuild, a `wong-review:2` refresh, and the wide-line warning
- [x] 2.5 Rewrite `app/review/review.test.mjs` for the kit: a still tap shows the chip; a drag, a zoom button, and a link do not; save adds a pin and a list entry; the copy block uses `#/why`, `#/<n>`, and `#/decisions/<n>`; drafts survive another target and a reload; refused storage shows the session-only notice; a wide drawing fits; zoom past fit switches the frame to pan; nothing overflows at 320 px
- [x] 2.6 Rewrite `.agents/skills/plan/SKILL.md`: no subagent and no browser check; the planning agent draws in the bullet (top to bottom, about 40 columns) and builds once; each decision is its own Decision-log bullet starting with `Asked` or `Assumed`; a non-code plan is a numbered to-do in chat with outward steps marked
- [x] 2.7 Update the `proposal`, `design`, and `tasks` rules in `openspec/config.yaml`: drawings in bullets, no anchors, screens sketched, `### Review` names items. Run `node scripts/check-openspec-config.mjs`

## 3. Apply, save, and continue

- [x] 3.1 Update `.agents/skills/apply/SKILL.md`: the plan depends on the kind of work; the non-code form works the chat to-do, asks before each outward step, and does not save; the mini-app path writes `mini-apps/apps/<name>/` with its `app.json` and tests for its logic, runs `bash scripts/cf-mini.sh preview --alias mini-<name>`, reports the URL, and leaves the save to the person, because a save goes live; when `/ship` invoked it, return on completion without a save
- [x] 3.2 Add `.agents/skills/save/references/mini-app-save.md` with its direct route and PR fallback (design §8) and its route-table row in `.agents/skills/save/SKILL.md`. Add the non-code row (a `thread` fact with a topic slug, no commit). Remove "Stage the visual input" from the review refresh step
- [x] 3.3 Add a `mini-app` mode to `.agents/skills/save/scripts/render-pr-body.mjs` (title and description from `app.json`, the summary, the preview, and a footer; no change record), with cases in its existing test
- [x] 3.4 Update `.agents/skills/continue/SKILL.md`: the menu adds open threads from `memory.mjs search --type thread --state conversation`; a chosen thread is recapped and handed to `/apply`; pasted review notes reconcile into the proposal and its drawings, with no visual input file

- [x] 3.5 Rework the mini-app save to the direct route decided on 2026-09-26: host tests, then push `HEAD:main`; a PR only as the fallback; no `mini/<name>` branch and no `mini-<name>` fact. Update the save reference and route row, `/apply` step 4, `/ship`'s mini-app section, the wiki, the block, and the changelog

## 4. Ship and verify

- [x] 4.1 Add `.agents/skills/ship/scripts/merge.sh` per design §7, with `scripts/tests/ship-merge.test.mjs` driving fake `gh` and `git`: a merge; a refused merge that deletes nothing; a failed retarget that keeps the branch; a branch GitHub deleted at merge; a dirty `main` checkout that is skipped; no `main` checkout, so the ref advances
- [x] 4.2 Update `.agents/skills/ship/SKILL.md`: the pull-in tells `/apply` it runs inside `/ship`; after it returns, archive and then one `/save`; keep the `/verify` step before the merge; Steps 5 and 6 call `merge.sh`; a mini-app fallback PR skips selection, archive, and the walk, and runs one `/save`; non-code work finishes in `/apply`. Keep #118's wiki catch-up

## 5. CI and the stack pack

- [x] 5.1 Add `.github/scripts/app-untouched.sh` per design §10, with `scripts/tests/app-untouched.test.mjs` on temporary repos: a docs-only branch; a mini-apps-only branch and its `mini_apps` names; a docs commit on top of a code commit; a default-branch push; an all-zero `before`; no reachable base
- [x] 5.2 Update `.github/workflows/test.yml`: checkout with `fetch-depth: 0`, run the check first, gate the main app's steps on it, run `node --test` in each changed mini app's folder, and write a summary line
- [x] 5.3 Update `.github/workflows/deploy.yml`: the same gate on the main app's steps, and a mini Worker step that runs `scripts/cf-mini.sh ci` when `mini-apps/` changed and publishes its preview URL like the main app's
- [x] 5.4 Add the `mini-apps/` scaffold per design §8: `wrangler.jsonc` with a staging environment and D1 placeholders, `worker.ts` (the preview expiry check first, then pages from assets and `/<name>/api/*` from the generated route table, no source served), `apps/.assetsignore`, a `.gitignore` for the generated files, and one example app with a plain-JavaScript API handler and its test
- [x] 5.5 Add `scripts/mini-dashboard.mjs` (validate each `app.json`, write `index.html` and `routes.gen.ts`) and `scripts/cf-mini.sh` (preview and ci modes per design §8), with `scripts/tests/mini-apps.test.mjs`: dashboard entries and escaping; a missing title fails with the folder name; preview refuses the default branch; the staging twin is created only when missing; the production-name guard stops everything; `ci` does nothing when `mini-apps/` did not change; every non-production upload or deploy passes a seven-day `PREVIEW_EXPIRES` and production passes none; no mode touches `app/`. Cover the Worker's 410 page for a past expiry in the same suite
- [x] 5.6 Extend provisioning (setup and the pack's Cloudflare step) to write `mini-apps/wrangler.jsonc` names and D1 ids, and add the mini Worker to `wiki/stack/cloudflare-access.md`
- [x] 5.7 Rehearse on real infrastructure: with a one-line app, run `cf-mini.sh preview --alias rehearsal` from the host, open the URL and the dashboard, and confirm that the main app's Workers did not change. Record the timing and result in the Decision log
- [x] 5.8 Pass CI on this branch through `/save`, and confirm from the job logs that Test ran the suite (the branch changes code)

## 6. Docs and the block

- [x] 6.1 Update `wiki/development/the-change-loop.md`: an invoked verb serves any work (with the non-code form), the mini-app path with its direct save, one checkpoint per one-go ship before the walk, mini-app tests, and the main-app-untouched rule under the gate. Keep #118's request-routing text
- [x] 6.2 Add `wiki/stack/mini-apps.md`: the layout, the no-build rule, preview from the host, the direct save, the fallback PR, the dashboard, shared data, and when to port an app into `app/`. Link it from `wiki/stack/README.md` and the loop page
- [x] 6.3 Update the `WONG-STACK` block in `AGENTS.md`: a plain request needs no verb; an invoked verb serves any work; a new standalone page or tool takes the mini-app path. Link the loop page
- [x] 6.4 Update `README.md`: the `/plan`, `/apply`, and `/ship` rows, mini apps under "What you get", and the review-page caption. Replace `wiki/assets/review-page.png` with a capture of a page from the new kit, or remove the image when no browser is available
- [x] 6.5 Update `wiki/agent-knowledge-center.md` ("Read the plan before it runs") and `wiki/ux-principles.md` (screens are sketched in text; a mini-app preview shows the real screen)
- [x] 6.6 After the deltas sync, edit the Purpose lines of `openspec/specs/ux-wireframes/spec.md`, `openspec/specs/ship-full-cycle/spec.md`, and `openspec/specs/request-routing/spec.md` to match

## 7. Release

- [x] 7.1 Update `.agents/skills/wong-sync/references/payload-files.json` and `payload-manifest.md`: `.github/scripts/app-untouched.sh` (core); `scripts/cf-mini.sh`, `scripts/mini-dashboard.mjs`, and `wiki/stack/mini-apps.md` (pack); `mini-apps/` (scaffold, with its generated files excluded); the plan skill's contents; the mini-app save reference
- [x] 7.2 Update the inventory in `scripts/measure-context.mjs` and `scripts/fixtures/context-baseline.json`: drop the visual-author route, add the mini-app save route. Run `node scripts/measure-context.mjs --check`
- [x] 7.3 Compare `VERSION` with `origin/main`, set it to the next major above main (22.0.0 after #120), and add a newest-first `CHANGELOG.md` entry
- [x] 7.4 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [x] 7.5 Reconcile the deltas and pass CI through `/save`

<!-- end tasks.md -->
<!-- file specs/apply-completion-handoff/spec.md utf8 2420 -->
## MODIFIED Requirements

### Requirement: Completed apply automatically checkpoints

When `/apply` completes every task in the selected change, it SHALL invoke the existing `/save` skill before reporting the workflow complete, except in two cases. When `/ship` invoked `/apply`, `/apply` SHALL return to `/ship` without invoking `/save`, because `/ship`'s archive checkpoint is the one save of that run. When the work changes no repo file, `/apply` SHALL report the result and SHALL NOT invoke `/save`, as `work-verbs` defines. The handoff SHALL delegate all sync, git, PR, preview, and CI behavior to `/save` rather than duplicating that behavior inside `/apply`.

This SHALL hold for **every payload surface that fronts the apply step**, including `.claude/skills/apply/SKILL.md`, `.claude/skills/openspec-apply-change/SKILL.md`, and `.claude/commands/opsx/apply.md`. No surface SHALL describe a completion path that ends in anything other than these outcomes — in particular, none SHALL direct the user to archive instead. Surfaces SHALL satisfy this by pointing at the one that owns the behavior rather than by each restating it, per the `payload-single-source` capability.

#### Scenario: Final pending task completes

- **WHEN** `/apply` marks the final pending task complete
- **THEN** it invokes `/save` for the completed change
- **AND** it reports completion using the checkpoint result from `/save`

#### Scenario: Apply begins with all tasks already complete

- **WHEN** `/apply` selects a change whose task list is already complete
- **THEN** it invokes `/save` so any completed but uncheckpointed work receives the normal durable handoff

#### Scenario: The raw command is used instead of the verb

- **WHEN** a user runs `/opsx:apply` and its tasks all complete
- **THEN** the completion hands off to `/save` exactly as `/apply` does
- **AND** no surface suggests archiving as the completion step

#### Scenario: A surface references a command that does not exist

- **WHEN** a payload surface directs the user to a command
- **THEN** that command exists in the payload

#### Scenario: Ship pulled apply in

- **WHEN** `/ship` invoked `/apply` and the final task completes
- **THEN** `/apply` returns to `/ship` without invoking `/save`

#### Scenario: Non-code work completes

- **WHEN** `/apply` finishes a to-do that changed no repo file
- **THEN** it reports the result and does not invoke `/save`

<!-- end specs/apply-completion-handoff/spec.md -->
<!-- file specs/apply-plan-handoff/spec.md utf8 2977 -->
## MODIFIED Requirements

### Requirement: Apply ensures an applicable plan exists

`/apply` SHALL resolve the line of work the user intends to implement before it starts. An explicit change reference SHALL take precedence, followed by the change established in the current conversation, then a unique active change modified in the current worktree or branch diff, then a change whose recorded branch or legacy name matches the current branch. A sole active change MAY be selected only when the conversation does not establish different new work.

The plan `/apply` needs SHALL depend on the kind of work. A change to the repo's existing code or process SHALL need an apply-ready OpenSpec change. A mini app SHALL need only its stated request, as `mini-apps` defines. Work that changes no repo file SHALL need the to-do in the conversation, as `work-verbs` defines.

#### Scenario: Apply follows exploration without a plan

- **WHEN** the current conversation has established implementation intent through `/explore`
- **AND** no apply-ready OpenSpec change represents that intent
- **THEN** `/apply` invokes `/plan` with the established intent
- **AND** it applies the exact change produced by that planning run

#### Scenario: Unrelated active change exists

- **WHEN** the current conversation establishes new implementation intent with no plan
- **AND** `openspec list` contains an active change for a different line of work
- **THEN** `/apply` plans the current work instead of auto-selecting the unrelated change

#### Scenario: Existing applicable plan is ready

- **WHEN** an explicit reference, current conversation, or current branch evidence resolves an apply-ready change
- **THEN** `/apply` delegates that change directly to the OpenSpec apply step
- **AND** it does not invoke `/plan` again

#### Scenario: Differently named change is in the worktree

- **WHEN** a feature branch has one changed active OpenSpec folder whose name differs from the branch
- **THEN** `/apply` selects that folder before considering an unrelated sole active change

#### Scenario: Explicit change has incomplete planning artifacts

- **WHEN** the user explicitly invokes `/apply` for an existing change that is not apply-ready
- **THEN** `/apply` invokes `/plan` to complete that same change's required artifacts
- **AND** it applies that change after the required artifacts are complete

#### Scenario: No intent can be resolved safely

- **WHEN** `/apply` has neither clear implementation intent nor an unambiguous applicable change
- **THEN** it asks the user to identify the work or change
- **AND** it does not plan or implement an inferred unrelated change

#### Scenario: A mini-app request

- **WHEN** the person asks for a new standalone page
- **THEN** `/apply` builds it without invoking `/plan`

#### Scenario: Non-code work

- **WHEN** the conversation holds a to-do for work that changes no repo file
- **THEN** `/apply` works that to-do and creates no OpenSpec change

<!-- end specs/apply-plan-handoff/spec.md -->
<!-- file specs/ci-tests/spec.md utf8 4338 -->
## MODIFIED Requirements

### Requirement: A core workflow runs the test suite in every repo

The payload SHALL ship `.github/workflows/test.yml` in the **core** category, so a repo receives a test pipeline whether or not it took the stack pack. The workflow SHALL run the repo's `test` script, discovered root-first and then in each immediate subdirectory, so a repo whose application lives in a subdirectory is covered without configuration. When no `package.json` declares a `test` script, the job SHALL print why and exit green — a real check, never a permanently red one.

**A change that leaves the main app untouched runs no suite.** When every path that a feature branch changes compared with the default branch — or, on the default branch, every path the push changed — is under `wiki/`, `openspec/`, or `mini-apps/`, or ends in `.md`, the job SHALL say so and SHALL NOT install or run the main app's suite. When such a branch changes mini apps, the job SHALL run the tests of the changed mini apps only, as `mini-apps` defines; otherwise it SHALL exit green. The comparison SHALL cover the whole branch, never only the last commit. When the comparison can not be made, the job SHALL run the suite. One core script SHALL make this decision, and the pack's deploy workflow SHALL use the same script. The skip SHALL happen inside the job, so a required `test` check still reports.

The workflow SHALL carry the same event condition the deploy workflow uses to collapse the `push`/`pull_request` double-fire, so one commit produces one test run.

`npm test` SHALL be the entire contract: any runner behind that script satisfies the job. Vitest SHALL be what the payload ships and configures by default, and SHALL NOT be required.

The pack's `deploy.yml` SHALL NOT contain a `test` job, so a pack repo runs its suite once rather than twice. The `deploy` job SHALL remain independent of the test result: a staging deploy of red code is harmless (staging is a fixture and the walk observes it), and red code cannot reach production because merges require green CI.

#### Scenario: A repo with no stack pack gets a test pipeline

- **WHEN** WongStack is synced into a repo whose `components.stackPack` is absent or false
- **THEN** `.github/workflows/test.yml` is among the files it receives
- **AND** the suite runs on the next push with no Cloudflare configuration present

#### Scenario: A pack repo runs its suite once

- **WHEN** a commit is pushed to a repo that has both workflows
- **THEN** exactly one job runs the test suite
- **AND** the deploy finishes no later than it would without it

#### Scenario: No test script is honest green

- **WHEN** a commit is pushed to a repo where no `package.json` declares a `test` script
- **THEN** the job states that no suite exists and exits green
- **AND** the check is not reported as a failure

#### Scenario: A different runner satisfies the job

- **WHEN** a repo's `test` script invokes a runner other than vitest
- **THEN** the job runs it unchanged
- **AND** nothing in the workflow assumes vitest

#### Scenario: A red suite holds the save, not the deploy

- **WHEN** the test job fails on a feature-branch push in a pack repo
- **THEN** the staging deploy still completes
- **AND** `/save`'s existing CI wait reports the failure and enters its auto-fix path, and `/ship` cannot merge until the check is green

#### Scenario: A docs-only branch

- **WHEN** a branch changes only `wiki/` pages and a `README.md`
- **THEN** the `test` check reports green with a note that the change is docs-only
- **AND** the suite is not installed or run

#### Scenario: A mini-app branch

- **WHEN** a branch changes only files under `mini-apps/apps/tips/`
- **THEN** the `test` check runs the tests in that folder and not the main app's suite

#### Scenario: A mini-app push to the default branch

- **WHEN** a direct save pushes a change under `mini-apps/apps/tips/` to the default branch
- **THEN** the `test` check on that push runs the tests in that folder

#### Scenario: A docs commit on top of code

- **WHEN** a branch's last commit changes only a `.md` file but an earlier commit on the branch changed code
- **THEN** the job runs the suite

#### Scenario: The comparison fails

- **WHEN** the job can not find the default branch to compare with
- **THEN** it runs the suite

<!-- end specs/ci-tests/spec.md -->
<!-- file specs/context-economy/spec.md utf8 3536 -->
## MODIFIED Requirements

### Requirement: Simplification reports a net instruction reduction

The completed change SHALL report before-and-after word and byte counts for a fixed inventory of core workflow skill descriptions, bodies, and linked procedure references, including removed generated instructions and new references. The inventory SHALL show a net reduction and SHALL identify shared owner documents separately. Counts of source text SHALL NOT be presented as measured runtime token savings. Generated review code, executable helpers, and historical records SHALL be accounted for separately.

The report SHALL also name required-reading inventories for ordinary active save, named-secret save, prose save, mini-app save, new-plan fallback, archived save, and cold resume. Ordinary save SHALL require less source reading than the recorded baseline. Every special-route increase SHALL be reported with its reason. Completion SHALL include behavior regression evidence and an audit that required checks remain reachable.

#### Scenario: The implementation is reviewed

- **WHEN** the simplification is reported complete
- **THEN** its evidence names the counted paths, baseline revision, before-and-after totals, and the absence of normal generated-skill handoffs
- **AND** it does not claim that all inventoried text was loaded in every session

#### Scenario: Text moves into a new reference

- **WHEN** a procedure is extracted from a skill into a new file
- **THEN** the aggregate inventory includes that file and each applicable route includes its required reading
- **AND** moving the text alone cannot count as a net instruction reduction

#### Scenario: Runtime telemetry is unavailable

- **WHEN** behavior and source-load checks pass but comparable token traces are absent
- **THEN** the change reports source-load reductions and the runtime measurement limit
- **AND** it makes no numerical claim about runtime token savings

### Requirement: Save loads conditional procedures only when applicable

The save skill SHALL expose a complete main procedure and explicit entry conditions for named-secret persistence, prose-only handling, mini-app handling, new-plan fallback, and archived handoffs. Each applicable procedure SHALL be loaded before its actions. Unconditional credential exclusion, workflow ownership, and gate-result handling SHALL remain visible in the main procedure. Extracted procedures SHALL retain all required checks.

#### Scenario: Ordinary active change checkpoint

- **WHEN** save handles an existing active change without newly named secrets or prose-only routing
- **THEN** it can complete the checkpoint without loading the unrelated conditional procedures
- **AND** it retains record maintenance, credential exclusion, PR handling, and CI result reporting

#### Scenario: More than one condition applies

- **WHEN** an archived checkpoint also includes a newly named secret
- **THEN** it loads both applicable procedures
- **AND** preserves the secret in the required durable location and does not recreate the active change

#### Scenario: A mini-app save

- **WHEN** save runs for a direct mini-app save
- **THEN** it loads the mini-app procedure and does not load the pull-request and CI-wait procedure

## REMOVED Requirements

### Requirement: Routine review authors use a focused authoring contract

**Reason**: There is no visual author; the planning agent writes text visuals in the proposal.
**Migration**: See `ux-wireframes`, "The planning agent draws the visuals in one pass".

<!-- end specs/context-economy/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 9710 -->
## MODIFIED Requirements

### Requirement: Ship delegates its checkpoint and branch gate to save

`/ship` SHALL retain its shipping-only responsibilities: verify the feature branch and default-branch state, invoke `openspec-archive-change`, merge the pull request, and delete the remote branch worktree-safely. After archiving and before merging, `/ship` SHALL invoke ordinary `/save` exactly once. When no active change matches the current branch and exactly one matching archive exists, `/save` SHALL use that archive as the handoff record, SHALL NOT author a replacement active change, and SHALL own secret preservation/redaction, session-note capture, commit, push, pull-request creation/update, and the CI wait/auto-fix path. `/ship` SHALL consume that result and SHALL NOT duplicate those checkpoint mechanics or require a special save flag. A mini-app pull request has no change to archive: `/ship` SHALL instead invoke `/save` once in its mini-app pull-request form, as `mini-apps` defines, and SHALL NOT walk it.

Between the delegated `/save` and the merge, `/ship` SHALL invoke `/verify` once as an evidence step. On `NONE`, `UNKNOWN`, or `TIMEOUT`, `/ship` SHALL report the verdict and merge on the save-gate result exactly as before. On `FAILURE` — after `/verify`'s own bounded fix loop is exhausted — `/ship` SHALL stop, present the evidence, and ask the user whether to fix or merge anyway; the user's answer, not the verdict, decides, and a merge-anyway is recorded in the ship report. When the walk's fix loop advanced HEAD, the fix's own delegated `/save` re-gated it, and `/ship` SHALL confirm the latest save-gate result is `SUCCESS` or `NONE` before merging.

The walk step SHALL check that the `walk` skill is present before invoking it. When the skill is absent, `/ship` SHALL report the walk as unavailable in one line and continue to the merge, consistent with the gate ladder's rule that a rung the repo lacks is skipped rather than failed. `/ship` SHALL NOT install, copy, or offer the skill to repair its absence.

Before deleting the merged branch from the remote, `/ship` SHALL find every open pull request that targets that branch as its base and retarget each to the default branch. Only then SHALL the branch be deleted, and the ship report SHALL name any pull request it retargeted. Deleting a base branch that an open pull request still targets closes that pull request, and the loss is unrecoverable: the forge will neither reopen a pull request whose base branch is gone nor retarget a closed one. `/ship` SHALL NOT rely on the forge retargeting dependents on its own, because that is a race with no completion signal. The merge, retarget, delete, and checkout sync SHALL run as one deterministic script.

When the forge deletes the head branch itself at merge, `/ship` SHALL still retarget every open pull request that targets the branch. It SHALL then check whether the remote still has the branch, and delete it only when it does. A branch that is already gone SHALL NOT be reported as an error; the ship report SHALL say that the forge deleted it at merge. When `/ship` cannot tell whether the branch exists, because the remote query itself fails, it SHALL stop and report that failure as for any other delete failure.

#### Scenario: Shipping checkpoints the archive through save

- **WHEN** `/ship` archives a completed change
- **THEN** it invokes ordinary `/save` once so the archive move, implementation, note, and any safe example declaration land in the pushed checkpoint
- **AND** the commit tested by the resulting CI run is the commit `/ship` will merge

#### Scenario: Save recognizes the archived branch change

- **WHEN** `/save` runs for `/ship` after `openspec/changes/<name>/` moved into the archive
- **THEN** it resolves and mirrors the single archived record matching the current branch
- **AND** it does not invoke fallback planning or create a new active `openspec/changes/<name>/`

#### Scenario: Save returns a mergeable gate result

- **WHEN** the delegated save finishes with `SUCCESS` or `NONE`
- **THEN** `/ship` proceeds through the walk evidence step and, absent a walk `FAILURE`, merges without reopening the PR or waiting on the same checks itself

#### Scenario: Save returns an unmergeable result

- **WHEN** the delegated ordinary save returns `UNKNOWN`, `TIMEOUT`, or a checkpoint failure
- **THEN** `/ship` stops before merge and reports that result
- **AND** it does not bypass, repeat, or reinterpret the gate

#### Scenario: A failed ship-time walk pauses for the user

- **WHEN** the ship-time walk returns `FAILURE` with its fix attempts exhausted
- **THEN** `/ship` stops before merging, presents the evidence, and asks whether to fix or merge anyway
- **AND** merging anyway remains available and is recorded in the report

#### Scenario: An unrunnable ship-time walk never blocks

- **WHEN** the ship-time walk returns `UNKNOWN` or `TIMEOUT`
- **THEN** `/ship` reports the walk as unverified and merges on the save-gate result alone

#### Scenario: The walk skill is not present

- **WHEN** `/ship` reaches the walk step in a repo that does not have the `walk` skill
- **THEN** it reports the walk as unavailable in one line and proceeds to the merge
- **AND** it does not install, copy, or offer the skill

#### Scenario: A dependent pull request is retargeted before deletion

- **WHEN** `/ship` merges a branch that one open pull request uses as its base
- **THEN** that pull request is retargeted to the default branch before the branch is deleted
- **AND** the ship report names the retargeted pull request

#### Scenario: No dependent pull request exists

- **WHEN** `/ship` merges a branch that no open pull request targets
- **THEN** the branch is deleted directly with no retargeting step

#### Scenario: The forge already deleted the branch at merge

- **WHEN** `/ship` merges a pull request in a repository that deletes head branches on merge
- **THEN** it retargets any open pull request that still targets the branch, skips the delete, and prints no error
- **AND** the ship report says the branch was deleted at merge

#### Scenario: A mini-app pull request

- **WHEN** `/ship` merges a mini-app pull request
- **THEN** it archives nothing, runs one `/save` in its mini-app form, runs no walk, and merges on that save's result

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate. No skill SHALL run a compile, a unit-test suite, a linter, or a type-check as a condition of saving or shipping, with one exception: the mini-app direct save runs that one app's own tests on the agent host before it pushes to the default branch, because that route has no pull request for CI to gate. CI runs those tests again after the push. Test suites run in CI (the `ci-tests` capability), where they are ordinary checks on the existing ladder.

**The boundary is building versus exercising.** Driving a browser — or issuing HTTP requests and existing-command state queries — against an already-deployed staging environment is not a local build: nothing is compiled, nothing is installed, and the artifact under test is the one CI itself published. The opt-in staging walkthrough (`staging-walkthrough`) is therefore permitted, and is bounded by three properties that keep it from becoming a local-verify gate by another name — it SHALL run only against a deployment CI has already published, it SHALL never install a dependency, and it SHALL be absent entirely unless the repo adopted it. It is reached by invoking `/verify`, or by `/ship`'s single evidence step. Its verdict SHALL NOT function as a gate rung: an unrunnable or absent walk never blocks anything, and a walk `FAILURE` at ship time is surfaced as a user decision (fix or merge anyway) rather than consulted as a merge condition.

**A mini-app preview is not a gate.** The mini-app path (`mini-apps`) uploads a preview of the mini-app Worker from the agent host. That upload SHALL NOT be a prerequisite or a condition of `/save` or `/ship`, SHALL NOT replace a CI check, and SHALL NOT deploy production.

The gate ladder is: **CI when present → merge.** A rung is skipped when its condition does not hold, and a skipped rung SHALL NOT be reported as a failure. Where no rung applies, PR review is the gate.

#### Scenario: No CI present does not trigger a local build

- **WHEN** a repo has no CI and `/ship` is invoked
- **THEN** the skill does not run a local build or test as a gate; it relies on PR review

#### Scenario: The walkthrough is not a local build

- **WHEN** an adopted repo runs `/verify`, whatever mix of browser journeys and non-browser probes its scenarios produce
- **THEN** it compiles nothing, installs nothing, and runs no unit-test suite
- **AND** it exercises the deployment CI already published rather than a locally produced artifact

#### Scenario: The walk verdict is not a gate rung

- **WHEN** an adopted repo ships and the ship-time walk is `UNKNOWN`, `TIMEOUT`, or `NONE`
- **THEN** `/ship` merges on green CI (or PR review) alone
- **AND** the walk is reported, never counted as a failed check

#### Scenario: A skipped rung is not a failure

- **WHEN** a repo has CI configured
- **THEN** `/ship` merges on green CI alone, reporting no gap

#### Scenario: A preview upload is not a gate

- **WHEN** a mini app was previewed from the agent host and the person saves it
- **THEN** the save pushes to the default branch only after the app's tests pass on the host
- **AND** production deploys from CI on the default branch, not from the host

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 7554 -->
## Purpose

Let a person get a working app from one request in under a minute, however large the main app is, try it on a preview, change it by chatting, and save it straight to production, where a dashboard lists every mini app.

## ADDED Requirements

### Requirement: A mini app lives apart from the main app

Each mini app SHALL live in its own folder, `mini-apps/apps/<name>/`, beside the main app, with a manifest `app.json` that holds at least a title and a one-line description. All mini apps SHALL run on one small Worker with a staging twin, bound to the repo's database (the staging database for previews). A mini app's pages SHALL need no build step. The main app's build, lint, and tests SHALL NOT include `mini-apps/`, and a change to a mini app SHALL NOT build the main app.

#### Scenario: A large main app

- **WHEN** the repo's `app/` holds a very large codebase and the person asks for a mini app
- **THEN** the mini app is written under `mini-apps/<name>/` and its preview builds none of `app/`

#### Scenario: A mini app stores data

- **WHEN** a mini app's API writes a row on its preview
- **THEN** the row is written to the staging database, never the production one

### Requirement: A mini-app request builds without the full loop

When the person asks for a new standalone page or small tool, `/apply` SHALL build it as a mini app, with no branch, no OpenSpec change, and no review page. It SHALL ask only when it can not act without an answer. A request that changes the main app SHALL take the full change loop.

#### Scenario: A new tool

- **WHEN** the person asks "make me a tip calculator"
- **THEN** the agent builds `mini-apps/apps/tips/` with no `/explore` round and no OpenSpec change

#### Scenario: A change to the main app

- **WHEN** the person asks to change the main app's login page
- **THEN** the agent runs the full change loop

### Requirement: A mini app carries its own tests

`/apply` SHALL write tests for a mini app's logic — its API handler and its scripts — in the app's own folder, runnable by Node's built-in test runner with no install. Before a direct save, `/save` SHALL run that app's tests on the agent host, and a failing test SHALL stop the save with nothing pushed. On a push that changes mini apps, CI SHALL run the tests of the changed mini apps only, in the required `test` check.

#### Scenario: Save an app with a failing test

- **WHEN** the person saves a mini app whose test fails on the host
- **THEN** the save stops, names the failing test, and pushes nothing

#### Scenario: Only the changed app is tested

- **WHEN** a push changes `mini-apps/apps/tips/` and no other mini app
- **THEN** CI runs the tests under `mini-apps/apps/tips/` and no other suite

### Requirement: The mini-app preview comes from the agent host

After each build of a mini app, `/apply` SHALL upload a preview of the mini-app Worker from the agent host and SHALL report the preview URL without waiting for CI. When the mini Worker's staging twin does not exist yet, the upload SHALL create it first. When the upload can not run — no stack pack or no credential — `/apply` SHALL state the reason in one line. `/apply` SHALL NOT save on its own: saving puts the app live on production, so the person saves when the preview is right.

#### Scenario: Change the app by chatting

- **WHEN** the person asks for a different color on a mini app that has a preview
- **THEN** `/apply` uploads again and reports the new preview URL within seconds, with no CI wait

#### Scenario: The first mini app in a repo

- **WHEN** the mini Worker's staging twin does not exist
- **THEN** the first preview upload creates it and then uploads the preview

### Requirement: A mini-app preview expires

Every non-production upload or deploy of the mini-app Worker SHALL carry an expiry time seven days after the upload. After that time, the Worker SHALL answer every request on that version with HTTP 410 and a short page that says the preview expired and how to get a new one. A new upload SHALL carry a new expiry. The production mini Worker SHALL carry no expiry.

#### Scenario: An old preview link

- **WHEN** someone opens a mini-app preview eight days after its upload
- **THEN** the response is 410 with the expired page, and the app is not served

#### Scenario: A saved app

- **WHEN** a saved mini app is opened on the production mini Worker months later
- **THEN** it is served normally

#### Scenario: A rebuild renews it

- **WHEN** the person asks to rebuild an expired mini app
- **THEN** the new upload serves the app for another seven days

### Requirement: A mini app saves straight to the default branch

When a save's whole diff is inside one app's folder, `mini-apps/apps/<name>/`, `/save` SHALL run that app's tests on the agent host, then commit and push to the default branch, with no branch, no pull request, and no CI wait. This is a direct route like the prose route, and it SHALL have the same limits: the pushed commits hold only that folder, and a rejected push is never forced. CI on the default branch SHALL run the app's tests again and deploy only the production mini Worker. The save SHALL say that the app is now live on production and uses production data. The folder on the default branch and the dashboard SHALL be the record; no memory fact is needed for the app.

#### Scenario: Save a mini app

- **WHEN** the person saves `mini-apps/apps/tips/` and its tests pass on the host
- **THEN** one commit is pushed to the default branch, and the save reports the app as live on production
- **AND** no branch or pull request is created

#### Scenario: The diff leaves the folder

- **WHEN** a mini-app save also changes a file under `schema/migrations/`, `mini-apps/worker.ts`, or `mini-apps/wrangler.jsonc`
- **THEN** the save takes the normal route with a branch and a pull request

#### Scenario: The push is rejected

- **WHEN** the push to the default branch is rejected, because the person can not bypass the rules or the branch moved
- **THEN** the save does not force it and takes the normal route with a pull request

### Requirement: A mini-app pull request merges through the short path

When a mini-app save fell back to a pull request, `/ship` SHALL merge it with no OpenSpec change, no archive, and no walk, on its CI result. The pull request body SHALL come from the app's `app.json`. Production SHALL receive a mini app only through a push or a merge to the default branch, never from the agent host.

#### Scenario: A mini app with a migration

- **WHEN** a mini app's save added a migration and fell back to a pull request
- **THEN** `/ship` merges it after CI runs the app's tests, with no OpenSpec change and no walk
- **AND** the production mini Worker deploys from the merge, not from the host

### Requirement: A dashboard lists every mini app

A script SHALL build the mini Worker's dashboard page from the `app.json` of each folder under `mini-apps/`, each time the mini Worker is uploaded or deployed, with no model step. Each entry SHALL show the title and description and link to the app. The production dashboard SHALL therefore list every saved mini app, and a preview's dashboard SHALL also list the app being previewed.

#### Scenario: A saved app appears

- **WHEN** a mini app reaches the default branch
- **THEN** the production dashboard lists it with its title, description, and link

#### Scenario: A malformed manifest

- **WHEN** a folder's `app.json` is missing a title
- **THEN** the script names the folder and fails the upload or deploy

<!-- end specs/mini-apps/spec.md -->
<!-- file specs/request-routing/spec.md utf8 1365 -->
## MODIFIED Requirements

### Requirement: Plain requests are done directly

In every repo, the agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round. It SHALL ask only when it can not act without an answer. It SHALL start the change loop on its own only when a request changes the repo's existing code or process. A request for a new standalone page or small tool SHALL take the mini-app path that `mini-apps` defines. When the person invokes a verb, the verb SHALL serve the work whatever its kind, as `work-verbs` defines. The rule SHALL live in the `WONG-STACK` block.

#### Scenario: An errand

- **WHEN** the person asks for the opening hours of a shop
- **THEN** the agent finds them and answers, with no `/explore` round and no OpenSpec change

#### Scenario: A code change

- **WHEN** the person asks to change how the repo's app stores data
- **THEN** the agent runs the change loop, starting at `/explore`

#### Scenario: A mini app

- **WHEN** the person asks for a new page that tracks their runs
- **THEN** the agent builds it on the mini-app path, with no `/explore` round, and reports a preview URL

#### Scenario: A verb for non-code work

- **WHEN** the person invokes `/plan` for their week
- **THEN** the agent writes a to-do in the conversation and creates no OpenSpec change

<!-- end specs/request-routing/spec.md -->
<!-- file specs/ship-full-cycle/spec.md utf8 8890 -->
## ADDED Requirements

### Requirement: A one-go ship checkpoints once

When `/ship` pulls in `/apply`, `/apply` SHALL return to `/ship` on completion without invoking `/save`. `/ship` SHALL then archive the change in the working tree and invoke ordinary `/save` exactly once, which creates the feature branch when the work is still on the default branch. A one-go run SHALL therefore have one checkpoint and one CI run before its walk. The ship-time `/verify` SHALL still run once before the merge, and its `FAILURE` pause SHALL still ask the user. The pulled-in stage SHALL otherwise change nothing in the `apply-plan-handoff` and `delivery-gate` contracts. The change loop page SHALL state the one rule every verb follows: when its precondition is missing, invoke the verb before it to produce it.

#### Scenario: One checkpoint in a one-go run

- **WHEN** `/ship <intent>` runs the full chain to merge
- **THEN** only the `/save` after the archive runs, and CI runs once
- **AND** `/ship` merges only on that checkpoint's `SUCCESS` or `NONE`

#### Scenario: A red walk still pauses

- **WHEN** the ship-time `/verify` returns `FAILURE` inside a one-go run
- **THEN** `/ship` stops and asks the user whether to fix or merge anyway

#### Scenario: Standalone apply still saves

- **WHEN** the person invokes `/apply` directly and every task completes
- **THEN** `/apply` invokes `/save` as `apply-completion-handoff` defines

#### Scenario: A reader looks up the chain rule

- **WHEN** a reader opens the change loop page
- **THEN** it states that each verb invokes the verb before it when its precondition is missing
- **AND** it shows the nesting `/ship` → `/apply` → `/plan` → `/explore`

### Requirement: A mini-app pull request ships without a change record

When `/ship` runs on a branch whose pull request came from a mini-app save — the session says so, or the body is in the renderer's mini-app mode — and whose diff stays under `mini-apps/` and `schema/migrations/`, it SHALL NOT look for, write, or archive an OpenSpec change. It SHALL invoke `/save` once in its mini-app pull-request form, which updates the pull request and waits for CI, SHALL NOT invoke `/verify`, and SHALL merge on that result. On any other branch with no change record, `/ship` SHALL stop and report it as before.

#### Scenario: Merge a mini-app pull request

- **WHEN** the person asks to ship a mini-app pull request that added a migration
- **THEN** `/ship` runs one `/save` and merges on its gate result
- **AND** no OpenSpec change is created or archived, and no walk runs

#### Scenario: An unknown branch without a record

- **WHEN** `/ship` runs on a branch with commits, no change record, and no mini-app pull request
- **THEN** `/ship` stops and reports that the branch has no change record

## MODIFIED Requirements

### Requirement: Ship pulls in apply when there is nothing to ship

When `/ship`'s preflight finds nothing to ship — the current branch is the default branch, or the branch has no commits ahead and a clean tree — `/ship` SHALL invoke `/apply` before its own runbook, in one of two forms:

- **An argument was given.** `/ship` SHALL hand the argument to `/apply` verbatim.
- **No argument was given.** `/ship` SHALL invoke `/apply` with no argument when `/apply`'s resolve order selects a change the user named, a change created or discussed in this session, or a unique active change evidenced by the current worktree or branch diff, recorded for the branch, or matching the branch by legacy convention — or when no change exists yet and the session states clear implementation intent. Where resolution would instead fall through to the sole-active-change fallback that the conversation does not establish, or to no resolvable intent, `/ship` SHALL stop and SHALL state that it found nothing to continue.

`/ship` SHALL resolve nothing itself: the test is a question about which item of `/apply`'s existing resolve order applies, and `/ship` SHALL NOT implement a second intent resolver or override `/apply`'s ordering. `/apply` SHALL resolve the work under its existing rules, invoking `/plan` when no apply-ready change exists and implementing the tasks, and SHALL return to `/ship` on completion without a checkpoint. `/ship` SHALL then continue to its archive step in the same working tree. The `/ship` invocation SHALL authorize the whole chain — explore, plan, implement, archive, save, merge — with no re-prompt between stages, whether or not an argument was given.

#### Scenario: Ship from the default branch with an intent

- **WHEN** the user invokes `/ship <description>` on the default branch
- **THEN** `/ship` invokes `/apply` with that description
- **AND** after `/apply` completes, `/ship` archives the change, runs one `/save` that creates the branch, and merges

#### Scenario: Ship with an existing change name

- **WHEN** the user invokes `/ship <name>` where `<name>` is an active change with no branch commits yet
- **THEN** `/apply` resolves that change under its existing rules and works its tasks
- **AND** `/ship` continues once `/apply` has completed

#### Scenario: Bare ship continues what the session explored

- **WHEN** the user invokes `/ship` with no argument on a clean branch, in a session where `/explore` or `/plan` has already established the line of work
- **THEN** `/ship` invokes `/apply` with no argument and names the intent it is continuing
- **AND** the chain runs to merge without the user restating that intent as an argument

#### Scenario: Bare ship on the default branch

- **WHEN** the user invokes `/ship` with no argument on the default branch, in a session that establishes no line of work
- **THEN** `/ship` stops as it does today
- **AND** it does not invoke `/apply`

#### Scenario: Bare ship on the default branch after exploring

- **WHEN** the user invokes `/ship` with no argument on the default branch, in a session that has established the line of work
- **THEN** `/ship` invokes `/apply`, which returns on completion without a checkpoint
- **AND** `/ship` archives the change, and its one `/save` cuts the branch

#### Scenario: Bare ship with nothing in the conversation stops

- **WHEN** the user invokes `/ship` with no argument in a session that establishes no line of work, and the repo has one or more active changes
- **THEN** `/ship` stops without invoking `/apply`
- **AND** it reports that it found nothing to continue, rather than selecting an active change

#### Scenario: Ship on a branch that already has work

- **WHEN** the user invokes `/ship` with or without an argument on a feature branch with commits ahead or a dirty tree
- **THEN** `/ship` selects the unique change evidenced on that branch regardless of its name
- **AND** it runs its archive steps on that selected change without invoking `/apply` from the preflight

#### Scenario: A reader looks up the rule

- **WHEN** a reader opens the change loop page or the repo's verbs rule
- **THEN** the rule is stated without conditioning it on an argument
- **AND** the nesting `/ship` → `/apply` → `/plan` → `/explore` reads as one uniform rule, with the cold-session stop named as its one exception

### Requirement: Ship completes an unfinished change rather than archiving it

Before archiving, `/ship` SHALL read the change's `tasks.md`. When it has unchecked tasks, `/ship` SHALL invoke `/apply` for that exact change to finish them, `/apply` SHALL return without a checkpoint, and `/ship` SHALL re-check. `/ship` SHALL NOT archive an incomplete change. `/ship`'s standing authorization SHALL NOT extend to the archive step's incomplete-task confirmation: that confirmation SHALL reach the user, or the guard SHALL have already removed the condition that raises it. When `/apply` ends with tasks still pending, `/ship` SHALL report that work and stop before the archive.

#### Scenario: A planned but unimplemented change is finished first

- **WHEN** `/ship` runs on a branch whose change has unchecked tasks
- **THEN** `/ship` invokes `/apply` for that change before its archive step
- **AND** it archives only after every task is checked

#### Scenario: The archive's confirmation is never auto-answered

- **WHEN** the archive step would warn about incomplete tasks and ask the user to confirm
- **THEN** `/ship`'s "don't re-prompt" authorization does not answer that confirmation on the user's behalf
- **AND** no archive, checkpoint, or merge occurs on the incomplete state

#### Scenario: A complete change archives unchanged

- **WHEN** `/ship` runs on a branch whose change has every task checked
- **THEN** the guard adds no step and the archive, the one checkpoint, the walk, and the merge run

## REMOVED Requirements

### Requirement: The chain composes with the existing contracts

**Reason**: A one-go run no longer has two checkpoints.
**Migration**: See "A one-go ship checkpoints once".

<!-- end specs/ship-full-cycle/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 3418 -->
## ADDED Requirements

### Requirement: The main app is not deployed when it is untouched

The pack's deploy job SHALL use the core check that `ci-tests` defines. When the branch leaves the main app untouched, the job SHALL skip the main app's migration, build, and deploy and say so. A merge to the default branch that leaves the main app untouched SHALL NOT redeploy the production main app.

#### Scenario: A docs-only branch

- **WHEN** a branch changes only `wiki/` and `openspec/` files
- **THEN** the deploy check is green and no main-app staging deploy or preview upload runs

#### Scenario: A mini-app push

- **WHEN** a push to the default branch changes only files under `mini-apps/`
- **THEN** the production main app is not redeployed

### Requirement: The pack ships the mini-app Worker

The pack SHALL ship a `mini-apps/` scaffold: a Worker config with a staging environment, a small Worker that serves each app's pages and routes `/<name>/api/*` to that app's optional handler, and a dashboard script. Provisioning SHALL write the mini Worker's name and database bindings with real ids, for production and staging. The mini Worker SHALL NOT serve its own source or config as static files.

#### Scenario: A fresh install

- **WHEN** setup provisions a repo
- **THEN** `mini-apps/` exists with its config bound to the repo's production and staging databases

#### Scenario: Source stays private

- **WHEN** a client requests a mini app's `api.mjs`, a test file, or the Worker config by path
- **THEN** the Worker does not return the file's contents

### Requirement: The mini-app script previews from the host and deploys in CI

The pack SHALL ship one script for the mini Worker, byte-identical across repos. In preview mode, run outside CI with a Cloudflare credential, it SHALL build the dashboard, apply pending staging migrations, create the staging twin when it does not exist, upload a preview version under an alias for the current branch, and print the preview URL. The caller MAY name the alias; without a named alias, it SHALL derive the alias from the current branch and SHALL refuse the default branch. In CI, it SHALL deploy the mini Worker's staging twin with a preview alias on a feature branch and the production mini Worker on the default branch, only when `mini-apps/` changed. It SHALL fail closed when the resolved staging name equals the production name. It SHALL never deploy the main app.

#### Scenario: Upload from the agent host

- **WHEN** the agent runs the preview mode with the alias `mini-tips` and a credential
- **THEN** a preview version is uploaded under the `mini-tips` alias and its URL is printed
- **AND** the production mini Worker and the main app are unchanged

#### Scenario: On the default branch

- **WHEN** the preview mode runs on the default branch with no named alias
- **THEN** it refuses and uploads nothing

#### Scenario: A named alias on the default branch

- **WHEN** the agent runs the preview mode with the alias `mini-tips` on the default branch
- **THEN** the preview uploads under `mini-tips`

#### Scenario: A push that saves a mini app

- **WHEN** a push to the default branch changes `mini-apps/`
- **THEN** CI deploys the production mini Worker

#### Scenario: A staging config named like production

- **WHEN** the mini Worker's staging environment resolves to the production name
- **THEN** the script stops before any upload or deploy

<!-- end specs/stack-pack/spec.md -->
<!-- file specs/ux-wireframes/spec.md utf8 26986 -->
## ADDED Requirements

### Requirement: The page is one scrolling review

`review.html` SHALL be one vertically scrolling document. In order, it SHALL show the change name and the saved-note count, the proposal's Why, the What Changes items numbered with each item's full text and its visual when it has one, and the Decisions. Decisions SHALL list each bullet of the proposal's `## Decision log`, labeled `asked` when its text after the date starts with "Asked", `assumed` when it starts with "Assumed", and `log` otherwise. A short jump list at the top SHALL link the three sections. The page SHALL have no side panel, no stage, no Previous or Next control, and no change-list sheet.

#### Scenario: Open the page on a phone

- **WHEN** a reviewer opens `review.html` at a width of 320px
- **THEN** Why, the numbered What Changes items, and the Decisions follow in one vertical order
- **AND** nothing makes the page scroll sideways

#### Scenario: Decisions are labeled

- **WHEN** the Decision log holds an "Asked … → chose …" bullet and an "Assumed …" bullet
- **THEN** the Decisions section shows them labeled `asked` and `assumed`

#### Scenario: No Decision log yet

- **WHEN** the proposal has no `## Decision log` section
- **THEN** the Decisions section says that no decision is recorded

### Requirement: A visual is a narrow text drawing

A What Changes visual SHALL be a fenced `text` code block inside its bullet in `proposal.md`, drawn with plain characters by the agent that writes the proposal. The planning guidance SHALL ask for drawings that read top to bottom and are about 40 columns wide. The builder SHALL warn, naming the item and line, when a visual line is wider than 60 columns, and SHALL still build the page. The page SHALL show each visual inside its item.

#### Scenario: A drawing in a bullet

- **WHEN** a What Changes bullet contains a fenced `text` block
- **THEN** the page shows that drawing inside that item, with its characters and spacing unchanged
- **AND** the same block reads as a drawing where a Markdown renderer shows `proposal.md`

#### Scenario: A wide line

- **WHEN** a drawing has a line of 72 columns
- **THEN** the builder warns with the item number and line and still writes the page

### Requirement: A visual can be panned and zoomed

Each visual SHALL open fitted to its frame's width, so the whole drawing shows. Zoom-in, zoom-out, and Fit buttons, a pinch, and a Ctrl or Cmd wheel SHALL change its zoom within fixed bounds. While the drawing is zoomed past fit, a drag inside its frame SHALL pan it. At fit, a drag SHALL scroll the page. A frame SHALL NOT make the page scroll sideways.

#### Scenario: A wide drawing on a phone

- **WHEN** a reviewer opens an item whose drawing is wider than the screen
- **THEN** the drawing shows whole, fitted to its frame

#### Scenario: Zoom in and pan

- **WHEN** the reviewer pinches out on the drawing and then drags inside its frame
- **THEN** the drawing grows and the drag moves it inside the frame
- **AND** the page does not scroll with that drag

#### Scenario: Back to fit

- **WHEN** the reviewer presses Fit
- **THEN** the whole drawing shows again and a drag scrolls the page

### Requirement: The PR body links the review page

The PR body that `/save` regenerates SHALL carry a `## Review` section linking `openspec/changes/<name>/review.html` on the branch when the file exists, saying to open it, annotate, and paste the notes into `/continue`, and SHALL omit the section when it does not. Tasks SHALL NOT need review anchors.

#### Scenario: The PR body links the file

- **WHEN** `/save` regenerates the PR body for a change with `review.html`
- **THEN** the body has a `## Review` section whose link resolves to the file on the branch

#### Scenario: No wireframe on the branch

- **WHEN** `/save` regenerates the PR body for a change without `review.html`
- **THEN** the body has no `## Review` section

### Requirement: The page is built from a fixed kit and the proposal

The plan skill SHALL ship one review kit that owns the page layout, the visual frame with its zoom and pan, and the notes, drafts, and copy behavior. The agent that writes the proposal SHALL write only proposal text, including its text visuals. There SHALL be no separate visual author, visual input file, or design subagent. Shared tooling SHALL assemble the kit and the current proposal into a standalone page. The kit and assembly tooling SHALL reach every repo that installs the plan skill.

#### Scenario: Two changes look alike

- **WHEN** two changes produce review files from the kit
- **THEN** both have the same layout, frames, and note controls and differ only in their proposal content

#### Scenario: The kit installs with the skill

- **WHEN** a target installs or updates the plan skill
- **THEN** the shared kit and assembly tooling arrive together

#### Scenario: No subagent draws

- **WHEN** `/plan` produces a review page
- **THEN** the visuals come from the proposal the planning agent wrote, and no other agent was started to draw them

### Requirement: A bullet carries its visual

A What Changes bullet's visual SHALL be the fenced text block inside that bullet. A bullet MAY wrap across lines: the page SHALL read each bullet as the whole list item and show its text in full. A line that follows a bullet with no blank line between SHALL belong to that bullet, whether or not it is indented. A fenced block inside a bullet SHALL belong to it, and a blank line inside the fence SHALL NOT end the bullet. A blank line outside a fence SHALL end the bullet, so a paragraph below the list SHALL stay a paragraph. A trailing `(review.html#/…)` anchor from an older plan SHALL be hidden from the shown text. Each item SHALL be addressable by the fragment `#/<n>`, where `n` is its number.

#### Scenario: A bullet wraps across lines

- **WHEN** a bullet is hard-wrapped across several lines, indented or not
- **THEN** the page shows one item carrying its full text, and no continuation line appears below the list

#### Scenario: A drawing with a blank line

- **WHEN** a fenced drawing inside a bullet contains a blank line
- **THEN** the whole drawing stays in that item

#### Scenario: A paragraph below the list

- **WHEN** a blank line separates the `**Non-goals:**` paragraph from the last bullet
- **THEN** the paragraph renders below the list and the item count is unchanged

#### Scenario: An older anchor

- **WHEN** a bullet ends with `(review.html#/list/empty)`
- **THEN** the item's shown text omits that anchor

#### Scenario: A direct link

- **WHEN** the file opens at `review.html#/3`
- **THEN** the page scrolls to item 3

### Requirement: A tap on an item offers a note

`review.html` SHALL have no annotate mode. A tap or click without movement on the Why text, an item's text, a line of a visual, or a decision SHALL show an "Add note" option at that element; choosing it SHALL open the note editor for that element. A drag, a pinch, a wheel, or a tap on a link or control SHALL keep its normal action and SHALL NOT show the option. The editor SHALL appear beside the target on desktop without covering it, and SHALL dock at the bottom on a phone. Saving SHALL attach a numbered pin to the element and add the note to the notes list. Saved notes SHALL persist across reloads on the same machine, keyed by change name, and SHALL NOT be written to any repository file. A copy action SHALL place on the clipboard a block whose first line is `/continue <change-name>`, whose second line is `Review notes from review.html (<n>):`, and which then carries one numbered line per saved note as `<location> · <element label> — <text>`, where the location is `#/why`, `#/<n>`, or `#/decisions/<n>`. A pin whose element no longer matches its saved label SHALL be shown as possibly moved.

#### Scenario: Tap an item

- **WHEN** the reviewer taps the text of item 2 without moving
- **THEN** an "Add note" option appears at that text
- **AND** choosing it opens the editor for item 2

#### Scenario: Scroll across an item

- **WHEN** the reviewer drags across item 2 to scroll
- **THEN** the page scrolls and no "Add note" option appears

#### Scenario: Use a zoom control

- **WHEN** the reviewer taps a visual's zoom-in button
- **THEN** the drawing zooms and no "Add note" option appears

#### Scenario: Notes survive a reload

- **WHEN** the reviewer reloads the file
- **THEN** every saved note and pin is still there

#### Scenario: The notes are copied

- **WHEN** the reviewer activates Copy notes with two notes saved
- **THEN** the clipboard holds a block starting with `/continue <change-name>` and two numbered lines, each with a location, an element label, and the text

### Requirement: The scrolling page works on a phone

Below a phone-width breakpoint, `review.html` SHALL show its content at full width with no horizontal page overflow. Visuals SHALL fit their frames and zoom as defined above. The note editor SHALL dock to the bottom of the screen with a text field of at least 16px. A bar with the saved-note count and Copy notes SHALL stay reachable while the reviewer scrolls. Text, long tokens, visuals, and note controls SHALL fit from 320px upward. With the editor and the keyboard open, the reviewer SHALL still be able to scroll to the relevant content and reach Save and Discard.

#### Scenario: Opened on a phone

- **WHEN** the file is opened at a phone width
- **THEN** the content fills the width, nothing scrolls sideways, and Copy notes is reachable

#### Scenario: A note on a phone

- **WHEN** the reviewer taps an element at phone width and chooses "Add note"
- **THEN** the editor docks to the bottom of the screen and the keyboard does not zoom the page

#### Scenario: Edit with the phone keyboard open

- **WHEN** a reviewer edits a note with the phone keyboard open
- **THEN** the draft text, Save, and Discard remain reachable
- **AND** the reviewer can scroll the review content without losing the draft

### Requirement: Each item's text and visual stay together

New review pages SHALL use normal vertical scrolling. Each item's number, text, and visual SHALL stay together in one group. A token too wide for its column — a path, an identifier, a URL — SHALL wrap in text rather than be clipped or hidden, at every width. A visual SHALL never widen the page. Short content SHALL NOT require an artificial screen-height blank area.

#### Scenario: A bullet names a long path

- **WHEN** a What Changes item contains a path wider than its column
- **THEN** the path wraps onto the next line and every character stays readable

#### Scenario: A short item

- **WHEN** a reviewer reads a short item with a small drawing
- **THEN** its text and drawing stay adjacent with no reserved blank area below

### Requirement: The builder names mechanical defects

The builder SHALL report, naming the item and line: a missing `## Why` or `## What Changes` section, an unclosed fence, a fenced block outside any bullet, and a kit without its markers, each as an error that keeps the previous output. It SHALL report a visual line wider than 60 columns as a warning. A clean build SHALL NOT be reported as proof that the visuals explain the change.

#### Scenario: An unclosed fence

- **WHEN** a bullet opens a fenced block and never closes it
- **THEN** the builder names the item, writes nothing, and keeps the previous page

#### Scenario: A valid build still shows the wrong change

- **WHEN** the build passes but a drawing does not explain its bullet
- **THEN** the reviewer annotates the drawing on the page
- **AND** the copied notes return to the change through `/continue` before implementation

### Requirement: The planning agent draws the visuals in one pass

`/plan` SHALL write the visuals itself while it drafts the proposal, then assemble the page once. It SHALL NOT start a visual author, a critic pass, a revision round, or a browser check. On a plan update it SHALL rebuild the page from the current proposal.

#### Scenario: A plan is drafted

- **WHEN** `/plan` reaches an apply-ready state
- **THEN** the page was assembled from the proposal the planning agent wrote
- **AND** no other agent and no browser ran for it

#### Scenario: A plan is updated

- **WHEN** `/plan` re-enters an existing change and edits its proposal
- **THEN** the page is rebuilt from the current proposal

## MODIFIED Requirements

### Requirement: A UI-bearing change carries one wireframe file

Every change `/plan` drafts SHALL carry `openspec/changes/<name>/review.html`. The file SHALL be self-contained: it SHALL load no script, style, font, or image from a network address, so it renders when opened from disk with no server. A change that adds or restructures a user-facing screen SHALL sketch that screen as a low-fidelity text drawing in the bullet that owns it, and SHALL keep a `## UX` section in `design.md`. A UI-less change SHALL have no `## UX` section and SHALL still have the file.

#### Scenario: A screen is added

- **WHEN** `/plan` drafts a change whose design adds a page or component
- **THEN** `review.html` exists when the plan is apply-ready and shows a text sketch of that screen in its item
- **AND** the file is committed and archived with the change like `design.md`

#### Scenario: The file opens from disk

- **WHEN** a reviewer opens `review.html` from a clone with no server running and no network
- **THEN** every section and visual renders and the zoom and note controls work

#### Scenario: A UI-less change

- **WHEN** `/plan` drafts a worker-only, CLI, library, or prose change
- **THEN** `review.html` exists and `design.md` has no `## UX` section

### Requirement: The proposal text is resynced by `/save`

The generated page SHALL contain the proposal's current Why, What Changes, and Decision log, and SHALL render paragraphs, lists, bold, inline code, links, and text visuals. Plan and save SHALL use one shared refresh implementation. A missing or invalid input SHALL be reported as an error, and the last output SHALL be kept. A change without a page SHALL be reported and left untouched. New plans SHALL always include a page.

#### Scenario: The proposal changes after the file was written

- **WHEN** What Changes is edited during implementation and save runs
- **THEN** the page shows the proposal's current Why, What Changes, and Decisions

#### Scenario: A decision is appended

- **WHEN** save appends a Decision-log bullet
- **THEN** the refreshed page lists it in Decisions

#### Scenario: A current-format refresh fails

- **WHEN** the proposal is missing or has no `## What Changes` section
- **THEN** refresh keeps the last output and reports the failure

#### Scenario: No file or no markers

- **WHEN** save runs for a change without a page
- **THEN** the page is not created, and the checkpoint reports the limitation and proceeds

### Requirement: The copied block is a `/continue` instruction

When continue receives an instruction beginning with `Review notes from review.html`, it SHALL reconcile those notes into the affected existing artifacts using CLI-provided paths before implementation. It SHALL record which notes changed what or why a note was declined. It SHALL refresh the review through the shared assembly path and SHALL NOT depend on a generated update skill.

#### Scenario: A review block is pasted

- **WHEN** a reviewer runs continue for a change with a copied review block
- **THEN** the affected proposal (including its visuals), design, specs, and tasks are reconciled before implementation resumes
- **AND** the Decision log records the disposition and the review shows the accepted changes

### Requirement: Unfinished feedback remains a draft

The page SHALL keep unfinished note text separate from saved notes and attached to its target. Scrolling, zooming, closing the editor, or starting a note on another target SHALL retain nonempty drafts. The target and the notes list SHALL show an actionable Draft indicator. Save SHALL commit the draft as a note and remove its draft status. Discard SHALL remove only the draft. Copy notes SHALL include saved notes only, in the existing copy format. Editing a saved note SHALL keep its saved content until the reviewer saves the edit. Empty drafts SHALL NOT appear as notes or drafts.

Drafts SHALL persist across reloads in the same browser when storage is available. If storage is unavailable, they SHALL stay usable during the session and the note controls SHALL state that they are session-only. A draft whose target no longer resolves SHALL stay accessible with a moved-target indication and SHALL NOT attach to another target. Notes and drafts SHALL NOT be written to repository files.

#### Scenario: Leave an unfinished note

- **WHEN** a reviewer types a note on item 2 and starts a note on item 4 without saving
- **THEN** item 2 shows a Draft indicator and its text is kept
- **AND** typing in the second editor does not change the first draft

#### Scenario: Change state or target

- **WHEN** a reviewer types a draft, zooms a visual, and starts a note on another target
- **THEN** the first draft remains available on its original target

#### Scenario: Copy with saved notes and drafts

- **WHEN** a reviewer copies with two saved notes and one draft
- **THEN** the copied count is two and only the saved notes are included

#### Scenario: Copy an unsaved edit

- **WHEN** a reviewer changes the text of a saved note but copies before saving that edit
- **THEN** the copy contains the previously saved text
- **AND** the unsaved edit remains a draft

#### Scenario: Save a draft

- **WHEN** a reviewer saves a draft
- **THEN** it becomes a saved note and its Draft indicator clears

#### Scenario: Discard an edit

- **WHEN** a reviewer discards a draft edit to an existing note
- **THEN** the draft clears and the saved note remains unchanged

#### Scenario: Reload with a draft

- **WHEN** browser storage is available and the reviewer reloads after typing an unfinished note
- **THEN** its text and target are recoverable from the draft list

#### Scenario: A draft target changes

- **WHEN** a page refresh changes or removes the target of a retained draft
- **THEN** the draft text stays accessible with a moved-target indication
- **AND** it is not shown as a note on a different element

#### Scenario: Storage is refused while drafting

- **WHEN** storage access fails and the reviewer writes a draft
- **THEN** the draft stays available during that session and the page still renders
- **AND** the note controls say the draft can not survive a reload

### Requirement: Review controls support keyboard and touch

Jump links, zoom controls, note actions, and draft actions SHALL be reachable by keyboard and touch, with visible labels and focus. Enter or Space on a focused item, visual, or decision SHALL show its "Add note" option. Closing an editor SHALL return focus to its target. Information SHALL NOT depend on hover or color alone.

#### Scenario: Keyboard review

- **WHEN** a reviewer tabs to item 3, presses Enter, adds a note, and closes the editor
- **THEN** each control is reachable, focus is visible, and focus returns to item 3

#### Scenario: Arrow keys in an editor

- **WHEN** the reviewer presses an arrow key while editing draft text
- **THEN** the text cursor moves normally and the page does not jump to another item

### Requirement: The revised kit applies to newly created pages

Newly assembled pages SHALL use the current kit. A page of an older format SHALL keep its embedded viewer and receive a proposal-only refresh, and any visual input file beside it SHALL be left in place and unused. Archived pages SHALL NOT be rebuilt.

#### Scenario: A new review is generated

- **WHEN** a plan builds a review from the current kit
- **THEN** the page is one scrolling document with text visuals, decisions, and tap-to-note

#### Scenario: An older page is refreshed

- **WHEN** save refreshes an active change whose page uses an older format
- **THEN** only the proposal block changes, and the page's embedded controls and styles stay

#### Scenario: Archived pages remain historical

- **WHEN** the shared kit changes
- **THEN** archived pages are not rebuilt

### Requirement: Review assembly is deterministic and preserves authored input

Assembly SHALL read only the shared kit and the current proposal. The proposal text SHALL have no separately maintained copy. Repeated assembly of identical inputs SHALL produce identical output without rewriting it. Invalid inputs SHALL report a useful error and preserve the previous output. Embedded content SHALL be escaped so that proposal text, including a drawing, can not introduce executable markup.

#### Scenario: The inputs do not change

- **WHEN** the same review is assembled twice
- **THEN** the second run makes no byte or modification-time change

#### Scenario: The proposal contains markup delimiters

- **WHEN** a proposal or a drawing includes literal script-closing text or HTML-like examples
- **THEN** the page shows the intended text without running it or breaking the document

#### Scenario: A current-format input is missing

- **WHEN** the proposal lacks its required sections or the kit lacks its markers
- **THEN** assembly returns an error naming the input and does not overwrite the existing review

### Requirement: Review generation preserves portable history

The generated review SHALL remain the primary human review surface, showing the proposal, its visuals, and its decisions without needing adjacent source files. A refresh SHALL keep the note storage identity, so saved notes stay attached. Migration SHALL NOT rebuild archived pages.

#### Scenario: A reviewer opens only the HTML file

- **WHEN** a reviewer opens a generated page without its proposal or kit beside it
- **THEN** the text, visuals, decisions, zoom, and note controls remain available

#### Scenario: A proposal-only refresh preserves annotations

- **WHEN** a review is refreshed after a proposal text edit
- **THEN** the notes saved before the refresh still show

#### Scenario: Existing archives are migrated

- **WHEN** this release is installed
- **THEN** existing archived review pages remain byte-identical

#### Scenario: No browser is available for rendered inspection

- **WHEN** `/plan` runs where no browser is available
- **THEN** the page is built and the change validated
- **AND** nothing in the report claims that the page was inspected in a browser

### Requirement: One visual per change by default

A change SHALL draw one text visual by default, in the What Changes bullet that carries the change. A change that adds or restructures user-facing screens SHALL sketch each such screen. A further visual SHALL be added only where a bullet can not be understood without a picture. A bullet without a visual SHALL stay text.

#### Scenario: A process change

- **WHEN** a change alters a workflow without adding a screen
- **THEN** its proposal carries one drawing and the other bullets are text only

#### Scenario: Two screens are added

- **WHEN** a change adds two user-facing screens
- **THEN** its proposal carries a sketch of each

#### Scenario: A second visual without a reason

- **WHEN** a change that adds no screen has a second bullet that reads clearly as text
- **THEN** that bullet carries no drawing

### Requirement: The design text links the review page instead of sketching

The `### Review` subsection of a UI-bearing `design.md` SHALL link `review.html` and name the What Changes items that sketch its screens. It SHALL NOT repeat the sketches. The brief, flow, hierarchy, and components subsections SHALL stay in `design.md` as text.

#### Scenario: A reviewer reads both

- **WHEN** a reviewer opens a UI-bearing change
- **THEN** the `## UX` text names the job and the review page shows each screen sketch in its item

## REMOVED Requirements

### Requirement: Tasks and the PR body point at the wireframe

**Reason**: Tasks no longer cite review anchors.
**Migration**: See "The PR body links the review page"; tasks group by surface without anchors.

### Requirement: The wireframe is filled from a fixed kit

**Reason**: There is no visual author or visual input file.
**Migration**: See "The page is built from a fixed kit and the proposal".

### Requirement: A bullet links its visual

**Reason**: Visuals no longer have named anchors, states, or marks.
**Migration**: See "A bullet carries its visual"; an older anchor is hidden from the shown text.

### Requirement: A reviewer annotates in place and copies the notes

**Reason**: The annotate mode is removed.
**Migration**: See "A tap on an item offers a note"; the copy format keeps its first two lines.

### Requirement: The page works on a phone

**Reason**: The phone sheet, stepping controls, and Tools row are removed with the stage.
**Migration**: See "The scrolling page works on a phone".

### Requirement: Review layout keeps each item's content together

**Reason**: Comparison and flow layouts are removed with the HTML visual kinds.
**Migration**: See "Each item's text and visual stay together".

### Requirement: Mechanical defects have deterministic diagnostics

**Reason**: The browser structural checker and its screen, anchor, and mark diagnostics are removed.
**Migration**: See "The builder names mechanical defects".

### Requirement: The review page is produced in one authoring pass

**Reason**: The visual author subagent and the browser check are removed.
**Migration**: See "The planning agent draws the visuals in one pass".

### Requirement: The wireframe covers the flow at low fidelity

**Reason**: HTML screen wireframes with switchable states and in-visual navigation are replaced by text sketches.
**Migration**: Sketch each screen in its bullet; draw each state that matters as its own small sketch.

### Requirement: Screens carry the reasoning beside them

**Reason**: Visuals no longer carry notes blocks or numbered callouts.
**Migration**: Put the reasoning in the bullet text or in the `## UX` section of `design.md`.

### Requirement: Four visual kinds

**Reason**: One kind remains, the text drawing, which can show a flow, a diff, a file tree, or a screen.
**Migration**: Draw flows, diffs, trees, and screens as text inside their bullets.

### Requirement: The What Changes list is the navigation

**Reason**: The panel, stage, and phone sheet are replaced by one scrolling page.
**Migration**: See "The page is one scrolling review".

### Requirement: A screen can be walked at phone width

**Reason**: There are no screen visuals with a desktop and phone toggle.
**Migration**: Sketch the phone layout of a phone-first screen.

### Requirement: A state may carry any name

**Reason**: Text visuals have no states.
**Migration**: Draw each state that matters as its own small sketch.

### Requirement: A bullet with no visual clears the highlight

**Reason**: Text visuals have no marks or highlights.
**Migration**: None needed.

<!-- end specs/ux-wireframes/spec.md -->
<!-- file specs/work-verbs/spec.md utf8 3779 -->
## Purpose

Let the verbs a person invokes serve work that changes no repo file, such as research, errands, messages, and data changes, with a plan, a record, and confirmations that fit that work.

## ADDED Requirements

### Requirement: An invoked verb serves any work

When the person invokes `/explore`, `/plan`, `/apply`, `/save`, or `/continue` for work that changes no repo file, the verb SHALL run in its non-code form. It SHALL NOT create an OpenSpec change, a branch, a commit, or a review page for that work. The work SHALL decide the form; no setting, flag, or mode SHALL select it. Work that changes repo files SHALL use the verbs as the change loop defines them.

#### Scenario: Plan an errand

- **WHEN** the person invokes `/plan` to prepare a supplier comparison and an email to the chosen supplier
- **THEN** the agent writes a to-do in the conversation
- **AND** no OpenSpec change, branch, or review page is created

#### Scenario: Plan a code change

- **WHEN** the person invokes `/plan` to change how the app stores runs
- **THEN** `/plan` drafts an OpenSpec change and its review page as before

### Requirement: A non-code plan is a to-do in the conversation

For work that changes no repo file, `/plan` SHALL run `/explore`'s bounded pass under the same one-round limit, then write a short numbered to-do in the conversation. The to-do SHALL mark each step that acts outside the conversation. `/plan` SHALL write no file for it.

#### Scenario: A plan names its outward steps

- **WHEN** `/plan` writes a to-do that ends with sending an email
- **THEN** the sending step is marked as an action outside the conversation

### Requirement: Apply confirms each outward action

For work that changes no repo file, `/apply` SHALL work the to-do in order. Before each step that acts outside the conversation — a sent message, a post, a created or changed record in a service, a payment, or a deletion — it SHALL show exactly what it will do and ask in the shared ask format. It SHALL NOT cover several outward actions with one confirmation unless the person asked for that. Steps that only read, search, or draft SHALL run without a prompt. When the steps are done, `/apply` SHALL report the result and SHALL NOT invoke `/save`.

#### Scenario: Send an email

- **WHEN** `/apply` reaches a step that sends an email
- **THEN** it shows the recipient and the full text and asks before it sends
- **AND** a declined step is not done and is reported

#### Scenario: Research only

- **WHEN** every step only reads and summarizes
- **THEN** `/apply` completes the to-do without a prompt and reports the result

### Requirement: Save and continue keep non-code progress as a thread

For work that changes no repo file, `/save` SHALL record a thread fact through the memory write gate: what is done, what is next, and any blocker. It SHALL make no commit. `/continue` SHALL offer open threads beside active changes and SHALL resume a chosen thread by recapping it and handing the remaining steps to `/apply`.

#### Scenario: Stop halfway

- **WHEN** the person runs `/save` after two of four steps
- **THEN** a thread fact records the two done steps and the next step
- **AND** no git change is made

#### Scenario: Resume in a new session

- **WHEN** the person runs `/continue` and chooses that thread
- **THEN** the agent recaps it and continues from the next step

### Requirement: Ship is for repo changes

`/ship` SHALL act only on repo changes. When invoked for work that changes no repo file, it SHALL say that the work finishes in `/apply` and SHALL make no git change.

#### Scenario: Ship an errand

- **WHEN** the person invokes `/ship` after an errand that changed no file
- **THEN** `/ship` says the work finishes in `/apply` and makes no git change

<!-- end specs/work-verbs/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-26

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 51423 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds zoom, pan, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-26-lighten-the-loop</title>
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
  .item { display:flex; gap:10px; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .drawing { margin:10px 0 0; }
  .zoom { display:flex; align-items:center; gap:6px; margin:0 0 4px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  .frame { box-sizing:content-box; position:relative; overflow:auto; max-height:70vh; border:1px solid var(--line); border-radius:4px; background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; }
  .frame.zoomed { touch-action:none; cursor:grab; -webkit-user-select:none; user-select:none; }
  .art { display:block; width:max-content; margin:0; padding:8px 10px; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; transform-origin:0 0; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:5; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; border-width:2px 0 0; border-radius:0; padding:10px 12px calc(10px + env(safe-area-inset-bottom)); }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-26-lighten-the-loop">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-26-lighten-the-loop</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap any paragraph, item, drawing line, or decision to add a note.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Each change pays the same fixed cost, whatever its size. The cost is not CI: on PR #114, Deploy took 38 s and Test took 80 s. The cost is overhead. A design subagent draws HTML visuals, a browser checks them, and a one-go <code>/ship</code> runs two checkpoints that each wait on CI. The loop also serves only code. The user's bet is that building is becoming very easy. WongStack should then make building and doing things feel as direct as a chat assistant: ask for something and get a link, with the full review path kept for changes to the main app.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A verb you invoke works for any work, not only code.</b> A plain request still needs no verb, as #118 set. When you invoke a verb for work that changes no repo file, <code>/plan</code> writes a short to-do in chat. <code>/apply</code> does the work and asks before each action that leaves the conversation, such as a sent message or a write to a service. <code>/save</code> keeps a memory thread, and <code>/continue</code> resumes it. <code>/ship</code> stays for repo changes. There is no separate chat or home mode.</div><figure class="drawing"><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">What do you want?</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">├─ a plain request ──▶ done, no verb</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">├─ non-code work</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│    /plan   to-do in chat</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│    /apply  asks before each send</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│    /save   memory thread</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">├─ a mini app ──▶ item 2</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">└─ a change to the main app</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">     /explore ▶ /plan ▶ /apply</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">     ▶ /ship (one CI run, walk)</span></pre></div></figure></div></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A mini app goes from a request to a link in under a minute, however large the main app is.</b> &quot;Make me a …&quot; builds a small app in its own folder, <code>mini-apps/apps/&lt;name&gt;/</code>, with no question round unless the agent cannot act without an answer. All mini apps run on one small Worker with no build step, beside the main app and apart from its build, lint, and tests. <code>/apply</code> uploads a preview of that Worker from the agent host in seconds, on staging data; a preview expires after seven days. Each mini app carries its own tests. <code>/save</code> runs them on the host, then pushes straight to <code>main</code>, like a prose save: no branch and no PR. CI on <code>main</code> runs the tests again and deploys only the production mini Worker, so the app is live on production data. A diff outside the app's folder, such as a migration, or a rejected push falls back to a PR, which <code>/ship</code> merges with no OpenSpec change and no walk. A script builds a dashboard of every mini app from each app's <code>app.json</code>.</div><figure class="drawing"><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">&quot;make me a tip calculator&quot;</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">  │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">  ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">mini-apps/apps/tips/</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">  │  host upload, seconds</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">  ▼</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">preview link (staging, 7 days)</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">  │  /save</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">  ▼</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">tests on host ─▶ push to main</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">  │  CI: tests, deploy</span>
<span class="ln" data-note="item-2-line-12" tabindex="0">  ▼</span>
<span class="ln" data-note="item-2-line-13" tabindex="0">live on production</span>
<span class="ln" data-note="item-2-line-14" tabindex="0">  │</span>
<span class="ln" data-note="item-2-line-15" tabindex="0">  ▼</span>
<span class="ln" data-note="item-2-line-16" tabindex="0">dashboard lists it</span></pre></div></figure></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>BREAKING: The review page gets lighter.</b> <code>/plan</code> draws each visual as a narrow ASCII text block inside its bullet in <code>proposal.md</code>. The page is one scrolling document: Why, What Changes with their visuals, and Decisions labeled <i>asked</i> or <i>assumed</i>. Each visual opens fitted to its width; you drag to pan and pinch or use buttons to zoom. Tap or click an item to add a note; there is no annotate mode, and a drag still scrolls. The design subagent, <code>review-visuals.html</code>, the author guide, the examples file, and the browser checker are removed.</div><figure class="drawing"><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">┌──────────────────────────────┐</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">│ lighten-the-loop     2 notes │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">│ Why · Changes · Decisions    │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">├──────────────────────────────┤</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ 1 A verb works for any work  │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│   ┌ drawing ─── [−][Fit][+] ┐│</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│   │ fitted; pinch to zoom   ││</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">│   └─────────────────────────┘│</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">│ 2 …        tap ▸ [Add note]  │</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">├──────────────────────────────┤</span>
<span class="ln" data-note="item-3-line-11" tabindex="0">│ asked    one big change      │</span>
<span class="ln" data-note="item-3-line-12" tabindex="0">│ assumed  one scrolling page  │</span>
<span class="ln" data-note="item-3-line-13" tabindex="0">├──────────────────────────────┤</span>
<span class="ln" data-note="item-3-line-14" tabindex="0">│ 2 notes        [Copy notes]  │</span>
<span class="ln" data-note="item-3-line-15" tabindex="0">└──────────────────────────────┘</span></pre></div></figure></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>BREAKING: A one-go <code>/ship</code> runs CI once.</b> When <code>/ship</code> pulls in <code>/apply</code>, <code>/apply</code> returns without a checkpoint, and <code>/ship</code> archives and then saves once. <code>/verify</code> still walks the preview before the merge, so a mistake is fixed in the same PR. One script does the merge, retarget, branch delete, and sync. The wiki catch-up that #118 rewrote stays in <code>/ship</code>.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A branch that leaves the main app untouched skips its Test and Deploy.</b> That covers docs-only changes and mini-app changes; a mini-app push runs only the changed apps' tests. The check runs inside each job, so the required <code>test</code> check still reports green. It compares the whole branch with the default branch, not only the last commit. Payload checks still run in this repo, because skill Markdown is the payload here.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Release 22.0.0, on top of #118 and #120.</b> The loop page, README, <code>WONG-STACK</code> block, OpenSpec config rules, and payload manifest describe the new loop.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> a home or chat mode; connectors to email, calendar, or chat services; saving review notes to a database; rebuilding archived review pages; serving mini apps at the main app's address; porting a mini app into <code>app/</code> (an ordinary change when needed).</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user asked for a lighter explore, plan, apply, and ship loop, with mini apps on fast previews, closer to Grok Bot and Muse. Measured: CI takes about 80 s; the cost is the per-change overhead.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked how a mini app gets its preview URL → chose <b>upload from the agent host</b>. Production still deploys only through CI after a merge.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked what a mini app leaves before &quot;keep it&quot; → chose <b>a branch and a memory fact</b>, with no OpenSpec change and no PR.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked what happens to <code>review.html</code> → the user proposed a hosted review mini app. After push-back they chose <b>keep a single HTML file, lighter, with ASCII flowcharts instead of HTML visuals</b>, and <b>annotate without a mode</b>: tap an item to get a note option, while scrolling still works.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user added that docs-only changes should not run the test CI → included. <code>test</code> and <code>payload</code> are required checks in the <code>main</code> ruleset, so the skip runs inside each job; a workflow-level <code>paths-ignore</code> would leave the check pending and block the merge.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user added that the verbs should serve any productive work, not only building → included as <code>work-verbs</code>.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked what <code>/ship</code> means for non-code work → chose <b>act during <code>/apply</code> with a confirm</b>; <code>/ship</code> stays for repo changes.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked where a review mini app would run → superseded: the user chose to keep a single HTML file.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked how to split the work → chose <b>one big change</b>, against the recommended sequence. Tasks are grouped by area so a partial checkpoint stays coherent.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked what the review page shows → chose <b>Why, What Changes, and decisions</b> labeled asked or assumed.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked how much home mode goes in → chose <b>none</b>. The user rejects a split between home and work; the verbs now cover any work.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the review page is one scrolling document instead of a panel, stage, and phone sheet, because the user asked to &quot;still be able to scroll around&quot; and one document is the lightest kit that works on a phone.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user added that an ASCII visual must support drag to pan and zoom in and out, to see all of it → included. At the fitted zoom a drag scrolls the page; zoomed in, a drag inside the visual pans it.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: ASCII visuals aim for 40 columns and read top to bottom, because the user reviews on a phone. The builder warns above 60 columns.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: each Decision-log bullet is one decision starting with <i>Asked</i> or <i>Assumed</i>, so the page can label it without a second copy of the decisions.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: review notes stay copy-into-chat for now; saving them to D1 is later work.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>/verify</code> runs only on request, because it costs a browser walk on every ship and gates nothing.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user pointed at #118, about to merge → read it. It is also 20.0.0, so this change is 21.0.0. It rewrote <code>/ship</code>'s wiki catch-up on purpose, so the earlier assumption to move that step to <code>/improve</code> is dropped. Its <code>request-routing</code> keeps the verbs for code; the user now wants a verb they invoke to serve any work, so this change modifies that rule and keeps plain requests verb-free.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: one script replaces the merge, retarget, branch-delete, and sync steps, because they run the same way every time.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: &quot;docs-only&quot; means every changed path is under <code>wiki/</code> or <code>openspec/</code>, or ends in <code>.md</code>. The check is one core script that both workflows call.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: a major version, because <code>/ship</code>, <code>/apply</code>, and the review page change their contracts.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>This plan's own page used the current kit as a baseline: the design subagent took about 8 minutes and 112k tokens for two visuals, and the browser check passed with no issues.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user asked whether a mini app builds the whole <code>app/</code> (a 1M-line app would make the preview slow) and proposed a small scaffold deployed by itself → yes, the first draft built the whole app. Mini apps now live apart from the main app, on one small Worker.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user asked whether this also makes <code>/apply</code> faster → yes for mini apps: no main-app build, no suite, and no CI wait before the preview. Main-app changes still build and test the whole app once.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked what &quot;keep it&quot; does → the user chose <b>a script that makes it reachable from a dashboard of every mini app made</b>. The dashboard is generated from each app's <code>app.json</code>, with no model step.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked where mini apps live → the user was not sure and expected them under the main app after ship. Assumed: code stays in <code>mini-apps/&lt;name&gt;/</code> beside <code>app/</code> and does not move at ship, because inside <code>app/</code> the main app's build, lint, and tests would scan it. The dashboard is what joins mini apps to the product. Serving them at the main app's address is later work.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: all mini apps share one Worker, <code>&lt;repo&gt;-mini</code>, with a staging twin, bound to the repo's D1 (staging for previews), as <code>wongos</code> shares <code>wong-db</code>. Pages have no build step; wrangler bundles the small Worker.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: keeping a mini app writes no OpenSpec change. The folder, its <code>app.json</code>, and the PR are the record, so a keep costs one PR and one short CI run. This replaces the earlier assumption that <code>/plan</code> writes a record.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the host preview deploys the mini Worker's staging twin when it does not exist yet, so a new repo does not wait for CI. This touches only the mini Worker's staging twin.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: CI skips the main app's Test and Deploy when every changed path is docs or under <code>mini-apps/</code>, the same in-job check as docs-only, widened.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user asked that a mini app keep its own tests, merged with it at keep → included. Tests live in the app's folder and run with Node's built-in runner; on a mini-app branch the <code>test</code> check runs only the changed apps' tests.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user added that building a mini app should not need a PR → already the plan: the branch is pushed without a PR, and a PR opens only at &quot;keep it&quot;, because the <code>main</code> ruleset takes changes only through a PR.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user asked to keep <code>/verify</code> before the merge, to catch mistakes and fix them in the same PR → restored; this replaces the assumption that <code>/verify</code> runs only on request. <code>/ship</code> runs archive, one save, the walk, then the merge.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: a mini-app keep skips the walk, because a mini app has no OpenSpec scenarios, the person already used its preview, and its own tests gate the merge.</li>
<li class="decision card" id="decision-35" data-note="decision-35" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>The user asked whether a Worker can be switched off after a while. An idle Worker costs nothing, and Cloudflare can not delete one preview alias, so the risk is exposure and clutter. Asked how previews should end → chose <b>expire after 7 days</b>: each non-production upload carries an expiry, after which the mini Worker answers 410. Kept apps never expire.</li>
<li class="decision card" id="decision-36" data-note="decision-36" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked what next → chose <b>implement now</b>.</li>
<li class="decision card" id="decision-37" data-note="decision-37" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Converted this change's own page to the new format as the first real use: three drawings, because this one change has three separate user-facing parts (the work paths, the mini-app flow, and the review page itself).</li>
<li class="decision card" id="decision-38" data-note="decision-38" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked (in session hallowed-jellyfish-34, relayed to this session) how a mini app should be saved → chose <b>straight to <code>main</code></b>, like the prose route: <code>/save</code> runs the app's tests on the host, then pushes <code>HEAD:main</code> through the admin ruleset bypass; CI on <code>main</code> runs the tests again and deploys only the production mini Worker. Each save goes live on production data, so the person tries changes on the host preview first. A diff outside the app's folder or a rejected push falls back to a PR, which <code>/ship</code> merges with no change record and no walk. This replaces the <code>mini/&lt;name&gt;</code> branch, the try and keep forms, the keep PR as the normal path, and the <code>mini-&lt;name&gt;</code> fact: the folder on <code>main</code> and the dashboard are the record.</li>
<li class="decision card" id="decision-39" data-note="decision-39" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>/apply</code> no longer saves a mini app on its own, because a save now puts the app live on production; it reports the preview and the person saves when it is right.</li>
<li class="decision card" id="decision-40" data-note="decision-40" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: a mini app's handler is plain JavaScript (<code>api.mjs</code>), not TypeScript, because the agent host's distro Node 22 has no type stripping and the direct save runs the tests there. <code>node --test</code> from the app's folder then works on any Node.</li>
<li class="decision card" id="decision-41" data-note="decision-41" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the pack's config resolver skips <code>mini-apps/</code>, because it takes the first <code>wrangler.jsonc</code> in a subfolder, and <code>mini-apps</code> sorts before a main app in <code>site/</code> or <code>web/</code>.</li>
<li class="decision card" id="decision-42" data-note="decision-42" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Rehearsed on real Cloudflare from the agent host: <code>cf-mini.sh preview --alias rehearsal</code> created <code>wongstack-mini-staging</code> and uploaded a preview in 28 s; a second upload took 12 s. The dashboard, <code>/hello/</code>, and <code>/hello/api/greeting</code> answered 200, and <code>api.mjs</code>, the test file, and <code>routes.gen.ts</code> answered 404. Production <code>wongstack</code> did not change; a <code>wongstack-staging</code> deploy in the same minute came from the <code>server-setup-script</code> branch's CI, per its job log.</li>
<li class="decision card" id="decision-43" data-note="decision-43" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>cf-mini.sh</code> uses the main app's installed wrangler when there is one, else <code>npx wrangler@4</code> with <code>npm_config_yes</code>, because a mini-only CI run skips the app's install and an unpinned <code>npx wrangler</code> would fetch whatever is newest.</li>
<li class="decision card" id="decision-44" data-note="decision-44" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Checkpoint: every task but the CI ones is done. 229 script tests and the app's <code>npm test</code> pass locally (Stryker 100%). Merged <code>origin/main</code> (20.1.0 incremental mutation testing, 20.1.1 qs override) before the push; this change stays 21.0.0 above them. The mini-app agent's two findings were fixed in this change: plain-JavaScript handlers, and a config resolver that skips <code>mini-apps/</code>.</li>
<li class="decision card" id="decision-45" data-note="decision-45" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>At ship time <code>main</code> had taken #120 (team memory) as 21.0.0, so this change is renumbered to 22.0.0 above it; main's shipped release keeps its number. Merged <code>origin/main</code> and kept both sides of the setup naming table (the mini Worker and the shared memory Worker).</li>
<li class="decision card" id="decision-46" data-note="decision-46" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Wiki catch-up at ship: no repeatable fact left to place. The two live facts are already on their pages: <code>/verify</code> before the merge (so a failure is fixed in the same PR) in <code>wiki/development/the-change-loop.md</code>, and plain-JavaScript handlers that run on any Node in <code>wiki/stack/mini-apps.md</code>. The two open threads stay in memory.</li>
<li class="decision card" id="decision-47" data-note="decision-47" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Archive checkpoint: every task checked (35 of 35), the deltas were already synced into <code>openspec/specs/</code> and confirmed equal, so the archive used <code>--skip-specs</code>. Version 22.0.0.</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard draft</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
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
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item' };
    return { at: '#/decisions/' + m[2], kind: 'decision' };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, counts, and the notes list ──
  function render() {
    all('.pin', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
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
    drawings.forEach(measure);
  }

  // ── tap to note: a still pointer on a data-note element shows the chip ──
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
    if (t.target.closest('a, button, input, textarea, select, label, #editor')) return;
    const el = t.target.closest('[data-note]');
    if (el) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : null;
    if (el && t.classList.contains('entry')) el.scrollIntoView({ block: 'center' });
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeEditor(false); hideChip();
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
    if (docked) {
      editor.style.left = editor.style.top = '';
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      if (open.el) {
        const r = open.el.getBoundingClientRect(), limit = window.innerHeight - editor.offsetHeight - 8;
        if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - 8, r.bottom - limit));
      }
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  function dock() {
    const vv = window.visualViewport;
    editor.style.bottom = vv && open && editor.classList.contains('docked') ? Math.max(0, window.innerHeight - vv.height - vv.offsetTop) + 'px' : '';
  }
  if (window.visualViewport) { window.visualViewport.addEventListener('resize', dock); window.visualViewport.addEventListener('scroll', dock); }
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
  });

  // ── drawings: fit to the frame, then zoom by 1.25 up to 4, pinch, Ctrl or Cmd wheel, and pan ──
  const drawings = [];
  function measure(d) {
    const atFit = d.s <= d.fit + 0.001, fw = d.frame.clientWidth;
    d.w = d.art.offsetWidth; d.h = d.art.offsetHeight;
    d.fit = fw > 0 && d.w > 0 ? Math.min(1, fw / d.w) : 1;
    zoom(d, atFit ? d.fit : d.s, 0, 0);
  }
  function zoom(d, s, cx, cy) {
    s = Math.max(d.fit, Math.min(4, s));
    d.x = cx - (cx - d.x) * s / d.s; d.y = cy - (cy - d.y) * s / d.s; d.s = s;
    const zoomed = s > d.fit + 0.001, fh = Math.min(d.h * s, window.innerHeight * 0.7);
    d.frame.style.height = Math.ceil(fh) + 'px';
    d.x = Math.min(0, Math.max(d.frame.clientWidth - d.w * s, d.x));
    d.y = Math.min(0, Math.max(fh - d.h * s, d.y));
    d.art.style.transform = 'translate(' + d.x + 'px,' + d.y + 'px) scale(' + s + ')';
    d.frame.classList.toggle('zoomed', zoomed);
    d.level.textContent = (zoomed ? '' : 'Fit · ') + Math.round(s * 100) + '%' + (zoomed ? ' · drag to pan' : '');
    d.out.disabled = !zoomed; d.in.disabled = s >= 4;
  }
  function gap(d) { const p = Object.keys(d.ptrs).map(function (k) { return d.ptrs[k]; }); return { a: p[0], b: p[1], dist: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1 }; }
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), bar = document.createElement('div');
    bar.className = 'zoom';
    bar.innerHTML = '<span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button>';
    fig.insertBefore(bar, frame);
    const b = bar.querySelectorAll('button');
    const d = { frame: frame, art: fig.querySelector('.art'), level: bar.firstChild, out: b[0], in: b[2], s: 1, fit: 1, x: 0, y: 0, w: 0, h: 0, ptrs: {}, pinch: null };
    drawings.push(d);
    bar.addEventListener('click', function (e) {
      const i = Array.prototype.indexOf.call(b, e.target);
      if (i >= 0) zoom(d, [d.s / 1.25, d.fit, d.s * 1.25][i], frame.clientWidth / 2, frame.clientHeight / 2);
    });
    frame.addEventListener('wheel', function (e) {
      if (!e.ctrlKey && !e.metaKey) return;
      e.preventDefault();
      const r = frame.getBoundingClientRect();
      zoom(d, d.s * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
    }, { passive: false });
    frame.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button')) return;
      d.ptrs[e.pointerId] = { x: e.clientX, y: e.clientY };
      const two = Object.keys(d.ptrs).length === 2;
      if (two) d.pinch = { s: d.s, dist: gap(d).dist };
      if (two || d.s > d.fit + 0.001) {
        Object.keys(d.ptrs).forEach(function (k) { try { frame.setPointerCapture(Number(k)); } catch (err) { /* capture is optional */ } });
      }
    });
    frame.addEventListener('pointermove', function (e) {
      const p = d.ptrs[e.pointerId];
      if (!p) return;
      if (e.pointerType === 'mouse' && !e.buttons) { delete d.ptrs[e.pointerId]; return; }
      const dx = e.clientX - p.x, dy = e.clientY - p.y;
      p.x = e.clientX; p.y = e.clientY;
      if (d.pinch && Object.keys(d.ptrs).length === 2) {
        const g = gap(d), r = frame.getBoundingClientRect();
        zoom(d, d.pinch.s * g.dist / d.pinch.dist, (g.a.x + g.b.x) / 2 - r.left, (g.a.y + g.b.y) / 2 - r.top);
      } else if (d.s > d.fit + 0.001) { d.x += dx; d.y += dy; zoom(d, d.s, 0, 0); }
    });
    ['pointerup', 'pointercancel'].forEach(function (type) {
      frame.addEventListener(type, function (e) { delete d.ptrs[e.pointerId]; d.pinch = null; });
    });
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

  // ── copy: saved notes only, as a /continue instruction ──
  function notesText() {
    const lines = ['/continue ' + CHANGE, 'Review notes from review.html (' + data.notes.length + '):'];
    data.notes.forEach(function (n, i) { lines.push((i + 1) + '. ' + where(n.id).at + ' · ' + n.label + ' — ' + n.text.replace(/\s*\n\s*/g, ' ')); });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) { width = root.clientWidth; hideChip(); }
    drawings.forEach(measure);
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
