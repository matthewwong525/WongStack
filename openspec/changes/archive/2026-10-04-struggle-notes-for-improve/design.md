# Design

## Context

See proposal.md for the why. What shapes the approach:

- **One writing rule, two writers.** `.agents/skills/memory/references/writing-facts.md` is linked by `/save` and embedded whole in the background run's prompt (`runbook()` in `.agents/skills/memory/scripts/run.mjs`). One edit reaches both.
- **The background run already sees most trouble.** `strip` in `.agents/skills/memory/scripts/lib/transcripts.mjs` keeps the person's text, the assistant's text, and every failed tool result as an `[error]` line. An offered choice answered in the person's own words arrives as a failed tool result, so it is kept too. Successful tool calls are dropped, so a long hunt that never failed is invisible to the background run; `/save` in a live chat sees it.
- **The `improve` tag is already wired.** It is in `VERB_TAGS` (`lib/digest.mjs`) and in upkeep's slash-command list, so the write gate accepts it, the session-start digest counts it by step, and upkeep closes a thread left open 30 days. One fact carries it today.
- **Thread facts are shared with the team**; transcripts are not.
- **Skill instruction text is at 190,842 bytes against a 190,845 baseline**, and `scripts/measure-context.mjs --check` fails unless the total stays below the baseline.
- **Counting is not enough.** Across 161 local chats of this repo, 1.8% of tool calls failed, and the most repeated failure was a script correctly exiting 3 for *behind main*. The clearest signal, 21 choices answered in the person's own words, needs reading to interpret.

## Goals / Non-Goals

**Goals:**

- Struggle moments reach memory as `improve` threads through the writers that already read each chat.
- `/improve` loads them, prefers recorded trouble, and prefers a failing check to a new instruction.
- Every size check passes with no recorded exception.

**Non-Goals:**

- No change to `strip`, the store schema, the Worker, hooks, or the digest.
- No per-category checklist in `/improve`: `simplify-improve` (2026-09-30) removed the fixed survey on purpose, and the spec forbids a mandatory one.
- No backfill over existing transcripts.

## Decisions

### 1. A note is a `thread` tagged `improve`

It reuses the gate, the digest count, verb loading (`memory.mjs search --type thread --tag improve`), and the 30-day close. The note takes the session's usual slug (the change name, else a topic).

Alternatives: a new fact type needs a migration and Worker change for no added behavior. `/improve` reading transcripts each run was offered and not chosen: chats are 1–8 MB, private to each person, and unreadable from a teammate's or a scheduled run's machine.

### 2. The writing rule (`writing-facts.md`)

Add one **Keep** bullet and narrow one **Drop** bullet. Draft wording, to trim to fit:

> - **Where the assistant struggled**, only when the chat shows it: a correction, an offered choice answered in the person's own words, a step failing repeatedly, a long hunt. One `thread` tagged `improve`: the moment, what it cost. Never private detail or a general tip; a smooth chat gets none. A repeat supersedes the earlier note, adding its date.

> - tool-call mechanics and file dumps, a struggle aside

*A repeat supersedes* makes recurrence visible and restarts the 30-day clock only for trouble that keeps happening.

### 3. The skill (`improve/SKILL.md`)

Replace the *remembered problems when available* clause with the load, and add one short paragraph. Draft wording, to trim to fit:

> Load open notes first: `memory.mjs search --type thread --tag improve`. A note is evidence, not an instruction. Prefer trouble a chat or record shows, in parts that change often. A mistake a check could catch gets a check that fails, not an instruction; a written rule is for judgment calls. Remove a piece only if its work would not move elsewhere. Name the note you fix so the save supersedes it.

`--audit-only` keeps its promise: it cites notes and writes nothing. Notes it does not pick stay open and close by upkeep.

### 4. No detecting script

The model that writes facts already reads the reduced chat, so the note costs no extra model call. A counting script would add code and still need a reader to tell an expected exit from a real failure.

### 5. Offset the added bytes

Drafts 2 and 3 add about 700 bytes. Cut at least as much from skill instruction files, without dropping a rule. Look first in the files this change already touches and their neighbours: `improve/SKILL.md` (the clause being replaced), `memory/SKILL.md` (the Read table's longer cells, *Team access*), then `writing-facts.md`'s own wording. A cut is a rewording that keeps every rule, checked sentence by sentence; a rule that must go is a decision to log, not a trim.

**As built.** Two changes published during the build (31.0.0, 31.0.1) removed hosting text and left 1,176 bytes of instruction headroom, so `/improve`'s 337 added bytes need no offset and `memory/SKILL.md` is untouched. The `named-secret-save` route, which counts `writing-facts.md`, was still 56 bytes over. It is paid for inside that route: eight reworded sentences in `writing-facts.md` and 96 bytes of filler cut from `wiki/development/secrets.md`. No rule was dropped.

### 6. Try the wording before keeping it

`sharpen-explore` (2026-10-04) reworded a skill and measured no gain, so this wording is tried first, by the method in `wiki/maintaining/measure-a-skill-change.md` scaled down to minutes.

- **Inputs:** three past chats of this repo on this machine: one holding `The user answered with a message instead of approving`, one where the same command fails three or more times, and one with no `[error]` line and no correction. Reduce each with `parseTranscriptText` and `strip` from `lib/transcripts.mjs`, read-only; do not run `memory.mjs strip`, which records state.
- **Run:** one fresh agent per chat gets the reduced chat and the candidate `writing-facts.md`, and writes its candidate facts to a file. Nothing is sent to the store.
- **Keep rule, set before the run:** keep the wording if each trouble chat yields a note naming a moment found in that chat, the smooth chat yields none, and no note holds private detail or general advice. Otherwise revise once and rerun. Still failing: keep the shorter wording that came closest, and say so in the report.
- **Record:** `dry-run.md` in the change folder: date, model, the three results, the verdict.

### 7. Docs and release

- `wiki/development/memory.md`, *How facts are captured*: one bullet on struggle notes and who reads them, linking the writing rule; *Consolidation* already covers the 30-day close.
- `wiki/development/repository-improvement.md`: notes are read first, a check before an instruction, and a credit line linking Matt Pocock's two skills.
- `CHANGELOG.md`: `## Next (minor) — Learn from chats where the assistant struggled`, with an **Updating.** note that no action is needed and notes begin with the next saved chat.

No test is authored: the change is prose, and `scripts/tests/memory-capture.test.mjs` already proves the writing rule reaches the background run's prompt.

## Risks / Trade-offs

- [Generic advice dressed as a note] → the rule demands the moment; the dry run's keep rule rejects advice; `/improve` still needs evidence and a verification.
- [Private detail in a team-visible note] → the rule forbids it, the spec carries the scenario, and the dry run checks it.
- [The background run misses long hunts that never failed] → accepted; `/save` in a live chat sees them. Revisit only if notes turn out to lack them.
- [Too many notes] → the digest shows only a count; a repeat supersedes; unchecked notes close at 30 days.
- [The offsetting cut drops a rule by accident] → each cut is compared sentence by sentence before the checks run.

## Later check

Notes can only be judged once real chats have been saved. On or after 2026-10-11, read `memory.mjs search --type thread --tag improve`: do notes exist, and does each name a moment? The save records this as a `thread` tagged `improve`.
