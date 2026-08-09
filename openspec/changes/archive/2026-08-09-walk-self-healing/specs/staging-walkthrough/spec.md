# staging-walkthrough — delta for walk-self-healing

## MODIFIED Requirements

### Requirement: /walk begins by invoking /save

`/walk` SHALL scout the change's scenarios into candidate journeys **before** invoking `/save` and before any credential preflight. The scout reads only local files (the change's delta specs and any touched synced specs), so it costs no push, no CI wait, and no API call. When the scout finds no browser-observable scenario, the verdict SHALL be `NONE`, reported in one line, and `/save`, preflight, and every remote step SHALL be skipped.

When at least one journey exists, `/walk` SHALL invoke `/save` before walking, so the commit under test is pushed, CI has run, and the per-commit preview URL exists. `/walk` SHALL NOT implement any git action itself — it delegates, as `/apply` does when it hands completed work to `/save`. Because the scout reads the same working tree that `/save` then commits, the journeys and the deployed commit SHALL describe the same change.

The walk SHALL target the per-commit preview alias discovered by the existing preview-URL helper for the current head SHA. It SHALL NOT ask the user for a URL, and SHALL NOT construct one from a worker-name convention: a hand-built URL can address a commit that was never deployed and still answer `200`.

When `/save` reports that CI is absent (`NONE`), `/walk` SHALL still proceed if a preview URL can be discovered, and SHALL treat an undiscoverable URL as a condition to report rather than a URL to guess.

#### Scenario: Nothing browser-observable costs nothing

- **WHEN** `/walk` is invoked on a change whose scenarios all live off the request path (queue consumers, cron, pure backend)
- **THEN** the scout returns no journeys and the verdict is `NONE` with a one-line explanation
- **AND** no `/save`, no credential preflight, and no Browser Run session occurs

#### Scenario: Save runs first when there is something to walk

- **WHEN** `/walk` is invoked on a branch with uncommitted work and at least one browser-observable scenario
- **THEN** the scout runs, then `/save` runs — committing, pushing, waiting for CI, and resolving the preview URL
- **AND** the walk targets the URL that `/save` resolved

#### Scenario: The target URL is discovered, not configured

- **WHEN** the walk needs a URL
- **THEN** it uses the per-commit preview URL produced by the preview-URL helper for the current head SHA
- **AND** it neither prompts for a URL nor derives one from a naming convention

#### Scenario: No discoverable preview URL

- **WHEN** the repo's CI does not deploy, so no preview URL exists for this commit
- **THEN** the verdict is `UNKNOWN` and the report names the missing deployment as the cause
- **AND** no URL is guessed

### Requirement: The browser is remote, reached with the pack's credential

The walk SHALL drive a browser session on Cloudflare Browser Run, attached over CDP from the local runner (`connectOverCDP` against `wss://api.cloudflare.com/client/v4/accounts/{account_id}/browser-rendering/devtools/browser`, authenticated with `CLOUDFLARE_API_TOKEN` as a Bearer header). No browser binary SHALL be launched, required, or looked for on the machine running the walk. The journeys, the evidence directory, and the grading SHALL remain local and unchanged: only the browser process moves.

The runner SHALL open one Browser Run session per journey, so a session-duration limit bounds one journey's evidence rather than the walk, and concurrent-browser limits are never exceeded by a single walk.

Preflight SHALL verify the credential instead of a binary: once the dependency signals adoption, a missing `CLOUDFLARE_API_TOKEN`, an unresolvable account id, or a plan-limit refusal SHALL each produce `UNKNOWN` with the specific remedy named — the credentials page for a missing token, the plan's limits page when the daily browser budget is exhausted. None of these SHALL be reported as a failing application.

When the endpoint refuses the token with an authorization failure (the token was never widened into Browser Rendering Edit), `/walk` SHALL heal itself once: it SHALL follow the recorded widen protocol under the same standing authorization `/wong-cloudflare` uses — resolve the permission group by name, `PUT` the widened set preserving existing groups, re-verify — then retry the walk, and SHALL report which permission it granted. A refusal that survives the widen, or a widen the token cannot perform, SHALL produce `UNKNOWN` naming what was attempted and what still failed. There SHALL be exactly one widen-and-retry per invocation.

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
- **THEN** `/walk` performs the widen protocol itself, reports the permission it granted, and retries the walk once
- **AND** the heal is reported as infrastructure repair, never as a failing journey

#### Scenario: The widen does not take

- **WHEN** the widen fails or the endpoint still refuses after the single retry
- **THEN** the verdict is `UNKNOWN`, naming the attempted widen and the surviving refusal
- **AND** no second widen or retry is attempted in this invocation

#### Scenario: A session dies mid-walk

- **WHEN** a Browser Run session ends while a journey is in flight
- **THEN** that journey's evidence records the error and the remaining journeys run on fresh sessions
- **AND** one lost session does not cost the walk

#### Scenario: Video degrades honestly

- **WHEN** video recording is unavailable over the remote CDP attachment
- **THEN** the walk still runs, captures screenshots, and the evidence comment states that video was unavailable and why
- **AND** the absence of video does not change any verdict

### Requirement: Verdicts report, and gate nothing

The walk SHALL resolve to exactly one of five verdicts — `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`, `TIMEOUT` — and each SHALL be reported to the user and on the pull request. **No verdict SHALL block, delay, or condition a merge**, because `/walk` performs no merge and no other skill consults its result.

- **NONE** — not adopted, or adopted with no browser-observable scenarios. Report which, in one line.
- **SUCCESS** — every journey satisfied its `THEN`.
- **FAILURE** — at least one journey contradicted its `THEN`.
- **UNKNOWN** — the walk could not run or could not be trusted after any permitted heal attempt: the browser is missing, the preview URL is undiscoverable, staging is unreachable, or an access block survived its single heal-and-retry.
- **TIMEOUT** — the walk did not finish in its budget.

When the walk lands on a Cloudflare Access challenge and no service-token pair exists in the durable store, `/walk` SHALL heal itself once before concluding `UNKNOWN`: mint a deterministically named service token through the Cloudflare Access API using `CLOUDFLARE_API_TOKEN` (widening into the Access permission groups first if needed, under the same standing authorization), ensure the Access policy accepts it, store the pair in the primary worktree's durable `.env` per the secrets convention without printing a value, and retry. A challenge that survives the mint-and-retry SHALL be `UNKNOWN`, naming what was attempted. There SHALL be exactly one mint-and-retry per invocation.

`UNKNOWN` SHALL NOT be reported as `NONE`. Once a repo has adopted the walkthrough, a walk that cannot run is **unverified** rather than **absent**, and the report SHALL say so in those terms. This distinction SHALL survive as reporting honesty even though it no longer gates anything: an Access challenge screenshotted and described as "a page rendered" would convert an unchecked assumption into a checked-looking one, which is the failure mode the distinction exists to prevent.

#### Scenario: A failing walk blocks nothing

- **WHEN** a walk returns `FAILURE`
- **THEN** the failure is reported and posted
- **AND** no merge, push, or other skill is prevented from running afterwards

#### Scenario: Adopted but nothing to walk

- **WHEN** the scout finds no browser-observable scenarios in an adopted repo
- **THEN** the verdict is `NONE` and one line explains why there was nothing to walk

#### Scenario: An Access challenge heals once

- **WHEN** a walk against an Access-protected preview receives the Access login interstitial and the durable store has no service-token pair
- **THEN** `/walk` mints the service token, stores the pair per the secrets convention, and retries the walk once
- **AND** no credential value is printed or committed

#### Scenario: An Access challenge that survives the heal

- **WHEN** the retry after the mint still lands on the Access interstitial
- **THEN** the verdict is `UNKNOWN` rather than a passing or failing journey
- **AND** the report names the mint attempt and the surviving challenge

#### Scenario: Unverified is reported as unverified

- **WHEN** an adopted repo's walk cannot run because the browser is unreachable
- **THEN** the verdict is `UNKNOWN` and the report states the walk was not verified
- **AND** it is not described as "nothing to walk"

### Requirement: A failed walk resets staging, then fixes in scope or stops

On `FAILURE`, `/walk` SHALL reset the staging database using the stack pack's existing staging reset command. The reset SHALL run only on failure — a passing walk's data SHALL be left in place, staging being a fixture database rather than a preserved one. The reset guarantees the next walk begins from the seeded fixture rather than from the partial state a failed walk left behind.

After the reset, `/walk` SHALL judge scope. A failure is **in scope** when the contradicted `THEN` belongs to this change's own scenarios and the fix plausibly lives in files this branch already touches. For an in-scope failure, `/walk` SHALL fix the code, invoke `/save` (so the fix is pushed and gated normally), and re-walk — with at most **two** fix attempts per invocation, after which it stops and reports like any failure. For an out-of-scope failure (pre-existing behavior, infrastructure, another capability's scenario), `/walk` SHALL stop after the reset and report what failed and what to look at, exactly as before. The report SHALL state the scope judgement either way, so the reader can contest it. Genuinely ambiguous evidence SHALL still stop and ask the user.

#### Scenario: Reset follows a failure

- **WHEN** a journey fails
- **THEN** the staging reset command runs before any fix attempt or stop

#### Scenario: A passing walk leaves its data

- **WHEN** a walk returns `SUCCESS` after journeys that created and deleted records
- **THEN** no reset runs

#### Scenario: An in-scope failure gets a bounded fix loop

- **WHEN** a journey contradicts its `THEN` and the broken behavior belongs to this change's own code
- **THEN** `/walk` resets staging, fixes the code, invokes `/save`, and walks again
- **AND** after two fix attempts without a pass, it stops and reports

#### Scenario: An out-of-scope failure stops

- **WHEN** a journey fails because of behavior this change did not introduce
- **THEN** the skill resets staging, reports the failure and the scope judgement, and stops
- **AND** no fix, re-push, or re-walk is attempted
