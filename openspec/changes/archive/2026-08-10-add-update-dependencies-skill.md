<!-- openspec-archive v1 2026-08-10-add-update-dependencies-skill -->
<!-- file proposal.md utf8 7855 -->
# add-update-dependencies-skill

**Status:** ready-to-ship
**Open questions:** whether to upgrade the two OS-managed tools this run left behind — `gh` 2.46.0 → 2.97.0 and Node 22.22.1 → 26.7.0. Both need `sudo`/apt and change the machine rather than the repo, which is the case the skill says to ask about rather than act on.

## Why

Keeping this repo current — the OpenSpec CLI, the browser CLI `/walk` drives, `gh`/`git`/`node`, the `app/` npm dependencies, and the `openspec-*` skill layer `openspec init` generates — is done by hand today, one tool at a time, and only when something breaks or a session happens to notice. The last CLI bump (1.8.0) showed the shape of the work: survey, update, regenerate, check what rippled into the payload, then decide whether the result is a release. That sequence is repeatable, so it should be a verb rather than a memory.

## What Changes

- Add a new skill at `.claude/skills/update-dependencies/` (invoked as `/update-dependencies`) that brings this repo's toolchain and dependencies to their latest versions in one run, through five stages: **survey**, **machine**, **regen**, **deps**, **hand off**.
- The skill is **meta-repo-only**: it is deliberately kept **out of** [the payload manifest](../../../.claude/skills/wong-sync/references/payload-manifest.md), so `/wong-sync` never copies it into a target repo. Target repos keep their own update story; this verb maintains the source clone.
- Because the skill is not payload, adding it needs **no `VERSION` bump and no `CHANGELOG.md` entry**. Its *runs*, however, can still produce releases — when a regeneration or a bump changes a payload file, the skill flags that the run is a release and the ordinary release rules apply.
- The skill takes dependencies **aggressively to latest, majors included**. It owns no test harness: it bumps, reads the changelogs and migration notes for every major, fixes what it can see breaking, then hands the diff to `/save`. CI is the gate exactly as for any other change.
- Invocation is **on-demand only**. Running it on a schedule is explicitly out of scope for this change.

## Capabilities

### New Capabilities
- `dependency-currency`: how the WongStack meta-repo keeps its own tools, generated layers, and app dependencies at their latest versions — the update sequence, the aggressive-to-latest posture with CI as the only gate, the release-ripple check, and the meta-repo-only scoping that keeps the verb out of target repos.

### Modified Capabilities
<!-- None. `toolchain-dependencies` governs which tools the *payload* is allowed to
     depend on; this change adds no dependency to the payload and does not relax
     that rule. The new skill only updates tools that repo already has. -->

## Impact

- **New file:** `.claude/skills/update-dependencies/SKILL.md` (plus `references/` if the runbook outgrows one page).
- **Unchanged on purpose:** [the payload manifest](../../../.claude/skills/wong-sync/references/payload-manifest.md). Leaving it alone is the mechanism that scopes the skill to this repo, so it is a decision, not an omission.
- **`VERSION` 11.3.0 → 11.4.0 and a new `CHANGELOG.md` entry.** Not for the skill — adding that needs neither — but because this change also carries the verb's **first run**, which bumped `app/`, and `payload-files.json` ships the whole `app` dir under `scaffold`. The run is a release; the skill's Stage 3 says so, and this change proves it on itself.
- **Read by the skill, written only during a run:** `app/package.json` + `app/package-lock.json`, the generated `.claude/skills/openspec-*` skills and `.claude/commands/opsx/`, and — when a run ripples into the payload — `VERSION` and `CHANGELOG.md`.
- **Real ceiling on safety:** whatever `.github/workflows/test.yml` covers. `app/` runs `vitest` and `oxlint`; nothing outside that gets caught automatically, and nothing builds locally.

## Decision log

- **2026-08-10** — Change created and implemented in one session. **Named `add-update-dependencies-skill`** rather than `update-dependencies` to avoid collision with the just-shipped `update-openspec-deps` branch. **Scoping decided by manifest omission, not a flag:** `/wong-sync` copies exactly the manifest, so leaving the skill out of it is sufficient and needs no new mechanism; the cost is that the omission reads as a bug, so the skill's own text states it and the spec makes it a requirement — a future diff adding the entry now fails against a written contract. Rejected shipping it as payload with a "meta-repo only" note: a target would gain a verb whose update policy it never chose. **Rejected a `scripts/update-deps.mjs`:** the mechanical half is two npm commands and the judgment half (reading a major's migration guide, spotting a payload ripple) is what a script cannot do; splitting them would put the report and the judgment in different places.
- **2026-08-10** — **The first run falsified task 2.2's premise, and that is the interesting result.** The plan assumed this change touches no payload file, so no `VERSION` bump. Running the verb end to end (task 3.1) bumped `app/`, and `payload-files.json` ships the whole `app` dir under `scaffold` — so `app/package.json` *is* payload and the run *is* a release. Task 2.2 was rewritten to record the distinction rather than deleted: the skill's own files still warrant no bump; the run's output does. `VERSION` 11.3.0 → 11.4.0 (minor — additive to a scaffold that target repos may or may not have taken).
- **2026-08-10** — **Three majors taken, all clean.** TypeScript `~6.0.2` → `~7.0.2` (the Go compiler): its headline break is `strict` on by default where a tsconfig omits it, and all three of the scaffold's configs omit it — they typecheck clean under it anyway, so no config changed. Its dropped `target: es5` / `amd`-`umd`-`systemjs` modules / `moduleResolution: node10` do not apply (the scaffold is `es2023` + `bundler`/`nodenext`). Vitest `^3.2.4` → `^4.1.10` is a no-op here: `app/vitest.config.ts` uses no `workspace`, no `basic` reporter, no browser mode, no coverage block, and its Vite ≥ 6 / Node ≥ 20 floors are met. `@types/node` `^24` → `^26` is two majors of types against a CI runtime still on Node 22 — taken per the aggressive-to-latest posture, flagged as the one bump whose types now describe a newer runtime than the suite executes on. **npm rewrote TypeScript's range `~` → `^`; restored to `~`** because the scaffold pins TS deliberately (TS does not follow semver).
- **2026-08-10** — `tsc -b`, `vitest run` (17 tests) and `oxlint` were run **to discover what the majors broke, not as the gate**. The skill forbids a local build as a *prerequisite for handing off* or as a second gate; using one to find breakage before the CI wait is the auto-fix loop working early. CI remains the gate, and its coverage is the stated ceiling.
- **2026-08-10** — Left undone by design: `gh` 2.46.0 → 2.97.0 and Node 22.22.1 → 26.7.0. Both are OS-package-managed and would need `sudo`, which is the one action that changes the machine rather than the repo — the skill says name it and ask. Open question for the user.
- **2026-08-10** — Checkpointed as PR #69. CI green on the first push, so the three majors passed the gate with no auto-fix round: `vitest` (17 tests), `oxlint`, and the payload link check all clean. That is the whole of what was verified — `app/`'s suite is the ceiling, and nothing outside it was exercised. All 13 tasks complete; Status `ready-to-ship`.
- **2026-08-10** — Archived by `/ship` and checkpointed through the delegated `/save`. The change moved to `openspec/changes/archive/2026-08-10-add-update-dependencies-skill/`; `openspec/specs/dependency-currency/spec.md` holds the synced result (ADDED-only delta, verified identical before the move). Status `ready-to-ship`.

<!-- end proposal.md -->
<!-- file design.md utf8 5842 -->
## Context

See proposal.md — Why.

The constraints that shape the approach:

- **Nothing builds locally.** [The gate](../../../wiki/development/the-change-loop.md#the-gate) is CI when present, else PR review. A skill that ran a suite locally to decide whether a bump is safe would be inventing a second gate.
- **`/save` already owns the loop this skill needs.** It commits, pushes, opens or updates the PR, waits for checks, and auto-fixes failures. An update pass is therefore mostly *deciding what to bump*; the verification half already exists.
- **This repo's own dependency surface is small and mixed:** globally installed npm binaries (`@fission-ai/openspec`, `agent-browser`), OS-level tools (`git`, `gh`, `node`), an npm project at `app/`, and a *generated* layer (`.claude/skills/openspec-*`, `.claude/commands/opsx/`) that is a function of the OpenSpec CLI version rather than of anything committed by hand.
- **The payload is prose with no compiler.** A CLI upgrade that renames or adds a generated skill silently invalidates every payload page that names or counts them, and [`scripts/check-payload-links.mjs`](../../../scripts/check-payload-links.mjs) catches only links, not counts.
- **`/wong-sync` copies exactly the manifest.** That makes manifest membership the whole scoping mechanism — no flag, no conditional, no opt-out list.

## Goals / Non-Goals

**Goals:**

- One verb that leaves this repo at latest across every dependency surface, with a single readable `old → new` report.
- A regeneration step that ends by answering one question: *is this run a release?*
- Reuse of `/save` for everything after the diff exists.

**Non-Goals:**

- Any scheduling, cron, or automatic invocation.
- Any behavior in a target repo. Target repos are unaffected by this change in every respect.
- A test harness, a local build step, a lockfile audit, or a security-advisory scan. Those are separate concerns and adding them here would blur the verb.
- Updating the machine's OS packages beyond the named tools.

## Decisions

**A skill, not a script.** The work is judgment-heavy — reading a major's migration guide and applying it, deciding whether a generated-layer diff rippled into prose — which is exactly what a script cannot do. Considered a `scripts/update-deps.mjs` that does the mechanical bumps and leaves the reading to a human; rejected because the mechanical half is two `npm` commands and the split would put the report in one place and the judgment in another.

**Meta-repo-only by manifest omission, not by a flag.** `/wong-sync` copies only manifest files, so leaving the skill out of [the payload manifest](../../../.claude/skills/wong-sync/references/payload-manifest.md) is sufficient and needs no new mechanism. The cost is that the omission looks like a bug to a later reader, so the skill's own text states the scoping and why — that sentence is load-bearing, not decoration. Considered adding the skill to the payload with a "meta-repo only" note; rejected because a target repo would then have a verb whose update policy it never chose, aimed at tools it may not use.

**Aggressive to latest, majors included.** The alternative — latest-minor with majors surfaced for approval — defers exactly the work that is worth doing while the context is loaded, and lets majors accumulate until the upgrade is a project. Taking the major now means the migration is read once, against a small diff, with CI to catch the rest. The honest cost is stated in the spec: CI's coverage is the ceiling, and `app/`'s coverage is `vitest` plus `oxlint`.

**Survey before change, always.** The report of what *is* out of date has value even when the user stops there, and it makes the run's later output checkable against its own opening. It also gives the skill a natural no-op exit.

**Regen ripple check is name-and-count based.** After `openspec update`, compare the set of generated skill and command names against what the payload's prose says — the wiki's skill listings, `CLAUDE.md`'s verb list, the manifest — because a link checker cannot see a wrong count. Then run [`scripts/check-payload-links.mjs`](../../../scripts/check-payload-links.mjs) for the link half.

**Hand off rather than commit.** The skill runs no git. `/save` is the only checkpoint, consistent with the repo's rule that the WongStack git skills own every git action.

**Release detection is a payload-path test.** "Did any file in the payload manifest change?" is mechanical and exact, and answers the `VERSION`/`CHANGELOG.md` question without judgment. The judgment that remains is only *which* semver segment.

## Risks / Trade-offs

- **A major breaks something CI does not cover** → Stated openly in the skill's own output rather than hidden; the run reports what CI verified, and the bump is on a branch and a PR, so reverting is one merge decision, not a recovery.
- **`agent-browser` and the OpenSpec CLI are the only tools whose upgrade can change payload behavior** → Both are surveyed and regenerated explicitly; `openspec update` runs every pass so a drifted generated layer is corrected even when the CLI version did not move.
- **The manifest omission gets "corrected" by a future sync or reviewer** → The skill states its own scoping, and this change's spec makes the omission a requirement, so a diff that adds it fails review against a written contract.
- **A payload-touching run turns a routine bump into a release** → That is correct, not a risk; the mitigation is that the skill flags it rather than letting the payload change land un-versioned.
- **A run leaves the repo half-updated if it stops mid-way** → Everything it writes is uncommitted until `/save`, so an abandoned run is discarded with the working tree.

## Open Questions

None. Scheduling is deferred by decision, not by uncertainty.

<!-- end design.md -->
<!-- file tasks.md utf8 3852 -->
## 1. The skill

- [x] 1.1 Create `.claude/skills/update-dependencies/SKILL.md` with frontmatter (name `update-dependencies`, a description whose triggers cover "update dependencies", "bump the tools", "are we on the latest OpenSpec", "upgrade the app deps") and an opening that states the verb is **meta-repo-only** and **on-demand**.
- [x] 1.2 Write the **Survey** stage: report installed vs latest for the OpenSpec CLI, `agent-browser`, `gh`, `git`, `node`, every dependency in `app/package.json`, and the generated `openspec-*` skill layer — as one `old → new` table, marking already-current entries as current rather than omitting them. Include the no-op exit when nothing is out of date.
- [x] 1.3 Write the **Machine** stage: update the globally installed tools to latest and report each `old → new`. Follow [required-tools](../../../wiki/development/required-tools.md) for what each tool is and link rather than restate.
- [x] 1.4 Write the **Regen** stage: run `openspec update`, then the ripple check — compare generated skill and command names/counts against the payload prose that cites them, and run `node scripts/check-payload-links.mjs`. End the stage by answering "is this run a release?" explicitly in both directions.
- [x] 1.5 Write the **Deps** stage: bump `app/` to latest including majors, read each major's changelog or migration guide, and apply the migration to this repo's code. State that no major is skipped and no bump is approved individually.
- [x] 1.6 Write the **Hand off** stage: the skill runs no git; it hands the diff to `/save`, CI is the gate, and failures are fixed through `/save`'s auto-fix loop. State that CI coverage is the ceiling on what is verified, and do not claim majors are proven safe.
- [x] 1.7 Add the scoping paragraph: the skill is deliberately absent from [the payload manifest](../../../.claude/skills/wong-sync/references/payload-manifest.md), that omission is what keeps `/wong-sync` from delivering it to targets, and editing this skill alone needs no `VERSION` bump or `CHANGELOG.md` entry — while any payload file a *run* touches does.
- [x] 1.8 Check the skill against the spec's scenarios in `specs/dependency-currency/spec.md`: nothing-out-of-date run, scheduled-run request, new major, red CI, honest-confidence report, CLI upgrade that adds a generated skill, generated-only regeneration, target-repo sync, manifest-omission question.
- [x] 1.9 Confirm the skill restates no doctrine another file owns — the gate, the release rules, the manifest contents — and links to the owner instead, per [payload-single-source](../../../openspec/specs/payload-single-source/spec.md).

## 2. Deliberately unchanged

- [x] 2.1 Confirm `.claude/skills/wong-sync/references/payload-manifest.md` gains **no** entry for this skill, and that no other manifest-adjacent list picks it up.
- [x] 2.2 Confirm the `VERSION`/`CHANGELOG.md` treatment is correct. **Revised during apply:** the premise that this change touches no payload file was falsified by task 3.1 — running the verb end to end bumped `app/`, and `payload-files.json` ships the whole `app` dir under `scaffold`. Adding the skill still warrants nothing on its own; the change carries a `VERSION` bump and a `CHANGELOG.md` entry because *the run* is a release, exactly as the skill's Stage 3 requires. Record the distinction in the Decision log at checkpoint time.

## 3. Verification

- [x] 3.1 Invoke `/update-dependencies` once end to end in this repo and confirm the five stages run, the survey report is complete, and the release question is answered — verified via `/save`.
- [x] 3.2 Confirm the run's own diff passes CI and that any payload file it touched carries the `VERSION` bump, `CHANGELOG.md` entry, and passing `node scripts/check-payload-links.mjs` that the release rules require — verified via `/save`.

<!-- end tasks.md -->
<!-- file specs/dependency-currency/spec.md utf8 7025 -->
## Purpose

How the WongStack meta-repo keeps its own tools, generated layers, and app dependencies at their latest versions: one on-demand verb that surveys, updates, regenerates, bumps, and hands the result to the ordinary gate — scoped to this repo alone, so no target repo inherits an update policy it did not choose.

## ADDED Requirements

### Requirement: An on-demand verb brings this repo's dependencies to latest

The repository SHALL provide a skill at `.claude/skills/update-dependencies/`, invoked as `/update-dependencies`, that performs one complete update pass over this repo's toolchain and dependencies. It SHALL run only when a user invokes it. It SHALL NOT install itself on a schedule, register a cron entry, or arrange any recurring execution.

The pass SHALL cover, in order:

1. **Survey** — report installed version against latest available for: the OpenSpec CLI, the browser automation CLI `/walk` drives, `gh`, `git`, `node`, every dependency in `app/package.json`, and the generated `openspec-*` skill layer.
2. **Machine** — update the machine's tools to latest and report each as `old → new`.
3. **Regen** — regenerate the OpenSpec-generated layer, then check what rippled.
4. **Deps** — bump `app/` to latest, majors included, reading each major's changelog and fixing what breaks.
5. **Hand off** — hand the diff to `/save` and let the gate decide.

A stage with nothing to do SHALL be reported as up to date rather than silently omitted, so the run's output is a complete picture of currency whether or not anything changed.

#### Scenario: A run with nothing out of date

- **WHEN** `/update-dependencies` runs and every surveyed tool and dependency is already at latest
- **THEN** it reports each one as current
- **AND** it changes no file and does not invoke `/save`

#### Scenario: The user asks for a scheduled run

- **WHEN** a user asks for this verb to run automatically on an interval
- **THEN** the skill states that scheduling is not part of it and the verb is invoked on demand

### Requirement: Updates go to latest, including majors, with CI as the only gate

The skill SHALL take dependencies to their **latest** published versions, including **major** versions. It SHALL NOT pin to the newest minor, skip a major to avoid breakage, or ask the user to approve each bump individually.

For every major-version bump it makes, the skill SHALL read that dependency's changelog, release notes, or migration guide, and SHALL apply the migration to this repo's code before handing off.

The skill SHALL define **no test harness of its own**. It SHALL NOT run a build or a suite locally as a prerequisite for handing off, and it SHALL NOT report an update as verified on its own authority. Verification SHALL be the ordinary gate: the skill hands the diff to `/save`, CI runs, and failures are fixed through the same auto-fix loop `/save` already performs. Where CI is absent, PR review is the gate, exactly as for any other change.

The skill SHALL state plainly that CI coverage is the real ceiling on what breakage gets caught, and SHALL NOT imply that a green run proves the majors are safe.

#### Scenario: A dependency has a new major

- **WHEN** the survey finds a dependency whose latest version is a major ahead of the installed one
- **THEN** the skill bumps to that latest major
- **AND** it reads that release's migration notes and applies the required changes to this repo
- **AND** it does not ask whether to skip the major

#### Scenario: CI goes red after the bump

- **WHEN** `/save` reports a failing check on the update branch
- **THEN** the skill fixes the failure through `/save`'s auto-fix loop and re-checkpoints
- **AND** it does not fall back to running the suite locally as the gate

#### Scenario: The reported confidence matches the coverage

- **WHEN** the run finishes and reports its result
- **THEN** it names CI's coverage as the limit of what was verified
- **AND** it does not claim the majors are proven safe

### Requirement: Regeneration is followed by a ripple check that flags a release

After regenerating the OpenSpec-generated layer, the skill SHALL check what the regeneration changed beyond the generated files themselves: the number and names of generated skills and commands, the entries in the payload manifest, and any payload page that cites those names or counts.

When the run changes any payload file, the skill SHALL flag that the run **is a release** and SHALL carry out the release rules that apply to it — a `VERSION` bump, a newest-first `CHANGELOG.md` entry, and the payload link check — rather than leaving the payload edited without them.

When the run changes no payload file, the skill SHALL say so explicitly, so the absence of a version bump is a stated conclusion rather than an oversight.

#### Scenario: A CLI upgrade adds a generated skill

- **WHEN** regeneration produces a generated skill or command that did not exist before
- **THEN** the skill reports the new name
- **AND** it checks the payload manifest and every payload page that lists those names or counts
- **AND** it flags the run as a release and performs the release steps

#### Scenario: A regeneration changes only generated files

- **WHEN** regeneration rewrites generated files but no payload file changes
- **THEN** the skill states that the run is not a release and that no `VERSION` bump is due

### Requirement: The verb is scoped to this repo and stays out of the payload

The skill SHALL be **meta-repo-only**. It SHALL NOT appear in the payload manifest, so `/wong-sync` — which copies only manifest files — SHALL never deliver it to a target repo. Its own text SHALL state this scope and the mechanism that enforces it, so a later reader does not "fix" the missing manifest entry.

Because the skill is not payload, adding or editing it SHALL NOT by itself require a `VERSION` bump or a `CHANGELOG.md` entry. This exemption applies to the skill's own files only, and never to a payload file the skill's *runs* touch.

The skill SHALL be free to reference payload doctrine that other files own — the gate, the release rules, the manifest — by link rather than by restating it.

#### Scenario: A target repo syncs

- **WHEN** `/wong-sync` runs in a repo that has WongStack installed
- **THEN** `.claude/skills/update-dependencies/` is not among the files it proposes to copy
- **AND** the target repo gains no `/update-dependencies` verb

#### Scenario: The skill's own text is edited

- **WHEN** a change edits only files under `.claude/skills/update-dependencies/`
- **THEN** no `VERSION` bump and no `CHANGELOG.md` entry are required for that edit
- **AND** the change still takes the full gate, because the files sit under `.claude/` and outside the prose allowlist

#### Scenario: A reader wonders why the manifest omits it

- **WHEN** someone reads the skill and looks for its manifest entry
- **THEN** the skill's own text explains that the omission is deliberate and is what scopes the verb to this repo

<!-- end specs/dependency-currency/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-10

~~~
<!-- end .openspec.yaml -->
