# other-work-check Specification

## Purpose
Before planning a change to the repo, the agent looks at the repo's other active work, so two chats don't plan the same thing without knowing it.

## Requirements

### Requirement: Planning names overlapping work and asks
When `/explore` or `/plan` starts on work that changes repo files, the agent SHALL look at this repo's other active work before its first question: other worktrees on this computer and the plans in them, saved or not, and open pull requests. When some of it overlaps the request, the agent SHALL name that work and the overlap, and SHALL ask whether to keep going here, work there instead, or narrow this request. When nothing overlaps, it SHALL say nothing about the check. The check SHALL run once per piece of work, so `/plan` after `/explore` does not repeat it.

#### Scenario: Another workspace plans the same area
- **WHEN** a person asks to change the installer, and another workspace of this repo holds an unsaved plan to change the installer
- **THEN** the agent names that workspace and its plan, and asks: keep going here, work there instead, or narrow this one

#### Scenario: Nothing overlaps
- **WHEN** the other active work is about unrelated areas
- **THEN** the agent mentions no check and goes on with its questions

### Requirement: The check reads only this repo's live work
The check SHALL read only worktrees of this repo, never another project's, even when Paseo lists them. It SHALL leave out the current worktree, worktrees with nothing unpublished and no running agent, and pull requests opened by bots. It SHALL show each piece of work once, folding a pull request into the local worktree on its branch. When GitHub cannot be reached, it SHALL check this computer only and say so in one line. It SHALL work without Paseo, from git alone.

#### Scenario: Other projects on the same computer
- **WHEN** Paseo lists workspaces of this repo and of other projects
- **THEN** only this repo's workspaces reach the agent

#### Scenario: GitHub is unreachable
- **WHEN** the pull request lookup fails
- **THEN** the local workspaces are still listed, with a one-line note that open pull requests were not checked
