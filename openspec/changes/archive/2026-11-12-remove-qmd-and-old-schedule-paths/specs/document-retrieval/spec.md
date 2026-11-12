# Document retrieval

## REMOVED Requirements

### Requirement: Document search finds local knowledge by words or meaning

**Reason**: Meaning-based search (QMD) is removed. No computer in use had it set up, and its own test showed one more answer in eight at 8 to 10 seconds a search and about 1 GB a computer.

**Migration**: *Document search finds local knowledge by its words* replaces it. A caller needs no change; a question finds a page when it shares words with the page.

### Requirement: Returned passages agree with original files

**Reason**: Without an index there is no refresh, no stored generation, and no semantic coverage to report.

**Migration**: *Returned passages match the files as they are now* replaces it and keeps the promise that changed, moved, or deleted text never shows as current.

### Requirement: Setup and failure have truthful readiness

**Reason**: Search has no setup, no dependency, and no model, so there is no readiness to report.

**Migration**: *Document search needs no setup* replaces it. A computer that set QMD up can delete the folder the update note names; nothing reads it.

### Requirement: Indexing stays within the current checkout

**Reason**: Search keeps no index, so there is no index to keep within a checkout or to keep apart for each worktree.

**Migration**: *Document search reads only the current checkout* replaces it and keeps each promise about which pages a lookup can read. A caller needs no change.

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Document evidence is bounded and traceable

Document search SHALL return at most five excerpts and 6,144 UTF-8 bytes including status and metadata. It SHALL identify omitted or truncated selected evidence, distinguish empty from partial or unavailable retrieval, and provide references to originals for further reading.

#### Scenario: Evidence exceeds the output budget

- **WHEN** selected evidence exceeds the packet limits
- **THEN** results fit those limits, preserve usable source references and report omissions without claiming complete recall

#### Scenario: No document matches

- **WHEN** a lookup completes without matching evidence
- **THEN** the response reports an empty successful lookup, not a failure
