# Spec Delta

## MODIFIED Requirements

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
