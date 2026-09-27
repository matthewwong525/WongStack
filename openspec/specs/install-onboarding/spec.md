# install-onboarding Specification

## Purpose

How a person gets WongStack: one pasted prompt runs `/wong-setup` in an empty folder and installs everything through the normal workflow; the source also ships a script that makes a fresh server an agent workspace.

## Requirements

### Requirement: The README offers one prompt to paste

The README SHALL give a one-line prompt that names the WongStack GitHub repository and asks the agent to install it in the open folder. Next to it, a line addressed to the agent SHALL give the raw address of `.agents/skills/wong-setup/SKILL.md` by its real path. The README SHALL send the person to Paseo, running Claude Code or Codex on their own computer, as the place to paste it, with no terminal inside the chat and no cloud-container session. It SHALL say to start in an empty folder, with a free GitHub account and a free Cloudflare account.

#### Scenario: A newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one prompt, an app to paste it in, and what they need first

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

### Requirement: Setup installs only into an empty folder

`/wong-setup` SHALL install only into an empty folder, or one holding only a `.git` with no commits, and SHALL write nothing for any other folder; a folder with an install record SHALL go to `/wong-sync`. The install SHALL always take everything, with no component question.

#### Scenario: Empty folder

- **WHEN** a person runs setup in an empty folder with a Cloudflare token
- **THEN** setup installs everything without asking which parts to take

#### Scenario: A folder with files

- **WHEN** setup runs in a folder with files and no install record
- **THEN** it writes nothing and says setup starts from an empty folder

### Requirement: Setup readies the computer before it writes anything

Before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, and an existing git identity SHALL stay unchanged.

#### Scenario: A new computer

- **WHEN** setup runs where tools, sign-in, and git identity are missing
- **THEN** it installs tools after asking, signs in through GitHub in the browser, and sets git identity from that account

#### Scenario: Sign-in not completed

- **WHEN** the person does not finish the GitHub approval
- **THEN** setup stops and has created no Cloudflare resource

### Requirement: Setup waits for the Cloudflare token

Setup SHALL ask whether the person has the Cloudflare user token before anything is written, giving the pre-filled token link from the credentials page. With no token, it SHALL stop, write nothing, and say that running setup again continues. It SHALL NOT report memory or hosting working when none exists.

#### Scenario: No token yet

- **WHEN** a person starts setup without a token
- **THEN** setup writes nothing and gives the link that creates one

### Requirement: Setup installs through the normal workflow

Setup SHALL carry the person's intent through `/explore`, `/plan`, `/apply`, and `/save`, with no setup-only interview or approval. `/save` SHALL own commits and pushes; setup SHALL create the private GitHub repository and `origin`, or use an existing `origin`.

#### Scenario: Evaluate only

- **WHEN** a person asks only to evaluate WongStack
- **THEN** the work stays in `/explore` and writes no payload

#### Scenario: Install requested

- **WHEN** a person asks to install
- **THEN** setup continues through the plan, build, and save, whose push starts the first deploy

### Requirement: A finished install is complete and recorded

A completed install SHALL leave the payload in a real `.agents/` folder with `.claude` and `.codex` links, the required wiki hubs, ignore rules for `.env*` and `.dev.vars*`, the memory skill and its session-start hooks, a provisioned memory store, and an install record `.claude/.wong-stack.json` naming the source version and commit.

#### Scenario: Install completes

- **WHEN** `/apply` finishes the install tasks with a token in `.env`
- **THEN** the repo has its install record, including the memory store, and the `/save` checkpoint follows

### Requirement: Setup records the person's home once per machine

When the person says the new repo is their home, setup SHALL record its absolute path in `~/.wong-stack/machine.json`, asking before it replaces a different recorded home; the install itself SHALL be the same as any other.

#### Scenario: A second home

- **WHEN** the machine already records another home
- **THEN** setup asks before it changes the record

### Requirement: The default branch is main

The workflow SHALL assume `main` as the default branch, resolving another name only when `main` does not exist.

#### Scenario: A repo setup created

- **WHEN** any verb needs the default branch in a repo setup created
- **THEN** it uses `main` without detection

#### Scenario: A repo on another default

- **WHEN** `main` does not exist
- **THEN** the real default is resolved and used

### Requirement: The server script builds an agent workspace

The source SHALL ship `server/setup.sh`, which, run as root with no prompt on a fresh Ubuntu 24.04 server, SHALL create the `WORKSPACE_USER` (default `wong`), install Node.js 24, git, `gh`, OpenSpec, Paseo, the coding agents, and agent-browser, and run Paseo as a service for that user. It SHALL be safe to run again and SHALL end by checking each promised tool, exiting non-zero and naming what is missing.

#### Scenario: A fresh server

- **WHEN** a person runs `sudo bash server/setup.sh` on a fresh server
- **THEN** it exits 0 with every promised tool installed and Paseo running

#### Scenario: A tool is missing

- **WHEN** a promised tool is absent at the end
- **THEN** the script exits non-zero and names it

### Requirement: The server script keeps the host contract

The script SHALL NOT open an inbound port, touch a host's secret, or write under `/etc/wongstack` or `/opt/wongstack`, and SHALL stay at most 12 KiB, with a test that fails past the budget. `server/README.md` SHALL state the command, the input, the end state, and these limits. `server/` SHALL stay source-only, never installed or synced.

#### Scenario: The script grows too large

- **WHEN** a change makes `server/setup.sh` larger than 12 KiB
- **THEN** the source's tests fail and name the size and the budget

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
