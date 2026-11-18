<!-- openspec-archive v1 2026-07-08-wongstack-claymoo-framework -->
<!-- file proposal.md utf8 4225 -->
# wongstack-claymoo-framework

**Status:** ready-to-ship
**Open questions:** none

## Why

ClaymooApp has been dogfooding its own opinionated OpenSpec wrapper and recently settled on a shape that reads better than WongStack's current one. WongStack — the stack-agnostic template that ports that wrapper — had drifted behind: a five-verb loop where `/continue` both resumed *and* implemented, a `/save` that only synced specs, and an OpenSpec change that was a static plan rather than a living handoff. This change brings WongStack up to the improved shape, kept stack-agnostic (CI-optional gate, no Cloudflare/preview-URL hardcoding, no app-specific quality-gate subagents).

## What Changes

- **New `/apply` skill** — the implement stage, fronting `/opsx:apply` with no git. Splits *implementing* (`/apply`, live on the branch after `/plan`) from *resuming* (`/continue`, cold on another machine). The loop grows to six verbs: `/explore → /plan → /apply → /save → /continue → /ship`.
- **`/save` maintains the change as a living handoff**, not just a spec sync: a `**Status:**` header (`in-progress` / `blocked (…)` / `ready-to-ship` / `parked`, set by `/save <note>`), an **append-only `## Decision log`** (dated bullets; history never rewritten), a **PR body that mirrors the change** (Summary + Status + Tasks + Preview + `/continue` footer), and **author-as-fallback** when `/plan` was skipped. Spec sync moves under Step 4c and stays optional.
- **`/continue` becomes the resume on-ramp** — checks out the branch, recaps the plan + the tail of the Decision log, runs a counts-only drift check (commits vs tasks, unresolved review comments), then hands off to `/apply`. The `openspec list` pick-menu shows each change's Status.
- **`/ship` reuses the change-mirror PR body** and names out-of-band PR review as the deeper-review path (it is the merge, not the review). No app-specific quality-gate subagents are ported.
- **`/explore` + `/plan`** get the six-stage loop diagram; `/plan` hands off to `/apply`.
- **Surfaces updated** — `docs/development/the-change-loop.md` rewritten for the six-stage loop + living-handoff surfaces; `docs/development/README.md`, `README.md` (skill table, quickstart, layout, install summary), `CLAUDE.md` (git/OpenSpec mapping + skills rule), and `install-wong-stack` (skill lists + manifest + closing summary) all install and advertise `/apply`.
- **Release chore** — bump `VERSION` `3.2.0` → `4.0.0` (loop reshaped, new verb, `/continue` now hands to `/apply` instead of calling `/opsx:apply` directly) and add a newest-first `CHANGELOG.md` entry.

Non-goals: porting ClaymooApp's Cloudflare-specific `/ship` quality-gate subagents (test-runner, integration-reviewer, doc-finder) or hardcoded preview URLs — those are app-specific and stay out of the stack-agnostic template; changing the CI wait/auto-fix mechanics or the `gh`-based tooling.

## Impact

- Prose + one new skill folder: new `.claude/skills/apply/`; edits to skills `explore`, `plan`, `save`, `continue`, `ship`, `install-wong-stack`; docs `the-change-loop.md`, `development/README.md`; `README.md`; `CLAUDE.md`.
- `VERSION` + `CHANGELOG.md` (release bookkeeping).
- No code logic, no test suite (payload is markdown). Backward-compatible for installed repos: existing changes gain a Status header + Decision log on their next `/save`; the one behavior change is `/continue` handing off to `/apply`.

## Decision log

- **2026-07-08** — Ported ClaymooApp's evolved wrapper into WongStack. Adopted the six-stage loop with a dedicated `/apply` front-door (splitting implement from resume) and made the change a living handoff (Status header + append-only Decision log + PR-body mirror + author-as-fallback in `/save`). Deliberately left out Claymoo's Cloudflare-specific `/ship` quality-gate subagents and hardcoded preview URLs to keep the template stack-agnostic and CI-optional (PR review is the gate where no checks exist). Bumped to 4.0.0 as a major since the loop reshaped and `/continue` now hands to `/apply`. Authored this change at ship time (the session went straight to edits, then `/ship`), via the same fallback path `/save` uses, so the release has a proper archived record.

<!-- end proposal.md -->
<!-- file tasks.md utf8 2091 -->
## 1. New `/apply` skill

- [x] 1.1 Add `.claude/skills/apply/SKILL.md` — implement stage fronting `openspec-apply-change`, no git, six-stage loop diagram, boundaries (no git / already-on-branch / pause on ambiguity).

## 2. Skills — the git + resume verbs

- [x] 2.1 `.claude/skills/save/SKILL.md`: rewrite for the living handoff — `**Status:**` + `**Open questions:**` header, append-only `## Decision log`, PR-body-mirror template, `/save <note>`, author-as-fallback (4b), spec sync under 4c; keep the generic `preview-url.sh` + `wait-for-checks.sh` and CI-when-present-else-PR-review gate.
- [x] 2.2 `.claude/skills/continue/SKILL.md`: resume on-ramp — handle+instruction parse, Status in the pick menu, Decision-log journey recap, counts-only drift check, hand off to `/apply`.
- [x] 2.3 `.claude/skills/ship/SKILL.md`: six-stage loop framing, change-mirror PR body on create, out-of-band review note; no app-specific quality-gate subagents.

## 3. Skills — the think/draft verbs

- [x] 3.1 `.claude/skills/explore/SKILL.md`: six-stage loop diagram.
- [x] 3.2 `.claude/skills/plan/SKILL.md`: six-stage loop diagram + hand off to `/apply`; description pairs with `/apply`.

## 4. Docs

- [x] 4.1 `docs/development/the-change-loop.md`: rewrite for the six-stage loop, the living-handoff surfaces (Status / Decision log / PR mirror), and `/apply` vs `/continue`.
- [x] 4.2 `docs/development/README.md`: update the change-loop line to the six-stage loop.

## 5. Meta surfaces + release bookkeeping

- [x] 5.1 `README.md`: intro skill list, loop line + skill table (`/apply` row, reworked `/save` + `/continue` rows), quickstart, layout tree, install summary, manifest skill list.
- [x] 5.2 `CLAUDE.md`: git/OpenSpec mapping + "Use the WongStack skills" rule updated for `/apply` and the reshaped loop.
- [x] 5.3 `.claude/skills/install-wong-stack/SKILL.md`: add `apply` to the description, collision list, install list, manifest `skills` array, workflow-fit + closing summary.
- [x] 5.4 Bump `VERSION` `3.2.0` → `4.0.0`.
- [x] 5.5 Add a newest-first `CHANGELOG.md` 4.0.0 entry.

<!-- end tasks.md -->
