## MODIFIED Requirements

### Requirement: Setup readies the computer first

Before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. The same install question SHALL also cover the agent's browser tool and Cloudflare's tunnel tool when absent. A Node.js older than the version range the source app's packages accept SHALL count as missing, and the question SHALL offer to update it. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, except that a failed browser or tunnel install SHALL be reported and skipped, and an existing git identity SHALL stay unchanged. A tool setup installed in the person's own folder SHALL be found by a later chat in the installed repo, in Claude Code and in Codex, however the assistant was started, with no command typed and nothing removed from the person's own files.

#### Scenario: A new computer

- **WHEN** setup runs where tools, sign-in, and git identity are missing
- **THEN** it installs tools after asking, signs in through GitHub in the browser, and sets git identity from that account

#### Scenario: Sign-in not completed

- **WHEN** the person does not finish the GitHub approval
- **THEN** setup stops and has created no Cloudflare resource

#### Scenario: The helpers come with the one question

- **WHEN** setup runs where the browser tool and the tunnel tool are absent and the person says yes to its install question
- **THEN** both are installed, and no later step asks to install either

#### Scenario: A helper fails to install

- **WHEN** the browser tool or the tunnel tool fails to install during setup
- **THEN** setup names it, says it will be offered again at first need, and continues

#### Scenario: Tools in the person's own folder, in a later chat

- **WHEN** setup installed its tools in the person's own folder on Linux, and a new chat opens in the installed repo from an app that was started before the install
- **THEN** that chat's commands find the tools, and its memory loads

#### Scenario: Node is the right major but too old for the app

- **WHEN** the computer has Node 24.13 and the app's packages accept Node 24 only from 24.15
- **THEN** setup's one install question offers a newer Node, and the install that follows prints no engine warning

### Requirement: A finished install is whole and recorded

A completed install SHALL leave the payload in a real `.agents/` folder with `.claude` and `.codex` links, the required wiki hubs, ignore rules for `.env*` and `.dev.vars*`, the memory skill and its session-start hooks, a provisioned memory store, and an install record `.claude/.wong-stack.json` naming the source version and commit. One install program shipped with setup SHALL put the payload, the links, the hubs, the ignore rules, the rules file and the install record in place, the same on every install, and SHALL stop with nothing half-written reported as done when a link can not be made or a source file is missing. The first save SHALL carry the app's generated binding types as they match the project's own settings.

#### Scenario: Install completes

- **WHEN** `/apply` finishes the install tasks with a token in `.env`
- **THEN** the repo has its install record, including the memory store, and the `/save` checkpoint follows

#### Scenario: The assistant writes no copy step of its own

- **WHEN** setup installs into an empty folder
- **THEN** the files arrive through the shipped install program, and the wiki link check passes on the result

#### Scenario: Publishing finds nothing left over

- **WHEN** the first change is published after provisioning
- **THEN** no generated file shows as changed in the folder
