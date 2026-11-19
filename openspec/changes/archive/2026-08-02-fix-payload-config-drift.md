<!-- openspec-archive v1 2026-08-02-fix-payload-config-drift -->
<!-- file proposal.md utf8 5553 -->
# fix-payload-config-drift

**Status:** ready-to-ship
**Open questions:** none

> Ships together with four sibling changes as the single **9.1.0** payload release, on branch `setup-flow-testing`. Resume any of them with `/continue` and check out that branch — the branch carries all five.

## Why

Three shipped facts in the payload contradict the code they describe. Each is a one-line fix; together they mean a new adopter following the templates ends up with a token nothing reads, a committable credential, and a command that doesn't exist.

**The token variable is a regression, not lingering drift.** `.env.example` ships `CLOUDFLARE_USER_TOKEN`. Everything that reads a token — `scripts/cf-secrets.mjs`, `.github/workflows/deploy.yml`, `/wong-cloudflare`, `wiki/stack/cloudflare-credentials.md`, wrangler itself — reads `CLOUDFLARE_API_TOKEN`. The `stack-pack` spec already makes this normative: *"The `.env.example` fragment's token variable SHALL be `CLOUDFLARE_API_TOKEN`, matching the skill, the docs, and the pack scripts."* CHANGELOG v8.6 records fixing it. Commit `d3446fb` then renamed the shipped file back. The name has now flipped three times across releases, in both directions, which is the real finding: nothing holds it in place.

**`.env` is not git-ignored in a target repo.** The pack's `.gitignore` fragment adds `.dev.vars*` and its negation, and nothing else. But `.env` is where `/wong-cloudflare` puts the API token — a credential the payload's own docs describe as "effectively account-root" and "treat it like a root password." A target that never had a `.env` gets a committable one at the exact moment the skill asks for a token. WongStack's own repo is covered; the fragment that travels is not.

**`payload-manifest.md` describes a thing OpenSpec no longer makes.** It states that `.claude/commands/opsx/` is "produced in each repo by `openspec init`." CLI 1.5.0 creates the five `openspec-*` skills and no commands — verified on a fresh install — while the `WONG-STACK` block still tells the reader `/opsx:*` is available "if you want it."

## What Changes

- **`.env.example` returns to `CLOUDFLARE_API_TOKEN`**, matching the spec, the scripts, the workflow, the skill, the wiki, and wrangler.
- **One owner for the token's name.** The variable is a fact stated in seven files; per the payload's own single-source rule it gets an owning file, with every other mention linking rather than restating. Adding a name to a template is otherwise indistinguishable from a docs edit, which is how this shipped twice.
- **The `.gitignore` fragment covers `.env` as well as `.dev.vars`** — the same wildcard-plus-negation shape (`.env*`, `!.env.example`) already used for `.dev.vars`, and for the same reason: a per-environment variant holds real values.
- **The `opsx` claim is corrected** to what the CLI actually produces, and the `WONG-STACK` block stops promising a command surface a fresh repo does not have.

**Non-goals:** the `deploy.yml` failures and concurrency race (`fix-pack-ci-defaults`); the missing wiki pages and dead links (`fix-payload-wiki-gaps`); anything about Cloudflare Access.

## Capabilities

### Modified Capabilities
- `stack-pack`: the `.gitignore` fragment's scope widens to the credential file, and the token variable's name gets a single owner rather than being restated per file.
- `payload-single-source`: the token variable becomes a named instance of the one-owner rule, and the stale `opsx` generation claim is corrected.

## Impact

- `.env.example` — the variable name.
- `.claude/skills/wong-sync/references/stack-pack-fragments.md` — the `.gitignore` fragment; the `.env.example` fragment's owner link.
- `.claude/skills/wong-sync/references/payload-manifest.md` — the `opsx` claim.
- `CLAUDE.md` (the `WONG-STACK` block) — the `/opsx:*` availability line.
- `wiki/stack/cloudflare-credentials.md` — candidate owner for the variable name.
- `VERSION`, `CHANGELOG.md`.
- Any repo that filled in `.env` from the current template — their token is under a name nothing reads.

## Decision log

- **2026-08-02** — Implemented all 16 tasks. `.env.example` restored to `CLOUDFLARE_API_TOKEN`; confirmed by grep that no live payload file carries `CLOUDFLARE_USER_TOKEN` (only historical CHANGELOG entries and archived changes).
  Chose **`wiki/stack/cloudflare-credentials.md` as the owning file** for the variable name, per the design's recommendation — it already explains what the token is and where it goes, so the fact sits with its explanation. `.env.example` and the fragment now link rather than restate. The classification half landed in the `WONG-STACK` block's release rule: renaming a value the code reads is behavioural, never a `docs(...)` commit.
  `.gitignore` fragment widened to `.env*`/`!.env.example` alongside the `.dev.vars` pair, with one shared rationale, an instruction to apply it *before* asking for a token, and the untracking caveat (widening does not untrack an already-committed file — needs `git rm --cached` **and** a credential rotation).
  The `opsx` claim was corrected against reality rather than memory: ran `openspec init` on a scratch repo and confirmed CLI 1.5.0 produces five `openspec-*` skills and **no** `.claude/commands/opsx/`. Swept the payload and fixed four files that promised `/opsx:*` to a target.
  Verified: all five surfaces agree on the token name, and the widened ignore rules checked against real `git check-ignore` (`.env`, `.env.local`, `.env.staging` ignored; both `.example` files committable).

<!-- end proposal.md -->
<!-- file design.md utf8 6086 -->
## Context

Three shipped facts contradict the code. All three were hit by adopting agents rather than found by review, and all three are one-line edits — the design work is in stopping them recurring, because two of the three have recurred already.

The token variable's history is the instructive one:

| release | state |
|---|---|
| 7.x | `cloudflare-credentials.md` said `CLOUDFLARE_USER_TOKEN`; `.env.example` shipped `CLOUDFLARE_API_TOKEN`. CHANGELOG logged it as "known drift, not fixed here" |
| 8.6 | fragment and docs reconciled on `CLOUDFLARE_API_TOKEN`; the `stack-pack` spec made it normative |
| 9.0.0 (`d3446fb`) | `.env.example` renamed **back** to `CLOUDFLARE_USER_TOKEN`, as a commit titled `docs(env)` |

So the name is currently wrong, against a spec that says it SHALL be right, having been fixed once. The mechanism that failed is that the name lives in seven files and the template is one of them — editing a template reads as documentation, gets reviewed as documentation, and ships without anyone consulting the spec that governs it.

## Goals / Non-Goals

**Goals:**
- The shipped template names the variable the code reads.
- A target repo cannot commit the account-root credential it is about to be handed.
- The payload stops describing a command surface `openspec init` no longer creates.
- Each of the three has a mechanism that makes recurrence visible, not just a corrected value.

**Non-Goals:**
- Changing the variable's name to anything other than `CLOUDFLARE_API_TOKEN` — wrangler reads it, so it is not a free choice.
- Auditing every payload template for the same class of defect; the rule lands here and `/improve docs` can sweep later.
- The CI failures, the missing wiki pages, and the Access runbook — separate changes.

## Decisions

### The variable gets an owner, not just a correction

Correcting `.env.example` alone restores today's behaviour and leaves the mechanism intact — the same edit could land again next release with the same review outcome. The payload already has the tool for this: *"Each fact in the payload SHALL have exactly one file that states it. Every other surface SHALL link to the owner rather than restate it."* The token variable is a fact stated in seven files and owned by none.

`wiki/stack/cloudflare-credentials.md` is the natural owner — it already explains what the token is, how to create it, and where it goes. The template and the fragment point at it.

The second half is classification: renaming a value the code reads is a **behavioural** change requiring a version bump and a changelog entry, not prose. That is what makes the next such edit visible in review, since it can no longer ride in as a docs commit.

*Alternative considered:* a CI check asserting the template and the scripts agree. Better in principle, rejected for now — this repo's payload is prose with no test suite, and adding a lint harness for one variable is disproportionate. The one-owner rule plus the classification is the cheap version; a check can follow if it recurs a fourth time.

### `.env*` uses the same shape as `.dev.vars*`

Not a new pattern — the wildcard-plus-negation is already specified and already reasoned through for `.dev.vars`, and the reasoning transfers exactly: a per-environment variant holds real values, and the committed example must survive the wildcard. Using the identical shape means one explanation covers both, which is also what the single-source rule wants.

Worth stating plainly in the changelog: WongStack's own `.gitignore` has covered `.env*` since `a213aa6`, so this repo was never exposed. The **fragment** is what travels to targets, and it was never widened. That asymmetry is why the defect survived — the maintainers' own repo is not the artifact under test.

### The `opsx` claim is corrected, not restored

The payload could try to make the commands exist again by copying them. Rejected: the manifest deliberately excludes generated files so they always match the installed CLI, and that reasoning is still right. What is wrong is only the description. So the manifest says what the CLI now produces, and the `WONG-STACK` block stops offering `/opsx:*` as something a fresh repo has — the `openspec-*` skills are the entry point, and they are what actually lands.

## Risks / Trade-offs

- **A repo that already filled in `.env` from the broken template has a token under a dead name** → the changelog entry must say so explicitly and name the one-line fix; nothing can detect it for them, since a missing token reads as "not provisioned yet" rather than as an error.
- **Widening `.gitignore` in a repo that already committed a `.env`** → gitignore does not untrack an already-committed file. Where the fragment is applied to such a repo, the applier should say so rather than leave a false sense of coverage.
- **Naming an owner adds an indirection** for a reader who just wants the variable name → mitigated by the single-line-summary allowance the rule already carries: a surface may name the value in one sentence and link, it just may not become a second definition.
- **Classifying template edits as behavioural adds release friction** → intended. That friction is the mechanism.

## Migration Plan

`.env.example` and the fragments are payload files, so new adopters get the corrected forms by copy-if-absent. Existing repos own their copies and receive nothing automatically — the `.gitignore` and `.env.example` changes surface through `/wong-sync`'s adapt step as proposals.

`VERSION` takes a minor bump: the `.gitignore` fragment widening changes what a provisioning run does to a target repo, and the changelog needs to carry the "check your `.env` variable name" notice prominently enough that an affected repo acts on it.

## Open Questions

None blocking. One to settle during implementation: whether `cloudflare-credentials.md` or `wiki/development/secrets.md` is the better owner for the variable name — the former explains this specific token, the latter owns the `.env` convention generally. Pick one and link the other.

<!-- end design.md -->
<!-- file tasks.md utf8 2581 -->
## 1. The token variable

- [x] 1.1 Change `.env.example` back to `CLOUDFLARE_API_TOKEN`, keeping the surrounding comment block (the two permission rows and the Account Resources note) intact
- [x] 1.2 Grep the whole payload for `CLOUDFLARE_USER_TOKEN` and confirm no occurrence survives outside historical `CHANGELOG.md` entries
- [x] 1.3 Choose the owning file for the variable name — `wiki/stack/cloudflare-credentials.md` or `wiki/development/secrets.md` — and state the choice in the change's Decision log
- [x] 1.4 Reduce every other mention to a link or a single summarizing sentence naming the owner, per the payload's one-owner rule
- [x] 1.5 Record in the payload that renaming a value the code reads is a behavioural change requiring a version bump, not a docs edit

## 2. The `.gitignore` fragment

- [x] 2.1 Add `.env*` and `!.env.example` to the `.gitignore` fragment in `.claude/skills/wong-sync/references/stack-pack-fragments.md`, alongside the existing `.dev.vars*` pair
- [x] 2.2 Extend the fragment's explanation to cover both files with one rationale rather than two, per the single-source rule
- [x] 2.3 Note in the fragment that applying it to a repo which already committed a `.env` does not untrack that file, and what the applier should say

## 3. The `opsx` claim

- [x] 3.1 Correct `.claude/skills/wong-sync/references/payload-manifest.md` — state what `openspec init` produces at the supported CLI version (the five `openspec-*` skills, not `.claude/commands/opsx/`)
- [x] 3.2 Update the `WONG-STACK` block in `CLAUDE.md` so it stops offering `/opsx:*` as a command surface a fresh repo has; point at the `openspec-*` skills instead
- [x] 3.3 Sweep the payload for any other prose promising `/opsx:*` commands to a target repo

## 4. Verify

- [x] 4.1 Fresh-install into a scratch repo and confirm the token variable in the installed `.env.example` matches what `scripts/cf-secrets.mjs` and `deploy.yml` read
- [x] 4.2 Confirm the applied `.gitignore` fragment covers `.env`, `.env.local`, and `.env.staging` while leaving `.env.example` committable
- [x] 4.3 Confirm no payload file claims a command exists that the fresh install lacks

## 5. Release

- [x] 5.1 Bump `VERSION` (minor — the fragment change alters what a provisioning run does to a target)
- [x] 5.2 Write the `CHANGELOG.md` entry with two things stated prominently: any repo that filled in `.env` from the 9.0.0 template has its token under a name nothing reads and must rename it; and existing repos get the `.gitignore` widening as a `/wong-sync` proposal, not automatically

<!-- end tasks.md -->
<!-- file specs/payload-single-source/spec.md utf8 2824 -->
## ADDED Requirements

### Requirement: A value the code reads has its owner in the payload, not in a template

Where the payload ships a template whose content the code depends on — an environment variable name, a script name, a path the tooling resolves — the template SHALL NOT be the fact's owner. The owning file SHALL be the one that explains the value, and the template SHALL be traceable to it.

This exists because a template edit is indistinguishable from a documentation edit at review time. `.env.example`'s token variable was corrected in one release and silently reverted in a later one described as a docs rename, leaving the shipped template naming a variable nothing reads. A one-owner rule turns that class of change into an edit to the file whose job is to be correct.

A payload change that alters such a value SHALL be treated as a behavioural change — carrying its `CHANGELOG.md` entry and version bump — rather than as prose.

#### Scenario: A template value is traceable to its owner

- **WHEN** a payload template declares a value the code reads
- **THEN** the owning file is identifiable from the template or its immediate documentation
- **AND** the value is not independently restated in a third file

#### Scenario: Renaming a code-read value is a behavioural change

- **WHEN** a change renames a variable, script, or path the tooling reads
- **THEN** it is released as a behavioural change with a changelog entry
- **AND** it is not landed as a documentation-only edit

### Requirement: A generated surface is described as what the generator actually produces

Where the payload documents files produced by an external tool rather than copied from the payload, that description SHALL match what the currently supported version of the tool produces, and SHALL be re-checked when the tool's version moves. A claim that a file is generated is a claim a reader will act on — by expecting a command to exist, or by not copying something they then lack.

`.claude/commands/opsx/` is the live instance: the payload manifest describes it as produced by `openspec init`, but the OpenSpec CLI now creates the five `openspec-*` skills and no commands. Any payload prose that offers `/opsx:*` as an available command surface SHALL be consistent with that.

#### Scenario: The manifest matches the generator

- **WHEN** the payload states that a directory or file is produced by an external tool
- **THEN** running that tool at the supported version produces it
- **AND** where it does not, the payload states what is actually produced

#### Scenario: A promised command surface exists

- **WHEN** payload prose tells a reader a command is available to them
- **THEN** a repo set up by following the payload has that command
- **AND** prose does not offer an entry point that a fresh setup lacks

<!-- end specs/payload-single-source/spec.md -->
<!-- file specs/stack-pack/spec.md utf8 4905 -->
## MODIFIED Requirements

### Requirement: Config fragments are applied as guided merges, never blind writes

Pack files that must merge into a file the target already owns — `package.json` scripts, the `wrangler.jsonc` bindings and `env.staging` block, `.env.example` variables, and the `.gitignore` entries covering the local secrets files — SHALL be applied as guided edits following the `CLAUDE.md` WONG-STACK-block precedent: the fragment is shown and applied with confirmation, never written over the target's file wholesale. **`/wong-cloudflare` SHALL be the applier**: the id-free fragments at the start of a run where they are missing, and the `wrangler.jsonc` block at the binding step with real resource ids. `wong-setup` SHALL NOT apply fragments; when upstream changes a fragment in a repo that already applied it, the change SHALL be surfaced through the sync's capability analysis rather than re-merged automatically.

The token variable SHALL be `CLOUDFLARE_API_TOKEN` everywhere it appears — the shipped `.env.example`, the fragment, the skill, the pack scripts, the Actions workflow, and the wiki — because that is the name wrangler reads. **Exactly one payload file SHALL own this name**; every other surface that needs it SHALL link to that owner rather than restate it. The name has drifted in both directions across releases while each individual edit looked like a harmless documentation change, so a single owner is what makes a future rename a visible, reviewable act rather than a template typo.

The `.gitignore` fragment SHALL cover **both** local credential files, each as a wildcard plus a negation for its committed example: `.dev.vars*` with `!.dev.vars.example`, and `.env*` with `!.env.example`. The wildcards stop a per-environment variant full of live values from being committable; the negations keep the committed, values-blank example files from being swallowed by them. `.env` holds `CLOUDFLARE_API_TOKEN`, which the pack's own docs describe as effectively account-root, and `/wong-cloudflare` writes it there — so a target repo that arrives without a `.gitignore` entry for it is handed a committable account-root credential at the moment the skill asks for one. Covering only `.dev.vars` leaves the more dangerous of the two files exposed.

The `package.json` fragment SHALL include the secrets push and check scripts alongside the existing build and database scripts. The pack's Workers Builds **deploy command** (`bash scripts/cf-deploy.sh`, set by a human in the dashboard) SHALL be documented as belonging **only to the Workers Builds fallback**: a repo on the pack's GitHub Actions workflow has no dashboard step, and the pack SHALL NOT describe the setting as required in general.

#### Scenario: Merging into an existing package.json

- **WHEN** the pack adds its `build`, `db:*`, and `secrets:*` scripts to a repo that already has a `package.json`
- **THEN** the fragment is presented and merged into the existing file, preserving the repo's other scripts and fields
- **AND** the file is not overwritten wholesale

#### Scenario: Fragments are applied by the provisioning skill

- **WHEN** a repo adopts the pack — at setup or later
- **THEN** the config fragments are applied by `/wong-cloudflare`, the id-free ones up front and the wrangler block with real ids at the binding step
- **AND** `wong-setup` applies none of them

#### Scenario: The shipped template names the variable the code reads

- **WHEN** a user fills in the token in `.env` by following `.env.example`
- **THEN** the variable they filled is the one the scripts, the workflow, the skill, and wrangler read
- **AND** no step silently behaves as though no token were present

#### Scenario: The variable name has one owner

- **WHEN** any payload file needs the reader to know the token's variable name
- **THEN** exactly one file states it and the others link to that file
- **AND** renaming it requires editing the owner, not a template

#### Scenario: The credential file cannot be committed

- **WHEN** `/wong-cloudflare` writes the API token into a target repo's `.env`
- **THEN** the repo's `.gitignore` already covers `.env` and its per-environment variants
- **AND** `.env.example` remains committable despite the wildcard

#### Scenario: A per-environment secrets file cannot be committed

- **WHEN** a repo creates `.dev.vars.staging` to give staging a divergent secret value
- **THEN** the pack's `.gitignore` entry already covers it
- **AND** no step is required to prevent the file being committed
- **AND** `.dev.vars.example` remains committable despite the wildcard

#### Scenario: The deploy command is fallback-only documentation

- **WHEN** a repo runs the pack's GitHub Actions workflow
- **THEN** no dashboard deploy-command step is presented as required
- **AND** the setting is documented only for a repo that chose Cloudflare Workers Builds instead

<!-- end specs/stack-pack/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-08-02

~~~
<!-- end .openspec.yaml -->
