## MODIFIED Requirements

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

### Requirement: wong-setup offers the stack pack as an opt-in

`wong-setup` SHALL offer the Cloudflare stack pack once during setup, as a single plain-language prompt, framed as optional with decline as the safe default. On acceptance it SHALL record `components.stackPack: true` in the seed manifest so `/wong-sync`'s fresh-mode pull installs the pack's files alongside the rest of the payload; on decline it SHALL leave `components.stackPack` false/absent and install no pack file. The offer SHALL NOT be a gate — declining never blocks or complicates the rest of setup.

The offer SHALL be phrased as an **outcome the user recognizes**, not an inventory of what ships. It SHALL NOT lead with product or component names (`D1`, `Workers`, "pipeline scripts", "seed template") — the audience is someone who does not know what those are, decline is the documented safe default, and a jargon-first offer therefore converts the target user into a decline by confusion. It SHALL name the practical cost honestly (a free Cloudflare account, a few minutes) and the practical result (a live address other people can open). Technical detail SHALL remain available for a user who asks, as a follow-up rather than as the prompt.

On acceptance the offer SHALL name provisioning as the follow-on step and make clear it can be run later, since the Cloudflare token typically arrives after onboarding does.

#### Scenario: User accepts the pack

- **WHEN** the user accepts the stack-pack offer during `wong-setup`
- **THEN** the seed manifest records `components.stackPack: true`
- **AND** the fresh-mode `/wong-sync` pull installs the pack's files with the rest of the payload
- **AND** the user is told that provisioning is the next step and may be run whenever they have a Cloudflare account

#### Scenario: User declines the pack

- **WHEN** the user declines the offer
- **THEN** setup proceeds normally, `components.stackPack` stays false/absent, and no pack file is installed

#### Scenario: The offer is not a toll gate

- **WHEN** the user declines or ignores the pack offer
- **THEN** the rest of setup completes exactly as it would for a repo that was never offered the pack

#### Scenario: A non-technical user meets the offer

- **WHEN** the offer is shown to someone who does not know what a database or a Worker is
- **THEN** the prompt describes the outcome in words they already understand and states what it will cost them
- **AND** it does not require them to recognize any product, component, or file name in order to answer

## ADDED Requirements

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
