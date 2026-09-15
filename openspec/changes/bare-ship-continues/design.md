## Context

See [proposal.md](proposal.md) — Why. Three facts shape the approach:

- **`/apply` already resolves the work.** `.agents/skills/apply/SKILL.md` ships a four-item resolve order: a change the user named, *the change created or discussed in this conversation*, *an active change whose name matches the current branch*, then a sole active change — the last already fenced with *"only when the conversation does not establish different new work."* Item 3 is what covers a planned-but-unimplemented change sitting on its own branch, the `notes/add-html-wireframes.md:86` thread.
- **`/ship` resolves nothing.** Its pull-in passes the argument to `/apply` untouched, by design (`ship-full-cycle`: *"`/ship` resolves nothing itself"*).
- **The archive step asks, and `/ship` answers for it.** `openspec-archive-change` counts unchecked tasks, warns, and asks the user to confirm. `/ship`'s opening line authorizes the archive and says *don't re-prompt*, so the confirmation never reaches the user. Nothing in `/ship` reads the count itself.

## Goals / Non-Goals

**Goals:**

- One rule for the whole loop, with one named exception (the cold session).
- The intent resolver stays in exactly one place.
- The incomplete-change guard is a stop, not a warning.

**Non-Goals:**

- Editing `/apply`, `/plan`, `/explore`, `/save`, or `/verify`. This change is confined to `/ship`, the two pages that state the rule, and the release files.
- Editing the generated `openspec-*` skills — they stay pristine per [the payload rule](../../../.agents/rules/payload.md), so the archive step keeps its warning-and-confirm and `/ship` gains the guard instead.

## Decisions

### Bare `/ship` delegates resolution rather than testing intent itself

`/ship` asks one question — **which item of `/apply`'s resolve order applies?** Items 1–3 chain, and so does a session that states clear implementation intent with no change yet; item 4 and "unclear" stop. `/ship` writes no rules of its own about what counts as intent.

*Alternatives considered.* **A second resolver in `/ship`** — rejected: two resolvers drift, and the loop's whole premise is one owner per job. **Always pull in `/apply` with no argument** (full parity) — rejected: it hands the merge decision to the item-4 fallback, so a cold bare `/ship` in a repo with one stale active change would build and merge it. The `improve-openspec-plans` scaffold that sat active in this repo for days is the concrete counterexample. **Ask the user to confirm the inferred intent** — rejected as the default: it restores the tap the user is asking to remove, and `/explore`'s exit round already put the forks in front of them.

### The cold stop is the safety property, stated as such

The runbook keeps a hard rule: *a sole active change never starts a merge.* That is what remains of "a merge is never started by inference" (`notes/ship-in-one-go.md:36`) once the warm case is carved out — and it is the part that was actually load-bearing. The stop is not silent: `/ship` says it found nothing to continue, so the user learns to type an intent rather than wondering why nothing happened.

### The incomplete-task guard lives in `/ship`, not in the archive skill

`/ship` reads `tasks.md` before invoking the archive, and pulls in `/apply` for that exact change when tasks are unchecked. The generated archive skill is not edited: it stays regenerable, and its warning-and-confirm is untouched. This also composes with the existing *never merge as a way of stopping* rule — an `/apply` that ends with tasks pending stops `/ship` before the archive, which is already specified.

*Alternative considered.* **Let the archive step's confirmation through instead** — rejected on its own: it would stop a one-go run to ask a question whose only good answer is "go finish it," which is what the guard does. The runbook still narrows its authorization so the confirmation is never auto-answered if the guard is somehow bypassed.

### Release shape

Minor bump, `14.0.1` → `14.1.0`. A stop is relaxed and a guard is added; nothing installed breaks, and no target repo has to do anything. The two release checks run with the bump.

## Risks / Trade-offs

- **A mistyped bare `/ship` right after `/explore` now builds and merges.** → The gate ladder, the red-default-branch check, and *never merge as a way of stopping* all still apply, and `/ship <intent>` already carries the identical exposure. The user asked for this trade explicitly.
- **Which resolve-order item applies is a judgment an agent makes.** → It is bound to `/apply`'s written order rather than left to feel, and the failure mode is asymmetric: a false negative is today's behaviour (stop, retype), while a false positive needs item 1, 2, or 3 to match — meaning the session really did name the change, discuss it, or sit on its branch.
- **The guard adds a read before every archive.** → One file read on a path that is about to run CI and a merge.
- **Shares `VERSION` and `CHANGELOG.md` with #80.** → Resolved: #80 merged as `6943d84` and this branch is cut from it, so the bump starts at `14.0.1`.

## Migration Plan

None. Prose payload; a target repo picks the change up through `/wong-sync` and needs no action. Rollback is reverting the merge commit.
