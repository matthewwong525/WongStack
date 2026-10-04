# Find useful memory, with evidence and limits

**Status:** in-progress
**Branch:** `humane-dolphin`
**Open questions:** Live quality comparison is blocked by the current Claude weekly usage limit. After automated checks, the user must choose explicitly experimental delivery or leave live acceptance pending.

## Why

The assistant can remember a fact yet miss it when a question uses different words. Loading more facts can help, but it can also distract the assistant and fill its context. Keep everyday lookups fast, and offer a bounded helper when a question needs several decisions or a better search.

## What Changes

- **Keep simple lookups fast; use a helper for harder questions.** Ordinary search and the eight-fact brief keep their current behavior without another model call. For a broad or ambiguous question, the assistant can explicitly ask a helper to try better search terms and pick useful facts. The helper starts as an experiment, with no automatic loading.
  ```text
                question
                   │
          ┌────────┴────────┐
          ▼                 ▼
     simple lookup     harder question
          │                 │
          ▼                 ▼
       search         bounded helper
  ```
- **Limit what the helper reads and returns.** Code limits the helper's supplied input to 12 KiB across its calls and its returned context to 3 KiB per task handle. It gets at most three searches, two model calls, and twenty seconds per request. It returns selected facts in their own words with dates and sources, without loading whole chats or inventing new memories.
  ```text
       inspect within 12 KiB
                 │
                 ▼
         select useful fact IDs
                 │
                 ▼
     facts + sources within 3 KiB
  ```
- **Show missing evidence and stop cleanly.** Facts keep their existing permissions and replaced facts stay out. If the helper cannot run or reaches a limit, use an ordinary selection that still fits the remaining budget, when current memory can be verified. Say when results are partial, unavailable, or denied.
  ```text
      helper finishes ──▶ selected facts
              │
        cannot finish
              │
              ▼
      bounded fallback + limitation
  ```
- **Check usefulness as well as size and speed.** Compare ordinary selections of eight and twenty facts with the helper on the same questions. Record which needed facts survive, the context returned, model usage, and elapsed time. A smaller packet alone does not establish that the helper is cheaper, faster, or more useful.
  ```text
         same practice questions
                   │
          ┌────────┼────────┐
          ▼        ▼        ▼
       eight     twenty   helper
          └────────┼────────┘
                   ▼
       useful facts / usage / time
  ```

**Non-goals:** Installing Hindsight, adding another store, embeddings, relationship graphs, inferred beliefs, generated summaries or wiki pages, changing ownership or credentials, automatically reading transcripts, and changing what loads at session start. The helper's limits cover its own new reads and returns, not the main agent's entire context.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `memory`: structured search and factual briefs, plus an explicitly requested, bounded helper that reformulates searches and selects evidence; comparative retrieval evaluation.

## Impact

Keep the existing shared selector, deterministic brief, and evaluation runner. Add a controlled helper entry point, a tool-free calling-agent adapter, and budget accounting under `.agents/skills/memory/scripts/lib/`; extend `.agents/skills/memory/scripts/memory.mjs`, memory fixtures/tests, the meta-only evaluation runner, and the existing memory documentation/release note. The helper must preserve the enforced store route and caller filters. No schema migration, provider credential, app screen, or Hindsight dependency is expected. Host support requires proof that the helper cannot use tools or inherit repository instructions; unsupported hosts fall back visibly. The earlier deterministic implementation is checked; the helper extension source and assertions are prepared, awaiting a fresh remote gate and separate live acceptance.

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

- **2026-10-03** — The repaired implementation passed all 1,031 remote payload tests, app checks, deployment, strict change validation, and payload/context checks at a2f016c3646ca0d60b4d50934a2ff4a27e6e0b1b. Retained the synthetic brief and full 21-question evaluation in evidence.md and memory-evaluation.json: 13/13 regressions and 6/8 diagnostics hit, with two synonym misses and zero forbidden results. All tasks are complete; the change is ready for the user to review before publication. No main-app screen or applicable preview was added.

- **2026-10-03** — The user requested a second review for context efficiency, excess context, and latency. Review found that the 20-fact default was generous, repeated source instructions and default filter fields added overhead, and applying the byte budget in group order could omit a higher-ranked fact. Assumed: improve the existing unpublished slice with an eight-fact default, compact evidence formatting, relevance-first budget selection, and guidance to choose one read format. Keep the explicit 20-fact and 6,144-byte ceilings, source metadata, search behavior, and startup loading. Verify ordinary brief/search request-count parity remotely; report measured bytes separately from tokens and production latency.

- **2026-10-04** — Refreshed against published main 02542fa2a8c4eb8a64266cacebee00987579564d. Its independent-task-chat release overlapped only the release-note insertion; retained both entries and the published workflow changes. No memory ownership implementation was published. The context refinements and canonical brief requirement are ready for a fresh remote gate on the integrated branch.

- **2026-10-04** — Context refinements passed the complete current remote suite (1,030 tests), app/deployment checks, and payload/context checks at d3b767d345530289438fb825147ccbcdc633114b. Synthetic eight-fact outputs measured 832 bytes for text search, 1,264 for a brief, and 1,976 for JSON; twenty-fact briefs measured 2,818 bytes. Single-user requests stayed at one and team requests at two across compared formats/limits. The prior detailed one-fact example shrank from 581 to 495 bytes. Stored the current example and context-evaluation.json; the 21-question retrieval report is unchanged. No production latency or token-count claim is made. All refinements are ready for user review before publication.

- **2026-10-04** — Asked which memory retrieval approach to plan → chose selective helper: use bounded extraction for broad or ambiguous questions and keep simple lookups fast.
- **2026-10-04** — Assumed: extend this unpublished change instead of creating a second memory change, because the helper builds directly on its shared selection, factual rendering, and evaluation interfaces.
- **2026-10-04** — Assumed: use a model only for query reformulation and ordered fact selection, with code enforcing permissions, deadlines, budgets, and original-word output, because those repeated operations need no model judgment and preserve evidence without inference.
- **2026-10-04** — Assumed: start experimentally with 12,288 cumulative supplied input bytes, 3,072 cumulative returned bytes per task handle, three candidate searches, two model calls, and a twenty-second request deadline, because bounded work is the user's goal but no live evaluation establishes optimal limits yet. Provider-added instructions and actual tokens are measured separately.
- **2026-10-04** — Assumed: ordinary search and briefs remain model-free; only the explicitly selected helper may add model calls, because the latest choice extends the earlier deterministic brief rather than replacing it.
- **2026-10-04** — Assumed: exclude automatic transcript reads, reject unsupported unbounded state filtering on the helper path, and require verified tool-free host adapters, because otherwise a small final packet could hide large reads, extra context, or uncontrolled work.
- **2026-10-04** — Assumed: keep the helper explicitly experimental until live synthetic comparisons show no critical-fact loss against the comparable twenty-fact baseline and recover both existing synonym-only misses, because fixture protocol tests and smaller output do not establish model usefulness or efficiency. Failure to meet that bar leaves selective recommendation disabled and is reported.

- **2026-10-04** — Asked what to do with the selective-helper plan → chose build it now, implement and test, then review before publishing.
- **2026-10-04** — Assumed: support the verified tool-free Claude adapter and report Codex as unsupported without switching hosts, because the installed Codex controls do not establish removal of every tool. Keep selective recommendations disabled until the separately required live acceptance evidence exists. Source, assertions, and docs are prepared; earlier passing checks do not validate this extension.

- **2026-10-04** — Published main advanced to a775930044e8d77c967a136431d8d971b20809e8 (machine-owned memory v30.0.0). Integrated that release before testing the helper, retaining installation-bound access and replacing synthetic ownership assumptions rather than keeping email-based authority. Existing deterministic evidence predates this integration and does not prove the extension.
- **2026-10-04** — The installed Claude isolation probe reported empty tool, MCP, and skill lists, but its first model request was refused by the weekly usage limit (reset stated as 14:00 UTC). No live quality, latency, or token-cost comparison was obtained. Continue implementation and the remote automated gate; keep live acceptance and selective-use promotion incomplete. No publishing approval has been given.

- **2026-10-04** — First extension remote gate stopped on four lint warnings and the memory wiki page exceeding its 3,000-word cap. Correct the warnings and move the detailed extraction procedure into a linked sibling page; preserve all checks, budgets, and acceptance criteria, then rerun the gate.
