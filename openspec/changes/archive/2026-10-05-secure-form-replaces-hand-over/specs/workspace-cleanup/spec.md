## MODIFIED Requirements

### Requirement: /close wraps up a session with no questions
`/close` SHALL, without asking, record the conversation's facts in memory, update the wiki by the rule below, keep any unpublished work, and then close the Paseo workspace after its reply ends: the chat and workspace are archived, processes still running from the workspace stop, a private link this chat left open is closed, and a branch whose pull request merged at its current commit is deleted locally. `/close` SHALL NOT stop what other chats share, such as the agent's browser. The chat SHALL stay readable in Paseo's archived list.

#### Scenario: Close after a research answer
- **WHEN** a chat in a Paseo worktree answered a question, changed no repo file, and the person runs `/close`
- **THEN** the chat's facts are recorded, the reply ends, and the chat and workspace are archived

#### Scenario: Close after a publish
- **WHEN** `/ship` merged from a Paseo worktree and the person picks *Close this workspace*
- **THEN** the reply ends, the chat and workspace are archived, their leftover processes stop, and the merged branch is deleted locally
