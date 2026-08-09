## RENAMED Requirements

- FROM: `### Requirement: The browser is remote, reached with the pack's credential`
- TO: `### Requirement: The browser is driven by a standalone CLI, installed on the machine`

- FROM: `### Requirement: Adoption is detected from state, never configured`
- TO: `### Requirement: The walk provisions its own tool, never a repo dependency`

- FROM: `### Requirement: Adoption is recommended and documented, never forced`
- TO: `### Requirement: The runbook ships in core and records what was declined`

## MODIFIED Requirements

### Requirement: Walkthrough credentials follow the durable worktree store

The walkthrough SHALL honor any credential already exported into its process, including the optional Cloudflare Access service-token pair. When a value it needs is not exported, it SHALL resolve the repository's primary worktree from Git metadata and read the durable ignored `.env` there, rather than assuming the active linked worktree contains a copy. It SHALL NOT print any resolved value or persist the primary worktree's absolute path in repository artifacts.

The walkthrough SHALL NOT define a browser-endpoint variable of its own. Where a browser must run somewhere other than this machine, that configuration belongs to the browser tool and SHALL be documented as the tool's, not restated or renamed by the payload.

#### Scenario: Walk runs from a linked worktree

- **WHEN** `/walk` runs from a linked worktree with no local `.env` and a required credential exists in the primary worktree's durable file
- **THEN** preflight uses the durable credential
- **AND** it does not report the value as missing or ask the user to copy it

#### Scenario: Exported credentials retain precedence

- **WHEN** the walk process already has a required value in its environment
- **THEN** preflight uses the exported value without replacing it from a file

#### Scenario: No durable credential exists

- **WHEN** neither the process environment nor the durable primary-worktree file supplies a credential the walk needs
- **THEN** the walkthrough retains its `UNKNOWN` missing-credential verdict and points to the secrets convention
- **AND** no linked-worktree copy is created as a side effect

#### Scenario: Remote browsers are the tool's business

- **WHEN** a reader asks how to run the walk's browser somewhere other than this machine
- **THEN** the payload points at the browser tool's own remote-provider configuration
- **AND** the payload defines no variable of its own for it

### Requirement: The walkthrough is a user-invoked verb

The staging walkthrough SHALL be reached by invoking `/walk`, or by `/ship`, which invokes `/walk` once as a non-gating evidence step between its delegated `/save` checkpoint and its merge. No other skill SHALL run it: `/save`, `/apply`, and `/continue` SHALL NOT walk, prompt to walk, or warn that a walk did not happen.

`/walk` SHALL be invocable at any point in a change's life and any number of times. Nothing in the skill SHALL limit how often it runs or treat a repeated invocation as an error. `/ship`'s invocation SHALL be an ordinary walk — same scout, same verdicts, same PR evidence — not a variant.

`/walk` SHALL ship in the payload's **core** category, so every repo receives it regardless of `components.stackPack`. It SHALL NOT be gated on the stack pack, on Cloudflare, or on any hosting provider, and no capability of the walk SHALL require an account with any vendor.

The browser tool the walk uses SHALL also be available for ordinary browser work outside the walk. `/walk` SHALL remain the only surface that produces graded merge evidence; using the browser to look at a page, fill a form, or check a rendered result SHALL NOT require invoking `/walk`.

#### Scenario: Shipping walks as evidence

- **WHEN** `/ship` runs in a repo with browser-observable scenarios
- **THEN** `/walk` runs once after the delegated `/save` and before the merge, and its evidence lands on the PR
- **AND** a `NONE`, `UNKNOWN`, or `TIMEOUT` verdict changes nothing about the merge

#### Scenario: A repo with no stack pack receives the skill

- **WHEN** WongStack is installed or synced into a repo whose `components.stackPack` is absent or false
- **THEN** the `walk` skill is copied in with the rest of the core category
- **AND** no Cloudflare file, script, or config fragment is copied with it

#### Scenario: A repo in any language walks

- **WHEN** `/walk` runs in a repo with no `package.json`, no Node toolchain, and no vendor account
- **THEN** the walk drives its journeys and grades them normally
- **AND** nothing is added to the repository to make it possible

#### Scenario: The browser serves ordinary work

- **WHEN** a user asks to open a page or check something rendered, outside any change
- **THEN** the browser tool is available directly
- **AND** no walk is started, no journey is graded, and no PR comment is posted

#### Scenario: Walking repeatedly is normal

- **WHEN** `/walk` is invoked three times across one change
- **THEN** each invocation performs a full walk and reports its own verdict
- **AND** no invocation is refused or flagged for repetition

#### Scenario: Mid-change walking

- **WHEN** `/walk` is invoked on a branch whose `tasks.md` still has unchecked tasks
- **THEN** the walk runs against whatever is deployed for the current commit
- **AND** the incomplete state of the change is not treated as an error

### Requirement: The walk provisions its own tool, never a repo dependency

`/walk` SHALL install what it needs to run rather than reporting its absence, and SHALL install it **at the machine level**. When the browser CLI or its browser is missing, the walk SHALL install them and state what it installed.

The walk SHALL NOT add a dependency to the repository to make itself possible — no `devDependencies` entry, no lockfile change, and no requirement that a `package.json` exist. A repository in a language with no Node toolchain SHALL be able to walk with nothing added to it. This is the property that keeps the walkthrough stack-agnostic in fact and not only in name.

A **language runtime** SHALL remain outside this rule: installing a runtime SHALL still happen only at the point of need and only with the user's consent, per the toolchain convention. The walk installs tools, not runtimes.

There SHALL be no adoption signal, manifest field, config file, or skill argument that enables or disables the walk. Nothing about the walk SHALL be switched on by configuration: what it does is decided by the change's scenarios and what it finds on the machine.

#### Scenario: A machine without the browser tool

- **WHEN** `/walk` runs on a machine where the browser CLI is not installed
- **THEN** the walk installs it and its browser, reports that it did, and walks
- **AND** the repository working tree is unchanged by the install

#### Scenario: A repo with no package manifest

- **WHEN** `/walk` runs in a repository that has no `package.json` at all
- **THEN** the walk runs normally
- **AND** no manifest is created and no dependency is added

#### Scenario: Nothing is switched on by configuration

- **WHEN** a reader looks for how to enable or disable the walk for a repo
- **THEN** no manifest field, config file, or skill flag exists for it

#### Scenario: A missing runtime still asks

- **WHEN** the walk needs a language runtime the machine does not have
- **THEN** it explains what is needed and asks before installing
- **AND** it does not install a runtime silently the way it installs a tool

### Requirement: The browser is driven by a standalone CLI, installed on the machine

The walk SHALL drive its browser through a standalone command-line tool installed on the machine, rather than through a vendor-hosted browser service or a browser library declared in the repository. No vendor-hosted browser endpoint SHALL be hardcoded in the runner, preflight, or skill, and no vendor credential SHALL be required to obtain a browser.

Preflight SHALL verify the browser by performing the tool's own environment check, which launches a browser headlessly, rather than by checking for a credential. A failed check SHALL produce `UNKNOWN` naming what failed — never a failing application.

Each journey SHALL be expressed as a declarative sequence of the tool's commands, executed as one batch that stops at the first failing step. Elements SHALL be addressed through the tool's accessibility snapshot or its semantic locators, rather than through selectors written without seeing the page.

The walk SHALL report **where the browser ran** in its user-facing report and in its pull-request comment, because a walk that ran on this machine depended on this machine and the reader is entitled to know it.

The driver SHALL be kept thin enough that replacing the browser tool means rewriting one script rather than the capability: journeys stay declarative, and grading SHALL consume the tool's structured output rather than its human-readable text.

#### Scenario: The default path needs no configuration

- **WHEN** `/walk` runs with the tool installed and no environment variable set
- **THEN** it launches a browser headlessly and walks
- **AND** the report names where the browser ran

#### Scenario: Preflight is a real launch, not a credential check

- **WHEN** preflight runs
- **THEN** it performs the tool's environment check, which includes launching a browser
- **AND** a failure is reported as `UNKNOWN` with the failing check named

#### Scenario: No vendor browser service remains

- **WHEN** the runner, preflight, and skill are read for a hardcoded browser-service endpoint, or a vendor credential used to obtain a browser
- **THEN** none exists

#### Scenario: A journey is declarative

- **WHEN** a journey of four steps runs
- **THEN** it is submitted as one ordered batch that stops at the first failing step
- **AND** no per-run browser script is generated inside the repository

#### Scenario: A session dies mid-walk

- **WHEN** a browser session ends while a journey is in flight
- **THEN** that journey's evidence records the error and the remaining journeys run on fresh sessions
- **AND** one lost session does not cost the walk

### Requirement: The walk is throwaway and saves nothing

The walk SHALL leave the repository working tree exactly as it found it. It SHALL NOT create a test suite, a `tests/` directory, a config file, committed fixtures, a dependency entry, or any other artifact inside the repo — including the tool it installs, which is installed at the machine level for this reason.

Journey definitions and captured evidence SHALL be written outside the repository working tree and deleted when the run ends.

The run SHALL capture a screenshot after each step. Full-page and annotated capture SHALL be available where they make the evidence clearer. **No video SHALL be required or claimed**: the evidence is the screenshots and the written record, and the report SHALL NOT reference a recording that does not exist.

The journey definitions SHALL contain no assertions — their job is to produce evidence, not to decide.

Cleanup SHALL run on every exit path, including when the skill stops on `UNKNOWN` or pauses to ask the user a question.

#### Scenario: Nothing lands in the repo

- **WHEN** a walk completes, whatever its verdict
- **THEN** `git status` reports the same working tree as the walk started from
- **AND** no journey definition, screenshot, or dependency entry remains under the repository root

#### Scenario: Installing the tool leaves the repo untouched

- **WHEN** a walk installs the browser tool because the machine lacked it
- **THEN** the working tree is still unchanged
- **AND** the install is reported as a machine change, not a repo change

#### Scenario: Evidence is captured per step

- **WHEN** a journey of four steps is walked
- **THEN** four screenshots exist for that journey in the run's temporary directory
- **AND** no video file is expected or reported as missing

#### Scenario: Cleanup on an aborted walk

- **WHEN** a walk stops early on `UNKNOWN`
- **THEN** the temporary run directory is still removed

### Requirement: Verdicts report, and gate nothing

The walk SHALL resolve to exactly one of five verdicts — `NONE`, `SUCCESS`, `FAILURE`, `UNKNOWN`, `TIMEOUT` — and each SHALL be reported to the user and on the pull request. **No verdict SHALL block, delay, or condition a merge**, because `/walk` performs no merge and no other skill consults its result.

- **NONE** — this change has no browser-observable scenarios. Report why, in one line. `NONE` SHALL NOT be used to mean "not adopted": adoption no longer exists.
- **SUCCESS** — every journey satisfied its `THEN`.
- **FAILURE** — at least one journey contradicted its `THEN`.
- **UNKNOWN** — the walk could not run or could not be trusted after any permitted heal attempt: the browser could not be obtained, the preview URL is undiscoverable, staging is unreachable, or an access block survived or could not attempt its single heal-and-retry.
- **TIMEOUT** — the walk did not finish in its budget.

When the walk lands on a Cloudflare Access challenge, the heal SHALL be gated on the observed block rather than on the repo's category. With `CLOUDFLARE_API_TOKEN` available and no service-token pair in the durable store, `/walk` SHALL heal itself once before concluding `UNKNOWN`: mint a deterministically named service token through the Cloudflare Access API (widening into the Access permission groups first if needed, under the same standing authorization), ensure the Access policy accepts it, store the pair in the primary worktree's durable `.env` per the secrets convention without printing a value, apply it as request headers on the browser session, and retry. Without that token the heal SHALL be unavailable and the verdict SHALL be `UNKNOWN`, naming the Access wall and the missing credential. There SHALL be exactly one mint-and-retry per invocation.

`UNKNOWN` SHALL NOT be reported as `NONE`. A walk that cannot run is **unverified** rather than **absent**, and the report SHALL say so in those terms: an Access challenge screenshotted and described as "a page rendered" would convert an unchecked assumption into a checked-looking one, which is the failure mode the distinction exists to prevent.

#### Scenario: A failing walk blocks nothing

- **WHEN** a walk returns `FAILURE`
- **THEN** the failure is reported and posted
- **AND** no merge, push, or other skill is prevented from running afterwards

#### Scenario: Nothing to walk

- **WHEN** the scout finds no browser-observable scenarios
- **THEN** the verdict is `NONE` and one line explains why there was nothing to walk
- **AND** the report does not describe the repo as unadopted

#### Scenario: An Access challenge heals once

- **WHEN** a walk against an Access-protected preview receives the Access login interstitial, `CLOUDFLARE_API_TOKEN` is available, and the durable store has no service-token pair
- **THEN** `/walk` mints the service token, applies it as request headers, and retries the walk once
- **AND** no credential value is printed or committed

#### Scenario: An Access challenge with no Cloudflare credential

- **WHEN** a walk meets an Access interstitial and no `CLOUDFLARE_API_TOKEN` is available
- **THEN** the verdict is `UNKNOWN`, naming the Access wall and the credential that would allow the heal
- **AND** the interstitial is not reported as a rendered page or a failing journey

#### Scenario: An Access challenge that survives the heal

- **WHEN** the retry after the mint still lands on the Access interstitial
- **THEN** the verdict is `UNKNOWN` rather than a passing or failing journey
- **AND** the report names the mint attempt and the surviving challenge

#### Scenario: Unverified is reported as unverified

- **WHEN** a walk cannot run because the browser could not be obtained
- **THEN** the verdict is `UNKNOWN` and the report states the walk was not verified
- **AND** it is not described as "nothing to walk"

### Requirement: Evidence is posted on every verdict and degrades honestly

`/walk` SHALL post its result as a comment on the pull request on **every** verdict, including `FAILURE`, `UNKNOWN`, and `TIMEOUT` — not only on success. A failed walk's screenshots are the most useful evidence the walk can produce, and there is no merge being blocked that would otherwise carry the news.

Each comment SHALL cover each journey, its steps, its verdict, and the scenario's `THEN` it was judged against, and SHALL state where the browser ran. The written record SHALL be complete on its own, independent of whether any media renders.

One comment SHALL be posted per `/walk` invocation. Repeated invocations SHALL post additional comments rather than editing or replacing earlier ones, so the pull request carries a truthful log of attempts.

Screenshots SHALL be linked when a public object-storage host is configured and referenced by local path when one is not. The absence of a media host SHALL NOT be reported as a failure or a degraded run. The comment SHALL NOT claim or link a video, because the walk captures none.

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

#### Scenario: The comment claims no video

- **WHEN** any walk posts its evidence
- **THEN** the comment references screenshots and the written record only
- **AND** it neither links a video nor reports one as unavailable

### Requirement: The runbook ships in core and records what was declined

A runbook SHALL ship in the payload's **core** category, so it is present in every repo that receives the skill citing it. It SHALL cover what the walk needs, what it installs for itself, how journeys are expressed, and where evidence lands, plus the optional public host for inline screenshots.

Where the runbook documents provider-specific detail — the Cloudflare Access service token, the seeded `schema/seed.sql` fixture — it SHALL mark that detail as applying only to repos that took the stack pack, and any link into a stack-pack-only page SHALL be hedged as such, so a reader without the pack is never sent to a page their repo does not have.

The runbook SHALL record the deliberately declined options so they are not re-litigated: a saved test suite, a second judging agent, walking the full spec surface, and walking automatically on every push. It SHALL state that `/walk` invokes `/save` after scouting and why, distinguishing that from the declined option of walking automatically whenever `/save` runs.

It SHALL also record the decisions this capability **reversed or dropped, with the reason for each**: that the browser was once required to be remote so the walk behaved identically everywhere; that a repo dependency once served as the adoption signal; and that video was once captured per journey and is not, because the evidence a reviewer actually reads is a screenshot against a written expectation. It SHALL record which browser engines were considered and why the chosen one was chosen, including the engine-replacement path, so that choice can be revisited without being re-derived.

#### Scenario: The runbook reaches a repo with no stack pack

- **WHEN** WongStack is synced into a repo that declined the stack pack
- **THEN** the walkthrough runbook is among the files it receives
- **AND** its Cloudflare-specific sections are marked as pack-only

#### Scenario: The runbook records what was declined

- **WHEN** a reader asks why the walk does not run automatically on every `/save`
- **THEN** the runbook states the decision and its reason
- **AND** distinguishes it from `/walk`'s own `/save` step

#### Scenario: The reversed decisions are recorded, not erased

- **WHEN** a reader asks why the walk now runs a browser on this machine, installs its own tool, and captures no video
- **THEN** the runbook states each earlier decision, what it protected, and why it was traded

#### Scenario: The engine choice can be revisited

- **WHEN** a reader asks why this browser tool was chosen over the alternatives
- **THEN** the runbook names the alternatives, the deciding argument, and what replacing the engine would cost
