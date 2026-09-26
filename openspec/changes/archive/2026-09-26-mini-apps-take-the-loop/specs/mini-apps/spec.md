## ADDED Requirements

### Requirement: A mini app takes the same change loop as any change

A request for a new standalone page or small tool, or a change to one, SHALL take the full change loop, like any change to the repo's code: `/explore`'s question round when a decision is open, an OpenSpec change with a review page, `/apply` with its preview from the agent host, `/save` for a branch and a pull request, and `/ship` to archive and merge. The only thing that SHALL set a mini app apart is where its files live. No skill SHALL have a separate mini-app route, preview, save, or merge.

#### Scenario: A new tool with no verb

- **WHEN** the person asks "make me a tip calculator"
- **THEN** the agent plans it, ends with the review link, and asks whether to build it now
- **AND** on yes it builds `mini-apps/apps/tips/`, reports the preview from the agent host at `/apps/tips/`, and asks whether to publish it

#### Scenario: Publishing a mini app

- **WHEN** the person says to publish a mini app
- **THEN** `/ship` archives its change and merges its pull request on the gate, like any change
- **AND** production serves the app at `/apps/<name>/` after the merge deploys

#### Scenario: Saving a mini app

- **WHEN** the person saves a mini app mid-work
- **THEN** the save commits to the feature branch and updates the pull request
- **AND** nothing reaches the default branch or production

## MODIFIED Requirements

### Requirement: A mini app carries its own tests

A mini app's plan SHALL carry a task to write tests for its logic — its API handler and its scripts — in the app's own folder, runnable by Node's built-in test runner with no install. On a change that touches mini apps, CI SHALL run the tests of the changed mini apps only, in the required `test` check. No skill SHALL run a mini app's tests on the agent host as a condition of saving.

#### Scenario: Save an app with a failing test

- **WHEN** a pull request changes a mini app whose test fails
- **THEN** the `test` check fails and `/ship` can not merge it

#### Scenario: Only the changed app is tested

- **WHEN** a push changes `mini-apps/apps/tips/` and no other mini app
- **THEN** CI runs the tests under `mini-apps/apps/tips/` and no other suite

## REMOVED Requirements

### Requirement: A mini-app request builds without the full loop

**Reason**: A mini app now takes the same change loop as any change.
**Migration**: Ask for the app as usual; the agent plans it and asks *build it now?*

### Requirement: The mini-app preview comes from the agent host

**Reason**: Every completed `/apply` now uploads a preview from the agent host, as `apply-completion-handoff` defines, so a mini app needs no rule of its own.
**Migration**: None; open `/apps/<name>/` on the preview link that `/apply` reports.

### Requirement: A mini app saves straight to the default branch

**Reason**: Saving is a checkpoint for every change; only `/ship` puts work live.
**Migration**: Save a mini app like any change, then publish it through `/ship`.

### Requirement: A mini-app pull request merges through the short path

**Reason**: A mini app has an OpenSpec change like any change, so `/ship` archives and merges it through its normal steps.
**Migration**: Run `/ship` on the mini app's branch; it archives the change and merges.
