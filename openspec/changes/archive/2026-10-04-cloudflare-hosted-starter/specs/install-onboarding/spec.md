## MODIFIED Requirements

### Requirement: Setup readies the computer before it writes anything

For personal setup, before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. The same install question SHALL also cover the agent's browser tool and Cloudflare's tunnel tool when absent. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, except that a failed browser or tunnel install SHALL be reported and skipped, and an existing git identity SHALL stay unchanged.

Setup SHALL recognize a verified private hosted context or an Artifacts origin before entering personal setup. A verified hosted project SHALL reuse its existing workspace tools and verified owner identity without customer GitHub authentication. A claimed hosted project lacking private authority SHALL stop with reconnect guidance; a committed marker or remote alone SHALL NOT grant access.

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

#### Scenario: Artifacts checkout has no private handoff

- **WHEN** setup sees an Artifacts origin but cannot verify its hosted authority
- **THEN** setup stops with reconnect guidance before requesting personal provider sign-in or writing elsewhere

### Requirement: Setup waits for the Cloudflare token

Personal setup SHALL ask whether the person has the Cloudflare user token before anything is written, giving the pre-filled token link from the credentials page. With no token, it SHALL stop, write nothing, and say that running setup again continues. It SHALL NOT report memory or hosting working when none exists.

A verified platform-managed Artifacts project SHALL instead use platform-owned provisioning through its authorized hosted route, with no customer Cloudflare token request. Unavailable platform authority SHALL remain a hosted blocker rather than become personal setup.

#### Scenario: No token yet

- **WHEN** a person starts setup without a token
- **THEN** setup writes nothing and gives the link that creates one

### Requirement: A finished install is complete and recorded

A completed personal install SHALL leave the payload in a real `.agents/` folder with `.claude` and `.codex` links, the required wiki hubs, ignore rules for `.env*` and `.dev.vars*`, the memory skill and its session-start hooks, a provisioned memory store, and an install record `.claude/.wong-stack.json` naming the source version and commit.

The separate hosted starter defined by `cloudflare-hosted-projects` SHALL retain the payload layout, wiki and ignore rules and actual pinned source record, but SHALL report only its established repository/workspace/site readiness. It SHALL NOT provision a memory store or claim a full memory-ready personal installation as part of this delivery.

#### Scenario: Install completes

- **WHEN** `/apply` finishes the install tasks with a token in `.env`
- **THEN** the repo has its install record, including the memory store, and the `/save` checkpoint follows

#### Scenario: Hosted starter completes

- **WHEN** the hosted starter establishes its project, workspace and protected site
- **THEN** those results are recorded with the pinned source and memory remains separately unconfigured without blocking that starter
