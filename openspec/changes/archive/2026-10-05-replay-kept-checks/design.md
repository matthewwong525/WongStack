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
