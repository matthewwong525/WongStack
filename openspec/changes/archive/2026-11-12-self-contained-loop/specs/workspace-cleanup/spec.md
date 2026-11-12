## MODIFIED Requirements

### Requirement: /close wraps up a session with no questions
`/close` SHALL, without asking, keep any unpublished work, and then close the Paseo workspace after its reply ends: the chat and workspace are archived, processes still running from the workspace stop, a private link this chat left open is closed, and a branch whose pull request merged at its current commit is deleted locally. `/close` SHALL NOT read or write memory, and SHALL NOT edit the wiki or company knowledge. `/close` SHALL NOT stop what other chats share, such as the agent's browser. The chat SHALL stay readable in Paseo's archived list.

#### Scenario: Close after a research answer
- **WHEN** a chat in a Paseo worktree answered a question, changed no repo file, and the person runs `/close`
- **THEN** the reply ends, the chat and workspace are archived, and `/close` wrote nothing to memory, the wiki, or company knowledge

#### Scenario: Close after a publish
- **WHEN** `/ship` merged from a Paseo worktree, no asked-for work waits, and the person says yes to *Close this chat?*
- **THEN** `/close` runs, the reply ends, the chat and workspace are archived, their leftover processes stop, and the merged branch is deleted locally

### Requirement: /close keeps unpublished work unless told to throw it away
`/close` SHALL save unpublished work to its branch on the remote, with an open pull request, so `/apply` can pick it up, and SHALL NOT publish it. Only when the person explicitly asks to throw the work away SHALL `/close` discard it: close its pull request, delete its branch locally and on the remote, then close the workspace. It SHALL never discard work in the primary checkout.

#### Scenario: Unfinished code is kept
- **WHEN** the working tree has uncommitted edits and the person runs `/close`
- **THEN** the edits are saved to the branch with an open pull request, nothing merges, and the workspace closes

#### Scenario: Throw it away
- **WHEN** the person says *close and throw it away* in a worktree with unpublished commits and an open pull request
- **THEN** the pull request is closed, the branch is deleted locally and on the remote, and the workspace closes

### Requirement: /close where there is no workspace to close
In the primary checkout, or in a chat that is not a Paseo agent, `/close` SHALL still keep unpublished work, then SHALL say there is no workspace to close.

#### Scenario: Main checkout
- **WHEN** the person runs `/close` in the primary checkout after an errand
- **THEN** nothing is published or edited, and the reply says the main checkout does not close

## REMOVED Requirements

### Requirement: /close updates the wiki
**Reason**: Reading a chat for lessons is memory's job; its daily tidy and `/dream-memory` already place lasting facts on the wiki, so `/close` did it twice and needed memory to do it.
**Migration**: Lasting lessons reach the wiki through memory's daily tidy or `/dream-memory`. A project without memory writes a wiki page when it learns the fact, by the repeatable-knowledge rule.
