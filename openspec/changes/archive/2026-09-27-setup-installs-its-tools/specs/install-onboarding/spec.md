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
