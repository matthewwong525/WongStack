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
