## MODIFIED Requirements

### Requirement: Setup readies the computer before it writes anything

Before it clones the source or writes in the folder, setup SHALL detect verified hosted context and ready the tools it needs, the git name and email, and on Windows real symbolic links, asking before each install. Required Node.js and Git readiness SHALL precede executable route detection. A positively confirmed folder outside Git SHALL select personal setup; hosted repository/committed-install hints without private verified access SHALL stop for reconnect, and uncertain or corrupt Git inspection SHALL NOT become personal setup. Committed hints SHALL NOT grant authority or reconstruct credentials. Personal installations SHALL also require one GitHub sign-in with the `workflow` and `user:email` scopes; hosted installations SHALL use scoped repository access without requiring customer GitHub sign-in; the person SHALL type no command. The same install question SHALL also cover the agent's browser tool and Cloudflare's tunnel tool when absent. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, except that a failed browser or tunnel install SHALL be reported and skipped, and an existing git identity SHALL stay unchanged.

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


#### Scenario: Plain folder before installation

- **WHEN** required Node.js and Git are ready and setup positively confirms the folder is outside a Git repository
- **THEN** setup continues through the personal workflow

#### Scenario: Hosted clone without its private handoff

- **WHEN** the origin or committed install record identifies hosted storage but the private verified context is missing
- **THEN** setup stops with reconnect guidance without making authenticated calls from committed hints or selecting personal hosting

#### Scenario: Uncertain repository inspection

- **WHEN** Git inspection fails without positively establishing that the folder is outside Git
- **THEN** setup stops and preserves the folder instead of selecting personal setup

### Requirement: Setup waits for the Cloudflare token

Personal setup SHALL ask whether the person has the Cloudflare user token before anything is written, giving the pre-filled token link from the credentials page. With no required token, personal setup SHALL stop, write nothing, and say that running setup again continues. Hosted setup SHALL use its verified scoped service context without asking for a customer Cloudflare token or account. Every route SHALL report infrastructure and machine memory readiness separately and SHALL NOT report memory or hosting working when none exists.

#### Scenario: No token yet

- **WHEN** a person starts personal setup without a token
- **THEN** setup writes nothing and gives the link that creates one


### Requirement: Setup installs through the normal workflow

Setup SHALL carry the person's intent through `/explore`, `/plan`, `/apply`, and `/save`, with no setup-only interview or approval. `/save` SHALL own commits and pushes; personal setup SHALL create the private GitHub repository and `origin`, or use an existing `origin`. Hosted setup SHALL use the prepared Artifacts repository and pinned source without creating a second repository, then run the hosted remote checks and review flow. For a verified empty hosted repository with no local commits or advertised remote refs, the first `/save` SHALL create its initial commit on `main`; subsequent changes SHALL use their ordinary feature branches. An owner's explicit request to install a new hosted site SHALL authorize its first publication through `/ship` after successful exact checks and private preview verification; preparation alone SHALL NOT authorize publication. Existing-site changes SHALL retain their normal explicit publication approval. Setup SHALL report first-site publication separately from pending memory ownership and requesting-machine enrollment.

#### Scenario: Evaluate only

- **WHEN** a person asks only to evaluate WongStack
- **THEN** the work stays in `/explore` and writes no payload

#### Scenario: Install requested

- **WHEN** a person asks to install
- **THEN** setup continues through the plan, build, and save, whose personal push starts the first deploy or whose hosted push starts private remote checks and preview

#### Scenario: First hosted private site

- **WHEN** the owner explicitly installs into a prepared empty hosted repository
- **THEN** setup preserves its own plan, saves the first commit on `main`, runs the remote checks, verifies the private preview, and publishes the first exact site through `/ship` before opening the canonical owner/device action
- **AND** it reports pending memory until the requesting machine's current grant is verified

#### Scenario: Preparation without installation

- **WHEN** cloud preparation finishes without an explicit install request
- **THEN** only the repository and AI entry point exist and no production site is published
