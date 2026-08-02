## ADDED Requirements

### Requirement: Adoption is detected from state, never configured

The staging walkthrough SHALL be opt-in, and consent SHALL be inferred from observable repo state rather than from a flag: `playwright` present in the app's `devDependencies` means this repo adopted the walkthrough. There SHALL be no manifest field, no config file, and no skill argument that enables or disables it — following the Cloudflare Access precedent, where a capability is adopted by taking it and detected by what is there.

The walkthrough SHALL NEVER install `playwright`, a browser, or any other dependency — not as a convenience, not on a prompt, not "while we're here." A missing dependency is a statement that the repo did not opt in, or (once it has) a condition to report, never a condition to fix.

When `playwright` is absent, `/ship` SHALL behave exactly as it does without this change: no walk, no prompt, no warning, and no added latency.

#### Scenario: A repo that never opted in

- **WHEN** `/ship` runs in a repo whose app has no `playwright` devDependency
- **THEN** no walkthrough runs and `/ship` proceeds from CI-green directly to the merge
- **AND** no warning, prompt, or "consider installing" notice is emitted

#### Scenario: Installing playwright is the whole opt-in

- **WHEN** a repo adds `playwright` to its app's `devDependencies` and installs a browser
- **THEN** the next `/ship` runs the walkthrough with nothing else configured

#### Scenario: The walkthrough never installs its own dependency

- **WHEN** the walkthrough finds `playwright` declared but its browser binary missing
- **THEN** it does not download or install the browser
- **AND** it reports the condition as a verdict rather than repairing it

### Requirement: The walkthrough runs on /ship only, between CI-green and the merge

The walkthrough SHALL be a step of `/ship` positioned after the CI wait and before the merge. `/save`, `/apply`, and `/continue` SHALL NOT run it.

The position is load-bearing: CI green is what proves the branch's staging deploy published a version for this commit, so the walkthrough SHALL target the per-commit staging alias discovered by the existing preview-URL helper rather than a URL supplied by the user or assumed from a naming convention.

When the repo has no CI (`NONE`), the walkthrough SHALL still run if adopted — PR review being the gate does not remove the walk — but SHALL treat an undiscoverable preview URL as a condition to report rather than a URL to guess.

#### Scenario: Ordering relative to CI

- **WHEN** `/ship` runs in an adopted repo with CI configured
- **THEN** the walkthrough begins only after the checks report `SUCCESS`
- **AND** the merge happens only after the walkthrough returns a passing verdict

#### Scenario: The target URL is discovered, not configured

- **WHEN** the walkthrough needs a URL to walk
- **THEN** it uses the per-commit preview URL produced by the existing preview-URL helper for the current head SHA
- **AND** it does not ask the user for a URL or construct one from a worker-name convention

#### Scenario: Other verbs do not walk

- **WHEN** `/save` runs in an adopted repo
- **THEN** no walkthrough runs

### Requirement: Scenarios become journeys, scoped to the change

A scout SHALL derive the walkthrough's journeys from the change's own OpenSpec scenarios rather than from the application's routes or components. Its inputs SHALL be the delta specs under `openspec/changes/<slug>/specs/**`, plus the scenarios of any capability in `openspec/specs/` that the branch diff touches. The full synced spec surface SHALL NOT be walked — the walkthrough is acceptance for this change, not a regression suite whose cost grows with the app.

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

### Requirement: The walk is throwaway and saves nothing

Each journey SHALL be driven by a Playwright script generated for that run, written outside the repository working tree, and deleted when the run ends. The walkthrough SHALL NOT create a test suite, a `tests/` directory, a config file, committed fixtures, or any other artifact inside the repo, and SHALL leave the working tree unchanged.

The run SHALL capture a screenshot after each step and a video for each journey.

#### Scenario: Nothing lands in the repo

- **WHEN** a walkthrough completes, whatever its verdict
- **THEN** `git status` reports the same working tree as before it started
- **AND** no generated script, screenshot, or video remains under the repository root

#### Scenario: Evidence is captured per step and per journey

- **WHEN** a journey of four steps is walked
- **THEN** four screenshots and one video exist for that journey in the run's temporary directory

### Requirement: The verdict is graded against the written expectation

The pass or fail call for each journey SHALL be made by reading the captured evidence against the scenario's `THEN`. The judgement SHALL NOT rest on the absence of an exception, an HTTP status alone, or the agent's impression that the page "looks fine": a journey whose script completed without error but whose screenshots do not show what the `THEN` describes SHALL fail.

No second judging subagent is required. The external check is that the expectation was written by `/plan`, before the walk existed, for reasons unrelated to passing it.

Where the evidence is genuinely ambiguous, the walkthrough SHALL stop and ask the user, presenting the screenshot and the `THEN` side by side, rather than resolving the ambiguity in either direction on its own.

#### Scenario: A silent wrong result fails

- **WHEN** a journey's script completes with no error, but the screenshot shows no validation message where the scenario's `THEN` requires one
- **THEN** the journey fails

#### Scenario: Ambiguity is escalated, not resolved

- **WHEN** the captured evidence neither clearly satisfies nor clearly contradicts the scenario's `THEN`
- **THEN** the walkthrough stops and asks the user, showing the screenshot and the expectation
- **AND** it does not merge on its own judgement

### Requirement: The walkthrough gates the merge, with five verdicts

The walkthrough SHALL resolve to exactly one of five verdicts, reusing the vocabulary the check-waiting script already establishes, and each SHALL determine what happens to the merge:

- **NONE** — not adopted, or adopted with no browser-observable scenarios. Proceed to the merge. When not adopted this SHALL be silent; when adopted it SHALL be one line naming why there was nothing to walk.
- **SUCCESS** — every journey satisfied its `THEN`. Proceed to the merge.
- **FAILURE** — at least one journey contradicted its `THEN`. Do not merge; enter recovery.
- **UNKNOWN** — the walk could not run or could not be trusted: the browser is missing, the preview URL is undiscoverable, staging is unreachable, or the walk landed on a Cloudflare Access challenge page. **Do not merge**, and stop.
- **TIMEOUT** — the walk did not finish in its budget. Do not merge; report and stop.

`UNKNOWN` SHALL NOT be treated as `NONE`. Once a repo has adopted the walkthrough, a walk that cannot run is unverified rather than absent — the same distinction `/ship` already draws for an unaskable CI check.

#### Scenario: Adopted but nothing to walk

- **WHEN** the scout finds no browser-observable scenarios in an adopted repo
- **THEN** the verdict is `NONE`, one line explains why, and the merge proceeds

#### Scenario: A blocked walk does not merge

- **WHEN** the preview URL cannot be discovered, or the browser binary is missing, in an adopted repo
- **THEN** the verdict is `UNKNOWN` and `/ship` stops without merging

#### Scenario: An Access challenge is not a page

- **WHEN** a walk against an Access-protected preview receives the Access login interstitial
- **THEN** the verdict is `UNKNOWN` rather than a passing or failing journey
- **AND** the report names the missing service-token credentials as the likely cause

### Requirement: Failure resets staging, then re-walks under the existing cap

On `FAILURE`, `/ship` SHALL reset the staging database using the stack pack's existing staging reset command before retrying, so the retry begins from the seeded fixture rather than from the partial state the failed walk left behind. The reset SHALL run only on failure — a passing walk's data SHALL be left in place, staging being a fixture database rather than a preserved one.

`/ship` SHALL then fix, repush, re-wait for CI, and re-walk. These attempts SHALL share `/ship`'s existing cap of 3 rather than introducing a second independent budget, and `/ship` SHALL never merge on a red walk.

#### Scenario: Reset precedes the retry

- **WHEN** a journey fails and `/ship` prepares to retry
- **THEN** the staging reset command runs before the fix is walked again

#### Scenario: A passing walk leaves its data

- **WHEN** a walkthrough returns `SUCCESS` after journeys that created and deleted records
- **THEN** no reset runs

#### Scenario: Destructive journeys are walked

- **WHEN** a scenario describes deleting a record
- **THEN** the scout includes it as a journey rather than skipping it as unsafe

#### Scenario: One shared attempt budget

- **WHEN** CI failures and walkthrough failures both occur across a single `/ship`
- **THEN** the total fix-and-repush attempts do not exceed the existing cap of 3

### Requirement: Evidence is reported as a PR comment that degrades honestly

The walkthrough SHALL post its result as a comment on the pull request: each journey, its steps, its verdict, and the scenario's `THEN` it was judged against. The written record SHALL be complete on its own, independent of whether any media renders.

Media SHALL be linked when a public host is configured — an optional public object-storage bucket — and referenced by local path when one is not. The absence of a media host SHALL NOT be reported as a failure or a degraded run.

The report SHALL NOT claim inline video playback. Only GitHub's browser-upload attachment path renders video inline, and it is unreachable from the command line; a hosted video SHALL be presented as a link.

#### Scenario: Comment without a media host

- **WHEN** an adopted repo with no configured media host completes a walkthrough
- **THEN** the PR comment contains the journeys, steps, and verdicts in full
- **AND** media is referenced by local path, with no failure reported for the missing host

#### Scenario: Comment with a media host

- **WHEN** a public bucket is configured
- **THEN** screenshots render inline in the comment and each journey's video appears as a link

### Requirement: Adoption is recommended and documented, never forced

A runbook SHALL ship in the payload's stack section covering what the walkthrough needs, in rungs that each degrade to the one below: the `playwright` install; the Access service-token headers when the repo is Access-protected; and the optional public bucket for inline media. It SHALL state the prerequisite that `schema/seed.sql` hold enough rows for the app to be exercisable, and SHALL record the deliberately declined options — running on `/save`, a saved test suite, a second judging agent, and walking the full spec surface — so they are not re-litigated.

Onboarding and sync SHALL be able to offer the capability the way the stack pack itself is offered, and declining SHALL leave `/ship` unchanged.

#### Scenario: Declining changes nothing

- **WHEN** a repo is offered the walkthrough and declines
- **THEN** no file is written and `/ship` behaves as before

#### Scenario: The runbook records what was declined

- **WHEN** a reader asks why the walkthrough does not run on every `/save`
- **THEN** the runbook states the decision and its reason
