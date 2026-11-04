# Spec Delta

## MODIFIED Requirements

### Requirement: Indexing stays within the current checkout

The index SHALL derive from allowlisted wiki and OpenSpec paths in the current checkout, including eligible unsaved documents, and from the pages in the computer's knowledge copy, labeled as company knowledge. It SHALL respect ignored paths, reject links escaping the checkout other than the knowledge copy itself, and exclude private store data, transcripts, credentials and people pages, in `wiki/` and in `knowledge/`. Separate worktrees SHALL retain separate indexes outside version control.

#### Scenario: A new plan is not yet saved

- **WHEN** an eligible new active-change document exists and active scope is requested
- **THEN** lookup can find it as proposed evidence

#### Scenario: Linked worktrees contain different plans

- **WHEN** two linked worktrees contain different documents
- **THEN** each lookup returns only its own checkout's evidence without combining indexes

#### Scenario: A knowledge page answers the question

- **WHEN** a question matches `knowledge/ops/shipping.md`
- **THEN** lookup returns its passage labeled as company knowledge, and no `knowledge/people/` page appears
