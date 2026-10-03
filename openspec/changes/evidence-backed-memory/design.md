# Design

## Context

See `proposal.md` for the motivation and user choices. The current CLI selects live facts through FTS5, optional tag aliases, and filters in `.agents/skills/memory/scripts/memory.mjs`. Its Worker enforces visibility independently of client-side defaults; `personalFilter` also keeps the admin's normal view narrow. `source <id>` retrieves a transcript only when permitted and available. The digest has a separate role and stays unchanged.

The source repo already has `scripts/tests/fixtures/memory-search-questions.json` and a top-three regression test in `scripts/tests/memory-store.test.mjs`. Those questions primarily test word forms and overlapping terms. A test can pass without demonstrating retrieval of a question that shares no meaningful words with its answer.

Hindsight's [observations](https://hindsight.vectorize.io/developer/observations) and [mental models](https://hindsight.vectorize.io/developer/mental-models) inspired evidence traceability and prepared context. This slice deliberately uses selected original facts, following the user's choice; it does not implement synthesized observations or persistent mental models.

## Goals / Non-Goals

Make search results reusable for a factual brief and reproducible measurement. Keep one access-filtered read path and unchanged human-readable search defaults. There is no app screen, new store, schema, background model task, startup injection, or summary cache in this change.

## Decisions

### Share selection, preserve the interface

Extract the existing search selection into `scripts/lib/read-facts.mjs` inside the memory skill, keeping FTS query construction, tag alias expansion, state/branch/change behavior, personal filtering, and ordering together. Add an ID tie-breaker for equal ranks and dates so seeded evaluations are repeatable. Keep the current text output of `search` unchanged and add opt-in `search --json` with a versioned envelope containing selected facts and effective filters. Include fact ID, original body, type, slug, author, creation date, source session ID when present, and state. Do not include credentials, raw object keys, or transcripts. The JSON output uses the same access-filtered results as text, not an independent export query.

Share the selector with `brief <terms> [filters]`. Terms may be omitted when a supported filter specifies the requested scope. An entirely unscoped brief is rejected with guidance to name a topic or filter. Support the existing search filters except `--all`; the brief always selects live facts. The admin's explicit `--everyone` retains its existing meaning, and cannot widen a member's view. Reuse the current trusted store route rather than introducing another data access layer.

Alternative: parse text search lines. Rejected because bodies and formatting are data, not a reliable structured interface; it would make both measurement and citations fragile. Alternative: a separate summary query. Rejected because its filters could drift from search or the store's ownership rules.

### Build the brief without inference or persistence

Add a small pure renderer in `scripts/lib/brief.mjs`. Fetch at most 20 matching facts using search's rank/date ordering, then group the selected records into open threads, feedback, project decisions, user facts, and references, preserving selection order inside each group. Empty groups disappear. Preserve each fact's original body; a heading is not a new assertion about the facts.

Each entry includes its fact ID, creation date, author, source session ID or an explicit absence, and the `source <id>` follow-up. This is a navigable pointer, not a promise that the reader can open the underlying transcript. Do not join or fetch raw transcripts while building a brief. A visible team fact can have a private source; the existing source command decides access when asked.

Render at most 6,144 UTF-8 bytes, including headers and the footer. Keep whole entries, and reserve room for the footer before accepting another entry. The header shows the topic/filters and generation time. The footer states the 20-fact selection bound and how many selected entries were omitted to fit; it must not claim to know how many other matching facts exist. An empty successful read says no matching live facts, while unavailable or denied memory is reported as such, never as an empty or complete brief. No cache fallback is added.

Alternative: model-generated synthesis with stored supporting IDs. Deferred by the user's choice; it would require validation of inference, refresh rules, and an additional write/visibility contract. Alternative: rewrite the wiki or replace the digest. Rejected because those surfaces have different ownership and loading rules.

### Evaluate behavior rather than parse prose

Keep every existing regression question and assertion. Extend its fixture with optional classification and separate diagnostic questions; existing consumers must continue to read their original required questions unchanged. Cases use synthetic facts with stable fixture keys, query/filter inputs, expected allowed IDs or an empty answer, and categories: literal/word-form, paraphrase, changed decision, time filter, visibility, and no-answer. Include genuine synonym-only questions, competing distractors, superseded facts, and hidden facts; do not label stemmed matches as semantic success.

Add a meta-only `scripts/evaluate-memory-search.mjs` runner, backed by the existing migrated test store/harness. It reads structured production CLI results and prints per-question target rank, found-in-top-three, unexpected result IDs, and category totals. It supports a JSON report and uses synthetic identifiers only. It must not read this repo's credentials, connect to production, export real memory, or write fixtures to the live store. Clean up its temporary fixture resources on completion or failure.

The report distinguishes `regression` cases, which gate compatibility, from `diagnostic` cases, which expose current semantic limitations. A diagnostic miss is measured, not silently declared passing. Any unexpected hidden or superseded fact, infrastructure failure, or required regression failure fails the run. CI tests exercise the runner and brief through the existing test suite without changing check settings or dropping old cases. Record the initial category results in the change's implementation evidence after `/save`; this plan does not claim measured accuracy yet.

### Keep access and ownership in their owning change

The owner of `simple-machine-memory` confirmed the split through Paseo. Its private-owner/credential work and this selector/brief work can publish in either order. This change must call the shared selection and access helpers in whichever published version exists; it must not hard-code email or machine IDs as a new authorization rule. Tests cover the currently published role model and are reconciled against any intervening ownership release. No dependency on the cancelled installation-owned-memory-devices work is introduced.

## Risks / Trade-offs

- Keyword misses still remain → the brief states its selection limits and the diagnostic report measures misses; this release makes no semantic-search claim.
- Grouping could hide search relevance → select by existing relevance first, then group only those selected facts.
- A valid citation may point to an unavailable/private transcript → identify the fact and session without exposing raw bytes; source reads keep their current denial/no-R2 behavior.
- A shared-file refactor could alter search behavior → preserve all existing assertions and compare JSON/text IDs, filters, and ordering in the existing fixtures.
- Private facts could leak through a new output shape → use the enforced read path, test both formats and the brief with roles, and prohibit transcript retrieval during rendering.

## Migration Plan

No migration or provisioning is needed. Ship the CLI additions and docs as a minor payload release. The memory skill folder is already included as a whole; confirm the payload manifest behavior rather than adding a new per-file registry. Leave `VERSION` to `/ship`. Reverting these additions removes the new read interfaces without changing stored facts, sessions, credentials, or transcripts.

## Validation

Implementation coverage belongs in the existing memory store/Worker tests plus focused evaluation/brief tests where needed. Verify exact source IDs and bodies, stable grouping, UTF-8 caps, no replaced facts, no broadening by `--everyone`, reader-private facts, missing/denied transcripts, no-R2 operation, offline reporting, and JSON/text parity. The evaluation runner must classify a real synonym miss, reject a seeded forbidden result, and fail clearly on a CLI error.

Use `/save` for the remote script suite, coverage, and payload checks, including link/config/context checks; do not loosen checks. No main-app screen changes are planned, so there is no app preview. At implementation completion, demonstrate the brief with synthetic permitted facts and retain the evaluation report alongside the change. Planning runs only artifact validation and review-page generation. Review page: [review.html](review.html).
