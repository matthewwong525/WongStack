## Context

WongStack's premise is that the repo is the shared memory for humans and agents. Three knowledge surfaces exist today: `openspec/changes/` (what we're changing), `openspec/changes/archive/` + `openspec/specs/` (what shipped), and `wiki/` (how we do things). `/dream` is the only write path into `wiki/`, and its Phase 1 capture reads **the current conversation** — a machine-local source. Its unbuilt sweep mode would have read `~/.claude/projects/*/` JSONL transcripts, also machine-local.

The consequence is a broken handoff exactly where WongStack claims strength: a cold reader on a second machine can resume the *work* (via the change) but cannot consolidate the *understanding*, because the conversation never entered the repo. `/save` — the skill that owns all git and is the only one holding the conversation — pushes everything except the conversation.

A second, related defect: `/save` has exactly one destination. Step 2 synthesizes a plan; Steps 3–5 always create a branch, an OpenSpec change, and a PR. Its only escape hatch is "if the session is empty, skip the change." A session that produced genuine understanding but no diff is not empty, so it gets a proposal describing nothing changing and a `tasks.md` with zero tasks.

## Goals / Non-Goals

**Goals:**
- Move conversation capture into the repo, so consolidation is machine-independent and deferrable.
- Split **capture** (has the conversation; must run on the machine that had it) from **consolidation** (needs only the repo; can run anywhere, later, by anyone).
- Give conversation-only sessions a correct destination instead of a fake OpenSpec change.
- Keep the surfaces' boundaries sharp enough that there are not three places to look for the same fact.

**Non-Goals:**
- Changing `/save`'s git mechanics (branch, commit, push, PR body, CI wait) — untouched.
- Changing `/plan`, `/apply`, or `/ship`.
- Making `/dream` run automatically, or giving it git. It stays deliberate-only and write-to-working-tree.
- Verbatim transcript archival. The note is a compression, not a log.

## Decisions

### 1. A new top-level `notes/` surface, not the OpenSpec change

**Chosen:** `notes/<slug>.md` at the repo root, a new payload directory.

**Alternative considered — put notes in `openspec/changes/<name>/notes.md`.** Genuinely attractive: the change folder already has the exact mechanic (a dated, append-only log, keyed per-slug, rehydrated by `/continue`, mirrored into the PR body), and a parallel surface with a parallel log is real duplication. Rejected for three reasons:

1. **`/ship` archives the change.** `/opsx:archive` moves the folder under `openspec/changes/archive/`, which CLAUDE.md defines as *the record of what shipped*. `/dream`'s input set would migrate there on every ship, and `/dream` would have to write into it (flipping the `consolidated:` watermark) — mutating an immutable record. Notes would also split across two locations depending on whether their work shipped. The knowledge is meant to **outlive** the work, so it must not live in the work's folder.
2. **Conversation-only sessions have no change.** Routing notes through OpenSpec means inventing a change to hold them — the exact defect this change removes.
3. **Audience.** `proposal.md` must stay self-contained and about the work; a cold reader opens it to *act*. Folding in domain context and side-discussion dilutes the handoff surface `/continue` and the PR body depend on. Notes-only changes would also surface in `openspec list` as `no-tasks` entries competing with real active work.

**Alternative considered — `wiki/.inbox/`.** Adjacent to the destination and `/dream` already resolves the wiki root, but raw unconsolidated notes inside the trusted-docs tree cut against `wiki-style.md`.

The elegance comes from the **shared slug**, not a shared file: `notes/<slug>.md` sits parallel to `openspec/changes/<slug>/`, so finding one from the other is trivial and neither moves when the other's lifecycle advances.

### 2. Boundary between the three surfaces

```
openspec/changes/<slug>/proposal.md   why THIS CHANGE is shaped this way   change-scoped; ships, then archives
notes/<slug>.md                       everything else the session produced  session-scoped; permanent, mutable
wiki/                                 what survived consolidation           canonical, curated
```

Anti-duplication is explicit: if a fact is about why the change is shaped that way, it belongs in the Decision log and the note does not repeat it. A conversation-only session writes only the note. A code session writes both.

### 3. One note per line of work, updated in place

Keyed by the same slug as the branch and change — extending WongStack's existing `branch name = change name` tie. **No date in the filename**, since a note spanning three days should not be stamped with the first; dates live in frontmatter and in entries. Second and later saves revise what is now better understood and append what is new — the same discipline `proposal.md` uses (current understanding updates in place, history appends).

Rejected: a file per save (`notes/YYYY-MM-DD-<slug>.md`). Predictable, but a `/save` run three times an hour produces three near-empty files, and a reader must stitch them.

### 4. `/save` writes a note only when there is something to write

Not every save. The gate: write or update the note when the session produced context **beyond the diff and the Decision log**. Otherwise skip it and say so in the report. This keeps `notes/` from filling with restatements of the commit.

### 5. Compression bar: concise, without losing context

The target is that a cold reader on another machine reaches the same understanding without the transcript. That makes it a **compression, not a summary** — summaries drop the "why," and the why is the payload.

Keep: what the user stated (facts, constraints, preferences, corrections); decisions and their rationale, including what was ruled out and why; specifics (names, paths, numbers, versions, error strings); open threads. Drop: tool-call mechanics and file dumps; the assistant's reasoning-out-loud; the back-and-forth shape of arriving somewhere (keep the destination and the why); anything already true in the repo.

Deliberately **not** applying `/dream`'s Phase-1 "durable facts only" filter at save time. Pre-filtering would make that judgment once, on machine A, unrecoverably. `/save` compresses; `/dream` selects. Separating them keeps the selection repeatable.

### 6. Watermark in per-note frontmatter, not a central ledger

Because notes are kept forever, `/dream` needs to know which it has consumed or it re-litigates history every run.

**Chosen:** each note carries its own state in frontmatter (`consolidated:` date, absent/`new` until then), flipped in place by `/dream`. Self-contained, readable by opening the file, and conflict-free.

**Rejected:** a central `notes/.consolidated` ledger. A single line-appended file touched by every machine merge-conflicts precisely in the multi-machine scenario this design exists to serve. Same reasoning that puts the Decision log inside `proposal.md` rather than in a central changelog.

### 7. `/dream` Phase 2 stands alone

Gardening (merge, prune, split, repair links, reality-check against code) runs whether or not there are unconsolidated notes. "No new notes" is a normal outcome, not a no-op run.

### 8. A notes-only save pushes straight to the default branch

**Chosen:** when the diff is confined to `notes/*.md`, `/save` commits and pushes to the default branch — no branch, no PR, no CI wait, no `/ship`. Path-scoped exactly: one file outside `notes/` and the normal flow applies to the whole save.

The gate exists to stop unreviewed **behavior** reaching `main`. A note is one additive file, keyed by a unique slug so two people's notes never touch the same path (structurally conflict-free), containing no code, config, or spec — and **raw and non-canonical by design**. There is nothing to approve. The review that matters happens one step later, when `/dream` proposes wiki edits: that is where a human decides "this is now how we say things work," and those edits keep the full branch + PR gate. Reviewing a note is reviewing a lab notebook before the paper is written.

**Rejected — a cron that merges notes PRs.** An unattended write to `main` that must classify PRs correctly every time; misclassifying once and merging unreviewed code is far worse than the friction it removes. It also puts live infrastructure into a toolkit whose premise is that the payload is prose you clone.

**Rejected — `/dream` merges the PRs.** Breaks the no-git rule that makes `/dream` safe to run anywhere, repeatedly, on a dirty tree. It would also invert the dependency: `/dream` would have to merge notes to `main` before it could read them, on behalf of work it did not do.

**Rejected — `/save` auto-ships a notes-only branch** (branch → PR → merge, inside one command). Same one-command experience, but it is auto-merging an unreviewed PR with extra steps, buying an audit trail git history already provides.

**Accepted cost:** this is a real, narrow carve-out to two absolutes — `/save`'s "never push to the default branch" hard rule, and the `delivery-gate` spec's "the gate is CI-when-present, else PR review." Both are amended explicitly rather than quietly reinterpreted, and both keep the exception scoped by path. `/save` still never merges a PR.

### 9. Sweep mode is deleted, not implemented

Its whole job — reach sessions this repo never dreamed on — is now structural: the backlog is committed notes, so a plain `/dream` on a fresh clone already sees every machine's unconsolidated sessions. Keeping a designed-not-implemented section that enumerates transcript folders would contradict the new "reads only the repo" rule.

## Risks / Trade-offs

- **Two files to read for full context on a code session** → `/continue` reads the parallel note alongside the proposal, so the resumer gets both without knowing to look.
- **`/save` auto-invoking capture brushes `/dream`'s "nothing runs it automatically" rule** → it does not: `/save` writes `notes/`, it never invokes `/dream` and never writes `wiki/`. The two-phase `/dream` cycle stays deliberate-only. The rule is restated so this is unambiguous.
- **Notes could drift into a dumping ground** → the compression bar and the anti-duplication boundary are written into `notes/README.md`, which ships with the directory, so target repos inherit the convention rather than the empty folder.
- **Kept-forever notes accumulate** → accepted deliberately; they are the referenceable record. `consolidated:` frontmatter makes the unconsolidated set cheap to find regardless of total count.
- **The notes-only carve-out gets stretched** — someone reads "notes bypass the gate" and applies it to a save that also touches a skill → the routing is decided by exact path scope, and the spec pins both directions with scenarios: a single non-note path restores the full flow.
- **Direct push to a protected default branch fails** — many repos protect `main`. `/save` must surface the rejection plainly and fall back to the normal branch + PR flow rather than retrying or forcing.
- **Existing repos have no `notes/`** → `/wong-sync` copies it in as a manifest file like any other; absent-then-copied is the normal install path, and a repo that already has a `notes/` directory keeps it untouched (the manifest never overwrites).

## Open Questions

None outstanding — the four lifecycle decisions (location, retention, compression bar, gardening-without-notes) and the `/continue` fold-in were settled during exploration.
