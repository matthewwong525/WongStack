## ADDED Requirements

### Requirement: Git identity is derived from GitHub, not requested

`wong-setup` SHALL ensure `user.name` and `user.email` resolve before it makes any
commit, and where they do not, SHALL derive them from the authenticated GitHub
account rather than asking the user. It SHALL state what it set.

`gh auth login` does not set a git identity, so a machine that has only ever
authenticated to GitHub still fails — and without one `git commit` aborts with
*"Author identity unknown / Please tell me who you are"*, a wall precisely at the
newcomer the skill is written for.

The account already holds both values, so asking is a question with a knowable
answer. `gh api user` returns `name` and `login`; `email` is commonly `null`,
because keeping the address private is GitHub's default. The identity SHALL
therefore use the account's **noreply address**, formed from the numeric id and
login, which always works for pushes and discloses no personal address. Setup
SHALL fall back to asking only where `gh` is unauthenticated or the call fails.

#### Scenario: Fresh machine, GitHub authenticated

- **WHEN** setup reaches the initial commit with no identity set at any scope and `gh` authenticated
- **THEN** it sets `user.name` and `user.email` from the account without asking, names the values it set in one plain line, and commits

#### Scenario: The account hides its email

- **WHEN** the account's `email` is `null`
- **THEN** the noreply address formed from the account's id and login is used, and nothing is asked

#### Scenario: Identity already configured

- **WHEN** an identity resolves globally or in the repo
- **THEN** it is left alone and nothing is asked or announced

#### Scenario: GitHub not available to read from

- **WHEN** no identity is set and `gh` is unauthenticated or its call fails
- **THEN** setup asks for a name and email as the fallback, rather than committing without one

### Requirement: The default branch is main unless the repo says otherwise

The skills SHALL treat `main` as the default branch, and SHALL determine it another
way only where `main` does not exist.

`/save` and `/ship` currently instruct the agent to substitute *"whatever
`git symbolic-ref refs/remotes/origin/HEAD` resolves to"*. That command fails with
`not a symbolic ref` on a freshly created repo — `gh repo create --push` does not
record the head — so the documented setup path produces a repo where the documented
first command errors.

Detection also solves a problem this toolkit doesn't have: setup runs
`git init -b main`, and `gh repo create` adopts the local branch, so every repo it
creates is on `main`. The fallback exists for a pre-existing repo on `master` or
another name, which is the only case where the question is real.

#### Scenario: Repo created by the setup

- **WHEN** any verb needs the default branch in a repo setup created
- **THEN** it uses `main` without running a detection command

#### Scenario: Pre-existing repo on another default

- **WHEN** `main` does not exist in the repo
- **THEN** the actual default is resolved and used, and the resolution is not assumed to succeed silently

### Requirement: Setup seeds every wiki hub the payload links to

`wong-setup` SHALL seed a hub at each wiki directory a payload page links to — today
`wiki/README.md` **and** `wiki/development/README.md` — not only the wiki root.

Shipped payload pages link to `wiki/development/README.md`: `secrets.md` closes with
*"Other development processes live in [Development](README.md)"* and
`required-tools.md` carries the same pointer. Nothing creates it, so it is a dead
link in every install. The rule the manifest already states — a cited owner is a
shipped owner — extends to a cited hub.

#### Scenario: Fresh repo with no wiki

- **WHEN** setup seeds the wiki for a repo that has none
- **THEN** it writes both `wiki/README.md` and `wiki/development/README.md`, each with real content drawn from the research rather than an empty stub

#### Scenario: A payload page gains a link to a new section hub

- **WHEN** a payload page is added that links to a section hub not yet seeded
- **THEN** that hub joins the set setup seeds, and the release check fails until it does

### Requirement: Setup corrects OpenSpec's closing instruction

After running `openspec init`, `wong-setup` SHALL tell the user which verb to
actually use, because the CLI closes by printing *"Start your first change:
/opsx:propose"* — a slash command WongStack states `openspec init` does not
generate and that agents are told not to reach for.

The correction is one line, and it is the last thing the user reads on that step,
so it SHALL come after the init output rather than before it.

#### Scenario: init prints its own getting-started line

- **WHEN** `openspec init` completes and prints its `/opsx:propose` suggestion
- **THEN** setup immediately says that this repo drives OpenSpec through `/plan`, and that the `/opsx:*` commands are not installed here

## MODIFIED Requirements

### Requirement: Bootstrap from zero

The `wong-setup` skill SHALL treat "no git repository yet" (an empty or non-repo folder) as a first-class, supported starting point, and SHALL NOT assume the user is already inside a git repo. When no repo exists, it SHALL offer, in plain language and only after confirmation, to create one and continue the setup — never failing or dead-ending the newcomer.

Because an empty folder has nothing to commit, the initial commit SHALL be made
**after** the authoring and seeding steps have written files, not as a bare rung
ahead of them. Setup SHALL NOT invent a placeholder file to commit, and SHALL NOT
leave the repo commit-less.

#### Scenario: Empty folder, never touched git

- **WHEN** the skill runs in a folder with no `.git` and the user has never used git
- **THEN** it explains in plain language that it will set up a repo for them, offers to create it (with an initial commit), and — only on confirmation — proceeds into the rest of the setup

#### Scenario: Already in a repo

- **WHEN** the skill runs inside an existing git repo
- **THEN** it skips the bootstrap-from-zero path and proceeds as before, without asking repo-creation questions

#### Scenario: Nothing exists to commit yet

- **WHEN** the repo is initialized in a folder with no files at all
- **THEN** the initial commit waits until the seeded files exist, rather than failing on an empty index or committing a placeholder
