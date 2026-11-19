<!-- openspec-archive v1 2026-08-11-rename-walk-to-verify -->
<!-- file proposal.md utf8 8325 -->
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
- **2026-08-11** — Shipped. Archived to `openspec/changes/archive/2026-08-11-rename-walk-to-verify/` with all six capability specs already synced; this checkpoint carries the archive move onto the PR for the squash-merge.

<!-- end proposal.md -->
<!-- file design.md utf8 9258 -->
# Design: rename-walk-to-verify

## Context

`/walk` is one skill directory (`.agents/skills/walk/`, reached through the `.claude` symlink) plus references spread across five other skills, the payload manifest, `AGENTS.md`, seven wiki pages, six main specs, and comment lines in `app/worker/*.ts`, `.github/workflows/deploy.yml`, and `.env.example`. No variable name, script identifier, or workflow key contains "walk" — every hit outside the skill directory is prose or a comment, except the repo-relative script paths inside the skill's own SKILL.md and `references/walkthrough.md`. The link checker (`scripts/check-payload-links.mjs`) resolves skill paths from the manifest's skill list, so it follows the rename with no script change (its internal `walk(dir)` helper is an unrelated function name).

Behaviorally, today's scout keeps only scenarios "observable through a browser against an HTTP-serving preview" and excludes everything off the request path (staging-walkthrough spec — "Scenarios become journeys"), so an API-only or state-effect scenario resolves to `NONE` with no evidence produced. That is the gap the broadening closes.

## Goals / Non-Goals

**Goals:**
- One atomic rename: after the change, `grep -rn '/walk'` over current-truth surfaces (everything except `notes/**`, `openspec/changes/archive/**`, and past changelog entries) returns nothing.
- Every scenario gets the strongest end-to-end probe available against the deployed preview — browser journey, direct HTTP request, or existing-command state query — and anything unreachable is reported unverified by name instead of vanishing into `NONE`.
- A target repo syncing after this release converges on `verify` through `/wong-sync`'s existing machinery — no special migration code.

**Non-Goals:**
- No rename of the *concept*: the capability `staging-walkthrough`, the page `wiki/development/staging-walkthrough.md`, the reference `references/walkthrough.md`, and prose nouns ("the walk", "the walkthrough") keep their names. See proposal.md — the recorded assumption.
- No local build or execution of the repo's code to make a scenario observable, and no new tooling added to the repo or demanded of the target — probes use what already exists (curl-level HTTP, the browser CLI, stack-pack commands).
- No edits to `notes/**`, archived changes, or past `CHANGELOG.md` entries — they are the historical record.

## Decisions

- **`git mv` the skill directory, then rename tokens in place.** `git mv .agents/skills/walk .agents/skills/verify` preserves history; the `.claude` symlink means only the `.agents` path is moved. Token order matters for the in-place rename: script filenames first (`walk-staging.sh` → `verify-staging.sh`, `walk-runner.sh` → `verify-runner.sh`), then `skills/walk` → `skills/verify`, then `/walk` → `/verify`. Applying `/walk` → `/verify` first would still be safe (`/walk-staging.sh` → `/verify-staging.sh`) but the ordered form also catches script names cited without a leading slash.
- **Scripts rename with the directory.** The scripts are internal to the skill — nothing outside `.agents/skills/walk/` invokes them — so renaming them costs nothing and avoids a `verify/scripts/walk-staging.sh` incongruity that would read as a missed spot forever. Alternative (keep script names) rejected for that reason.
- **VERSION goes to 12.0.0 (major).** A verb rename is breaking for target repos: the muscle-memory command disappears, and the synced update removes a file rather than only adding. The changelog entry must say what a target loses (`/walk` stops resolving) and what replaces it. Alternative (minor bump, keep a `/walk` alias) rejected: an alias skill is a second payload file that exists only to be deprecated, and `/wong-sync`'s stale-removal path already handles the transition cleanly.
- **Target migration rides on existing `/wong-sync` machinery.** The manifest entry renames `walk` → `verify`. On the next sync a target lacks `verify` (copied in as missing) and holds a `walk` no longer on the manifest; the manifest states that nothing outside the list is owned by upstream, and the sync's stale-detection proposes removing a provably untouched orphan. A target that *edited* its `walk` keeps it — exactly the local-authorship guarantee. No migration shim needed.
- **`ci-tests` gets no delta.** Its only `/walk` mention is overview prose, not requirement text; inventing a requirement change to carry a one-word rename would be noise. The overview edit is an ordinary implementation task and survives spec sync because sync folds requirement deltas without regenerating overviews.
- **A probe ladder, strongest-first, decided per scenario by the scout.** Browser journey when the `THEN` is about something rendered; request probe when it is about the request path without UI; state probe when the effect lands somewhere an existing command can read. Strongest-first because a browser journey subsumes the request underneath it and produces the richest evidence; falling through the ladder is what "to the best of its ability" means operationally. The alternative — a separate verb for non-browser verification — was rejected: the scout already reads every scenario, so the classification is one decision in one place, and the user asks for evidence, not for a modality.
- **The modality broadens; the target does not.** The system under test remains the deployment CI published, reached by the preview URL `/save` resolves. Running the repo's own code locally (its CLI, its test suite, a dev server) would cross the change loop's building-versus-exercising boundary and quietly recreate the local-verify gate the delivery-gate spec forbids. A scenario only observable that way is honestly unverifiable here — its e2e home is a CI test, which `/plan` already provisions via the tests-in-tasks convention. **Recorded assumption:** the user asked for "e2e to the best of ability"; this design reads "ability" as bounded by that standing invariant rather than overriding it, because the invariant is load-bearing for every other skill.
- **Request probes are plain HTTP with captured transcripts.** curl-level requests against the preview URL, with the Access service-token headers the heal already mints applied the same way. Evidence per step is the request and response body/headers written to the run's temporary directory — same throwaway lifecycle as screenshots, same honest degradation in the PR comment. No HTTP client is added to any repo; nothing about this needs the browser CLI, so an all-probe walk skips browser preflight and install entirely.
- **State probes only borrow commands that already exist.** The staging-database query a stack-pack repo already has (the same surface the failure-reset uses) is in; inventing per-repo observation tooling is out — a probe the repo cannot express with existing commands is an unverifiable scenario, listed as such. This keeps the walk stack-agnostic in fact: a repo with no such commands simply has fewer reachable scenarios, not a broken walk.
- **The skill's own prose keeps "walk" as the activity noun.** The description and runbook still say the browser *walks* the preview — that is what happens. Only `/walk` as a verb/command, the directory, and the script names become `verify`. This keeps the diff reviewable and the metaphor intact under the new name.

## Risks / Trade-offs

- [A stray `/walk` survives in a current-truth file] → The final task greps the whole tree for `/walk`, `skills/walk`, and `walk-staging|walk-runner`, expecting hits only under `notes/`, `openspec/changes/archive/`, and pre-12.0.0 `CHANGELOG.md` entries.
- [A payload link breaks in a shape this repo cannot see locally] → `node scripts/check-payload-links.mjs` runs as its own task after the rename; dead links fail it.
- [A target repo synced mid-transition ends up with both `walk` and `verify`] → Transient by design: the sync that delivers `verify` is the same proposal that offers removing the stale `walk`; a user who applies half of it still has two working skills, not a broken one.
- [Renaming the frontmatter `name:` changes how the skill is listed/invoked] → That is the point; grep confirms no other file addresses the skill by frontmatter name rather than by path.
- [The scout over-claims: classifies a scenario as probe-reachable, then produces evidence that doesn't show the `THEN`] → Grading is unchanged and probe-generic: evidence that does not show the `THEN` fails or escalates as ambiguous; a bare `200` is explicitly not a pass.
- [State probes mutate staging] → A triggering request is ordinary walk traffic, already covered by the failure-only reset; the reading side uses the same existing commands the reset relies on, so no new write path is introduced.
- [Probe creep toward local execution] → The boundary lives in the delivery-gate spec ("issuing HTTP requests and existing-command state queries"), not only in skill prose, so a future edit that crosses it contradicts a requirement rather than a suggestion.

## Migration Plan

Single-branch change; no deploy surface. Rollback is `git revert` of the squash-merge. Target repos migrate via their next `/wong-sync` run as described in Decisions.

<!-- end design.md -->
<!-- file tasks.md utf8 4312 -->
# Tasks: rename-walk-to-verify

## 1. The skill itself

- [x] 1.1 `git mv .agents/skills/walk .agents/skills/verify`, then `git mv` the scripts: `walk-staging.sh` → `verify-staging.sh`, `walk-runner.sh` → `verify-runner.sh`
- [x] 1.2 In the moved `SKILL.md`: frontmatter `name: verify`, heading `# /verify`, and every `/walk`, `skills/walk`, and script-name token renamed per design.md — Decisions (rename order: script names, then `skills/walk`, then `/walk`); activity nouns ("the walk", "walkthrough") stay
- [x] 1.3 Same token rename in `references/walkthrough.md` and inside both scripts (self-references, comments, usage strings); the file `walkthrough.md` keeps its name

## 2. The probe ladder (broadened verification)

- [x] 2.1 Rework the scout in `SKILL.md`: classify each scenario to the strongest probe — browser journey, request probe, state probe — per the `staging-walkthrough` delta ("Scenarios become journeys, scoped to the change"); unreachable scenarios are carried into the report by name as unverified, and `NONE` fires only when no scenario has any probe
- [x] 2.2 Preflight: skip the browser environment check (and any browser install) when no journey is a browser journey; keep it unchanged when at least one is
- [x] 2.3 Add request-probe execution to the runbook (`references/walkthrough.md`) and scripts: plain HTTP against the preview URL, Access service-token headers applied the same way as the browser heal, request/response captured per step into the run's temporary directory
- [x] 2.4 Add state-probe execution: triggering request (when one exists) then an existing machine-level or stack-pack command against deployed state; never add tooling to the repo — a scenario with no existing command stays unverified
- [x] 2.5 Probe-generic grading and PR comment: grade captured evidence (screenshots, responses, command output) against the verbatim `THEN` (a bare `200` is not a pass), state each journey's probe and where it ran, and list unverifiable scenarios by name in every comment

## 3. Cross-references in other skills

- [x] 3.1 Rename the verb and any `skills/walk` path in `.agents/skills/ship/SKILL.md` and `.agents/skills/save/references/git-gate.md`
- [x] 3.2 Same in `.agents/skills/wong-cloudflare/SKILL.md`, `.agents/skills/wong-cloudflare/references/permission-groups.md`, and `.agents/skills/wong-setup/SKILL.md`
- [x] 3.3 Update the payload manifest (`.agents/skills/wong-sync/references/payload-manifest.md`): core-skill list entry `walk` → `verify`, and the prose that names `/walk` or its rationale

## 4. Docs and repo root

- [x] 4.1 Update `AGENTS.md` (the `WONG-STACK` block; `CLAUDE.md` is its symlink) — verb rename plus the beside-the-loop description of what `/verify` now covers
- [x] 4.2 Update `wiki/development/the-change-loop.md`, `wiki/development/staging-walkthrough.md`, `wiki/development/required-tools.md` — verb and skill-path renames, plus the probe ladder where those pages describe what the walk covers (browser scoped to browser journeys in required-tools); page names unchanged
- [x] 4.3 Update `wiki/stack/README.md`, `wiki/stack/cloudflare-access.md`, `wiki/stack/cloudflare-credentials.md`, `wiki/stack/d1-pipeline.md`

## 5. Comment-only surfaces

- [x] 5.1 Rename `/walk` in comments of `app/worker/access.ts`, `app/worker/index.ts`, `.github/workflows/deploy.yml`, `.env.example` — comments only; confirm no identifier or variable name changes in the diff

## 6. Specs and release

- [x] 6.1 Edit the `/walk` mention in the overview prose of `openspec/specs/ci-tests/spec.md` and the Purpose paragraph of `openspec/specs/staging-walkthrough/spec.md` (overview prose carries no delta — see design.md); requirement-level changes in the six affected specs land via this change's delta specs at `/save`
- [x] 6.2 Add the `CHANGELOG.md` entry (breaking: `/walk` is now `/verify`, and the scout broadened to the probe ladder; what a syncing target gains/loses) and bump `VERSION` to `12.0.0`
- [x] 6.3 Run `node scripts/check-payload-links.mjs` — zero dead links
- [x] 6.4 Sweep: `grep -rn '/walk\b\|skills/walk\|walk-staging\|walk-runner'` over the tree returns hits only under `notes/`, `openspec/changes/archive/`, this change's delta `REMOVED Requirements` section, and pre-12.0.0 `CHANGELOG.md` entries

<!-- end tasks.md -->
<!-- file specs/app-scaffold/spec.md utf8 1880 -->
## MODIFIED Requirements

### Requirement: The scaffold carries the Access verification module, inert

The app scaffold SHALL include a Worker-side Access verification module (`worker/access.ts`) that verifies the signed `Cf-Access-Jwt-Assertion` against the repo's own Access application and returns identity from the verified claims — `email` for a human caller, `common_name` for a service token.

It SHALL ship **inert**: present in the scaffold, enforcing nothing, and not wired into the request path until Access is adopted. The provisioned app is public by default, and a scaffold that enforced identity out of the box would reject every caller of an app with no Access in front.

Shipping the module rather than a documented snippet is deliberate. The correct implementation is not obvious — the header-based version reads as simpler and is what an adopter writes when left to it, and it silently locks out every machine caller including `/verify`. An adopter who followed the documented snippet had to write this module from scratch after diagnosing the lockout.

#### Scenario: A scaffolded public app rejects nobody

- **WHEN** the scaffold is deployed with no Access in front
- **THEN** the verification module enforces nothing and every request reaches the app
- **AND** no request is rejected for lacking an assertion

#### Scenario: Adopting Access is wiring, not writing

- **WHEN** a repo adopts Access on a scaffolded app
- **THEN** the verification module is already present and the step is enabling it
- **AND** the adopter does not implement JWT verification themselves

#### Scenario: Both caller kinds authenticate once enabled

- **WHEN** verification is enabled and a service token calls the app
- **THEN** it is authenticated from the verified assertion's `common_name`
- **AND** a human caller is authenticated from the verified assertion's `email`

<!-- end specs/app-scaffold/spec.md -->
<!-- file specs/cloudflare-access-guide/spec.md utf8 3639 -->
## MODIFIED Requirements

### Requirement: The runbook documents the header-trust auth model and its safety boundary

The runbook SHALL describe the auth model the setup implies, and that model SHALL be **verification of the signed Access JWT** (`Cf-Access-Jwt-Assertion`), not trust in a plain identity header. Verification SHALL confirm the assertion came from this Access application specifically, and SHALL read identity from the verified claims: `email` for a human, `common_name` for a service token.

**A plain-header pattern SHALL NOT be given as the recommended implementation**, for two independent reasons the runbook SHALL both state:

- **It locks out every machine caller.** Access strips `CF-Access-Client-Id` and sets no email header for a service-token request, which arrives carrying only `cf-access-jwt-assertion` and the ordinary `cf-*` request headers. Code requiring the email header therefore `401`s CI, and `/verify` — WongStack's own browser-evidence verb — is one of the callers it rejects.
- **It is unsound off the proxy.** On a hostname the Access policy does not actually cover, the header is an ordinary request header any caller can set, so trusting it grants impersonation of any user. Given that a policy can silently fail to cover a hostname, the pattern's safety rests on a condition the reader cannot reliably confirm.

The runbook SHALL specify that a request whose assertion is missing or fails verification is rejected (`401`), and that only an explicit `SKIP_AUTH` development escape substitutes a fallback identity — never a silent default in production.

Because the provisioned app is public by default, the scaffold's Worker SHALL NOT enforce identity until Access is adopted. The verification module SHALL ship inert, and enabling it SHALL be documented as part of adopting Access, in the same step.

**Verification of the wall SHALL require a browser.** A service-token `200` and an anonymous `302` SHALL be documented as *insufficient* evidence, since both hold in the known-broken `workers.dev` configuration. The runbook's verification step SHALL require a logged-in browser to load the application successfully.

#### Scenario: Both caller kinds are served by one path

- **WHEN** the documented implementation handles a request
- **THEN** a human's verified assertion yields their `email`
- **AND** a service token's verified assertion yields its `common_name`
- **AND** neither caller is rejected for lacking a header the other one gets

#### Scenario: The machine caller is not locked out

- **WHEN** CI or `/verify` calls the app with a service token
- **THEN** the request is authenticated from the verified assertion
- **AND** it is not rejected for the absence of `Cf-Access-Authenticated-User-Email`

#### Scenario: Missing or invalid identity fails closed

- **WHEN** a request arrives with no assertion, or one that fails verification
- **THEN** the documented behaviour is a `401`
- **AND** a fallback identity is used only when a `SKIP_AUTH` development flag is explicitly set

#### Scenario: Terminal checks are not accepted as proof

- **WHEN** a reader verifies the wall
- **THEN** the runbook requires a logged-in browser to load the app successfully
- **AND** it states that an anonymous redirect and a service-token success are both consistent with a wall no human can pass

#### Scenario: The public template does not enforce identity

- **WHEN** the stack pack's scaffold Worker is deployed without Access in front
- **THEN** it does not treat any header or assertion as an identity
- **AND** the docs state that enabling verification is part of adopting Access

<!-- end specs/cloudflare-access-guide/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 10802 -->
## MODIFIED Requirements

### Requirement: Ship delegates its checkpoint and branch gate to save

`/ship` SHALL retain its shipping-only responsibilities: verify the feature branch and default-branch state, invoke `openspec-archive-change`, merge the pull request, and delete the remote branch worktree-safely. After archiving and before merging, `/ship` SHALL invoke ordinary `/save` exactly once. When no active change matches the current branch and exactly one matching archive exists, `/save` SHALL use that archive as the handoff record, SHALL NOT author a replacement active change, and SHALL own secret preservation/redaction, session-note capture, commit, push, pull-request creation/update, and the CI wait/auto-fix path. `/ship` SHALL consume that result and SHALL NOT duplicate those checkpoint mechanics or require a special save flag.

Between the delegated `/save` and the merge, `/ship` SHALL invoke `/verify` once as an evidence step. On `NONE`, `UNKNOWN`, or `TIMEOUT`, `/ship` SHALL report the verdict and merge on the save-gate result exactly as before. On `FAILURE` — after `/verify`'s own bounded fix loop is exhausted — `/ship` SHALL stop, present the evidence, and ask the user whether to fix or merge anyway; the user's answer, not the verdict, decides, and a merge-anyway is recorded in the ship report. When the walk's fix loop advanced HEAD, the fix's own delegated `/save` re-gated it, and `/ship` SHALL confirm the latest save-gate result is `SUCCESS` or `NONE` before merging.

The walk step SHALL check that the `walk` skill is present before invoking it. When the skill is absent, `/ship` SHALL report the walk as unavailable in one line and continue to the merge, consistent with the gate ladder's rule that a rung the repo lacks is skipped rather than failed. `/ship` SHALL NOT install, copy, or offer the skill to repair its absence.

Before deleting the merged branch from the remote, `/ship` SHALL find every open pull request that targets that branch as its base and retarget each to the default branch. Only then SHALL the branch be deleted, and the ship report SHALL name any pull request it retargeted. Deleting a base branch that an open pull request still targets closes that pull request, and the loss is unrecoverable: the forge will neither reopen a pull request whose base branch is gone nor retarget a closed one. `/ship` SHALL NOT rely on the forge retargeting dependents on its own, because that is a race with no completion signal.

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

### Requirement: CI is optional, not required

The WongStack doctrine SHALL treat GitHub Actions (and CI generally) as an optional accelerator that is honored when present and never required. The system's durable pillars SHALL be described as: pull requests, version control, OpenSpec, and everything-lives-in-the-repo.

This doctrine SHALL have **one owning file** — `wiki/development/the-change-loop.md` — which states the gate ladder (CI when present → merge, a skipped rung never being a failure), the scope of the direct-to-default-branch carve-out, and the prose allowlist (`notes/**` + `wiki/**`) with its rationale. Other payload surfaces SHALL link to that owner rather than restate it, per the `payload-single-source` capability.

Two bounded exceptions, each because the reader must act without leaving the page:

- `AGENTS.md`/`CLAUDE.md` MAY carry one summarizing line per doctrine, naming and linking the owner.
- `.claude/skills/save/SKILL.md` SHALL state the allowlist's two path prefixes inline **once**, as the operational routing test the skill performs. Its other sections SHALL link to that single statement rather than repeat it.

No payload surface SHALL assert CI as the sole or required gate, state the carve-out as `notes/*.md` alone, or say that wiki edits require a pull request. No payload surface SHALL describe the staging walkthrough as a rung of the gate ladder or as a condition on the merge. Where a surface links to the owner instead of restating it, that link SHALL satisfy this requirement.

#### Scenario: Payload prose describes CI as optional

- **WHEN** a reader reviews the delivery doctrine in `CLAUDE.md`, `README.md`, or the `save`/`ship` skills
- **THEN** the text states CI is honored when present but not required, and names PR review as the gate when CI is absent
- **AND** no remaining sentence asserts "CI is the only gate" or "GitHub Actions is the build gate"

#### Scenario: No surface describes the walkthrough as a gate

- **WHEN** a reader reviews `wiki/development/the-change-loop.md`, the `ship` skill, or the stack section
- **THEN** no surface presents the staging walkthrough as a rung of the ladder or as a condition on the merge
- **AND** the walkthrough is described as something `/verify` produces on request

#### Scenario: The carve-out has one owner

- **WHEN** a reader reviews `CLAUDE.md`, `notes/README.md`, and the `save` and `dream` skills
- **THEN** each either links to `wiki/development/the-change-loop.md` or carries one summarizing line naming it
- **AND** no surface other than `save/SKILL.md`'s single operational statement reproduces the allowlist's scope, exceptions, or rationale

#### Scenario: The save skill can route without leaving its runbook

- **WHEN** `/save` reaches the point of deciding a save's route
- **THEN** the two path prefixes are stated inline at that point
- **AND** the skill's later sections link back to that statement rather than restating the prefixes

#### Scenario: A surface contradicts the owner

- **WHEN** any payload surface states the gate or the carve-out in terms the owning file does not
- **THEN** that is a defect, resolved by correcting the surface to a link or to the owner's terms

### Requirement: No local build fallback

The skills SHALL NOT build or test the project locally as a prerequisite for `/save` or `/ship`, whether or not CI is present. The absence of CI SHALL NOT trigger a local-verify gate. No skill SHALL run a compile, a unit-test suite, a linter, or a type-check as a condition of saving or shipping. Test suites run in CI (the `ci-tests` capability), where they are ordinary checks on the existing ladder.

**The boundary is building versus exercising.** Driving a browser — or issuing HTTP requests and existing-command state queries — against an already-deployed staging environment is not a local build: nothing is compiled, nothing is installed, and the artifact under test is the one CI itself published. The opt-in staging walkthrough (`staging-walkthrough`) is therefore permitted, and is bounded by three properties that keep it from becoming a local-verify gate by another name — it SHALL run only against a deployment CI has already published, it SHALL never install a dependency, and it SHALL be absent entirely unless the repo adopted it. It is reached by invoking `/verify`, or by `/ship`'s single evidence step. Its verdict SHALL NOT function as a gate rung: an unrunnable or absent walk never blocks anything, and a walk `FAILURE` at ship time is surfaced as a user decision (fix or merge anyway) rather than consulted as a merge condition.

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

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/dependency-currency/spec.md utf8 1718 -->
## MODIFIED Requirements

### Requirement: An on-demand verb brings this repo's dependencies to latest

The repository SHALL provide a skill at `.claude/skills/update-dependencies/`, invoked as `/update-dependencies`, that performs one complete update pass over this repo's toolchain and dependencies. It SHALL run only when a user invokes it. It SHALL NOT install itself on a schedule, register a cron entry, or arrange any recurring execution.

The pass SHALL cover, in order:

1. **Survey** — report installed version against latest available for: the OpenSpec CLI, the browser automation CLI `/verify` drives, `gh`, `git`, `node`, every dependency in `app/package.json`, and the generated `openspec-*` skill layer.
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

<!-- end specs/dependency-currency/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 32684 -->
## MODIFIED Requirements

### Requirement: Walkthrough credentials follow the durable worktree store

The walkthrough SHALL honor any credential already exported into its process, including the optional Cloudflare Access service-token pair. When a value it needs is not exported, it SHALL resolve the repository's primary worktree from Git metadata and read the durable ignored `.env` there, rather than assuming the active linked worktree contains a copy. It SHALL NOT print any resolved value or persist the primary worktree's absolute path in repository artifacts.

The walkthrough SHALL NOT define a browser-endpoint variable of its own. Where a browser must run somewhere other than this machine, that configuration belongs to the browser tool and SHALL be documented as the tool's, not restated or renamed by the payload.

#### Scenario: Walk runs from a linked worktree

- **WHEN** `/verify` runs from a linked worktree with no local `.env` and a required credential exists in the primary worktree's durable file
- **THEN** preflight uses the durable credential
- **AND** it does not report the value as missing or ask the user to copy it

#### Scenario: Exported credentials retain precedence

- **WHEN** the walk process already has a required value in its environment
- **THEN** preflight uses the exported value without replacing it from a file

#### Scenario: No durable credential exists

- **WHEN** neither the process environment nor the durable primary-worktree file supplies a credential the walk needs
- **THEN** the walkthrough retains its `UNKNOWN` missing-credential verdict and points to the secrets convention
- **AND** no linked-worktree copy is created as a side effect

#### Scenario: Remote browsers are the tool's business

- **WHEN** a reader asks how to run the walk's browser somewhere other than this machine
- **THEN** the payload points at the browser tool's own remote-provider configuration
- **AND** the payload defines no variable of its own for it

### Requirement: The walkthrough is a user-invoked verb

The staging walkthrough SHALL be reached by invoking `/verify`, or by `/ship`, which invokes `/verify` once as a non-gating evidence step between its delegated `/save` checkpoint and its merge. No other skill SHALL run it: `/save`, `/apply`, and `/continue` SHALL NOT walk, prompt to walk, or warn that a walk did not happen.

`/verify` SHALL be invocable at any point in a change's life and any number of times. Nothing in the skill SHALL limit how often it runs or treat a repeated invocation as an error. `/ship`'s invocation SHALL be an ordinary walk — same scout, same verdicts, same PR evidence — not a variant.

`/verify` SHALL ship in the payload's **core** category, so every repo receives it regardless of `components.stackPack`. It SHALL NOT be gated on the stack pack, on Cloudflare, or on any hosting provider, and no capability of the walk SHALL require an account with any vendor.

The browser tool the walk uses SHALL also be available for ordinary browser work outside the walk. `/verify` SHALL remain the only surface that produces graded merge evidence; using the browser to look at a page, fill a form, or check a rendered result SHALL NOT require invoking `/verify`.

#### Scenario: Shipping walks as evidence

- **WHEN** `/ship` runs in a repo with probe-reachable scenarios
- **THEN** `/verify` runs once after the delegated `/save` and before the merge, and its evidence lands on the PR
- **AND** a `NONE`, `UNKNOWN`, or `TIMEOUT` verdict changes nothing about the merge

#### Scenario: A repo with no stack pack receives the skill

- **WHEN** WongStack is installed or synced into a repo whose `components.stackPack` is absent or false
- **THEN** the `walk` skill is copied in with the rest of the core category
- **AND** no Cloudflare file, script, or config fragment is copied with it

#### Scenario: A repo in any language walks

- **WHEN** `/verify` runs in a repo with no `package.json`, no Node toolchain, and no vendor account
- **THEN** the walk drives its journeys and grades them normally
- **AND** nothing is added to the repository to make it possible

#### Scenario: The browser serves ordinary work

- **WHEN** a user asks to open a page or check something rendered, outside any change
- **THEN** the browser tool is available directly
- **AND** no walk is started, no journey is graded, and no PR comment is posted

#### Scenario: Walking repeatedly is normal

- **WHEN** `/verify` is invoked three times across one change
- **THEN** each invocation performs a full walk and reports its own verdict
- **AND** no invocation is refused or flagged for repetition

#### Scenario: Mid-change walking

- **WHEN** `/verify` is invoked on a branch whose `tasks.md` still has unchecked tasks
- **THEN** the walk runs against whatever is deployed for the current commit
- **AND** the incomplete state of the change is not treated as an error

### Requirement: The walk provisions its own tool, never a repo dependency

`/verify` SHALL install what it needs to run rather than reporting its absence, and SHALL install it **at the machine level**. When the browser CLI or its browser is missing, the walk SHALL install them and state what it installed.

The walk SHALL NOT add a dependency to the repository to make itself possible — no `devDependencies` entry, no lockfile change, and no requirement that a `package.json` exist. A repository in a language with no Node toolchain SHALL be able to walk with nothing added to it. This is the property that keeps the walkthrough stack-agnostic in fact and not only in name.

A **language runtime** SHALL remain outside this rule: installing a runtime SHALL still happen only at the point of need and only with the user's consent, per the toolchain convention. The walk installs tools, not runtimes.

There SHALL be no adoption signal, manifest field, config file, or skill argument that enables or disables the walk. Nothing about the walk SHALL be switched on by configuration: what it does is decided by the change's scenarios and what it finds on the machine.

#### Scenario: A machine without the browser tool

- **WHEN** `/verify` runs on a machine where the browser CLI is not installed
- **THEN** the walk installs it and its browser, reports that it did, and walks
- **AND** the repository working tree is unchanged by the install

#### Scenario: A repo with no package manifest

- **WHEN** `/verify` runs in a repository that has no `package.json` at all
- **THEN** the walk runs normally
- **AND** no manifest is created and no dependency is added

#### Scenario: Nothing is switched on by configuration

- **WHEN** a reader looks for how to enable or disable the walk for a repo
- **THEN** no manifest field, config file, or skill flag exists for it

#### Scenario: A missing runtime still asks

- **WHEN** the walk needs a language runtime the machine does not have
- **THEN** it explains what is needed and asks before installing
- **AND** it does not install a runtime silently the way it installs a tool

### Requirement: The browser is driven by a standalone CLI, installed on the machine

The walk SHALL drive its browser through a standalone command-line tool installed on the machine, rather than through a vendor-hosted browser service or a browser library declared in the repository. No vendor-hosted browser endpoint SHALL be hardcoded in the runner, preflight, or skill, and no vendor credential SHALL be required to obtain a browser.

Preflight SHALL verify the browser by performing the tool's own environment check, which launches a browser headlessly, rather than by checking for a credential. A failed check SHALL produce `UNKNOWN` naming what failed — never a failing application. When no journey needs a browser — every journey is a request or state probe — the browser check SHALL be skipped rather than failing the walk over a tool it will not use.

Each journey SHALL be expressed as a declarative sequence of the tool's commands, executed as one batch that stops at the first failing step. Elements SHALL be addressed through the tool's accessibility snapshot or its semantic locators, rather than through selectors written without seeing the page.

The walk SHALL report **where the browser ran** in its user-facing report and in its pull-request comment, because a walk that ran on this machine depended on this machine and the reader is entitled to know it.

The driver SHALL be kept thin enough that replacing the browser tool means rewriting one script rather than the capability: journeys stay declarative, and grading SHALL consume the tool's structured output rather than its human-readable text.

#### Scenario: The default path needs no configuration

- **WHEN** `/verify` runs with the tool installed and no environment variable set
- **THEN** it launches a browser headlessly and walks
- **AND** the report names where the browser ran

#### Scenario: Preflight is a real launch, not a credential check

- **WHEN** preflight runs
- **THEN** it performs the tool's environment check, which includes launching a browser
- **AND** a failure is reported as `UNKNOWN` with the failing check named

#### Scenario: No vendor browser service remains

- **WHEN** the runner, preflight, and skill are read for a hardcoded browser-service endpoint, or a vendor credential used to obtain a browser
- **THEN** none exists

#### Scenario: A journey is declarative

- **WHEN** a journey of four steps runs
- **THEN** it is submitted as one ordered batch that stops at the first failing step
- **AND** no per-run browser script is generated inside the repository

#### Scenario: A session dies mid-walk

- **WHEN** a browser session ends while a journey is in flight
- **THEN** that journey's evidence records the error and the remaining journeys run on fresh sessions
- **AND** one lost session does not cost the walk

#### Scenario: A browserless walk needs no browser

- **WHEN** every journey the scout emits is a request or state probe
- **THEN** preflight skips the browser check and the walk proceeds
- **AND** no browser is installed or launched for it

### Requirement: The walk is throwaway and saves nothing

The walk SHALL leave the repository working tree exactly as it found it. It SHALL NOT create a test suite, a `tests/` directory, a config file, committed fixtures, a dependency entry, or any other artifact inside the repo — including the tool it installs, which is installed at the machine level for this reason.

Journey definitions and captured evidence SHALL be written outside the repository working tree and deleted when the run ends.

The run SHALL capture evidence after each step, matched to the probe: a screenshot for a browser step, the request and response for a request-probe step, the command and its output for a state-probe step. Full-page and annotated capture SHALL be available where they make browser evidence clearer. **No video SHALL be required or claimed**: the evidence is the captures and the written record, and the report SHALL NOT reference a recording that does not exist.

The journey definitions SHALL contain no assertions — their job is to produce evidence, not to decide.

Cleanup SHALL run on every exit path, including when the skill stops on `UNKNOWN` or pauses to ask the user a question.

#### Scenario: Nothing lands in the repo

- **WHEN** a walk completes, whatever its verdict
- **THEN** `git status` reports the same working tree as the walk started from
- **AND** no journey definition, screenshot, or dependency entry remains under the repository root

#### Scenario: Installing the tool leaves the repo untouched

- **WHEN** a walk installs the browser tool because the machine lacked it
- **THEN** the working tree is still unchanged
- **AND** the install is reported as a machine change, not a repo change

#### Scenario: Evidence is captured per step

- **WHEN** a browser journey of four steps is walked
- **THEN** four screenshots exist for that journey in the run's temporary directory
- **AND** no video file is expected or reported as missing

#### Scenario: Non-browser evidence is captured

- **WHEN** a request probe of three steps runs
- **THEN** the run's temporary directory holds the request and response for each step
- **AND** nothing is written inside the repository working tree

#### Scenario: Cleanup on an aborted walk

- **WHEN** a walk stops early on `UNKNOWN`
- **THEN** the temporary run directory is still removed

### Requirement: The verdict is graded against the written expectation

The pass or fail call for each journey SHALL be made by reading the captured evidence — screenshots, responses, or command output — against the scenario's `THEN`. The judgement SHALL NOT rest on the absence of an exception, an HTTP status alone, or the agent's impression that the result "looks fine": a journey whose script completed without error but whose evidence does not show what the `THEN` describes SHALL fail.

No second judging subagent is required. The external check is that the expectation was written by `/plan`, before the walk existed, for reasons unrelated to passing it.

Where the evidence is genuinely ambiguous, the walk SHALL stop and ask the user, presenting the evidence and the `THEN` side by side, rather than resolving the ambiguity in either direction on its own.

#### Scenario: A silent wrong result fails

- **WHEN** a journey's script completes with no error, but the evidence shows no validation message where the scenario's `THEN` requires one
- **THEN** the journey fails

#### Scenario: A bare 200 is not a pass

- **WHEN** a request probe returns a `200` whose body does not show what the `THEN` describes
- **THEN** the journey fails

#### Scenario: Ambiguity is escalated, not resolved

- **WHEN** the captured evidence neither clearly satisfies nor clearly contradicts the scenario's `THEN`
- **THEN** the walk stops and asks the user, showing the evidence and the expectation
- **AND** it does not resolve the ambiguity on its own judgement

### Requirement: Verdicts report, and gate nothing

The walk SHALL resolve to exactly one of five verdicts — `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`, `TIMEOUT` — and each SHALL be reported to the user and on the pull request. **No verdict SHALL block, delay, or condition a merge**, because `/verify` performs no merge and no other skill consults its result.

- **NONE** — this change has no scenario any probe can reach. Report why, in one line. `NONE` SHALL NOT be used to mean "not adopted": adoption no longer exists.
- **SUCCESS** — every journey satisfied its `THEN`.
- **FAILURE** — at least one journey contradicted its `THEN`.
- **UNKNOWN** — the walk could not run or could not be trusted after any permitted heal attempt: the browser could not be obtained, the preview URL is undiscoverable, staging is unreachable, or an access block survived or could not attempt its single heal-and-retry.
- **TIMEOUT** — the walk did not finish in its budget.

When the walk lands on a Cloudflare Access challenge, the heal SHALL be gated on the observed block rather than on the repo's category. With `CLOUDFLARE_API_TOKEN` available and no service-token pair in the durable store, `/verify` SHALL heal itself once before concluding `UNKNOWN`: mint a deterministically named service token through the Cloudflare Access API (widening into the Access permission groups first if needed, under the same standing authorization), ensure the Access policy accepts it, store the pair in the primary worktree's durable `.env` per the secrets convention without printing a value, apply it as request headers on the browser session, and retry. Without that token the heal SHALL be unavailable and the verdict SHALL be `UNKNOWN`, naming the Access wall and the missing credential. There SHALL be exactly one mint-and-retry per invocation.

`UNKNOWN` SHALL NOT be reported as `NONE`. A walk that cannot run is **unverified** rather than **absent**, and the report SHALL say so in those terms: an Access challenge screenshotted and described as "a page rendered" would convert an unchecked assumption into a checked-looking one, which is the failure mode the distinction exists to prevent.

#### Scenario: A failing walk blocks nothing

- **WHEN** a walk returns `FAILURE`
- **THEN** the failure is reported and posted
- **AND** no merge, push, or other skill is prevented from running afterwards

#### Scenario: Nothing to walk

- **WHEN** the scout finds no scenario any probe can reach
- **THEN** the verdict is `NONE` and one line explains why there was nothing to walk
- **AND** the report does not describe the repo as unadopted

#### Scenario: An Access challenge heals once

- **WHEN** a walk against an Access-protected preview receives the Access login interstitial, `CLOUDFLARE_API_TOKEN` is available, and the durable store has no service-token pair
- **THEN** `/verify` mints the service token, applies it as request headers, and retries the walk once
- **AND** no credential value is printed or committed

#### Scenario: An Access challenge with no Cloudflare credential

- **WHEN** a walk meets an Access interstitial and no `CLOUDFLARE_API_TOKEN` is available
- **THEN** the verdict is `UNKNOWN`, naming the Access wall and the credential that would allow the heal
- **AND** the interstitial is not reported as a rendered page or a failing journey

#### Scenario: An Access challenge that survives the heal

- **WHEN** the retry after the mint still lands on the Access interstitial
- **THEN** the verdict is `UNKNOWN` rather than a passing or failing journey
- **AND** the report names the mint attempt and the surviving challenge

#### Scenario: Unverified is reported as unverified

- **WHEN** a walk cannot run because the browser could not be obtained
- **THEN** the verdict is `UNKNOWN` and the report states the walk was not verified
- **AND** it is not described as "nothing to walk"

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE`, `/verify` SHALL reset the staging database using the stack pack's existing staging reset command. The reset SHALL run only on failure — a passing walk's data SHALL be left in place, staging being a fixture database rather than a preserved one. The reset guarantees the next walk begins from the seeded fixture rather than from the partial state a failed walk left behind.

After the reset, `/verify` SHALL judge scope. A failure is **in scope** when the contradicted `THEN` belongs to this change's own scenarios and the fix plausibly lives in files this branch already touches. For an in-scope failure, `/verify` SHALL fix the code, invoke `/save` (so the fix is pushed and gated normally), and re-walk — with at most **two** fix attempts per invocation, after which it stops and reports like any failure. For an out-of-scope failure (pre-existing behavior, infrastructure, another capability's scenario), `/verify` SHALL stop after the reset and report what failed and what to look at, exactly as before. The report SHALL state the scope judgement either way, so the reader can contest it. Genuinely ambiguous evidence SHALL still stop and ask the user.

#### Scenario: Reset follows a failure

- **WHEN** a journey fails
- **THEN** the staging reset command runs before any fix attempt or stop

#### Scenario: A passing walk leaves its data

- **WHEN** a walk returns `SUCCESS` after journeys that created and deleted records
- **THEN** no reset runs

#### Scenario: An in-scope failure gets a bounded fix loop

- **WHEN** a journey contradicts its `THEN` and the broken behavior belongs to this change's own code
- **THEN** `/verify` resets staging, fixes the code, invokes `/save`, and walks again
- **AND** after two fix attempts without a pass, it stops and reports

#### Scenario: An out-of-scope failure stops

- **WHEN** a journey fails because of behavior this change did not introduce
- **THEN** the skill resets staging, reports the failure and the scope judgement, and stops
- **AND** no fix, re-push, or re-walk is attempted

### Requirement: Evidence is posted on every verdict and degrades honestly

`/verify` SHALL post its result as a comment on the pull request on **every** verdict, including `FAILURE`, `UNKNOWN`, and `TIMEOUT` — not only on success. A failed walk's screenshots are the most useful evidence the walk can produce, and there is no merge being blocked that would otherwise carry the news.

Each comment SHALL cover each journey, its probe, its steps, its verdict, and the scenario's `THEN` it was judged against, and SHALL state where the browser and probes ran. It SHALL also list by name any scenario the scout excluded as unverifiable, so what was not checked is as visible as what was. The written record SHALL be complete on its own, independent of whether any media renders.

One comment SHALL be posted per `/verify` invocation. Repeated invocations SHALL post additional comments rather than editing or replacing earlier ones, so the pull request carries a truthful log of attempts.

Screenshots SHALL be linked when a public object-storage host is configured and referenced by local path when one is not. The absence of a media host SHALL NOT be reported as a failure or a degraded run. The comment SHALL NOT claim or link a video, because the walk captures none.

#### Scenario: A failed walk still posts

- **WHEN** a walk returns `FAILURE`
- **THEN** a PR comment is posted containing the failing journey, its steps, its `THEN`, and its screenshots

#### Scenario: An un-runnable walk still posts

- **WHEN** a walk returns `UNKNOWN` because the preview URL could not be discovered
- **THEN** a PR comment is posted stating that the walk was not verified and why

#### Scenario: Repeated walks append

- **WHEN** `/verify` is invoked twice on the same pull request
- **THEN** two comments exist, in invocation order
- **AND** the first is not edited or deleted

#### Scenario: Unverifiable scenarios are named

- **WHEN** a change has two probe-reachable scenarios and one no probe can reach
- **THEN** the comment grades the two journeys and lists the third by name as unverified
- **AND** the third does not silently disappear from the record

#### Scenario: The comment claims no video

- **WHEN** any walk posts its evidence
- **THEN** the comment references screenshots and the written record only
- **AND** it neither links a video nor reports one as unavailable

### Requirement: The runbook ships in core and records what was declined

A runbook SHALL ship in the payload's **core** category, so it is present in every repo that receives the skill citing it. It SHALL cover what the walk needs, what it installs for itself, how journeys are expressed for each probe type, and where evidence lands, plus the optional public host for inline screenshots.

Where the runbook documents provider-specific detail — the Cloudflare Access service token, the seeded `schema/seed.sql` fixture — it SHALL mark that detail as applying only to repos that took the stack pack, and any link into a stack-pack-only page SHALL be hedged as such, so a reader without the pack is never sent to a page their repo does not have.

The runbook SHALL record the deliberately declined options so they are not re-litigated: a saved test suite, a second judging agent, walking the full spec surface, and walking automatically on every push. It SHALL state that `/verify` invokes `/save` after scouting and why, distinguishing that from the declined option of walking automatically whenever `/save` runs.

It SHALL also record the decisions this capability **reversed or dropped, with the reason for each**: that the browser was once required to be remote so the walk behaved identically everywhere; that a repo dependency once served as the adoption signal; and that video was once captured per journey and is not, because the evidence a reviewer actually reads is a screenshot against a written expectation. It SHALL record which browser engines were considered and why the chosen one was chosen, including the engine-replacement path, so that choice can be revisited without being re-derived.

#### Scenario: The runbook reaches a repo with no stack pack

- **WHEN** WongStack is synced into a repo that declined the stack pack
- **THEN** the walkthrough runbook is among the files it receives
- **AND** its Cloudflare-specific sections are marked as pack-only

#### Scenario: The runbook records what was declined

- **WHEN** a reader asks why the walk does not run automatically on every `/save`
- **THEN** the runbook states the decision and its reason
- **AND** distinguishes it from `/verify`'s own `/save` step

#### Scenario: The reversed decisions are recorded, not erased

- **WHEN** a reader asks why the walk now runs a browser on this machine, installs its own tool, and captures no video
- **THEN** the runbook states each earlier decision, what it protected, and why it was traded

#### Scenario: The engine choice can be revisited

- **WHEN** a reader asks why this browser tool was chosen over the alternatives
- **THEN** the runbook names the alternatives, the deciding argument, and what replacing the engine would cost

## ADDED Requirements

### Requirement: /verify begins by invoking /save

`/verify` SHALL scout the change's scenarios into candidate journeys **before** invoking `/save` and before any credential preflight. The scout reads only local files (the change's delta specs and any touched synced specs), so it costs no push, no CI wait, and no API call. When the scout finds no scenario that any probe can reach, the verdict SHALL be `NONE`, reported in one line, and `/save`, preflight, and every remote step SHALL be skipped.

When at least one journey exists, `/verify` SHALL invoke `/save` before walking, so the commit under test is pushed, CI has run, and the per-commit preview URL exists. `/verify` SHALL NOT implement any git action itself — it delegates, as `/apply` does when it hands completed work to `/save`. Because the scout reads the same working tree that `/save` then commits, the journeys and the deployed commit SHALL describe the same change.

The walk SHALL target the per-commit preview alias discovered by the existing preview-URL helper for the current head SHA. It SHALL NOT ask the user for a URL, and SHALL NOT construct one from a worker-name convention: a hand-built URL can address a commit that was never deployed and still answer `200`.

When `/save` reports that CI is absent (`NONE`), `/verify` SHALL still proceed if a preview URL can be discovered, and SHALL treat an undiscoverable URL as a condition to report rather than a URL to guess.

#### Scenario: Nothing observable costs nothing

- **WHEN** `/verify` is invoked on a change whose scenarios have no deployed surface any probe can reach (pure library code, behavior observable only by local execution)
- **THEN** the scout returns no journeys and the verdict is `NONE` with a one-line explanation
- **AND** no `/save`, no credential preflight, and no browser or probe session occurs

#### Scenario: Save runs first when there is something to walk

- **WHEN** `/verify` is invoked on a branch with uncommitted work and at least one probe-reachable scenario
- **THEN** the scout runs, then `/save` runs — committing, pushing, waiting for CI, and resolving the preview URL
- **AND** the walk targets the URL that `/save` resolved

#### Scenario: The target URL is discovered, not configured

- **WHEN** the walk needs a URL
- **THEN** it uses the per-commit preview URL produced by the preview-URL helper for the current head SHA
- **AND** it neither prompts for a URL nor derives one from a naming convention

#### Scenario: No discoverable preview URL

- **WHEN** the repo's CI does not deploy, so no preview URL exists for this commit
- **THEN** the verdict is `UNKNOWN` and the report names the missing deployment as the cause
- **AND** no URL is guessed

### Requirement: Scenarios become journeys, matched to the strongest probe

A scout SHALL derive the journeys from the change's own OpenSpec scenarios rather than from the application's routes or components. Its inputs SHALL be the delta specs under `openspec/changes/<slug>/specs/**`, plus the scenarios of any capability in `openspec/specs/` that the branch diff touches. The full synced spec surface SHALL NOT be walked — the walk is acceptance for this change, not a regression suite whose cost grows with the app.

The scout SHALL match each scenario to the **strongest probe that can observe it end to end** against the deployed preview, rather than keeping only what a browser can see:

- **Browser journey** — the scenario is observable through rendered UI. Driven with the browser CLI.
- **Request probe** — the scenario is observable on the request path but not through UI: an API endpoint, a webhook, a redirect, a header, a status code. Driven as direct HTTP requests against the preview URL, with each request and response captured as evidence. No browser is required.
- **State probe** — the scenario's effect is observable through a command that already exists at the machine level or in the stack pack, applied to deployed state — for example, a triggering request followed by a query of the staging database. The walk SHALL NOT add tooling to the repository to make a scenario observable.

A scenario no probe can reach — behavior with no deployed surface, or observable only by building or executing the repository's code locally — SHALL be excluded from the journeys and listed **by name** in the report as unverified, so the exclusion is visible rather than silent.

Each journey SHALL carry the scenario's `WHEN` as its steps and the scenario's `THEN`, verbatim, as its pass criterion, whatever the probe.

#### Scenario: Scope is the change plus what the diff touches

- **WHEN** the scout runs on a change with delta specs for one capability, whose diff also edits files covered by a second capability's spec
- **THEN** the journeys cover the delta scenarios and the second capability's scenarios
- **AND** capabilities unrelated to both are not walked

#### Scenario: An API scenario is probed without a browser

- **WHEN** a change's scenario describes an endpoint's status code and response body, with no UI
- **THEN** the scout emits a request probe rather than excluding the scenario
- **AND** the captured request and response are its evidence

#### Scenario: An off-request-path effect is probed through state

- **WHEN** a scenario describes a queue consumer whose effect lands in the staging database, and an existing stack-pack command can query that database
- **THEN** the scout emits a state probe — the triggering request, then the query
- **AND** no tooling is added to the repository to make the observation possible

#### Scenario: The unreachable is listed, not dropped

- **WHEN** a scenario is observable only by executing the repository's code locally
- **THEN** it is excluded from the journeys
- **AND** the report lists it by name as unverified

#### Scenario: The pass criterion is the scenario's own words

- **WHEN** a journey is built from a scenario
- **THEN** its expected outcome is the scenario's `THEN` text, not a restatement invented by the scout

#### Scenario: Destructive journeys are walked

- **WHEN** a scenario describes deleting a record
- **THEN** the scout includes it as a journey rather than skipping it as unsafe

## REMOVED Requirements

### Requirement: /walk begins by invoking /save

**Reason**: The verb renames to `/verify`, and the requirement's `NONE` trigger changes meaning — from "no browser-observable scenario" to "no scenario any probe can reach" — so its "Nothing browser-observable costs nothing" scenario states a claim the probe ladder makes false. The save-first ordering itself survives unchanged.

**Migration**: Replaced by the ADDED requirement `/verify begins by invoking /save`, identical except for the verb and the `NONE` trigger; the old scenario's cost guarantee lives on as "Nothing observable costs nothing".

### Requirement: Scenarios become journeys, scoped to the change

**Reason**: The requirement's core constraint — keep only scenarios observable through a browser, exclude everything off the request path — is exactly what the broadening removes, and its "Non-browser scenarios are excluded" scenario would contradict the request- and state-probe behavior.

**Migration**: Replaced by the ADDED requirement "Scenarios become journeys, matched to the strongest probe", which keeps the change-scoping and verbatim-`THEN` rules and replaces the browser-only filter with the probe ladder.

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file specs/toolchain-dependencies/spec.md utf8 2996 -->
## MODIFIED Requirements

### Requirement: The payload depends only on git, gh, and openspec

The WongStack **core** payload SHALL require no external command-line tools beyond `git`, `gh`, and `openspec`, with one named exception: **`/verify` requires the browser automation CLI it drives**, which it installs at the point of need. Every other core verb — `/explore`, `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `/dream`, `/improve`, `/wong-sync` — SHALL continue to run on `git`, `gh`, and `openspec` alone, and a repo that never invokes `/verify` SHALL never acquire that tool.

That exception SHALL be a **tool**, not a language toolchain: the walk's browser dependency SHALL NOT require a package manifest, a dependency entry, or a language runtime inside the repository. A repo in any language SHALL be able to walk without gaining a toolchain it does not otherwise use.

No core payload script or skill outside `/verify` SHALL invoke a standalone `jq`, `python`, `node`, or other interpreter to do work the agent or an already-required tool can do.

The **opt-in Cloudflare stack pack** MAY require additional tools — `node`/`npm` and `wrangler` in that repo's own build/CI, and `curl` in the pack's own provisioning skill — but only in a repo that explicitly took the pack. Provisioning SHALL use `curl` against the Cloudflare REST API rather than `wrangler` or a Node script, so that setting up the app requires no language runtime on the user's machine.

The required-tools page SHALL state this split precisely: the three universal tools, the browser CLI scoped to `/verify`, and `curl` as a pack-gated skill dependency. The governing rule SHALL be stated there: use a tool where it is already required, and never let a WongStack skill be the reason a *runtime* gets installed without asking.

#### Scenario: A pack-gated script uses node where node already exists

- **WHEN** a stack-pack script runs in CI or at the repo's build boundary, where `node` is already required
- **THEN** it MAY use `node` for work `curl` and shell would do poorly, such as JSON assembly or editing `wrangler.jsonc`
- **AND** no skill on the user's own machine gains a `node` dependency as a result

#### Scenario: The walk's tool dependency is named, not hidden

- **WHEN** a reader consults the required-tools page to learn what the toolkit needs
- **THEN** the browser CLI is listed as required by `/verify` specifically
- **AND** the rest of the core payload is still stated to need only `git`, `gh`, and `openspec`

#### Scenario: Walking adds no toolchain to the repo

- **WHEN** `/verify` runs in a repo whose language is not JavaScript
- **THEN** no package manifest, dependency entry, or language runtime is added to that repo
- **AND** the browser tool is installed on the machine instead

#### Scenario: A repo that never walks needs no browser tool

- **WHEN** a repo uses the loop without ever invoking `/verify`
- **THEN** no browser tool or browser is installed on its behalf

<!-- end specs/toolchain-dependencies/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-11

~~~
<!-- end .openspec.yaml -->
