# save-conversation-support

**Status:** in-progress
**Open questions:** none

## Why

`/dream` can only consolidate what is in the **current conversation** — Phase 1 says "replay the conversation," and the designed-but-unbuilt sweep mode read `~/.claude/projects/*/` transcripts. Both are machine-local. So a long session on machine A dies there: `/save` pushes code and the change, but the conversation itself never enters the repo, and running `/dream` on machine B finds nothing to consolidate. The repo is supposed to be the shared memory, yet the raw material for the wiki is the one thing that never reaches it.

The same gap has a second face: a session that produces **no diff at all** — pure conversation that established real understanding. Today `/save` has one destination, an OpenSpec change, so it synthesizes a "plan" from a conversation that is not a plan, opens a branch and a PR proposing nothing, and files a `tasks.md` with zero tasks. The knowledge is real; the drawer is wrong.

## What Changes

- **New `notes/` surface** — `notes/<slug>.md`, one note per line of work, keyed by the **same slug as the branch and the change** so `notes/add-po-search.md` sits parallel to `openspec/changes/add-po-search/`. Permanent: notes are never deleted after consolidation, because they stay referenceable. Frontmatter carries the consolidation watermark (`consolidated:`), per-note rather than in a central ledger — a shared ledger would merge-conflict in exactly the multi-machine case this design exists to serve.
- **`/save` becomes the capture point.** It is the only skill that reads the conversation, and it writes a **concise-but-lossless** compression of the session into `notes/<slug>.md`: what the user stated, decisions and their rationale, what was ruled out and why, specifics (paths, names, versions, errors), open threads — dropping tool-call mechanics, file dumps, and the back-and-forth shape of getting somewhere. Subsequent saves **update the same note in place**, not append a new file per save.
- **`/save` stops forcing every session into a change.** A session with no code and no plan writes a note and skips the OpenSpec change entirely — no invented proposal, no empty `tasks.md`.
- **`/dream` reads only the repo.** Phase 1 capture no longer replays the conversation or touches transcripts; it reads unconsolidated `notes/*.md`, consolidates their facts into `wiki/`, and flips each consumed note's frontmatter. Phase 2 gardening still runs **with or without** new notes.
- **Sweep mode is deleted** from `/dream` — the designed-not-implemented section is obsolete by construction, since the backlog now lives in the repo instead of scattered across machines' transcript folders.
- **`/continue` reads the note alongside the proposal**, so a cold resume inherits the session context that the change deliberately does not hold.
- **`notes/` enters the payload manifest** (directory + a README explaining the convention) so `/wong-sync` installs it into target repos.
- **A notes-only save commits directly to the default branch** — no branch, no PR, no CI wait, no `/ship`. Scoped exactly by path: one changed file outside `notes/*.md` restores the normal flow. The gate isn't weakened, it moves to where judgment is exercised — a note is raw and non-canonical, so there's nothing to approve; `/dream`'s wiki edits, which *are* canonical, keep the full branch + PR gate.

**Non-goals:** no change to `/plan`, `/apply`, or `/ship`; no change to `/save`'s git mechanics for anything but the notes-only case; `/dream` still writes no git and is still deliberate-only; no cron or scheduled merge.

## Capabilities

### New Capabilities
- `session-notes`: the `notes/<slug>.md` surface and its lifecycle — who writes it (`/save`), who reads it (`/dream`, `/continue`), how it is keyed, when it is updated, and the frontmatter watermark that makes consolidation repeatable across machines.

### Modified Capabilities
- `delivery-gate`: the "gate is CI-when-present, else PR review" requirement gains a path-scoped notes-only exception — a save confined to `notes/*.md` commits directly to the default branch.

## Impact

- `.claude/skills/save/SKILL.md` — new note-writing step; the change becomes conditional rather than mandatory.
- `.claude/skills/dream/SKILL.md` — Phase 1 rewritten to read `notes/`; sweep-mode section removed; hard rules updated.
- `.claude/skills/continue/SKILL.md` — recap reads the parallel note.
- `.claude/skills/wong-sync/references/payload-manifest.md` — `notes/` added to the manifest.
- `openspec/specs/delivery-gate/` — the notes-only carve-out; `/save`'s "never push to the default branch" hard rule gains its one scoped exception.
- `notes/README.md` — new; the convention, and the boundary against `proposal.md`'s Decision log and `wiki/`.
- `CLAUDE.md` — the "Where context lives" section gains `notes/` as a knowledge surface.
- `VERSION` + `CHANGELOG.md` — payload edit, so a semver bump and a newest-first entry.

## Decision log

- **2026-07-28** — Settled how a notes-only save reaches `main`. Chose **direct push to the default branch**, path-scoped to `notes/*.md`. Ruled out: a **cron that merges notes PRs** (unattended writes to `main`; misclassifying once and merging unreviewed code is worse than the friction removed, and it puts live infrastructure into a prose toolkit); **`/dream` merging PRs** (breaks the no-git rule that makes `/dream` safe to run anywhere on a dirty tree, and inverts the dependency — it would have to merge notes before it could read them); and **`/save` auto-shipping a notes-only branch** (same act as direct-push with more steps, buying a paper trail git history already provides). The reasoning that unlocked it: the PR gate exists to stop unreviewed *behavior* reaching `main`, and a note is one additive, slug-unique, structurally conflict-free file that is raw and non-canonical by design — the judgment happens one step later when `/dream` proposes wiki edits, and *those* keep the full gate. Accepted cost: an explicit, narrow carve-out to `/save`'s "never push to the default branch" hard rule and to the `delivery-gate` spec.
- **2026-07-28** — Explored in this session. Chose a **separate `notes/` surface over folding notes into the OpenSpec change**, despite the change folder already having the right mechanic (a dated, append-only log, per-slug, mirrored to the PR body). Three things ruled it out: `/ship` archives the change, so `/dream`'s input set would move under `openspec/changes/archive/` and `/dream` would have to mutate the immutable record of what shipped; conversation-only sessions have no change, so notes would require inventing one — the exact defect being removed; and `proposal.md` must stay self-contained about *the work*, so folding in domain context dilutes the handoff surface `/continue` and the PR body depend on. The elegance comes from the **shared slug**, not a shared file. Also decided: keep notes forever (referenceable) rather than delete-on-consolidate; watermark in per-note frontmatter rather than a central `notes/.consolidated` ledger (merge conflicts); `/save` compresses but does **not** pre-apply `/dream`'s durable-facts filter, so the selection judgment stays repeatable rather than being made once on machine A; `/dream` Phase 2 gardens regardless of new notes.
