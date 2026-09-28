# staging-walkthrough Specification

## Purpose

`/verify` exercises a change's own OpenSpec scenarios against its deployed preview, each with the strongest probe that can observe it, grades the evidence against each scenario's `THEN`, and posts it on the pull request. It works in any repo on any stack, leaves the repo untouched, and gates nothing.

## Requirements

### Requirement: Verify is a verb that gates nothing

The walk SHALL run only when a person invokes `/verify`, or once inside `/ship` as evidence before the merge; `/save`, `/apply`, and `/continue` SHALL NOT walk. `/verify` SHALL run at any point in a change and any number of times, and SHALL block, delay, or condition nothing.

#### Scenario: A failing walk

- **WHEN** a walk returns `FAILURE`
- **THEN** the failure is reported and posted, and `/verify` stops no push, merge, or other skill

#### Scenario: Mid-change and repeated

- **WHEN** `/verify` runs three times on a branch with unchecked tasks
- **THEN** each run walks what is deployed for the current commit and reports its own verdict

### Requirement: Verify works in any repo

`/verify` and its walkthrough page SHALL ship in the core payload and work in a repo of any language on any host, with no vendor account. Nothing SHALL switch the walk on or off by configuration.

#### Scenario: A repo with no package manifest

- **WHEN** `/verify` runs in a repo with no `package.json` and no Node toolchain
- **THEN** the walk runs normally, and nothing is added to the repo

### Requirement: Nothing to walk costs nothing

`/verify` SHALL read the change's scenarios before any push or credential check. When no probe can reach any scenario, the verdict SHALL be `NONE` in one line, with no save, preflight, or browser.

#### Scenario: A library-only change

- **WHEN** a change's scenarios have no deployed surface
- **THEN** the verdict is `NONE` and nothing is pushed or launched

### Requirement: The walk targets this commit's deployed preview

When there is something to walk, `/verify` SHALL invoke `/save` first, so this commit is deployed, and SHALL walk the preview URL that CI published for it. It SHALL never ask for a URL or build one from a naming pattern, and a commit with no discoverable preview SHALL be `UNKNOWN`.

#### Scenario: Uncommitted work

- **WHEN** `/verify` runs with uncommitted work and a reachable scenario
- **THEN** `/save` runs first, and the walk targets the URL it resolved

#### Scenario: CI does not deploy

- **WHEN** no preview URL exists for this commit
- **THEN** the verdict is `UNKNOWN`, naming the missing deployment, and no URL is guessed

### Requirement: Each scenario gets the strongest probe

The walk SHALL cover the change's delta scenarios plus those of any capability the branch diff touches, not the whole spec set. Each scenario SHALL get a browser journey, a request probe, or a state probe through an existing command, with its `WHEN` as the steps and its `THEN`, verbatim, as the pass criterion. A scenario no probe reaches SHALL be listed by name as unverified.

#### Scenario: An API scenario

- **WHEN** a scenario describes an endpoint's status and body with no UI
- **THEN** it gets a request probe, and the request and response are its evidence

#### Scenario: A scenario only local code could observe

- **WHEN** a scenario is observable only by running the repo's code locally
- **THEN** it is not walked, and the report lists it by name as unverified

### Requirement: The evidence is graded against the THEN

Each journey SHALL pass only when its evidence shows what its `THEN` describes; a run with no error or a bare `200` SHALL NOT pass. When the evidence is ambiguous, the walk SHALL stop and ask the person, showing the evidence beside the `THEN`.

#### Scenario: A bare 200

- **WHEN** a request probe returns `200` with a body that does not show the `THEN`
- **THEN** the journey fails

### Requirement: The walk installs tools, never repo dependencies

The walk SHALL install the browser CLI and its browser on the machine, only when a browser journey needs them, and SHALL say what it installed. It SHALL add no dependency, lockfile change, or manifest to the repo, and SHALL ask before installing a language runtime.

#### Scenario: A machine without the browser

- **WHEN** a browser journey runs on a machine without the browser CLI
- **THEN** the walk installs it, reports the install, and the working tree is unchanged

### Requirement: The walk leaves the repo as it found it

Journeys and evidence SHALL live outside the working tree and SHALL be deleted on every exit, including a stop on `UNKNOWN` or a pause to ask. Cleanup SHALL refuse any path the walk did not create. The evidence SHALL be screenshots, captured requests, and command output, never a video.

#### Scenario: Any verdict

- **WHEN** a walk ends, whatever its verdict
- **THEN** `git status` shows the same working tree it started from

#### Scenario: A path the walk did not make

- **WHEN** cleanup is given a path outside its temp run folders
- **THEN** it removes nothing and exits non-zero

### Requirement: The walk uses a throwaway browser profile

Every browser journey SHALL run in a fresh temporary profile removed after the run, never with the person's saved logins, and SHALL never wait on their profile's lock.

#### Scenario: Two walks at once

- **WHEN** two worktrees run `/verify` at the same time
- **THEN** neither waits on the other's browser profile, and neither sees personal cookies

### Requirement: Credentials come from the durable store

The walk SHALL use a credential already exported, else read the primary worktree's ignored `.env`, and SHALL never print a value. It SHALL add no variable of its own for a remote browser; that setting belongs to the browser tool.

#### Scenario: A linked worktree

- **WHEN** `/verify` runs in a linked worktree with no `.env` and the credential is in the primary worktree's
- **THEN** the walk uses it and asks for nothing

### Requirement: Five verdicts, and unverified is never absent

A walk SHALL end in exactly one of `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`, or `TIMEOUT`. A walk that could not run or be trusted SHALL be `UNKNOWN` and reported as unverified, never as `NONE` or a rendered page.

#### Scenario: No browser could start

- **WHEN** the browser cannot be obtained
- **THEN** the verdict is `UNKNOWN`, and the report says the change was not verified

### Requirement: An Access wall heals once

When a walk meets a Cloudflare Access login and a Cloudflare API token is available, `/verify` SHALL mint and store a service token without printing it, then retry exactly once. With no token, or when the wall survives the retry, the verdict SHALL be `UNKNOWN`, naming the wall and what was tried.

#### Scenario: A token is available

- **WHEN** a walk hits an Access login with a Cloudflare API token and no stored service token
- **THEN** `/verify` mints one, retries once, and commits no credential

#### Scenario: No Cloudflare token

- **WHEN** a walk hits an Access login and no Cloudflare API token exists
- **THEN** the verdict is `UNKNOWN`, and the login page is not graded

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE` only, `/verify` SHALL reset staging to its seed. It SHALL then fix a failure in this change's own scope, save, and walk again, at most twice, and SHALL stop and report any other failure; the report SHALL state the scope judgement.

#### Scenario: An in-scope failure

- **WHEN** a journey contradicts its `THEN` in this change's own code
- **THEN** `/verify` resets staging, fixes, saves, and walks again, stopping after two failed attempts

#### Scenario: An out-of-scope failure

- **WHEN** a journey fails on behavior this change did not introduce
- **THEN** `/verify` resets staging, reports, and stops without a fix

### Requirement: Evidence is posted on every verdict

Each `/verify` SHALL post one new pull-request comment, whatever its verdict, covering each journey's probe, steps, `THEN`, and verdict, where the probes ran, and each unverified scenario by name. A repeat SHALL add a comment, never edit one, and screenshots SHALL be linked when a media host exists, else cited by local path.

#### Scenario: A walk that could not run

- **WHEN** a walk returns `UNKNOWN`
- **THEN** a comment says the change was not verified, and why

#### Scenario: Two walks

- **WHEN** `/verify` runs twice on one pull request
- **THEN** two comments exist, in order, and the first is unchanged

### Requirement: The walkthrough page records what was declined

The walkthrough page SHALL record the options declined and why: a saved test suite, a second judging agent, walking the whole spec set, and walking on every `/save`. It SHALL also record why this browser engine was chosen and what replacing it costs.

#### Scenario: Why not walk on every save

- **WHEN** a reader asks why the walk does not run on every `/save`
- **THEN** the page gives the decision and its reason

### Requirement: Browser journeys follow the installed tool's guide

Before writing a browser journey, the walk SHALL load the guide the installed browser CLI serves for its own version, and SHALL write the journey's commands from it rather than from a copy kept in the repo.

#### Scenario: The browser CLI updates

- **WHEN** the machine's browser CLI moves to a newer version with changed commands
- **THEN** the next walk writes its journeys from the newer version's guide, with no repo change
