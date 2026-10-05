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

`/verify` SHALL read the change's scenarios and any relevant existing verification recipes before any push or credential check. When no deployed probe or existing CI capture route can reach any scenario, the verdict SHALL be `NONE` in one line, with no save, preflight, or browser. A known route that is blocked or lacks usable evidence SHALL remain unverified rather than count as absent.

#### Scenario: A library-only change

- **WHEN** a change's scenarios have no deployed surface or existing CI behavior capture route
- **THEN** the verdict is `NONE` and nothing is pushed or launched

#### Scenario: An existing CI route has no evidence

- **WHEN** a scenario has a configured CI behavior capture route but its evidence is missing
- **THEN** the check is unverified and the verdict is `UNKNOWN`, unless a failure or timeout takes precedence

### Requirement: The walk targets this commit's deployed preview

When there is something to verify, `/verify` SHALL bind evidence to the exact saved head revision, invoking `/save` only when current work is unsaved or unpushed. Deployed probes SHALL target the preview URL published for that revision through the applicable verified delivery route, never a guessed URL or naming pattern. CI behavior probes SHALL use captured evidence whose actual source revision and run identity match the revision being checked. Missing evidence for one surface SHALL block only dependent checks.

#### Scenario: Uncommitted work

- **WHEN** `/verify` runs with uncommitted work and a reachable scenario
- **THEN** `/save` runs first, and verification targets its saved revision and the discovered evidence for that revision

#### Scenario: CI does not deploy

- **WHEN** no preview URL exists for this commit and a scenario needs the deployed app
- **THEN** that scenario is unverified, no URL is guessed, and independent CI behavior checks can still complete

### Requirement: Each scenario gets the strongest probe

The walk SHALL cover the change's delta scenarios plus those of any capability the branch diff touches, and a narrow selection of existing consumer scenarios connected to changed behavior by a confirmed caller or data contract, not the whole spec set. Each scenario SHALL get the strongest available browser journey, request probe, state probe through an existing command, or behavior capture from an existing CI route. Its `WHEN` SHALL define the exercised behavior and its `THEN`, verbatim, SHALL remain the pass criterion. A recipe or green CI check SHALL NOT replace that criterion. A scenario no probe reaches SHALL be listed by name as unverified. Repository code SHALL NOT run on the agent's machine to supply missing evidence.

#### Scenario: An API scenario

- **WHEN** a scenario describes an endpoint's status and body with no UI
- **THEN** it gets a request probe, and the request and response are its evidence

#### Scenario: A scenario only local code could observe

- **WHEN** a scenario is observable only by running the repo's code locally and has no existing CI behavior capture route
- **THEN** it is not walked, and the report lists it by name as unverified

### Requirement: The evidence is graded against the THEN

Each journey SHALL pass only when its evidence shows what its `THEN` describes; a run with no error or a bare `200` SHALL NOT pass. A journey whose evidence shows some of its `THEN` and contradicts none SHALL be reported as partly shown, naming each part not shown and why, and SHALL NOT be reported as a plain pass; it does not change the walk's verdict. Ambiguous evidence SHALL remain unverified and be shown beside its `THEN` for the person to resolve after independent safe checks finish.

#### Scenario: A bare 200

- **WHEN** a request probe returns `200` with a body that does not show the `THEN`
- **THEN** the journey fails

#### Scenario: A part the preview cannot show

- **WHEN** a `THEN` promises a greeting that appears and is announced, and the evidence shows it appearing but nothing can show it announced
- **THEN** the journey is reported as partly shown, naming the announcement, and the walk's verdict is unchanged

#### Scenario: Ambiguity does not stop independent checks

- **WHEN** one journey's evidence is ambiguous and another journey can safely run independently
- **THEN** the independent journey completes before the person is asked to resolve the ambiguous evidence

### Requirement: The walk installs tools, never repo dependencies

The walk SHALL install the browser CLI and its browser on the machine, only when a browser journey needs them, and SHALL say what it installed. It SHALL add no dependency, lockfile change, or manifest to the repo, and SHALL ask before installing a language runtime.

#### Scenario: A machine without the browser

- **WHEN** a browser journey runs on a machine without the browser CLI
- **THEN** the walk installs it, reports the install, and the working tree is unchanged

### Requirement: The walk leaves the repo as it found it

Journeys and evidence SHALL live outside the working tree and SHALL be deleted on every exit, including a stop on `UNKNOWN` or a pause to ask. The one thing a walk MAY leave in the working tree is its kept checks, and only inside `/ship`. Cleanup SHALL refuse any path the walk did not create. The evidence SHALL be screenshots, captured requests, and command output, never a video.

#### Scenario: Any verdict

- **WHEN** a walk outside `/ship` ends, whatever its verdict
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

On `FAILURE`, `/verify` SHALL fix a failure in this change's own scope, save, rebuild staging from the seed under its turn, and walk again, at most twice, and SHALL report any other failure without fixing it; the report SHALL state the scope judgement. When an existing CI harness can cheaply reproduce an in-scope defect, the repair SHALL retain a focused regression check and evidence of that same check failing on the earlier source for the observed defect and passing on the repaired source. Where a lasting check is impractical, the report SHALL retain the available reproduction and explain the limitation without requiring new test infrastructure or weakening the delivery gate. A failure SHALL NOT prevent independent safe checks from completing. Additional consumer checks SHALL NOT expand repair authorization.

#### Scenario: An in-scope failure

- **WHEN** a journey contradicts its `THEN` in this change's own code
- **THEN** `/verify` fixes, saves, rebuilds staging, and walks again, stopping after two failed attempts; a practical existing test path produces a retained regression with failing-before and passing-after evidence, otherwise the reproduction's limitation is reported

#### Scenario: An out-of-scope failure

- **WHEN** a journey fails on behavior this change did not introduce
- **THEN** `/verify` reports the failure and finishes independent safe checks without a fix

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

The walkthrough page SHALL record the options declined and why: an in-repo test framework, a second judging agent, walking the whole spec set afresh, replaying kept checks on every walk, and walking on every `/save`. It SHALL also record why this browser engine was chosen and what replacing it costs.

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

### Requirement: Safe checks finish before a consolidated handoff

Within the requested scope, `/verify` SHALL complete every safe check possible with existing authorization and tools before asking for help. A blocked check SHALL pause only its dependents. The report SHALL distinguish completed, failed, partly shown, and unverified checks. Remaining checks SHALL form one consolidated handoff naming the reason, exact manual action or authorization needed, and expected observation, with options to help, skip selected checks, or skip all remaining checks. Skipped checks SHALL remain explicitly unverified and SHALL NOT be requested again unless the person reopens them. Skipping SHALL NOT imply authorization, erase an observed failure, or count as a pass. After the person helps, verification SHALL resume pending checks and repeat completed checks only when their conditions changed. Waiting or an unattended run SHALL NOT imply authorization.

#### Scenario: One check needs a person's login

- **WHEN** a login blocks one journey while other journeys need no person
- **THEN** those other journeys complete, and the final handoff names the blocked journey and how to enable or manually complete it

#### Scenario: Help enables the pending check

- **WHEN** the person supplies the requested authorization without changing completed checks' conditions
- **THEN** only the pending journey and its dependents resume

#### Scenario: The person skips remaining manual checks

- **WHEN** the person chooses to skip selected or all remaining checks
- **THEN** the report names those checks as skipped and unverified, retains observed failures and coverage gaps, and no further help is requested for them unless the person reopens them

### Requirement: Safe simulations explain their evidence limits

For checks that cannot be completed directly, `/verify` SHALL attempt the strongest safe simulation possible with existing authorization, tools, and deployed test surfaces before asking for help. Simulation SHALL preserve the same staging and external-system safety boundaries. Its report SHALL identify simulated evidence, claims it supports, and real behavior it does not prove. Simulated effects SHALL NOT count as proof of unobserved real effects. If no safe simulation exists, the check SHALL remain unverified with its limitation explained.

#### Scenario: A sandbox can simulate delivery

- **WHEN** actual delivery requires help but an existing safe sandbox can exercise the request and response
- **THEN** verification exercises the sandbox, labels the resulting evidence as simulated, and leaves actual delivery unverified with the option to help or skip it

#### Scenario: No safe simulation is available

- **WHEN** a remaining check has no safely accessible simulation
- **THEN** its limitation is reported without fabricated evidence or unsafe actions, and the person can help or skip the check

### Requirement: Verification preserves staging and external systems

Inside a staging environment whose every stateful binding is its own twin and whose database is not production's, verification MAY create, change, and delete any data without a prompt, without owning the records, and without cleanup: the next walk rebuilds staging. An outside service SHALL be exercised only when staging holds its own key for it, distinct from production's; a service whose staging key is production's, or whose destination cannot be established, SHALL NOT be triggered, and its checks SHALL remain unverified by name while independent checks continue. Production resources, access controls beyond already authorized repair, and paid resources SHALL still require explicit authorization. If staging's isolation cannot be established, mutating checks SHALL remain unverified.

#### Scenario: A disposable delete journey

- **WHEN** a delete scenario runs on an isolated staging environment
- **THEN** the journey deletes seeded records without a permission prompt and restores nothing afterwards

#### Scenario: Staging points at a real integration

- **WHEN** a staging journey would send a message through a service whose staging key is production's, or whose destination cannot be established
- **THEN** its trigger is not run, the report names the service and what a staging-only key would unlock, and independent checks still run

### Requirement: Reusable recipes guide capture without changing promises

Projects SHALL be able to retain verification recipes describing a feature's user entry point, capture route, prerequisites, isolation, and cleanup. A recipe SHALL refer to current scenarios rather than duplicate their expected behavior. Verification SHALL read recipes without editing the project; a missing recipe SHALL NOT disable the existing deployed probes. A recipe called proven SHALL have been exercised against the real feature with evidence retained through cleanup. Drift or product failures SHALL be reported honestly rather than silently changing the promise.

#### Scenario: A recipe is reused

- **WHEN** a later change checks a feature with a proven recipe
- **THEN** verification checks the recipe's references and prerequisites, uses its capture route, and grades against the current written scenario

#### Scenario: The described entry point has changed

- **WHEN** a recipe's source or scenario reference no longer exists
- **THEN** the affected check is unverified with the drift named, independent checks continue, and verification does not edit the recipe or weaken the expected behavior

### Requirement: CI behavior evidence proves an observation at an exact revision

CI behavior evidence SHALL identify the repository, actual source revision, run and attempt, capture route, exercised scenario, input and environment, command, and raw observed result. Evidence from another revision, an older superseded attempt, an unaccounted source checkout, or an incomplete or invalid capture SHALL NOT support a pass. A process exit code or suite status alone SHALL NOT prove a scenario. Downloaded artifacts SHALL be read as evidence and SHALL NOT execute code on the agent host. Existing credential scrubbing and owned-folder cleanup SHALL cover imported evidence.

#### Scenario: The command succeeds but the promised output is absent

- **WHEN** a valid CI capture shows a successful command whose raw output contradicts the scenario's expected result
- **THEN** verification reports the contradiction as a failure rather than treating CI success as proof

#### Scenario: An earlier attempt supplied a passing capture

- **WHEN** the current revision's newest run attempt lacks valid evidence but an older attempt has a passing capture
- **THEN** the check remains unverified and the older capture is not substituted

### Requirement: Before and after proof uses comparable observations

For an explicit fix or preservation claim, verification SHALL compare available observations from the named earlier revision and the changed revision using the same behavior, inputs, capture method, and relevant environment. The report SHALL identify both revisions, results, and comparison limitations. A head-only pass SHALL NOT prove an unobserved repair. New behavior absent from the earlier revision SHALL be judged from its head evidence with the absence stated. Relevant existing preservation scenarios SHALL be selected narrowly from the affected behavior, without a whole-app sweep.

#### Scenario: A fix has comparable evidence

- **WHEN** the same failing user action is captured on the earlier revision and succeeds as promised on the changed revision under comparable conditions
- **THEN** the report shows both observations and the observed improvement beside the written claim

#### Scenario: The earlier check used different inputs

- **WHEN** the earlier and changed captures use different inputs or incompatible capture methods
- **THEN** the comparison stays unverified, its limitation is named, and independently valid head observations remain in the report

### Requirement: Related consumers are checked through confirmed contracts

Verification SHALL examine the material assumptions connecting changed behavior to its consumers and select a small set of existing checks that can disprove them. Selected checks SHALL name the concrete caller or data-contract relationship and their canonical expected behavior, including consumers in another capability. Speculative relationships SHALL NOT justify a whole-app sweep. Missing expectations or unavailable observation routes SHALL be reported as coverage gaps rather than invented promises. An unrelated consumer failure SHALL remain outside repair scope.

#### Scenario: An API change feeds another screen

- **WHEN** a changed API field has a confirmed consumer in a screen covered by another capability
- **THEN** verification selects the relevant existing screen scenario, records the relationship, and reports what its evidence shows alongside the change's own checks

#### Scenario: A suspected consumer has no established relationship

- **WHEN** a possible consumer is suggested without a confirmed caller or data-contract relationship
- **THEN** verification does not expand the run on that speculation and retains the targeted selected checks

### Requirement: Lasting effects are observed after the initiating action

When a written expectation promises a persisted or externally consumed result, verification SHALL capture the initiating action and a fresh observation of the promised result through its real consumer. A success message, cached view, or producer self-report SHALL NOT establish that effect. A contradicted readback SHALL be a failure; unavailable readback SHALL retain the existing blocked or partly-shown evidence limits. Read-only promises SHALL NOT acquire invented persistence requirements. All follow-up observations SHALL preserve existing data and external-system safety boundaries.

#### Scenario: A save reports success but loses its value

- **WHEN** a save action reports success but a fresh read after reload shows that the promised stored value is missing or changed
- **THEN** verification reports failure with both observations, even though the initial action appeared successful

#### Scenario: An export survives independently

- **WHEN** a scenario promises an exported file and verification reads the resulting file's bytes independently of the export's success response
- **THEN** that readback is evidence for the promised file contents, with the initiating action and follow-up identified

### Requirement: A broader check reports all surfaces together

A run combining deployed and CI behavior probes SHALL issue one final report covering each scenario's written expectation, observed result, probe, environment and revision, comparisons, and remaining gaps. A missing preview SHALL NOT prevent a CI-only run. A blocked reachable probe SHALL remain unverified and SHALL affect the overall verdict under the existing five-verdict precedence. Head changes SHALL prevent evidence for the previous head being presented as verification of the new head.

#### Scenario: No preview but valid command-line evidence

- **WHEN** every selected scenario is a command-line check with valid CI behavior evidence for the saved head and no preview exists
- **THEN** verification grades that evidence and reports the result without requiring or inventing a preview

#### Scenario: One web check is blocked

- **WHEN** a selected web check lacks its preview while an independent command-line check has valid evidence
- **THEN** the command-line check completes and the report names the web check as unverified, with overall `UNKNOWN` unless failure or timeout takes precedence

### Requirement: A walk starts from the seed and holds a turn

Before its first deployed check, `/verify` SHALL take the repository's single staging turn and rebuild staging from the checked-in seed, so every walk starts from the same known data on its own revision's schema. Only one walk SHALL hold the turn at a time, across machines; the turn SHALL be given back on every exit and SHALL expire on its own when its holder vanishes. A walk that cannot get the turn or cannot rebuild staging within its budget SHALL leave its staging-dependent checks unverified, name why, and still finish checks that need no staging data. A repository with no disposable staging database SHALL walk as before, with no turn and no rebuild.

#### Scenario: Two walks at once

- **WHEN** a second walk starts while another holds the staging turn
- **THEN** it waits, then rebuilds staging and walks only after the first gives the turn back or the turn expires

#### Scenario: No turn in time

- **WHEN** the turn is still held when the walk's wait runs out
- **THEN** the staging-dependent checks are reported unverified with the reason, and CI-only checks still finish

### Requirement: Missing seed data is named

A scenario whose journey needs records the seed does not hold SHALL be created by the walk where the app's own screens allow it. Where they do not, the scenario SHALL be reported unverified, naming the missing sample data, and SHALL NOT count as a pass.

#### Scenario: A report page with nothing to show

- **WHEN** a scenario promises a list of past orders and the seed holds none the walk can create
- **THEN** the report names that scenario as unverified for lack of sample orders

### Requirement: A scheduled job is run by its manual trigger

For a scenario about work that runs on a schedule, `/verify` SHALL start that work through the project's manual trigger on staging and grade its result. Where the project offers no manual trigger, the scenario SHALL be unverified by name. The schedule's own timing SHALL stay partly shown.

#### Scenario: A nightly job

- **WHEN** a change's scenario promises a nightly summary and staging offers a manual trigger for it
- **THEN** the walk runs the job once on staging, grades the summary against the `THEN`, and reports the timetable as not checked

### Requirement: A saved revision is reused without another checkpoint

Verification of clean, already saved work SHALL use the existing exact-revision checkpoint, without another commit, push, record-only save or request to rerun settled checks. Reuse SHALL require matching local and authoritative remote revision and the applicable gate identity; a missing, foreign or unreadable identity SHALL remain unverified. A superseding run attempt SHALL NOT be concealed by an earlier pass. A fresh invocation SHALL still produce fresh walkthrough evidence; a cached verdict SHALL NOT replace it. A source repair SHALL invalidate dependent evidence and use the newly saved revision's checks, with unchanged independent checks retained only when their conditions remain valid.

#### Scenario: Ship has just saved the change

- **WHEN** `/ship` passes a current exact checkpoint and the selected work stays clean at the same authoritative remote head
- **THEN** `/verify` walks that revision without invoking `/save` again or restarting its settled checks

#### Scenario: An earlier passing result belongs to different work

- **WHEN** the local head, authoritative candidate, applicable run attempt or evidence revision does not match the passing result
- **THEN** the old result is not reused as proof of the current work and missing authoritative evidence remains unverified

### Requirement: A passed journey is kept as a replayable check

When a walk inside `/ship` grades a browser journey or a request probe as a pass, it SHALL keep a replayable check in the project, beside its verification recipes: the steps, what the passing evidence showed, and a reference to the scenario, never a copy of its `THEN`. A check SHALL be kept only after it replays unchanged, alone, on staging rebuilt from the seed. A journey that needs a person's login, triggers an outside service or a scheduled job, or whose steps hold a credential SHALL NOT be kept. A walk outside `/ship` SHALL keep none.

#### Scenario: A new promise passes

- **WHEN** the walk inside `/ship` passes a browser journey for a scenario that has no kept check
- **THEN** the project holds a kept check for that scenario after the publish, and it replays with no model call

#### Scenario: A recording that does not replay

- **WHEN** a passed journey's recording differs when replayed alone from the seed
- **THEN** it is not kept, the report names it, and the walk's verdict is unchanged

### Requirement: Kept checks replay before publishing without a model

The walk inside `/ship` SHALL replay the project's kept checks against the preview with no model call, within two minutes in total. Checks recorded against files the branch changed SHALL run first; the rest SHALL run in an order that differs between revisions, so every check is reached over time. A check that writes SHALL start from the seed. Every check that did not run SHALL be named with its reason and SHALL NOT count as a pass. Where staging was not rebuilt from the seed, nothing SHALL replay, the report SHALL say why, and the walk's verdict SHALL be unchanged. A walk outside `/ship` SHALL replay only when the person asks.

#### Scenario: More kept checks than the limit allows

- **WHEN** the project holds more kept checks than two minutes can replay
- **THEN** the checks for the areas the branch changed run first, the replay stops at the limit, and the report names each check that did not run

#### Scenario: A project with no disposable staging

- **WHEN** the walk inside `/ship` runs where staging can not be rebuilt from the seed
- **THEN** no kept check replays, the report says why, and the walk's verdict is what it would have been without kept checks

### Requirement: A changed replay gets one fresh walk

A kept check whose replay differs SHALL be walked fresh once and graded against its scenario's current `THEN`. A pass SHALL replace the kept check and leave the verdict unaffected. At most three kept checks SHALL be walked fresh in one walk; the rest SHALL be named unverified. A kept check whose scenario the change itself modifies SHALL NOT be replayed; the change's own walk SHALL replace it. A kept check whose scenario no longer exists SHALL be removed.

#### Scenario: A renamed button

- **WHEN** a replay differs because a control was renamed and the fresh walk shows the scenario's `THEN` still holds
- **THEN** the kept check is replaced with the new recording and the walk's verdict is unaffected

#### Scenario: The change rewrites the promise

- **WHEN** the change's own delta modifies a scenario that has a kept check
- **THEN** that check is not replayed, and the change's own passing walk replaces it

### Requirement: A change that breaks an older promise repairs it

When a fresh walk of a changed kept check contradicts its scenario's `THEN` and the cause plausibly lies in files the branch changed, the walk SHALL repair it without asking, under its existing bound of two attempts, and replay that check after each repair. A contradiction that survives the bound, or whose cause lies outside the branch's files, SHALL make the walk a `FAILURE` that names the older promise; the walk SHALL NOT edit code the branch did not change to repair it.

#### Scenario: The change broke an older feature

- **WHEN** the fresh walk contradicts an older scenario's `THEN` and the cause lies in files the branch changed
- **THEN** the walk repairs it, saves, and replays that check, and the report names the older promise and the repair

#### Scenario: A break the change did not cause

- **WHEN** the fresh walk contradicts an older scenario's `THEN` and the cause lies outside the branch's files
- **THEN** the walk is a `FAILURE` that names the older promise, with no repair
