---
slug: wong-sync-verdict-transparency
started: 2026-08-02
updated: 2026-08-02
consolidated:
---

# /wong-sync was deciding for the user, and hiding that it had

## What the user said

The trigger, verbatim in substance: *"for wong-sync why is it that you decide what i want and what i don't want. it should give me choices on what to keep and stuff right? it seems to just auto decide."*

Worth recording as a **standing preference, not a one-off complaint**: when a WongStack skill makes a judgment call on the user's behalf, the user expects to be given the choice — or at minimum to be able to see and reverse the call afterwards. The complaint was about `/wong-sync` specifically, but it reads as a general expectation of the toolkit.

The instinct was correct and the docs confirmed it. Checking before answering was the right move here — the skill's own prose (`references/adapt.md`) stated the intent that "a wrong call is visible and arguable" while providing no mechanism to argue, which is a sharper finding than the user's original framing and is what the change ended up targeting.

## The generalizable diagnosis

The reusable insight, which is bigger than this change:

> A system can have a review gate for everything it says **yes** to and none for anything it says **no** to.

`/wong-sync` had exactly that. An `adopt` verdict produced a durable OpenSpec change folder you read at your leisure and could delete. A `divergent` or `declined` verdict produced one line in a chat report that scrolled away, plus a JSON ledger entry that silently suppressed the capability on every future run. Both are decisions; only one was reviewable. **Asymmetric gating is the smell** — worth looking for anywhere a tool proposes work, because the rejected set is invisible by construction and therefore never audited.

Two supporting principles that fell out and are likely reusable:

- **Separate the agent's inferences from the user's decisions in any persisted record**, and let only the latter carry weight across runs. The old `declined` verdict was defined as "wrong for this repo, **or** the user said no" — one slot for two authorities, which is what let a guess acquire the permanence of a refusal. Splitting on *who decided* (not on *why*) was the fix.
- **A cached judgment must be pinned to whatever it actually depends on.** The ledger stamped every verdict with an `asOfCommit` from the *upstream clone*, but a "doesn't fit this repo" verdict depends on the **target's** shape. So a capability rejected for "assumes CI, you have none" would never be revisited when the repo added CI — upstream hadn't moved, so nothing triggered re-evaluation. Found while writing the spec, not while planning.

## Options considered and dropped

The `/explore` pass surfaced four; two shipped (split the verdict, durable record), two didn't:

- **Interactive per-capability checkpoint during the run** — rejected. A 20–40 item checklist on every sync *feels* like control but trains people to hit accept, and it does nothing on run two, where the ledger is what's actually suppressing. The asynchronous tick-a-box-and-re-run path gives real control at the cost of one extra run.
- **Gating Step 2's copy of absent payload files** — deferred, recorded as an explicit non-goal in the proposal. Nothing is committed and `/save` is the gate, so the exposure is low. **Open thread:** if the copy volume turns out to bother the user in practice, this is a small addition to the same surface, not a separate change. Ask before assuming it's wanted.

Also considered and rejected: a `by: "user" | "skill"` metadata field instead of a distinct `not-applicable` verdict. A field is trivially droppable by a later edit and reads as annotation; a distinct verdict forces every table, rule, and report in the payload to state which one it means.

## Design details worth remembering

- **`.claude/wong-sync-verdicts.md` lives next to the manifest, not in the change folder.** Verdicts are *repo state*, not change scope — they outlive any one adoption change, and on a current repo there's no change folder at all. Dated folders would scatter the record when what you want is the current picture.
- **Regenerated files need a stated contract.** The file is rewritten every run, so it carries a generated-file header saying so and naming the one edit that survives (ticking a checkbox). A file that silently eats user edits is worse than one that never accepts them.
- **"Never overwrite" was rescoped by authorship rather than by an exception list.** The skill may rewrite files it generates and solely owns; it never touches anything a human wrote. An exception list grows; an authorship rule doesn't.

## Process notes

- The branch existed as `wong-sync-choice-prompts` before the change was named. Renamed to match the change slug at `/save` time — no commits, no remote, so free. The invariant (branch = change = note slug) is what `/continue` and `/ship` rely on, so it's worth fixing early rather than living with the mismatch.
- Payload edit ⇒ release: `VERSION` 8.2.0 → 8.3.0 plus a `CHANGELOG.md` entry, per CLAUDE.md. Easy to forget when the change feels like "just prose."
