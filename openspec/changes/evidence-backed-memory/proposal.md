# See what memory finds, with evidence

**Status:** in-progress
**Branch:** `humane-dolphin`
**Open questions:** none

## Why

The assistant can remember a fact yet miss it when a question uses different words. Before adding a more complex memory system, make those misses measurable and give the assistant a short brief it can trace back to the facts behind it.

## What Changes

- **See which questions memory answers and which it misses.** A repeatable report checks ordinary questions, different wording, changed decisions, and questions with no answer. Existing guarantees keep passing; harder questions show where a later improvement would help.
  ```text
  practice facts + questions
              │
              ▼
       today's memory search
              │
              ▼
     found / missed / wrong result
  ```
- **Ask for a brief with evidence attached.** The brief selects current facts on the requested topic, groups them by kind, and shows their dates and sources. It uses the facts' own words, without an extra model call or new conclusions.
  ```text
  topic ──▶ facts you may read
                     │
                     ▼
               bounded brief
              /      │      \
           fact     date    source
  ```
- **Keep briefs current and private.** Each request reads current memory and excludes replaced facts. A short brief says when it was made and when its selection is limited; following a source still obeys the source's own permissions.
  ```text
  old fact ──▶ replaced ──▶ left out
  live fact ─▶ allowed  ──▶ brief
  private source ────────▶ permission check
  ```

**Non-goals:** Installing Hindsight, adding another store, embeddings, relationship graphs, inferred beliefs, saved/generated wiki pages, changing ownership or credentials, and changing what loads automatically at session start.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: a bounded, read-only evidence brief and structured search results for repeatable retrieval evaluation.

## Impact

Add a small brief renderer and a shared fact-selection helper under `.agents/skills/memory/scripts/lib/`; adapt `.agents/skills/memory/scripts/memory.mjs` without changing default search output. Extend the existing search fixtures and tests, add a source-repo evaluation runner, and update memory documentation plus a minor release entry. No schema migration, new database, provider credential, app screen, or runtime dependency is expected. Estimated scope: about 8–10 implementation, test, and documentation files beyond these planning artifacts.

## Decision log

- **2026-10-03** — Asked what to do after comparing Hindsight and WongStack → chose to plan WongStack improvements, keep the current store, and scope a first change.
- **2026-10-03** — Asked how the first memory summary should work → chose selected facts with their sources, fast and predictable, with no extra model call.
- **2026-10-03** — Assumed: evaluation and the brief form one first change, because the report tests the same selection behavior the brief exposes and neither adds a second memory authority.
- **2026-10-03** — Assumed: measure semantic misses without adding embeddings yet, because the live store has 545 facts and its existing embeddings trigger is not met; this first change supplies evidence for a later decision.
- **2026-10-03** — Assumed: use deterministic selection, grouping, and source pointers, because the user chose factual briefs and these repeated operations need no model judgment.
- **2026-10-03** — Assumed: preserve all current search regression assertions and report harder diagnostic cases separately, because measuring a known limitation must not weaken a shipped guarantee.
- **2026-10-03** — Assumed: ownership stays outside this change. The owner of simple-machine-memory, chat bd36a0dc-c9d5-4b27-9cb8-685dbe1a4dd0, confirmed compatible boundaries through Paseo: this change owns retrieval evaluation and the brief; theirs owns identity, ownership, and credentials. Either may publish first; the later publisher reconciles shared files and reruns relevant checks. The agreement grants no building or publishing approval.
- **2026-10-03** — Asked what to do with the finished plan → chose build it now and review the result before publishing.
- **2026-10-03** — Assumed: build source, tests, and docs together, then execute all named checks at one final remote gate, because repeating a full checkpoint after each small code task adds no coverage. Every planned assertion stays required and validation-dependent tasks remain unchecked until the gate passes.
- **2026-10-03** — Assumed: checkpoint the completed implementation with validation-dependent tasks still unchecked, because syntax/static review is not behavioral evidence. Published main remains ff05dde00fb1b7ac7de467bcf5fe9adac4b68178 and contains no simple-machine-memory changes to reconcile. Shared selection, structured results, bounded original-fact briefs, synthetic evaluation, role tests, docs, and the minor release entry are ready for the remote gate.
- **2026-10-03** — The first remote gate failed five new assertions: four stopped because the synthetic evaluation had not created its temporary state directory; one incorrectly forbade a reader from seeing their own unshared fact. Create the isolated directory before seeding, and assert both owner access and teammate denial explicitly. Existing retrieval and brief assertions passed; rerun the full remote gate after these repairs.
