# Spec Delta

## MODIFIED Requirements

### Requirement: Setup readies the computer first

Before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. The same install question SHALL also cover the agent's browser tool and Cloudflare's tunnel tool when absent. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, except that a failed browser or tunnel install SHALL be reported and skipped, and an existing git identity SHALL stay unchanged. A tool setup installed in the person's own folder SHALL be found by a later chat in the installed repo, in Claude Code and in Codex, however the assistant was started, with no command typed and nothing removed from the person's own files.

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
