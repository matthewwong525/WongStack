<!-- openspec-archive v1 2026-08-02-setup-sync-consolidation -->
<!-- file proposal.md utf8 6425 -->
# Setup/sync/cloudflare consolidation

**Status:** ready-to-ship
**Open questions:** none

## Why

The stack pack's knowledge is spread across ~10 files, and it has already rotted: v8.0 replaced the preview-swap staging model and v8.1 replaced Workers Builds with GitHub Actions, but half the copies were missed — `/wong-cloudflare` still instructs writing `preview_database_id` (retired), the fragments page still writes `CLOUDFLARE_USER_TOKEN` where everything else reads `CLOUDFLARE_API_TOKEN`, and it still calls a Workers-Builds dashboard step mandatory. `wiki/stack/provisioning.md` is a step-for-step clone of the skill (148 lines), and the late-adoption path is a dead end: setup and `/wong-cloudflare` both say "run `/wong-sync` — it'll offer the pack" while `/wong-sync` explicitly never offers pack files to a non-pack repo. This extends #45's one-owner-per-fact doctrine to the setup → sync → cloudflare surfaces.

## What Changes

- **Fix the five live contradictions**: the retired `preview_database_id`/swap model in `wong-cloudflare/SKILL.md`, `failure-map.md`, and the live `cloudflare-provisioning` spec; `CLOUDFLARE_USER_TOKEN` → `CLOUDFLARE_API_TOKEN` in `stack-pack-fragments.md`; the Workers-Builds deploy-command section demoted from "mandatory" to the fallback path it now is; the preview URL shape unified on the staging-Worker form (`<branch>-<worker>-staging.<subdomain>.workers.dev`); the fit playbook's stale "opens the PR itself" contribute row.
- **One owner per Cloudflare fact**: `wiki/stack/provisioning.md` is **deleted** (its audience — an agent with the pack but without the skill — cannot exist; they install together). Owners: `cloudflare-credentials.md` the token screen and click path; `wong-cloudflare/references/permission-groups.md` the widen protocol mechanics; `d1-pipeline.md` the deploy/staging model and why-Actions; `failure-map.md` the failure translations; `getting-started.md` the human narrative, linking down instead of restating. `wong-cloudflare/SKILL.md` slims to the outcome flow (263 → ~150 lines), delegating mechanics to its references per the payload-single-source doctrine.
- **`/wong-cloudflare` becomes the one door to the pack.** Run in a repo without `components.stackPack: true`, it makes the outcome-phrased offer itself, flips the flag, lands the pack's drop-in files (per the payload manifest), applies the config fragments, then provisions. `/wong-setup` Step 6 shrinks to the offer plus "run `/wong-cloudflare` whenever" — it sets the flag on a yes (so the install sync copies the drop-ins) but **stops applying fragments at setup**; fragments are applied by `/wong-cloudflare`, which is the only actor that knows the real database ids. The circular pointers in `wong-setup` and `wong-cloudflare` are corrected.
- **Setup/sync dedupe**: the `.claude/.wong-stack.json` schema gets one owner (a `wong-sync` reference; `wong-setup` points at it with "version/commit null"); the exact clone cache path is declared once (`wong-sync` owns it); `wong-setup`'s Step 8 legacy migrations compress to one line; the `workflow`-OAuth-scope explanation gets one owner.
- **Journey visibility**: one sentence each in the root `README.md` and `wiki/README.md` telling the setup → sync → cloudflare story.
- **Release**: `VERSION` bump (minor — behavior changes in wong-cloudflare/wong-setup) + `CHANGELOG.md` entry.

**Non-goals:** no changes to the adapt pipeline's design (two subagents, five verdicts — settled in #44/#45), no changes to the pack's scripts or deploy behavior, no restructuring of `d1-pipeline.md`'s content beyond absorbing owned facts, no new wiki sections.

## Capabilities

### New Capabilities

_None — all changes land in existing capabilities._

### Modified Capabilities

- `cloudflare-provisioning`: the binding requirement drops `preview_database_id` for the `env.staging` twin model; a new requirement makes the skill the single adoption door (offer → flag → files → fragments → provision) replacing the stop-and-point-at-`/wong-sync` behavior; mechanics delegate to references.
- `stack-pack`: fragment application moves from setup-time to `/wong-cloudflare`; the Workers-Builds deploy command becomes fallback-only documentation; `wiki/stack/` page set loses `provisioning.md`.
- `install-onboarding`: Step 6's pack offer no longer applies fragments; the manifest schema and clone path are referenced from `wong-sync`'s owned copies rather than restated; legacy migration steps compress to one line.
- `wong-sync`: the manifest schema lives in a `wong-sync` reference as the single owner; the payload manifest's `wiki/stack/` list drops `provisioning.md`; the "never offered" rule gains the pointer that adoption is `/wong-cloudflare`'s job.

## Impact

- `.claude/skills/wong-cloudflare/` (SKILL.md + both references), `.claude/skills/wong-setup/SKILL.md` + `fit-playbook.md`, `.claude/skills/wong-sync/SKILL.md` + `payload-manifest.md` + `stack-pack-fragments.md` (+ a new manifest-schema reference)
- `wiki/stack/`: `provisioning.md` deleted; `getting-started.md`, `cloudflare-credentials.md`, `d1-pipeline.md`, `cloudflare-access.md`, `core-stack.md`, `README.md` deduped/repointed
- `wiki/development/required-tools.md` (workflow-scope ownership), root `README.md`, `wiki/README.md`
- `openspec/specs/`: four delta specs
- `VERSION`, `CHANGELOG.md`

## Decision log

- **2026-08-02** — Explored, planned, and implemented in one session; all 36 tasks complete. Two design refinements surfaced during spec-reading and are recorded in design.md D1: (1) the "one door" cannot literally be `/wong-cloudflare` in a repo that declined the pack, because the skill file is itself pack-gated and the stack-agnostic guarantee is a hard requirement — so the skill is the whole door wherever it exists, and the documented route elsewhere is flag + `/wong-sync` + `/wong-cloudflare`; (2) deferring all fragment application to `/wong-cloudflare` is CI-safe because the pack workflow's unprovisioned path deliberately skips the build wrapper, so the feared red-check window between install and provisioning doesn't exist. `wiki/stack/provisioning.md` deleted (user's call: delete over stub); legacy migration steps compressed to one line (user confirmed no meaningful pre-v5 installed base); everything shipped as one change per the user's request, on main with #45 (v8.5.0) merged. Release cut as v8.6.0.

<!-- end proposal.md -->
<!-- file design.md utf8 10491 -->
# Design

## Context

#45 (v8.5.0) established the one-owner-per-fact doctrine (`payload-single-source`) for the OpenSpec layer, `/ship`, `/save`, and the verdict store. The setup → sync → cloudflare surfaces were untouched, and they hold the worst of what remains: `wiki/stack/` is 1,102 lines (71% of the wiki), `wiki/stack/provisioning.md` is a step-for-step clone of `wong-cloudflare/SKILL.md`, the Cloudflare token click-path exists in four full copies, and the v8.0 (staging Worker) and v8.1 (Actions CI) model changes each missed roughly half their copies — leaving five live contradictions. Separately, the pack's late-adoption path is circular: `wong-setup:99` and `wong-cloudflare:38` both point at `/wong-sync`, which by its own manifest rule never offers pack files to a non-pack repo.

## Goals / Non-Goals

**Goals:**
- Zero contradictions among the stack-pack surfaces, and one owning file per Cloudflare fact so the next model change has one place to edit.
- A working, obvious late-adoption path: `/wong-cloudflare` is the single door to "make this a real website," whenever it's run.
- `wong-setup`/`wong-sync` stop restating each other's exact values (manifest schema, clone path, workflow scope).

**Non-Goals:**
- No changes to the adapt pipeline (two subagents, five verdicts, verdict record — settled in #44/#45).
- No changes to the pack's scripts (`cf-build.sh`, `cf-deploy.sh`, helpers) or to deploy behavior.
- No restructuring of `d1-pipeline.md` beyond absorbing facts it now owns.
- No renaming of skills or files other than the one deletion.

## Decisions

### D1 — `/wong-cloudflare` owns configuration + provisioning; adoption is the flag + the sync, stated truthfully everywhere

Two hard constraints shape this (both existing spec requirements worth keeping): the `wong-cloudflare` skill file is itself pack-gated, so a declined repo *does not have the skill* — the door can't literally be a command the repo lacks; and a declined repo stays byte-for-byte stack-agnostic, so the skill can't move into the always-installed payload. The one-door idea therefore lands as:

- **Wherever the skill exists, it is the whole door.** Its Step 0 stops being a bounce: flag true → configure/provision; flag false (or pack files missing) → make the outcome-phrased offer itself, set `components.stackPack: true`, land the drop-in files (follow `wong-sync` SKILL Steps 1–2 — refresh clone, copy-if-absent; adapt is not run), then continue. No Cloudflare token yet → stop cleanly; files are in, re-run with a token.
- **Where the skill doesn't exist, the documented route is the flag + the sync**: set `components.stackPack: true` in `.claude/.wong-stack.json`, run `/wong-sync` (copies the pack, including the skill), then `/wong-cloudflare`. Every pointer that today says "run `/wong-sync` — it'll offer the pack" is corrected to this route; no payload prose may point at a path that refuses.
- **`/wong-cloudflare` owns all fragment application.** `wong-setup` Step 6 keeps the offer and, on a yes, still records `stackPack: true` in the seed manifest (the install sync then copies the drop-ins, skill included) — but **stops applying fragments**; the closing line becomes "run `/wong-cloudflare` when you have a Cloudflare account — it configures and provisions." This is safe for CI: the pack workflow's unprovisioned path deliberately does not route through the build wrapper (stack-pack spec), so a repo between install and provisioning still gets a green plain-build check with no `package.json` wiring.

Consequences to write through: `wong-sync` keeps its gating rule verbatim (it is the *updater* of a taken pack, never the offerer); `adapt.md`'s example verdict record drops the impossible `stack-pack-cloudflare — declined` line; `stack-pack-fragments.md`'s applier sentence changes from "`/wong-setup` applies them on the first install" to "`/wong-cloudflare` applies them at adoption and provisioning"; `wong-cloudflare` Step 0's missing-wrangler-config bounce goes away (the fragment creates the file when absent).

### D2 — The wrangler block is written by provisioning, with real ids

The `wrangler.jsonc` fragment leaves the "apply at adoption" set. `/wong-cloudflare`'s binding step (today's 4c, corrected to the `env.staging` model) merges the full block from `stack-pack-fragments.md` **after** the databases exist, filling both `database_id`s directly — the placeholder-id phase disappears. The other three fragments (`package.json`, `.env.example`, `.gitignore`) carry no ids and are applied at the start of the same run, before the credential step.

### D3 — Ownership map for the Cloudflare facts

| Fact | Owner | Everyone else |
|---|---|---|
| Token screen click-path, Account Resources warning | `wiki/stack/cloudflare-credentials.md` | link (skill Step 1b keeps a 2–3 line summary + link) |
| Widen protocol (call sequence, wholesale-PUT rule, resolve-by-name, group tables) | `wong-cloudflare/references/permission-groups.md` (absorbs it; keeps recorded ids) | skill Step 2 states the outcome + link |
| Failure translations | `wong-cloudflare/references/failure-map.md` | skill links; inline table in Step 1c dropped |
| Deploy/staging model, why-Actions-not-Workers-Builds, thin-driver workflow | `wiki/stack/d1-pipeline.md` | skill 4e, fragments, manifest link |
| Access runbook | `wiki/stack/cloudflare-access.md` | skill Step 6 keeps only the never-separate warning + link |
| Human journey | `wiki/stack/getting-started.md` (outcome steps only, linking down) | — |
| `wiki/stack/provisioning.md` | **deleted** — every inbound link repointed to the skill or the owning page | — |

`wong-cloudflare/SKILL.md` becomes the orchestration narrative (~150 lines): what happens, in what order, what the user sees — mechanics live in the references, matching `/ship` → `walkthrough.md`.

### D4 — Contradiction resolutions (the correct side of each)

1. **Staging binding**: the `env.staging` twin model (v8.0). `SKILL.md:171`, `failure-map.md:48`, and the live `cloudflare-provisioning` spec requirement change; `preview_database_id` survives only in the adoption runbook (`d1-pipeline.md`) as the thing you remove, and in changelog history.
2. **Token variable**: `CLOUDFLARE_API_TOKEN` (matches the skill, every doc, and the dogfooded `.env.example`). `stack-pack-fragments.md:108` fixed; the account-token warning comment stays.
3. **Workers Builds deploy command**: fallback-only. The fragments section reframes as "only if you chose Workers Builds instead of the pack's Actions workflow" and drops "the pack does not work without it"; `d1-pipeline.md`'s fallback paragraph is the owner.
4. **Preview URL shape**: `<branch>-<worker>-staging.<subdomain>.workers.dev` — branch deploys land on the staging Worker (`cf-deploy.sh` uploads versions against `--env staging`), so the `-staging` form in `d1-pipeline.md`/`cloudflare-access.md` is correct; skill and `getting-started.md` align.
5. **Fit playbook contribute row**: rewrite to the current truth — local payload improvements go upstream as a manual PR (`contributing.md`); `/wong-sync` brings improvements *down*.

### D5 — Setup/sync single owners

- **Manifest schema**: `wong-sync` SKILL Step 4 is the owner (it's the file's writer of record). `wong-setup` Step 7 replaces its JSON block with "write the Step 4 schema with `version`/`commit` null and today's dates" + the seed-specific notes. The hand-synced `components.skills` array then exists once.
- **Clone cache path**: `wong-sync` Step 1 owns the exact path. `wong-setup` Step 0 keeps the literal (it must clone before `wong-sync` exists locally) but marks it as a copy of `wong-sync`'s value, which owns it.
- **`workflow` OAuth scope**: `wiki/development/required-tools.md` gains the owning explanation (why the scope, the exact failure string, the refresh command). `wong-setup` Step 5 and `wong-cloudflare` 4e each keep one line — check `gh auth status`, offer `gh auth refresh --scopes workflow` — plus the link; the duplicated plain-language quote appears only at the owner.
- **Legacy traces**: `wong-setup` Step 8 compresses to one line (offer to migrate/remove pre-v5 traces found by the research; never delete unprompted); the pre-2.0 manifest-name fallback in Step 1 folds into that line's spirit (one parenthetical).

### D6 — Journey visibility

Root `README.md` gains one sentence after the workflow table ("Want the app to be a real website? `/wong-cloudflare` sets up hosting, data, and publishing — optional, whenever you're ready") and `wiki/README.md`'s stack line states the flow: setup once → sync to stay current → `/wong-cloudflare` if you want it live.

### D7 — Release

Minor bump (8.5.0 → 8.6.0): behavior changes (`/wong-cloudflare` adoption leg, setup Step 6 contract) but nothing breaking for an installed repo — a repo that took the pack under the old flow has the flag set and skips the new Step 0 branch entirely.

## Risks / Trade-offs

- [A repo mid-flow: said yes at setup under the old contract, flag set, fragments applied with placeholder ids, never provisioned] → `/wong-cloudflare` is idempotent and merges the wrangler block against whatever is there; placeholder ids are overwritten at the binding step. No migration needed.
- [Deleting `provisioning.md` breaks inbound links] → sweep `grep -rn "provisioning.md"` across the repo and repoint every hit (known: `wiki/stack/README.md`, `getting-started.md`, `required-tools.md`, possibly specs/notes).
- [Slimming the skill drops an operative instruction] → the slim moves mechanics to references the skill explicitly says to read at the relevant step (the `/ship` pattern); each cut passage must land in its owner before the cut, task-ordered that way.
- [The `-staging` URL form could itself be stale] → verified against `cf-deploy.sh` (`--env staging` + `--preview-alias`), `d1-pipeline.md:87`, and the wrangler env naming (`<worker>-staging`); if a live deploy ever disagrees, the owner (`d1-pipeline.md`) is the single place to fix.
- [Late-adoption delegation ("follow wong-sync Steps 1–2") couples skill internals] → it names the steps by outcome (refresh clone, copy-if-absent) and the file path, same pattern `wong-setup` Step 7 already uses for the full skill.

## Open Questions

None — the four /explore questions were answered (delete `provisioning.md`; full one-door ownership; legacy to one line; single PR on post-#45 main).

<!-- end design.md -->
<!-- file tasks.md utf8 9524 -->
# Tasks

## 1. Owners absorb their facts (before any duplicate is cut)

- [x] 1.1 `wong-cloudflare/references/permission-groups.md` — absorb the widen protocol as the owning statement: the five-call sequence, the wholesale-`PUT` rule (must retain `API Tokens Write` + `Account API Tokens Write`, preserve the account resource block), resolve-ids-by-name + the ambiguous-name/scope rule, the five normal-provision groups table (with the "For" column and the Workers-CI-naming note), and the three Access groups. Keep the recorded ids as fallback/fixture.
- [x] 1.2 `wiki/stack/cloudflare-credentials.md` — confirm it owns the full token click path + Account Resources warning; **fix the stale line** "CI doesn't need a copy: Workers Builds runs inside Cloudflare" (the Actions workflow reads the credentials from GitHub repository secrets); replace its duplicated widen call list and permission table with a link to `permission-groups.md`.
- [x] 1.3 `wiki/stack/d1-pipeline.md` — confirm it owns why-Actions-not-Workers-Builds and the thin-driver workflow description, and that its Workers Builds **fallback** paragraph (with the dashboard deploy-command setting) is the single home of that dashboard step.
- [x] 1.4 `wiki/development/required-tools.md` — add the owning `workflow`-OAuth-scope explanation: why the scope, the exact `refusing to allow an OAuth App to create or update workflow` failure and that it fires at push time, `gh auth login --scopes workflow` up front, `gh auth refresh --scopes workflow` as repair, and the plain-language one-liner.
- [x] 1.5 `wong-cloudflare/references/failure-map.md` — replace the stale "Preview swap refuses to run" row with the current model's failure (`cf-deploy.sh` refuses when a non-production branch resolves to the production Worker name; staging env missing its own `name`/`d1_databases`); keep it the single home of failure translations.

## 2. wong-cloudflare — one door, outcome flow, env.staging model

- [x] 2.1 Rewrite Step 0 per design D1: flag true → continue; flag false or pack files missing → make the outcome-phrased offer (moved from setup Step 6, same wording contract: outcome not inventory), on yes set `components.stackPack: true`, land drop-ins by following `wong-sync` SKILL Steps 1–2 (clone refresh + copy-if-absent, no adapt), apply the id-free fragments (`package.json`, `.env.example`, `.gitignore`) from `stack-pack-fragments.md`, then continue; on no, stop unchanged. No token yet → stop cleanly after adoption, saying a re-run provisions. Drop the missing-wrangler-config bounce (the fragment creates it).
- [x] 2.2 Step 1b/1c slim: 2–3 line click-path summary + link to `cloudflare-credentials.md`; failure handling links `references/failure-map.md` instead of the inline two-row table.
- [x] 2.3 Step 2 slim: state the outcome (two-permission token widens itself; stop-and-list on refusal) + link `references/permission-groups.md` for the protocol. No inline call diagram or group table.
- [x] 2.4 Step 4c rewrite to the staging-Worker model: merge the `wrangler.jsonc` fragment with real ids — production id in the top-level binding, staging id inside `env.staging`, each with its own `database_name`/`migrations_dir`; no `preview_database_id`, no swap language. Keep the `migrations_dir`-relative-path caution as a one-liner + link to the fragment's rules.
- [x] 2.5 Step 4e slim: keep `gh auth status` check + `gh auth refresh --scopes workflow` offer as one line each, link `required-tools.md` for the why; keep the thin-driver sentence as a link to `d1-pipeline.md`.
- [x] 2.6 Step 4f/5: preview URL pattern in its `-staging` form (`<branch>-<worker>-staging.<subdomain>.workers.dev`), noting per-commit URLs are harvested by CI, not constructed.
- [x] 2.7 Step 6 (Access) slim: keep the two-things-together warning and the unverified Zero Trust org caveat; link `cloudflare-access.md` for the runbook and `permission-groups.md` for the Access groups.
- [x] 2.8 Update the frontmatter description for the adoption leg ("the one door to the pack: offers it, lands its files, configures, provisions, tears down") and confirm the whole SKILL reads as the outcome flow (~150 lines).

## 3. wiki/stack — delete the clone, keep one narrative

- [x] 3.1 Delete `wiki/stack/provisioning.md`. Sweep `grep -rn "provisioning\.md"` across the repo and repoint every inbound link (known: `wiki/stack/README.md`, `getting-started.md`, `required-tools.md`; check notes/ and specs references).
- [x] 3.2 `wiki/stack/getting-started.md` — keep the human narrative only: link the credentials page for the click path (drop the duplicated route + failure table), link required-tools for the workflow scope, fix the preview URL to the `-staging` form, and point "what happens next" at `/wong-cloudflare`.
- [x] 3.3 `wiki/stack/core-stack.md` — fix "Workers Builds runs the build and deploy wrappers" to the CI-neutral truth (the pack's CI — GitHub Actions by default — runs them).
- [x] 3.4 `wiki/stack/README.md` — drop the provisioning.md entry, tighten the per-page blurbs to one line each, and remove the duplicated pack-gating sentence (link the payload manifest).
- [x] 3.5 `wiki/stack/cloudflare-access.md` — confirm it is the Access runbook owner; keep its unverified-org labelling; no content moves in, only the skill's Step 6 now points here.

## 4. Fragments + payload manifest

- [x] 4.1 `wong-sync/references/stack-pack-fragments.md` — applier sentence: `/wong-cloudflare` applies fragments at adoption and provisioning (setup applies none); fix `CLOUDFLARE_USER_TOKEN=` → `CLOUDFLARE_API_TOKEN=` (keep the user-scoped/account-token warning comment); rewrite the Workers Builds deploy-command section to fallback-only — a pointer at `d1-pipeline.md`'s fallback paragraph, dropping "the pack does not work without it".
- [x] 4.2 `wong-sync/references/payload-manifest.md` — remove `provisioning.md` from the `wiki/stack/` list; update the fragments paragraph's applier (guided edits via `/wong-cloudflare`, surfaced through adapt when upstream changes one).

## 5. wong-setup — shrink and reference

- [x] 5.1 Step 6 pack offer: keep the outcome-phrased ask and the on-yes seed-manifest flag; delete the fragment-application instruction; closing line on yes = "run `/wong-cloudflare` when you have a Cloudflare account — it configures and provisions"; on no = name the working late-adoption route (set the flag + `/wong-sync`, then `/wong-cloudflare`). Keep the walkthrough name-drop paragraph.
- [x] 5.2 Step 7: replace the inline seed-manifest JSON with a reference to `wong-sync` SKILL Step 4's schema — "same shape, `version`/`commit` null, today's dates, renames from Step 6" — keeping the hand-off unchanged.
- [x] 5.3 Step 0: mark the clone cache path as a copy of the value `wong-sync` Step 1 owns.
- [x] 5.4 Step 5: cut the two workflow-scope paragraphs to one line each (login with `--scopes workflow`; refresh as repair) + link to `required-tools.md`'s owning explanation.
- [x] 5.5 Step 8 → one line: "Legacy traces (pre-v5: `WONG-FRAMEWORK` markers, `.wong-framework.json`, retired skills, `daily/`): offer to migrate or remove what Step 2 found — ask first, never delete unprompted." Fold Step 1's pre-2.0 manifest-name fallback into a parenthetical there or in Step 1's first line.
- [x] 5.6 `references/fit-playbook.md:42` — rewrite the stale contribute row: the pain maps to `/wong-sync` pulling upstream improvements down + the manual PR route (`contributing.md`) for sending fixes up; no "opens the PR itself".

## 6. wong-sync — schema owner and truthful pointers

- [x] 6.1 SKILL Step 4: mark the manifest schema block as the payload's single statement of the schema (setup references it for the seed); no content change beyond the ownership note.
- [x] 6.2 SKILL Step 2 (pack scoping rule): after "never copied, never analysed, never offered", add the truthful pointer — adopting the pack is `/wong-cloudflare`'s job (or the flag + a sync where the skill isn't installed).
- [x] 6.3 `references/adapt.md` — remove the `stack-pack-cloudflare — declined` line from the example verdict record (a non-pack repo's pack is never analysed, so the example was impossible).

## 7. Journey visibility

- [x] 7.1 Root `README.md` — one sentence after the workflow table: the optional `/wong-cloudflare` door to a real, visitable website.
- [x] 7.2 `wiki/README.md` — the stack section line tells the flow: setup once → `/wong-sync` to stay current → `/wong-cloudflare` if you want it live.

## 8. Sweeps, release

- [x] 8.1 Sweep `grep -rn "preview_database_id\|swap-d1-id\|CLOUDFLARE_USER_TOKEN" wiki/ .claude/ AGENTS.md README.md` — the only remaining live hits are `d1-pipeline.md`'s adoption runbook (the thing you remove) and changelog/archive history.
- [x] 8.2 Sweep `grep -rn "it'll offer the pack\|take the pack later" wiki/ .claude/` — every hit names the working route.
- [x] 8.3 Sweep the workflow-scope fact: the full explanation appears only in `required-tools.md`; `wong-setup`, `wong-cloudflare`, and `getting-started.md` carry one line + link each.
- [x] 8.4 Verify every markdown link added or repointed in this change resolves; run `openspec validate setup-sync-consolidation`.
- [x] 8.5 Bump `VERSION` 8.5.0 → 8.6.0 and add the newest-first `CHANGELOG.md` entry: the five drift fixes, provisioning.md deleted with the ownership map, the `/wong-cloudflare` adoption leg + fragments ownership, setup/sync single owners, journey lines.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 5156 -->
# cloudflare-provisioning — delta

## ADDED Requirements

### Requirement: Where the skill is present, it is the whole door to the pack

When `/wong-cloudflare` runs in a repo whose manifest lacks `components.stackPack: true` (or whose pack files never landed), it SHALL NOT stop and point elsewhere. It SHALL make the pack's outcome-phrased offer itself; on a yes it SHALL set `components.stackPack: true` in `.claude/.wong-stack.json`, land the pack's drop-in files by following the `wong-sync` skill's clone-refresh and copy-if-absent steps (the adapt step SHALL NOT run as part of this), apply the id-free config fragments, and continue into provisioning. On a no it SHALL stop having changed nothing.

The skill SHALL own all config-fragment application: the id-free fragments (`package.json` scripts, `.env.example` variables, `.gitignore` entries) at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. A missing wrangler config SHALL be created from the fragment, not treated as a reason to stop.

When no Cloudflare token is available yet, the skill SHALL stop cleanly after the adoption work with the files and fragments in place, stating that a re-run with a token completes provisioning.

#### Scenario: Late adoption through the skill

- **WHEN** `/wong-cloudflare` runs in a repo that has the skill but not `components.stackPack: true`
- **THEN** it offers the pack, and on a yes sets the flag, lands the missing drop-in files, applies the id-free fragments, and proceeds toward provisioning
- **AND** on a no it stops with the repo unchanged

#### Scenario: Adoption without a token yet

- **WHEN** the user says yes to the pack but has no Cloudflare account or token
- **THEN** the run completes the adoption work and stops cleanly, telling the user a later re-run provisions
- **AND** nothing is half-provisioned

#### Scenario: No pointer at a refusing path

- **WHEN** any payload prose directs a repo without the pack toward adopting it
- **THEN** it names a route that works — `/wong-cloudflare` where the skill exists, or setting `components.stackPack: true` and running `/wong-sync` where it does not
- **AND** no prose claims `/wong-sync` offers the pack

## MODIFIED Requirements

### Requirement: Provisioning creates the two databases and the binding

For a repo taking the stack pack, the skill SHALL create the production and staging D1 databases and write the binding on the staging-Worker model: the production id into the top-level `d1_databases` entry's `database_id`, and the staging id into the `env.staging` block's own `d1_databases` entry, merging the `wrangler.jsonc` fragment (from `stack-pack-fragments.md`) with real ids when the block is absent. There is no `preview_database_id` and no swap step. It SHALL compute the production URL and report the preview URL **pattern** in its staging-Worker form (`<branch>-<worker>-staging.<subdomain>.workers.dev`), while per-commit URLs remain harvested from wrangler output per the stack-pack capability, never constructed. It SHALL be idempotent: a resource that already exists is reused and reported, never duplicated.

The Cloudflare token SHALL live only in the repo's git-ignored `.env` and in the GitHub repository secrets the CI wiring sets — never in a committed file.

#### Scenario: A second run does not duplicate resources

- **WHEN** the skill runs again in a repo it already provisioned
- **THEN** it detects the existing databases and reuses them
- **AND** it reports each as already present rather than creating a second copy

#### Scenario: The binding follows the staging-Worker model

- **WHEN** the skill writes the database ids
- **THEN** production's id lands in the top-level binding and staging's id inside `env.staging`, each entry carrying its own `database_name` and `migrations_dir`
- **AND** `preview_database_id` is not written anywhere

#### Scenario: The credential reaches only its two stores

- **WHEN** provisioning completes
- **THEN** the token exists in the git-ignored `.env` and as a GitHub repository secret
- **AND** no credential value is written into a committed file

## REMOVED Requirements

### Requirement: A runbook documents the provisioning path for any agent

**Reason**: The page this required (`wiki/stack/provisioning.md`) duplicated the skill step-for-step, and its stated audience — an agent holding the pack but not the skill — cannot exist: the skill and the docs are gated together in the payload manifest and install together. The duplicate is where the v8.0/v8.1 model drift accumulated.

**Migration**: The skill is the runbook. The facts the page carried live with their owners — the token screen in `wiki/stack/cloudflare-credentials.md`, the widen protocol in the skill's `references/permission-groups.md`, the deploy model in `wiki/stack/d1-pipeline.md`, failures in `references/failure-map.md`, the human narrative in `wiki/stack/getting-started.md`. Steps not verified against a live account (Zero Trust org creation) remain labelled unverified where they are now stated (the skill's Access step and `cloudflare-access.md`).

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 4588 -->
# install-onboarding — delta

## MODIFIED Requirements

### Requirement: wong-setup offers the stack pack as an opt-in

`wong-setup` SHALL offer the Cloudflare stack pack once during setup, as a single plain-language prompt, framed as optional with decline as the safe default. On acceptance it SHALL record `components.stackPack: true` in the seed manifest so `/wong-sync`'s pull installs the pack's files alongside the rest of the payload; on decline it SHALL leave `components.stackPack` false/absent and install no pack file. The offer SHALL NOT be a gate — declining never blocks or complicates the rest of setup.

The offer SHALL be phrased as an **outcome the user recognizes**, not an inventory of what ships. It SHALL NOT lead with product or component names (`D1`, `Workers`, "pipeline scripts", "seed template") — the audience is someone who does not know what those are, decline is the documented safe default, and a jargon-first offer therefore converts the target user into a decline by confusion. It SHALL name the practical cost honestly (a free Cloudflare account, a few minutes) and the practical result (a live address other people can open). Technical detail SHALL remain available for a user who asks, as a follow-up rather than as the prompt.

`wong-setup` SHALL NOT apply the pack's config fragments. On acceptance it SHALL name `/wong-cloudflare` as the follow-on step that configures and provisions, runnable whenever the user has a Cloudflare account. On decline it SHALL name the late-adoption route that actually works (per the stack-pack capability) rather than implying `/wong-sync` will offer the pack.

#### Scenario: User accepts the pack

- **WHEN** the user accepts the stack-pack offer during `wong-setup`
- **THEN** the seed manifest records `components.stackPack: true`
- **AND** the `/wong-sync` pull installs the pack's files with the rest of the payload
- **AND** setup applies no config fragment, telling the user `/wong-cloudflare` configures and provisions whenever they have a Cloudflare account

#### Scenario: User declines the pack

- **WHEN** the user declines the offer
- **THEN** setup proceeds normally, `components.stackPack` stays false/absent, and no pack file is installed
- **AND** any mention of taking the pack later names the working route

#### Scenario: The offer is not a toll gate

- **WHEN** the user declines or ignores the pack offer
- **THEN** the rest of setup completes exactly as it would for a repo that was never offered the pack

#### Scenario: A non-technical user meets the offer

- **WHEN** the offer is shown to someone who does not know what a database or a Worker is
- **THEN** the prompt describes the outcome in words they already understand and states what it will cost them
- **AND** it does not require them to recognize any product, component, or file name in order to answer

### Requirement: Agent-agnostic runbook

The `wong-setup` runbook SHALL be executable by any coding agent that can run shell commands and edit files — not only Claude. Claude-specific affordances (AskUserQuestion, subagents, the Skill tool) SHALL be phrased as "if available" with plain fallbacks. The runbook SHALL state outcomes to reach rather than command sequences, keeping verbatim only the shared clone cache path (a marked copy of the value `wong-sync` owns) and the few commands handed to the user to run themselves. The seed-manifest schema SHALL NOT be restated in `wong-setup`: the manifest schema has one owner in the `wong-sync` skill, and setup SHALL reference it, writing the same shape with `version` and `commit` null. Setup SHALL ask which agent(s) drive the repo, pass them to `openspec init --tools`, and — when the answer is not (only) Claude — note where the skills live and offer an AGENTS.md pointer to them.

#### Scenario: Executed by a non-Claude agent

- **WHEN** a Codex-style agent reads the paste-prompt URL and follows the runbook
- **THEN** every step is achievable with shell + file edits and plain-text questions; nothing requires a Claude-only tool

#### Scenario: Non-Claude repo tooling

- **WHEN** the user says their repo is driven by an agent other than Claude
- **THEN** setup passes that tool to `openspec init --tools` and offers an AGENTS.md pointer to `.claude/skills/`

#### Scenario: The seed manifest matches wong-sync's schema by construction

- **WHEN** `wong-setup` writes the seed manifest
- **THEN** it follows the schema stated in the `wong-sync` skill, with `version` and `commit` null
- **AND** no second copy of the schema exists in the payload to drift

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 4287 -->
# stack-pack — delta

## ADDED Requirements

### Requirement: The pack is adoptable after setup

Declining the pack at setup SHALL NOT be terminal. The supported late-adoption route SHALL be: set `components.stackPack: true` in `.claude/.wong-stack.json`, run `/wong-sync` to land the pack's drop-in files (the provisioning skill among them), then run `/wong-cloudflare` to configure and provision. Every payload pointer to late adoption SHALL name this route (or `/wong-cloudflare` directly, where the skill is already present) and SHALL NOT direct users at a path that refuses — in particular, no prose SHALL claim `/wong-sync` offers the pack to a repo that has not opted in.

#### Scenario: A declined repo adopts later

- **WHEN** a repo that said no at setup decides it wants the app hosted
- **THEN** setting the flag and running `/wong-sync` lands the pack files, and `/wong-cloudflare` completes configuration and provisioning
- **AND** no step of that route stops and points back at another step of it

#### Scenario: Pointers are truthful

- **WHEN** a reader follows any payload reference to adopting the pack later
- **THEN** the route it names works as described

## MODIFIED Requirements

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` entry covering the local secrets files — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale. **`/wong-cloudflare` SHALL be the applier**: the id-free fragments at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. `wong-setup` SHALL NOT apply fragments; when upstream changes a fragment in a repo that already applied it, the change SHALL be surfaced through the sync's capability analysis rather than re-merged automatically.

The `.env.example` fragment's token variable SHALL be `CLOUDFLARE_API_TOKEN`, matching the skill, the docs, and the pack scripts. The pack's Workers Builds **deploy command** (`bash scripts/cf-deploy.sh`, set by a human in the dashboard) SHALL be documented as belonging **only to the Workers Builds fallback**: a repo on the pack's GitHub Actions workflow has no dashboard step, and the pack SHALL NOT describe the setting as required in general.

The `package.json` fragment SHALL include the secrets push and check scripts alongside the existing build and database scripts. The `.gitignore` fragment SHALL ignore `.dev.vars` **and its per-environment variants**, so that adding a file such as `.dev.vars.staging` cannot commit real secret values, while explicitly re-including `.dev.vars.example` — a committed, values-blank file that a wildcard would otherwise swallow.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build`, `db:*`, and `secrets:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

#### Scenario: Fragments are applied by the provisioning skill

- **WHEN** a repo adopts the pack — at setup or later
- **THEN** the config fragments are applied by `/wong-cloudflare`, the id-free ones up front and the wrangler block with real ids at the binding step
- **AND** `wong-setup` applies none of them

#### Scenario: The deploy command is fallback-only documentation

- **WHEN** a repo runs the pack's GitHub Actions workflow
- **THEN** no dashboard deploy-command step is presented as required
- **AND** the setting is documented only for a repo that chose Cloudflare Workers Builds instead

#### Scenario: A per-environment secrets file cannot be committed

- **WHEN** a repo creates `.dev.vars.staging` to give staging a divergent secret value
- **THEN** the pack's `.gitignore` entry already covers it
- **AND** no step is required to prevent the file being committed
- **AND** `.dev.vars.example` remains committable despite the wildcard

<!-- end specs/stack-pack/spec.md -->
<!-- file specs/wong-sync/spec.md utf8 2757 -->
# wong-sync — delta

## MODIFIED Requirements

### Requirement: Manifest schema, lazily migrated

`.claude/.wong-stack.json` SHALL carry `version`, `commit`, `upstream { repo, fork, clone }`, and `components`. It SHALL record **install state only** — what is installed here, from where, and as of when. It SHALL NOT carry verdicts, reasons, or judgment commits; those live solely in `.claude/wong-sync-verdicts.md`, specified by the `wong-sync-adapt` capability.

The schema SHALL be stated in exactly one payload place — the `wong-sync` skill, its writer of record. `wong-setup` SHALL reference that statement for the seed manifest rather than carry its own copy, so the `components.skills` list and every other field exist once.

`commit` SHALL record the clone HEAD the repo last synced against — it is not a diff base, since nothing diffs — and SHALL drive the changelog walk.

Old manifests remain valid: missing keys are filled in during the first sync and the manifest is rewritten last, reflecting what actually happened. A manifest carrying a `capabilities` map from an earlier version SHALL have it folded into the verdict record and then dropped, per the `wong-sync-adapt` capability. `upstream.fork` SHALL remain readable where an earlier version recorded one, and SHALL NOT be written.

#### Scenario: First sync on an older manifest

- **WHEN** the manifest predates the schema (no `commit`, no `upstream`)
- **THEN** the sync completes and writes `commit`, `upstream.repo`, and `upstream.clone`

#### Scenario: Seed manifest

- **WHEN** the manifest's `version` and `commit` are null because `wong-setup` just handed off
- **THEN** the sync proceeds by the general rule (every manifest file is absent, so every one is copied) and fills in the real `version` and `commit` last

#### Scenario: Manifest carrying a stale fork URL

- **WHEN** a manifest recorded `upstream.fork` under a previous version
- **THEN** the value is preserved as-is and never used or updated

#### Scenario: Manifest carrying a capability ledger

- **WHEN** the sync runs on a manifest that still carries a `capabilities` map
- **THEN** the rewritten manifest omits that key, and the entries survive in `.claude/wong-sync-verdicts.md`

#### Scenario: The manifest is read for install state

- **WHEN** a reader or a later run opens `.claude/.wong-stack.json`
- **THEN** it answers what is installed, from where, and as of when
- **AND** it answers nothing about what was judged, which the verdict record owns

#### Scenario: One schema statement in the payload

- **WHEN** the schema gains or changes a field
- **THEN** the edit happens in the `wong-sync` skill alone
- **AND** `wong-setup` needs no matching edit, because it references rather than restates

<!-- end specs/wong-sync/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-02

~~~
<!-- end .openspec.yaml -->
