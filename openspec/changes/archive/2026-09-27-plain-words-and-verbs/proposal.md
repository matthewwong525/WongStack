# Plain reports, and a loop picture that tells the truth

**Status:** ready-to-ship
**Branch:** plain-words-and-verbs
**Open questions:** none

## Why

When you save or publish, the assistant's report ends in lines only a programmer reads: branch names, commit codes, and a gate result. Every drawing of the loop shows "continue" as a step between saving and publishing, when it really means "pick this up later". And the list of words the assistant may use leaves out the ones you actually meet, like *preview link* and *review page*. You should get the outcome and one link, see the loop as it is, and find every word explained.

## What Changes

- **Reports give you the outcome and one link.** When you save, publish, or pick up work yourself, the reply says what happened and gives the one link that matters. Branch names, commit codes, and check results stay out unless you ask for them. People who want the details still get them.
  ```text
  Before                  After
  ─────────────────────   ─────────────────
  Saved. Branch          Saved. Not live
  explore/tip-split,     yet: here's the
  commit 4dab306,        review page.
  PR #151, CI passed,    <link>
  3 facts stored.
  SAVE_GATE_RESULT=
  SUCCESS
  ```
- **Picking work back up reads like progress, not git.** When you continue saved work, the recap says what the work is and how far it got — *3 of 9 steps left, 2 comments from reviewers* — instead of commit counts and branch names.
- **The loop picture shows continue as a side door.** Every drawing and one-line summary of the loop puts "continue" beside the loop, as the way back in later, not as a stop between saving and publishing.
  ```text
  explore ▶ plan ▶ apply ▶ save ▶ ship
                     ▲
       continue ─────┘
       (pick up saved work later,
        on any computer)
  ```
- **The word list covers what you'll see.** The list of words the assistant may use gains *preview link*, *review page*, *mini app*, *routine*, *save*, and *publish*. *Save* notes that a wiki-only save goes live right away.

Non-goals: no command is renamed; no change to what saving or publishing does; no word list in installed repos yet, which comes with the "what can I ask?" page.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reader-level`: *Reports lead with the outcome* changes from "technical lines may follow" to "technical lines are left out for a non-technical reader who ran the verb, unless asked; a verb running inside another still prints the lines its caller reads".

## Impact

- `.agents/skills/explore/references/asking-the-user.md`: *Write at the reader's level* owns the new report rule.
- `.agents/skills/save/SKILL.md` (§5), `.agents/skills/continue/SKILL.md` (§4 recap), `.agents/skills/ship/SKILL.md` (Step 6): each report section links the rule and names which of its lines are the caller-read ones.
- Loop picture: `AGENTS.md` (the `WONG-STACK` block; `CLAUDE.md` is its link), `README.md`, `wiki/development/the-change-loop.md`, `wiki/development/README.md`.
- `wiki/README.md`: six terms added to *Terms the agent may use*.
- `VERSION` 25.11.0 → 25.12.0 and a `CHANGELOG.md` entry.
- No script or test changes.

## Decision log

- **2026-09-27** — Asked which audit area to explore next → chose words and verbs.
- **2026-09-27** — Asked what this change should cover → chose the loop picture, the word list, and plain reports.
- **2026-09-27** — Asked what happens to a report's technical lines for a non-technical reader → chose hide them unless asked.
- **2026-09-27** — Asked whether the command names should change → chose keep the names.
- **2026-09-27** — Assumed: the report rule lives once, in *Write at the reader's level*, and `/save`, `/continue`, and `/ship` link it, because one topic lives on one page and the three reports already link that section.
- **2026-09-27** — Assumed: a verb that runs inside another verb (`/save` inside `/ship`, `/apply`, or `/verify`) still prints its gate line whatever the reader's level, because the calling verb reads it; the reader may see it during a publish.
- **2026-09-27** — Assumed: the `/continue` recap for a non-technical reader counts steps and reviewer comments, and drops commit counts and the branch name, because those are the parts a reader can act on.
- **2026-09-27** — Assumed: the one link is the preview when there is one, else the pull request, called *the review page on GitHub*, because it is the one place the person can look at the work.
- **2026-09-27** — Assumed: the word list stays on the source wiki's front page, because installed repos get their own front page from setup; shipping the list belongs to the queued "what can I ask?" page.
- **2026-09-27** — Assumed: the loop becomes `/explore → /plan → /apply → /save → /ship`, with `/continue` named after it as the way back in, because `/continue` hands off to `/apply` and is not a stage.
- **2026-09-27** — Assumed: a minor release, because nothing an installed repo relies on is removed.
- **2026-09-27** — Built: the report rule in *Write at the reader's level* (outcome plus at most one link for a non-technical reader who ran the verb; caller-read lines kept inside another verb); `/save` §5, `/continue` §4, and `/ship` Step 6 link it; the loop reads `/explore → /plan → /apply → /save → /ship` with `/continue` as the way back in, in the block, README, change-loop diagram, and development hub; six terms added to the source wiki's list. Moved to a fresh branch, `plain-words-and-verbs`, cut from `main`, because the workspace's branch merged as PR #148. Released as 25.11.0 above main's 25.10.1. Link, config, and retired-name checks and strict validation passed.
- **2026-09-27** — Merged main's 25.11.0 (PR #152, the plan-link rule) into the branch; kept both `WONG-STACK` lines and renumbered this release to 25.12.0.
- **2026-09-27** — Distilled: no repeatable fact.
- **2026-09-27** — Archived and checkpointed for merge by `/ship`.
