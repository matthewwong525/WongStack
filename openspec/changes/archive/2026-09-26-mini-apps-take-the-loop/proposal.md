# One route for every change, with a preview right after building

**Status:** ready-to-ship
**Branch:** explore/mini-app-build-parity
**Open questions:** none

## Why

Asking for a small app and asking for any other change go through two different routes today. A mini app gets no plan, a quick preview built right here, and a "save" that puts it live at once. Every other change gets a plan, but you only see it after the agent pushes it and waits several minutes for the checks. So "save" means two different things, and the fast preview only exists for mini apps. One route should take the best of both: a plan for everything, a quick preview for everything, and one step that puts work live.

## What Changes

- **Every change takes the same steps, mini apps included.** You ask. The agent asks a question only when it needs to, then shows a plan and asks *build it now?* It builds and gives you a preview link from right here, with no wait for the checks. When you say *publish it?* → yes, it saves, runs the checks, and goes live.
  ```text
  ask ─▶ plan ─▶ build it now?
                     │
                     ▼
         build ─▶ preview (here, fast)
                     │
                     ▼
               publish it?
                     │
                     ▼
     save ─▶ checks ─▶ live
  ```
- **Building no longer saves.** When the agent finishes building, you get the preview and a choice: publish it, change it more, or save it to keep your progress. Until you save or publish, the work lives only on this machine.
- **"Save" means one thing.** Saving keeps your progress and opens it for review. It never puts anything live. Only *publish* does, for every change.
- **Nothing goes live without the checks.** A mini app used to skip them. Now publishing a mini app works like publishing anything else.
- **BREAKING: the mini-app shortcut is removed.** The direct "save straight to live" route is gone from every repo on the next update. Apps you already saved stay live and unchanged.

**Non-goals:** no change to where a mini app lives, how it is served at `/apps/<name>/`, the app list, or each app's own tests. No change to what publishing checks before it goes live.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `apply-completion-handoff`: a completed `/apply` uploads a preview from the agent host and reports it, and no longer invokes `/save`; task-driven saves and `/ship`'s pull-in stay.
- `apply-plan-handoff`: a mini app needs an apply-ready OpenSpec change like any other code; a completed implementation ends with the host preview, not a save.
- `mini-apps`: a mini-app request takes the full change loop; the mini-only host preview, the direct save to the default branch, and the short pull-request merge are removed; tests still live with the app.
- `request-routing`: a new standalone page or tool starts the change loop like any code change; the *build it now?* stop leads to a host preview, not a save.
- `delivery-gate`: the host preview is `/apply`'s for every change and still gates nothing; no skill runs tests on the host as a condition of saving; `/ship` has no mini-app form.
- `ship-full-cycle`: the mini-app pull-request short path is removed; a standalone `/apply` previews instead of saving.
- `ci-tests`: a mini-app change reaches the default branch by a merge, not a direct push.
- `context-economy`: save has no mini-app procedure.

## Impact

- **Skills:** `/apply`'s completion ends with `cf-preview.sh` and a *publish it?* ask instead of `/save`; its mini-app path goes. `/save` loses its mini-app route row and `references/mini-app-save.md`. `/ship` loses its mini-app merge section. `render-pr-body.mjs` loses its mini-app mode.
- **Scripts:** `.agents/skills/save/scripts/mini-app-push.sh` is deleted with its test. `scripts/cf-preview.sh` stays and serves every change. `.github/scripts/app-untouched.sh` gains a working-tree mode so `/apply` can skip the upload for a change that leaves the app untouched. `scripts/fixtures/context-baseline.json` drops the mini-app-save route.
- **Unchanged:** `mini-apps/router.mjs`, `routes.mjs`, `mini-dashboard.mjs`, `cf-build.sh`, `test.yml`, `deploy.yml`, `/verify`, and what `/ship` does before a merge.
- **Docs:** the `WONG-STACK` block in `AGENTS.md`, `wiki/development/the-change-loop.md`, `wiki/stack/mini-apps.md`, `wiki/stack/getting-started.md`, `wiki/stack/README.md`, and the payload manifest.
- **Downstream:** `/wong-sync` removes the deleted files. Saved mini apps keep working.
- **Release:** 25.0.0, because it removes a route other repos use and changes what `/apply` does when it finishes.

## Decision log

- **2026-09-26** — Asked how far mini apps should line up with normal changes → chose **fully the same**: same plan and review link, same pull request and CI preview, same *publish it?* → `/ship` merge; only the folder differs.
- **2026-09-26** — Asked whether a new mini app should still be built with no questions → chose **same as any change**: the normal single question round, which asks nothing when the request is clear.
- **2026-09-26** — Assumed: `scripts/cf-preview.sh` is deleted, not kept as an optional tool, because only the mini-app path calls it and the user chose CI previews for every change.
- **2026-09-26** — Assumed: the CI rule that tests only the changed mini apps and skips the main app's suite stays, because it is a gate detail that applies to any branch, not a separate route.
- **2026-09-26** — Assumed: `/apply` still writes tests in the app's folder, through the plan's coverage task like any change, because the tests-with-the-app rule is layout, not route.
- **2026-09-26** — Assumed: the "Purpose" paragraphs of `mini-apps`, `request-routing`, and `ship-full-cycle` are edited in place in `openspec/specs/`, because delta specs change requirements only and those paragraphs describe the removed shortcut.
- **2026-09-26** — Assumed: release 25.0.0, because target repos lose two scripts and the direct save route.
- **2026-09-26** — Assumed: the example app `hello/` and the saved `tips/` app are untouched, because the change is to the route, not the apps.
- **2026-09-26** — Assumed: scenarios that described the shortcut keep their names and state the new behavior, because OpenSpec rejects a changed requirement that drops a scenario.
- **2026-09-26** — Asked (the user, at plan review) whether `/apply` should save when it finishes → chose **no: `/apply` builds and deploys a preview from this host, and only `/save` makes a pull request**, so every change gets the fast preview.
- **2026-09-26** — Assumed: supersedes the entry that deletes `scripts/cf-preview.sh`; it stays and `/apply` runs it for every change, because the user wants the host preview for all work.
- **2026-09-26** — Assumed: `/apply` passes `--alias <change-name>`, so each rebuild of one change updates the same preview link and the upload works on any branch.
- **2026-09-26** — Assumed: `/apply` skips the upload when the working tree leaves the main app untouched, by the rule CI already uses (`app-untouched.sh`, given a working-tree mode), because a prose or skill-text change has no app to preview.
- **2026-09-26** — Assumed: `/ship` still makes one checkpoint, one CI run, and one walk before the merge, because publishing must stay gated; the host preview gates nothing.
- **2026-09-26** — Assumed: when the upload can not run (no stack pack, no credential), `/apply` says why in one line and still asks *publish it?*, because publishing's CI preview and walk still cover it.
- **2026-09-26** — Apply evidence on the host: 259 script tests, 258 pass; `wait-for-checks.test.mjs` failed once on timing under the full run and passed alone twice, and this change does not touch it. Payload links, the OpenSpec config, and `openspec validate --specs --strict` pass. CI stays the gate.
- **2026-09-26** — Distilled facts at ship: the store holds no live fact for this change or its branch, so no repeatable fact moved. The wiki edits ride in this change: the change loop, mini apps, getting started, and the stack hub.
- **2026-09-26** — Archive checkpoint: every task checked, the change archived with its deltas synced into `openspec/specs/` (apply-completion-handoff, apply-plan-handoff, ci-tests, context-economy, delivery-gate, mini-apps, request-routing, ship-full-cycle), and two session facts stored, one superseding the old direct-save preference.
