# Spec Delta

## MODIFIED Requirements

### Requirement: Plain git reaches the project with the company sign-in

In a copy installed through the app, an ordinary `git fetch`, `pull` or `ls-remote` against its origin SHALL succeed with the person's saved company sign-in, run by any tool, with no extra flag, no GitHub account and no key on the computer. The app SHALL check the sign-in and the person's current Project code on every request, then pass the request on to where the project is kept, GitHub or Cloudflare. No sign-in SHALL be written into the copy's files, its git settings, a URL or a log. A push to the code SHALL keep today's rules: it saves a change through the app, and never moves the published project. Company knowledge SHALL follow its own rules, which let a push move its published branch forward.

#### Scenario: Paseo makes a worktree

- **WHEN** Paseo fetches in the background and makes a new worktree from `origin/main` in a teammate's copy
- **THEN** the worktree holds the newest published version

#### Scenario: Project code is taken away

- **WHEN** a person without Project code runs `git fetch` in an old copy
- **THEN** it is refused with ask-your-admin guidance, and the copy is unchanged
