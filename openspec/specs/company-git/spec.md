# company-git Specification

## Purpose
Plain git in a copy installed through the company app reaches the project through the app with the person's company sign-in, so any tool that runs git, Paseo included, sees the latest published version.

## Requirements

### Requirement: Plain git reaches the project with the company sign-in

In a copy installed through the app, an ordinary `git fetch`, `pull` or `ls-remote` against its origin SHALL succeed with the person's saved company sign-in, run by any tool, with no extra flag, no GitHub account and no key on the computer. The app SHALL check the sign-in and the person's current Project code on every request, then pass the request on to where the project is kept, GitHub or Cloudflare. No sign-in SHALL be written into the copy's files, its git settings, a URL or a log. A push SHALL keep today's rules: it saves a change through the app, and never moves the published project.

#### Scenario: Paseo makes a worktree

- **WHEN** Paseo fetches in the background and makes a new worktree from `origin/main` in a teammate's copy
- **THEN** the worktree holds the newest published version

#### Scenario: Project code is taken away

- **WHEN** a person without Project code runs `git fetch` in an old copy
- **THEN** it is refused with ask-your-admin guidance, and the copy is unchanged

### Requirement: A new chat moves a clean copy forward

When a chat starts in a teammate's copy on its published branch with no changes, the copy SHALL move forward to the newest published version in the background without delaying the chat. A copy with edits, extra commits or another branch SHALL be left as it is. The owner's own copy SHALL never move by itself.

#### Scenario: A clean copy

- **WHEN** a teammate starts a chat in a clean copy one version behind
- **THEN** the copy is on the newest version by the end of the chat's start, with no question asked

#### Scenario: A copy with edits

- **WHEN** a teammate starts a chat in a copy with an unsaved edit
- **THEN** nothing in the copy changes

### Requirement: An expired sign-in falls back to the last download

When the saved sign-in is missing or expired, git in the copy SHALL fail plainly, naming the sign-in step, and work SHALL go on from the last downloaded version. Nothing SHALL open a browser or wait for one.

#### Scenario: Paseo makes a worktree after the sign-in ran out

- **WHEN** the sign-in has expired and Paseo makes a new worktree
- **THEN** the worktree starts from the last downloaded version and the next chat shows the sign-in link
