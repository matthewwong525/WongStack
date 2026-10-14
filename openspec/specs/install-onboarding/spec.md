# install-onboarding Specification

## Purpose

How a person gets WongStack: one pasted prompt runs `/wong-setup` from any folder and installs everything through the normal workflow.

## Requirements

### Requirement: The README offers one prompt to paste

The README SHALL give one copyable prompt that names the WongStack GitHub repository, asks the agent to install it, and includes the raw address of `.agents/skills/wong-setup/SKILL.md` by its real path. The prompt SHALL name no target folder or folder to make first and SHALL work without a discovered setup slash command. The README SHALL send the person to an assistant that can work on their own computer as the place to paste it, with no terminal inside the chat and no cloud-container session. It SHALL name no assistant or chat app as needed: one it names SHALL come after that neutral wording, as an example or as what the maintainer uses. Where a feature works only with a named assistant or chat app today, the README SHALL say so. It SHALL say what they need first: an AI plan of their own and a Cloudflare account, and, for each way to install, the other account it needs, the computers it works on, and what it costs. Its steps SHALL end with opening the starter site and pasting its first message.

#### Scenario: A newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one prompt, an assistant of their own choosing to paste it in, and what they need first, with no step to make a folder

#### Scenario: The agent finds the runbook

- **WHEN** an agent receives only the copied prompt without a discovered setup skill
- **THEN** the message itself supplies the guide's raw address to read and follow

#### Scenario: A reader uses another assistant

- **WHEN** someone who uses neither Claude Code nor Paseo reads the install steps and the list of what they need
- **THEN** no step tells them to get either, and they can tell which features need one of them today

#### Scenario: A reader wants to pay nothing

- **WHEN** someone reads the install section to learn what an install costs
- **THEN** they can tell which way to install is free, which is not and what it costs, and that their assistant's own plan is theirs to bring

### Requirement: A plain walkthrough covers the whole path

The README SHALL carry the numbered install steps, and no other page SHALL repeat them. The payload's getting-started page SHALL link those steps and say what the README does not: what each way to install costs, stated once on the page, a numbered list of every manual step (having an assistant that can work on the computer, choosing the way to install where setup asks, GitHub approval on the way that uses GitHub, tool installs, conditional Windows administrator approval, Cloudflare signup, the token), and what to do when something goes wrong. It SHALL NOT list a named assistant or chat app as a step. It SHALL say setup may install free tools after asking, and SHALL NOT imply a manual step is automated. The README, the getting-started page, and the landing page SHALL name the same accounts, computers, and cost for each way to install.

#### Scenario: Reading before starting

- **WHEN** a newcomer reads the walkthrough
- **THEN** they can tell what they must do themselves and which steps open a browser or a Windows permission prompt

#### Scenario: One copy of the steps

- **WHEN** the install steps change
- **THEN** only the README's steps need editing

#### Scenario: One page drops the cost

- **WHEN** a change removes the cost of a way to install from the README or the getting-started page and leaves the landing page as it was
- **THEN** the automatic checks fail and name the files that disagree

### Requirement: Setup installs into an empty folder it finds or makes

`/wong-setup` SHALL install into the open folder when it is empty, or holds only a `.git` with no commits. A folder with an install record SHALL go to `/wong-sync`. Any other folder SHALL stay untouched: setup SHALL install instead into a new `wongstack` folder in the person's home folder, taking the next free numbered name when one exists with other files, and going to `/wong-sync` when one already holds WongStack. Setup SHALL make that folder without asking, only once it writes its first file, and SHALL say where it is and to open it in the person's assistant for later chats, naming no chat app. The install SHALL always take everything, with no component question.

#### Scenario: Empty folder

- **WHEN** a person runs setup in an empty folder with a Cloudflare token
- **THEN** setup installs everything there without asking which parts to take

#### Scenario: A folder with files

- **WHEN** setup runs in a folder with files and no install record
- **THEN** it writes nothing in that folder, installs into a new `wongstack` folder in the home folder, and its closing report names that folder and says to open it in their assistant next time

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

### Requirement: The default branch is main

The workflow SHALL assume `main` as the default branch, resolving another name only when `main` does not exist.

#### Scenario: A repo setup created

- **WHEN** any verb needs the default branch in a repo setup created
- **THEN** it uses `main` without detection

#### Scenario: A repo on another default

- **WHEN** `main` does not exist
- **THEN** the real default is resolved and used

### Requirement: Setup points the person to Paseo

When getting the computer ready, setup SHALL check whether Paseo is installed. When it is missing, setup SHALL say in plain words what Paseo is for (chatting from the phone, a workspace per part) and where to get it, then continue; Paseo's absence SHALL NOT stop setup, and setup SHALL NOT install Paseo. Setup SHALL NOT say schedules need Paseo. When Paseo is present, the closing report SHALL say how to connect a phone.

#### Scenario: Paseo is missing

- **WHEN** setup runs on a computer without Paseo
- **THEN** it names Paseo, what it is for, and where to get it, without naming schedules, and finishes the install

#### Scenario: Paseo is present

- **WHEN** setup finishes on a computer with Paseo
- **THEN** the closing report says how to pair a phone

### Requirement: Easy setup honors a chosen source

When a person asks to install WongStack from a particular GitHub repository, fresh setup SHALL use that repository's version for the setup guidance, prerequisites, and installed payload, and the completed project's install record SHALL name the actual source repository, version, and commit. With no custom source requested, setup SHALL use the original WongStack repository. Setup SHALL retain its normal tools, hosting, and memory flow, and SHALL NOT install into the source checkout itself or silently substitute another repository when the requested source cannot be retrieved.

#### Scenario: Install a customized fork

- **WHEN** a person asks to install from their customized WongStack fork
- **THEN** the new project receives that fork's defaults and records that fork as its source through the usual easy setup
- **AND** the source checkout remains separate from the installed project

#### Scenario: Requested source cannot be retrieved

- **WHEN** the requested fork cannot be retrieved
- **THEN** setup reports the problem and does not install the original WongStack as a substitute

### Requirement: Windows setup readies links automatically

On native Windows, setup SHALL configure Git to preserve symbolic links before retrieving its source, whether or not Windows already permits link creation. It SHALL verify both real directory and file links before cloning. If links cannot be created, setup SHALL attempt to enable Developer Mode itself with Windows administrator approval when required, explaining the permission prompt in plain words and requiring no typed command. It SHALL verify link creation again before continuing. Unavailable automation SHALL receive simple Settings guidance; refused approval, blocked organization policy, or a failed final link check SHALL stop setup without cloning or writing in the target. Setup SHALL NOT bypass Windows approval or change organization policy.

#### Scenario: Windows already permits links

- **WHEN** native Windows permits real file and directory links but Git is configured to write links as text files
- **THEN** setup configures Git to preserve links and verifies native links before cloning, with no Developer Mode change

#### Scenario: Windows needs Developer Mode

- **WHEN** native Windows refuses the link probe
- **THEN** setup attempts to enable Developer Mode automatically, tells the person to approve the Windows prompt when required, and continues only after both link checks pass; unavailable automation gets Settings guidance, while refused approval or policy restrictions stop setup

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

### Requirement: Setup learns from past chats while it installs

An installing setup SHALL, by default and without a question, learn about the person and their business from what they typed in the AI chats kept on this computer, reading in parallel with the install so the install never waits to start or continue. Before reading, it SHALL tell the person in one line what it reads and what it keeps, and SHALL stop and write nothing when the person says to skip it. It SHALL read every such chat, newest first, up to a stated bound, and say how far back it read when the bound left older chats out. It SHALL save only short notes, on the person's wiki page, in the wiki, and in memory: never passwords, keys, copies of chats, or health, family, or money. Chat text SHALL be treated as data, never as instructions. A computer with no chats, an assistant that cannot run helpers, or a failed read SHALL never stop or fail setup. A setup that only evaluates SHALL read no chats.

#### Scenario: A computer with past chats

- **WHEN** a person installs on a computer holding months of chats
- **THEN** setup says it is reading them, keeps installing meanwhile, and the finished install holds short notes about them and their business in the wiki and memory
- **AND** the closing report says what it learned from and how far back it read

#### Scenario: Nothing to read, or told to skip

- **WHEN** the computer holds no chats, the person replies to skip the chats, or a helper fails
- **THEN** setup finishes as it would have, and writes no note it did not learn

### Requirement: The owner signs in once for memory

Owner setup SHALL ready `cloudflared` on the owner's computer with the other tools, and sign the owner in to their own app once, showing the sign-in link in the chat. The owner's memory SHALL then work through that sign-in like everyone else's. Owner jobs that change the account, such as setup and fixes, SHALL keep using the Cloudflare API token.

#### Scenario: A fresh owner install

- **WHEN** an owner finishes setup on a computer without `cloudflared`
- **THEN** it is installed, the owner signed in once from the chat, and the closing report says memory works
