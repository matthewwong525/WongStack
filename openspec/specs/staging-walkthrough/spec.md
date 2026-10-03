# staging-walkthrough Specification

## Purpose

`/verify` exercises a change's own OpenSpec scenarios against its deployed preview, each with the strongest probe that can observe it, grades the evidence against each scenario's `THEN`, and posts it on the pull request. It works in any repo on any stack, leaves the repo untouched, and gates nothing on its own run.

## Requirements

### Requirement: Verify is a verb that gates nothing

The walk SHALL run only when a person invokes `/verify`, or once inside `/ship` as evidence before the merge; `/save`, `/apply`, and `/continue` SHALL NOT walk. `/verify` SHALL run at any point in a change and any number of times, and its own run SHALL block, delay, or condition nothing. What a failed walk does inside `/ship` SHALL be `delivery-gate`'s rule, not this one.

#### Scenario: A failing walk

- **WHEN** a walk that a person invoked returns `FAILURE`
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

Each journey SHALL pass only when its evidence shows what its `THEN` describes; a run with no error or a bare `200` SHALL NOT pass. A journey whose evidence shows some of its `THEN` and contradicts none SHALL be reported as partly shown, naming each part not shown and why, and SHALL NOT be reported as a plain pass; it does not change the walk's verdict. When the evidence is ambiguous, the walk SHALL stop and ask the person, showing the evidence beside the `THEN`.

#### Scenario: A bare 200

- **WHEN** a request probe returns `200` with a body that does not show the `THEN`
- **THEN** the journey fails

#### Scenario: A part the preview cannot show

- **WHEN** a `THEN` promises a greeting that appears and is announced, and the evidence shows it appearing but nothing can show it announced
- **THEN** the journey is reported as partly shown, naming the announcement, and the walk's verdict is unchanged

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

Each `/verify` SHALL post one new pull-request comment, whatever its verdict, covering each journey's probe, steps, `THEN`, and verdict, where the probes ran, and each unverified scenario by name. A repeat SHALL add a comment, never edit one. Screenshots that were kept SHALL be linked from the comment, and when none were kept the comment SHALL say so and why. The comment SHALL NOT cite a local path the walk deletes.

#### Scenario: A walk that could not run

- **WHEN** a walk returns `UNKNOWN`
- **THEN** a comment says the change was not verified, and why

#### Scenario: Two walks

- **WHEN** `/verify` runs twice on one pull request
- **THEN** two comments exist, in order, and the first is unchanged

#### Scenario: A walk whose pictures were not kept

- **WHEN** a browser journey passes on a repo whose store has no bucket
- **THEN** the comment says the pictures were not kept and why, and names no local file

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

### Requirement: The walk shows its screenshots in the chat

While grading a browser journey, `/verify` SHALL show that journey's screenshots in the chat, in walk order, each with a line saying what it shows, as well as posting them with the evidence.

#### Scenario: A two-step journey

- **WHEN** `/verify` grades a journey that took screenshots of a form and its result
- **THEN** both pictures appear in the chat before the verdict, in that order

### Requirement: A plain check needs no change

When a person asks `/verify` for a check with no change's scenarios behind it, such as a screenshot of a page, a request to an address, or a walk through the app, `/verify` SHALL run it against the address the person names, else this commit's deployed preview. It SHALL show the evidence in the chat, post no pull-request comment unless asked, and follow the same limits as a change's walk: no local execution, no repo dependency, and a working tree left as it found it.

#### Scenario: A screenshot of a named page

- **WHEN** a person asks `/verify` to screenshot a page at an address they give
- **THEN** the screenshot appears in the chat, no comment is posted, and the working tree is unchanged

#### Scenario: A walk with no address given

- **WHEN** a person asks `/verify` to click through the app and names no address
- **THEN** the walk runs on this commit's deployed preview, and a missing preview is reported as not checked

### Requirement: Evidence carries no credential

Before a walk's evidence or comment is posted or uploaded, known credential values and token-shaped strings in its text SHALL be replaced with a placeholder, and the report SHALL say that a value was removed. A credential value SHALL NOT be printed while doing so.

#### Scenario: A journey captures request details

- **WHEN** a journey's evidence holds the Access service token the walk itself sent
- **THEN** the posted comment and the kept evidence hold a placeholder in its place, and the report says a value was removed

### Requirement: A grading change is measured first

The source repo SHALL keep a practice site with planted mistakes whose answers the walking agent cannot read. A change to how the walk writes journeys or grades evidence SHALL report, before and after, the planted mistakes caught, the planted mistakes passed, and the working promises failed. The practice site and its runs SHALL NOT ship to installed repos or run on every push.

#### Scenario: A grading instruction changes

- **WHEN** a change edits how the walk grades evidence
- **THEN** its record holds the caught, passed, and false-alarm counts for the instructions before and after

#### Scenario: A walk that passes everything

- **WHEN** a walking agent grades every practice promise as a pass
- **THEN** the report shows every planted mistake as missed

### Requirement: A walk's screenshots are kept privately

With a memory bucket and a login on the app, a walk SHALL keep its screenshots in the repo's private store with no expiry, and the comment SHALL carry one link per screenshot. A link SHALL open only for a caller the app's login accepts, and SHALL never show a transcript or any other object in the store. Only the walk's own machine credential SHALL add a screenshot, and a kept screenshot SHALL NOT be replaced. Keeping screenshots SHALL need no setting and no setup step beyond the memory bucket and the login.

#### Scenario: A reviewer opens a picture

- **WHEN** a person logged in to the app opens a screenshot's link from the comment
- **THEN** the picture shows

#### Scenario: A caller with no login

- **WHEN** a request with no accepted login asks for a kept screenshot, or for a transcript's path through the picture address
- **THEN** nothing from the store is returned

### Requirement: A walk says when its pictures were not kept

When a walk's screenshots cannot be kept privately, `/verify` SHALL say so in the chat and in the comment, with the reason in plain words: no bucket on the store, no login on the app, the production site not yet serving pictures, or no machine credential. It SHALL NOT keep them anywhere a person with no login can reach, and the missing pictures SHALL NOT change the verdict.

#### Scenario: No payment method on the Cloudflare account

- **WHEN** a walk passes on a repo whose Cloudflare account has no R2
- **THEN** the verdict is unchanged, and the chat and the comment say the pictures were not kept because the account has no storage

#### Scenario: Storage but an open site

- **WHEN** a walk passes on a repo with a bucket whose app has no login yet
- **THEN** no screenshot is stored, and the report says pictures are kept once the site has a login

### Requirement: A past walk's pictures can be shown in the chat

When a person asks for the pictures of a past walk on a pull request, `/verify` SHALL show that walk's kept screenshots in the chat, each with a line saying what it shows, and SHALL leave nothing on the machine afterwards. When that walk kept none, it SHALL say so.

#### Scenario: Pictures from last week's walk

- **WHEN** a person asks for the pictures from the walk on a pull request merged last week
- **THEN** each kept screenshot from that walk's comment appears in the chat, and the working tree is unchanged

### Requirement: A public media bucket keeps working

An install that sets `WALK_MEDIA_BUCKET` and `WALK_MEDIA_BASE_URL` SHALL keep publishing screenshots to that bucket and showing them inline in the comment, under those names.

#### Scenario: An install with a public bucket updates

- **WHEN** a repo with both `WALK_MEDIA_` variables set takes this update and runs a walk
- **THEN** its comment shows the screenshots inline from the public bucket, as before
