# install-onboarding Specification

## Purpose
How `wong-setup` — the consultative front door — welcomes someone considering WongStack: it researches the repo first, listens for where the workflow hurts, maps pains to the verbs via its fit playbook, and gives an honest fit verdict (including "not a good fit") before anything installs. On a yes it makes `/wong-sync` runnable and hands the install to its fresh mode. It bootstraps from zero (no repo/git/GitHub), narrates setup in plain language one thing at a time, ends by handing over a concrete first command, and is fronted by a warm one-paste README door that any coding agent can execute.
## Requirements
### Requirement: Research before the conversation

`wong-setup` SHALL run its deep-research step (the target-repo survey: what the app is, how it ships, CLAUDE.md, the wiki at its resolved root — `wiki/`, falling back to `docs/` — skills, OpenSpec, legacy traces, GitHub readiness) *before* any discovery conversation, and SHALL use the findings to make its questions specific to the repo rather than generic.

#### Scenario: Informed discovery

- **WHEN** the skill runs in a repo with no CI and a stale wiki folder
- **THEN** the discovery questions reference those findings (e.g. asking how they verify a change today) instead of asking from a blank script

### Requirement: Pain discovery and diagnosis via the fit playbook

`wong-setup` SHALL hold a short discovery conversation — how the user works with a coding agent today and where it hurts — and SHALL map the surfaced pains to the specific WongStack verbs that address them, using the pain→verb map in its `references/fit-playbook.md`. The playbook SHALL carry the discovery question bank, the pain→verb map, and the disqualifiers with alternatives; SKILL.md SHALL NOT inline that content. The skill's prose SHALL stay in a consultative register — asking, diagnosing, recommending — with no marketing language.

#### Scenario: Pain maps to a verb

- **WHEN** the user says work gets lost between agent sessions
- **THEN** the skill connects that pain to change folders plus `/continue`, per the playbook's map, in plain factual language

### Requirement: Honest fit verdict with a first-class not-a-fit exit

After discovery, `wong-setup` SHALL give an explicit fit verdict. When a playbook disqualifier holds (e.g. a non-GitHub forge, no willingness to use git, a locked-in workflow the loop would fight, no ongoing changes to manage), the skill SHALL say WongStack is not a good fit, explain why, suggest an alternative from the playbook, and stop without changing the repo.

#### Scenario: Not a good fit

- **WHEN** discovery reveals the team hosts on a non-GitHub forge and won't move
- **THEN** the skill states the mismatch plainly, offers what to consider instead, invites them back if circumstances change, and makes no changes to the repo

#### Scenario: Good fit

- **WHEN** discovery surfaces pains the verbs address and no disqualifier holds
- **THEN** the skill summarizes the pain→verb mapping as its recommendation and proceeds to setup

### Requirement: Consultation is skippable

`wong-setup` SHALL run the discovery-and-diagnosis consultation by **default**, and SHALL fast-path straight to setup **only** when the user gives an explicit skip signal — asking to skip the questions or to just install it. A request that merely names WongStack or asks to set it up (e.g. the README paste, "set up WongStack in this repo") SHALL NOT count as a skip signal; it SHALL run the consultation. The consultation SHALL never be a toll gate: an explicit skip is always honored immediately.

#### Scenario: Default paste runs the consultation

- **WHEN** the user hands the skill a plain setup request ("set up WongStack in this repo", or the README paste prompt) with no skip signal
- **THEN** the skill runs discovery, diagnosis, and the fit verdict before any setup work

#### Scenario: Explicit skip is honored

- **WHEN** the user asks to skip the questions or says "just install it"
- **THEN** the skill proceeds directly to setup without requiring the discovery conversation

### Requirement: Setup scope is making wong-sync runnable, then handing off

On a yes (or the fast path), `wong-setup` SHALL NOT copy the payload itself. It SHALL reach these outcomes — a git repo with at least one commit; `gh` installed, authed, and an `origin` remote that resolves (offered one plain-language rung at a time, only after the verdict, never during the consultation); the OpenSpec CLI present and `openspec init` run with the tools the user's agent(s) need; the authored content in place (CLAUDE.md "What this is" from the research + conversation, a wiki hub README when none exists); the `wong-sync` skill copied in (its only payload file operation); and a **seed manifest** written (`commit: null`, `version: null`, the `upstream` block, and any skill renames agreed during collision discussion). It SHALL then hand off to `/wong-sync` — by file path, "read and follow `.claude/skills/wong-sync/SKILL.md`" — whose fresh mode performs the install, and SHALL close with the real-first-step report after wong-sync finishes.

#### Scenario: Fresh repo, sold user

- **WHEN** the verdict is yes in a repo with no WongStack presence
- **THEN** wong-setup bootstraps the environment outcomes, authors the non-payload content, copies in `wong-sync`, writes the seed manifest, and hands off to `/wong-sync` — which pulls the whole payload as its fresh-mode sync

#### Scenario: No payload copy-loop

- **WHEN** wong-setup's setup phase completes
- **THEN** the only payload file it has copied is the `wong-sync` skill; every other payload file arrives via wong-sync's manifest-driven pull

### Requirement: Agent-agnostic runbook

The `wong-setup` runbook SHALL be executable by any coding agent that can run shell commands and edit files — not only Claude. Claude-specific affordances (AskUserQuestion, subagents, the Skill tool) SHALL be phrased as "if available" with plain fallbacks. The runbook SHALL state outcomes to reach rather than command sequences, keeping verbatim only the seed-manifest schema, the shared clone cache path, and the few commands handed to the user to run themselves. Setup SHALL ask which agent(s) drive the repo, pass them to `openspec init --tools`, and — when the answer is not (only) Claude — note where the skills live and offer an AGENTS.md pointer to them.

#### Scenario: Executed by a non-Claude agent

- **WHEN** a Codex-style agent reads the paste-prompt URL and follows the runbook
- **THEN** every step is achievable with shell + file edits and plain-text questions; nothing requires a Claude-only tool

#### Scenario: Non-Claude repo tooling

- **WHEN** the user says their repo is driven by an agent other than Claude
- **THEN** setup passes that tool to `openspec init --tools` and offers an AGENTS.md pointer to `.claude/skills/`

### Requirement: install-wong-stack is removed outright

The `install-wong-stack` skill SHALL be deleted — directory and all live references (README, payload manifest, wong-sync, docs, legacy-trace lists) — with no tombstone or migration machinery, since no installed base exists. Historical CHANGELOG entries SHALL keep the old name as the release record.

#### Scenario: No trace in the tree

- **WHEN** the payload ships at 6.0.0
- **THEN** `.claude/skills/install-wong-stack/` does not exist and the only remaining mentions of the name are historical CHANGELOG entries and archived changes

### Requirement: Bootstrap from zero

The `wong-setup` skill SHALL treat "no git repository yet" (an empty or non-repo folder) as a first-class, supported starting point, and SHALL NOT assume the user is already inside a git repo. When no repo exists, it SHALL offer, in plain language and only after confirmation, to create one and continue the setup — never failing or dead-ending the newcomer.

#### Scenario: Empty folder, never touched git

- **WHEN** the skill runs in a folder with no `.git` and the user has never used git
- **THEN** it explains in plain language that it will set up a repo for them, offers to create it (with an initial commit), and — only on confirmation — proceeds into the rest of the setup

#### Scenario: Already in a repo

- **WHEN** the skill runs inside an existing git repo
- **THEN** it skips the bootstrap-from-zero path and proceeds as before, without asking repo-creation questions

### Requirement: Plain-language, one-thing-at-a-time narration

The skill SHALL present its newcomer-facing setup (GitHub readiness and setup questions) as a guided conversation that explains *why* each piece is needed and asks about one thing at a time, rather than presenting a wall of tool checks at once. It SHALL state in plain language what it is about to set up before it begins changing anything. The underlying outcomes and checks SHALL remain intact and precise for the executing agent.

#### Scenario: GitHub not yet set up

- **WHEN** the newcomer lacks `gh`, auth, or a remote
- **THEN** the skill introduces each missing piece with a one-line plain-language reason, offers to handle it, and waits — rather than listing all gaps as raw tool-check output

#### Scenario: Setup preamble

- **WHEN** setup begins after the verdict
- **THEN** before any change is made, the skill tells the user in plain language what it is about to set up and confirms readiness

#### Scenario: Checks preserved

- **WHEN** the friendlier narration is applied
- **THEN** every readiness outcome is still reached; only the human-facing framing changes

### Requirement: End with a real first step

On successful setup, the skill SHALL end by handing the user a concrete first command to run (e.g. a suggested `/plan ...`, ideally tied to the first pain they named) so a newcomer knows exactly how to get started, rather than only reporting what was installed.

#### Scenario: Setup completes

- **WHEN** the setup finishes successfully (after wong-sync's fresh-mode pull)
- **THEN** the closing report includes an explicit, copy-pasteable first command the user can run next

### Requirement: Warm one-paste front door

The README SHALL present a short, warm, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` (so the README never drifts from the runbook), SHALL note that the skill will honestly assess fit ("not sure it's for you? it'll tell you"), and SHALL point newcomers to Claude Code's web/desktop version at claude.ai/code as the least terminal-intensive way to run that first paste — while the prompt itself works in any coding agent. The prompt's wording SHALL frame the paste as a request to **evaluate fit and guide the user through it** rather than a command to install outright, so that following it triggers the consultation instead of bypassing it.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short warm prompt to paste that reads+follows the `wong-setup` runbook URL, a note that it assesses fit honestly, and a pointer to claude.ai/code for running it without a heavy terminal setup

#### Scenario: The paste invites the consultation

- **WHEN** an agent follows the pasted prompt in a repo with no WongStack manifest
- **THEN** the prompt's wording leads it to run `wong-setup`'s consultation and fit verdict, not to jump straight to install

