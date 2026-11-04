# Spec Delta

## MODIFIED Requirements

### Requirement: /close updates the wiki
`/close` SHALL read the facts recorded in this session, on its branch, and on its change by any session, so a renamed branch or a change resumed elsewhere loses none. It SHALL keep only repeatable knowledge, write it into the owning pages, and save those edits to company knowledge at once before closing, naming the pages and the undo. On an install with no knowledge copy, and for an edit to a page in the code repository, it SHALL publish the edits in their own pull request. It SHALL skip the update when unpublished work is kept (the close after that work ships runs it) and when work is thrown away. It SHALL never publish edits the person made and did not publish. A private-life fact SHALL NOT move into the repo's knowledge or wiki, and an unreachable store SHALL skip the step without blocking the close.

#### Scenario: Close after a publish
- **WHEN** `/ship` merged a change whose facts record a convention for future work, and the person runs `/close`
- **THEN** the owning page in `knowledge/` is saved live with no pull request, the reply names it and the undo, and the workspace closes

#### Scenario: A declined publish stays unpublished
- **WHEN** the person declined to publish a wiki note, then runs `/close`
- **THEN** the note is saved to its branch with an open pull request, not published, and `/close` writes no wiki edit of its own
