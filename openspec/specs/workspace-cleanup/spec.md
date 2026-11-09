# workspace-cleanup Specification

## Purpose
Keeps WongStack from filling the machine's memory: it closes finished workspaces, stops servers left behind, and deletes its own old temp files, touching nothing it did not make.

## Requirements

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

### Requirement: Scratch files live in a git-ignored folder in the checkout
Agents SHALL put throwaway files in a `.scratch/` folder at the checkout's root, not in the system temp folder. Git SHALL ignore it in every installed repo, so scratch files never show as changes, never block a close, and never get committed. A workspace's scratch folder SHALL go away when the workspace closes.

#### Scenario: Scratch goes away with the workspace
- **WHEN** an agent writes a brief to `.scratch/` in a workspace and the workspace is later closed
- **THEN** the folder is gone with the worktree, and the close was not refused for it

#### Scenario: Scratch in the main checkout
- **WHEN** the primary checkout's `.scratch/` holds a 2-day-old file and a file from this morning
- **THEN** the tidy-up deletes only the 2-day-old file

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

### Requirement: /close records what the session planned and what is left
Before closing, `/close` SHALL record in memory what the session set out to do and what got done, and SHALL leave one open thread for each planned piece not done, so the next session start and `/continue` show it. It SHALL close any open thread the session finished. It SHALL record the wrap-up on every route, including when work is thrown away.

#### Scenario: Work left undone
- **WHEN** a session planned a feature and its tests, built the feature, and the person runs `/close`
- **THEN** memory holds a wrap-up naming the feature as done and an open thread for the tests

#### Scenario: Everything finished
- **WHEN** a session did everything it set out to do and the person runs `/close`
- **THEN** the wrap-up is recorded, no new open thread is left, and the session's own threads are closed

### Requirement: /close keeps the session's transcript
Before closing, when the store has a transcript bucket, `/close` SHALL upload the session's full transcript, with secrets redacted as capture does, so it is kept even if no later session captures it. A session an earlier version recorded as private SHALL NOT be uploaded; no word in a message SHALL keep a session from being uploaded. A store without a bucket, or an unreachable one, SHALL skip the upload without blocking the close and SHALL say so.

#### Scenario: A normal close
- **WHEN** the person runs `/close` in a repo whose memory store has a bucket
- **THEN** the session's redacted transcript is in the bucket before the workspace closes, and `source` on the session's facts shows it

#### Scenario: A private session
- **WHEN** an earlier version recorded the session as private and the person runs `/close`
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
`/close` SHALL read the facts recorded in this session, on its branch, and on its change by any session, so a renamed branch or a change resumed elsewhere loses none. It SHALL keep only repeatable knowledge, write it into the owning pages, and save those edits to company knowledge at once before closing, naming the pages and the undo. On an install with no knowledge copy, and for an edit to a page in the code repository, it SHALL publish the edits in their own pull request. It SHALL skip the update when unpublished work is kept (the close after that work ships runs it) and when work is thrown away. It SHALL never publish edits the person made and did not publish. A private-life fact SHALL NOT move into the repo's knowledge or wiki, and an unreachable store SHALL skip the step without blocking the close.

#### Scenario: Close after a publish
- **WHEN** `/ship` merged a change whose facts record a convention for future work, and the person runs `/close`
- **THEN** the owning page in `knowledge/` is saved live with no pull request, the reply names it and the undo, and the workspace closes

#### Scenario: A declined publish stays unpublished
- **WHEN** the person declined to publish a wiki note, then runs `/close`
- **THEN** the note is saved to its branch with an open pull request, not published, and `/close` writes no wiki edit of its own

### Requirement: /close where there is no workspace to close
In the primary checkout, or in a chat that is not a Paseo agent, `/close` SHALL still record facts, update the wiki, and keep unpublished work, then SHALL say there is no workspace to close.

#### Scenario: Main checkout
- **WHEN** the person runs `/close` in the primary checkout after an errand
- **THEN** facts are recorded and any wiki edit is published, and the reply says the main checkout does not close

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
