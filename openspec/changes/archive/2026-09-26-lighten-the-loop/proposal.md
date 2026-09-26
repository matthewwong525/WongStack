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
