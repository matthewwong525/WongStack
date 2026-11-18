<!-- openspec-archive v1 2026-09-26-mini-apps-take-the-loop -->
<!-- file proposal.md utf8 8514 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 5281 -->
## Context

Today a completed `/apply` invokes `/save`, which pushes, opens the pull request, and waits for CI. The CI deploy then publishes the preview, and that wait is several minutes. Only the mini-app path skips it: it runs `scripts/cf-preview.sh --alias mini-<name>` from the host, then offers a direct save to `main` through `save/scripts/mini-app-push.sh`.

`cf-preview.sh` does not depend on mini apps. It installs `app/` when needed, applies staging migrations, builds the whole app for staging, uploads a preview version of the staging Worker under an alias, and never deploys production. `app-untouched.sh` is the one owner of "does this change leave the main app untouched". Today it compares commits only, for CI.

The shortcut's other pieces:

- `/apply`'s "The mini-app path"
- `/save`'s route row and `references/mini-app-save.md`
- `render-pr-body.mjs`'s `mini-app` mode
- `/ship`'s "Merge a mini-app pull request"

See proposal.md for why.

## Goals / Non-Goals

**Goals:**
- One completion rule for `/apply`: implement, upload a host preview, ask *publish it?*
- No skill has a mini-app branch. A mini app is code under `mini-apps/apps/<name>/`.
- `/ship` stays the only way to production, with its one save, CI run, and walk.

**Non-Goals:**
- No change to `/ship`, `/verify`, `test.yml`, or `deploy.yml`.
- No local test gate. `/apply` may run tests as evidence, as it does today, but nothing requires it.

## Decisions

**`/apply` runs the preview, not `/save`.** Completion becomes three steps:
1. Ask `app-untouched.sh --worktree` whether the app changed.
2. If it did, run `cf-preview.sh --alias "<change-name>"`.
3. Report the URL, with `/apps/<name>/` added for a mini app, and ask *publish it?* *(Recommended)*, *save it*, or *change it more*.

A change the person asks for after the preview edits the tree and uploads again under the same alias. *Alternative:* keep the completion save and add the host preview first. Rejected: the user wants `/save` to be the only step that opens a pull request, and the extra push buys nothing before publishing.

**The alias is the change name.** It is stable across rebuilds and works on any branch, including `main`, where `cf-preview.sh` refuses to derive an alias. Branch previews from CI use the branch name, so the two never collide.

**`app-untouched.sh` gains `--worktree`.** In that mode it compares the working tree, staged and untracked paths included, with the merge base of `HEAD` and `origin/<default>`. It prints the same three lines. The CI mode is unchanged. *Alternative:* a separate list of prose paths in `/apply`. Rejected, because two copies of the rule drift.

**The "just ask" flow keeps two stops.** `/plan` ends with *build it now?* and `/apply` ends with *publish it?* A yes runs `/ship`, which archives, saves once, waits for CI, walks, and merges. Nothing else changes in `/ship`.

**Task-driven saves stay.** A task whose definition of done needs CI still invokes `/save` mid-list. When the final task was such a save, `/apply` reports that checkpoint and its CI preview, and uploads no second preview.

**The `WONG-STACK` rules are rewritten.** The mini-app rule becomes: build a new standalone page or tool as a mini app, in its own folder, served at `/apps/<name>/`, through the same loop. The loop rule's second stop becomes "after the preview". It already reads that way, but it must not imply a save.

**`wiki/stack/mini-apps.md` keeps the layout and rules and loses the route sections.** "Try it on a preview", "Save it", and "When a save needs a pull request" collapse into one short section that points at the change loop. The `DB`-only handler rule stays as defense in depth: an app never needs the memory store.

**`render-pr-body.mjs` loses its `mini-app` mode.** Its body test is replaced by one that rejects `--mode mini-app`.

**Purpose paragraphs are edited in place** for `mini-apps`, `request-routing`, `ship-full-cycle`, and `apply-completion-handoff`, because delta specs change requirements only.

**`scripts/fixtures/context-baseline.json` drops the `mini-app-save` route**, because `measure-context.mjs --check` reads its deleted file.

## Risks / Trade-offs

- [Unsaved work lives only on this machine] → `/apply`'s report says so in its ask, and *save it* is one of the choices. `/continue` can not resume unsaved work from another machine, the same as today for an unfinished `/apply`.
- [The first preview in a worktree pays for `npm ci`] → The script says it is installing. Later previews reuse `node_modules`.
- [The host preview applies staging migrations before any review] → Same as today's mini-app preview and every CI branch preview; staging is a fixture.
- [A skill-only edit in the source repo still counts as touching the app when it changes a non-`.md` file] → The upload runs and shows an unchanged app. It is harmless, and it costs one build.
- [A downstream repo has a mini app half-way through the old route when it syncs] → The changelog says to finish or save it first.

## Migration Plan

Target repos get the change through `/wong-sync`. The preflight marks `mini-app-push.sh` and `mini-app-save.md` as removed, and `cf-preview.sh` and `app-untouched.sh` as modified. Saved mini apps do not change. Rollback: revert the merge.

<!-- end design.md -->
<!-- file tasks.md utf8 4176 -->
## 1. Working-tree check (.github/scripts)

- [x] 1.1 Add `--worktree` to `.github/scripts/app-untouched.sh`: compare the working tree, staged and untracked paths included, with the merge base of `HEAD` and `origin/<default>`, and print the same three lines. Add cases to `scripts/tests/app-untouched.test.mjs` for a prose-only tree, an uncommitted `app/` edit, an untracked mini-app file, and no merge base (fails safe to touched). Run `node --test scripts/tests/app-untouched.test.mjs`

## 2. Skills (.agents/skills)

- [x] 2.1 `/apply`: replace the completion `/save` with the host preview: `app-untouched.sh --worktree`, then `cf-preview.sh --alias "<change-name>"`, then report and ask *publish it?*, *save it*, or *change it more*. Keep the `/ship` return, the to-do path, and task-driven saves. Delete "The mini-app path", its bullet in "Pick the path by the work", and the mini-app words in the `description`. Verify with `grep -n -i "mini" .agents/skills/apply/SKILL.md`, which should find only the `/apps/<name>/` reporting line
- [x] 2.2 `/save`: delete the mini-app route row, the mini-app mention in step 5, and `references/mini-app-save.md`. Verify with `grep -rn -i "mini" .agents/skills/save/SKILL.md .agents/skills/save/references`, which should find nothing
- [x] 2.3 `/ship`: delete "Merge a mini-app pull request", its mentions in the intro, Step 2, and the report, and the mini-app words in the `description`. Verify with `grep -n -i "mini" .agents/skills/ship/SKILL.md`, which should find nothing
- [x] 2.4 Delete `save/scripts/mini-app-push.sh` and `scripts/tests/mini-app-push.test.mjs`. Remove the `mini-app` mode from `save/scripts/render-pr-body.mjs`. In `scripts/tests/checkpoint-helpers.test.mjs`, replace its body test with one that rejects `--mode mini-app`. Run `node --test scripts/tests/checkpoint-helpers.test.mjs`
- [x] 2.5 Drop the `mini-app-save` route and its note sentence from `scripts/fixtures/context-baseline.json`. Run `node scripts/measure-context.mjs --check` and `node --test scripts/tests/context-measurement.test.mjs`

## 3. Specs and orientation

- [x] 3.1 Edit the Purpose paragraphs of `openspec/specs/` `mini-apps`, `request-routing`, `ship-full-cycle`, and `apply-completion-handoff`, so none describes the mini-app shortcut or a completion save. Verify by reading each
- [x] 3.2 In the `WONG-STACK` block of `AGENTS.md`, rewrite the mini-app rule (a mini app in its own folder at `/apps/<name>/`, through the same loop) and check that the loop rule's second stop follows `/apply`'s preview. Verify that no line mentions a direct save, "no question round", or a save at the end of `/apply`

## 4. Docs (wiki)

- [x] 4.1 `wiki/development/the-change-loop.md`: in the diagram, "Just ask", the `/apply` and `/save` steps, and the "`/apply` never saves to stop" section, `/apply` ends with a host preview and `/save` is by hand or through `/ship`. Shrink "Mini apps" to where the files live plus a link. Delete "A mini-app save is the second direct route". Generalize the gate's host-preview sentence
- [x] 4.2 `wiki/stack/mini-apps.md`: keep the layout and rules. Replace the preview, save, and pull-request sections with one short section on the normal loop and the preview at `/apps/<name>/`. Restate the `DB`-only reason as defense in depth, and update the source-repo paragraph
- [x] 4.3 Update `wiki/stack/getting-started.md`, `wiki/stack/README.md`, `wiki/development/staging-walkthrough.md` if it says `/apply` saves, and the payload manifest's mini-app line
- [x] 4.4 Run `grep -rn -i "mini-app-push\|mini-app-save\|mini-app path\|straight to production\|completion save\|invokes /save once\|invoke the \*\*.save. skill\*\* once" --exclude-dir=node_modules --exclude-dir=archive .` and fix every hit outside `CHANGELOG.md`

## 5. Release

- [x] 5.1 Bump `VERSION` to 25.0.0. Add a `CHANGELOG.md` entry that covers what changed, the removed files, and "finish or save a half-built mini app before you sync"
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `openspec validate mini-apps-take-the-loop --strict --no-interactive`, and `node --test scripts/tests/*.test.mjs`

<!-- end tasks.md -->
<!-- file specs/apply-completion-handoff/spec.md utf8 5987 -->
## RENAMED Requirements

- FROM: `### Requirement: Completed apply automatically checkpoints`
- TO: `### Requirement: Completed apply ends with a preview from the agent host`

## MODIFIED Requirements

### Requirement: Completed apply ends with a preview from the agent host

When `/apply` completes every task in the selected change, it SHALL upload a preview of the main app from the agent host, report the preview URL, and ask whether to publish the change, with saving and changing it more as the other choices. It SHALL NOT invoke `/save` on completion: the work stays in the working tree until the person saves or publishes. The upload SHALL use the pack's host preview script with the change's name as the alias, so each rebuild of one change updates the same preview. It SHALL skip the upload when the working tree leaves the main app untouched, by the same rule CI uses, and say so in one line. When the upload can not run — no stack pack or no credential — `/apply` SHALL state the reason in one line and still ask whether to publish. Two cases differ. When `/ship` invoked `/apply`, `/apply` SHALL return to `/ship` with no upload and no `/save`, because `/ship`'s archive checkpoint and its CI preview serve that run. When the work changes no repo file, `/apply` SHALL report the result with no upload and no `/save`, as `work-verbs` defines. `/apply` SHALL NOT perform any git, pull-request, or CI action itself.

This SHALL hold for **every payload surface that fronts the apply step**. No surface SHALL describe a completion path that ends in anything other than these outcomes — in particular, none SHALL direct the user to archive instead. Surfaces SHALL satisfy this by pointing at the one that owns the behavior rather than by each restating it, per the `payload-single-source` capability.

#### Scenario: Final pending task completes

- **WHEN** `/apply` marks the final pending task complete in a repo with the stack pack and a credential
- **THEN** it uploads a preview from the agent host and reports its URL
- **AND** it asks whether to publish, and does not invoke `/save`

#### Scenario: Apply begins with all tasks already complete

- **WHEN** `/apply` selects a change whose task list is already complete
- **THEN** it uploads the preview from the agent host and asks whether to publish, as on completion

#### Scenario: The raw command is used instead of the verb

- **WHEN** a payload surface other than `/apply` describes how the apply step completes
- **THEN** it points at `/apply`'s completion rule
- **AND** no surface suggests archiving as the completion step

#### Scenario: A surface references a command that does not exist

- **WHEN** a payload surface directs the user to a command
- **THEN** that command exists in the payload

#### Scenario: Ship pulled apply in

- **WHEN** `/ship` invoked `/apply` and the final task completes
- **THEN** `/apply` returns to `/ship` with no upload and no `/save`

#### Scenario: Non-code work completes

- **WHEN** `/apply` finishes a to-do that changed no repo file
- **THEN** it reports the result, uploads nothing, and does not invoke `/save`

#### Scenario: A change that leaves the app untouched

- **WHEN** `/apply` completes a change whose working tree changes only `wiki/` pages and Markdown files
- **THEN** it uploads no preview, says the app is unchanged, and asks whether to publish

#### Scenario: The upload can not run

- **WHEN** `/apply` completes a change in a repo with no Cloudflare credential
- **THEN** it states in one line that no preview was uploaded and why
- **AND** it still asks whether to publish

#### Scenario: The person asks for another change after the preview

- **WHEN** the person asks for a different color after `/apply` reported a preview
- **THEN** `/apply` makes the edit and uploads again under the same alias, with no save and no CI wait

### Requirement: Save is how a gate-requiring task is implemented

`/apply` SHALL invoke `/save` to perform a task whose own definition of done requires something only the gate can produce — a passing CI run, a CI-published preview, pushed browser evidence — then read the result, mark the task accordingly, and continue with the remaining tasks. Invoking `/save` this way is implementation of that task, not a partial checkpoint, because `/apply` owns no git and nothing builds locally as a prerequisite (see the `delivery-gate` capability).

Task-driven invocations SHALL be unbounded and driven by `tasks.md`.

Payload surfaces that front the apply step SHALL state this distinction by pointing at the one surface that owns it, per the `payload-single-source` capability.

#### Scenario: A mid-list task requires a passing build

- **WHEN** a pending task states that the build or CI must pass, and later tasks remain
- **THEN** `/apply` invokes `/save` to push and obtain the gate result
- **AND** marks the task complete when the gate reports success
- **AND** proceeds to the next pending task

#### Scenario: The gate reports failure on a task-driven save

- **WHEN** a task-driven `/save` returns a failing or unverifiable gate result
- **THEN** `/apply` does not mark that task complete
- **AND** it handles the failure as the ordinary blocked path — report and stop, without a further exit checkpoint

#### Scenario: The final task is itself gate-requiring

- **WHEN** the last pending task is completed by a task-driven `/save`
- **THEN** `/apply` reports completion with that checkpoint's result and CI preview
- **AND** it uploads no second preview from the agent host

### Requirement: Save remains independently invocable

Ending `/apply` with a host preview SHALL NOT remove or narrow `/save` as an independently invocable checkpoint at any point in the change loop.

#### Scenario: User wants an in-progress checkpoint

- **WHEN** the user invokes `/save` before `/apply` has completed every task
- **THEN** `/save` performs its existing checkpoint workflow without requiring `/apply` completion

<!-- end specs/apply-completion-handoff/spec.md -->
<!-- file specs/apply-plan-handoff/spec.md utf8 3907 -->
## MODIFIED Requirements

### Requirement: Apply ensures an applicable plan exists

`/apply` SHALL resolve the line of work the user intends to implement before it starts. An explicit change reference SHALL take precedence, followed by the change established in the current conversation, then a unique active change modified in the current worktree or branch diff, then a change whose recorded branch or legacy name matches the current branch. A sole active change MAY be selected only when the conversation does not establish different new work.

The plan `/apply` needs SHALL depend on the kind of work. A change to the repo's code or process, a mini app included, SHALL need an apply-ready OpenSpec change. Work that changes no repo file SHALL need the to-do in the conversation, as `work-verbs` defines.

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

#### Scenario: Non-code work

- **WHEN** the conversation holds a to-do for work that changes no repo file
- **THEN** `/apply` works that to-do and creates no OpenSpec change

#### Scenario: A mini-app request

- **WHEN** the person asks for a new standalone page and no change represents it
- **THEN** `/apply` invokes `/plan` first, like any code change, and builds the page from that change

### Requirement: The shortcut preserves workflow ownership

Automatic planning SHALL NOT move artifact-authoring behavior into `/apply`, move git behavior out of `/save`, or make standalone `/plan` automatically implement its output. A completed implementation SHALL end with a preview from the agent host and SHALL NOT invoke `/save`, as `apply-completion-handoff` defines.

#### Scenario: User invokes plan by itself

- **WHEN** the user invokes `/plan` without asking to apply
- **THEN** the workflow creates the apply-ready artifacts and stops before implementation

#### Scenario: Auto-planned apply completes all tasks

- **WHEN** `/apply` planned the work automatically and completes every task
- **THEN** it uploads a preview from the agent host and asks whether to publish, without invoking `/save`
- **AND** `/save` remains the owner of branch, commit, push, pull-request, CI-preview, and CI mechanics

<!-- end specs/apply-plan-handoff/spec.md -->
<!-- file specs/ci-tests/spec.md utf8 4808 -->
## MODIFIED Requirements

### Requirement: A core workflow runs the test suite in every repo

The payload SHALL ship `.github/workflows/test.yml` in the **core** category, so a repo receives a test pipeline whether or not it took the stack pack. The workflow SHALL run the repo's `test` script, discovered root-first and then in each immediate subdirectory, so a repo whose application lives in a subdirectory is covered without configuration. When no `package.json` declares a `test` script, the job SHALL print why and exit green — a real check, never a permanently red one.

**A change that leaves the main app untouched runs no suite.** When every path that a feature branch changes compared with the default branch — or, on the default branch, every path the push changed — is under `wiki/`, `openspec/`, or `mini-apps/apps/`, or ends in `.md`, the job SHALL say so and SHALL NOT install or run the main app's suite. A change to a shared file under `mini-apps/` outside `mini-apps/apps/` touches the main app, because the main app's Worker imports it. When such a branch changes mini apps, the job SHALL run the tests of the changed mini apps only, as `mini-apps` defines; otherwise it SHALL exit green. The comparison SHALL cover the whole branch, never only the last commit. When the comparison can not be made, the job SHALL run the suite. One core script SHALL make this decision, and the pack's deploy workflow SHALL use the same script. The deploy workflow SHALL still build and deploy the main app when the change touches `mini-apps/apps/`, because the main app's Worker serves the mini apps. The skip SHALL happen inside the job, so a required `test` check still reports.

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

- **WHEN** a merge brings a change under `mini-apps/apps/tips/` to the default branch
- **THEN** the `test` check on that push runs the tests in that folder

#### Scenario: A docs commit on top of code

- **WHEN** a branch's last commit changes only a `.md` file but an earlier commit on the branch changed code
- **THEN** the job runs the suite

#### Scenario: The comparison fails

- **WHEN** the job can not find the default branch to compare with
- **THEN** it runs the suite

#### Scenario: A shared mini-app file

- **WHEN** a branch changes only a file under `mini-apps/` that is outside `mini-apps/apps/`
- **THEN** the job runs the main app's suite


<!-- end specs/ci-tests/spec.md -->
<!-- file specs/context-economy/spec.md utf8 3222 -->
## MODIFIED Requirements

### Requirement: Simplification reports a net instruction reduction

The completed change SHALL report before-and-after word and byte counts for a fixed inventory of core workflow skill descriptions, bodies, and linked procedure references, including removed generated instructions and new references. The inventory SHALL show a net reduction and SHALL identify shared owner documents separately. Counts of source text SHALL NOT be presented as measured runtime token savings. Generated review code, executable helpers, and historical records SHALL be accounted for separately.

The report SHALL also name required-reading inventories for ordinary active save, named-secret save, prose save, new-plan fallback, archived save, and cold resume. Ordinary save SHALL require less source reading than the recorded baseline. Every special-route increase SHALL be reported with its reason. Completion SHALL include behavior regression evidence and an audit that required checks remain reachable.

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

The save skill SHALL expose a complete main procedure and explicit entry conditions for named-secret persistence, prose-only handling, new-plan fallback, and archived handoffs. Each applicable procedure SHALL be loaded before its actions. Unconditional credential exclusion, workflow ownership, and gate-result handling SHALL remain visible in the main procedure. Extracted procedures SHALL retain all required checks.

#### Scenario: Ordinary active change checkpoint

- **WHEN** save handles an existing active change without newly named secrets or prose-only routing
- **THEN** it can complete the checkpoint without loading the unrelated conditional procedures
- **AND** it retains record maintenance, credential exclusion, PR handling, and CI result reporting

#### Scenario: More than one condition applies

- **WHEN** an archived checkpoint also includes a newly named secret
- **THEN** it loads both applicable procedures
- **AND** preserves the secret in the required durable location and does not recreate the active change

#### Scenario: A mini-app save

- **WHEN** save runs for a change to a mini app
- **THEN** it loads the same procedures as any code change, and there is no mini-app procedure to load

<!-- end specs/context-economy/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 9430 -->
## MODIFIED Requirements

### Requirement: Ship delegates its checkpoint and branch gate to save

`/ship` SHALL retain its shipping-only responsibilities: verify the feature branch and default-branch state, invoke `openspec-archive-change`, merge the pull request, and delete the remote branch worktree-safely. After archiving and before merging, `/ship` SHALL invoke ordinary `/save` exactly once. When no active change matches the current branch and exactly one matching archive exists, `/save` SHALL use that archive as the handoff record, SHALL NOT author a replacement active change, and SHALL own secret preservation/redaction, session-note capture, commit, push, pull-request creation/update, and the CI wait/auto-fix path. `/ship` SHALL consume that result and SHALL NOT duplicate those checkpoint mechanics or require a special save flag.

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

- **WHEN** `/ship` merges the pull request of a mini app
- **THEN** it archives the app's change, runs one `/save` and the walk, and merges on the gate, like any change

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate. No skill SHALL run a compile, a unit-test suite, a linter, or a type-check as a condition of saving or shipping. A mini app's own tests run in CI like every other suite. Test suites run in CI (the `ci-tests` capability), where they are ordinary checks on the existing ladder.

**The boundary is building versus exercising.** Driving a browser — or issuing HTTP requests and existing-command state queries — against an already-deployed staging environment is not a local build: nothing is compiled, nothing is installed, and the artifact under test is the one CI itself published. The opt-in staging walkthrough (`staging-walkthrough`) is therefore permitted, and is bounded by three properties that keep it from becoming a local-verify gate by another name — it SHALL run only against a deployment CI has already published, it SHALL never install a dependency, and it SHALL be absent entirely unless the repo adopted it. It is reached by invoking `/verify`, or by `/ship`'s single evidence step. Its verdict SHALL NOT function as a gate rung: an unrunnable or absent walk never blocks anything, and a walk `FAILURE` at ship time is surfaced as a user decision (fix or merge anyway) rather than consulted as a merge condition.

**A host preview is not a gate.** A completed `/apply` builds the main app on the agent host and uploads a preview version of the staging Worker, as `apply-completion-handoff` defines. That build and upload SHALL NOT be a prerequisite or a condition of `/save` or `/ship`, SHALL NOT replace a CI check, and SHALL NOT deploy production.

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

- **WHEN** `/apply` uploaded a preview from the agent host and the person publishes the change
- **THEN** `/ship` still saves, waits for CI, and merges only on the gate result
- **AND** production deploys from CI on the default branch, not from the host

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 3309 -->
## ADDED Requirements

### Requirement: A mini app takes the same change loop as any change

A request for a new standalone page or small tool, or a change to one, SHALL take the full change loop, like any change to the repo's code: `/explore`'s question round when a decision is open, an OpenSpec change with a review page, `/apply` with its preview from the agent host, `/save` for a branch and a pull request, and `/ship` to archive and merge. The only thing that SHALL set a mini app apart is where its files live. No skill SHALL have a separate mini-app route, preview, save, or merge.

#### Scenario: A new tool with no verb

- **WHEN** the person asks "make me a tip calculator"
- **THEN** the agent plans it, ends with the review link, and asks whether to build it now
- **AND** on yes it builds `mini-apps/apps/tips/`, reports the preview from the agent host at `/apps/tips/`, and asks whether to publish it

#### Scenario: Publishing a mini app

- **WHEN** the person says to publish a mini app
- **THEN** `/ship` archives its change and merges its pull request on the gate, like any change
- **AND** production serves the app at `/apps/<name>/` after the merge deploys

#### Scenario: Saving a mini app

- **WHEN** the person saves a mini app mid-work
- **THEN** the save commits to the feature branch and updates the pull request
- **AND** nothing reaches the default branch or production

## MODIFIED Requirements

### Requirement: A mini app carries its own tests

A mini app's plan SHALL carry a task to write tests for its logic — its API handler and its scripts — in the app's own folder, runnable by Node's built-in test runner with no install. On a change that touches mini apps, CI SHALL run the tests of the changed mini apps only, in the required `test` check. No skill SHALL run a mini app's tests on the agent host as a condition of saving.

#### Scenario: Save an app with a failing test

- **WHEN** a pull request changes a mini app whose test fails
- **THEN** the `test` check fails and `/ship` can not merge it

#### Scenario: Only the changed app is tested

- **WHEN** a push changes `mini-apps/apps/tips/` and no other mini app
- **THEN** CI runs the tests under `mini-apps/apps/tips/` and no other suite

## REMOVED Requirements

### Requirement: A mini-app request builds without the full loop

**Reason**: A mini app now takes the same change loop as any change.
**Migration**: Ask for the app as usual; the agent plans it and asks *build it now?*

### Requirement: The mini-app preview comes from the agent host

**Reason**: Every completed `/apply` now uploads a preview from the agent host, as `apply-completion-handoff` defines, so a mini app needs no rule of its own.
**Migration**: None; open `/apps/<name>/` on the preview link that `/apply` reports.

### Requirement: A mini app saves straight to the default branch

**Reason**: Saving is a checkpoint for every change; only `/ship` puts work live.
**Migration**: Save a mini app like any change, then publish it through `/ship`.

### Requirement: A mini-app pull request merges through the short path

**Reason**: A mini app has an OpenSpec change like any change, so `/ship` archives and merges it through its normal steps.
**Migration**: Run `/ship` on the mini app's branch; it archives the change and merges.

<!-- end specs/mini-apps/spec.md -->
<!-- file specs/request-routing/spec.md utf8 2604 -->
## MODIFIED Requirements

### Requirement: Plain requests are done directly

In every repo, the agent SHALL do a plain request (research, an errand, a reminder, a question) directly, with no verb and no question round. It SHALL ask only when it can not act without an answer. It SHALL start the change loop on its own only when a request changes the repo's code or process. A request for a new standalone page or small tool SHALL start the change loop too, and SHALL build it as a mini app, as `mini-apps` defines. When the person invokes a verb, the verb SHALL serve the work whatever its kind, as `work-verbs` defines. The rule SHALL live in the `WONG-STACK` block.

A code or process change the person asks for with no verb SHALL stop for the person twice. First, the agent SHALL run `/plan`, which ends with the review link and asks whether to build it now. On yes, it SHALL run `/apply`, which builds the change and returns a preview from the agent host. It SHALL then ask whether to publish the change. On yes, it SHALL run `/ship`. A verb the person invokes SHALL keep its own authorization: `/ship` still runs the whole chain, and `/apply` still plans and builds without a stop. The person SHALL NOT need to name a verb to move the work to its next stage.

#### Scenario: An errand

- **WHEN** the person asks for the opening hours of a shop
- **THEN** the agent finds them and answers, with no `/explore` round and no OpenSpec change

#### Scenario: A code change

- **WHEN** the person asks to change how the repo's app stores data
- **THEN** the agent runs the change loop, starting at `/explore`
- **AND** it stops at the plan's review page and asks whether to build it now

#### Scenario: The person says yes to both stops

- **WHEN** the person answers "build it now" and then "publish it" with no verb
- **THEN** the agent runs `/apply`, reports the host preview, and on the second yes runs `/ship`, which saves, waits for CI, and merges

#### Scenario: The person types /ship

- **WHEN** the person invokes `/ship add a sign-up page`
- **THEN** the chain runs to the merge with no stop at the plan or before the merge

#### Scenario: A mini app

- **WHEN** the person asks for a new page that tracks their runs
- **THEN** the agent runs the change loop, starting at `/explore`, and stops at the plan's review page and asks whether to build it now
- **AND** the plan builds the page under `mini-apps/apps/`

#### Scenario: A verb for non-code work

- **WHEN** the person invokes `/plan` for their week
- **THEN** the agent writes a to-do in the conversation and creates no OpenSpec change

<!-- end specs/request-routing/spec.md -->
<!-- file specs/ship-full-cycle/spec.md utf8 2099 -->
## MODIFIED Requirements

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
- **THEN** `/apply` uploads a preview from the agent host and does not invoke `/save`, as `apply-completion-handoff` defines

#### Scenario: A reader looks up the chain rule

- **WHEN** a reader opens the change loop page
- **THEN** it states that each verb invokes the verb before it when its precondition is missing
- **AND** it shows the nesting `/ship` → `/apply` → `/plan` → `/explore`

## REMOVED Requirements

### Requirement: A mini-app pull request ships without a change record

**Reason**: A mini app has an OpenSpec change like any change, so `/ship` archives and merges it through its normal steps.
**Migration**: Run `/ship` on the mini app's branch. A branch with no change record stops as before; `/save` can author one.

<!-- end specs/ship-full-cycle/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-26

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 34112 fence=~~~ -->
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
<title>Review · 2026-09-26-mini-apps-take-the-loop</title>
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
<body data-change="2026-09-26-mini-apps-take-the-loop">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-26-mini-apps-take-the-loop</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap any paragraph, item, drawing line, or decision to add a note.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Asking for a small app and asking for any other change go through two different routes today. A mini app gets no plan, a quick preview built right here, and a &quot;save&quot; that puts it live at once. Every other change gets a plan, but you only see it after the agent pushes it and waits several minutes for the checks. So &quot;save&quot; means two different things, and the fast preview only exists for mini apps. One route should take the best of both: a plan for everything, a quick preview for everything, and one step that puts work live.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Every change takes the same steps, mini apps included.</b> You ask. The agent asks a question only when it needs to, then shows a plan and asks <i>build it now?</i> It builds and gives you a preview link from right here, with no wait for the checks. When you say <i>publish it?</i> → yes, it saves, runs the checks, and goes live.</div><figure class="drawing"><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">ask ─▶ plan ─▶ build it now?</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">                   │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">                   ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">       build ─▶ preview (here, fast)</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">                   │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">                   ▼</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">             publish it?</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">                   │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">                   ▼</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">   save ─▶ checks ─▶ live</span></pre></div></figure></div></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Building no longer saves.</b> When the agent finishes building, you get the preview and a choice: publish it, change it more, or save it to keep your progress. Until you save or publish, the work lives only on this machine.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>&quot;Save&quot; means one thing.</b> Saving keeps your progress and opens it for review. It never puts anything live. Only <i>publish</i> does, for every change.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Nothing goes live without the checks.</b> A mini app used to skip them. Now publishing a mini app works like publishing anything else.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>BREAKING: the mini-app shortcut is removed.</b> The direct &quot;save straight to live&quot; route is gone from every repo on the next update. Apps you already saved stay live and unchanged.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> no change to where a mini app lives, how it is served at <code>/apps/&lt;name&gt;/</code>, the app list, or each app's own tests. No change to what publishing checks before it goes live.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked how far mini apps should line up with normal changes → chose <b>fully the same</b>: same plan and review link, same pull request and CI preview, same <i>publish it?</i> → <code>/ship</code> merge; only the folder differs.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked whether a new mini app should still be built with no questions → chose <b>same as any change</b>: the normal single question round, which asks nothing when the request is clear.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>scripts/cf-preview.sh</code> is deleted, not kept as an optional tool, because only the mini-app path calls it and the user chose CI previews for every change.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the CI rule that tests only the changed mini apps and skips the main app's suite stays, because it is a gate detail that applies to any branch, not a separate route.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>/apply</code> still writes tests in the app's folder, through the plan's coverage task like any change, because the tests-with-the-app rule is layout, not route.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the &quot;Purpose&quot; paragraphs of <code>mini-apps</code>, <code>request-routing</code>, and <code>ship-full-cycle</code> are edited in place in <code>openspec/specs/</code>, because delta specs change requirements only and those paragraphs describe the removed shortcut.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: release 25.0.0, because target repos lose two scripts and the direct save route.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: the example app <code>hello/</code> and the saved <code>tips/</code> app are untouched, because the change is to the route, not the apps.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: scenarios that described the shortcut keep their names and state the new behavior, because OpenSpec rejects a changed requirement that drops a scenario.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-26</p>Asked (the user, at plan review) whether <code>/apply</code> should save when it finishes → chose <b>no: <code>/apply</code> builds and deploys a preview from this host, and only <code>/save</code> makes a pull request</b>, so every change gets the fast preview.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: supersedes the entry that deletes <code>scripts/cf-preview.sh</code>; it stays and <code>/apply</code> runs it for every change, because the user wants the host preview for all work.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>/apply</code> passes <code>--alias &lt;change-name&gt;</code>, so each rebuild of one change updates the same preview link and the upload works on any branch.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>/apply</code> skips the upload when the working tree leaves the main app untouched, by the rule CI already uses (<code>app-untouched.sh</code>, given a working-tree mode), because a prose or skill-text change has no app to preview.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: <code>/ship</code> still makes one checkpoint, one CI run, and one walk before the merge, because publishing must stay gated; the host preview gates nothing.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-26</p>Assumed: when the upload can not run (no stack pack, no credential), <code>/apply</code> says why in one line and still asks <i>publish it?</i>, because publishing's CI preview and walk still cover it.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Apply evidence on the host: 259 script tests, 258 pass; <code>wait-for-checks.test.mjs</code> failed once on timing under the full run and passed alone twice, and this change does not touch it. Payload links, the OpenSpec config, and <code>openspec validate --specs --strict</code> pass. CI stays the gate.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Distilled facts at ship: the store holds no live fact for this change or its branch, so no repeatable fact moved. The wiki edits ride in this change: the change loop, mini apps, getting started, and the stack hub.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-26</p>Archive checkpoint: every task checked, the change archived with its deltas synced into <code>openspec/specs/</code> (apply-completion-handoff, apply-plan-handoff, ci-tests, context-economy, delivery-gate, mini-apps, request-routing, ship-full-cycle), and two session facts stored, one superseding the old direct-save preference.</li>
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
