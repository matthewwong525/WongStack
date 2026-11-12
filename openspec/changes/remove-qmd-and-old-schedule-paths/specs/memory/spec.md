# Memory

## MODIFIED Requirements

### Requirement: Recall combines sources without combining authority

Memory SHALL offer a bounded recall response containing authorized live facts and local document evidence, identified separately and written in their original words. Fact reads SHALL preserve existing permissions, private scope and source access. Fact bodies and transcripts SHALL NOT be searched as documents. Documents SHALL remain available independently of fact authorization, with failures reported per source.

#### Scenario: Both sources contribute context

- **WHEN** recall finds an authorized fact and a relevant wiki passage
- **THEN** both appear with their own identifiers or references under a shared budget without duplicate fact rendering

#### Scenario: Fact memory is denied

- **WHEN** fact access is denied but eligible checkout documents are available
- **THEN** recall returns documents and a denied fact-source state without hidden facts, hidden IDs or borrowed credentials

### Requirement: Recall and pull name the files behind facts

Recall SHALL end its answer with a short list of the repo files and docs that its facts are about, at most eight, each with the ids of the facts that led to it. A pull of one fact and a pull of one change SHALL show the same kind of list, and each entry SHALL be a path the same read takes. The list SHALL draw on the files a fact's change touched, a path the fact names in its own words, and, for a fact with neither, its topic's docs and code folders. A file that more facts share SHALL come earlier, and one large change SHALL NOT fill the list.

The list SHALL be worked out on each read and stored nowhere, and SHALL name only paths that exist in the current checkout: a file that moved since its change SHALL show at its current path, and a deleted one SHALL NOT show. It SHALL be built only from facts the reader may see, and SHALL NOT pass a fact to document search. It SHALL stay inside the size and time limits of the read it is part of, SHALL NOT push out a fact or a passage, and SHALL say that it is a place to start, not a full list. When the repo's history can not be read, the read SHALL still succeed, with a shorter list or none.

#### Scenario: Facts lead to the files their changes touched

- **WHEN** recall finds three facts from three shipped changes that each touched one shared file and files of their own, and no fact names a path
- **THEN** the answer ends with a files list that has the shared file first with all three fact ids, names each file by its current full path, follows a file that moved since to its new path, and keeps every fact and passage the answer had without it

#### Scenario: The history can not be read

- **WHEN** the checkout has no readable history for a fact's change
- **THEN** recall succeeds as it would without the list, and the list holds what the fact's own words or its topic give, or is absent

## REMOVED Requirements

### Requirement: Recall has bounded output and independent readiness

**Reason**: Its second scenario covers slow semantic work, and meaning-based search is removed.

**Migration**: *Recall has bounded output and a deadline* replaces it with the same limits; the slow case is now a slow document scan.

## ADDED Requirements

### Requirement: Recall has bounded output and a deadline

Recall SHALL select at most eight whole facts and five document excerpts within 6,144 UTF-8 bytes including status and metadata, and SHALL complete or return explicit partial status within twenty seconds. Startup digest generation and pre-edit loading SHALL NOT run document search. Agents SHALL receive concise task-directed recall guidance while direct fact and area lookups remain available.

#### Scenario: Both sources exceed the budget

- **WHEN** matching facts and documents exceed the shared allowance
- **THEN** recall reserves room for both available source kinds, keeps whole fact bodies, preserves source pointers and identifies omissions

#### Scenario: The document scan is slow

- **WHEN** the document scan cannot finish within the deadline
- **THEN** it stops and returns the verified facts and passages it has, with a visible limitation, without delaying startup hooks
