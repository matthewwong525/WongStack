# install-onboarding Specification

## Purpose

How a person gets WongStack: one pasted prompt runs `/wong-setup` in an empty folder and installs everything through the normal workflow; the source also ships a script that makes a fresh server an agent workspace.

## Requirements

### Requirement: The README offers one prompt to paste

The README SHALL give a short prompt that follows `.agents/skills/wong-setup/SKILL.md` by its real path, works in any capable coding agent, and names a place to paste it without a terminal; it SHALL say to start in an empty folder with a Cloudflare account and one token.

#### Scenario: A newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one prompt, an app to paste it in, and what they need first

### Requirement: A plain walkthrough covers the whole path

The payload SHALL carry a plain, numbered walkthrough for the person that names every manual step (GitHub approval, tool installs, Cloudflare signup, the token) and says setup may install free tools after asking, never implying a manual step is automated.

#### Scenario: Reading before starting

- **WHEN** a newcomer reads the walkthrough
- **THEN** they can tell what they must do themselves and which steps open a browser

### Requirement: Setup installs only into an empty folder

`/wong-setup` SHALL install only into an empty folder, or one holding only a `.git` with no commits, and SHALL write nothing for any other folder; a folder with an install record SHALL go to `/wong-sync`. The install SHALL always take everything, with no component question.

#### Scenario: Empty folder

- **WHEN** a person runs setup in an empty folder with a Cloudflare token
- **THEN** setup installs everything without asking which parts to take

#### Scenario: A folder with files

- **WHEN** setup runs in a folder with files and no install record
- **THEN** it writes nothing and says setup starts from an empty folder

### Requirement: Setup readies the computer before it writes anything

Before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. A decline or failure SHALL stop setup with nothing written, and an existing git identity SHALL stay unchanged.

#### Scenario: A new computer

- **WHEN** setup runs where tools, sign-in, and git identity are missing
- **THEN** it installs tools after asking, signs in through GitHub in the browser, and sets git identity from that account

#### Scenario: Sign-in not completed

- **WHEN** the person does not finish the GitHub approval
- **THEN** setup stops and has created no Cloudflare resource

### Requirement: Setup waits for the Cloudflare token

Setup SHALL ask whether the person has the Cloudflare user token before anything is written, and with no token SHALL stop, write nothing, and say where to create it and that running setup again continues. It SHALL NOT report memory or hosting working when none exists.

#### Scenario: No token yet

- **WHEN** a person starts setup without a token
- **THEN** setup writes nothing and gives the route to create one

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
