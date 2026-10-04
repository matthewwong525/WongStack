## REMOVED Requirements

### Requirement: Setup readies the computer before it writes anything

**Reason:** Setup no longer looks for a hosted workspace first, so the Artifacts-handoff scenario goes.
**Migration:** Use "Setup readies the computer first" below; personal setup is unchanged.

### Requirement: A finished install is complete and recorded

**Reason:** The hosted starter is removed, so only the personal install remains to describe.
**Migration:** Use "A finished install is whole and recorded" below; the personal install is unchanged.

### Requirement: All installations enable Zero Trust automatically

**Reason:** The unattended server installer is removed, so `/wong-setup` is the only installation path.
**Migration:** Use "Setup enables Zero Trust automatically" below; interactive setup is unchanged.

### Requirement: The server script builds an agent workspace

**Reason:** The source no longer ships `server/setup.sh`; people run WongStack from their own computer.
**Migration:** None. The script remains in the repository history at version 30.10.0.

### Requirement: The server script leaves the host its paths

**Reason:** The source no longer ships `server/setup.sh` or a host contract for it.
**Migration:** None. The script and its guide remain in the repository history at version 30.10.0.

### Requirement: The server installer installs WongStack unattended

**Reason:** The source no longer ships an unattended installer; no host runs one.
**Migration:** Install through `/wong-setup`. The installer remains in the repository history at version 30.10.0.

### Requirement: The server installer keeps the host contract

**Reason:** The source no longer ships an unattended installer, so it has no host contract to keep.
**Migration:** None. The contract remains in the repository history at version 30.10.0.

### Requirement: A server rerun turns an open install private without publishing

**Reason:** The source no longer ships an unattended installer to rerun.
**Migration:** Add the card and follow the provisioning runbook's step for turning an open install private.

## ADDED Requirements

### Requirement: Setup readies the computer first

Before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. The same install question SHALL also cover the agent's browser tool and Cloudflare's tunnel tool when absent. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, except that a failed browser or tunnel install SHALL be reported and skipped, and an existing git identity SHALL stay unchanged.

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

### Requirement: A finished install is whole and recorded

A completed install SHALL leave the payload in a real `.agents/` folder with `.claude` and `.codex` links, the required wiki hubs, ignore rules for `.env*` and `.dev.vars*`, the memory skill and its session-start hooks, a provisioned memory store, and an install record `.claude/.wong-stack.json` naming the source version and commit.

#### Scenario: Install completes

- **WHEN** `/apply` finishes the install tasks with a token in `.env`
- **THEN** the repo has its install record, including the memory store, and the `/save` checkpoint follows

### Requirement: Setup enables Zero Trust automatically

`/wong-setup` SHALL enable Zero Trust for the workspace's production and staging sites, assets, APIs, mini apps, and previews without asking an enable-or-public question. The owner SHALL authenticate by a reachable email. Setup SHALL preserve memory-key authentication and SHALL NOT make business content public when protection is incomplete, with one exception: when Cloudflare withholds Zero Trust until the account has a payment method, `/wong-setup` SHALL finish with the site open without login and recommend the card afterwards as optional. A site that already has protection SHALL never open. A deliberately public surface requires a separately reviewed exception.

#### Scenario: Interactive setup

- **WHEN** a person installs WongStack through `/wong-setup`
- **THEN** setup automatically provisions protected hosting and does not ask whether to enable protection

#### Scenario: Setup cannot finish protection

- **WHEN** setup cannot finish its Zero Trust setup for a reason other than a missing payment method
- **THEN** setup reports the recoverable blocker without publishing public business content

#### Scenario: No card on a personal computer

- **WHEN** `/wong-setup` finds Zero Trust needs a payment method
- **THEN** setup finishes without stopping, and the closing report recommends the card and says what is missing without it

## MODIFIED Requirements

### Requirement: Setup waits for the Cloudflare token

Setup SHALL ask whether the person has the Cloudflare user token before anything is written, giving the pre-filled token link from the credentials page. With no token, it SHALL stop, write nothing, and say that running setup again continues. It SHALL NOT report memory or hosting working when none exists.

#### Scenario: No token yet

- **WHEN** a person starts setup without a token
- **THEN** setup writes nothing and gives the link that creates one

### Requirement: Easy setup honors a chosen source

When a person asks to install WongStack from a particular GitHub repository, fresh setup SHALL use that repository's version for the setup guidance, prerequisites, and installed payload, and the completed project's install record SHALL name the actual source repository, version, and commit. With no custom source requested, setup SHALL use the original WongStack repository. Setup SHALL retain its normal tools, hosting, and memory flow, and SHALL NOT install into the source checkout itself or silently substitute another repository when the requested source cannot be retrieved.

#### Scenario: Install a customized fork

- **WHEN** a person asks to install from their customized WongStack fork
- **THEN** the new project receives that fork's defaults and records that fork as its source through the usual easy setup
- **AND** the source checkout remains separate from the installed project

#### Scenario: Requested source cannot be retrieved

- **WHEN** the requested fork cannot be retrieved
- **THEN** setup reports the problem and does not install the original WongStack as a substitute
