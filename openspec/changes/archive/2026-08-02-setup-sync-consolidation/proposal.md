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
