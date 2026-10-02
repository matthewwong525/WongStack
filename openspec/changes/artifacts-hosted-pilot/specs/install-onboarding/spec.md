## MODIFIED Requirements

### Requirement: Setup readies the computer before it writes anything

Before it clones the source or writes in the folder, setup SHALL detect verified hosted context and ready the tools it needs, the git name and email, and on Windows real symbolic links, asking before each install. Personal installations SHALL also require one GitHub sign-in with the `workflow` and `user:email` scopes; hosted installations SHALL use scoped repository access without requiring customer GitHub sign-in; the person SHALL type no command. The same install question SHALL also cover the agent's browser tool and Cloudflare's tunnel tool when absent. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, except that a failed browser or tunnel install SHALL be reported and skipped, and an existing git identity SHALL stay unchanged.

#### Scenario: A new computer

- **WHEN** setup runs on a personal computer where tools, sign-in, and git identity are missing
- **THEN** it installs tools after asking, signs in through GitHub in the browser, and sets git identity from that account

#### Scenario: Sign-in not completed

- **WHEN** the person does not finish the required personal GitHub approval
- **THEN** setup stops and has created no Cloudflare resource

#### Scenario: The helpers come with the one question

- **WHEN** setup runs where the browser tool and the tunnel tool are absent and the person says yes to its install question
- **THEN** both are installed, and no later step asks to install either

#### Scenario: A helper fails to install

- **WHEN** the browser tool or the tunnel tool fails to install during setup
- **THEN** setup names it, says it will be offered again at first need, and continues


### Requirement: Setup waits for the Cloudflare token

Personal setup SHALL ask whether the person has the Cloudflare user token before anything is written, giving the pre-filled token link from the credentials page. With no required token, personal setup SHALL stop, write nothing, and say that running setup again continues. Hosted setup SHALL use its verified scoped service context without asking for a customer Cloudflare token or account. Every route SHALL report infrastructure and machine memory readiness separately and SHALL NOT report memory or hosting working when none exists.

#### Scenario: No token yet

- **WHEN** a person starts personal setup without a token
- **THEN** setup writes nothing and gives the link that creates one


### Requirement: Setup installs through the normal workflow

Setup SHALL carry the person's intent through `/explore`, `/plan`, `/apply`, and `/save`, with no setup-only interview or approval. `/save` SHALL own commits and pushes; personal setup SHALL create the private GitHub repository and `origin`, or use an existing `origin`. Hosted setup SHALL use the prepared Artifacts repository and pinned source without creating a second repository, then run the hosted remote checks and review flow. Setup SHALL NOT publish hosted production without explicit owner approval.

#### Scenario: Evaluate only

- **WHEN** a person asks only to evaluate WongStack
- **THEN** the work stays in `/explore` and writes no payload

#### Scenario: Install requested

- **WHEN** a person asks to install
- **THEN** setup continues through the plan, build, and save, whose personal push starts the first deploy or whose hosted push starts private remote checks and preview
