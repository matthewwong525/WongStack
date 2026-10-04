# Document retrieval

## Purpose

Let assistants find relevant original passages in the current checkout's wiki and OpenSpec records, with meaning-based search, clear source roles, fresh evidence and a usable fallback.

## Requirements

### Requirement: Document search finds local knowledge by words or meaning

The installed retrieval interface SHALL search eligible wiki and OpenSpec Markdown by keywords and, on a prepared supported host, by meaning using QMD. It SHALL return original passages with paths, headings or line ranges, source roles and freshness information, and SHALL support text and structured formats without generated summaries.

#### Scenario: A question uses different words

- **WHEN** a prepared host receives a question whose meaning matches a document without sharing its exact wording
- **THEN** semantic search can return the relevant original passage with a reference the assistant can open

#### Scenario: A keyword search is requested

- **WHEN** the assistant explicitly chooses keyword lookup
- **THEN** it receives original matching evidence without launching semantic models

### Requirement: Current guidance and historical evidence have distinct scopes

Document retrieval SHALL search reusable guidance and current recorded requirements by default. Proposed work and archived changes SHALL require explicit scope and SHALL always be identified as proposed or historical. A search score SHALL NOT establish source authority or change its role.

#### Scenario: An obsolete proposal resembles current guidance

- **WHEN** a current-only question matches an obsolete archived proposal
- **THEN** that proposal is excluded from the current-only result

#### Scenario: The user asks why a choice was made

- **WHEN** historical scope is requested
- **THEN** relevant archived evidence is eligible and identified as historical alongside any current guidance

### Requirement: Indexing stays within the current checkout

The index SHALL derive from allowlisted wiki and OpenSpec paths in the current checkout, including eligible unsaved documents. It SHALL respect ignored paths, reject links escaping the checkout, and exclude private store data, transcripts, credentials and people pages. Separate worktrees SHALL retain separate indexes outside version control.

#### Scenario: A new plan is not yet saved

- **WHEN** an eligible new active-change document exists and active scope is requested
- **THEN** lookup can find it as proposed evidence

#### Scenario: Linked worktrees contain different plans

- **WHEN** two linked worktrees contain different documents
- **THEN** each lookup returns only its own checkout's evidence without combining indexes

### Requirement: Returned passages agree with original files

Retrieval SHALL verify source existence and content before returning indexed passages. Changed, moved or deleted evidence SHALL NOT appear as current unchanged text. Document changes SHALL trigger index reconciliation; concurrent or interrupted refresh SHALL preserve a valid generation. Incomplete semantic coverage SHALL be visible and SHALL allow fresh keyword evidence.

#### Scenario: A source changes before retrieval

- **WHEN** an indexed document changes or disappears
- **THEN** its old passage is withheld, fresh eligible evidence may be returned, and incomplete index coverage is reported until refresh completes

#### Scenario: Refresh is interrupted

- **WHEN** refresh fails before publishing a complete generation
- **THEN** lookup retains its valid state, checks sources and supplies fallback rather than exposing partial index state as complete

### Requirement: Setup and failure have truthful readiness

The interface SHALL provide explicit host setup, refresh and status for pinned QMD dependencies and required models. Reads SHALL NOT install dependencies or download models. Missing, unsupported, failed or timed-out semantics SHALL produce bounded keyword fallback with a visible reason; requested semantic modes SHALL NOT be reported as successful when only fallback ran.

#### Scenario: QMD is not prepared

- **WHEN** ordinary document recall is requested before host setup
- **THEN** it returns useful keyword evidence, fallback status and setup guidance

#### Scenario: Semantic setup succeeds

- **WHEN** setup reports semantic readiness
- **THEN** the required dependency, models, index and a real query have been checked and reads can use semantic retrieval

### Requirement: Document evidence is bounded and traceable

Document search SHALL return at most five excerpts and 6,144 UTF-8 bytes including status and metadata. It SHALL identify omitted or truncated selected evidence, distinguish empty from partial or unavailable retrieval, and provide references to originals for further reading.

#### Scenario: Evidence exceeds the output budget

- **WHEN** selected evidence exceeds the packet limits
- **THEN** results fit those limits, preserve usable source references and report omissions without claiming complete recall

#### Scenario: No document matches

- **WHEN** available scoped backends complete without matching evidence
- **THEN** the response reports empty successful lookup rather than a backend failure
