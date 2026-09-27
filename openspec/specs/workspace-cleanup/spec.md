# workspace-cleanup Specification

## Purpose
Keeps WongStack from filling the machine's memory: it closes finished workspaces, stops servers left behind, and deletes its own old temp files, touching nothing it did not make.

## Requirements

### Requirement: A published workspace can be closed from the closing question
When the person picks *Close this workspace* after a publish, the agent SHALL finish its reply first, then archive the chat and its workspace, and stop processes still running from that workspace. It SHALL delete the local branch only when the branch's pull request merged at the branch's current commit. It SHALL refuse, closing nothing, when the workspace has unsaved work or is the primary checkout.

#### Scenario: Close after a publish
- **WHEN** `/ship` merges a change from a Paseo worktree and the person picks *Close this workspace*
- **THEN** the reply ends, then the chat and workspace are archived, their leftover processes stop, and the merged branch is deleted locally

#### Scenario: Unsaved work blocks the close
- **WHEN** the person picks *Close this workspace* and the working tree has uncommitted edits
- **THEN** nothing is closed and the agent names the unsaved files

### Requirement: Session start tidies up in the background
Each session start SHALL begin a background tidy-up, at most once every 6 hours per repo, and SHALL never wait for it. The tidy-up SHALL archive this repo's Paseo workspaces whose chats have all been idle 3 or more days and whose work is saved (clean tree, and every commit on the remote or its pull request merged at that commit), stop this user's processes whose working folder is a deleted worktree of this repo, delete `wong-` temp folders untouched for more than a day, and delete files in the primary checkout's scratch folder untouched for more than a day. It SHALL skip the current session's workspace, the primary checkout, and anything with unsaved work.

#### Scenario: An idle, saved workspace is closed
- **WHEN** a session starts and another workspace of this repo has been idle 4 days with its branch pushed and a clean tree
- **THEN** the tidy-up archives that workspace and its chat

#### Scenario: Unsaved work is left alone
- **WHEN** an idle 5-day workspace has a commit that is on no remote
- **THEN** the tidy-up leaves it open and records it as skipped for unsaved work

### Requirement: The tidy-up touches only WongStack's own leftovers
The tidy-up SHALL NOT delete a temp entry whose name does not start with `wong-`, SHALL NOT archive a workspace of another repo, and SHALL NOT signal a process whose working folder still exists.

#### Scenario: Another project's temp files
- **WHEN** the temp folder holds a week-old `tsx-0` folder and a week-old `wong-memory-repo-x1` folder
- **THEN** only `wong-memory-repo-x1` is deleted

#### Scenario: A server outlives its workspace
- **WHEN** one dev server runs from a deleted worktree of this repo, and another from a live folder
- **THEN** only the first is stopped

### Requirement: The next session reports what the tidy-up did
The next session start SHALL print one line naming what the last tidy-up closed, stopped, freed, and left open with the reason, then SHALL NOT print it again. A tidy-up that did nothing SHALL print nothing.

#### Scenario: One report, once
- **WHEN** the last tidy-up closed 2 workspaces and skipped one with unsaved work
- **THEN** the next session start prints one line naming both, and the session after prints no such line

### Requirement: Scratch files live in a git-ignored folder in the checkout
Agents SHALL put throwaway files in a `.scratch/` folder at the checkout's root, not in the system temp folder. Git SHALL ignore it in every installed repo, so scratch files never show as changes, never block a close, and never get committed. A workspace's scratch folder SHALL go away when the workspace closes.

#### Scenario: Scratch goes away with the workspace
- **WHEN** an agent writes a brief to `.scratch/` in a workspace and the workspace is later closed
- **THEN** the folder is gone with the worktree, and the close was not refused for it

#### Scenario: Scratch in the main checkout
- **WHEN** the primary checkout's `.scratch/` holds a 2-day-old file and a file from this morning
- **THEN** the tidy-up deletes only the 2-day-old file
