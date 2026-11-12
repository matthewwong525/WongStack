# Spec Delta

## ADDED Requirements

### Requirement: Recall and pull name the files behind facts

Recall SHALL end its answer with a short list of the repo files and docs that its facts are about, at most eight, each with the ids of the facts that led to it. A pull of one fact and a pull of one change SHALL show the same kind of list, and each entry SHALL be a path the same read takes. The list SHALL draw on the files a fact's change touched, a path the fact names in its own words, and, for a fact with neither, its topic's docs and code folders. A file that more facts share SHALL come earlier, and one large change SHALL NOT fill the list.

The list SHALL be worked out on each read and stored nowhere, and SHALL name only paths that exist in the current checkout: a file that moved since its change SHALL show at its current path, and a deleted one SHALL NOT show. It SHALL be built only from facts the reader may see, and SHALL send no fact to the document index or a semantic backend. It SHALL stay inside the size and time limits of the read it is part of, SHALL NOT push out a fact or a passage, and SHALL say that it is a place to start, not a full list. When the repo's history can not be read, the read SHALL still succeed, with a shorter list or none.

#### Scenario: Facts lead to the files their changes touched

- **WHEN** recall finds three facts from three shipped changes that each touched one shared file and files of their own, and no fact names a path
- **THEN** the answer ends with a files list that has the shared file first with all three fact ids, names each file by its current full path, follows a file that moved since to its new path, and keeps every fact and passage the answer had without it

#### Scenario: The history can not be read

- **WHEN** the checkout has no readable history for a fact's change
- **THEN** recall succeeds as it would without the list, and the list holds what the fact's own words or its topic give, or is absent
