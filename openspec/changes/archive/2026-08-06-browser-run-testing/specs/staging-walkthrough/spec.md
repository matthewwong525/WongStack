# staging-walkthrough — delta

## MODIFIED Requirements

### Requirement: Adoption is detected from state, never configured

Within a stack-pack repo the walk SHALL be opt-in, and consent SHALL be inferred from observable repo state rather than from a flag: `playwright-core` — or `playwright`, so earlier adopters remain adopted — present in the app's `devDependencies` means this repo adopted the walkthrough. There SHALL be no manifest field, no config file, and no skill argument that enables or disables it. Adding the dependency SHALL be the entire opt-in: no browser install step exists, because the browser is remote.

The walkthrough SHALL NEVER install `playwright-core`, `playwright`, a browser, or any other dependency — not as a convenience, not on a prompt, not "while we're here." A missing dependency is a statement that the repo did not opt in, or (once it has) a condition to report, never a condition to fix.

#### Scenario: A repo that never opted in

- **WHEN** `/walk` is invoked in a repo whose app has neither `playwright-core` nor `playwright` as a devDependency
- **THEN** the verdict is `NONE` and the skill reports that the repo has not adopted the walkthrough
- **AND** nothing is installed and no other skill's behavior changes

#### Scenario: Adding the dependency is the whole opt-in

- **WHEN** a repo adds `playwright-core` to its app's `devDependencies` and installs its node modules
- **THEN** the next `/walk` walks with nothing else configured and no browser installed on the machine

#### Scenario: Earlier adopters stay adopted

- **WHEN** a repo that opted in under the old signal still has `playwright` (not `playwright-core`) in its `devDependencies`
- **THEN** the walk treats the repo as adopted and walks against the remote browser
- **AND** no migration of the dependency is required or prompted for

#### Scenario: The walkthrough never installs its own dependency

- **WHEN** the walk finds the dependency declared but its node modules not installed
- **THEN** it does not run any install command
- **AND** it reports the condition as a verdict rather than repairing it

## ADDED Requirements

### Requirement: The browser is remote, reached with the pack's credential

The walk SHALL drive a browser session on Cloudflare Browser Run, attached over CDP from the local runner (`connectOverCDP` against `wss://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/devtools/browser`, authenticated with `CLOUDFLARE_API_TOKEN` as a Bearer header). No browser binary SHALL be launched, required, or looked for on the machine running the walk. The journeys, the evidence directory, and the grading SHALL remain local and unchanged: only the browser process moves.

The runner SHALL open one Browser Run session per journey, so a session-duration limit bounds one journey's evidence rather than the walk, and concurrent-browser limits are never exceeded by a single walk.

Preflight SHALL verify the credential instead of a binary: once the dependency signals adoption, a missing `CLOUDFLARE_API_TOKEN`, an unresolvable account id, or an endpoint refusal (auth failure, plan limit) SHALL each produce `UNKNOWN` with the specific remedy named — the credentials page for a missing token, a `/wong-cloudflare` re-run for a token lacking the Browser Rendering permission, the plan's limits page when the daily browser budget is exhausted. None of these SHALL be reported as a failing application.

#### Scenario: No browser on the machine

- **WHEN** `/walk` runs on a machine with no Chromium installed anywhere
- **THEN** the walk proceeds normally against the remote browser
- **AND** preflight performs no browser-binary check

#### Scenario: Token missing

- **WHEN** the dependency signals adoption but `CLOUDFLARE_API_TOKEN` is empty or absent
- **THEN** the verdict is `UNKNOWN`, naming the token and pointing at where the credential convention documents it
- **AND** nothing is walked and nothing is installed

#### Scenario: Token lacks the Browser Rendering permission

- **WHEN** the endpoint answers the runner's connection with an authorization failure
- **THEN** the verdict is `UNKNOWN`, and the report names re-running `/wong-cloudflare` (whose widen grants the permission) as the fix
- **AND** the failure is reported as unrunnable infrastructure, never as a failing journey

#### Scenario: A session dies mid-walk

- **WHEN** a Browser Run session ends while a journey is in flight
- **THEN** that journey's evidence records the error and the remaining journeys run on fresh sessions
- **AND** one lost session does not cost the walk

#### Scenario: Video degrades honestly

- **WHEN** video recording is unavailable over the remote CDP attachment
- **THEN** the walk still runs, captures screenshots, and the evidence comment states that video was unavailable and why
- **AND** the absence of video does not change any verdict
