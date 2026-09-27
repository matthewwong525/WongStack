# Design

## Context

[*Write at the reader's level*](../../../.agents/skills/explore/references/asking-the-user.md) reads a `**Technical level:**` line from the current person's page and splits every plan, ask, and report into a non-technical and a technical form. `plain-words-and-verbs` (25.13.0) made the non-technical report the outcome and one link. The split is also restated in `/plan`, `/apply`, `/save`, `/continue`, `/ship`, `wong-setup/references/tools.md`, the change-loop page, `AGENTS.md`, `openspec/config.yaml`, and the People rules in `wiki/wiki-style.md`.

## Goals / Non-Goals

**Goals:**
- One rule, for everyone: plain by default, detail when asked.
- No skill or page keeps a technical branch.

**Non-Goals:**
- Changing `SAVE_GATE_RESULT`, `merge.sh` output, or any script.
- Removing `**Technical level:**` lines from installed repos' people pages.

## Decisions

- **The section:** rename to *Write in plain words* (`#write-in-plain-words`). Drop the level lookup and the *Technical* bullets. Detail comes when the person asks, for one reply or as a standing preference on their person page, never guessed from one message. Alternative: keep the level line and default it to non-technical. That is the behaviour the person rejected.
- **Reports:** the *person ran the verb* case gives the outcome and at most one link; *inside another verb* still prints the lines the caller reads. `/save` §5 lists the full lines for when asked or inside a chain; its closing next step no longer follows the gate line. `/continue` and `/ship` drop their "for a non-technical reader" qualifiers.
- **People rules:** replace the level paragraph in `wiki/wiki-style.md` with where a standing ask for detail goes.
- **Links:** every `#write-at-the-readers-level` link moves; `check-payload-links.mjs` catches a miss.
- **Specs:** remove and re-add the three requirements under new names, since the validator will not let a MODIFIED block drop the technical-reader scenarios.

## Risks / Trade-offs

- [An engineer gets less than before by default] → one "always show me the details" keeps it on their page for good.
- [A reader misses a failing check] → the rule hides the *line*, not the *outcome*: a failed or unverified gate is said in plain words.

## Migration Plan

Minor release, 25.14.0. `/wong-sync` brings the skill and page edits. An old `**Technical level:**` line is ignored and can be deleted.
