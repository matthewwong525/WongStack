# install-onboarding Specification

## Purpose
How `wong-setup` — the guided front door — welcomes someone considering WongStack: it researches the repo first, listens for how the team works, maps process needs to WongStack's verbs and knowledge surfaces, and stops safely before changes when a hard mismatch means the workflow cannot operate. When setup proceeds it makes `/wong-sync` runnable and hands the install to its fresh mode. It bootstraps from zero (no repo/git/GitHub), narrates setup in plain language one thing at a time, ends by handing over a concrete first command, and is fronted by a warm one-paste README door that any capable coding agent can execute.
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

After research and any discovery, `wong-setup` SHALL guide the user through onboarding and process alignment. It SHALL stop without changing the repo when a hard playbook disqualifier holds (e.g. a non-GitHub forge, no willingness to use git, a locked-in workflow the loop would fight, no ongoing changes to manage), explain the mismatch plainly, and suggest an alternative from the playbook. Public-facing wording SHALL NOT repeatedly foreground fit verdicts or make setup feel like an admissions test; mismatch handling remains a safety exit for cases where the workflow cannot operate.

#### Scenario: Hard mismatch stops setup

- **WHEN** discovery reveals the team hosts on a non-GitHub forge and won't move
- **THEN** the skill states the mismatch plainly, offers what to consider instead, and makes no changes to the repo

#### Scenario: Normal onboarding is not framed as denial

- **WHEN** the README or setup runbook introduces WongStack to a newcomer
- **THEN** it presents setup as guided onboarding into a repo-native knowledge workflow
- **AND** it does not repeatedly emphasize "not a good fit" as the main product promise

#### Scenario: Recommendation still maps user needs to verbs

- **WHEN** discovery surfaces pains the verbs address and no disqualifier holds
- **THEN** the skill summarizes how WongStack's commands and knowledge surfaces address those needs and proceeds to setup after consent

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

When `gh` authentication is established or repaired during setup, it SHALL request the `workflow` scope alongside the defaults (`gh auth login --scopes workflow`). The scope is not in `gh auth login`'s minimum set, and without it any later push of a `.github/workflows/*.yml` file fails with `refusing to allow an OAuth App to create or update workflow` — at push time, long after setup reported success. Requesting it during the browser visit setup already performs costs the user no additional step. For a user already authenticated without it, `gh auth refresh --scopes workflow` SHALL be the documented repair.

The OpenSpec CLI outcome SHALL be reached without pre-emptively installing a language runtime; when Node is absent, setup asks at the point of need per the runtime-install requirement, and completes the runtime-free layer if the user declines.

#### Scenario: Fresh repo, sold user

- **WHEN** the verdict is yes in a repo with no WongStack presence
- **THEN** wong-setup bootstraps the environment outcomes, authors the non-payload content, copies in `wong-sync`, writes the seed manifest, and hands off to `/wong-sync` — which pulls the whole payload as its fresh-mode sync

#### Scenario: No payload copy-loop

- **WHEN** wong-setup's setup phase completes
- **THEN** the only payload file it has copied is the `wong-sync` skill; every other payload file arrives via wong-sync's manifest-driven pull

#### Scenario: gh auth is established during setup

- **WHEN** setup runs `gh auth login` because `gh` is unauthenticated
- **THEN** it requests the `workflow` scope in the same browser consent, so a later workflow-file push succeeds

#### Scenario: Already authenticated without the workflow scope

- **WHEN** `gh` is already authenticated but the stored credentials lack `workflow`, in a repo that took or is taking the stack pack
- **THEN** setup detects this and offers `gh auth refresh --scopes workflow`, explaining in plain language that pushing the deploy workflow needs it
- **AND** the failure is surfaced during setup rather than at the first push

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

### Requirement: Warm one-paste front door

The README SHALL present a short, beginner-friendly paste-able setup prompt that keeps the URL-read mechanism pointed at `wong-setup/SKILL.md` so the README does not drift from the runbook. The prompt and surrounding copy SHALL frame WongStack as an agent-agnostic, repo-native AI knowledge center that centralizes process and captures knowledge through work. The README SHALL mention Claude Code as an easy place to run the prompt while making clear that any coding agent with file, edit, and shell access can follow it.

#### Scenario: Newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one short prompt to paste that reads and follows the `wong-setup` runbook URL
- **AND** they understand the setup creates a knowledge-centered workflow in the repo

#### Scenario: Agent-agnostic prompt

- **WHEN** a user runs the prompt in Claude Code, Codex, Cursor, or another capable coding agent
- **THEN** the prompt wording does not depend on Claude-only behavior
- **AND** the README explains the agent needs to read files, edit files, run shell commands, and ask questions

### Requirement: The paste-to-running-app path is documented for the person walking it


The payload SHALL carry a short, human-facing account of the whole path — what the user does, in order, and what they get at each stage — distinct from the agent-facing provisioning runbook. It SHALL be written for someone non-technical: numbered actions, plain language, no assumed vocabulary. It SHALL state honestly which steps are irreducibly manual (Cloudflare signup, creating the first token, and the `gh` browser login) and SHALL NOT imply that steps requiring a human are automated.

This document SHALL be the reference the end-to-end fresh-repo test is run against, so that a step which reads clearly but plays badly is caught.

#### Scenario: A newcomer reads before starting

- **WHEN** someone who has never used the toolkit reads the walkthrough
- **THEN** they can tell how many things they personally have to do, what each one is, and roughly how long it takes
- **AND** every step that requires leaving the agent for a browser is called out as such

#### Scenario: The walkthrough matches the tested reality

- **WHEN** the end-to-end fresh-repo test runs
- **THEN** it follows this walkthrough as written
- **AND** any divergence found is corrected in the walkthrough rather than left as tribal knowledge
