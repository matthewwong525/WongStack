## MODIFIED Requirements

### Requirement: The README offers one prompt to paste

The README SHALL give one copyable prompt that names the WongStack GitHub repository, asks the agent to install it, and includes the raw address of `.agents/skills/wong-setup/SKILL.md` by its real path. The prompt SHALL name no target folder or folder to make first and SHALL work without a discovered setup slash command. The README SHALL send the person to Paseo, running Claude Code or Codex on their own computer, as the place to paste it, with no terminal inside the chat and no cloud-container session. It SHALL say what they need first: a free GitHub account and a free Cloudflare account. Its steps SHALL end with opening the starter site and pasting its first message.

#### Scenario: A newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one prompt, an app to paste it in, and what they need first, with no step to make a folder

#### Scenario: The agent finds the runbook

- **WHEN** an agent receives only the copied prompt without a discovered setup skill
- **THEN** the message itself supplies the guide's raw address to read and follow

### Requirement: A plain walkthrough covers the whole path

The README SHALL carry the numbered install steps, and no other page SHALL repeat them. The payload's getting-started page SHALL link those steps and say what the README does not: what it costs, a numbered list of every manual step (the agent install, Paseo, GitHub approval, tool installs, conditional Windows administrator approval, Cloudflare signup, the token), and what to do when something goes wrong. It SHALL say setup may install free tools after asking, and SHALL NOT imply a manual step is automated.

#### Scenario: Reading before starting

- **WHEN** a newcomer reads the walkthrough
- **THEN** they can tell what they must do themselves and which steps open a browser or a Windows permission prompt

#### Scenario: One copy of the steps

- **WHEN** the install steps change
- **THEN** only the README's steps need editing

## ADDED Requirements

### Requirement: Windows setup readies links automatically

On native Windows, setup SHALL configure Git to preserve symbolic links before retrieving its source, whether or not Windows already permits link creation. It SHALL verify both real directory and file links before cloning. If links cannot be created, setup SHALL attempt to enable Developer Mode itself with Windows administrator approval when required, explaining the permission prompt in plain words and requiring no typed command. It SHALL verify link creation again before continuing. Unavailable automation SHALL receive simple Settings guidance; refused approval, blocked organization policy, or a failed final link check SHALL stop setup without cloning or writing in the target. Setup SHALL NOT bypass Windows approval or change organization policy.

#### Scenario: Windows already permits links

- **WHEN** native Windows permits real file and directory links but Git is configured to write links as text files
- **THEN** setup configures Git to preserve links and verifies native links before cloning, with no Developer Mode change

#### Scenario: Windows needs Developer Mode

- **WHEN** native Windows refuses the link probe
- **THEN** setup attempts to enable Developer Mode automatically, tells the person to approve the Windows prompt when required, and continues only after both link checks pass; unavailable automation gets Settings guidance, while refused approval or policy restrictions stop setup
