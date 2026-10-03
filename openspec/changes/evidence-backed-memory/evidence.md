# Implementation evidence

The implementation was checked remotely at `a2f016c3646ca0d60b4d50934a2ff4a27e6e0b1b` on 2026-10-03. [Payload checks](https://github.com/matthewwong525/WongStack/actions/runs/37162309843), [app tests](https://github.com/matthewwong525/WongStack/actions/runs/37162309847), and [deployment](https://github.com/matthewwong525/WongStack/actions/runs/37162309860) passed. The payload suite passed all 1,031 tests with 91.69% line coverage and 88.70% branch coverage. No checks were loosened.

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

## Example brief

This example came from the passing synthetic store test. The original fact body is unchanged. The test also confirms search/brief parity, supported filters, superseded exclusion, whole-entry UTF-8 limits, no transcript reads, and no new persistent summary writes.

```text
# Memory brief
Generated: 2026-10-03T23:37:48.935Z
Scope: {"terms":"traceable","type":"project","since":"2020-01-01","until":"2999-01-01","author":"dev","branch":"brief-branch","change":"brief-topic","state":"conversation","all":false,"everyone":false,"personal":false,"limit":1}

## Project decisions

Fact #7 · 2026-10-03T23:37:48Z · author: dev@example.com
Session evidence stays traceable.
Source session: claude:brief-live; follow up: source 7

Selected at most 20 live facts (request limit 1); 1 selected, 0 selected entries omitted to fit. Other matching facts may exist.
```

Briefs select at most 20 live facts, use at most 6,144 UTF-8 bytes, and say when selected entries were omitted. They are rendered fresh and are never saved as another memory authority. A source session ID does not grant transcript access.

## Review and release

This is a CLI/memory change; no main-app screen was added, so an app preview does not demonstrate its behavior. Review the brief above and the structured evaluation. No preview URL was returned by the existing discovery script.

Published main remained `ff05dde00fb1b7ac7de467bcf5fe9adac4b68178` when fetched for integration review; the overlapping simple-machine-memory change was not published, so no ownership changes needed reconciliation. The recorded agreement still applies if that change ships first. The minor release entry remains unnumbered and VERSION is unchanged until publication.
