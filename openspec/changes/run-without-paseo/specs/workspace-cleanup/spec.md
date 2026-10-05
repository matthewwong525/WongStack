# Spec Delta

## MODIFIED Requirements

### Requirement: Session start tidies up in the background
Each session start SHALL begin a background tidy-up, at most once every 6 hours per repo, and SHALL never wait for it. The tidy-up SHALL close this repo's workspaces, Paseo's and the worktrees WongStack itself made, that have been idle 3 or more days and whose work is saved (clean tree, and every commit on the remote or its pull request merged at that commit), stop this user's processes whose working folder is a deleted worktree of this repo, delete `wong-` temp folders untouched for more than a day, and delete files in the primary checkout's scratch folder untouched for more than a day. It SHALL skip the current session's workspace, the primary checkout, anything with unsaved work, and every worktree that neither Paseo nor WongStack made. It SHALL work without Paseo.

#### Scenario: An idle, saved workspace is closed
- **WHEN** a session starts and another workspace of this repo has been idle 4 days with its branch pushed and a clean tree
- **THEN** the tidy-up archives that workspace and its chat

#### Scenario: Unsaved work is left alone
- **WHEN** an idle 5-day workspace has a commit that is on no remote
- **THEN** the tidy-up leaves it open and records it as skipped for unsaved work

#### Scenario: A worktree the person made by hand
- **WHEN** a session starts without Paseo and the repo has one idle, saved worktree WongStack made and one the person made with git
- **THEN** the tidy-up removes WongStack's and leaves the person's untouched

### Requirement: /close wraps up a session with no questions
`/close` SHALL, without asking, record the conversation's facts in memory, update the wiki by the rule below, keep any unpublished work, and then close the workspace. In a Paseo workspace this happens after its reply ends: the chat and workspace are archived, processes still running from the workspace stop, a browser hand-over link this chat left open is closed, and a branch whose pull request merged at its current commit is deleted locally; the chat SHALL stay readable in Paseo's archived list. In a worktree WongStack made without Paseo, `/close` SHALL mark it closed and say its folder goes at the next tidy-up, which removes it once its work is saved and nothing runs in it. `/close` SHALL NOT stop what other chats share, such as the agent's browser.

#### Scenario: Close after a research answer
- **WHEN** a chat in a Paseo worktree answered a question, changed no repo file, and the person runs `/close`
- **THEN** the chat's facts are recorded, the reply ends, and the chat and workspace are archived

#### Scenario: Close after a publish
- **WHEN** `/ship` merged from a Paseo worktree and the person picks *Close this workspace*
- **THEN** the reply ends, the chat and workspace are archived, their leftover processes stop, and the merged branch is deleted locally

#### Scenario: Close without Paseo
- **WHEN** the person runs `/close` in a saved worktree WongStack made, on a computer without Paseo
- **THEN** facts are recorded, the reply says the folder goes at the next tidy-up, and that tidy-up removes it and its merged branch

### Requirement: Finished work offers to close
In a workspace, Paseo's or a worktree WongStack made, the closing question after finished work SHALL offer *Close this workspace*, which runs `/close`, recommended when no other asked-for work waits. Finished work includes a publish, a plain request answered or done, finished non-code work, and a declined publish. A reply that ends at a plan's review, mid-build, or on a blocker SHALL NOT offer it.

#### Scenario: Research ends
- **WHEN** an agent in a Paseo worktree finishes a research answer
- **THEN** the closing question offers *Close this workspace*

#### Scenario: A plan waits
- **WHEN** `/plan` finishes and waits at the review link
- **THEN** the closing question does not offer to close

### Requirement: /close where there is no workspace to close
In the primary checkout, or in a folder that neither Paseo nor WongStack made as a workspace, `/close` SHALL still record facts, update the wiki, and keep unpublished work, then SHALL say there is no workspace to close.

#### Scenario: Main checkout
- **WHEN** the person runs `/close` in the primary checkout after an errand
- **THEN** facts are recorded and any wiki edit is published, and the reply says the main checkout does not close
