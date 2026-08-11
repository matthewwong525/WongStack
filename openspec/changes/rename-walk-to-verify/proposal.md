# Rename /walk to /verify

**Status:** ready-to-ship
**Open questions:** none

## Why

The evidence verb is named `/walk`, which describes the mechanism (a browser walks the preview) rather than the outcome (the change is shown to do what its scenarios promised). `/verify` names what you get — and the mechanism should live up to the name: today the scout keeps only browser-observable scenarios and drops everything else into `NONE`, so an API change, a webhook, or a queue consumer whose effect is queryable gets no evidence at all. `/verify` attempts end-to-end verification of every scenario with the strongest probe available, not just the ones a browser can see.

## What Changes

- **The scout broadens from "browser-observable only" to a probe ladder.** Each scenario is matched to the strongest end-to-end probe that can observe it against the deployed preview: a **browser journey** (UI-observable, as today), a **request probe** (direct HTTP against the preview URL — endpoints, webhooks, redirects, headers, status codes — request/response captured as evidence), or a **state probe** (an existing machine-level or stack-pack command against deployed state, e.g. a triggering request then a staging-database query). Scenarios no probe can reach are listed by name in the report as unverified instead of silently dropped. `NONE` now means "no scenario any probe can reach". Grading, verdicts, the non-gating stance, PR evidence, and the never-writes-in-the-repo rule are unchanged; a walk whose journeys need no browser skips the browser preflight.
- **The system under test stays the deployed preview.** Probes broaden the *modality*, not the *target*: `/verify` still never builds, installs, or executes the repository's own code locally — that boundary belongs to [the change loop's gate](../../../wiki/development/the-change-loop.md#the-gate) and CI.
- **BREAKING** — the user-facing verb `/walk` becomes `/verify`. The skill directory moves from `.claude/skills/walk/` to `.claude/skills/verify/` (real path `.agents/skills/`), its scripts rename (`walk-staging.sh` → `verify-staging.sh`, `walk-runner.sh` → `verify-runner.sh`), and the SKILL.md frontmatter `name:` becomes `verify`. A target repo that syncs receives `verify` as a missing file; its now-orphaned `walk` copy is the "provably untouched and stale" case `/wong-sync` already proposes to remove.
- Every current-truth surface that names the verb or the path updates: the other skills (`ship`, `save/references/git-gate.md`, `wong-cloudflare` + its `permission-groups.md`, `wong-setup`, the `wong-sync` payload manifest), the `WONG-STACK` block in `AGENTS.md`/`CLAUDE.md`, the wiki pages that cite it, and the comments in `app/worker/access.ts`, `app/worker/index.ts`, `.github/workflows/deploy.yml`, and `.env.example` (comments only). The optional `WALK_MEDIA_BUCKET` / `WALK_MEDIA_BASE_URL` variables the publish step reads **keep their names** — renaming a variable users already set breaks them silently, the exact regression pattern CLAUDE.md records for `CLOUDFLARE_API_TOKEN` — and the runbook notes the historical name. The machine-readable manifest `wong-sync/references/payload-files.json` (which the link checker also reads) renames its `walk` skillDirs entry alongside the prose manifest.
- Payload edit = release: `VERSION` 11.4.0 → **12.0.0** (a verb rename is breaking for target repos), a `CHANGELOG.md` entry, and a `node scripts/check-payload-links.mjs` pass.
- **Assumption (recorded, not asked):** only the *verb* renames. The concept keeps its name — the capability stays `staging-walkthrough`, the wiki page stays `wiki/development/staging-walkthrough.md`, the skill's `references/walkthrough.md` keeps its name, and prose nouns ("the walk", "the walkthrough") stay. Renaming the concept would churn the spec record and every inbound link for no behavioral gain.

## Non-goals

No change to the verdicts, the self-heal, the fix loop, the PR-evidence contract, or the non-gating stance. No local execution of the repo's code as a probe — scenarios only observable that way stay unverified, honestly. No saved test suite: probes are throwaway like journeys; accumulating regression coverage stays CI's job (`ci-tests`). No rewriting of history: `notes/**`, `openspec/changes/archive/**`, and past `CHANGELOG.md` entries keep the old name.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `staging-walkthrough`: the verb renames throughout, **and** the scout requirement is rewritten around the probe ladder (the two requirements whose scenarios change meaning — `/walk begins by invoking /save` and `Scenarios become journeys, scoped to the change` — travel as REMOVED + ADDED with migration notes) — request and state probes join browser journeys, unreachable scenarios are listed by name, `NONE` narrows to "no probe can reach anything", evidence and grading become probe-generic, and preflight skips the browser when no journey needs one.
- `delivery-gate`: `/ship`'s evidence step invokes `/verify` instead of `/walk`; the building-versus-exercising boundary explicitly covers HTTP requests and existing-command state queries alongside the browser.
- `toolchain-dependencies`: the browser CLI is scoped to `/verify`; the "repo that never invokes" scenario names `/verify`.
- `cloudflare-access-guide`: the machine-caller scenario names `CI or /verify`.
- `app-scaffold`: the Access-module rationale names `/verify` as the machine caller.
- `dependency-currency`: the survey step names the browser CLI as the one `/verify` drives.

## Impact

- `.agents/skills/walk/` → `.agents/skills/verify/` (SKILL.md, `references/walkthrough.md`, both scripts, and the repo-relative paths inside them).
- Cross-references in five other skills, three `wiki/development/` pages, four `wiki/stack/` pages, `AGENTS.md`.
- Comment-only edits in `app/worker/*.ts`, `.github/workflows/deploy.yml`, `.env.example` — no identifier a script reads changes, so no runtime behavior changes.
- `openspec/specs/ci-tests/spec.md` names `/walk` in its overview prose only (no requirement text), so it gets no delta; the rename lands there as a direct overview edit when specs sync. The `staging-walkthrough` spec's Purpose paragraph (also overview prose) is likewise edited directly to describe the probe ladder.
- The `verify` skill's own runbook grows: SKILL.md's scout and preflight sections, `references/walkthrough.md`'s journey/evidence/report sections, and the scripts where they assume every journey is a browser journey.
- `VERSION`, `CHANGELOG.md`; the link checker validates the moved paths in every install shape.

## Decision log

- **2026-08-11** — Planned as a pure verb rename, then extended per the user to broaden verification: `/verify` matches every scenario to the strongest probe (browser journey / request probe / state probe) instead of keeping only browser-observable ones, with "e2e to the best of ability" read as bounded by the no-local-build invariant — probes broaden the modality, never the target. Implemented all 19 tasks in one session. Discoveries en route: (1) `.env.example` *does* declare `WALK_MEDIA_BUCKET`/`WALK_MEDIA_BASE_URL`, so those keep their names — renaming a user-set variable breaks silently, the recorded `CLOUDFLARE_API_TOKEN` regression pattern; (2) the machine-readable `payload-files.json` (read by the link checker and the sync) needed the `walk` → `verify` skillDirs rename alongside the prose manifest — the link checker caught it as 4 dead links per install shape; (3) the OpenSpec validator refuses to drop scenarios inside a MODIFIED requirement, so the two requirements whose scenarios change meaning travel as REMOVED + ADDED with migration notes rather than RENAMED. Preflight gained `--no-browser` (an all-probe walk installs no browser); the runner gained a curl-based request-probe loop with the same Access headers; state-probe reads run agent-side after the driver, per the thin-driver rule. Version went 11.4.0 → 12.0.0 (breaking verb rename); link checker green in all four shapes.
