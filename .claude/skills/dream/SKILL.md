---
name: dream
description: Consolidate the session into the wiki the way sleep consolidates memory — capture durable facts the user stated (conventions, preferences, decisions-with-rationale, domain knowledge), then garden the whole wiki: merge duplicates, resolve contradictions newest-wins, prune stale content, split overgrown pages, repair links, tighten prose, and reality-check every cited path/command/flag against the code (fix mechanical drift, flag semantic conflicts). Use when the user wants to dream, synthesize, consolidate, distill the conversation into the wiki, clean up / garden the wiki, or check the wiki is consistent with the code. The single wiki write path (replaces the retired /document). Deliberate only — nothing auto-runs it; edits stay in the working tree (checkpoint with /save).
user-invocable: true
---

# /dream

The wiki improves the way memory does overnight: the session's experience is **captured**, then the whole tree is **consolidated** — new facts merged into what's already known, contradictions resolved, noise pruned. One deliberate cycle, invoked at a natural stopping point. A wiki that only accretes pages rots; the second phase is what keeps it atomic and trustworthy.

**Before anything:** resolve the wiki root — `wiki/`, falling back to `docs/` in repos that keep the old name — and read its [`wiki-style.md`](../../../wiki/wiki-style.md). That file owns every structural and placement rule; this skill never restates it. The defect checklist for consolidation is `improve`'s [docs audit playbook](../improve/references/docs-audit-playbook.md).

## Phase 1 — capture

Replay the conversation and extract facts worth keeping **from what the user said** — never from your own inferences or work products.

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

## Phase 2 — consolidate

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

Close with a concise summary: facts captured (and where they landed), pages merged / pruned / split, links repaired, code drift fixed — and any doc-vs-code conflicts flagged as open questions for the user. Or a one-liner on why nothing qualified: "nothing to capture" and "nothing to fix" are both fine results; say so plainly.

## Sweep mode — designed, not yet implemented

`/dream sweep` will consolidate sessions this repo never dreamed on: enumerate `~/.claude/projects/*/`, match transcripts to this repo by the `cwd` field inside each JSONL (never by directory slug — worktree slugs are ephemeral), process sessions newer than a committed watermark file, then run this same two-phase cycle on their user messages. Until then, respond to `sweep` by saying it isn't implemented yet and running the normal cycle on the current session instead.

## Hard rules

- **No git.** Edits stay in the working tree — `/save` commits and pushes, `/ship` merges. Wiki edits reach `main` through the same PR gate as everything else.
- **Deliberate only.** Nothing invokes `/dream` automatically — not `/save`, not hooks. (`/ship`'s capture-a-process step may hand a shipped change's reusable process to the capture phase; that's a human-triggered flow.)
- **User-stated facts only.** The assistant's conclusions, however good, wait until the user has adopted them.
- **One rulebook.** `wiki-style.md` (and `voice.md` for sentences) govern every edit; never fork or restate their rules here.
- **Delete with cause.** Every removal is justified by supersession, duplication, or staleness — and rides a reviewable diff.
- **Wiki edits only.** The reality-check reads the code, never changes it — when code and wiki disagree on intent, the user decides.
