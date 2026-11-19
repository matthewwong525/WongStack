<!-- openspec-archive v1 2026-09-27-setup-installs-its-tools -->
<!-- file proposal.md utf8 9447 -->
# Setup installs the tools it needs

**Status:** ready-to-ship
**Branch:** explore/setup-usage-ux
**Open questions:** none

## Why

The setup page promises that nothing gets installed on your computer and that you need no terminal. In practice, setup needs four free tools. When one is missing, setup stops partway with an error only a programmer can act on. Other stops come later: a second GitHub sign-in, a bare error on a new computer, and on Windows, skills that silently don't load. Setup should get your computer ready at the start, ask before each install, and let the pages tell you honestly what happens.

## What Changes

- **Setup gets your computer ready first.** Before it touches your folder or Cloudflare, setup checks for the four tools it needs. It installs the missing ones, asking before each. If one can't be installed, it says what went wrong and what to try, and stops before anything else is made.
  ```text
  empty folder? ──no──▶ stop
       │ yes
       ▼
  check the four tools
       │
  missing one? ──yes──▶ "May I install
       │                 Node? (free)"
       │                    │ yes
       │◀───────────────────┘
       ▼
  sign in to GitHub (once)
       │
       ▼
  Cloudflare key, then the
  usual plan and build
  ```
- **One GitHub sign-in, with everything it needs.** Setup shows you a short code and a link. You approve once in the browser, with every permission setup needs, and don't have to type any commands. Today a missing permission only fails at the first save, and you have to sign in again.
  ```text
  I need you to approve GitHub once.
  1. Open github.com/login/device
  2. Enter the code  ABCD-1234
  3. Approve, then come back here
  ```
- **Your name and email are set for you.** On a new computer, setup takes them from your GitHub account. Without them, setup used to stop partway with a bare error.
- **Windows gets a real check.** Setup tests whether Windows lets it make the folder links the assistant needs. If not, it walks you through the one switch in Settings, then checks again. Today the assistant just silently finds none of its skills.
- **Memory is reported honestly.** At the end, setup says memory is on only when it actually answers. Otherwise it says memory starts working once your site first goes live.
- **The pages match what happens.** The README, the getting-started guide and the token page agree on the steps. They say that setup may install free tools after asking, and that you need a free GitHub account. The token screen is described as two permission rows, not two checkboxes.

Non-goals: no change to the Cloudflare key itself or how it is made; no installer app or download; no change to other commands, which still install a tool only when they need it; no "what can I ask?" page or update notices, which come later.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolchain-dependencies`: the point-of-need rule gets a setup exception. Setup checks all four tools before it writes anything and installs missing ones with consent, through the system package manager when that needs no password, or else into the user's own folder. Other skills keep point-of-need installs.
- `install-onboarding`: setup signs the person in to GitHub itself, through the browser code flow, with the `workflow` and `user:email` scopes in one approval. It sets the git name and email from GitHub when they are unset, and checks Windows symlinks before the agent folder is made. The walkthrough lists the tool installs and the GitHub account. *Installation preserves the target* drops its claim that `/save` owns identity and its stale `/wong-cloudflare` sentence.
- `cloudflare-provisioning`: the closing report says memory is on only when the digest answers; otherwise it says memory starts after the first production deploy.

## Impact

- `.agents/skills/wong-setup/SKILL.md`: a new first section, *Get the computer ready*, before the source clone.
- `.agents/skills/wong-setup/references/tools.md` (new): the check, the install commands per system, the GitHub sign-in, git identity, and the Windows symlink check.
- `.agents/skills/wong-setup/references/cloudflare.md`: Step 1a verifies instead of stopping on `gh auth login`; Step 5's memory line.
- `.agents/skills/wong-setup/references/failure-map.md`: a *Getting the computer ready* table.
- `wiki/development/required-tools.md`: *Runtimes install at the point of need* gets the setup exception.
- `wiki/stack/getting-started.md`, `wiki/stack/cloudflare-credentials.md`, `README.md`: matching steps and wording.
- `VERSION` 25.9.0 → 25.10.0 and a `CHANGELOG.md` entry.
- No script or test changes; `scripts/tests/downstream-contract.test.mjs` pins nothing this touches.

## Decision log

- **2026-09-27** — Asked which area of the setup-to-use audit to tackle first → chose the setup tools.
- **2026-09-27** — Asked whether setup should install missing tools or the docs should drop the "nothing to install" promise → chose setup installs them.
- **2026-09-27** — Asked whether to also fix the other setup stops (git identity, the memory report, Windows links) → chose tools plus those stops.
- **2026-09-27** — Asked how setup should install missing tools → chose the system package manager (Homebrew, winget, apt).
- **2026-09-27** — Asked what setup does about Windows symbolic links → chose detect and walk the person through it.
- **2026-09-27** — Assumed: setup uses the package manager only when it runs without a password prompt (Homebrew already present, winget, or `apt` with passwordless `sudo`), and otherwise installs into the user's own folder, because the agent's shell cannot answer a `sudo` password prompt, and a managed laptop may refuse admin rights.
- **2026-09-27** — Assumed: setup does not install Homebrew itself, because that needs an admin password in a terminal; a Mac without it gets the user-folder install.
- **2026-09-27** — Assumed: the check runs after the empty-folder check and before the source clone, because the clone needs `git`, and a folder that will be refused should not trigger installs.
- **2026-09-27** — Assumed: the check is prose in a new `wong-setup/references/tools.md`, not a script, because it runs before any WongStack file is on the machine and must work where `node` is missing.
- **2026-09-27** — Assumed: the OpenSpec install command stays owned by `save/references/preconditions.md`, and `tools.md` links it, because `/update-dependencies` bumps the pin there.
- **2026-09-27** — Assumed: other skills keep point-of-need installs, and the spec's point-of-need requirement is replaced by one that carves out setup, because only setup runs before anything works.
- **2026-09-27** — Assumed: each unset git name or email goes into the global git config, taken from `gh api user` and the primary verified email, because a person's other repos need the same identity and an existing one must not be overwritten.
- **2026-09-27** — Assumed: `/save` no longer claims to own git identity in `wong-setup/SKILL.md`, because no `/save` step sets it; setup does it now.
- **2026-09-27** — Assumed: the `install-onboarding` requirement *Installation preserves the target* is corrected in the same change, because it says `/save` owns identity and names the retired `/wong-cloudflare`, and this change moves identity to setup.
- **2026-09-27** — Assumed: the runbook's `workflow`-scope check before the first push stays as a backstop, because a person can sign out and back in between setup and the first push.
- **2026-09-27** — Assumed: the README's three steps stay; getting-started expands them and says so, and its *Honest list* gains the GitHub account and install approvals, because the two pages count different things and only need to agree.
- **2026-09-27** — Assumed: links from `wong-setup` are checked by hand, because `check-payload-links.mjs` skips that source-only skill (a known gap).
- **2026-09-27** — Assumed: a minor release, because no installed repo needs a migration step and setup only gains behavior.
- **2026-09-27** — Built: `wong-setup/references/tools.md` owns the check, the no-password install routes with the `~/.local` fallback, the GitHub code-flow sign-in, identity, and the Windows link test; `SKILL.md` runs it after the empty-folder check and before the clone, reading it from the raw URL. The failure map gains *Getting the computer ready*; the runbook's Step 1a and Step 5 changed; `required-tools.md`, `getting-started.md`, `cloudflare-credentials.md`, the stack hub, and the README match. `gh auth login --web` and `gh auth refresh` were run with no terminal and printed the one-time code and device link. One consent names every missing tool, rather than one ask per tool; Node counts as ready at or above `.nvmrc`'s major. Released as 25.10.0, because 25.9.0 (dependency update, #147) merged first. Link, config, and retired-name checks and strict validation passed; `wong-setup` links were checked by script by hand.
- **2026-09-27** — CI passed on the build commit (PR #148), which completes task 3.3.
- **2026-09-27** — Distilled: no repeatable fact; the change's three live facts are open threads (the queued plain-words change, the rest of the audit, and a flaky memory test).
- **2026-09-27** — Archived and checkpointed for merge by `/ship`.

<!-- end proposal.md -->
<!-- file design.md utf8 6457 -->
# Design

## Context

Setup is prose an agent follows: [`wong-setup/SKILL.md`](../../../.agents/skills/wong-setup/SKILL.md) and its runbook, [`references/cloudflare.md`](../../../.agents/skills/wong-setup/references/cloudflare.md). Today the skill clones the source first, which needs `git`. Runbook Step 1a stops with "run `gh auth login`" when `gh` is signed out. Node and OpenSpec are installed "at the point of need", under a rule in [required tools](../../../wiki/development/required-tools.md#runtimes-install-at-the-point-of-need) that prefers user-local installs. Git identity is claimed by `/save`, but no `/save` step sets it, and runbook 4b.6 reads `git config user.email` before any commit. Windows links are made with `ln -s`, which Git Bash turns into a folder copy when symlinks are off.

The agent's shell is not a terminal: it cannot answer a `sudo` password prompt or an interactive `gh` question. `gh auth login --web` works without one: it prints a one-time code and the device URL, then waits.

## Goals / Non-Goals

**Goals:**
- Setup finds and fixes every missing tool before it writes a file, with a consent that names every install.
- One GitHub approval carries `workflow` and `user:email`.
- No setup step asks the person to type a command.
- The human pages match what setup does.

**Non-Goals:**
- A script or installer binary. The check runs before any WongStack file is on the machine.
- Installing Homebrew, or any package manager.
- Changing how `/verify`, `/save`, or other verbs install tools.

## Decisions

- **Owner: a new [`wong-setup/references/tools.md`](../../../.agents/skills/wong-setup/references/tools.md).** It holds the check, the per-system install table, the GitHub sign-in, identity, and the Windows link test. `SKILL.md` gets a short *Get the computer ready* section that links it, placed after *Start from an empty folder* and before the source clone. Alternative: grow the runbook's Step 1. The runbook runs after the clone and is about Cloudflare, so the check would come too late.
- **Check order: `git`, `gh`, Node, OpenSpec.** `git` is needed for the clone, and OpenSpec needs Node. Each check is `command -v`, plus `node --version` at least `.nvmrc`'s major version (22), read from the raw URL before the clone.
- **Install route, per tool, first that works without a password:**

  | System | Route |
  |---|---|
  | macOS | `brew install` when `brew` is on `PATH`; else user folder |
  | Windows | `winget install --id <Git.Git / GitHub.cli / OpenJS.NodeJS.LTS>` (a Windows consent popup, not a password) |
  | Linux | `apt-get install` when `sudo -n true` succeeds; else user folder |

  The user folder means `~/.local`. Node comes from nodejs.org's official tarball for the platform, and `gh` from its GitHub release archive. Both add `~/.local/bin` to `PATH` for the session and to the shell profile. OpenSpec uses the install command owned by [`save/references/preconditions.md`](../../../.agents/skills/save/references/preconditions.md), with `--prefix ~/.local` when global npm needs `sudo`. `git` on a Mac with no `brew` triggers Apple's own command-line-tools prompt, a dialog the person clicks. Alternative: user-folder installs everywhere. The person chose the package manager, which is easier to update.
- **GitHub sign-in: `gh auth login --web --hostname github.com --git-protocol https --scopes workflow,user:email`,** run in the background. The agent reads the one-time code from its output and shows the code and `https://github.com/login/device` in the ask format. Already signed in → `gh auth status` scopes; missing ones → one `gh auth refresh --hostname github.com --scopes <missing>`, same code flow. `--git-protocol https` also sets git's credential helper, so the first push needs no second login. Runbook Step 1a then verifies and keeps its stop as the failure path. 4e's `workflow` check stays as a backstop.
- **Identity:** when either value is unset, `gh api user --jq '.name // .login'` gives the name, and `gh api user/emails --jq '.[] | select(.primary and .verified) | .email'` gives the email (this needs `user:email`, which is now requested). Set with `git config --global`. An existing value is never touched. `SKILL.md:33`'s "`/save` for Git identity" is dropped.
- **Windows links:** when `uname -s` matches `MINGW*|MSYS*|CYGWIN*`, test `MSYS=winsymlinks:nativestrict ln -s` in a temp folder. On failure, show *Settings → System → For developers → Developer Mode: On*, run `git config --global core.symlinks true`, and test again. The agent-folder step in `SKILL.md` makes its links with `MSYS=winsymlinks:nativestrict` on Windows, so a failure is loud, not a silent copy.
- **Memory line in the closing report:** Step 5 reads 4g's digest result. "On" only when it answered; else *"Memory starts once your site first goes live; until then, what I learn waits on this computer."*
- **Point-of-need rule:** [required tools](../../../wiki/development/required-tools.md#runtimes-install-at-the-point-of-need) keeps *consent always* and adds setup as the one skill that checks ahead. The user-local preference becomes the fallback route. The spec replaces the requirement, because its scenarios (no install during the check, a partial install on decline) invert.

## Risks / Trade-offs

- [`winget` missing on an old Windows 10] → user-folder install via the Node `.zip` and the `gh` `.zip`; `git` on Windows ships with Git Bash, which the Claude app already needs.
- [A distro without `apt`] → user-folder route; the table names only `apt`, to stay short.
- [`gh auth login --web` changes its output] → the agent reads the code from whatever line holds `one-time code`. If none appears, it stops with the failure-map entry rather than guessing.
- [The profile edit for `~/.local/bin` misses the shell the agent host uses] → setup exports `PATH` for its own session and rechecks with `command -v`. A later session finding the tool missing is caught by `/save`'s preconditions.
- [The flow is prose, and no test runs it] → the known cost of setup (memory: install defects are found by driving a real install). The *walkthrough matches reality* requirement stands.

## Migration Plan

Minor release, 25.10.0. Installed repos receive the `required-tools.md`, `getting-started.md`, and `cloudflare-credentials.md` edits through `/wong-sync`. `wong-setup` is source-only, so the setup changes reach only new installs. No installed repo needs a step.

<!-- end design.md -->
<!-- file tasks.md utf8 3732 -->
# Tasks

## 1. Setup skill

- [x] 1.1 Write `.agents/skills/wong-setup/references/tools.md`: the four-tool check (with the Node major version read from the source's `.nvmrc`), the per-system install table with the no-password rule and the `~/.local` fallback, the one consent per install in [the ask format](../../../.agents/skills/explore/references/asking-the-user.md), the stop on decline or failure, the GitHub code-flow sign-in and scope refresh, git identity from GitHub, and the Windows link test with the Developer Mode walkthrough. Link the OpenSpec install command in `save/references/preconditions.md` rather than copying it. Verify: every command in design.md's *Decisions* appears once, and every doc it names is linked.
- [x] 1.2 Add *Get the computer ready* to `.agents/skills/wong-setup/SKILL.md`, after *Start from an empty folder* and before the source clone, linking `tools.md`. Reorder the opening line to match. Drop "`/save` for Git identity" from the delegation paragraph. Make the agent-folder links with `MSYS=winsymlinks:nativestrict` on Windows. Verify: the skill reads in order — empty folder, computer ready, source, token, explore — and stays under 800 words.
- [x] 1.3 In `references/cloudflare.md`, turn Step 1a's signed-out stop into a check that points back to `tools.md`'s sign-in. Make Step 5's memory line depend on 4g's digest result, with the plain "starts once your site first goes live" wording. Update the intro drawing's "two checkboxes". Verify: 4e's `workflow` backstop is unchanged.
- [x] 1.4 Add a *Getting the computer ready* table to `references/failure-map.md`: a declined install, a package manager that wants a password, no code in `gh`'s output, a sign-in not completed, no verified primary email, and the Windows link test still failing after Developer Mode. Each row gets the one fix in plain words.

## 2. Wiki and README

- [x] 2.1 In `wiki/development/required-tools.md`, rewrite *Runtimes install at the point of need*: consent always; setup is the one skill that checks ahead; the package-manager-then-user-folder route; other skills keep point-of-need. Point the `gh` scope sections and *Symbolic links in the agent folder* at setup's handling. Verify: the governing-rule quote still holds.
- [x] 2.2 In `wiki/stack/getting-started.md`, say setup may install free tools after asking, and replace "Nothing installs on your computer beyond the coding agent". Say the steps expand the README's three. Describe the GitHub step as a code and one approval, and drop the "approve everything" warning. Add the GitHub account and install approvals to *Honest list*. Verify: no line says nothing is installed.
- [x] 2.3 In `wiki/stack/cloudflare-credentials.md`, change "two checkboxes" to two permission rows.
- [x] 2.4 In `README.md`, make step 3 name a free GitHub account and say setup installs any missing free tools after asking. Make *Requirements* say setup installs `git`, `gh`, Node.js, and OpenSpec when they are missing, and replace the Windows "before you clone" line with setup's check. Verify: the install-onboarding requirements still hold (one prompt, a no-terminal app named).

## 3. Release

- [x] 3.1 Bump `VERSION` 25.9.0 → 25.10.0 and add a newest-first `CHANGELOG.md` entry with an **Updating** line: nothing to do in an installed repo; new installs get the tool check.
- [x] 3.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate setup-installs-its-tools --strict --no-interactive`. Check links from `wong-setup/` into other skills by hand, since the link checker skips it. Verify: all pass.
- [x] 3.3 CI passes on the pull request, checked by `/save`.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 3679 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Setup provisions the memory store in every install

Setup's provisioning step SHALL provision the memory store in every new install: it SHALL create the `<repo>-memory` D1 database, and the private R2 bucket of the same name when R2 is enabled, bind them in the production part of the app's wrangler config as `MEMORY_DB` and `MEMORY_BUCKET`, apply the memory migrations with the user token, and create an admin key for the installer's git email, as `memory-store` requires. It SHALL NOT bind them in `env.staging`. It SHALL write that key to the git-ignored `.env` as `CLOUDFLARE_MEMORY_TOKEN` without printing it, SHALL NOT mint a Cloudflare token for memory, SHALL NOT set the key as a CI secret, and SHALL record the resource ids and the production Worker's memory URL under `components.memory` in `.claude/.wong-stack.json`. It SHALL NOT deploy a separate memory Worker. It SHALL check the digest through the Worker once production has deployed, as part of the smoke test. A run that finds the store already provisioned SHALL change nothing. Creating the key is covered by the same pre-authorization as the widen. Creating the database and bucket SHALL still require asking, as other billable resources do.

The closing report SHALL say that memory is on only when that digest check answered. Otherwise it SHALL say that memory starts once the site first goes live, and that facts wait on this computer until then.

Before it creates the bucket, the step SHALL check whether R2 is enabled on the account. R2 needs a payment method on file even inside its free tier, and an API token cannot enable it. When R2 is not enabled, the step SHALL provision the database and the key without a bucket, record the absence under `components.memory`, and report that transcripts are not stored, with the dashboard step that turns R2 on. A later run that finds R2 enabled SHALL add the bucket, bind it in the production config, and give the `<repo>-deploy` token `Workers R2 Storage Write`; the key does not change.

#### Scenario: The memory token is narrow

- **WHEN** provisioning creates the installer's memory key
- **THEN** the key opens only this repo's memory store through the app's production Worker, and no Cloudflare token is minted for memory
- **AND** it is written to `.env` and not to any CI secret

#### Scenario: The memory store is bound in production only

- **WHEN** provisioning writes the app's wrangler config
- **THEN** the top level binds `MEMORY_DB`, and `MEMORY_BUCKET` when R2 is enabled
- **AND** `env.staging` binds neither, and no `wong-memory` Worker is created

#### Scenario: R2 is not enabled

- **WHEN** provisioning creates the memory store on an account where R2 is not enabled
- **THEN** it creates the memory database and key, and no bucket
- **AND** it reports that transcripts are not stored and names the dashboard step that enables R2

#### Scenario: R2 is enabled later

- **WHEN** a later run finds R2 enabled and the store has no bucket
- **THEN** it creates the bucket, binds it in the production config, gives the deploy token R2 access, and records the bucket

#### Scenario: Provisioning runs again

- **WHEN** the memory store, its bindings, and the key already exist and verify
- **THEN** the run reports the store as current and creates nothing

#### Scenario: Memory is reported before production answers

- **WHEN** the closing report is written and the digest check through the production Worker has not answered
- **THEN** the report says memory starts once the site first goes live, and that facts wait on this computer until then
- **AND** it does not say memory is on

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 6566 -->
# Spec Delta

## ADDED Requirements

### Requirement: Setup readies the computer before it writes anything

After the empty-folder check and before it clones the source, `/wong-setup` SHALL make the computer ready, in this order: the tools `toolchain-dependencies` names, the GitHub sign-in, the git name and email, and on Windows, symbolic links. It SHALL write nothing in the target folder until all four are ready. A folder that setup will refuse SHALL trigger no install.

**Git identity.** When `git config user.name` or `git config user.email` is unset, setup SHALL set the missing values in the global git config, from the person's GitHub name (or login) and their primary verified GitHub email. It SHALL NOT change an identity that is already set.

**Windows links.** On Windows, setup SHALL test whether it can create a real symbolic link. When it cannot, it SHALL walk the person through turning on Developer Mode, set git's `core.symlinks` to `true`, and test again. It SHALL NOT create the agent folder's links until the test passes. When the person stops, setup SHALL write nothing.

#### Scenario: A folder with files installs nothing

- **WHEN** setup runs in a folder that has files and no install record
- **THEN** it stops at the empty-folder check and installs no tool

#### Scenario: A new computer has no git identity

- **WHEN** setup runs where git has no user name or email
- **THEN** setup sets them from the person's GitHub account before the memory admin key is made
- **AND** the key is made for that email

#### Scenario: An existing git identity is kept

- **WHEN** git already has a user name and email
- **THEN** setup leaves both unchanged

#### Scenario: Windows without symbolic links

- **WHEN** setup runs on Windows where a real symbolic link cannot be made
- **THEN** it shows the person how to turn on Developer Mode, sets `core.symlinks`, and tests again
- **AND** it creates the `.claude` and `.codex` links only after the test passes

## MODIFIED Requirements

### Requirement: Setup creates the GitHub repository

Before setup sets a GitHub secret or pushes, it SHALL confirm that `gh` is authenticated with the `workflow` and `user:email` scopes, initialize git in the empty folder, and create a private GitHub repository with `origin` pointing at it. When `origin` already exists, setup SHALL use it and create nothing.

When `gh` is not authenticated, setup SHALL sign the person in itself, through GitHub's browser code flow, requesting both scopes in the one approval. It SHALL show the person the code and the link, and SHALL NOT ask them to type a command. When `gh` is authenticated but lacks a scope, setup SHALL add every missing scope in one refresh. When sign-in is not completed, setup SHALL stop before it creates any Cloudflare resource.

#### Scenario: A new folder gets its repository

- **WHEN** setup runs in an empty folder and `gh` is authenticated
- **THEN** the folder is a git repository with an `origin` on GitHub before the CI secret is set

#### Scenario: gh is signed out

- **WHEN** setup runs and `gh auth status` fails
- **THEN** setup starts the browser sign-in, shows the code and the link, and requests `workflow` and `user:email` together
- **AND** when the sign-in is not completed, setup stops and has created no Cloudflare resource

#### Scenario: gh is signed in without a scope

- **WHEN** `gh` is authenticated but lacks `workflow`, `user:email`, or both
- **THEN** setup adds every missing scope in one browser approval

### Requirement: The paste-to-running-app path is documented for the person walking it

The payload SHALL carry a short, human-facing account of the whole path — what the user does, in order, and what they get at each stage — distinct from the agent-facing provisioning runbook. It SHALL be written for someone non-technical: numbered actions, plain language, no assumed vocabulary. It SHALL state honestly which steps are irreducibly manual (a GitHub account, the GitHub browser approval, approving any tool installs, Cloudflare signup, and creating the first token) and SHALL NOT imply that steps requiring a human are automated. It SHALL say that setup may install free tools on the computer after asking, and SHALL NOT claim that nothing is installed.

This document SHALL be the reference the end-to-end fresh-repo test is run against, so that a step which reads clearly but plays badly is caught.

#### Scenario: A newcomer reads before starting

- **WHEN** someone who has never used the toolkit reads the walkthrough
- **THEN** they can tell how many things they personally have to do, what each one is, and roughly how long it takes
- **AND** every step that requires leaving the agent for a browser is called out as such

#### Scenario: The walkthrough matches the tested reality

- **WHEN** the end-to-end fresh-repo test runs
- **THEN** it follows this walkthrough as written
- **AND** any divergence found is corrected in the walkthrough rather than left as tribal knowledge

#### Scenario: Tool installs are disclosed

- **WHEN** a newcomer reads the walkthrough or the README before starting
- **THEN** they learn that setup may install free tools after asking
- **AND** no page says that nothing is installed on their computer

### Requirement: Installation preserves the target and records the result

The normal installation plan SHALL use the payload inventory, preserve existing repo content, include required wiki hubs and environment ignore rules, and record the completed install version and commit. Commits and pushes SHALL remain with `/save`, `/continue`, or `/ship`; setup readies git identity and creates the repository and `origin`. Cloudflare work SHALL run as setup's provisioning step. Setup itself SHALL remain source-only.

#### Scenario: Empty folder
- **WHEN** the target has no repo or planning layer
- **THEN** setup prepares planning prerequisites and git identity when needed, and includes target initialization in the workflow
- **AND** `/save` owns commits and pushes

#### Scenario: Existing project
- **WHEN** the target already has instructions, docs, or skills
- **THEN** the plan adapts the payload to those files and preserves local content outside the agreed change
- **AND** optional hosting or scaffold components stay disabled unless selected

#### Scenario: Completed install
- **WHEN** `/apply` completes the installation tasks
- **THEN** the target has its required wiki hubs, environment ignore rules, and an install record for the implemented source
- **AND** the normal `/save` checkpoint follows

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/toolchain-dependencies/spec.md utf8 4053 -->
# Spec Delta

## ADDED Requirements

### Requirement: Runtimes are installed with consent, and only setup checks ahead

No WongStack skill SHALL install a language runtime or tool without the person's consent, and none SHALL install one "while we're here". A skill other than `/wong-setup` SHALL install a runtime or tool only at the moment a step requires it.

`/wong-setup` is the one exception, because nothing works until its tools exist. Before it writes any file or clones the source, it SHALL check for `git`, `gh`, Node.js at least at the major version in `.nvmrc`, and the OpenSpec CLI. It SHALL name each missing tool in plain language, and install each one only after the person agrees. It SHALL install through the system package manager (Homebrew when it is already present, `winget`, or `apt`) only when that install needs no password prompt. Otherwise it SHALL install into the person's own home folder. It SHALL NOT install a package manager itself. When a tool is declined or its install fails, setup SHALL stop before it writes anything, say what is missing and what to try, and say that running setup again continues from the check.

Node.js is required by the OpenSpec CLI, which is distributed solely as an npm package with no standalone binary. The payload SHALL continue to depend on that CLI rather than reimplementing its artifact schema, so Node is a real dependency of the planning verbs and of the memory layer.

Where a skill names which verbs survive without the CLI, that list SHALL match what the verbs actually do. `/save` shells out to `openspec new change`, `openspec status --json`, and `openspec instructions` when it authors a change for a session that skipped `/plan`, and it writes facts through the memory script, so it is **not** a no-runtime verb. A list that is wrong here is worse than no list: it is read at the one moment the user is deciding whether to install anything.

#### Scenario: Setup on a machine without Node

- **WHEN** `/wong-setup` runs in an empty folder on a machine with no Node.js
- **THEN** it says, before it writes anything, that it needs Node.js and why, and asks to install it
- **AND** it installs Node only after the person agrees

#### Scenario: The user declines the runtime install

- **WHEN** the person declines a tool setup needs
- **THEN** setup writes no file and creates nothing on GitHub or Cloudflare
- **AND** it names what is missing, what it is for, and that running setup again continues from the check

#### Scenario: The package manager would ask for a password

- **WHEN** a missing tool's package-manager install would prompt for an admin password, or no supported package manager is present
- **THEN** setup installs the tool into the person's home folder instead
- **AND** it does not install a package manager

#### Scenario: Every tool is present

- **WHEN** setup finds `git`, `gh`, the required Node.js version, and the OpenSpec CLI
- **THEN** it installs nothing and asks nothing about tools

#### Scenario: Other skills install at the point of need

- **WHEN** a verb other than `/wong-setup` finds a tool missing, such as `/verify` without its browser CLI
- **THEN** it installs the tool only when a step needs it, and says so

#### Scenario: The unavailable-verbs list is accurate

- **WHEN** a skill states which verbs work without Node
- **THEN** `/save`'s change-authoring and fact paths are named as needing it, alongside `/plan`, `/apply`, `/continue`'s fact recap, `/explore`'s memory search, and `/ship`
- **AND** no verb is promised to work that shells out to the CLI or the memory script

## REMOVED Requirements

### Requirement: Runtimes are installed at the point of need, never pre-emptively

**Reason**: Setup's point-of-need installs left a person stranded partway, with a terminal command to type. Setup now checks every tool before it writes anything, and asks before each install.
**Migration**: Replaced by *Runtimes are installed with consent, and only setup checks ahead*, which keeps point-of-need installs for every other skill.

<!-- end specs/toolchain-dependencies/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41817 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-27-setup-installs-its-tools</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-setup-installs-its-tools">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-setup-installs-its-tools</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The setup page promises that nothing gets installed on your computer and that you need no terminal. In practice, setup needs four free tools. When one is missing, setup stops partway with an error only a programmer can act on. Other stops come later: a second GitHub sign-in, a bare error on a new computer, and on Windows, skills that silently don't load. Setup should get your computer ready at the start, ask before each install, and let the pages tell you honestly what happens.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Setup gets your computer ready first.</b> Before it touches your folder or Cloudflare, setup checks for the four tools it needs. It installs the missing ones, asking before each. If one can't be installed, it says what went wrong and what to try, and stops before anything else is made.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">empty folder? ──no──▶ stop</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">     │ yes</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">     ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">check the four tools</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">     │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">missing one? ──yes──▶ &quot;May I install</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">     │                 Node? (free)&quot;</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">     │                    │ yes</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">     │◀───────────────────┘</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">     ▼</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">sign in to GitHub (once)</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">     │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">     ▼</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">Cloudflare key, then the</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">usual plan and build</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>One GitHub sign-in, with everything it needs.</b> Setup shows you a short code and a link. You approve once in the browser, with every permission setup needs, and don't have to type any commands. Today a missing permission only fails at the first save, and you have to sign in again.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">I need you to approve GitHub once.</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">1. Open github.com/login/device</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">2. Enter the code  ABCD-1234</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">3. Approve, then come back here</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Your name and email are set for you.</b> On a new computer, setup takes them from your GitHub account. Without them, setup used to stop partway with a bare error.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Windows gets a real check.</b> Setup tests whether Windows lets it make the folder links the assistant needs. If not, it walks you through the one switch in Settings, then checks again. Today the assistant just silently finds none of its skills.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Memory is reported honestly.</b> At the end, setup says memory is on only when it actually answers. Otherwise it says memory starts working once your site first goes live.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The pages match what happens.</b> The README, the getting-started guide and the token page agree on the steps. They say that setup may install free tools after asking, and that you need a free GitHub account. The token screen is described as two permission rows, not two checkboxes.</div></div></li>
</ol>
<p class="aside">Non-goals: no change to the Cloudflare key itself or how it is made; no installer app or download; no change to other commands, which still install a tool only when they need it; no &quot;what can I ask?&quot; page or update notices, which come later.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked which area of the setup-to-use audit to tackle first → chose the setup tools.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether setup should install missing tools or the docs should drop the &quot;nothing to install&quot; promise → chose setup installs them.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether to also fix the other setup stops (git identity, the memory report, Windows links) → chose tools plus those stops.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked how setup should install missing tools → chose the system package manager (Homebrew, winget, apt).</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked what setup does about Windows symbolic links → chose detect and walk the person through it.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: setup uses the package manager only when it runs without a password prompt (Homebrew already present, winget, or <code>apt</code> with passwordless <code>sudo</code>), and otherwise installs into the user's own folder, because the agent's shell cannot answer a <code>sudo</code> password prompt, and a managed laptop may refuse admin rights.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: setup does not install Homebrew itself, because that needs an admin password in a terminal; a Mac without it gets the user-folder install.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the check runs after the empty-folder check and before the source clone, because the clone needs <code>git</code>, and a folder that will be refused should not trigger installs.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the check is prose in a new <code>wong-setup/references/tools.md</code>, not a script, because it runs before any WongStack file is on the machine and must work where <code>node</code> is missing.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the OpenSpec install command stays owned by <code>save/references/preconditions.md</code>, and <code>tools.md</code> links it, because <code>/update-dependencies</code> bumps the pin there.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: other skills keep point-of-need installs, and the spec's point-of-need requirement is replaced by one that carves out setup, because only setup runs before anything works.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: each unset git name or email goes into the global git config, taken from <code>gh api user</code> and the primary verified email, because a person's other repos need the same identity and an existing one must not be overwritten.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: <code>/save</code> no longer claims to own git identity in <code>wong-setup/SKILL.md</code>, because no <code>/save</code> step sets it; setup does it now.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the <code>install-onboarding</code> requirement <i>Installation preserves the target</i> is corrected in the same change, because it says <code>/save</code> owns identity and names the retired <code>/wong-cloudflare</code>, and this change moves identity to setup.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the runbook's <code>workflow</code>-scope check before the first push stays as a backstop, because a person can sign out and back in between setup and the first push.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the README's three steps stay; getting-started expands them and says so, and its <i>Honest list</i> gains the GitHub account and install approvals, because the two pages count different things and only need to agree.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: links from <code>wong-setup</code> are checked by hand, because <code>check-payload-links.mjs</code> skips that source-only skill (a known gap).</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a minor release, because no installed repo needs a migration step and setup only gains behavior.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Built: <code>wong-setup/references/tools.md</code> owns the check, the no-password install routes with the <code>~/.local</code> fallback, the GitHub code-flow sign-in, identity, and the Windows link test; <code>SKILL.md</code> runs it after the empty-folder check and before the clone, reading it from the raw URL. The failure map gains <i>Getting the computer ready</i>; the runbook's Step 1a and Step 5 changed; <code>required-tools.md</code>, <code>getting-started.md</code>, <code>cloudflare-credentials.md</code>, the stack hub, and the README match. <code>gh auth login --web</code> and <code>gh auth refresh</code> were run with no terminal and printed the one-time code and device link. One consent names every missing tool, rather than one ask per tool; Node counts as ready at or above <code>.nvmrc</code>'s major. Released as 25.10.0, because 25.9.0 (dependency update, #147) merged first. Link, config, and retired-name checks and strict validation passed; <code>wong-setup</code> links were checked by script by hand.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>CI passed on the build commit (PR #148), which completes task 3.3.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled: no repeatable fact; the change's three live facts are open threads (the queued plain-words change, the rest of the audit, and a flaky memory test).</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archived and checkpointed for merge by <code>/ship</code>.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as a plain request to update the plan ──
  function notesText() {
    const lines = ['Update the plan ' + CHANGE + ' with these notes from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat to update the plan.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
