# wong-sync

## Why

Keeping a target repo current with WongStack today takes two manual trips with different skills (`/install-wong-stack` update mode down, `/contribute-wong-stack` up), each doing blind two-way diffs that over-ask, and the contribution leg dead-ends with a dirty clone the user must `cd` into and `/save` by hand. One skill should own the whole round trip: pull upstream changes down, surface genuinely-local improvements as contribution candidates, and open the upstream PR itself.

## What Changes

- **New payload skill `wong-sync`** (`/wong-sync`) — installed into every target repo — that runs the round trip in one pass: refresh the WongStack clone → pull upstream → target (per-file, ask) → curate remaining local drift as contribution candidates → branch/commit/push/PR in the clone, fork-aware.
- **Three-way diff** replaces the two-way diffs: the manifest records the WongStack commit the repo last synced to; each payload file is classified against that base (pull down / contribution candidate / true conflict / in sync), so only real decisions get asked. No recorded base → fall back to two-way once, then record it.
- **Manifest schema extended** — `.claude/.wong-stack.json` gains `commit` (three-way base) and `upstream { repo, fork, clone }` (upstream URL, the user's fork once created, and the clone-path hint). Clone lives at `${XDG_CACHE_HOME:-~/.cache}/wong-stack/WongStack`, re-cloned silently if missing.
- **Fork-aware PR** — push access to upstream → branch + PR directly; no access → `gh repo fork`, push to the fork, PR against upstream, fork recorded in the manifest for next time.
- **Curation bar for contributions** — each candidate gets a one-line generality rationale ("belongs in every WongStack repo?"); app-specific or marginal drift defaults to skip; approved rationales become the PR body.
- **Git rule rescoped**: wong-sync runs NO git in the target (pulled updates land in the working tree for `/save`) but owns FULL git in the clone (branch, commit, push, PR); the clone is never left dirty.
- **BREAKING: `/contribute-wong-stack` retired** — superseded by `/wong-sync`; its spec requirements are removed/absorbed.
- **BREAKING: `/install-wong-stack` shrinks to fresh-install only** — an existing manifest means "already installed: run `/wong-sync`". The payload manifest (the file list that syncs) lives in one place, inside the wong-sync skill.
- Release ritual (VERSION bump + CHANGELOG entry) moves inside the sync's clone-side commit; this change itself is also a payload edit, so it bumps VERSION + CHANGELOG here.

## Capabilities

### New Capabilities
- `wong-sync`: the round-trip sync skill — clone management, three-way diff classification, pull-then-contribute ordering, curation bar, fork-aware upstream PR, manifest schema, target/clone git split, and the installer's deferral of updates to it.

### Modified Capabilities
- `contribute-wong-stack`: retired — its upstream-only diff/confirm/release requirements are superseded by `wong-sync` (upstream leg absorbed; "does not run git" and "left dirty for /save" requirements removed).

## Impact

- **Added:** `.claude/skills/wong-sync/` (payload skill, copied into targets).
- **Modified:** `.claude/skills/install-wong-stack/SKILL.md` (fresh-only; Step 3U removed; manifest schema + payload list references), `CLAUDE.md` WONG-STACK block (skill roster + rescoped git rule), `README.md` (round-trip story), `VERSION` + `CHANGELOG.md` (release).
- **Removed:** `.claude/skills/contribute-wong-stack/` (retired with a CHANGELOG note).
- **Target repos:** on next sync/update, manifests migrate to the extended schema; pre-existing installs get one two-way sync before three-way kicks in.
