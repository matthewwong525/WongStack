## ADDED Requirements

### Requirement: The wiki's links are checked on every run

Every repo's test workflow SHALL check `wiki/` on every run, docs-only runs included, and fail when a link to a file in the repo points nowhere, when a page other than the root hub is linked from no other wiki page, or when a section's hub does not link one of its pages or subfolders. The failure SHALL name each page and link.

#### Scenario: A page nobody links to

- **WHEN** an install's wiki save adds `wiki/customers/acme.md` and no wiki page links to it
- **THEN** the check fails naming that page, and the save does not publish until a page links it
