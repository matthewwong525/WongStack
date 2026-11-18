<!-- openspec-archive v1 2026-10-05-replay-kept-checks -->
<!-- file proposal.md utf8 9599 -->
# Keep passed preview checks and replay them before publishing

**Status:** ready-to-ship

**Branch:** e2e-testing

**Open questions:** none

## Why

Every preview check is written fresh by the assistant and thrown away after. Nothing ever looks at an old feature again, so a change can break one and nobody hears until someone trips over it. Re-checking old features with AI each time was ruled out as too slow. A recorded check replays in seconds with no AI, and staging now starts every check from the same sample data, which is what a replay needs.

## What Changes

- **Old features are replayed before a change goes live.** The check before publishing replays every kept check it has time for, with no AI. It stops after 2 minutes. The areas your change touches go first, and any that did not fit are named. A replay that looks different gets one fresh look from the assistant.
  ```text
  checks ─▶ preview check ─▶ +replay ─▶ live
                                │ differs
                                ▼
                          +one fresh look
                           │           │
                         holds      broken
                           ▼           ▼
                      update it     +fix it
  ```
- **A passed check is kept.** When the check before publishing passes a promise about a page or a request, it saves the clicks and what the page showed, beside your code. It is kept only after it replays cleanly once, by itself, from fresh sample data. One that does not is named and left out.
- **A change that breaks an old feature fixes it.** When the fresh look finds an old promise no longer holds because of your change, the assistant fixes it, saves, and replays that check, without stopping to ask. It stops and asks only when two tries did not fix it, or when the break does not come from your change: fix it first, or publish anyway. When the promise still holds and only the page changed, such as a renamed button, the kept check is updated and nothing stops.
- **A change that alters a screen updates its own kept check.** A promise your change rewrites is not replayed. It is checked fresh as usual and kept again. A promise your change removes takes its kept check with it.
- **Some checks are never kept.** One that needs your login, triggers an outside service or a timed job, or carries a password stays a one-time check.
- **Publishing takes a little longer.** Up to 2 minutes for the replay, and one more short save when a check was kept or updated. A fix for a broken old feature adds its own save and re-check. Checks you run in the middle of a change stay as fast as today, and replay only if you ask.
- **Unchanged:** a check that cannot run still never holds a change up. No new tool is installed, no AI key is needed, and nothing is added to your project's dependencies. A project whose staging cannot be rebuilt from sample data keeps and replays nothing, and the check says so.

**Non-goals:** Adopting the e2e test tool or any other test tool. Replaying on every save, in mid-change checks, or on a nightly schedule. Replaying against the live app. Walking through features that already shipped to give them kept checks: the set grows from use. Kept checks for phone apps, for facts read from the database, or for evidence taken from the automatic checks. Video.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: a passed browser or request journey is kept as a replayable check in the project; kept checks replay with no model inside `/ship`'s walk, within two minutes; a changed replay gets one fresh walk; a broken older promise is repaired when the branch caused it, else a `FAILURE`; the walk may now leave kept checks in the working tree inside `/ship`; the declined-options record changes from *a saved test suite* to *an in-repo test framework*.
- `delivery-gate`: `/ship` saves the kept checks its walk wrote and merges that commit only when its gate passes.

## Impact

- Skills: `.agents/skills/verify/` (a new `scripts/verify-journeys.mjs`; short additions to `SKILL.md` and `references/walkthrough.md`), `.agents/skills/ship/SKILL.md` (Step 4 carries kept checks through one save).
- Project files the walk writes: `.agents/verification/journeys/<capability>/<id>.json`, beside the existing verification recipes. Installs own these files; the payload ships none.
- Tests: a new `scripts/tests/verify-journeys.test.mjs` against the practice site, with the existing fake browser.
- Docs: `wiki/development/staging-walkthrough.md` (kept checks, the reasons, the look at e2e), `wiki/development/the-change-loop.md` where `/ship`'s walk is described.
- Payload release: `CHANGELOG.md` entry, minor. Skill text must fit the context budget, which has about 3,900 bytes of headroom.
- No new dependency, tool, runtime, or key.

## Decision log

- **2026-10-05** — Asked when the kept checks should replay → chose only before publishing, with a 2-minute limit. Preview checks already feel long; chat logs from the last 12 days show the browser part takes about 16 seconds and the assistant's writing and reading take the rest.
- **2026-10-05** — Asked where the kept checks should live → chose in the project, with the code.
- **2026-10-05** — Assumed: the e2e test tool is not adopted, because it adds packages and test files to every project, its AI steps need a paid key for anyone on a Claude subscription, and its guide alone is two thirds the size of all our skill instructions. Only its replay idea is taken.
- **2026-10-05** — Assumed: a check is kept only after it replays cleanly once by itself from fresh sample data, because a recording that fails on the next person's publish costs them a fresh look for nothing.
- **2026-10-05** — Assumed: a broken old promise stops the publish and asks, like a failed check today, because a softer kind of failure would let the break go live unseen.
- **2026-10-05** — Assumed: at most three fresh looks per publish, with the rest named as not checked, because one renamed menu could otherwise send the assistant through every kept check.
- **2026-10-05** — Assumed: a kept check stores what the passing page showed and points at the written promise, never a copy of it, because a second copy of a promise goes stale when the promise changes.
- **2026-10-05** — Assumed: checks that need a login, trigger an outside service or a timed job, or carry a password are never kept, because a replay runs unattended and a kept check is saved with the code where others can read it.
- **2026-10-05** — Assumed: only page and request checks are kept, because those are the two kinds the browser tool and a plain request can repeat without the assistant.
- **2026-10-05** — Assumed: no kept checks are made for features that already shipped, because the wiki's rule is to grow from use and a backfill is a long AI run nobody asked for.
- **2026-10-05** — Assumed: the practice-site measurement of the assistant's grading is not rerun, because the instructions for writing and grading a fresh check do not change; the replay is a program and gets its own tests on the practice site.
- **2026-10-05** — Asked in review what happens when a change breaks an old feature → chose that the assistant fixes it, not that the publish stops and asks. This replaces the earlier assumption. Stopping to ask stays for a break two tries did not fix and for one the change did not cause, because a publish should not rewrite code the change never touched.
- **2026-10-05** — Assumed: the kept-checks wiki section is its own page, `wiki/development/kept-checks.md`, because the walkthrough page had 31 words left under its 3,000-word limit. The walkthrough page keeps the changed reasons and the look at e2e; a few of its older sentences were shortened to make room, with no fact removed.
- **2026-10-05** — Assumed: checks for files the branch changed run first even when they write, ahead of read-only checks for other areas, because the promise is that changed areas go first. A read-only check that follows a writing one starts from a rebuild.
- **2026-10-05** — Assumed: a kept check is named after its scenario, so keeping it again replaces the same file. The check before publishing records whether staging was rebuilt in its run folder (`staging-facts`), and the replay reads it from there. `keep` takes the preview address (`--url`) to swap it out.
- **2026-10-05** — Assumed: the build is saved now that all code and tests are written, so the automatic checks and one real replay on this branch's preview can run; the three verification tasks stay open until each is seen to pass.
- **2026-10-05** — Asked whether to stop shared files, such as the release notes and tests, from counting as an area a change touched → chose yes, then publish. Nearly every change here touches the release notes, so every kept check would have gone to the front and the order would have meant nothing.
- **2026-10-05** — Assumed: the plan is filed in the archive and numbered 33.1.0 for publishing, because every task is done, the automatic checks passed on the build, and one real replay on the preview returned *same* and then *changed* as expected.
- **2026-10-05** — Assumed: the check before publishing walked the starter app's page-not-found promise, which is not part of this change, because the change's first promise needs a passed page check to keep and the change has no page of its own. It passed, was kept as this project's first kept check, and replays in 3 seconds; this save carries it.

<!-- end proposal.md -->
<!-- file design.md utf8 12317 -->
# Design

## Context

See proposal.md for why. The constraints that shape the approach:

- `/verify` writes each journey fresh into a temp run folder and deletes it. A browser journey is `<id>.batch.json`, a command array fed unread to `agent-browser batch --bail --json`. A request probe is `<id>.requests.txt`. `verify-runner.sh` owns Access headers, the throwaway browser session, and the login-wall exit.
- Since 30.8.0 `preflight` takes the staging turn, rebuilds staging from `schema/seed.sql`, and prints `SEEDED` and `PLAYGROUND`. A replay needs that known starting data.
- Measured on 2026-10-05 from 12 days of Claude chat logs: `run` takes a median 16 s (n=134); `preflight` takes 15 s with a rebuild (n=3) and 2 s without (n=95), so a rebuild costs about 13 s. A whole walk has a median of 2 min and a long tail; the tail is the assistant, not the browser.
- Projects already keep verification recipes in `.agents/verification/`, outside the copied skills, and a recipe refers to scenarios without copying their expected behavior.
- The skills' instruction text has about 3,900 bytes of headroom under the CI baseline.
- The spec today lists *a saved test suite* as declined and says the walk leaves the working tree as it found it. Both change here, on purpose.

## Goals / Non-Goals

**Goals:**

- Replay is a program: no model call, no new tool, no repo dependency.
- A replay result is one of four words a report can carry: `same`, `changed`, `skipped`, `not-run`.
- A kept check can not fail for a reason its own recording caused: it is proven before it is kept.
- The new skill text stays under 1,500 bytes; the logic lives in the script.

**Non-Goals:**

- A second driver. Replay reuses `verify-runner.sh`.
- A CI step in installs. A kept check is validated when it is read.
- Parallel replays. Staging is one shared database.
- A general assertion language.

## Decisions

### 1. One file per kept check, beside the recipes

`.agents/verification/journeys/<capability>/<id>.json`, format `verify-journey-1`:

```json
{
  "format": "verify-journey-1",
  "id": "empty-title-rejected",
  "scenario": { "capability": "notes", "requirement": "Notes can be created", "scenario": "Submitting with no title is rejected" },
  "thenDigest": "sha256 of the scenario's THEN line when recorded",
  "probe": "browser",
  "writes": false,
  "sourcePaths": ["app/src/pages/notes.tsx"],
  "recordedAt": "<commit the passing walk ran on>",
  "steps": [
    ["open", "{url}/new"],
    ["wait", "--load", "networkidle"],
    ["find", "role", "button", "click", "--name", "Save"]
  ],
  "expect": [{ "text": "Title is required" }]
}
```

- `{url}` stands for the preview address; the script substitutes it. No kept file holds a host name.
- A request check's `steps` are `[method, path, body?]` rows and its `expect` rows name a step: `{ "step": 1, "status": 422, "includes": "Title is required" }`.
- `expect` is a closed set. Browser: `text` (appears), `gone` (text absent after the steps), `path` (the landed address's path). Request: `status`, `includes`. Anything else is an unreadable file.
- `sourcePaths` is the branch's changed source files at recording time, minus the files that tie a check to no area: `openspec/`, `wiki/`, `.agents/verification/`, `CHANGELOG.md`, `VERSION`, `package-lock.json`, and tests and their fixtures. The same files are ignored when a check is matched against a branch.
- `thenDigest` lets the script see that the written promise changed without holding a second copy of it.

Why in the repo and not the memory store: every branch deploys to the one staging, and a branch that changes a screen must carry the check that matches it. A store outside git holds one set for all branches. The person also chose this (proposal, Decision log).

Alternative considered: extending the recipe format `verify-recipe-1`. Declined: a recipe points at a CI capture and a guide a person wrote; a kept check is a machine recording. Two formats with one folder keep each validator small.

### 2. One script, three commands

`.agents/skills/verify/scripts/verify-journeys.mjs`, Node built-ins only, like `verify-receipts.mjs`:

- `check` reads every kept check and classifies it against `openspec/specs/`: `ok`, `stale` (scenario gone or `thenDigest` differs), `unreadable`.
- `replay --run-dir <dir> --url <url> [--change-root <path>] [--from <dir>] [--only <ids>] [--budget <seconds>]` writes each selected check into `<dir>/replay/journeys/` in the runner's own file shapes, calls `verify-runner.sh`, then reads the results. Browser expectations ride as closing `wait` commands, so `--bail` stops at the first that fails; `path` is read from `<id>.url`; request expectations are read from the captured responses. It prints one line per check and a `REPLAY=` summary, and writes `replay.json`.
- `keep --run-dir <dir> --id <journey> --expect <json> [--writes]` builds a candidate from a walked journey in `<dir>/journeys/`, strips screenshots and the preview host, refuses it by decision 5, and writes it to `<dir>/keep/`. `keep --install` copies proven candidates into `.agents/verification/journeys/` and removes the files `check` called stale for a scenario that no longer exists.

Proof and replay are the same code path: a candidate is proven by `replay --from <dir>/keep`.

The runner stays the only thing that talks to the browser, so Access headers, the throwaway profile, and the login-wall exit apply to a replay unchanged. A login wall makes every remaining check `not-run` with that reason.

### 3. Starting data

- Read-only checks (`writes: false`) run together, first, on the staging the walk left.
- Each writing check gets a rebuild before it runs: `reset-staging-d1.mjs` under the turn the walk already holds.
- Replay needs `SEEDED=yes`. A writing check also needs `PLAYGROUND=yes`. Otherwise the affected checks are `not-run`, named with the reason.
- `writes` defaults to true. The recorder sets it false only for a journey with no click that submits and no request other than `GET`.

Replay runs once per walk, after the change's own journeys and their repairs settle, so it sees the revision that will be published. A repair made for a broken kept check re-replays only that check.

### 4. Two minutes, and an order that reaches everything

The budget is 120 s of wall clock, rebuilds included, and 30 s for any one check. At 13 s a rebuild and a few seconds a journey, that is about six writing checks or a few dozen read-only ones.

Order: checks whose `sourcePaths` meet the branch's changed files; then the rest, sorted by id and rotated by an offset taken from the head commit's hash. The rotation needs no stored state and still reaches every check across publishes. A check the budget did not reach is `not-run`.

One fixed limit, no setting: the person prefers one simple limit to an adjustable one.

### 5. What is never kept

The walk never offers `keep` a journey that used a hand-over, an outside service, or a manual job trigger: only the walk's own ledger knows those, so the rule lives in `walkthrough.md`.

`keep` itself refuses what it can read, and names the reason, when:

- a step runs the browser's saved-login command;
- a step holds a `.env` value or a token-shaped string, by the same patterns `verify-staging.sh` scrubs;
- a step uses a snapshot reference (`@e5`) and not a semantic locator, since a reference dies with the page;
- it has no expectation the passing evidence showed.

A partly shown journey may be kept for the part that was shown.

### 6. Reading a result

| Replay says | The walk does |
|---|---|
| `same` | lists it as *replayed, unchanged*. It is not a fresh grade of the `THEN` and the comment says so. |
| `changed` | walks the scenario fresh once, grades it against the current `THEN`. Pass: re-keep. Contradiction: repair it when in scope, else `FAILURE` naming the older promise. At most three per walk; the rest are unverified. |
| `skipped` | the scenario is in the change's own delta, so the change's walk covers it and re-keeps it. |
| `not-run` | names it with the reason. Never a pass, never a failure. |

`replay` learns the change's own scenarios from `--change-root`: the delta specs' MODIFIED and REMOVED scenario names. Inside `/ship` that root is the archive.

The in-scope test in `walkthrough.md` § e gains one clause: a broken kept check is in scope when the fix plausibly lives in files the branch touches. In scope means repaired without asking, by the walk's existing loop: fix, `/save`, `preflight`, replay that check, at most twice. The person chose this in review (proposal, Decision log). A break that survives two attempts, or whose cause lies outside the branch's files, is a `FAILURE`, and `/ship` asks as it does today. The walk never edits code the branch did not touch: that would turn one change into another.

### 7. Getting kept checks into the change

Only the walk inside `/ship` keeps and replays; it knows it by the checkpoint receipt `/ship` passes. After grading, it proves the candidates, runs `keep --install`, and, when the working tree changed, invokes `/save` once. `/ship` Step 4 already merges a commit the walk's fixes produced only on `SUCCESS` or `NONE`; kept checks take the same path.

A commit that changes only `.agents/verification/journeys/` changes no source, scenario, or runtime, so the walk's evidence for the earlier commit still stands and no check is walked again.

Alternative considered: have a standalone `/verify` keep checks too. Declined: it would have to save, and a walk outside `/ship` leaves the tree as it found it.

Alternative considered: a format check in each install's CI. Declined: an install's CI would gain a step, and an unreadable file already costs nothing but a `not-run` line.

### 8. Budget and tests

- New skill text: at most 1,500 bytes across `verify/SKILL.md`, `walkthrough.md`, and `ship/SKILL.md`, checked by `measure-context.mjs --check`.
- `scripts/tests/verify-journeys.test.mjs` starts the practice site (`scripts/fixtures/verify-eval/site.mjs`). Request checks run for real. Browser checks run through the fake `agent-browser` the verify script tests already use, plus one real-browser case that skips where no browser is installed.
- The practice site has five planted mistakes. A kept check holding the promised text for a broken promise must come back `changed`; one for a working promise must come back `same`.
- The walk's grading instructions do not change, so the practice-site measurement of the assistant is not rerun.

## Risks / Trade-offs

- [A kept check passes while its promise is broken] → `same` means what was seen is still seen, not that the `THEN` was graded again. The comment labels it *replayed*; a changed promise shows as `stale` and is walked fresh.
- [A flaky replay sends the assistant on fresh walks] → proof before keeping, semantic locators only, waits after navigation, and the bound of three.
- [The kept set outgrows two minutes] → the limit is fixed, changed areas go first, and rotation reaches the rest. The report names what did not run.
- [Publishing gets slower] → up to 2 min of replay, about 15 s to prove each new check, and one more save when a kept file changed. A repair of a broken older promise adds a save and a gate wait per attempt, at most two. Mid-change checks are untouched.
- [A replayed write reaches an outside service a later change wired in] → such a journey is never kept when recorded, and a writing check needs `PLAYGROUND=yes`. What remains is the same exposure a fresh walk has today on a key staging shares with the live app.
- [A hand-edited kept check runs arbitrary browser commands] → kept checks arrive through review like code, and a replay runs only in staging, in a throwaway browser profile, with no saved login.

## Migration Plan

Installs get the script and the new skill text on their next `/wong-sync`. Nothing is kept until their first publish with a page or request promise. An install with no rebuildable staging sees one report line and no other change. To back out, delete `.agents/verification/journeys/`; with no kept checks, the walk behaves as before.

## Open Questions

- The rebuild time is from three samples. The first real replays will show whether six writing checks fit in two minutes; the limit holds either way.

<!-- end design.md -->
<!-- file tasks.md utf8 4642 -->
# Tasks

## 1. Script

- [x] 1.1 Add `.agents/skills/verify/scripts/verify-journeys.mjs check`: read `.agents/verification/journeys/**`, validate `verify-journey-1` and its closed `expect` set, and classify each file `ok`, `stale`, or `unreadable` against `openspec/specs/` by scenario name and `thenDigest`. Add `scripts/tests/verify-journeys.test.mjs` cases for each class on a throwaway spec tree. Done when the cases are written.
- [x] 1.2 Add `replay` by design §§ 2-4 and 6: write selected checks into the runner's file shapes, call `verify-runner.sh`, read results into `same`, `changed`, `skipped`, `not-run`, print the `REPLAY=` summary and `replay.json`. Cover the order (changed `sourcePaths` first, then rotation by head hash), the 120 s and 30 s limits, a rebuild before each writing check, the `SEEDED` and `PLAYGROUND` conditions, the login-wall stop, and `--change-root` skips. Tests start the practice site: request checks for real, browser checks through the fake `agent-browser`, a fake rebuild command, and a shortened budget. Done when the cases are written.
- [x] 1.3 Add planted-mistake cases on the practice site: a check holding the promised text for a broken promise returns `changed`, and one for a working promise returns `same`, for one browser and one request promise each. Add one real-browser case that skips where no browser is installed. Done when the cases are written.
- [x] 1.4 Add `keep` and `keep --install` by design §§ 2 and 5: build a candidate from a walked journey, replace the preview host with `{url}`, drop screenshots, refuse a saved-login command, a credential, a snapshot reference, or no expectation, and remove files for scenarios that no longer exist. Tests cover each refusal, the host swap, and that a candidate is installed only after `replay --from` returned `same`. Done when the cases are written.

## 2. Skills

- [x] 2.1 Add the kept-check passage to `.agents/skills/verify/references/walkthrough.md`: inside `/ship`, replay after the change's own journeys settle, read the four results by design § 6, keep by § 5, and the added in-scope clause in § e: a broken kept check the branch caused is repaired without asking, within the existing two attempts. Update `.agents/skills/verify/SKILL.md`: the Order's walk step, the authorized save for kept checks, and the hard rule that journeys stay outside the repo. Done when the three skill files together add at most 1,500 bytes.
- [x] 2.2 Update `.agents/skills/ship/SKILL.md` Step 4: kept checks the walk wrote go through one `/save`, and that commit merges only on `SUCCESS` or `NONE`. Done when the step reads that way and its links resolve.

## 3. Docs

- [x] 3.1 Update `wiki/development/staging-walkthrough.md`: a *Kept checks* section (what is kept, where, when it replays, the two-minute limit, what each result means, what is never kept), the changed reasons under *Why a walk runs the way it does* and *What it is not*, and one paragraph beside *Why this engine* on the 2026-10-05 look at e2e and why only its replay idea was taken. Keep every linked heading's exact text. Done when the page stays under 3,000 words or the new section is split to its own page and linked from the hub.
- [x] 3.2 Update `wiki/development/the-change-loop.md` where `/ship`'s walk is described, in one sentence that links the new section. Done when the sentence is there and links the section's heading.

## 4. Release

- [x] 4.1 Add the `## Next (minor)` entry to `CHANGELOG.md` in plain words, with an **Updating.** note saying nothing needs doing and that the first kept checks appear at the next publish with a page or request promise. Done when the entry is the top entry.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` before the first push, which covers `check-payload-links.mjs`, `check-openspec-config.mjs`, `measure-context.mjs --check`, and the script tests. Then `/save`, and confirm CI passes.
- [x] 5.2 After `/save`, replay for real against this branch's preview: take the staging turn with `preflight`, then run `replay --from` a temp folder holding one hand-written read-only check for a starter-app scenario and expect `same`; change its expected text and expect `changed`; then `cleanup`. Record both outputs and the replay's seconds in this folder as `replay-check.md`. No kept file is committed by this task.
- [x] 5.3 Record an open `verify` thread in memory for what only later publishes can show: the first real publish with a page promise keeps a check, the next one replays it inside two minutes, and how long a rebuild between writing checks takes. Done when the thread exists.

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 946 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The walkthrough is evidence, not a gate

`/ship` SHALL run `/verify` once before the merge and report its verdict (`staging-walkthrough`). A walk that cannot run, or a missing `verify` skill, SHALL NOT block the merge and SHALL NOT be installed; a walk `FAILURE` SHALL stop and ask the person to fix it or merge anyway, and a merge anyway SHALL be recorded in the report. Kept checks the walk wrote SHALL be saved once, and `/ship` SHALL merge that commit only when its gate passes.

#### Scenario: The walk fails

- **WHEN** the ship-time walk returns `FAILURE` after its own fix attempts
- **THEN** `/ship` stops before merging and asks whether to fix first or merge anyway

#### Scenario: The walk kept a check

- **WHEN** the ship-time walk wrote or replaced a kept check and its verdict is not `FAILURE`
- **THEN** `/ship` saves once more and the merged change carries the kept check

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 5721 -->
# Spec Delta

## ADDED Requirements

### Requirement: A passed journey is kept as a replayable check

When a walk inside `/ship` grades a browser journey or a request probe as a pass, it SHALL keep a replayable check in the project, beside its verification recipes: the steps, what the passing evidence showed, and a reference to the scenario, never a copy of its `THEN`. A check SHALL be kept only after it replays unchanged, alone, on staging rebuilt from the seed. A journey that needs a person's login, triggers an outside service or a scheduled job, or whose steps hold a credential SHALL NOT be kept. A walk outside `/ship` SHALL keep none.

#### Scenario: A new promise passes

- **WHEN** the walk inside `/ship` passes a browser journey for a scenario that has no kept check
- **THEN** the project holds a kept check for that scenario after the publish, and it replays with no model call

#### Scenario: A recording that does not replay

- **WHEN** a passed journey's recording differs when replayed alone from the seed
- **THEN** it is not kept, the report names it, and the walk's verdict is unchanged

### Requirement: Kept checks replay before publishing without a model

The walk inside `/ship` SHALL replay the project's kept checks against the preview with no model call, within two minutes in total. Checks recorded against files the branch changed SHALL run first; the rest SHALL run in an order that differs between revisions, so every check is reached over time. A check that writes SHALL start from the seed. Every check that did not run SHALL be named with its reason and SHALL NOT count as a pass. Where staging was not rebuilt from the seed, nothing SHALL replay, the report SHALL say why, and the walk's verdict SHALL be unchanged. A walk outside `/ship` SHALL replay only when the person asks.

#### Scenario: More kept checks than the limit allows

- **WHEN** the project holds more kept checks than two minutes can replay
- **THEN** the checks for the areas the branch changed run first, the replay stops at the limit, and the report names each check that did not run

#### Scenario: A project with no disposable staging

- **WHEN** the walk inside `/ship` runs where staging can not be rebuilt from the seed
- **THEN** no kept check replays, the report says why, and the walk's verdict is what it would have been without kept checks

### Requirement: A changed replay gets one fresh walk

A kept check whose replay differs SHALL be walked fresh once and graded against its scenario's current `THEN`. A pass SHALL replace the kept check and leave the verdict unaffected. At most three kept checks SHALL be walked fresh in one walk; the rest SHALL be named unverified. A kept check whose scenario the change itself modifies SHALL NOT be replayed; the change's own walk SHALL replace it. A kept check whose scenario no longer exists SHALL be removed.

#### Scenario: A renamed button

- **WHEN** a replay differs because a control was renamed and the fresh walk shows the scenario's `THEN` still holds
- **THEN** the kept check is replaced with the new recording and the walk's verdict is unaffected

#### Scenario: The change rewrites the promise

- **WHEN** the change's own delta modifies a scenario that has a kept check
- **THEN** that check is not replayed, and the change's own passing walk replaces it

### Requirement: A change that breaks an older promise repairs it

When a fresh walk of a changed kept check contradicts its scenario's `THEN` and the cause plausibly lies in files the branch changed, the walk SHALL repair it without asking, under its existing bound of two attempts, and replay that check after each repair. A contradiction that survives the bound, or whose cause lies outside the branch's files, SHALL make the walk a `FAILURE` that names the older promise; the walk SHALL NOT edit code the branch did not change to repair it.

#### Scenario: The change broke an older feature

- **WHEN** the fresh walk contradicts an older scenario's `THEN` and the cause lies in files the branch changed
- **THEN** the walk repairs it, saves, and replays that check, and the report names the older promise and the repair

#### Scenario: A break the change did not cause

- **WHEN** the fresh walk contradicts an older scenario's `THEN` and the cause lies outside the branch's files
- **THEN** the walk is a `FAILURE` that names the older promise, with no repair

## MODIFIED Requirements

### Requirement: The walk leaves the repo as it found it

Journeys and evidence SHALL live outside the working tree and SHALL be deleted on every exit, including a stop on `UNKNOWN` or a pause to ask. The one thing a walk MAY leave in the working tree is its kept checks, and only inside `/ship`. Cleanup SHALL refuse any path the walk did not create. The evidence SHALL be screenshots, captured requests, and command output, never a video.

#### Scenario: Any verdict

- **WHEN** a walk outside `/ship` ends, whatever its verdict
- **THEN** `git status` shows the same working tree it started from

#### Scenario: A path the walk did not make

- **WHEN** cleanup is given a path outside its temp run folders
- **THEN** it removes nothing and exits non-zero

### Requirement: The walkthrough page records what was declined

The walkthrough page SHALL record the options declined and why: an in-repo test framework, a second judging agent, walking the whole spec set afresh, replaying kept checks on every walk, and walking on every `/save`. It SHALL also record why this browser engine was chosen and what replacing it costs.

#### Scenario: Why not walk on every save

- **WHEN** a reader asks why the walk does not run on every `/save`
- **THEN** the page gives the decision and its reason

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-05

~~~
<!-- end .openspec.yaml -->
<!-- file replay-check.md utf8 2197 -->
# A real replay on this branch's preview

Run on 2026-10-05 against `https://e2e-testing-wongstack-staging.matthewwong525.workers.dev` at commit `d00e9a0f`, after the save's checks passed. `preflight` printed `TURN=held`, `SEEDED=yes`, `PLAYGROUND=yes`; `cleanup` gave the turn back. No kept file was committed.

The check was made the way a walk makes one, not written by hand: a browser journey opened `/nothing-here` for the `app-scaffold` scenario *An unknown address*, the screenshot showed "Page not found" and a "Go home" link, and `keep` built the candidate with `{"text":"Page not found"}`, `{"text":"Go home"}`, `{"path":"/nothing-here"}`. `keep` set `writes: false` and swapped the preview address for `{url}`.

| Run | Output | Seconds |
|---|---|---|
| `replay --from <run-dir>/keep`, as recorded | `same app-scaffold/an-unknown-address` · `REPLAY=same 1, changed 0, skipped 0, not-run 0; 14s` | 14.0 |
| the same, first expectation altered to "Page was found" | `changed app-scaffold/an-unknown-address — the page no longer shows "Page was found"` · `REPLAY=same 0, changed 1, skipped 0, not-run 0; 16s` | 16.2 |
| `check`, then `replay` from the project, on a file that was not valid JSON | `unreadable … it is not a verify-journey-1 file` · `not-run … unreadable` · `REPLAY=… not-run 1; 0s` | 0.1 |

What this shows and does not:

- A replay with no model call returns `same` for a page that still shows what was recorded, and `changed`, naming the missing text, for one that does not.
- Both timed runs are proofs (`--from`), which rebuild staging first, so about 12 of each run's seconds are the rebuild. A plain replay of a read-only check, with no rebuild, was not timed: the third run was meant to, but the copy of the candidate it used was damaged by the command that made it, so it showed the `not-run` path instead.
- An earlier attempt at the second run changed nothing in the file and so returned `same`; the altered file was confirmed by reading it back before the run recorded above.
- Not shown here: a writing check, a rebuild between two checks, the two-minute limit, and a check kept and installed by a real publish. Those are the open `verify` thread.

<!-- end replay-check.md -->
<!-- file review.html utf8 41699 fence=~~~ -->
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
<title>Review · 2026-10-05-replay-kept-checks</title>
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
<body data-change="2026-10-05-replay-kept-checks">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-05-replay-kept-checks</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Every preview check is written fresh by the assistant and thrown away after. Nothing ever looks at an old feature again, so a change can break one and nobody hears until someone trips over it. Re-checking old features with AI each time was ruled out as too slow. A recorded check replays in seconds with no AI, and staging now starts every check from the same sample data, which is what a replay needs.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Old features are replayed before a change goes live.</b> The check before publishing replays every kept check it has time for, with no AI. It stops after 2 minutes. The areas your change touches go first, and any that did not fit are named. A replay that looks different gets one fresh look from the assistant.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">checks ─▶ preview check ─▶ +replay ─▶ live</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">                              │ differs</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">                              ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">                        +one fresh look</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">                         │           │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">                       holds      broken</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">                         ▼           ▼</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">                    update it     +fix it</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A passed check is kept.</b> When the check before publishing passes a promise about a page or a request, it saves the clicks and what the page showed, beside your code. It is kept only after it replays cleanly once, by itself, from fresh sample data. One that does not is named and left out.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A change that breaks an old feature fixes it.</b> When the fresh look finds an old promise no longer holds because of your change, the assistant fixes it, saves, and replays that check, without stopping to ask. It stops and asks only when two tries did not fix it, or when the break does not come from your change: fix it first, or publish anyway. When the promise still holds and only the page changed, such as a renamed button, the kept check is updated and nothing stops.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>A change that alters a screen updates its own kept check.</b> A promise your change rewrites is not replayed. It is checked fresh as usual and kept again. A promise your change removes takes its kept check with it.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Some checks are never kept.</b> One that needs your login, triggers an outside service or a timed job, or carries a password stays a one-time check.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Publishing takes a little longer.</b> Up to 2 minutes for the replay, and one more short save when a check was kept or updated. A fix for a broken old feature adds its own save and re-check. Checks you run in the middle of a change stay as fast as today, and replay only if you ask.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Unchanged:</b> a check that cannot run still never holds a change up. No new tool is installed, no AI key is needed, and nothing is added to your project's dependencies. A project whose staging cannot be rebuilt from sample data keeps and replays nothing, and the check says so.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> Adopting the e2e test tool or any other test tool. Replaying on every save, in mid-change checks, or on a nightly schedule. Replaying against the live app. Walking through features that already shipped to give them kept checks: the set grows from use. Kept checks for phone apps, for facts read from the database, or for evidence taken from the automatic checks. Video.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked when the kept checks should replay → chose only before publishing, with a 2-minute limit. Preview checks already feel long; chat logs from the last 12 days show the browser part takes about 16 seconds and the assistant's writing and reading take the rest.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked where the kept checks should live → chose in the project, with the code.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the e2e test tool is not adopted, because it adds packages and test files to every project, its AI steps need a paid key for anyone on a Claude subscription, and its guide alone is two thirds the size of all our skill instructions. Only its replay idea is taken.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a check is kept only after it replays cleanly once by itself from fresh sample data, because a recording that fails on the next person's publish costs them a fresh look for nothing.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a broken old promise stops the publish and asks, like a failed check today, because a softer kind of failure would let the break go live unseen.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: at most three fresh looks per publish, with the rest named as not checked, because one renamed menu could otherwise send the assistant through every kept check.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a kept check stores what the passing page showed and points at the written promise, never a copy of it, because a second copy of a promise goes stale when the promise changes.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: checks that need a login, trigger an outside service or a timed job, or carry a password are never kept, because a replay runs unattended and a kept check is saved with the code where others can read it.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: only page and request checks are kept, because those are the two kinds the browser tool and a plain request can repeat without the assistant.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: no kept checks are made for features that already shipped, because the wiki's rule is to grow from use and a backfill is a long AI run nobody asked for.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the practice-site measurement of the assistant's grading is not rerun, because the instructions for writing and grading a fresh check do not change; the replay is a program and gets its own tests on the practice site.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked in review what happens when a change breaks an old feature → chose that the assistant fixes it, not that the publish stops and asks. This replaces the earlier assumption. Stopping to ask stays for a break two tries did not fix and for one the change did not cause, because a publish should not rewrite code the change never touched.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the kept-checks wiki section is its own page, <code>wiki/development/kept-checks.md</code>, because the walkthrough page had 31 words left under its 3,000-word limit. The walkthrough page keeps the changed reasons and the look at e2e; a few of its older sentences were shortened to make room, with no fact removed.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: checks for files the branch changed run first even when they write, ahead of read-only checks for other areas, because the promise is that changed areas go first. A read-only check that follows a writing one starts from a rebuild.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: a kept check is named after its scenario, so keeping it again replaces the same file. The check before publishing records whether staging was rebuilt in its run folder (<code>staging-facts</code>), and the replay reads it from there. <code>keep</code> takes the preview address (<code>--url</code>) to swap it out.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the build is saved now that all code and tests are written, so the automatic checks and one real replay on this branch's preview can run; the three verification tasks stay open until each is seen to pass.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-05</p>Asked whether to stop shared files, such as the release notes and tests, from counting as an area a change touched → chose yes, then publish. Nearly every change here touches the release notes, so every kept check would have gone to the front and the order would have meant nothing.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the plan is filed in the archive and numbered 33.1.0 for publishing, because every task is done, the automatic checks passed on the build, and one real replay on the preview returned <i>same</i> and then <i>changed</i> as expected.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-05</p>Assumed: the check before publishing walked the starter app's page-not-found promise, which is not part of this change, because the change's first promise needs a passed page check to keep and the change has no page of its own. It passed, was kept as this project's first kept check, and replays in 3 seconds; this save carries it.</li>
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
