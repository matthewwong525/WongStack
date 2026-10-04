# Earlier deterministic implementation evidence

These measurements predate the helper and machine-ownership integration. See [current helper evidence](helper-evidence.md) for the integrated gate and remaining live comparison.

The refined implementation was checked remotely at `d3b767d345530289438fb825147ccbcdc633114b` on 2026-10-04, integrated with published main `02542fa2a8c4eb8a64266cacebee00987579564d`. [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37163560323), [app tests](https://github.com/matthewwong525/WongStack/actions/runs/37163560313), and [deployment](https://github.com/matthewwong525/WongStack/actions/runs/37163560378) passed. All 1,030 tests in the current payload suite passed, with 91.66% line and 88.67% branch coverage. No checks were loosened.

The first checkpoint exposed two mistakes in the new tests/runner: the runner needed to create its temporary state directory before seeding, and the reader assertion needed to allow its owner's unshared fact while denying other people's personal facts. Both were repaired before the passing run.

## Initial search baseline

These are synthetic facts and questions, queried through the real CLI against the existing migrated SQLite fixture service. No production facts or credentials were used. The [complete structured report](memory-evaluation.json) records expected keys, ranks, returned keys, unexpected keys, and forbidden results for all 21 questions.

| Cases | Top-three hits / questions | Misses | Unexpected results | Failures |
| --- | --- | --- | --- | --- |
| regression: literal/word-form | 12/12 | 0 | 15 | 0 |
| regression: no-answer | 1/1 | 0 | 0 | 0 |
| diagnostic: paraphrase | 0/2 | 2 | 3 | 0 |
| diagnostic: changed decision | 1/1 | 0 | 0 | 0 |
| diagnostic: time filter | 2/2 | 0 | 0 | 0 |
| diagnostic: visibility | 2/2 | 0 | 0 | 0 |
| diagnostic: no-answer | 1/1 | 0 | 0 | 0 |

All 13 existing regression questions passed. Six of eight additional diagnostic questions hit; both synonym-only questions missed. “Validate each endpoint in staging” missed the expected route-probe fact and returned three unexpected facts. “Concise language please” returned no result. These are measured keyword limitations, not improvements to retrieval accuracy. An unexpected result means it is outside that question's declared expected set; it is not automatically a permission failure.

Regression misses and any forbidden result fail the report; ordinary diagnostic misses stay visible without failing. The evaluator measures admin-default and explicit everyone scope. Separate Worker integration tests enforce member and reader access, even when they request everyone, and cover private fact identifiers, owner access, invalid credentials, and shared facts whose transcripts remain private.

Date cases filter when a fact was recorded, not an extracted event date. This small synthetic baseline does not establish real-world semantic retrieval quality.

## Current example brief

This example came from the passing synthetic store test. The original fact body is unchanged. The test also confirms search/brief parity, supported filters, superseded exclusion, whole-entry UTF-8 limits, no transcript reads, and no new persistent summary writes.

```text
# Memory brief
Generated: 2026-10-04T00:01:59.754Z
Scope: {"terms":"traceable","type":"project","since":"2020-01-01","until":"2999-01-01","author":"dev","branch":"brief-branch","change":"brief-topic","state":"conversation"}
Source: source <fact-id>

## Project decisions

Fact #7 · 2026-10-04T00:01:59Z · author: dev@example.com · session: claude:brief-live
Session evidence stays traceable.

Limit 1 live facts; 1 selected, 0 selected entries omitted to fit. Other matching facts may exist.
```

Briefs select eight live facts by default, up to twenty on explicit request, use at most 6,144 UTF-8 bytes, and say when selected entries were omitted. They are rendered fresh and are never saved as another memory authority. A source session ID does not grant transcript access.

## Context and latency review

The [structured context measurements](context-evaluation.json) come from the same passing run. The fixture contains 25 short facts about one topic; format comparisons use the same eight selected facts. These are UTF-8 bytes, not model tokens or a general relevance benchmark.

| Format | Selected facts | Output bytes | Single-user D1 requests |
| --- | --- | --- | --- |
| Ordinary text search | 8 | 832 | 1 |
| Structured JSON search | 8 | 1,976 | 1 |
| Default brief | 8 | 1,264 | 1 |
| Expanded brief | 20 | 2,818 | 1 |
| Narrow brief | 1 | 354 | 1 |

The eight-fact default uses 55% fewer bytes than the expanded twenty-fact brief in this fixture. A brief still uses 52% more bytes than plain search for the same facts because it includes evidence metadata. The separately captured one-fact example with many filters shrank from 581 to 495 bytes (15%) while preserving its 33-byte fact body and attribution.

Team-mode text search, the default brief, and the twenty-fact brief each make two D1 requests, including the existing reader-schema probe. Neither mode adds per-fact queries or transcript reads. No production wall-clock latency or model token counts were measured. The startup hook does not call the new brief renderer and adds no automatic brief context.

The byte-budget regression uses valid multibyte fact bodies and proves that the highest-ranked reference survives even though references display after threads. Admission now uses retrieval order; grouping only arranges already admitted entries. All original body, permission, whole-entry size, and source-access guarantees remain covered.

Use one format per unchanged query: text search for routine recall, a brief when source evidence helps, and JSON for programs. Follow source pointers on demand; the existing source command can return up to 200,000 characters. The inherited `--state` path still reads all matching rows before applying checkout-derived state and the result limit, so its large-store latency can differ from ordinary bounded queries. Both are documented limitations, not additional work automatically performed by briefs.

## Review and release

This is a CLI/memory change; no main-app screen was added, so an app preview does not demonstrate its behavior. Review the brief above and the structured evaluation. The shared app preview is linked from the pull request; it does not demonstrate this CLI behavior.

Published main `02542fa2a8c4eb8a64266cacebee00987579564d` was merged for this review, preserving its workflow release and resolving the release-note insertion. It contains no overlapping memory ownership implementation. Any later published ownership change still needs integration review before this change ships. The minor release entry remains unnumbered and VERSION is unchanged until publication.
