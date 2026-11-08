## REMOVED Requirements

### Requirement: Session start tidies up in the background
**Reason**: The tidy-up no longer closes idle workspaces; closing a chat is the person's call.
**Migration**: An idle workspace stays open until the person closes it: a yes to *Close this chat?*, *Close chat* in the Inbox, or a pick in *what's going on?*. The rest of the tidy-up goes on under *Session start cleans up leftovers in the background*.

### Requirement: A finished task closes its workspace
**Reason**: A finished chat now asks before it closes.
**Migration**: See *A finished task asks before it closes its workspace*.

## ADDED Requirements

### Requirement: Session start cleans up leftovers in the background
Each session start SHALL begin a background tidy-up, at most once every 6 hours per repo, and SHALL never wait for it. The tidy-up SHALL stop this user's processes whose working folder is a deleted worktree of this repo, delete `wong-` temp folders untouched for more than a day, and delete files in the primary checkout's scratch folder untouched for more than a day. It SHALL NOT close or archive any workspace or chat, however long it has been idle.

#### Scenario: An idle, saved workspace stays open
- **WHEN** a session starts and another workspace of this repo has been idle 4 days with its branch pushed and a clean tree
- **THEN** the tidy-up leaves that workspace and its chat open

#### Scenario: Old temp files still go
- **WHEN** a session starts and the temp folder holds a week-old `wong-memory-repo-x1` folder
- **THEN** the tidy-up deletes it

### Requirement: A finished task asks before it closes its workspace
In a Paseo worktree, when the chat's task is done, the agent SHALL ask *Close this chat?* and SHALL run `/close` only when the person says yes. Done means the change went live, or the non-code work is done and reported, with no asked-for work, question, blocker or plan review left. When a routine or app offer applies, it SHALL be one more answer in the same question. The agent SHALL NOT ask to close at a plan's review, during a build, on a blocker, a failed check, a declined publish, or another question to the person. An unattended run SHALL keep its own rule for closing itself.

#### Scenario: Research ends
- **WHEN** an agent in a Paseo worktree finishes a research answer
- **THEN** it asks *Close this chat?*, runs `/close` on a yes, and leaves the chat open on a no

#### Scenario: A plan waits
- **WHEN** `/plan` finishes and waits at the review link
- **THEN** the agent does not ask to close and does not close the workspace

#### Scenario: An offer comes first
- **WHEN** a finished task will clearly come back and a routine offer applies
- **THEN** the closing question holds both the offer and closing, and the chat closes only when the person picks closing

## MODIFIED Requirements

### Requirement: The tidy-up touches only WongStack's own leftovers
The tidy-up SHALL NOT delete a temp entry whose name does not start with `wong-`, SHALL NOT archive any workspace, and SHALL NOT signal a process whose working folder still exists.

#### Scenario: Another project's temp files
- **WHEN** the temp folder holds a week-old `tsx-0` folder and a week-old `wong-memory-repo-x1` folder
- **THEN** only `wong-memory-repo-x1` is deleted

#### Scenario: A server outlives its workspace
- **WHEN** one dev server runs from a deleted worktree of this repo, and another from a live folder
- **THEN** only the first is stopped

### Requirement: The next session reports what the tidy-up did
The next session start SHALL print one line naming what the last tidy-up and the last `/close` in this repo closed, stopped, freed, and left open with the reason, then SHALL NOT print it again. When nothing was done, it SHALL print nothing.

#### Scenario: One report, once
- **WHEN** a `/close` closed 1 workspace and the last tidy-up stopped 1 leftover server
- **THEN** the next session start prints one line naming both, and the session after prints no such line

### Requirement: /close wraps up a session with no questions
`/close` SHALL, without asking, record the conversation's facts in memory, update the wiki by the rule below, keep any unpublished work, and then close the Paseo workspace after its reply ends: the chat and workspace are archived, processes still running from the workspace stop, a private link this chat left open is closed, and a branch whose pull request merged at its current commit is deleted locally. `/close` SHALL NOT stop what other chats share, such as the agent's browser. The chat SHALL stay readable in Paseo's archived list.

#### Scenario: Close after a research answer
- **WHEN** a chat in a Paseo worktree answered a question, changed no repo file, and the person runs `/close`
- **THEN** the chat's facts are recorded, the reply ends, and the chat and workspace are archived

#### Scenario: Close after a publish
- **WHEN** `/ship` merged from a Paseo worktree, no asked-for work waits, and the person says yes to *Close this chat?*
- **THEN** `/close` runs, the reply ends, the chat and workspace are archived, their leftover processes stop, and the merged branch is deleted locally

- **WHEN** the person declined to publish a wiki note, then runs `/close`
- **THEN** the note is saved to its branch with an open pull request, not published, and `/close` writes no wiki edit of its own
