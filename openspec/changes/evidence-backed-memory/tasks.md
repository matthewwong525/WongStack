# Tasks

Code tasks deliver their implementation and the named assertions together. Execute those assertions once through the final remote gate in 4.3; validation-dependent boxes remain unchecked until that gate passes. This batches verification without dropping any planned check.

## 1. Shared fact reads and structured search

- [x] 1.1 Extract the existing selection logic into `.agents/skills/memory/scripts/lib/read-facts.mjs` and add opt-in `search --json` in `.agents/skills/memory/scripts/memory.mjs`; preserve default text output and all existing filters, and add JSON/text ID parity and tied-order assertions to `scripts/tests/memory-store.test.mjs` for the final gate.
- [x] 1.2 Cover admin-default scope, explicit `--everyone`, member/reader-private facts, superseded exclusions, branch/change/state limits, and no raw keys/transcripts in both formats using the existing store and Worker fixtures; retain every existing assertion for the final gate.
- [x] 1.3 Document the structured output and its source-pointer limits in `.agents/skills/memory/SKILL.md` and `wiki/development/memory.md`; compare examples to the implemented interface and include payload link checks in the final gate.

## 2. Read-only evidence brief

- [x] 2.1 Add `.agents/skills/memory/scripts/lib/brief.mjs` and scoped `brief` dispatch using the shared selector; add synthetic assertions for original fact bodies, supported filters, grouping, dates, source-session absence, and source follow-up IDs for the final gate.
- [x] 2.2 Cover whole-entry UTF-8 byte limits, truthful bounded-selection reporting, empty/unavailable/denied results, no persistent writes or transcript fetches, and no private identifiers exposed by broadened requests; include these behavioral tests and existing source/no-R2 permission tests in the final gate.
- [x] 2.3 Add brief usage and explain its factual, uncached nature in the existing memory docs, keeping startup behavior and ownership conventions intact; verify a synthetic example matches the documented output and instruction additions fit the context budget.

## 3. Retrieval evaluation and baseline evidence

- [x] 3.1 Extend `scripts/tests/fixtures/memory-search-questions.json` with separately classified diagnostic cases and explicit expected/forbidden fixture IDs while retaining every existing regression case; include synonym-only questions, distractors, corrected decisions, date filters, visibility, and no-answer examples for the final gate.
- [x] 3.2 Add meta-only `scripts/evaluate-memory-search.mjs` using the existing synthetic migrated fixture store and structured CLI results; emit text/JSON ranks, top-three hits, unexpected results, and category totals, and add focused assertions for no production credential/store access plus cleanup on success/failure for the final gate.
- [x] 3.3 Test regression failure, diagnostic miss reporting, forbidden-result failure, and CLI/infrastructure failure without adding skips or weakening checks; verify diagnostic misses are visibly counted and do not imply semantic retrieval succeeded.
- [x] 3.4 Document how to interpret the evaluation in `wiki/development/memory.md`, keeping the existing embeddings trigger; compare the description to the runner's result classifications. The initial remote report is obtained in 4.3.

## 4. Release and integration checks

- [x] 4.1 Add one `## Next (minor)` entry to `CHANGELOG.md` with a plain updating note and leave `VERSION` unchanged; inspect the existing whole-folder memory payload for inclusion of the new helpers and include release/link/config checks in the final gate.
- [x] 4.2 Before checkpoint/publish, reconcile any published `simple-machine-memory` changes in shared files under the recorded ownership agreement; compare selection/source calls to the then-current main version and include its applicable permission tests in the final gate.
- [x] 4.3 Validate this change strictly, rebuild the review page if the proposal changed, and use `/save` for every named behavioral test, the complete remote suite, coverage, and payload checks; obtain and retain the initial synthetic brief example and evaluation report in this change's implementation evidence, without claiming retrieval accuracy improved, and state that no main-app preview applies.

## 5. Context and latency review

These refinements extend the existing unpublished change. Deliver code, docs, and assertions together; leave validation-dependent boxes unchecked until the single remote gate in 5.4.

- [x] 5.1 Default briefs to eight facts while retaining explicit limits up to twenty and the 6,144-byte ceiling; admit whole entries in retrieval order before grouping, compact repeated evidence labels/source instructions and unused scope fields, and retain original bodies and all promised attribution/source metadata.
- [x] 5.2 Add meaningful regression coverage for a highest-ranked fact in a later display group surviving a tight byte budget, default eight/explicit twenty selection, compact output, and ordinary brief/search D1 request-count parity with no per-fact or transcript fetch. Update existing format assertions to retain their guarantees and emit synthetic context-size/request-count diagnostics plus the current brief example for the final gate. Do not add timing thresholds or claim production latency from fixtures.
- [x] 5.3 Update the memory skill, wiki, release note, and this change's design/specs to explain the smaller default, relevance-first budget, and choosing one format: routine text search, brief when evidence is useful, JSON for programmatic callers. Preserve the context instruction budget. Keep all changes within the current unpublished slice, with no merge or new startup loading.
- [x] 5.4 Strictly validate, reconcile the changed spec, and run /save for the remote suite and existing payload/context checks. Record updated synthetic bytes and request counts beside the prior baseline, distinguish the unchanged search diagnostics from this context improvement, and mark ready for user review after the gate passes.
