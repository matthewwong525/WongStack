# artifacts-install Specification

## Purpose

Lets a person install and run WongStack from their own computer with only a Cloudflare account. The project's repository, checks, previews and publishing all live in that account, with no GitHub account and no hosting service in between.

## Requirements

### Requirement: Setup installs with one Cloudflare account

A new install on Mac or Linux SHALL complete from one Cloudflare user token and no GitHub account, with its repository, app hosting, login wall and check runner all in the person's own Cloudflare account. Setup SHALL confirm the account can hold them before it creates anything.

#### Scenario: A fresh computer

- **WHEN** a person whose Cloudflare account has the paid plan asks for an install in an empty folder
- **THEN** the install finishes with its repository and site in that account, and no GitHub sign-in is asked for

#### Scenario: The account is on the free plan

- **WHEN** the token's account lacks the paid plan
- **THEN** setup stops before creating any resource, says the plan is needed and what it costs, and offers the GitHub route

### Requirement: A person can still choose GitHub

The GitHub route SHALL remain available to a new install, and SHALL be the route offered wherever the Artifacts route can not run.

#### Scenario: Someone asks for GitHub

- **WHEN** a person asks for their install to use GitHub
- **THEN** setup follows the GitHub route unchanged

#### Scenario: Setup runs on Windows

- **WHEN** setup runs on Windows
- **THEN** it says the Artifacts route is not ready there and offers the GitHub route

### Requirement: Checks run in the person's Cloudflare account

Every saved commit's checks and build SHALL run in the person's Cloudflare account, never on their computer, and SHALL be the same checks the GitHub route runs.

#### Scenario: A change is saved

- **WHEN** a commit is saved to a branch of an Artifacts install
- **THEN** its checks run in the account and the save reports their result for that exact commit

#### Scenario: A check fails

- **WHEN** a saved commit fails a check
- **THEN** no preview is published for it and the save reports the failure

### Requirement: The preview is private and belongs to the commit

A passing commit SHALL get a preview behind the install's login wall, and the link a verb prints SHALL be the address the deployment reported for that commit.

#### Scenario: A passing branch

- **WHEN** a saved commit passes its checks
- **THEN** the save returns that commit's own preview address, and a signed-out visitor is refused

#### Scenario: Only an earlier commit has a preview

- **WHEN** the newest commit has no preview yet
- **THEN** no earlier commit's link is shown as this work

### Requirement: Only a checked commit goes live

Production SHALL serve only a commit whose checks passed in the account. Publishing SHALL move the main line forward without rewriting it.

#### Scenario: Publish is approved

- **WHEN** the person answers yes to *publish it?* for a change whose checks passed
- **THEN** the main line advances to that change and production serves it once the main line's own checks pass

#### Scenario: The main line moved meanwhile

- **WHEN** the main line has advanced since the change was checked
- **THEN** publishing takes in the new main line and checks again, and never overwrites it

#### Scenario: A failing commit reaches the main line

- **WHEN** a commit on the main line fails its checks
- **THEN** it is not deployed and production keeps serving the last passing commit

### Requirement: The verbs work without pull requests

On an Artifacts install every verb SHALL do its work without a pull request and without the GitHub command-line tool.

#### Scenario: Picking up saved work

- **WHEN** a person asks to continue saved work
- **THEN** the menu lists the saved changes on the repository's branches with their status

#### Scenario: A save

- **WHEN** a save runs on an Artifacts install
- **THEN** no pull request is created or looked for, and a missing GitHub tool stops nothing

### Requirement: A result is never guessed

A check result that can not be read SHALL be reported as unverifiable, never as passed or absent.

#### Scenario: The check runner can not be reached

- **WHEN** a verb can not read the result for the saved commit
- **THEN** a save reports it unverifiable and carries on, and a publish stops

### Requirement: Credentials stay out of the repository and out of the checks

Git access tokens SHALL never appear in history, in the repository's address, or in a command's arguments. The credential that deploys SHALL never reach the step that runs the project's own tests and build.

#### Scenario: A test prints its environment

- **WHEN** a project's test or build script reads its environment during checks
- **THEN** no Cloudflare credential is in it

#### Scenario: Git access has expired

- **WHEN** a verb reaches the repository after its access token expired
- **THEN** access is renewed from the token in the ignored `.env` without asking the person

### Requirement: Teardown removes what setup made

Teardown SHALL remove an Artifacts install's repository, check runner, and their storage and tokens, and nothing else in the account.

#### Scenario: A shared account

- **WHEN** teardown runs in an account that holds other projects
- **THEN** only this install's resources are removed, and anything Cloudflare will not remove is named as left behind

### Requirement: GitHub installs are untouched

An install on the GitHub route SHALL keep its repository, checks, pull requests and publishing as they were.

#### Scenario: A GitHub install updates

- **WHEN** an installed GitHub repo takes this release
- **THEN** its saves, pull requests and publishing behave as before, and nothing asks it to move
