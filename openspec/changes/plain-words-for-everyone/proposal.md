# Plain words for everyone

**Status:** in-progress
**Branch:** plain-words-for-everyone
**Open questions:** none

## Why

The assistant still keeps two ways of talking. People marked "technical" get branch names, commit codes, and file paths, and everyone else gets plain words. That split is unnecessary: everyone is better served by plain words, with the details there for anyone who asks.

## What Changes

- **Everyone gets plain words; details when you ask.** A person's page no longer marks them "technical". Every plan, question, and report is plain for everyone. Anyone can ask for more — for one reply, or from now on, which is kept as a preference on their page.
  ```text
  Before                  After
  ─────────────────────   ─────────────────
  Page says technical?    Everyone: plain
   yes → full detail      Asked for more?
   no  → plain words       yes → give it
  ```
- **Reports, recaps, and questions follow the same rule.** Saving, publishing, and picking work back up give the outcome and one link for everyone. A failed check is still said plainly, never hidden.

Non-goals: no change to what saving or publishing does; no command is renamed; old "Technical level" lines are not migrated.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reader-level`: *The person page records a technical level* is removed. *Plans use the reader's words* and *Reports lead with the outcome* are replaced by *Plans are written in plain words* and *Reports give the outcome and one link*, for every reader, with detail on request; a verb running inside another still prints the lines its caller reads.
- `structured-asks`: *Asks name outcomes at the reader's level* is replaced by *Asks name outcomes in plain words*, with no technical-reader case.

## Impact

- `.agents/skills/explore/references/asking-the-user.md`: *Write at the reader's level* becomes *Write in plain words* (`#write-in-plain-words`), which owns plain-by-default and the report rule.
- `wiki/wiki-style.md` (*People*): the `**Technical level:**` line goes; a standing ask for detail is a preference on the person's page.
- `AGENTS.md`, `openspec/config.yaml`, and `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `wong-setup/references/tools.md`, `wiki/development/the-change-loop.md`: drop the reader split and link the new section.
- `VERSION` 25.13.0 → 25.14.0 and a `CHANGELOG.md` entry.
- No script or test changes.

## Decision log

- **2026-09-27** — Asked, after building `plain-words-and-verbs`: "by default this should be for non-technical people unless they ask for more details or prompted to. shouldn't be a difference between a technical and non-technical person" → chose plain words for everyone, detail only on request, and no technical level on person pages.
- **2026-09-27** — Asked how to release it, since `plain-words-and-verbs` shipped as 25.13.0 (PR #150) without this part → chose a new change on top of main, reviewed before publishing.
- **2026-09-27** — Assumed: a person who wants details every time says so once, and it goes on their person page as an ordinary preference, because that is how a person asks "from now on" and the People rules already hold preferences. It is never guessed from one message.
- **2026-09-27** — Assumed: an existing `**Technical level:**` line is ignored, not migrated, because it is one line on a wiki page; the changelog says it can be deleted.
- **2026-09-27** — Assumed: the section is renamed *Write in plain words*, and every link to it moves, because "the reader's level" no longer means anything.
- **2026-09-27** — Assumed: the changed requirements are removed and re-added under new names, because a changed requirement must keep its old scenarios, and the technical-reader ones are the point of the change.
- **2026-09-27** — Assumed: a minor release, 25.14.0, because nothing an installed repo relies on is removed.
- **2026-09-27** — Built: carried the edits over from the superseded `plain-words-and-verbs` branch onto main; also updated the proposal rule in `openspec/config.yaml` and the `reader-level` Purpose. Released as 25.14.0. Link, config, and retired-name checks and strict validation passed.
- **2026-09-27** — Saved for task 3.3: first checkpoint, pull request opened; facts stored (one preference, one superseding the old technical-level note).
