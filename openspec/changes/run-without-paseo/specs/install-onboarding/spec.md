# Spec Delta

## MODIFIED Requirements

### Requirement: The README offers one prompt to paste

The README SHALL give one copyable prompt that names the WongStack GitHub repository, asks the agent to install it, and includes the raw address of `.agents/skills/wong-setup/SKILL.md` by its real path. The prompt SHALL name no target folder or folder to make first and SHALL work without a discovered setup slash command. The README SHALL send the person to Claude Code or Codex, running on their own computer, as the place to paste it, with no cloud-container session, and SHALL NOT name any other app as needed. It MAY name Paseo as one optional app to chat in. It SHALL say what they need first: a free GitHub account and a free Cloudflare account. Its steps SHALL end with opening the starter site and pasting its first message.

#### Scenario: A newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one prompt, an app to paste it in, and what they need first, with no step to make a folder

#### Scenario: The agent finds the runbook

- **WHEN** an agent receives only the copied prompt without a discovered setup skill
- **THEN** the message itself supplies the guide's raw address to read and follow

### Requirement: A plain walkthrough covers the whole path

The README SHALL carry the numbered install steps, and no other page SHALL repeat them. The payload's getting-started page SHALL link those steps and say what the README does not: what it costs, a numbered list of every manual step (the agent install, GitHub approval, tool installs, conditional Windows administrator approval, Cloudflare signup, the token), and what to do when something goes wrong. It SHALL say setup may install free tools after asking, and SHALL NOT imply a manual step is automated.

#### Scenario: Reading before starting

- **WHEN** a newcomer reads the walkthrough
- **THEN** they can tell what they must do themselves and which steps open a browser or a Windows permission prompt

#### Scenario: One copy of the steps

- **WHEN** the install steps change
- **THEN** only the README's steps need editing

### Requirement: Setup installs into an empty folder it finds or makes

`/wong-setup` SHALL install into the open folder when it is empty, or holds only a `.git` with no commits. A folder with an install record SHALL go to `/wong-sync`. Any other folder SHALL stay untouched: setup SHALL install instead into a new `wongstack` folder in the person's home folder, taking the next free numbered name when one exists with other files, and going to `/wong-sync` when one already holds WongStack. Setup SHALL make that folder without asking, only once it writes its first file, and SHALL say where it is and to open it in their assistant for later chats. The install SHALL always take everything, with no component question.

#### Scenario: Empty folder

- **WHEN** a person runs setup in an empty folder with a Cloudflare token
- **THEN** setup installs everything there without asking which parts to take

#### Scenario: A folder with files

- **WHEN** setup runs in a folder with files and no install record
- **THEN** it writes nothing in that folder, installs into a new `wongstack` folder in the home folder, and its closing report names that folder and says to open it in their assistant next time

## REMOVED Requirements

### Requirement: Setup points the person to Paseo
**Reason**: Paseo is one place to chat among several, so setup no longer reports it as missing.
**Migration**: Replaced by *Setup treats no chat app as missing*, below.

## ADDED Requirements

### Requirement: Setup treats no chat app as missing

Setup SHALL NOT report any chat app as missing or needed, SHALL NOT install one, and SHALL finish the same with or without Paseo. Its closing report SHALL say the person can keep chatting wherever their assistant runs. When Paseo is present, the closing report SHALL also say how to connect a phone.

#### Scenario: Paseo is absent

- **WHEN** setup runs on a computer without Paseo
- **THEN** it finishes the install and names no missing app

#### Scenario: Paseo is present

- **WHEN** setup finishes on a computer with Paseo
- **THEN** the closing report says how to pair a phone
