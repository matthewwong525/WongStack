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
