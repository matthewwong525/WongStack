<!-- openspec-archive v1 2026-10-04-struggle-notes-for-improve -->
<!-- file proposal.md utf8 5964 -->
# Learn from chats where the assistant struggled

**Status:** ready-to-ship

**Branch:** retro-skill-insights

**Open questions:** none

## Why

`/improve` picks what to fix by reading the project. It knows almost nothing about where the assistant really had trouble: memory keeps what was decided and drops how hard it was to get there. Your chats hold that trouble, and they are the best evidence of what to fix next.

## What Changes

- **A note when the assistant struggled.** When a chat is saved, by you or by the background save, the assistant also writes a short note for each real moment of trouble: you corrected it, you typed your own answer instead of picking a choice it offered, a step failed again and again, or it hunted a long time for something. The note says what happened and what it cost. A smooth chat gets none.
  ```text
  chat ─▶ saved ─▶ trouble? ─▶ note
                      │ no       │
                      ▼          ▼
                   no note    /improve
                              reads it
  ```
- **`/improve` reads those notes first.** A problem a real chat shows comes before one found by reading the project alone. You run it the same way as today.
- **A check before another rule.** When the trouble is a mistake a machine could catch, `/improve` builds a check that fails, not one more written instruction. A written rule is kept for judgment calls.
- **It looks where the project changes most.** Before it removes anything, it asks whether the work would only move somewhere else.
- **Notes tidy themselves.** Fixing a problem closes its note. A note nobody acts on closes by itself after 30 days.
- **Notes say nothing private.** Your team can read them, so a note describes the assistant's trouble, never your private matters.

**Non-goals:** A new command such as `/retro`, replacing `/improve`, a fixed list of things to look for, re-reading chats on every run, going back over older chats, or a tool that counts failures.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: a saved session's facts include one `improve` thread per moment where the assistant struggled, with no private detail and none for a smooth session; the rule that facts omit tool mechanics gains that one exception.
- `repository-improvement`: `/improve` loads open `improve` notes before choosing, prefers recorded trouble, closes the note it fixes, and turns a mechanical mistake into a failing check.

## Impact

Edit `.agents/skills/memory/references/writing-facts.md` (read by `/save` and by the background run) and `.agents/skills/improve/SKILL.md`, with offsetting cuts where a size check needs them (`wiki/development/secrets.md` wording), so `scripts/measure-context.mjs --check` passes. Update `wiki/development/memory.md` and `wiki/development/repository-improvement.md`. Add a minor `CHANGELOG.md` entry. No script, schema, migration, hook, or app change: the reduced chat the background run reads already keeps failed commands and what the person typed.

Ideas adapted from Matt Pocock's `retro` and `improve-codebase-architecture` skills (github.com/mattpocock/skills, MIT); no text is copied.

## Decision log

- **2026-10-04** — Asked whether to remove `/improve` and take Matt Pocock's `improve-codebase-architecture` and `retro` → chose keep `/improve` and fold the ideas in.
- **2026-10-04** — Asked how past chats should reach `/improve` → chose notes written when a chat is saved, over `/improve` reading chats each run or both with a one-time read of old chats.
- **2026-10-04** — Asked what next → chose plan it.
- **2026-10-04** — Assumed: a note is a `thread` fact tagged `improve`, because that tag is already a known verb tag, the session-start digest already counts it, and upkeep already closes a thread left 30 days.
- **2026-10-04** — Assumed: no new script detects struggles, because the reduced chat already carries failed commands and the person's words, and a count across 161 chats ranked an expected exit code as the top failure.
- **2026-10-04** — Assumed: *look where the project changes most* is guidance in the skill, not a spec requirement, because the spec forbids a mandatory survey.
- **2026-10-04** — Assumed: `--audit-only` reads notes and writes none, because it promises to change nothing.
- **2026-10-04** — Assumed: the new wording is tried on three past chats before it is kept, because the last reworded skill showed no measured gain.
- **2026-10-04** — Assumed: a minor release, because saving and `/improve` gain behavior and nothing breaks.
- **2026-10-04** — Asked what to do with the finished plan → chose build and publish.
- **2026-10-04** — Assumed: the size check runs once in the final checks, not after the skill edit, because checks wait until all text is written; the later-check note is written by the save's facts step, not a task, because no build step can tick it.
- **2026-10-04** — Assumed: the note wording is the dry run's second version, because the first gave a smooth chat a note; the four kinds of trouble are now a closed list.
- **2026-10-04** — Assumed: the equal cut shrank to what the size checks need, because two changes published during the build freed 1,176 bytes of skill text. `/improve` grows 337 bytes with no offset; the save-with-a-key route was 56 bytes over and is paid for by rewording the writing rule and cutting 96 bytes of filler from the secrets page, with no rule dropped and no check exception recorded.
- **2026-10-04** — Archive checkpoint: all tasks done and the change archived; brought up to date with 31.0.1 and numbered 31.1.0; link, retired-name, config, size, and loosened-check scripts pass locally, with CI still to run.
- **2026-10-04** — Archive checkpoint: main reached 31.0.2 while the checks ran, so main was merged in, the release stays numbered 31.1.0 from 31.0.2, and the local size, link, and retired-name checks pass again.

<!-- end proposal.md -->
<!-- file design.md utf8 8041 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 2699 -->
# Tasks

## 1. Try the wording (change folder)

- [x] 1.1 Write `candidate-writing-facts.md` in the change folder: a full copy of `.agents/skills/memory/references/writing-facts.md` with design.md decision 2's Keep bullet and narrowed Drop bullet. Verify it differs from the live file only in those two bullets.
- [x] 1.2 Run the dry run by design.md decision 6 on three past chats (one own-words answer, one repeated failure, one smooth), reduced read-only with `parseTranscriptText` and `strip`; store nothing. Write `dry-run.md` with the keep rule first, then date, model, each chat's candidate notes, and the verdict. Verify the verdict follows the keep rule as written.

## 2. Memory skill (writing rule)

- [x] 2.1 Apply the kept wording to `.agents/skills/memory/references/writing-facts.md`. Verify the Keep list names struggle notes as a `thread` tagged `improve` with the no-private-detail and smooth-chat-gets-none rules, and the Drop list carries the exception.

## 3. Improve skill

- [x] 3.1 Edit `.agents/skills/improve/SKILL.md` by design.md decision 3: load open `improve` notes first, a note is evidence, prefer recorded trouble in parts that change often, a check before an instruction, the removal test, and name the fixed note for the save. Keep `--audit-only` write-free. Verify the description line is unchanged and every existing rule is still stated.
- [x] 3.2 Offset the added bytes where a size check needs it, rewording without dropping a rule, and compare each cut sentence by sentence (as built: design.md decision 5). Verify by reading `node scripts/measure-context.mjs --json` that no route grew past its baseline; the pass itself is 5.1's.

## 4. Docs and release

- [x] 4.1 `wiki/development/memory.md`, *How facts are captured*: add one bullet on struggle notes, who writes them and that `/improve` reads them, linking the writing rule. Verify the page stays under 3,000 words.
- [x] 4.2 `wiki/development/repository-improvement.md`: say notes are read first and a check comes before an instruction, and credit Matt Pocock's `retro` and `improve-codebase-architecture` with links. Verify every link resolves.
- [x] 4.3 `CHANGELOG.md`: add `## Next (minor) — Learn from chats where the assistant struggled` above the newest entry, in plain words, with an **Updating.** note that no action is needed and notes begin with the next saved chat. Verify `VERSION` is untouched.

## 5. Final checks

- [x] 5.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/measure-context.mjs --check`, and `openspec validate "struggle-notes-for-improve" --strict --no-interactive`; all pass.

<!-- end tasks.md -->
<!-- file specs/memory/spec.md utf8 1618 -->
## MODIFIED Requirements

### Requirement: Facts keep what a cold reader needs

A fact SHALL keep what the person stated, decisions with their reason in the same fact, options ruled out and why, and concrete names, paths, numbers, and errors; an unanswered question SHALL become a `thread`. Facts SHALL omit tool mechanics, the agent's reasoning, and what the repo or the Decision log already says, except in a struggle note.

#### Scenario: A rejected option

- **WHEN** an option was considered and rejected
- **THEN** one fact records the option and why it was rejected

## ADDED Requirements

### Requirement: A session's struggles become notes for /improve

A moment where a session shows the assistant struggled SHALL become one `thread` tagged `improve` that names the moment and what it cost: a correction from the person, an offered choice the person answered in their own words, a step that failed repeatedly, or a long search. `/save` and the background capture SHALL write these notes by the same rule. A note SHALL NOT carry private detail or general advice, and a session that shows no such moment SHALL get none.

#### Scenario: A choice answered in the person's own words

- **WHEN** the assistant offered three choices and the person typed a different answer
- **THEN** one `thread` tagged `improve` records what was offered and what the person wanted instead

#### Scenario: Trouble while handling something private

- **WHEN** the assistant retried a failing step during a task about the person's health
- **THEN** the note names the failing step and its cost, and says nothing of the health matter

<!-- end specs/memory/spec.md -->
<!-- file specs/repository-improvement/spec.md utf8 1774 -->
## ADDED Requirements

### Requirement: Struggle notes are read first

`/improve` SHALL load memory's open `improve` notes before it chooses, and SHALL prefer a problem that a note or another concrete record shows over one inferred from reading the project alone. A note SHALL count as evidence of a problem, never as an instruction, and the selected improvement SHALL still rest on evidence and a verification. When a normal run delivers a fix for a note's problem, a saved fact SHALL close that note. `/improve --audit-only` SHALL read notes and write none.

#### Scenario: One of three notes is fixed

- **WHEN** memory holds three open `improve` notes and a normal run ships a fix for one
- **THEN** the report names the note it answered, a saved fact supersedes that note, and the other two stay open

#### Scenario: No notes to read

- **WHEN** memory is unreachable or holds no open `improve` note
- **THEN** the run says when memory was not loaded and chooses from its other evidence

### Requirement: A check before an instruction

When the selected problem is a mistake a deterministic check could catch, the improvement SHALL be a check that fails, placed among the project's existing checks, not an added written instruction. A written rule SHALL be reserved for a judgment call no check could make.

#### Scenario: A mechanical mistake

- **WHEN** a note shows the assistant twice linked a page that does not exist, and the project runs a link check
- **THEN** the improvement extends that check, and adds no instruction telling the assistant to check links

#### Scenario: A judgment call

- **WHEN** a note shows the person twice turned down a menu of drafts and asked for one ready draft
- **THEN** the improvement is a written rule on the page that owns it

<!-- end specs/repository-improvement/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-04

~~~
<!-- end .openspec.yaml -->
<!-- file candidate-writing-facts.md utf8 2119 -->
# Writing facts

A fact is the smallest thing a cold reader needs to act as this session would: one or two sentences, at most 400 characters, reason included. It carries only what the transcript and the Decision log don't make easy to find.

## Keep

- **What the user stated**: facts, constraints, preferences, corrections. Type `user` (who they are, private life included) or `feedback` (how they want work done). Teammates never see these; the admin can ([who sees what](../../../../wiki/development/memory.md#who-sees-what)).
- **Decisions with their reason**, and ruled-out options with theirs: *Rejected a Worker in front of the store, because it adds a service to keep alive.* Type `project`.
- **Specifics**: names, repo-relative paths, numbers, versions, error strings. Tag the code area a fact concerns; `memory.mjs areas <path>` prints it.
- **Pointers** to dashboards, tickets, external docs. Type `reference`.
- **Unanswered questions**. Type `thread`, tagged with the verb (`plan`) or area whose next run should check it; untagged, it is refused. A fact answering a listed thread supersedes it, saying what it found.
- **Where the assistant struggled**, only when the chat shows one of four: a correction, an offered choice answered in the person's own words, a step failing repeatedly, a long hunt. One `thread` tagged `improve`: the moment, what it cost. Never private detail or a general tip; a smooth chat, showing none of the four, gets none. A repeat supersedes the earlier note, adding its date.

## Drop

- tool-call mechanics and file dumps, a struggle aside
- the assistant's route to a conclusion
- anything already in the repo or the change's Decision log
- credential values, always. A fact may say `SERVICE_TOKEN` rotated and where it comes from, never the value.

## One fact, one claim

Split a paragraph into facts that can each be superseded alone. Write absolute dates, never *yesterday*. Use the change's slug when the session worked on one, so `/continue` and `/ship` find it.

When the write gate shows close live facts, drop a candidate one already says; supersede one it corrects.

<!-- end candidate-writing-facts.md -->
<!-- file dry-run.md utf8 6449 -->
# Dry run of the struggle-note wording

## Keep rule, set before the run

From design.md decision 6, unchanged: keep the wording if each trouble chat yields a note naming a moment found in that chat, the smooth chat yields none, and no note holds private detail or general advice. Otherwise revise once and rerun. Still failing: keep the shorter wording that came closest, and say so.

## Run

- **Date:** 2026-10-04.
- **Model:** Claude Opus 5.5 (`claude-opus-5-5`), the build session's model; each fresh agent inherited it.
- **Cost:** six agent runs, 178,027 tokens in all (87,945 in round 1; 90,082 in round 2). No dollar figure was reported.
- **Inputs:** three past chats of this repo on this machine, reduced read-only with `parseTranscriptText` and `strip`. `memory.mjs strip` was never run, and nothing was sent to the store.
- **Each agent got:** one reduced chat, the candidate writing rule, and a neutral file name (`chat-1`, `chat-2`, `chat-3`). It was not told which kind of chat it had, and it wrote its facts to a file outside the repo.

| Chat | Kind | Session, started | Reduced size | `[error]` lines |
|---|---|---|---|---|
| 1 | Own-words answer | `claude:f33c4244`, 2026-09-27 | 5,828 bytes | 3, two of them *The user answered with a message instead of approving* |
| 2 | Repeated failure | `claude:b535a438`, 2026-09-27 | 17,552 bytes | 10, a hung `node --test` run ended by its timeout again and again |
| 3 | Smooth | `claude:ba0b699a`, 2026-09-30 | 11,735 bytes | 0, and no correction |

Chat 3 is smooth by the design's test, yet not spotless: a build helper's first pass cut 6% of the words, and the assistant redid the work. That is none of the four kinds of trouble, so it tests whether the wording over-reaches.

## Round 1: the design's draft wording

> - **Where the assistant struggled**, only when the chat shows it: a correction, an offered choice answered in the person's own words, a step failing repeatedly, a long hunt. One `thread` tagged `improve`: the moment, what it cost. Never private detail or a general tip; a smooth chat gets none. A repeat supersedes the earlier note, adding its date.

Candidate `improve` notes, word for word:

- **Chat 1, one note:** *Struggle in wiki-saves-through-review (archived 2026-09-27): the save report left out the plan link, and Matthew twice answered the approve question with a message instead of approving. The link was then printed just above the question box and he still did not see it. Cost: two refused approvals, an extra fix round, and a hand-off to another session.*
- **Chat 2, two notes:**
  - *2026-09-27, /apply on tidy-loose-ends: a new linked-worktree test in scripts/tests/verify-scripts.test.mjs hung under node --test for about nine attempts (one run 3m20s). Causes found: a synchronous script call blocked the test's own web server, connections left open, leftover stuck processes, and a fix lost because the command that killed them also stopped the edit.*
  - *2026-09-27, /ship on tidy-loose-ends: main moved three times between plan and merge, and parallel releases twice claimed the version this change held, so it went 25.3.0 -> 25.5.0 -> 25.6.0 -> 25.7.0. Cost: one refused merge, three merges of main, version numbers rewritten in the plan, specs and changelog each time, and a second CI wait.*
- **Chat 3, one note:** *2026-09-30, simplify-verify: the first reply said /verify "can slim down a lot", then the build helper returned a 6% word cut with the skill still a numbered runbook. The assistant rewrote the skill itself; the final cut was 2,310 to 2,137 words. Cost: a second build pass and a result much smaller than the person was told to expect.*

**Result: fails the keep rule.** Both trouble chats gave notes naming real moments, with no private detail and no general advice. The smooth chat gave a note too. The draft read its four kinds of trouble as examples, not as the whole list.

## Round 2: revised once

The one revision closes the list: *one of four* and *showing none of the four*.

> - **Where the assistant struggled**, only when the chat shows one of four: a correction, an offered choice answered in the person's own words, a step failing repeatedly, a long hunt. One `thread` tagged `improve`: the moment, what it cost. Never private detail or a general tip; a smooth chat, showing none of the four, gets none. A repeat supersedes the earlier note, adding its date.

Three fresh agents, the same three chats. Candidate `improve` notes, word for word:

- **Chat 1, one note:** *2026-09-27, wiki-saves-through-review: the save report left out the plan's link, so the person twice answered an approval with a message instead of approving. The link then printed just above the question box still went unseen. Cost: an extra fix round inside PR #156, a delayed publish, and a hand-off to a second workspace with the cause still unknown.*
- **Chat 2, one note:** *By 2026-09-27, building tidy-loose-ends: the new linked-worktree test in `scripts/tests/verify-scripts.test.mjs` hung under `node --test`. It took about ten timed-out runs, one of 3m20s, to find that the test's web server held connections open and stuck processes from the first run lingered. One fix never saved because the command that stopped those processes also stopped itself.*
- **Chat 3:** no note. Its three facts were one `verify` thread and two `project` facts.

## Verdict

**Keep the round 2 wording.** By the keep rule as written: each trouble chat yields a note naming a moment found in that chat, the smooth chat yields none, and no note holds private detail or general advice. It was revised once, as the rule allows.

`candidate-writing-facts.md` holds the kept wording. When written, it differed from the live file only in the Keep bullet and the Drop bullet.

## What this does not show

- **One run per chat per wording.** Three passes out of three is thin; a second sample could differ.
- **A long hunt was never tested.** A reduced chat drops successful tool calls, so no input could show one.
- **Round 2 dropped a note that round 1 kept.** Chat 2's version-renumbering note is gone. The closed list is stricter on trouble chats as well as smooth ones.
- **The live file was trimmed afterwards.** To offset the added bytes, eight other sentences in `writing-facts.md` were reworded after this run. The two tested bullets are word for word as tested.
- **No real save has written a note yet.** design.md's later check covers that.

<!-- end dry-run.md -->
<!-- file review.html utf8 37664 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-04-struggle-notes-for-improve</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-04-struggle-notes-for-improve">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-04-struggle-notes-for-improve</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0"><code>/improve</code> picks what to fix by reading the project. It knows almost nothing about where the assistant really had trouble: memory keeps what was decided and drops how hard it was to get there. Your chats hold that trouble, and they are the best evidence of what to fix next.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A note when the assistant struggled.</b> When a chat is saved, by you or by the background save, the assistant also writes a short note for each real moment of trouble: you corrected it, you typed your own answer instead of picking a choice it offered, a step failed again and again, or it hunted a long time for something. The note says what happened and what it cost. A smooth chat gets none.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">chat ─▶ saved ─▶ trouble? ─▶ note</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">                    │ no       │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">                    ▼          ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">                 no note    /improve</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">                            reads it</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b><code>/improve</code> reads those notes first.</b> A problem a real chat shows comes before one found by reading the project alone. You run it the same way as today.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A check before another rule.</b> When the trouble is a mistake a machine could catch, <code>/improve</code> builds a check that fails, not one more written instruction. A written rule is kept for judgment calls.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>It looks where the project changes most.</b> Before it removes anything, it asks whether the work would only move somewhere else.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Notes tidy themselves.</b> Fixing a problem closes its note. A note nobody acts on closes by itself after 30 days.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Notes say nothing private.</b> Your team can read them, so a note describes the assistant's trouble, never your private matters.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> A new command such as <code>/retro</code>, replacing <code>/improve</code>, a fixed list of things to look for, re-reading chats on every run, going back over older chats, or a tool that counts failures.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked whether to remove <code>/improve</code> and take Matt Pocock's <code>improve-codebase-architecture</code> and <code>retro</code> → chose keep <code>/improve</code> and fold the ideas in.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked how past chats should reach <code>/improve</code> → chose notes written when a chat is saved, over <code>/improve</code> reading chats each run or both with a one-time read of old chats.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what next → chose plan it.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: a note is a <code>thread</code> fact tagged <code>improve</code>, because that tag is already a known verb tag, the session-start digest already counts it, and upkeep already closes a thread left 30 days.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: no new script detects struggles, because the reduced chat already carries failed commands and the person's words, and a count across 161 chats ranked an expected exit code as the top failure.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: <i>look where the project changes most</i> is guidance in the skill, not a spec requirement, because the spec forbids a mandatory survey.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: <code>--audit-only</code> reads notes and writes none, because it promises to change nothing.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the new wording is tried on three past chats before it is kept, because the last reworded skill showed no measured gain.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: a minor release, because saving and <code>/improve</code> gain behavior and nothing breaks.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-04</p>Asked what to do with the finished plan → chose build and publish.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the size check runs once in the final checks, not after the skill edit, because checks wait until all text is written; the later-check note is written by the save's facts step, not a task, because no build step can tick it.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the note wording is the dry run's second version, because the first gave a smooth chat a note; the four kinds of trouble are now a closed list.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-04</p>Assumed: the equal cut shrank to what the size checks need, because two changes published during the build freed 1,176 bytes of skill text. <code>/improve</code> grows 337 bytes with no offset; the save-with-a-key route was 56 bytes over and is paid for by rewording the writing rule and cutting 96 bytes of filler from the secrets page, with no rule dropped and no check exception recorded.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Archive checkpoint: all tasks done and the change archived; brought up to date with 31.0.1 and numbered 31.1.0; link, retired-name, config, size, and loosened-check scripts pass locally, with CI still to run.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-04</p>Archive checkpoint: main reached 31.0.2 while the checks ran, so main was merged in, the release stays numbered 31.1.0 from 31.0.2, and the local size, link, and retired-name checks pass again.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
