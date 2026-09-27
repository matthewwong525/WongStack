# Design

## Context

[*Write at the reader's level*](../../../.agents/skills/explore/references/asking-the-user.md#write-at-the-readers-level) already makes a report lead with the outcome, then lets "lines a skill must print" follow. `/save` §5 lists branch, commit, PR, facts, CI, preview, and one `SAVE_GATE_RESULT=` line. `/continue` §4 adds a *State* line (branch and PR) and a drift count ("7 commits on the branch…"). `/ship` Step 6 prints `merge.sh`'s `key=value` lines. `/ship`, `/apply`, and `/verify` read `/save`'s gate line when they call it; nobody reads it when a person runs `/save` alone.

The loop appears as `/explore → /plan → /apply → /save → /continue → /ship` in four places. The *Terms the agent may use* list sits in the source `wiki/README.md` only.

## Goals / Non-Goals

**Goals:**
- One owner for the report rule; each report section says which of its lines are caller-read.
- Every copy of the loop shows `/continue` as the way back in.

**Non-Goals:**
- Changing `SAVE_GATE_RESULT`, `merge.sh` output, or any script.
- Shipping the word list to installed repos.

## Decisions

- **The rule, in `asking-the-user.md`:** replace the *Lead a report with the outcome* bullet. Non-technical reader who ran the verb → the outcome and at most one link (preview, else the pull request); branch, commit, gate line, fact counts, and `key=value` lines only on request. Inside another verb → still print what the caller reads. Technical → as today. Alternative: a rule in each skill. That is three copies of one rule.
- **`/save` §5:** keep the full list for a technical reader and inside a chain, and link the rule for the rest. The gate line stays mandatory inside a chain, because `/ship` and `/verify` parse it.
- **`/continue` §4:** the drift check still runs. For a non-technical reader, *State* becomes the one link, and the drift line becomes steps left and reviewer comments; "work landed without a save" becomes *"some work isn't in the plan's checklist yet"*.
- **`/ship` Step 6:** for a non-technical reader, the outcome and the live link; `merge.sh` lines and the *Archived*, *Checkpoint*, and *Secrets* bullets move behind *ask for details*. *Checks loosened* stays, because it is a risk the person should know.
- **Loop text:** `/explore → /plan → /apply → /save → /ship`, then *"and `/continue` to pick saved work back up"*. The change-loop diagram gets `/continue` on a branch arrow into `/apply`.
- **Terms:** six bullets in the existing list, each one sentence, in the list's voice.

## Risks / Trade-offs

- [A non-technical reader misses a failing check] → the rule hides the *line*, not the *outcome*: a failed or unverified gate is the outcome, said in plain words.
- [An agent drops the gate line inside `/ship`] → the rule names the chain case, and `/save` §5 keeps it mandatory there.

## Migration Plan

Minor release, 25.11.0, above 25.10.1. `/wong-sync` brings the block line, the skill edits, and the change-loop page. Installed repos need no step.
