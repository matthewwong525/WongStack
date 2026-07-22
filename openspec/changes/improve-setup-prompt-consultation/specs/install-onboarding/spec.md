## MODIFIED Requirements

### Requirement: Consultation is skippable

`wong-setup` SHALL run the discovery-and-diagnosis consultation by **default**, and SHALL fast-path straight to setup **only** when the user gives an explicit skip signal — asking to skip the questions or to just install it. A request that merely names WongStack or asks to set it up (e.g. the README paste, "set up WongStack in this repo") SHALL NOT count as a skip signal; it SHALL run the consultation. The consultation SHALL never be a toll gate: an explicit skip is always honored immediately.

#### Scenario: Default paste runs the consultation

- **WHEN** the user hands the skill a plain setup request ("set up WongStack in this repo", or the README paste prompt) with no skip signal
- **THEN** the skill runs discovery, diagnosis, and the fit verdict before any setup work

#### Scenario: Explicit skip is honored

- **WHEN** the user asks to skip the questions or says "just install it"
- **THEN** the skill proceeds directly to setup without requiring the discovery conversation

### Requirement: Warm one-paste front door

The README SHALL present a short, warm, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` (so the README never drifts from the runbook), SHALL note that the skill will honestly assess fit ("not sure it's for you? it'll tell you"), and SHALL point newcomers to Claude Code's web/desktop version at claude.ai/code as the least terminal-intensive way to run that first paste — while the prompt itself works in any coding agent. The prompt's wording SHALL frame the paste as a request to **evaluate fit and guide the user through it** rather than a command to install outright, so that following it triggers the consultation instead of bypassing it.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short warm prompt to paste that reads+follows the `wong-setup` runbook URL, a note that it assesses fit honestly, and a pointer to claude.ai/code for running it without a heavy terminal setup

#### Scenario: The paste invites the consultation

- **WHEN** an agent follows the pasted prompt in a repo with no WongStack manifest
- **THEN** the prompt's wording leads it to run `wong-setup`'s consultation and fit verdict, not to jump straight to install
