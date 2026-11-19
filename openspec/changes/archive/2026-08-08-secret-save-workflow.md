<!-- openspec-archive v1 2026-08-08-secret-save-workflow -->
<!-- file proposal.md utf8 4491 -->
# Secret save workflow

**Status:** ready-to-ship
**Open questions:** none

## Why

Each linked worktree currently gets its own ignored secrets files, so an agent can save or rotate a credential in a disposable checkout while the durable primary worktree keeps an older value. Later workflows then lose the credential or read a different copy, even though the repository's guidance says credentials already live in the repo environment.

## What Changes

- Make the primary worktree's ignored environment file the durable local store for real secret values, while retaining stack-specific dotenv equivalents.
- Require linked-worktree workflows to resolve that durable store and, where checkout-local tooling needs a conventional path, use an ignored link rather than a second independently editable copy.
- Clarify the committed example contract: a new secret adds its blank variable name and sourcing guidance to the active branch's `.env.example` (or equivalent), while rotations never put the value in git and need no template edit unless the contract changed.
- Make Cloudflare provisioning write and reread the durable credential file and make the staging walkthrough find the same credentials from any worktree.
- Make `/save` the universal checkpoint that preserves any explicitly supplied or rotated session secret in the durable file, maintains its blank example declaration when required, and excludes values from notes and other committed handoff surfaces.
- Make `/ship` invoke ordinary `/save` exactly once after `/ship` performs its owned OpenSpec archive step, so commit, push, PR update, secret/note capture, and CI handling have one implementation before `/ship` merges without a special command mode.
- Update the shipped guidance and examples, then release the payload with a version bump and changelog entry.
- **Non-goals:** synchronizing secrets between machines, committing encrypted secret values, replacing platform secret stores, or making `.env` mandatory in repos that use another stack convention.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `secrets-convention`: Define worktree-safe durable storage for real values and the names-only contract for committed example files.
- `cloudflare-provisioning`: Resolve, create, verify, and update the primary worktree credential file rather than a linked worktree copy.
- `staging-walkthrough`: Resolve the durable repository credential when a walk runs from any linked worktree.
- `session-notes`: Require `/save` to exclude secret values while retaining the non-secret context that a credential changed.
- `delivery-gate`: Make `/ship` delegate its branch checkpoint and CI path to `/save` instead of duplicating those mechanics.

## Impact

This changes the shipped secrets wiki page, the generic `WONG-STACK` agent guidance, environment example prose, `/wong-cloudflare`, `/walk` credential preflight, and the `/save` and `/ship` runbooks (including their `.claude/` and `.agents/` mirrors). It changes no external API and adds no dependency, but it is a behavioral payload release requiring `VERSION`, `CHANGELOG.md`, and the payload-link check.

## Decision log

- **2026-08-08** — Implemented the complete worktree-safe secret workflow and released it as 9.5.0. Git or agent hooks were rejected as the primary mechanism because they do not reliably observe ignored-file writes across agents; `/save` owns preservation and leak checks, with hooks left as optional defense-in-depth. `/ship` now performs its OpenSpec archive first and delegates the exact archive/code checkpoint to `/save --shipping`, eliminating duplicate commit, PR, and branch-CI logic while ensuring CI checks the commit that merges.
- **2026-08-08** — Simplified the ship handoff after review: two saves were rejected as redundant, and the special `--shipping` interface was removed. `/ship` archives first and invokes ordinary `/save` exactly once; `/save` safely infers the uniquely matching archive from the current branch, while `/ship` applies the stricter merge interpretation to the returned gate result. This keeps the archive inside the tested commit without duplicating checkpoint logic or adding user-visible modes.
- **2026-08-08** — Archived the completed change after confirming all 26 tasks, the five synced capability deltas, and the default-branch preflight. Ordinary `/save` recognized this archive as the branch handoff and created the exact checkpoint `/ship` will gate before merge.

<!-- end proposal.md -->
<!-- file design.md utf8 11126 -->
## Context

Git shares history and repository metadata across linked worktrees, but ignored files belong to each checkout. WongStack currently says real values live in the repo-root `.env`; from a linked worktree that phrase resolves to a disposable checkout. `/wong-cloudflare` creates and updates that copy, while `/walk` reads the active checkout's copy. A credential can therefore exist, rotate, or disappear independently in every worktree.

The committed `.env.example` has the opposite lifecycle: its blank declarations and sourcing comments are branch content and must be edited in the active change. Treating both files as though they have the same location conflates machine-local state with versioned repository state.

## Goals / Non-Goals

**Goals:**

- Give each local repository one durable canonical copy of real dotenv values, located in its primary worktree.
- Make secret-writing and secret-consuming WongStack workflows resolve the same canonical file from normal and linked worktrees.
- Keep committed example files values-blank and update them only when the variable contract changes.
- Preserve stack-neutral wording and support repositories whose equivalent files are not named `.env` and `.env.example`.
- Handle existing duplicate files without printing values or silently discarding credentials.

**Non-Goals:**

- Synchronizing secrets across clones or machines.
- Encrypting or committing secret values.
- Replacing GitHub, Cloudflare, or other deployed secret stores.
- Automatically merging arbitrary dotenv files or deciding which conflicting value is newer.
- Making application frameworks load a file from outside their active checkout without an explicit ignored link or equivalent stack configuration.

## Decisions

### The primary worktree is the durable local store

Resolve the current checkout with `git rev-parse --show-toplevel`, the absolute per-worktree git directory with `git rev-parse --path-format=absolute --git-dir`, and the absolute common directory with `git rev-parse --path-format=absolute --git-common-dir`. When the two git directories differ, the checkout is linked and the primary worktree is the parent of the common `.git` directory; otherwise the current top level is already primary. Workflows SHALL stop before accepting or writing a value if that location cannot be resolved safely.

This uses Git's own worktree metadata rather than assumptions about directory names such as `.paseo/worktrees`. The alternative—using the active checkout—preserves the current loss mode. A home-directory credential store would survive worktrees but would lose the repository boundary and complicate multi-repo use.

### Live values and committed declarations intentionally resolve to different checkouts

Real values go to the primary worktree's ignored `.env` or stack equivalent. A new variable's blank declaration and sourcing comment go to the active branch's `.env.example` or equivalent, because that change must be reviewed and shipped. Rotating an existing value does not touch the example unless its name, purpose, or acquisition instructions changed. A real value never appears in an example, command output, diff, plan, or note.

This keeps the current names-only convention intact. Writing the real value into `.env.example` was rejected because it commits the credential to permanent history; rewriting a blank line on every rotation was rejected because it creates meaningless diffs without documenting a contract change.

### Safety is checked at the location that will hold the value

Before creating or updating the durable file, the workflow verifies that Git ignores that path from the primary worktree. The committed wildcard-and-negation pair remains the shared rule. If the active branch has introduced the rule but the primary checkout has not received it yet, the workflow may install the same pair in the repository-common `info/exclude` as immediate local protection; the committed `.gitignore` change remains required. If ignore protection still cannot be proven, the workflow stops before requesting or writing a credential.

The durable file is initialized from the active branch's example when absent, because that branch may introduce a variable not yet present on the primary branch. Existing content is edited narrowly by variable name and never replaced wholesale.

### Existing duplicates are preserved until reconciled

If a linked worktree already contains a regular `.env`, workflows do not delete it, overwrite it, or bulk-copy it into the primary file. A newly supplied or rotated variable is written to the durable file and subsequent WongStack consumers prefer that file. The workflow reports that a second local copy exists and advises reconciling it without displaying either value.

Where application tooling requires `.env` inside the linked checkout, the supported end state is an ignored symlink to the primary file (or the stack's equivalent configuration). Creating that link requires the existing local file to be absent or explicitly reconciled first. This avoids guessing conflict precedence while still providing a one-copy model for tools with conventional lookup paths.

### Producers and consumers share the resolver contract

`/wong-cloudflare` resolves the durable path before creating, reading, or updating `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. `/walk` first honors an already exported credential, then resolves the primary worktree file rather than assuming `$ACTIVE_ROOT/.env`. The `.claude/` and `.agents/` copies remain byte-identical.

The resolver behavior is documented in the canonical secrets page and summarized in the generic `WONG-STACK` block so agents performing other secret updates follow the same split: durable live value, active-branch blank declaration.

### `/save` is the universal preservation and redaction checkpoint

Secret-aware workflows still write a needed credential immediately, because provisioning or a walkthrough may need it before the next checkpoint. `/save` provides the universal fallback: because it is the only skill authorized to read the conversation, it identifies credentials that the user explicitly supplied or rotated with a known variable name during the session, ensures the current value is in the durable primary-worktree file, and adds a blank active-branch example declaration only when the variable contract is new or its guidance changed.

`/save` does not pattern-scrape arbitrary strings or guess that an opaque value is a credential. It acts only on explicit secret context and never copies a value into the OpenSpec change, Decision log, session note, commit message, PR body, or output. The note may retain the non-secret fact that `SERVICE_TOKEN` was rotated and where it is obtained, but never the value. Before staging, `/save` checks tracked example/config and handoff files for the values it handled and stops if one appears.

This checkpoint was chosen over `/ship` as the owner because partial work and abandoned branches may never ship, while `/save` is already the durable conversation boundary. A hook was rejected as the owner because Git hooks do not observe ignored-file writes and agent hooks are platform-specific and bypassable; leak scanning may still be defense-in-depth inside `/save`.

### `/ship` delegates its checkpoint to `/save` after archiving

`/ship` retains the responsibilities unique to shipping: verify that the current branch is shippable and the default branch is not red, invoke `openspec-archive-change`, merge through the API, and delete the remote branch worktree-safely. After the archive move, it invokes ordinary `/save` exactly once. When `/save` finds no active change for the current branch but finds exactly one matching archived change, it treats that archive as the handoff record rather than interpreting the missing active change as a reason to create a replacement. It then performs secret preservation/redaction, note capture, commit, push, PR creation/update, and CI wait/auto-fix through its normal interface.

`/ship` consumes the ordinary save's gate result more strictly than a checkpoint-only caller: `SUCCESS` or `NONE` permits merge, while `UNKNOWN`, `TIMEOUT`, or a save failure stops shipping. It does not repeat PR or check-waiting logic. Archiving before the delegated checkpoint ensures the archive move is inside the exact commit and CI result that will merge. Having `/ship` call `/save` before archiving was rejected because the archive would create a second ungated commit; calling it both before and after was rejected as redundant; adding a `--shipping` mode was rejected because archive discovery can be safely derived from the current branch and repository state.

## Risks / Trade-offs

- **[A primary checkout may not exist as an ordinary working tree]** → Stop before accepting a value and explain that the repo needs a resolvable primary worktree; do not fall back to a disposable checkout.
- **[The primary branch may not yet ignore `.env`]** → Verify at the destination and use the repository-common exclude as immediate defense while retaining the committed `.gitignore` task.
- **[Old worktree copies can continue to drift]** → Prefer the durable file in WongStack consumers, report duplicates without values, and require explicit reconciliation before replacing one with a link.
- **[Frameworks normally search only the active checkout]** → Document the ignored-symlink/configuration option; do not impose it on stacks that already have their own secret loader.
- **[Resolving a path can accidentally expose machine layout in durable prose]** → Commands may use absolute paths locally, but plans, notes, logs, and user-facing summaries refer to “the primary worktree” and never persist the path or any value.
- **[`/save` could mistake an opaque string for a credential]** → Act only on an explicitly named secret addition or rotation; never heuristic-scan the conversation for token-shaped strings.
- **[An archived change could look like a missing active change]** → Before fallback authoring, resolve exactly one archive whose suffix matches the current branch; ambiguity stops rather than guessing.

## Migration Plan

1. Ship the clarified convention, resolver behavior, `/save` checkpoint, and `/ship` delegation in the payload.
2. On the first secret write or save from a linked worktree, create or narrowly update the primary file after proving it is ignored.
3. If another worktree-local file exists, leave it in place and report the reconciliation action; do not automatically migrate unknown keys.
4. Existing normal single-worktree repositories continue using the same root file and require no migration.
5. Existing `/ship` and `/save` callers need no new command syntax; archive recognition is derived from repository state.
6. Rollback restores active-checkout lookup and the prior ship steps; it does not delete the durable file or any preserved duplicate.

## Open Questions

None. The value/declaration split, primary-worktree destination, duplicate preservation, and consumer precedence are defined for implementation.

<!-- end design.md -->
<!-- file tasks.md utf8 6064 -->
## 1. Secrets Guidance and Templates

- [x] 1.1 Update `wiki/development/secrets.md` with the primary-worktree live-value rule, active-branch blank-example rule, rotation behavior, destination ignore check, and non-destructive duplicate reconciliation guidance.
- [x] 1.2 Update the root `.env.example` header and `.claude/skills/wong-sync/references/stack-pack-fragments.md` so new variables are documented blank, rotations do not create template churn, and real values never enter examples; mirror the fragment under `.agents/`.
- [x] 1.3 Review `wiki/stack/cloudflare-credentials.md`, `wiki/stack/staging-walkthrough.md`, and the Cloudflare failure map for ambiguous “repo root” or active-worktree credential directions, and align every affected reference with the canonical secrets page without duplicating its resolver details.

## 2. Cloudflare Provisioning Skill

- [x] 2.1 Update `.claude/skills/wong-cloudflare/SKILL.md` to resolve the primary worktree from Git's absolute per-worktree and common directories, stopping before credential input if the durable location cannot be established.
- [x] 2.2 Make provisioning create the durable `.env` from the active branch's example when absent, prove the destination is ignored (using the repository-common exclude as immediate protection when required), and narrowly read/write both Cloudflare variables there throughout the run.
- [x] 2.3 Add value-safe handling for a separate active-worktree `.env`: preserve it, prefer the durable file, and report reconciliation or the ignored-link option without printing, comparing, deleting, or bulk-merging values.
- [x] 2.4 Apply the completed provisioning-skill and failure-map changes identically under `.agents/skills/wong-cloudflare/` and verify the mirrors byte-for-byte.

## 3. Staging Walkthrough Script and Skill

- [x] 3.1 Update `.claude/skills/walk/scripts/walk-staging.sh` so exported values retain precedence and file fallback resolves the primary worktree's durable `.env` from Git metadata for the Cloudflare token and optional Access credentials.
- [x] 3.2 Keep missing or unresolvable durable credentials on the existing value-safe `UNKNOWN` path, and update `.claude/skills/walk/SKILL.md` only where its credential-source guidance needs to describe the new lookup.
- [x] 3.3 Mirror the walkthrough script and skill under `.agents/skills/walk/`, verify both pairs byte-for-byte, and run `bash -n` plus linked-worktree checks that distinguish primary and active `.env` files without emitting their contents.

## 4. Save Skill

- [x] 4.1 Add an early credential-preservation step to `.claude/skills/save/SKILL.md` that handles only explicitly named secret additions or rotations, writes values narrowly to the primary worktree's ignored file, and maintains blank active-branch example declarations when their contract changed.
- [x] 4.2 Make `/save` redact handled values from notes, OpenSpec artifacts, commit messages, PR bodies, reports, and staged tracked files while retaining non-secret variable context; stop value-safely if a handled value appears in a tracked surface.
- [x] 4.3 Add an explicit shipping context to `/save` that accepts the archived change name, uses that archive as the handoff/PR-body source, skips fallback active-change authoring, and returns the existing gate result for `/ship` to consume.
- [x] 4.4 Mirror the completed save skill under `.agents/skills/save/` and verify the skill and any changed references or scripts byte-for-byte.

## 5. Ship Skill

- [x] 5.1 Refactor `.claude/skills/ship/SKILL.md` so it performs feature/default-branch preflight and its owned `openspec-archive-change`, then invokes `/save` once in shipping context before merge.
- [x] 5.2 Remove `/ship`'s duplicate dirty-tree commit, PR creation/update, push, and branch-CI wait/auto-fix instructions; consume `/save`'s `SUCCESS`/`NONE` versus `UNKNOWN`/`TIMEOUT`/failure result and retain only merge/archive-specific handling.
- [x] 5.3 Mirror the completed ship skill under `.agents/skills/ship/` and verify both copies byte-for-byte.

## 6. Generic Agent Guidance

- [x] 6.1 Update the generic `WONG-STACK` credentials block in `CLAUDE.md` to direct all agents to save live values in the primary worktree while editing values-blank declarations and sourcing comments on the active branch, retaining stack-equivalent wording and the canonical wiki link.
- [x] 6.2 Check all shipped instructions for contradictory claims that `.env` always means the active checkout or that `/ship` independently checkpoints and gates the branch, replacing those claims with links or concise wording owned by the secrets convention and change loop.

## 7. Release and Validation

- [x] 7.1 Bump `VERSION` with the appropriate semver increment and add a newest-first `CHANGELOG.md` entry describing worktree-safe durable secret persistence, `/save` redaction/checkpointing, and `/ship` delegation.
- [x] 7.2 Run `node scripts/check-payload-links.mjs`, validate `secret-save-workflow` with OpenSpec, and inspect the final diff for any credential value, absolute machine path, unmatched `.claude/` versus `.agents/` mirror, or changed path outside the planned surfaces.
- [x] 7.3 Walk through normal `/save`, shipping-context `/save`, `/ship` after archive, linked-worktree credential lookup, missing credential, duplicate `.env`, and tracked-value leak scenarios without logging any test value.

## 8. Simplify the Ship-to-Save Handoff

- [x] 8.1 Remove `/save --shipping` and make ordinary `/save` recognize exactly one archived change matching the current branch before fallback authoring.
- [x] 8.2 Update `/ship` to archive first, invoke ordinary `/save` exactly once, consume its gate result, and retain no duplicate checkpoint mechanics.
- [x] 8.3 Align the change-loop guidance, setup playbook, generic agent block, changelog, and mirrored skill files with the flag-free single-save flow.
- [x] 8.4 Validate the OpenSpec change, payload links, mirror equality, and textual ship order; confirm no `--shipping` or `shipping context` instruction remains.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 2150 -->
## MODIFIED Requirements

### Requirement: The skill sets up the credential file for the user

The skill SHALL resolve the durable `.env` in the repository's primary worktree from Git metadata, including when invoked from a linked worktree. When the durable file does not exist, it SHALL create it from the active branch's `.env.example`, SHALL confirm that Git ignores the destination at the primary worktree, and SHALL ask the user only for the token value to paste. It SHALL read and narrowly update `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` in that same durable file throughout the run. It SHALL NOT instruct the user to create a dotfile, choose a variable name, or verify their own ignore rules. It SHALL NOT overwrite or remove a pre-existing linked-worktree `.env`; when one exists separately, it SHALL report the duplicate without displaying values and continue using the durable file.

#### Scenario: Fresh repo with no durable .env

- **WHEN** provisioning starts in a repo that has `.env.example` but no `.env` in its primary worktree
- **THEN** the skill creates the primary worktree's `.env` from the active branch's example, verifies that destination is ignored by git, and asks for the token value alone

#### Scenario: Provisioning runs from a linked worktree

- **WHEN** `/wong-cloudflare` receives or updates a credential from a linked worktree
- **THEN** it writes and rereads the primary worktree's durable `.env`
- **AND** a later run from another worktree finds the same value

#### Scenario: A duplicate linked-worktree file is preserved

- **WHEN** provisioning finds both the durable `.env` and a separate regular `.env` in the active linked worktree
- **THEN** it uses the durable file and reports that the duplicate needs reconciliation
- **AND** it neither exposes values nor deletes, replaces, or bulk-merges the active file

#### Scenario: The credential file is never committed

- **WHEN** the token value has been written to the durable `.env`
- **THEN** the skill confirms git does not see the destination as a change
- **AND** it stops and warns rather than continuing if the destination would be committed

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/delivery-gate/spec.md utf8 2024 -->
## ADDED Requirements

### Requirement: Ship delegates its checkpoint and branch gate to save

`/ship` SHALL retain its shipping-only responsibilities: verify the feature branch and default-branch state, invoke `openspec-archive-change`, merge the pull request, and delete the remote branch worktree-safely. After archiving and before merging, `/ship` SHALL invoke ordinary `/save` exactly once. When no active change matches the current branch and exactly one matching archive exists, `/save` SHALL use that archive as the handoff record, SHALL NOT author a replacement active change, and SHALL own secret preservation/redaction, session-note capture, commit, push, pull-request creation/update, and the CI wait/auto-fix path. `/ship` SHALL consume that result and SHALL NOT duplicate those checkpoint mechanics or require a special save flag.

#### Scenario: Shipping checkpoints the archive through save

- **WHEN** `/ship` archives a completed change
- **THEN** it invokes ordinary `/save` once so the archive move, implementation, note, and any safe example declaration land in the pushed checkpoint
- **AND** the commit tested by the resulting CI run is the commit `/ship` will merge

#### Scenario: Save recognizes the archived branch change

- **WHEN** `/save` runs for `/ship` after `openspec/changes/<name>/` moved into the archive
- **THEN** it resolves and mirrors the single archived record matching the current branch
- **AND** it does not invoke fallback planning or create a new active `openspec/changes/<name>/`

#### Scenario: Save returns a mergeable gate result

- **WHEN** the delegated save finishes with `SUCCESS` or `NONE`
- **THEN** `/ship` proceeds to its merge step without reopening the PR or waiting on the same checks itself

#### Scenario: Save returns an unmergeable result

- **WHEN** the delegated ordinary save returns `UNKNOWN`, `TIMEOUT`, or a checkpoint failure
- **THEN** `/ship` stops before merge and reports that result
- **AND** it does not bypass, repeat, or reinterpret the gate

<!-- end specs/delivery-gate/spec.md -->
<!-- file specs/secrets-convention/spec.md utf8 8822 -->
## MODIFIED Requirements

### Requirement: A stack-neutral secrets-example convention ships in the payload

WongStack SHALL ship a stack-neutral secrets convention: a committed `.env.example` template that documents each expected variable with an inline comment (what it is, where to get it), and real secrets files that are git-ignored. Every declaration in the committed example SHALL remain blank; real values SHALL never be written there. Adding a new secret SHALL add its blank name and guidance to the active branch's example, while rotating an existing value SHALL leave the example unchanged unless the variable contract or guidance also changes. The convention SHALL NOT couple to any build gate, preview URL, or platform tool (no Workers Builds, wrangler, or Cloudflare assumptions) — it is documentation of a pattern, not machinery.

#### Scenario: The example template is committed and the real files are ignored

- **WHEN** a repo adopts the convention
- **THEN** `.env.example` (documented, values-blank placeholders) is committed and the real secrets files (`.env`, `.env.local`, and stack variants) are listed in `.gitignore`

#### Scenario: A new secret changes both sides of the contract

- **WHEN** an agent adds a secret variable while working on a change
- **THEN** it writes the real value only to the ignored live file and adds the blank variable name with sourcing guidance to the active branch's example
- **AND** no real value enters a committed file, output, plan, or note

#### Scenario: Rotating a value does not manufacture a template diff

- **WHEN** an existing secret value rotates without changing its name, purpose, or acquisition instructions
- **THEN** only the ignored live value changes
- **AND** the committed example remains untouched

#### Scenario: The convention names no platform

- **WHEN** a reader reviews the shipped `.env.example` and its docs page
- **THEN** neither requires Cloudflare, Workers Builds, wrangler, or a preview URL to function

### Requirement: The agent instruction block points at the secrets convention

The payload's `WONG-STACK` block SHALL tell agents that credentials and config already live in the repo's environment files, naming `.env.example` as the committed, values-blank map of every variable the project reads and the git-ignored `.env` as where filled-in values sit when a task needs to run something. It SHALL distinguish the two locations under Git worktrees: real values persist in the primary worktree's ignored file, while declarations and guidance are edited in the active branch's committed example. The guidance SHALL be stack-neutral — naming `.env` at the repo root as the default while allowing a stack's own dotenv equivalent — since the convention is offered, not forced, and a target may have renamed the files. It SHALL link the wiki's secrets page rather than restating it, and SHALL NOT hard-link `.env.example`, which a target may have declined to seed.

#### Scenario: An agent finds the credentials without drilling through the wiki

- **WHEN** an agent reads the repo's `CLAUDE.md`/`AGENTS.md` before running a one-off script that needs an API credential
- **THEN** the `WONG-STACK` block names `.env.example` as the map of available variables and the primary worktree's git-ignored `.env` as the durable source of values
- **AND** the agent neither asks the user for a token nor stubs the call out when the value is already present

#### Scenario: An agent updates a secret from a linked worktree

- **WHEN** an agent receives a new or rotated value while its active checkout is a linked worktree
- **THEN** it saves the real value in the primary worktree's ignored live file
- **AND** it adds or updates only the blank declaration and guidance in the active branch's example when the variable contract changed

#### Scenario: The guidance survives being lifted into a target that renamed its dotenv file

- **WHEN** the block is copied verbatim into a target repo that uses `.dev.vars` or a framework's own dotenv file, or that declined the `.env.example` seed
- **THEN** the wording still reads true, because it names `.env` as the default while allowing the stack's equivalent
- **AND** it contains no link that resolves to a file the target does not have

#### Scenario: The block defers to the wiki page for detail

- **WHEN** a reader wants the full convention — why real secrets stay out of git, how the template stays the source-of-truth list, how to bootstrap a local file, and how linked worktrees resolve the durable copy
- **THEN** the block links the wiki secrets page instead of duplicating its content

## ADDED Requirements

### Requirement: Real values persist in one worktree-safe local store

For a repository with linked Git worktrees, WongStack SHALL treat the primary worktree's ignored live environment file as the durable local source of real values. It SHALL resolve the primary worktree from Git metadata rather than directory naming conventions. Before writing a value it SHALL prove the destination is ignored; if safety or the primary worktree cannot be resolved, it SHALL stop without accepting or writing the secret. Repositories with only one worktree SHALL continue using their existing root live file.

#### Scenario: A secret is saved from a linked worktree

- **WHEN** a workflow receives or rotates a secret while running in a linked worktree
- **THEN** it writes the value to the primary worktree's ignored live file
- **AND** deleting the linked worktree does not delete the saved credential

#### Scenario: A normal checkout retains its existing behavior

- **WHEN** the active checkout is the primary and only worktree
- **THEN** the durable live file is the existing file at that checkout's root
- **AND** no alternate directory or duplicate file is introduced

#### Scenario: Destination safety cannot be proven

- **WHEN** Git does not ignore the resolved durable live file or the primary worktree cannot be resolved
- **THEN** the workflow stops before requesting or writing a real value
- **AND** it identifies the local safety condition to fix without printing a credential

#### Scenario: A linked worktree already has a separate live file

- **WHEN** the durable file and a linked worktree-local regular file both exist
- **THEN** the workflow preserves both files, prefers the durable file for WongStack consumers, and reports that reconciliation is needed
- **AND** it neither compares values in output nor silently overwrites, deletes, or bulk-merges either file

#### Scenario: Checkout-local tooling needs the conventional path

- **WHEN** a stack requires the live environment file inside a linked checkout
- **THEN** the guidance permits an ignored link or equivalent stack configuration pointing to the durable file after any existing duplicate is reconciled
- **AND** the link itself is never committed

### Requirement: Save checkpoints explicitly supplied session secrets

Because `/save` is the sole skill that reads the conversation, it SHALL act as the universal preservation checkpoint for a secret the user explicitly supplied or rotated with a known variable name during the session. It SHALL ensure the value is in the primary worktree's ignored live file and SHALL add or update only a blank declaration and sourcing guidance in the active branch's example when the variable contract changed. Secret-aware workflows MAY perform the same durable write earlier when they require the credential before `/save`. `/save` SHALL NOT infer credentials from token-shaped strings or write a value into any tracked file, note, plan, log, commit message, PR body, or output.

#### Scenario: A session supplied a named secret

- **WHEN** `/save` runs after the user explicitly supplied or rotated `SERVICE_TOKEN` during the session
- **THEN** the current value is preserved in the primary worktree's ignored live file before checkpointing
- **AND** durable handoff surfaces mention at most that `SERVICE_TOKEN` changed, never its value

#### Scenario: The variable is newly required

- **WHEN** the explicitly supplied secret name is absent from the active branch's committed example
- **THEN** `/save` adds a blank declaration with what-it-is and where-to-get-it guidance
- **AND** the real value appears only in the ignored durable file

#### Scenario: An opaque string has no explicit secret contract

- **WHEN** the conversation contains an opaque value that was not identified as a named secret addition or rotation
- **THEN** `/save` does not guess a variable name or persist the value

#### Scenario: A handled value leaked into a tracked surface

- **WHEN** `/save` finds a secret value it handled in a tracked example, handoff artifact, or staged diff
- **THEN** it stops before commit and identifies the affected path without echoing the value

<!-- end specs/secrets-convention/spec.md -->
<!-- file specs/session-notes/spec.md utf8 1180 -->
## ADDED Requirements

### Requirement: Session capture excludes credential values

When `/save` compresses the conversation into a session note, it SHALL exclude every real credential value supplied, rotated, read, or written during the session. It MAY preserve the variable name, the fact that it changed, its purpose, where it is obtained, and any non-secret operational decision. The same exclusion SHALL apply to the change's Status, Decision log, tasks, commit message, PR body, and `/save` report.

#### Scenario: A token was rotated during the session

- **WHEN** `/save` captures a session in which `SERVICE_TOKEN` was rotated
- **THEN** the note may record that `SERVICE_TOKEN` rotated and its non-secret sourcing guidance
- **AND** neither the old nor new value appears in the note or another committed handoff surface

#### Scenario: A pasted credential appears in surrounding conversation

- **WHEN** a credential value is present in conversation context used to write the note
- **THEN** `/save` omits the value rather than treating verbatim user text as automatically durable
- **AND** the note remains useful by retaining the non-secret decision and variable name

<!-- end specs/session-notes/spec.md -->
<!-- file specs/staging-walkthrough/spec.md utf8 1427 -->
## ADDED Requirements

### Requirement: Walkthrough credentials follow the durable worktree store

The walkthrough SHALL honor `CLOUDFLARE_API_TOKEN` and optional Access credentials already exported into its process. When a required value is not exported, it SHALL resolve the repository's primary worktree from Git metadata and read the durable ignored `.env` there, rather than assuming the active linked worktree contains a copy. It SHALL NOT print any resolved value or persist the primary worktree's absolute path in repository artifacts.

#### Scenario: Walk runs from a linked worktree

- **WHEN** `/walk` runs from a linked worktree with no local `.env` and the required credentials exist in the primary worktree's durable file
- **THEN** preflight authenticates with the durable credentials
- **AND** it does not report the token as missing or ask the user to copy it

#### Scenario: Exported credentials retain precedence

- **WHEN** the walk process already has a required credential in its environment
- **THEN** preflight uses the exported value without replacing it from a file

#### Scenario: No durable credential exists

- **WHEN** neither the process environment nor the durable primary-worktree file supplies the required credential
- **THEN** the walkthrough retains its `UNKNOWN` missing-credential verdict and points to the secrets convention
- **AND** no linked-worktree copy is created as a side effect

<!-- end specs/staging-walkthrough/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-08

~~~
<!-- end .openspec.yaml -->
