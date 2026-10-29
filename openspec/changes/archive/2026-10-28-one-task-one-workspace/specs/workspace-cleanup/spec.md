## MODIFIED Requirements

### Requirement: /close wraps up a session with no questions
`/close` SHALL, without asking, record the conversation's facts in memory, update the wiki by the rule below, keep any unpublished work, and then close the Paseo workspace after its reply ends: the chat and workspace are archived, processes still running from the workspace stop, a private link this chat left open is closed, and a branch whose pull request merged at its current commit is deleted locally. `/close` SHALL NOT stop what other chats share, such as the agent's browser. The chat SHALL stay readable in Paseo's archived list.

#### Scenario: Close after a research answer
- **WHEN** a chat in a Paseo worktree answered a question, changed no repo file, and the person runs `/close`
- **THEN** the chat's facts are recorded, the reply ends, and the chat and workspace are archived

#### Scenario: Close after a publish
- **WHEN** `/ship` merged from a Paseo worktree and no asked-for work waits
- **THEN** `/ship` runs `/close`, the reply ends, the chat and workspace are archived, their leftover processes stop, and the merged branch is deleted locally

- **WHEN** the person declined to publish a wiki note, then runs `/close`
- **THEN** the note is saved to its branch with an open pull request, not published, and `/close` writes no wiki edit of its own

## REMOVED Requirements

### Requirement: Finished work offers to close
**Reason**: A finished task now closes its workspace by itself (*A finished task closes its workspace*).
**Migration**: Nothing to do; type `/close` to close a chat that the agent kept open.

## ADDED Requirements

### Requirement: A finished task closes its workspace
In a Paseo worktree, when the chat's task is done, the agent SHALL run `/close` without a closing question. Done means the change went live, or the non-code work is done and reported, with no asked-for work, question, blocker or plan review left. When a routine or app offer applies, the agent SHALL ask it first and run `/close` after the answer, whatever it is. The agent SHALL NOT close at a plan's review, during a build, on a blocker, a failed check, a declined publish, or a question to the person.

#### Scenario: Research ends
- **WHEN** an agent in a Paseo worktree finishes a research answer and offers nothing
- **THEN** it runs `/close` with no question

#### Scenario: A plan waits
- **WHEN** `/plan` finishes and waits at the review link
- **THEN** the agent does not close the workspace

#### Scenario: An offer comes first
- **WHEN** a finished task will clearly come back and a routine offer applies
- **THEN** the offer is the closing question, and `/close` runs after the person answers

### Requirement: A new task opens a new workspace
When the person asks a chat in a Paseo worktree for a task that is not that chat's task, and not a quick question about it, the agent SHALL open a new workspace with a brief for it, say `Opened: <title>`, and do nothing of it in this chat. The agent SHALL keep the task here when the person says to do it here, when Paseo is missing, or when nobody can answer. Daily, its helper chats and routine chats SHALL keep their own rules.

#### Scenario: A different task
- **WHEN** the person asks a chat for a task that is not its task
- **THEN** the agent opens a new workspace with a brief and says `Opened: <title>`

#### Scenario: A question about this task
- **WHEN** the person asks a quick question about the chat's own task
- **THEN** the agent answers in this chat

#### Scenario: Do it here
- **WHEN** the person says to do the new task here
- **THEN** the agent does it in this chat
