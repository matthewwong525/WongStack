## MODIFIED Requirements

### Requirement: /close wraps up a session with no questions
`/close` SHALL, without asking, update the wiki by the rule below, keep any unpublished work, and then close the Paseo workspace after its reply ends: the chat and workspace are archived, processes still running from the workspace stop, a private link this chat left open is closed, and a branch whose pull request merged at its current commit is deleted locally. `/close` SHALL NOT write to memory: the memory plugin records the chat by itself. `/close` SHALL NOT stop what other chats share, such as the agent's browser. The chat SHALL stay readable in Paseo's archived list.

#### Scenario: Close after a research answer
- **WHEN** a chat in a Paseo worktree answered a question, changed no repo file, and the person runs `/close`
- **THEN** the reply ends, the chat and workspace are archived, and `/close` wrote nothing to memory

#### Scenario: Close after a publish
- **WHEN** `/ship` merged from a Paseo worktree, no asked-for work waits, and the person says yes to *Close this chat?*
- **THEN** `/close` runs, the reply ends, the chat and workspace are archived, their leftover processes stop, and the merged branch is deleted locally

### Requirement: /close updates the wiki
`/close` SHALL read this chat's own conversation, keep only repeatable knowledge, write it into the owning pages, and save those edits to company knowledge at once before closing, naming the pages and the undo. On an install with no knowledge copy, and for an edit to a page in the code repository, it SHALL publish the edits in their own pull request. It SHALL skip the update when unpublished work is kept (the close after that work ships runs it) and when work is thrown away. It SHALL never publish edits the person made and did not publish. A private-life fact SHALL NOT move into the repo's knowledge or wiki. Knowledge from other chats reaches the wiki through the memory plugin's tidy, not through `/close`.

#### Scenario: Close after a publish
- **WHEN** `/ship` merged a change whose chat agreed a convention for future work, and the person runs `/close`
- **THEN** the owning page in `knowledge/` is saved live with no pull request, the reply names it and the undo, and the workspace closes

#### Scenario: A declined publish stays unpublished
- **WHEN** the person declined to publish a wiki note, then runs `/close`
- **THEN** the note is saved to its branch with an open pull request, not published, and `/close` writes no wiki edit of its own

### Requirement: /close where there is no workspace to close
In the primary checkout, or in a chat that is not a Paseo agent, `/close` SHALL still update the wiki and keep unpublished work, then SHALL say there is no workspace to close.

#### Scenario: Main checkout
- **WHEN** the person runs `/close` in the primary checkout after an errand
- **THEN** any wiki edit is published, and the reply says the main checkout does not close

## REMOVED Requirements

### Requirement: /close records what the session planned and what is left
**Reason**: The memory plugin captures every chat by itself, its wrap-up and open threads included; `/close` writing them too was a second writer.
**Migration**: The memory requirement "A finished chat's work and leftovers are captured" keeps the promise.

### Requirement: /close keeps the session's transcript
**Reason**: The memory plugin keeps a chat's transcript when the chat ends, so a closed workspace loses none without `/close` doing it.
**Migration**: The memory requirement "A chat's transcript is kept when it ends" keeps the promise.
