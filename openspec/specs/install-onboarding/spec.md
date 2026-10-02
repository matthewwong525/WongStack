# install-onboarding Specification

## Purpose

How a person gets WongStack: one pasted prompt runs `/wong-setup` from any folder and installs everything through the normal workflow; the source also ships a script that makes a fresh server an agent workspace.

## Requirements

### Requirement: The README offers one prompt to paste

The README SHALL give a one-line prompt that names the WongStack GitHub repository and asks the agent to install it, with no folder named and no folder to make first. Next to it, a line addressed to the agent SHALL give the raw address of `.agents/skills/wong-setup/SKILL.md` by its real path. The README SHALL send the person to Paseo, running Claude Code or Codex on their own computer, as the place to paste it, with no terminal inside the chat and no cloud-container session. It SHALL say what they need first: a free GitHub account and a free Cloudflare account. Its steps SHALL end with opening the starter site and pasting its first message.

#### Scenario: A newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one prompt, an app to paste it in, and what they need first, with no step to make a folder

#### Scenario: The agent finds the runbook

- **WHEN** an agent is given only the one-line prompt and reads the repository's README
- **THEN** it finds the setup runbook's raw address there and follows it

### Requirement: A plain walkthrough covers the whole path

The README SHALL carry the numbered install steps, and no other page SHALL repeat them. The payload's getting-started page SHALL link those steps and say what the README does not: what it costs, a numbered list of every manual step (the agent install, Paseo, GitHub approval, tool installs, Cloudflare signup, the token), and what to do when something goes wrong. It SHALL say setup may install free tools after asking, and SHALL NOT imply a manual step is automated.

#### Scenario: Reading before starting

- **WHEN** a newcomer reads the walkthrough
- **THEN** they can tell what they must do themselves and which steps open a browser

#### Scenario: One copy of the steps

- **WHEN** the install steps change
- **THEN** only the README's steps need editing

### Requirement: Setup installs into an empty folder it finds or makes

`/wong-setup` SHALL install into the open folder when it is empty, or holds only a `.git` with no commits. A folder with an install record SHALL go to `/wong-sync`. Any other folder SHALL stay untouched: setup SHALL install instead into a new `wongstack` folder in the person's home folder, taking the next free numbered name when one exists with other files, and going to `/wong-sync` when one already holds WongStack. Setup SHALL make that folder without asking, only once it writes its first file, and SHALL say where it is and to open it in Paseo for later chats. The install SHALL always take everything, with no component question.

#### Scenario: Empty folder

- **WHEN** a person runs setup in an empty folder with a Cloudflare token
- **THEN** setup installs everything there without asking which parts to take

#### Scenario: A folder with files

- **WHEN** setup runs in a folder with files and no install record
- **THEN** it writes nothing in that folder, installs into a new `wongstack` folder in the home folder, and its closing report names that folder and says to open it in Paseo next time

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

Setup SHALL carry the person's intent through `/explore`, `/plan`, `/apply`, and `/save`, with no setup-only interview or approval. `/save` SHALL own commits and pushes; personal setup SHALL create the private GitHub repository and `origin`, or use an existing `origin`. Hosted setup SHALL use the prepared Artifacts repository and pinned source without creating a second repository, then run the hosted remote checks and review flow. For a verified empty hosted repository with no local commits or advertised remote refs, the first `/save` SHALL create its initial commit on `main`; subsequent changes SHALL use their ordinary feature branches. An owner's explicit request to install a new hosted site SHALL authorize its first publication through `/ship` after successful exact checks and private preview verification; preparation alone SHALL NOT authorize publication. Existing-site changes and migrations SHALL retain their normal explicit publication approval. Setup SHALL report first-site publication separately from pending memory ownership and requesting-machine enrollment.

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

### Requirement: A finished install is complete and recorded

A completed install SHALL leave the payload in a real `.agents/` folder with `.claude` and `.codex` links, the required wiki hubs, ignore rules for `.env*` and `.dev.vars*`, the memory skill and its session-start hooks, a provisioned memory store, and an install record `.claude/.wong-stack.json` naming the source version and commit.

#### Scenario: Install completes

- **WHEN** `/apply` finishes the install tasks with a token in `.env`
- **THEN** the repo has its install record, including the memory store, and the `/save` checkpoint follows

### Requirement: The default branch is main

The workflow SHALL assume `main` as the default branch, resolving another name only when `main` does not exist.

#### Scenario: A repo setup created

- **WHEN** any verb needs the default branch in a repo setup created
- **THEN** it uses `main` without detection

#### Scenario: A repo on another default

- **WHEN** `main` does not exist
- **THEN** the real default is resolved and used

### Requirement: The server script builds an agent workspace

The source SHALL ship `server/setup.sh`, which, run as root with no prompt on a fresh Ubuntu 24.04 server, SHALL create the `WORKSPACE_USER` (default `wong`), install the Node.js major that CI's `.nvmrc` names, git, `gh`, OpenSpec, Paseo, the coding agents, agent-browser, and Cloudflare's tunnel tool `cloudflared`, and run Paseo as a service for that user. It SHALL NOT run `cloudflared` as a service. It SHALL be safe to run again and SHALL end by checking each promised tool, exiting non-zero and naming what is missing.

#### Scenario: A fresh server

- **WHEN** a person runs `sudo bash server/setup.sh` on a fresh server
- **THEN** it exits 0 with every promised tool installed and Paseo running

#### Scenario: A tool is missing

- **WHEN** a promised tool is absent at the end
- **THEN** the script exits non-zero and names it

#### Scenario: The check and the contract agree

- **WHEN** the script's final check and the end state in `server/README.md` name different tools
- **THEN** the source's tests fail and name the difference

#### Scenario: The server's Node and CI's Node differ

- **WHEN** `server/setup.sh` installs a Node.js major other than the one `.nvmrc` names
- **THEN** the source's tests fail and name both versions

### Requirement: The server script leaves the host its paths

The script SHALL NOT open an inbound port, touch a host's secret, or write under `/etc/wongstack` or `/opt/wongstack`. It SHALL have no size budget: a host downloads it from the source rather than packing it into first-boot data. `server/README.md` SHALL state the command, the input, the end state, and these limits. `server/` SHALL stay source-only, never installed or synced.

#### Scenario: The script grows past the old budget

- **WHEN** a change makes `server/setup.sh` larger than 12 KiB
- **THEN** the source's tests still pass

#### Scenario: A host's paths stay the host's

- **WHEN** `server/setup.sh` runs on a fresh server
- **THEN** it writes nothing under `/etc/wongstack` or `/opt/wongstack`

### Requirement: The server installer installs WongStack unattended

The source SHALL ship a server installer that, run as the workspace user from a clone of the source, installs that clone's WongStack into an empty GitHub repo with no question: the full payload, the install record naming the clone's version and commit, the app's Cloudflare hosting, a memory store served by the production Worker with the person's admin memory key in `.env`, and the CI deploy token as a GitHub secret. It SHALL commit the install on `main` and push it. A second run SHALL finish a first run that stopped, and SHALL leave a repo it already pushed untouched. It SHALL refuse a repo that already holds other work.

#### Scenario: A fresh repo

- **WHEN** a host runs the installer for an empty repo with a valid Cloudflare token and account
- **THEN** the repo's `main` holds the install, its record names the source's version, commit, and memory Worker, and the last output line is `done`

#### Scenario: A repo with other work

- **WHEN** the repo already has commits the installer did not make
- **THEN** it changes nothing and its last output line is `repo`

### Requirement: The server installer keeps the host contract

`server/README.md` SHALL state how a host runs the installer, the job it reads on stdin, the one-word last line it prints for each outcome, the refused-call line before it, the names a host may import from it, and what it never does. When a refused Cloudflare call stops the install, the installer SHALL print that call as `Cloudflare <METHOD> <path>: HTTP <status> <codes>` on the line before the reason, only when the line matches the `CLOUDFLARE_CALL` pattern it exports. The installer SHALL NOT put a token value in a command's arguments, an error, its output, or a committed file, and SHALL NOT write under `/etc/wongstack` or `/opt/wongstack`. The source's tests SHALL install the current payload with it, so a payload file the installer misses fails before release.

#### Scenario: A token in the job

- **WHEN** the installer runs with a Cloudflare token on stdin
- **THEN** no argument list, error, output line, or committed file holds the token or any token it minted

#### Scenario: The payload gains a file

- **WHEN** a change adds a payload file the installer does not install
- **THEN** the source's tests fail and name the file

#### Scenario: Cloudflare refuses a call

- **WHEN** Cloudflare refuses a call and the install stops
- **THEN** the second-last line names the method, the path without its query, the status, and the error codes, and the last line is the reason word

### Requirement: Setup points the person to Paseo

When getting the computer ready, setup SHALL check whether Paseo is installed. When it is missing, setup SHALL say in plain words what Paseo is for (chatting from the phone, schedules, a workspace per part) and where to get it, then continue; Paseo's absence SHALL NOT stop setup, and setup SHALL NOT install Paseo. When Paseo is present, the closing report SHALL say how to connect a phone.

#### Scenario: Paseo is missing

- **WHEN** setup runs on a computer without Paseo
- **THEN** it names Paseo, what it is for, and where to get it, and finishes the install

#### Scenario: Paseo is present

- **WHEN** setup finishes on a computer with Paseo
- **THEN** the closing report says how to pair a phone

### Requirement: All installations enable Zero Trust automatically

Both `/wong-setup` and the unattended cloud-managed installer SHALL enable Zero Trust for the workspace's production and staging sites, assets, APIs, mini apps, and previews without asking an enable-or-public question. The owner SHALL authenticate by a reachable email. Setup SHALL preserve memory-key authentication and SHALL NOT make business content public when protection is incomplete, with one exception: when Cloudflare withholds Zero Trust until the account has a payment method, `/wong-setup`, and the unattended installer when its job asks for the open finish, SHALL finish with the site open without login. `/wong-setup` SHALL recommend the card afterwards as optional; the unattended installer SHALL report the open state to its host. An unattended job that does not ask SHALL keep stopping in that case. A site that already has protection SHALL never open. A deliberately public surface requires a separately reviewed exception.

#### Scenario: Interactive setup

- **WHEN** a person installs WongStack through `/wong-setup`
- **THEN** setup automatically provisions protected hosting and does not ask whether to enable protection

#### Scenario: Setup cannot finish protection

- **WHEN** either installation path cannot finish its Zero Trust setup for a reason other than a missing payment method
- **THEN** setup reports the recoverable blocker without publishing public business content

#### Scenario: No card on a personal computer

- **WHEN** `/wong-setup` finds Zero Trust needs a payment method
- **THEN** setup finishes without stopping, and the closing report recommends the card and says what is missing without it

#### Scenario: No card on a server

- **WHEN** the unattended installer, with a job that asks for the open finish, finds Zero Trust needs a payment method
- **THEN** it finishes with `done`, the committed app config carries the login-off switch, and its host receives an open result with no management credential

#### Scenario: No card on a server that did not ask

- **WHEN** the unattended installer, with a job that does not ask for the open finish, finds Zero Trust needs a payment method
- **THEN** it stops without publishing business content, as before

### Requirement: A server rerun turns an open install private without publishing

When the unattended installer runs again on a repo it installed open, and Cloudflare now allows Zero Trust, it SHALL provision the login, turn the app config private, report the restricted result to its host, and leave its file edits uncommitted in the repo for the person's assistant to publish. It SHALL NOT commit or push over the repo's later work. While Zero Trust is still withheld, the rerun SHALL finish open again.

#### Scenario: The card was added

- **WHEN** the installer reruns on an open install whose account now has Zero Trust
- **THEN** the last line is `done`, the host receives the restricted result, `app/wrangler.jsonc` in the repo is private and uncommitted, and `origin/main` is unchanged

#### Scenario: Still no card

- **WHEN** the installer reruns on an open install whose account still withholds Zero Trust
- **THEN** the last line is `done`, the host receives an open result, and the repo's files are unchanged

### Requirement: Easy setup honors a chosen source

When a person asks to install WongStack from a particular GitHub repository, fresh setup SHALL use that repository's version for the setup guidance, prerequisites, and installed payload, and the completed project's install record SHALL name the actual source repository, version, and commit. With no custom source requested, setup SHALL use the original WongStack repository. Setup SHALL retain its normal tools, hosting, and memory flow, and SHALL NOT install into the source checkout itself or silently substitute another repository when the requested source cannot be retrieved.

#### Scenario: Install a customized fork

- **WHEN** a person asks to install from their customized WongStack fork
- **THEN** the hosted project receives that fork's defaults and records that fork as its source through the usual easy setup
- **AND** the source checkout remains separate from the installed project

#### Scenario: Requested source cannot be retrieved

- **WHEN** the requested fork cannot be retrieved
- **THEN** setup reports the problem and does not install the original WongStack as a substitute
