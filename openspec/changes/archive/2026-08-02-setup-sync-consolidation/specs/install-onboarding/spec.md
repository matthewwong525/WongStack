# install-onboarding — delta

## MODIFIED Requirements

### Requirement: wong-setup offers the stack pack as an opt-in

`wong-setup` SHALL offer the Cloudflare stack pack once during setup, as a single plain-language prompt, framed as optional with decline as the safe default. On acceptance it SHALL record `components.stackPack: true` in the seed manifest so `/wong-sync`'s pull installs the pack's files alongside the rest of the payload; on decline it SHALL leave `components.stackPack` false/absent and install no pack file. The offer SHALL NOT be a gate — declining never blocks or complicates the rest of setup.

The offer SHALL be phrased as an **outcome the user recognizes**, not an inventory of what ships. It SHALL NOT lead with product or component names (`D1`, `Workers`, "pipeline scripts", "seed template") — the audience is someone who does not know what those are, decline is the documented safe default, and a jargon-first offer therefore converts the target user into a decline by confusion. It SHALL name the practical cost honestly (a free Cloudflare account, a few minutes) and the practical result (a live address other people can open). Technical detail SHALL remain available for a user who asks, as a follow-up rather than as the prompt.

`wong-setup` SHALL NOT apply the pack's config fragments. On acceptance it SHALL name `/wong-cloudflare` as the follow-on step that configures and provisions, runnable whenever the user has a Cloudflare account. On decline it SHALL name the late-adoption route that actually works (per the stack-pack capability) rather than implying `/wong-sync` will offer the pack.

#### Scenario: User accepts the pack

- **WHEN** the user accepts the stack-pack offer during `wong-setup`
- **THEN** the seed manifest records `components.stackPack: true`
- **AND** the `/wong-sync` pull installs the pack's files with the rest of the payload
- **AND** setup applies no config fragment, telling the user `/wong-cloudflare` configures and provisions whenever they have a Cloudflare account

#### Scenario: User declines the pack

- **WHEN** the user declines the offer
- **THEN** setup proceeds normally, `components.stackPack` stays false/absent, and no pack file is installed
- **AND** any mention of taking the pack later names the working route

#### Scenario: The offer is not a toll gate

- **WHEN** the user declines or ignores the pack offer
- **THEN** the rest of setup completes exactly as it would for a repo that was never offered the pack

#### Scenario: A non-technical user meets the offer

- **WHEN** the offer is shown to someone who does not know what a database or a Worker is
- **THEN** the prompt describes the outcome in words they already understand and states what it will cost them
- **AND** it does not require them to recognize any product, component, or file name in order to answer

### Requirement: Agent-agnostic runbook

The `wong-setup` runbook SHALL be executable by any coding agent that can run shell commands and edit files — not only Claude. Claude-specific affordances (AskUserQuestion, subagents, the Skill tool) SHALL be phrased as "if available" with plain fallbacks. The runbook SHALL state outcomes to reach rather than command sequences, keeping verbatim only the shared clone cache path (a marked copy of the value `wong-sync` owns) and the few commands handed to the user to run themselves. The seed-manifest schema SHALL NOT be restated in `wong-setup`: the manifest schema has one owner in the `wong-sync` skill, and setup SHALL reference it, writing the same shape with `version` and `commit` null. Setup SHALL ask which agent(s) drive the repo, pass them to `openspec init --tools`, and — when the answer is not (only) Claude — note where the skills live and offer an AGENTS.md pointer to them.

#### Scenario: Executed by a non-Claude agent

- **WHEN** a Codex-style agent reads the paste-prompt URL and follows the runbook
- **THEN** every step is achievable with shell + file edits and plain-text questions; nothing requires a Claude-only tool

#### Scenario: Non-Claude repo tooling

- **WHEN** the user says their repo is driven by an agent other than Claude
- **THEN** setup passes that tool to `openspec init --tools` and offers an AGENTS.md pointer to `.claude/skills/`

#### Scenario: The seed manifest matches wong-sync's schema by construction

- **WHEN** `wong-setup` writes the seed manifest
- **THEN** it follows the schema stated in the `wong-sync` skill, with `version` and `commit` null
- **AND** no second copy of the schema exists in the payload to drift
