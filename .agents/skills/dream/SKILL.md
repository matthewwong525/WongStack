---
name: dream
description: Consolidate captured sessions into the wiki the way sleep consolidates memory — read the unconsolidated notes/*.md that /save committed (never the conversation, scrollback, or transcripts, so this runs on any machine), capture the durable facts the user stated (conventions, preferences, decisions-with-rationale, domain knowledge), mark each note consolidated, then garden the whole wiki: merge duplicates, resolve contradictions newest-wins, prune stale content, split overgrown pages, repair links, tighten prose, and reality-check every cited path/command/flag against the code (fix mechanical drift, flag semantic conflicts). Gardening runs whether or not there are new notes. Use when the user wants to dream, synthesize, consolidate notes into the wiki, clean up / garden the wiki, or check the wiki is consistent with the code. The single wiki write path (replaces the retired /document). Deliberate only — nothing auto-runs it; edits stay in the working tree (checkpoint with /save).
user-invocable: true
---

# /dream

The wiki improves the way memory does overnight: the day's experience — already **captured** by `/save` into `notes/`, and committed — is **consolidated**, new facts merged into what's already known, contradictions resolved, noise pruned. One deliberate cycle, invoked at a natural stopping point. A wiki that only accretes pages rots; the second phase is what keeps it atomic and trustworthy.

Capture and consolidation are split **across the repo boundary** on purpose. `/save` holds the conversation and writes it down; `/dream` reads only what's committed. So a session captured on a laptop is consolidatable from a desktop, a week later, by someone who wasn't there.

**Before anything:** resolve the wiki root — `wiki/`, falling back to `docs/` in repos that keep the old name — and read its [`wiki-style.md`](../../../wiki/wiki-style.md). That file owns every structural and placement rule; this skill never restates it. The defect checklist for consolidation is `improve`'s [docs audit playbook](../improve/references/docs-audit-playbook.md).

## Phase 1 — capture

**Read the repo, never the conversation.** The session's experience was already captured — `/save` compressed it into `notes/<slug>.md` and committed it. That is what makes this skill portable: capture happens on the machine that had the conversation, consolidation happens anywhere, later, by anyone. Never read scrollback, the current conversation, or machine-local transcript files; a session that was never `/save`d simply isn't available, and the fix is to `/save` it, not to reconstruct it here.

```bash
git pull                                    # another machine's notes may be newer
grep -L 'consolidated: [0-9]' notes/*.md    # notes with no consolidation date
```

Read the unconsolidated notes — those whose frontmatter carries no `consolidated:` date — and extract facts worth keeping **from what the user said**, never from your own inferences or work products, and never from the assistant turns a note may quote. `notes/README.md` is the convention, not an input.

**In scope** — things that will still be true next month, in a different task:
- cross-cutting conventions ("we always deploy on Fridays")
- preferences and corrections on how work should be done
- decisions with their rationale, when they'll govern future work
- domain facts the repo can't teach ("the staging tenant is shared with QA")

**Out of scope** — leave these where they belong:
- change-specific details — owned by the OpenSpec change and its archive
- anything derivable from code, config, or git history
- one-off instructions for the task at hand
- anything the wiki already documents — extend or link instead

**When uncertain, don't write.** A lean wiki a reader trusts beats a complete one they skim. Zero qualifying facts is a normal, successful outcome.

Place each qualifying fact per the rulebook: extend the owning page first; a new atomic page is the exception, linked up/down/sideways with its parent linking back.

**Then mark each note you consumed** — set `consolidated: YYYY-MM-DD` in its frontmatter. That watermark is what stops the next run re-litigating the whole history, and it lives in each note rather than a central ledger so two machines never conflict over it. **Never delete a note**: the wiki carries only what survived the filter, and the note stays referenceable for what didn't. A note you read and took nothing from is still consolidated — mark it.

## Phase 2 — consolidate

**Phase 2 runs whether or not Phase 1 found anything.** No unconsolidated notes is a normal outcome, not a reason to stop — gardening is worth doing on its own, and a wiki that only ever grows when someone happens to have had a conversation rots between them.

Now garden the whole tree, capture in hand — integrate and prune, never just append:

- **Merge** — the same content on two pages becomes one owner plus a link (one topic, one page).
- **Resolve contradictions, newest wins** — when a captured fact contradicts a page, rewrite to the user's latest statement and delete the superseded text. No "as of July" annotations; git history preserves the old truth.
- **Prune** — remove content that's stale, disproven, or no longer earns its place.
- **Split / collapse** — a page that outgrew one topic becomes a hub with atomic children (inbound links updated); structure that no longer earns its depth folds back flat.
- **Repair links** — fix dead links and anchors, connect orphans, complete hub coverage, add the missing up/down/sideways links.
- **Reality-check against the code** — every file path, command, flag, or name a page cites must exist and behave as written in the repo *today*; a doc a reader trusts into failure is the costliest defect there is. Two truth sources, two rules: **code is ground truth for mechanical facts** — a renamed file or moved script means the doc gets fixed to match the repo; **the user is ground truth for process facts** — a documented process that contradicts what the code actually does, where the intended side is unclear, gets flagged in the report as an open question, never guessed. Never edit code to match the wiki.
- **Tighten** — pass touched pages through [`voice.md`](../../../wiki/voice.md): cut filler, lead with the point.

Work from the playbook's defect lenses; measure every edit against `wiki-style.md`.

## Report

Close with a concise summary: notes consolidated (by name) and facts captured from them (and where they landed), pages merged / pruned / split, links repaired, code drift fixed — and any doc-vs-code conflicts flagged as open questions for the user. Or a one-liner on why nothing qualified: "no unconsolidated notes", "nothing to capture", and "nothing to fix" are all fine results; say so plainly.

## Hard rules

- **Read the repo, never a transcript.** Phase 1's only input is committed `notes/*.md`. Never read the current conversation, scrollback, or `~/.claude/projects/`. This is what makes `/dream` portable — capture already happened, in `/save`, on whatever machine had the conversation. There is no sweep mode and no transcript enumeration; a fresh clone that pulls sees every machine's unconsolidated notes by construction.
- **No git.** Edits stay in the working tree — `/save` commits and pushes, `/ship` merges. That's the division of labour: the git skills own every git action, and this one runs none, which is what makes `/dream` safe to invoke on any tree from any machine. How the edits reach `main` is `/save`'s call, not yours — a run that touches only `wiki/` and `notes/` is inside the prose allowlist and lands on the default branch directly; one that also touches a skill, a spec, or config takes the normal branch + PR flow. Either way, review of *this* work happened here: the user saw the diff you produced.
- **Never delete a note.** Mark it `consolidated:` and leave it. Notes are the referenceable record of what didn't make the wiki, not a queue to drain.
- **Deliberate only.** Nothing invokes `/dream` automatically — not `/save`, not hooks. `/save` writing `notes/` is *not* `/dream` running: `/save` captures into `notes/`, never into `wiki/`, and never calls this skill. (`/ship`'s capture-a-process step may hand a shipped change's reusable process to the capture phase; that's a human-triggered flow.)
- **User-stated facts only.** The assistant's conclusions, however good, wait until the user has adopted them — including assistant reasoning a note happens to quote.
- **One rulebook.** `wiki-style.md` (and `voice.md` for sentences) govern every edit; never fork or restate their rules here.
- **Delete with cause.** Every removal is justified by supersession, duplication, or staleness — and rides a reviewable diff.
- **Wiki edits only.** The reality-check reads the code, never changes it — when code and wiki disagree on intent, the user decides.
