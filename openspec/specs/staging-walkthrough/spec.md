# staging-walkthrough Specification

## Purpose

The opt-in staging walkthrough, reached by invoking `/walk`: the change's own OpenSpec scenarios driven through a real browser against the deployed preview and graded against their written `THEN`. Covers how consent is detected from repo state, the `/save`-first ordering that makes a per-commit preview URL exist, how scenarios become browser journeys, what the walk captures, how it is graded, the five verdicts as *reports* rather than gates, failure recovery and reseeding, and where the evidence lands. It gates nothing: `/ship` merges on CI-green alone and never consults a walk.

## Requirements

### Requirement: The walkthrough is a user-invoked verb

The staging walkthrough SHALL be reached only by invoking `/walk`. No other skill SHALL run it: `/ship`, `/save`, `/apply`, and `/continue` SHALL NOT walk, prompt to walk, or warn that a walk did not happen.

`/walk` SHALL be invocable at any point in a change's life and any number of times, rather than only at merge time. Nothing in the skill SHALL limit how often it runs or treat a repeated invocation as an error.

`/walk` SHALL be part of the opt-in stack pack, gated the same way `/wong-cloudflare` is: a repo whose `.claude/.wong-stack.json` does not have `components.stackPack: true` SHALL never receive the skill.

#### Scenario: Shipping does not walk

- **WHEN** `/ship` runs in a repo that adopted the walkthrough
- **THEN** no walk runs, no walk verdict is produced, and the merge proceeds on CI-green alone
- **AND** no warning or nudge about the absent walk is emitted

#### Scenario: Walking repeatedly is normal

- **WHEN** `/walk` is invoked three times across one change
- **THEN** each invocation performs a full walk and reports its own verdict
- **AND** no invocation is refused or flagged for repetition

#### Scenario: Mid-change walking

- **WHEN** `/walk` is invoked on a branch whose `tasks.md` still has unchecked tasks
- **THEN** the walk runs against whatever is deployed for the current commit
- **AND** the incomplete state of the change is not treated as an error

### Requirement: /walk begins by invoking /save

`/walk` SHALL invoke `/save` before walking, so the commit under test is pushed, CI has run, and the per-commit preview URL exists. `/walk` SHALL NOT implement any git action itself — it delegates, as `/apply` does when it hands completed work to `/save`.

The walk SHALL target the per-commit preview alias discovered by the existing preview-URL helper for the current head SHA. It SHALL NOT ask the user for a URL, and SHALL NOT construct one from a worker-name convention: a hand-built URL can address a commit that was never deployed and still answer `200`.

When `/save` reports that CI is absent (`NONE`), `/walk` SHALL still proceed if a preview URL can be discovered, and SHALL treat an undiscoverable URL as a condition to report rather than a URL to guess.

#### Scenario: Save runs first

- **WHEN** `/walk` is invoked on a branch with uncommitted work
- **THEN** `/save` runs first — committing, pushing, waiting for CI, and resolving the preview URL
- **AND** the walk targets the URL that `/save` resolved

#### Scenario: The target URL is discovered, not configured

- **WHEN** the walk needs a URL
- **THEN** it uses the per-commit preview URL produced by the preview-URL helper for the current head SHA
- **AND** it neither prompts for a URL nor derives one from a naming convention

#### Scenario: No discoverable preview URL

- **WHEN** the repo's CI does not deploy, so no preview URL exists for this commit
- **THEN** the verdict is `UNKNOWN` and the report names the missing deployment as the cause
- **AND** no URL is guessed

### Requirement: Adoption is detected from state, never configured

Within a stack-pack repo the walk SHALL be opt-in, and consent SHALL be inferred from observable repo state rather than from a flag: `playwright` present in the app's `devDependencies` means this repo adopted the walkthrough. There SHALL be no manifest field, no config file, and no skill argument that enables or disables it.

The walkthrough SHALL NEVER install `playwright`, a browser, or any other dependency — not as a convenience, not on a prompt, not "while we're here." A missing dependency is a statement that the repo did not opt in, or (once it has) a condition to report, never a condition to fix.

#### Scenario: A repo that never opted in

- **WHEN** `/walk` is invoked in a repo whose app has no `playwright` devDependency
- **THEN** the verdict is `NONE` and the skill reports that the repo has not adopted the walkthrough
- **AND** nothing is installed and no other skill's behavior changes

#### Scenario: Installing playwright is the whole opt-in

- **WHEN** a repo adds `playwright` to its app's `devDependencies` and installs a browser
- **THEN** the next `/walk` walks with nothing else configured

#### Scenario: The walkthrough never installs its own dependency

- **WHEN** the walk finds `playwright` declared but its browser binary missing
- **THEN** it does not download or install the browser
- **AND** it reports the condition as a verdict rather than repairing it

### Requirement: Scenarios become journeys, scoped to the change

A scout SHALL derive the journeys from the change's own OpenSpec scenarios rather than from the application's routes or components. Its inputs SHALL be the delta specs under `openspec/changes/<slug>/specs/**`, plus the scenarios of any capability in `openspec/specs/` that the branch diff touches. The full synced spec surface SHALL NOT be walked — the walk is acceptance for this change, not a regression suite whose cost grows with the app.

The scout SHALL keep only scenarios observable through a browser against an HTTP-serving preview. Scenarios whose behavior lives outside the request path — queue consumers, cron triggers, alarms — SHALL be excluded, because a version alias serves HTTP only.

Each journey SHALL carry the scenario's `WHEN` as its steps and the scenario's `THEN`, verbatim, as its pass criterion.

#### Scenario: Scope is the change plus what the diff touches

- **WHEN** the scout runs on a change with delta specs for one capability, whose diff also edits files covered by a second capability's spec
- **THEN** the journeys cover the delta scenarios and the second capability's scenarios
- **AND** capabilities unrelated to both are not walked

#### Scenario: Non-browser scenarios are excluded

- **WHEN** a change's scenarios describe a queue consumer's behavior
- **THEN** the scout excludes them from the journeys and records why

#### Scenario: The pass criterion is the scenario's own words

- **WHEN** a journey is built from a scenario
- **THEN** its expected outcome is the scenario's `THEN` text, not a restatement invented by the scout

#### Scenario: Destructive journeys are walked

- **WHEN** a scenario describes deleting a record
- **THEN** the scout includes it as a journey rather than skipping it as unsafe

### Requirement: The walk is throwaway and saves nothing

Each journey SHALL be driven by a Playwright script generated for that run, written outside the repository working tree, and deleted when the run ends. The walk SHALL NOT create a test suite, a `tests/` directory, a config file, committed fixtures, or any other artifact inside the repo, and SHALL leave the working tree unchanged.

The run SHALL capture a screenshot after each step and a video for each journey. The generated scripts SHALL contain no assertions — their job is to produce evidence, not to decide.

Cleanup SHALL run on every exit path, including when the skill stops on `UNKNOWN` or pauses to ask the user a question.

#### Scenario: Nothing lands in the repo

- **WHEN** a walk completes, whatever its verdict
- **THEN** `git status` reports the same working tree as the walk started from
- **AND** no generated script, screenshot, or video remains under the repository root

#### Scenario: Evidence is captured per step and per journey

- **WHEN** a journey of four steps is walked
- **THEN** four screenshots and one video exist for that journey in the run's temporary directory

#### Scenario: Cleanup on an aborted walk

- **WHEN** a walk stops early on `UNKNOWN`
- **THEN** the temporary run directory is still removed

### Requirement: The verdict is graded against the written expectation

The pass or fail call for each journey SHALL be made by reading the captured evidence against the scenario's `THEN`. The judgement SHALL NOT rest on the absence of an exception, an HTTP status alone, or the agent's impression that the page "looks fine": a journey whose script completed without error but whose screenshots do not show what the `THEN` describes SHALL fail.

No second judging subagent is required. The external check is that the expectation was written by `/plan`, before the walk existed, for reasons unrelated to passing it.

Where the evidence is genuinely ambiguous, the walk SHALL stop and ask the user, presenting the screenshot and the `THEN` side by side, rather than resolving the ambiguity in either direction on its own.

#### Scenario: A silent wrong result fails

- **WHEN** a journey's script completes with no error, but the screenshot shows no validation message where the scenario's `THEN` requires one
- **THEN** the journey fails

#### Scenario: Ambiguity is escalated, not resolved

- **WHEN** the captured evidence neither clearly satisfies nor clearly contradicts the scenario's `THEN`
- **THEN** the walk stops and asks the user, showing the screenshot and the expectation
- **AND** it does not resolve the ambiguity on its own judgement

### Requirement: Verdicts report, and gate nothing

The walk SHALL resolve to exactly one of five verdicts — `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`, `TIMEOUT` — and each SHALL be reported to the user and on the pull request. **No verdict SHALL block, delay, or condition a merge**, because `/walk` performs no merge and no other skill consults its result.

- **NONE** — not adopted, or adopted with no browser-observable scenarios. Report which, in one line.
- **SUCCESS** — every journey satisfied its `THEN`.
- **FAILURE** — at least one journey contradicted its `THEN`.
- **UNKNOWN** — the walk could not run or could not be trusted: the browser is missing, the preview URL is undiscoverable, staging is unreachable, or the walk landed on a Cloudflare Access challenge page.
- **TIMEOUT** — the walk did not finish in its budget.

`UNKNOWN` SHALL NOT be reported as `NONE`. Once a repo has adopted the walkthrough, a walk that cannot run is **unverified** rather than **absent**, and the report SHALL say so in those terms. This distinction SHALL survive as reporting honesty even though it no longer gates anything: an Access challenge screenshotted and described as "a page rendered" would convert an unchecked assumption into a checked-looking one, which is the failure mode the distinction exists to prevent.

#### Scenario: A failing walk blocks nothing

- **WHEN** a walk returns `FAILURE`
- **THEN** the failure is reported and posted, and the skill stops
- **AND** no merge, push, or other skill is prevented from running afterwards

#### Scenario: Adopted but nothing to walk

- **WHEN** the scout finds no browser-observable scenarios in an adopted repo
- **THEN** the verdict is `NONE` and one line explains why there was nothing to walk

#### Scenario: An Access challenge is not a page

- **WHEN** a walk against an Access-protected preview receives the Access login interstitial
- **THEN** the verdict is `UNKNOWN` rather than a passing or failing journey
- **AND** the report names the missing service-token credentials as the likely cause

#### Scenario: Unverified is reported as unverified

- **WHEN** an adopted repo's walk cannot run because the browser binary is missing
- **THEN** the verdict is `UNKNOWN` and the report states the walk was not verified
- **AND** it is not described as "nothing to walk"

### Requirement: A failed walk resets staging, then stops

On `FAILURE`, `/walk` SHALL reset the staging database using the stack pack's existing staging reset command, then stop. The reset SHALL run only on failure — a passing walk's data SHALL be left in place, staging being a fixture database rather than a preserved one.

The reset guarantees that the next walk begins from the seeded fixture rather than from the partial state a failed walk left behind, because a retry against half-mutated data produces a different failure and sends the reader after leftovers instead of the bug.

`/walk` SHALL NOT fix, re-push, or re-walk automatically, and SHALL NOT carry a retry budget. The user fixes and invokes `/walk` again.

#### Scenario: Reset follows a failure

- **WHEN** a journey fails
- **THEN** the staging reset command runs before the skill stops

#### Scenario: A passing walk leaves its data

- **WHEN** a walk returns `SUCCESS` after journeys that created and deleted records
- **THEN** no reset runs

#### Scenario: No automatic retry

- **WHEN** a walk returns `FAILURE`
- **THEN** the skill does not attempt a fix, a re-push, or a second walk
- **AND** it reports what failed and what the user should look at

### Requirement: Evidence is posted on every verdict and degrades honestly

`/walk` SHALL post its result as a comment on the pull request on **every** verdict, including `FAILURE`, `UNKNOWN`, and `TIMEOUT` — not only on success. A failed walk's screenshots are the most useful evidence the walk can produce, and there is no merge being blocked that would otherwise carry the news.

Each comment SHALL cover each journey, its steps, its verdict, and the scenario's `THEN` it was judged against. The written record SHALL be complete on its own, independent of whether any media renders.

One comment SHALL be posted per `/walk` invocation. Repeated invocations SHALL post additional comments rather than editing or replacing earlier ones, so the pull request carries a truthful log of attempts.

Media SHALL be linked when a public object-storage host is configured and referenced by local path when one is not. The absence of a media host SHALL NOT be reported as a failure or a degraded run. The report SHALL NOT claim inline video playback — only GitHub's browser-upload attachment path renders video inline and it is unreachable from the command line, so a hosted video SHALL be presented as a link.

#### Scenario: A failed walk still posts

- **WHEN** a walk returns `FAILURE`
- **THEN** a PR comment is posted containing the failing journey, its steps, its `THEN`, and its screenshots

#### Scenario: An un-runnable walk still posts

- **WHEN** a walk returns `UNKNOWN` because the preview URL could not be discovered
- **THEN** a PR comment is posted stating that the walk was not verified and why

#### Scenario: Repeated walks append

- **WHEN** `/walk` is invoked twice on the same pull request
- **THEN** two comments exist, in invocation order
- **AND** the first is not edited or deleted

#### Scenario: Comment without a media host

- **WHEN** an adopted repo with no configured media host completes a walk
- **THEN** the comment contains the journeys, steps, and verdicts in full
- **AND** media is referenced by local path, with no failure reported for the missing host

#### Scenario: Comment with a media host

- **WHEN** a public bucket is configured
- **THEN** screenshots render inline in the comment and each journey's video appears as a link

### Requirement: Adoption is recommended and documented, never forced

A runbook SHALL ship in the payload's stack section covering what the walk needs, in rungs that each degrade to the one below: the `playwright` install; the Access service-token headers when the repo is Access-protected; and the optional public bucket for inline media. It SHALL state the prerequisite that `schema/seed.sql` hold enough rows for the app to be exercisable.

The runbook SHALL record the deliberately declined options so they are not re-litigated: a saved test suite, a second judging agent, walking the full spec surface, and walking automatically on every push. It SHALL state that `/walk` invokes `/save` as its first step and why, distinguishing that from the declined option of walking automatically whenever `/save` runs.

Onboarding and sync SHALL be able to offer the capability the way the stack pack itself is offered, and declining SHALL leave every other skill unchanged.

#### Scenario: Declining changes nothing

- **WHEN** a repo is offered the walkthrough and declines
- **THEN** no file is written and no other skill's behavior changes

#### Scenario: The runbook records what was declined

- **WHEN** a reader asks why the walk does not run automatically on every `/save`
- **THEN** the runbook states the decision and its reason
- **AND** distinguishes it from `/walk`'s own `/save`-first step
