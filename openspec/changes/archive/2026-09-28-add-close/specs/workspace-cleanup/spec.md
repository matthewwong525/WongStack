## ADDED Requirements

### Requirement: /close wraps up a session with no questions
`/close` SHALL, without asking, record the conversation's facts in memory, update the wiki by the rule below, keep any unpublished work, and then close the Paseo workspace after its reply ends: the chat and workspace are archived, processes still running from the workspace stop, a browser hand-over link this chat left open is closed, and a branch whose pull request merged at its current commit is deleted locally. `/close` SHALL NOT stop what other chats share, such as the agent's browser. The chat SHALL stay readable in Paseo's archived list.

#### Scenario: Close after a research answer
- **WHEN** a chat in a Paseo worktree answered a question, changed no repo file, and the person runs `/close`
- **THEN** the chat's facts are recorded, the reply ends, and the chat and workspace are archived

#### Scenario: Close after a publish
- **WHEN** `/ship` merged from a Paseo worktree and the person picks *Close this workspace*
- **THEN** the reply ends, the chat and workspace are archived, their leftover processes stop, and the merged branch is deleted locally

### Requirement: /close records what the session planned and what is left
Before closing, `/close` SHALL record in memory what the session set out to do and what got done, and SHALL leave one open thread for each planned piece not done, so the next session start and `/continue` show it. It SHALL close any open thread the session finished. It SHALL record the wrap-up on every route, including when work is thrown away.

#### Scenario: Work left undone
- **WHEN** a session planned a feature and its tests, built the feature, and the person runs `/close`
- **THEN** memory holds a wrap-up naming the feature as done and an open thread for the tests

#### Scenario: Everything finished
- **WHEN** a session did everything it set out to do and the person runs `/close`
- **THEN** the wrap-up is recorded, no new open thread is left, and the session's own threads are closed

### Requirement: /close keeps the session's transcript
Before closing, when the store has a transcript bucket, `/close` SHALL upload the session's full transcript, with secrets redacted as capture does, so it is kept even if no later session captures it. A session marked private SHALL NOT be uploaded. A store without a bucket, or an unreachable one, SHALL skip the upload without blocking the close and SHALL say so.

#### Scenario: A normal close
- **WHEN** the person runs `/close` in a repo whose memory store has a bucket
- **THEN** the session's redacted transcript is in the bucket before the workspace closes, and `source` on the session's facts shows it

#### Scenario: A private session
- **WHEN** a session contains `#private` and the person runs `/close`
- **THEN** nothing is uploaded and the close goes on

### Requirement: /close keeps unpublished work unless told to throw it away
`/close` SHALL save unpublished work to its branch on the remote, with an open pull request, so `/continue` can resume it, and SHALL NOT publish it. Only when the person explicitly asks to throw the work away SHALL `/close` discard it: close its pull request, delete its branch locally and on the remote, then close the workspace. It SHALL never discard work in the primary checkout.

#### Scenario: Unfinished code is kept
- **WHEN** the working tree has uncommitted edits and the person runs `/close`
- **THEN** the edits are saved to the branch with an open pull request, nothing merges, and the workspace closes

#### Scenario: Throw it away
- **WHEN** the person says *close and throw it away* in a worktree with unpublished commits and an open pull request
- **THEN** the pull request is closed, the branch is deleted locally and on the remote, and the workspace closes

### Requirement: /close updates the wiki
`/close` SHALL read the facts recorded in this session, on its branch, and on its change by any session, so a renamed branch or a change resumed elsewhere loses none. It SHALL keep only repeatable knowledge, write it into the owning wiki pages, and publish those edits in their own pull request before closing. It SHALL skip the wiki update when unpublished work is kept (the close after that work ships runs it) and when work is thrown away. It SHALL never publish edits the person made and did not publish. A private-life fact SHALL NOT move into the repo's wiki, and an unreachable store SHALL skip the step without blocking the close.

#### Scenario: Close after a publish
- **WHEN** `/ship` merged a change whose facts record a convention for future work, and the person runs `/close`
- **THEN** a pull request that changes only the owning wiki page is published, then the workspace closes

#### Scenario: A declined publish stays unpublished
- **WHEN** the person declined to publish a wiki note, then runs `/close`
- **THEN** the note is saved to its branch with an open pull request, not published, and `/close` writes no wiki edit of its own

### Requirement: Finished work offers to close
In a Paseo worktree, the closing question after finished work SHALL offer *Close this workspace*, which runs `/close`, recommended when no other asked-for work waits. Finished work includes a publish, a plain request answered or done, finished non-code work, and a declined publish. A reply that ends at a plan's review, mid-build, or on a blocker SHALL NOT offer it.

#### Scenario: Research ends
- **WHEN** an agent in a Paseo worktree finishes a research answer
- **THEN** the closing question offers *Close this workspace*

#### Scenario: A plan waits
- **WHEN** `/plan` finishes and waits at the review link
- **THEN** the closing question does not offer to close

### Requirement: /close where there is no workspace to close
In the primary checkout, or in a chat that is not a Paseo agent, `/close` SHALL still record facts, update the wiki, and keep unpublished work, then SHALL say there is no workspace to close.

#### Scenario: Main checkout
- **WHEN** the person runs `/close` in the primary checkout after an errand
- **THEN** facts are recorded and any wiki edit is published, and the reply says the main checkout does not close

## REMOVED Requirements

### Requirement: A published workspace can be closed from the closing question
**Reason**: `/close` replaces it; unsaved work is now saved to its branch instead of blocking the close, and the option appears after any finished work, not only after a publish.
**Migration**: Pick *Close this workspace* or type `/close`; unsaved work no longer needs saving first.
