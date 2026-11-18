<!-- openspec-archive v1 2026-07-08-optional-ci-gate -->
<!-- file proposal.md utf8 2319 -->
## Why

WongStack's doctrine currently asserts GitHub Actions as *the* build gate — "CI is the only gate," "nothing builds locally." That framing makes CI a required pillar, which is wrong: the durable system is pull requests (available on any VCS forge), version control, OpenSpec, and everything-lives-in-the-repo. CI is an optional accelerator, not the foundation — and plenty of target repos have thin or no CI.

## What Changes

- Reframe the delivery doctrine everywhere it appears: **GitHub Actions is optional and honored when present, never required.** The gate is CI when a repo has checks configured; otherwise the gate is **PR review only** (a human approves the PR).
- No behavioral change to the skills' mechanics — `wait-for-checks.sh` already returns `NONE` when no checks exist, and `/save`/`/ship` already proceed on `NONE`. This change makes the *prose* match the mechanics and removes "CI is the only gate" absolutism.
- No local-build fallback is introduced: skills still never build or test locally as a prerequisite, whether or not CI is present.
- Doctrine/wording edits across the payload: `CLAUDE.md` rule, `README.md` (delivery pitch + "CI is the only gate" + prerequisites), `save/SKILL.md`, `ship/SKILL.md`, `wait-for-checks.sh` header comment, `docs/development/the-change-loop.md`, `install-wong-stack/SKILL.md`.
- Release chore: bump `VERSION` (minor — doctrine shift, no breaking behavior) and add a newest-first `CHANGELOG.md` entry.

Non-goals: rewriting the PR tooling to support non-GitHub forges (skills still use `gh`); adding a local-verify gate; changing the CI wait/auto-fix mechanics.

## Capabilities

### New Capabilities
- `delivery-gate`: the rule that governs when `/save` checkpoints and `/ship` merges — CI-when-present-else-PR-review, with no local build in either path.

### Modified Capabilities
<!-- None — no existing specs in openspec/specs/. -->

## Impact

- Prose only: `CLAUDE.md`, `README.md`, `docs/development/the-change-loop.md`, and skills `save`, `ship`, `install-wong-stack`; the header comment of `save/scripts/wait-for-checks.sh` (comment only, no logic change).
- `VERSION` + `CHANGELOG.md` (release bookkeeping).
- No code logic, no test suite (payload is markdown). Existing `NONE → proceed` behavior is now the documented contract.

<!-- end proposal.md -->
<!-- file design.md utf8 2397 -->
## Context

The delivery mechanics already degrade gracefully without CI: `wait-for-checks.sh` prints `RESULT: NONE` when a repo reports no checks, and both `/save` (Step 4) and `/ship` (Step 4) treat `NONE` as "proceed." `README.md:66` already calls CI "optional." The problem is doctrine: several places assert CI as the *only* / *required* gate, contradicting the mechanics and the intended philosophy. This change is a coordinated wording pass — no logic changes — plus a release bump.

## Goals / Non-Goals

**Goals:**
- One consistent phrasing of the gate across the payload: **CI when present, else PR review; never a local build.**
- Name the durable pillars (PRs on any forge + version control + OpenSpec + repo-as-record) rather than CI.
- Keep the existing `NONE → proceed` mechanics; document them as the contract.

**Non-Goals:**
- No local-verify fallback.
- No forge-portability work — skills still use `gh` for PR mechanics; the doctrine is just worded forge-neutrally where natural.
- No change to the CI wait/auto-fix loop or merge steps.

## Decisions

**Canonical phrasings** (reuse verbatim so the payload reads as one voice):
- Gate: *"CI is the gate when the repo has checks; otherwise PR review is the gate. Either way, nothing builds locally."*
- Pillars: *"the plan and the record live in OpenSpec and the repo; delivery rides on pull requests (any forge) — CI is an optional accelerator, honored when present."*
- Replace "GitHub Actions is the build gate" / "CI is the only gate" / "GitHub Actions is the only gate" with the gate phrasing above, trimmed to fit each spot.

**Why keep `gh`/GitHub mechanics:** rewriting for GitLab/Gitea is a much larger change; the user's ask is the doctrine shift. Wording stays forge-neutral in doctrine, concrete (`gh`) in runbook steps.

**VERSION bump:** minor (`3.0.0 → 3.1.0`) — doctrine/wording shift, no breaking behavior change for existing green-CI repos.

## Risks / Trade-offs

- [A no-CI repo can merge unreviewed/broken code if the human skips review] → PR review is explicitly named as the gate; `/ship` still opens/updates a PR, so review is the natural checkpoint. Acceptable per the chosen "PR review only" gate.
- [Wording drift — some spot missed] → the tasks list enumerates every known location (grep-verified) so the pass is exhaustive; a final grep for the old phrases confirms none remain.

<!-- end design.md -->
<!-- file tasks.md utf8 2357 -->
## 1. Doctrine — core files

- [x] 1.1 `CLAUDE.md`: reframe the "GitHub Actions is the build gate. Don't build/test locally" rule → CI honored-if-present, else PR review; nothing builds locally; plan/record live in OpenSpec + the repo (any forge).
- [x] 1.2 `README.md` line ~5: change "It's GitHub-native for delivery: GitHub Actions is the build gate" → PR-based delivery on any forge, CI an optional accelerator honored when present.
- [x] 1.3 `README.md` line ~27: rewrite "CI is the only gate. Nothing builds locally." → gate is CI when present, else PR review; still nothing builds locally.
- [x] 1.4 `README.md` line ~16/17 (save/ship table rows): soften "wait for CI green" to "wait for CI green when present" (or equivalent) so the table matches the doctrine.
- [x] 1.5 `README.md` line ~66 (prerequisites): align wording so "CI optional" reads consistently with the new doctrine.

## 2. Doctrine — skills & docs

- [x] 2.1 `.claude/skills/save/SKILL.md`: intro ("GitHub Actions is the gate"), Step 4/Step 5 notes, and Hard rules ("GitHub Actions is the only gate") → CI-if-present-else-PR-review; keep the `NONE → proceed` mechanics intact.
- [x] 2.2 `.claude/skills/ship/SKILL.md`: intro ("GitHub Actions is the only gate"), Step 4, and Hard rules → same reframe; `/ship` merges on green when CI present, else after PR review.
- [x] 2.3 `.claude/skills/save/scripts/wait-for-checks.sh`: soften the header comment ("This is WongStack's build/test gate: we never build or test locally") to reflect CI-optional; no logic change.
- [x] 2.4 `docs/development/the-change-loop.md`: `/save` "wait for CI" wording → "wait for CI when present."
- [x] 2.5 `.claude/skills/install-wong-stack/SKILL.md` line ~75: "checkpoint behind GitHub-Actions-as-only-gate" → CI-optional framing (already notes "Thin/absent CI is fine").

## 3. Release bookkeeping

- [x] 3.1 Bump `VERSION` `3.0.0` → `3.1.0`.
- [x] 3.2 Add a newest-first `CHANGELOG.md` entry for the doctrine shift (CI optional; PR review is the no-CI gate).

## 4. Verify

- [x] 4.1 Grep the payload for stale absolutes — "the build gate", "only gate", "CI is the only", "GitHub-native for delivery" — and confirm none remain (or are reworded).
- [x] 4.2 Sanity-read `save`/`ship` runbook steps to confirm the `NONE` path still proceeds and no local-build step was introduced.

<!-- end tasks.md -->
<!-- file specs/delivery-gate/spec.md utf8 2319 -->
## ADDED Requirements

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. Doctrine text across the payload — `CLAUDE.md`, `README.md`, `docs/development/the-change-loop.md`, and the `save`, `ship`, and `install-wong-stack` skills — MUST NOT assert CI as the sole or required gate. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

### Requirement: The gate is CI-when-present, else PR review

`/save` and `/ship` SHALL determine the gate by whether the repo has checks configured. When checks exist, the skills wait for them and, on failure, read-fix-repush (capped); `/ship` merges only on green. When no checks exist, the gate SHALL be PR review only — the PR plus the OpenSpec change and the in-repo record is the system, and a human approves the PR before `/ship` merges.

#### Scenario: Repo has CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` reports checks
- **THEN** the skill waits for the checks, auto-fixes on red (cap 3 attempts), and `/ship` merges only once green

#### Scenario: Repo has no CI configured

- **WHEN** `/save` or `/ship` runs and `wait-for-checks.sh` returns `NONE`
- **THEN** the skill proceeds without waiting for or requiring any CI run
- **AND** `/ship` merges on the strength of PR review rather than a green CI run

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate.

#### Scenario: No CI present does not trigger a local build

- **WHEN** a repo has no CI and `/ship` is invoked
- **THEN** the skill does not run a local build or test as a gate; it relies on PR review

<!-- end specs/delivery-gate/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-07

~~~
<!-- end .openspec.yaml -->
