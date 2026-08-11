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
