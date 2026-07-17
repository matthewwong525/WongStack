## Context

`install-wong-stack` is a mature, guided, question-driven skill that copies the WongStack payload into a target repo and, on re-run, diffs + re-merges without clobbering. Its Step 3F/3U already enumerate the exact payload set and how each part is copied or merged: skills under `.claude/skills/*/` **except the installer** (SKILL.md line 81 "Never install the installer into a target repo"), the `CLAUDE.md` `WONG-STACK:BEGIN/END` block, `docs/` style pages (`wiki-style.md`, `voice.md`), the `.claude/hooks/auto-push.sh` script plus a merged `settings.json` Stop entry, and the OpenSpec layer (regenerated via `openspec init`, not copied). The manifest is tracked as `.claude/.wong-stack.json`.

`contribute-wong-stack` is the inverse of that copy — the same manifest, walked in reverse. It reuses the installer's structure and vocabulary so the two read as a matched pair.

## Goals / Non-Goals

**Goals:**
- Give a one-command way to push downstream WongStack payload improvements back up into a WongStack clone, per-file and confirmed.
- Guarantee app/business-specific files can never leak upstream (manifest-scoped by construction).
- End in the WongStack skills' idiom: dirty clone + release ritual, ready for `/save`.

**Non-Goals:**
- Downstream sync (install already owns it).
- Git subtree/remote/cherry-pick tooling.
- Auto-merging without per-file confirmation.
- Reconciling non-manifest files or app source.

## Decisions

- **Reuse the installer's manifest, don't redefine it.** The skill derives its file set from the same enumeration `install-wong-stack` uses (ideally by referencing that section), so the two can't drift apart. *Alternative considered:* a standalone manifest file (e.g. reading `.claude/.wong-stack.json`) — rejected because two sources of truth for "what is the payload" is exactly the drift we're fixing.

- **`$WS` resolution mirrors the installer's Step 0.** Resolve the WongStack clone the same way install does (symlink target / `$HOME/src/WongStack` clone / explicit path arg), and reuse its self-guard: if `$WS` == current repo, stop. *Alternative:* require an explicit path every time — rejected as unfriendly and inconsistent with install.

- **Per-file three-way choice: keep / take / skip.** Same ergonomics as the installer's update path (Step 3U "keep / take new / merge"), inverted. We deliberately omit a "merge" option in v1 to keep the upstream flow unambiguous; a user who wants a hand-merge can take-from-repo then edit in `$WS` before `/save`. *Alternative:* offer merge — deferred to keep v1 tight.

- **Meta-skills are source-only and symlinked.** `contribute-wong-stack` is excluded from the copied payload exactly like the installer, and `install-wong-stack` is updated to skip **both** meta-skills when copying and to offer symlinking the contributor alongside itself. *Alternative:* copy the contributor into every target's committed `.claude/skills/` — rejected: it's meta-tooling, not workflow payload, and committing it into targets bloats their tree and creates yet another copy to keep in sync.

- **CLAUDE.md is block-scoped.** Only the `WONG-STACK:BEGIN/END` region is compared/copied, never the app-specific "What this is". This matches how the installer merges the block downstream.

- **Release ritual only fires on a real change.** Zero approvals → no `VERSION`/`CHANGELOG` edit, so an inspection-only run leaves `$WS` pristine.

## Risks / Trade-offs

- **A user takes a change that was actually app-specific customization of a shared skill upstream.** → The per-file diff + confirmation is the guard; the skill frames each prompt as "does this belong in *every* WongStack repo?" so genuinely generic improvements go up and local tweaks are skipped.
- **`$WS` has its own uncommitted work when the skill runs.** → The skill checks `$WS` is clean before applying (or warns) so the release ritual and later `/save` operate on a well-defined tree.
- **VERSION conflict if two contributions race.** → Out of scope; `/save`/PR review in `$WS` resolves version collisions the normal way.
- **Manifest drift between installer and contributor if they diverge.** → Mitigated by deriving the set from the installer's enumeration rather than duplicating it; a task calls this out explicitly.

## Migration Plan

Additive: a new SKILL.md plus small edits to `install-wong-stack`, `CLAUDE.md`, and `README.md`. No target repo is affected until a user runs the new skill. Rollback = delete the skill dir and revert the installer edits.

## Open Questions

- Should the skill support pushing to a WongStack clone via a path arg on invocation (`/contribute-wong-stack ~/src/WongStack`) in addition to auto-resolution? (Leaning yes — cheap, matches install's flexibility.)
