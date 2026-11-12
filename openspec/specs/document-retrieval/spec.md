# Document retrieval

## Purpose

Let assistants find relevant original passages in the current checkout's wiki and OpenSpec records, by the words of a question, with clear source roles and fresh evidence.

## Requirements

### Requirement: Current guidance and historical evidence have distinct scopes

Document retrieval SHALL search reusable guidance and current recorded requirements by default. Proposed work and archived changes SHALL require explicit scope and SHALL always be identified as proposed or historical. A search score SHALL NOT establish source authority or change its role.

#### Scenario: An obsolete proposal resembles current guidance

- **WHEN** a current-only question matches an obsolete archived proposal
- **THEN** that proposal is excluded from the current-only result

#### Scenario: The user asks why a choice was made

- **WHEN** historical scope is requested
- **THEN** relevant archived evidence is eligible and identified as historical alongside any current guidance

### Requirement: Document evidence is bounded and traceable

Document search SHALL return at most five excerpts and 6,144 UTF-8 bytes including status and metadata. It SHALL identify omitted or truncated selected evidence, distinguish empty from partial or unavailable retrieval, and provide references to originals for further reading.

#### Scenario: Evidence exceeds the output budget

- **WHEN** selected evidence exceeds the packet limits
- **THEN** results fit those limits, preserve usable source references and report omissions without claiming complete recall

#### Scenario: No document matches

- **WHEN** a lookup completes without matching evidence
- **THEN** the response reports an empty successful lookup, not a failure

### Requirement: Document search finds local knowledge by its words

The installed retrieval interface SHALL search eligible wiki and OpenSpec Markdown by the words of the question. It SHALL return original passages with paths, headings or line ranges, source roles and freshness information, and SHALL support text and structured formats without generated summaries. A request for meaning-based search SHALL stop with a message that it was removed, and SHALL never fall back to keyword search without saying so.

#### Scenario: A question shares words with a page

- **WHEN** a question uses words that a wiki page uses
- **THEN** search returns that page's original passage with a reference the assistant can open

#### Scenario: Meaning-based search is asked for

- **WHEN** a caller asks for the removed semantic or deep search
- **THEN** the call stops as invalid input, says meaning-based search was removed, and returns no result

### Requirement: Returned passages match the files as they are now

Retrieval SHALL read each source at lookup time, and SHALL verify that a source exists and holds the passage before it returns the passage. Changed, moved or deleted text SHALL NOT appear as current text. Retrieval SHALL keep no stored index of document content between lookups.

#### Scenario: A source changes before retrieval

- **WHEN** a page changes or is deleted, and a lookup follows
- **THEN** the lookup returns the page's new text or leaves the page out, and never its old text

#### Scenario: A source changes during a lookup

- **WHEN** a page changes after it was ranked and before it is returned
- **THEN** its stale passage is withheld, and the response reports partial coverage with its reason

### Requirement: Document search needs no setup

Document search SHALL work in a fresh checkout with only git and the Node version the repo names, on Linux, macOS and Windows. It SHALL install no dependency, download no model, and write nothing outside the checkout. A lookup that cannot finish within its time SHALL return the evidence it has, marked partial with a visible reason.

#### Scenario: A fresh clone on Windows

- **WHEN** document search runs in a new checkout on a Windows computer with nothing installed but git and Node
- **THEN** it returns original matching passages, and no folder is created outside the checkout

#### Scenario: The scan runs out of time

- **WHEN** the document scan cannot finish within the lookup's deadline
- **THEN** the response holds the verified passages found so far and says that coverage is partial

### Requirement: Document search reads only the current checkout

Each lookup SHALL read only allowlisted wiki and OpenSpec paths in the current checkout, including eligible unsaved documents, and the pages in the computer's knowledge copy, labeled as company knowledge. It SHALL respect ignored paths, reject links escaping the checkout other than the knowledge copy itself, and exclude private store data, transcripts, credentials and people pages, in `wiki/` and in `knowledge/`. A lookup in one worktree SHALL NOT read the documents of a different worktree.

#### Scenario: A new plan is not yet saved

- **WHEN** an eligible new active-change document exists and active scope is requested
- **THEN** lookup can find it as proposed evidence

#### Scenario: Linked worktrees contain different plans

- **WHEN** two linked worktrees contain different documents
- **THEN** each lookup returns only its own checkout's evidence

#### Scenario: A knowledge page answers the question

- **WHEN** a question matches `knowledge/ops/shipping.md`
- **THEN** lookup returns its passage labeled as company knowledge, and no `knowledge/people/` page appears
