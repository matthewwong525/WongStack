# Company actions an assistant can use without guessing

**Status:** ready-to-ship
**Branch:** agent-friendly-api
**Open questions:** none

## Why

An assistant using a company action today has to guess in five places: what was wrong with its input, which words find an action, what each input means, how to check a write that timed out, and whether a call failed. Each guess costs a wasted try, and a wrong guess on a write can do the work twice.

## What Changes

- **A bad input says which part is wrong and why.** Today the answer is only "Invalid input". Now it lists each wrong input by name with the reason, so the assistant fixes it on the next try.
  ```text
    BEFORE              AFTER
  ┌───────────────┐   ┌──────────────────────┐
  │ Invalid input │   │ Invalid input        │
  └───────────────┘   │ +quantity: expected  │
   guess and retry    │  a number, got text  │
                      └──────────────────────┘
                       fix it, one retry
  ```
- **Search finds an action by its words, in any order.** Today "look up order" finds nothing unless an action uses that exact phrase. Now an action is found when every word appears somewhere in its name or description.
- **Every input of an action must say what it is. BREAKING.** A new action whose input has no one-line description fails the checks, naming the action and the input. An existing action without them fails the same way until each input gets its line.
- **A write can name the action that confirms it.** When a write times out, nobody knows whether it happened. The action that changes something can now name the read action that shows the result, and the assistant is told to run that one before trying again.
- **A failed call is reported as a failure.** Today the assistant's helper prints the error but reports success, so a script carries on. Now a call that returns an error ends as failed. BREAKING for a script that relied on the old result.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `company-api`: an input error names each failing input; every input of a described action carries a description; a write may name the read that confirms it.
- `agent-api-discovery`: catalogue search matches words in any order; the helper ends a failed call as failed and names the confirming read after an uncertain write.

## Impact

- `app/worker/api/contract.ts`, `app/worker/api/discovery.ts`, `app/worker/apps/hello/greeting.ts` and their tests.
- `.agents/skills/memory/scripts/lib/operations.mjs` (shared catalogue search), `.agents/skills/memory/scripts/operations.mjs`, `scripts/company-api.mjs`, `scripts/employee-bootstrap.mjs` and their tests.
- `wiki/stack/company-api.md`, `CHANGELOG.md` (`major`: two behaviors an install may rely on change).
- No new dependency, no data change.

## Non-goals

No change to who may see or call an action, to the OpenAPI file's examples, to result size limits, or to the memory reads' own inputs. No automatic retry of a write, with or without a confirming read.

## Decision log

- **2026-10-05** — Asked which of the weak spots found in the review to fix → chose the first five, built and published in one go.
- **2026-10-05** — Assumed: search needs every word to appear, not any word, because a short word such as "a" appears in every description and would match everything.
- **2026-10-05** — Assumed: the description rule covers an action's top-level inputs only, because those are what an assistant fills in first and nested shapes vary too much for one simple rule.
- **2026-10-05** — Assumed: the description rule fails at the same point as the existing rules for an action's shape, because the checks already stop a bad action there before it is published.
- **2026-10-05** — Assumed: naming a confirming read is optional, because some writes, such as sending a message, have nothing to read back.
- **2026-10-05** — Assumed: the confirming read is named only to a person who may see it, because the list never shows an action a person has no access to.
- **2026-10-05** — Assumed: this is a `major` release, because an install's existing action without input descriptions fails its checks until they are added, and a script that read a failed call as success changes result.
- **2026-10-05** — Assumed: the unpublished work in another workspace that edits the same two files (`key-levels-in-access`) needs no ask, because it changes who may use a saved key, not how an action is described or answered.
- **2026-10-05** — Assumed: the employee setup file's recorded fingerprint is renewed in this change, because the helper it points to changed and the setup link refuses a file that does not match; the plan had missed it.
- **2026-10-05** — Archive checkpoint: all tasks done, local checks passed, numbered 32.0.0; the automatic checks decide.
- **2026-10-05** — Assumed: the Worker sets its English error wording itself, because the preview check showed the published build dropping it, so a misspelled input still read only "Invalid input".
