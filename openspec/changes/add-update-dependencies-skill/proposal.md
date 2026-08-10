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
