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


## 6. Isolated helper interface and task allowances

The extension source and assertions passed the remote gate recorded in [helper-evidence.md](helper-evidence.md). Earlier checked tasks retain their prior deterministic evidence. Deliver source, documentation, and meaningful assertions together; run behavioral assertions through the final remote gate in 9.2, not a local build.

- [x] 6.1 Add a tool-free calling-agent adapter under `.agents/skills/memory/scripts/lib/` and an explicit experimental `extract` entry point in `memory.mjs`. Verify supported installed Claude/Codex capabilities for disabling built-in/MCP tools, repository/skill instructions, hooks, and session persistence while preserving current authentication/model. Add host isolation assertions and a remote synthetic demonstration; unsupported configurations must fall back rather than launch unrestricted. Do not reuse the capture runner's write-capable command.
- [x] 6.2 Implement locally issued task handles and a private ephemeral ledger outside git bound to caller/repo/filter identity, with atomic reservations, twenty-four-hour expiry, no credentials/fact bodies, and deduplication of returned IDs. Enforce the cumulative 12,288-input-byte/3,072-output-byte/three-search/two-call limits and twenty-second request deadline. Cover concurrent/repeated requests, retries, missing/expired/mismatched handles, multibyte input, and output exhaustion in the final remote gate.
- [x] 6.3 Document the experimental entry point, fixed allowances, handle reuse, and distinction between helper-interface limits and total main-agent/provider context in `.agents/skills/memory/SKILL.md` and `wiki/development/memory.md`. Preserve routine search/brief defaults and startup/area hooks; do not add selective-use guidance before live acceptance. Include documentation/context/link checks in the final gate.

## 7. Bounded reads, validated selection, and fallback

- [x] 7.1 Add a bounded candidate-read mode using the shared query, filter, alias, ordering, and enforced access helpers; cap each candidate query at twenty rows and admit at most 4,096 response bytes. Reject `--all` and unbounded `--state` only on extract. Add tests for immutable caller scope, admin/member/reader visibility, tag filters, broad distractors, truthful truncation, and bounded query behavior without changing ordinary search/brief compatibility.
- [x] 7.2 Implement the two-round strict JSON protocol for ordered candidate IDs, bounded alternative queries, and fixed gap codes; buffer/cap replies and reject arbitrary instructions, unknown fields, forged IDs, escalation, and recursion. Re-read at most twenty selected IDs in one permission-enforced batch before code renders original evidence within the remaining packet allowance. Add changed/superseded/access-revoked fact cases and prove no transcripts, memory writes, credentials, or raw storage keys are exposed.
- [x] 7.3 Add process/store cancellation and bounded status reporting for selected/partial/fallback/empty/unavailable/denied results, reserving time for verification. Test unsupported host, absent auth/model, invalid JSON, oversized replies, model/store timeout, denied store, deadline exhaustion, and deterministic fallback within the same counters. A failed verification must produce no cached facts. Document unsupported filters and on-demand source behavior beside the interface.

## 8. Comparative evidence and selective-use acceptance

- [x] 8.1 Extend the synthetic evaluation fixtures and meta-only runner for direct-eight, direct-twenty, and helper modes sharing a 3,072-byte packet renderer. Freeze multi-fact/critical-fact expectations, synonym-only misses, contradictory/replaced decisions, dates, distractors, visibility, and no-answer cases before live results. Retain all prior regressions; add remote assertions for complete-set scoring, forbidden-result failure, unknown token usage, independent per-mode handles, and no real memory/credential export.
- [ ] 8.2 Add opt-in private usage reports containing application bytes, provider-reported input/output/cache tokens or unknown status, model identity, calls, store requests including probes/final verification, and end-to-end elapsed time. Exercise accounting with recorded replies remotely, labeling them protocol evidence. Run an explicitly enabled authenticated remote-host synthetic evaluation with at least twenty executions per mode; retain sample size, p50/p95, variance, failures, and quality reports in this change's evidence. No local builds or production-memory exports.
- [ ] 8.3 Compare live results to the design's acceptance bar: zero forbidden/fabricated results, all existing regressions preserved, no per-case critical-fact loss against comparable direct-twenty, and both existing synonym-only misses recovered. Only after that bar passes add concise selective-use guidance; report all additional time/token work and any direct-eight disadvantage. If evidence or acceptance is missing, keep guidance disabled and this task incomplete pending the user's explicit choice of experimental delivery; do not silently change budgets or criteria.

## 9. Extension release and integration gate

- [x] 9.1 Extend the existing single minor release entry without changing VERSION; confirm whole-folder payload inclusion of helper files. Before checkpoint reconcile then-published main and memory ownership/credentials changes, preserving current access helpers and applicable role tests. Review rollback and the unchanged deterministic/startup interfaces.
- [x] 9.2 Rebuild this plan's review page, strictly validate and reconcile spec deltas, then use /save for all named behavioral assertions, the complete remote suite/coverage, and existing payload/context checks. Retain separate current helper evidence and the earlier baseline; do not reuse old passing checks as extension evidence. Complete live acceptance or report the precise experimental-delivery decision still needed. Present the implemented result for review before publishing; no new main-app preview applies.

## Remaining live evidence

Task 8.2 reporting and recorded accounting are implemented and remotely verified; its live comparison is blocked by the installed Claude weekly limit. Task 8.3 remains incomplete and selective guidance stays disabled pending live acceptance or the user's explicit choice of experimental delivery. Nothing has been published.
