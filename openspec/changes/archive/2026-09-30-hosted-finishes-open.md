<!-- openspec-archive v1 2026-09-30-hosted-finishes-open -->
<!-- file proposal.md utf8 6007 -->
# Proposal

**Status:** ready-to-ship

**Branch:** sneaky-camel

**Open questions:** none

## Why

A hosted WongStack customer whose Cloudflare account has no card still gets a stopped setup: the server install halts where setup on your own computer now finishes. The hosted dashboard is ready to show "login off" and to turn the login on later, so the server install should finish the same way.

## What Changes

- **A hosted install finishes without a card.** When Cloudflare wants a card before it turns on the email login, the server install goes on: the app goes live with the login off, and the dashboard hears that it is off instead of getting a login key. Any other login problem still stops the install, and a site that already has the login never opens.
  ```text
  BEFORE
  token ──▶ install ──▶ login?
                          │ needs a card
                          ▼
                     stop, failed

  AFTER
  token ──▶ install ──▶ login?
                          │ needs a card
                          ▼
                 app live, login off
                          │
                          ▼
              dashboard: "login: off"
  ```
- **Adding the card later turns the login on.** After the card, choosing *Turn on the login* on the dashboard runs the install again. It turns the login on, sends the dashboard its login key, and leaves the settings change for your assistant to publish. It never overwrites your work.
  ```text
  card added ──▶ Turn on the login
                        │
                        ▼
          login made, key to dashboard
                        │
                        ▼
       change waits in your app folder
                        │
                        ▼
         your assistant publishes it
  ```
- **A slow early check no longer blocks it.** Before the card question, the install checks that Cloudflare accepted its permissions. On a hosted install, a login check Cloudflare still refuses after about a minute no longer stops it; the card question decides.
- **Older servers behave as today.** Only servers built from this version ask for the open finish, so an older server still stops, and the dashboard already knows how to tell them apart.

Non-goals: the dashboard side (already shipped); detecting a card through Cloudflare; changing setup on your own computer; opening a site for any reason but the missing card.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: the unattended installer, when its host asks for it, finishes open on Zero Trust onboarding instead of stopping, and a rerun on an open install turns it private, leaving the edits uncommitted.
- `server-agent`: the agent declares contract 2, asks the installer for the open finish, and the README documents contract 2's open access result.
- `managed-workspace-access`: an open install delivers an open result with no management token through the same private channel.
- `cloudflare-provisioning`: the widen may let a still-refused Access probe pass when the caller will finish open, leaving the decision to the Zero Trust step.

## Impact

`server/agent/agent.mjs` (`CONTRACT = 2`, `openWithoutLogin: true` in the installer's stdin), `server/install-wongstack.mjs` (the job's `openWithoutLogin`, the reconnect's `keepConfig` choice, the widen option), `server/access-result.mjs` (the open result), `.agents/skills/wong-setup/scripts/provision.mjs` (`widen`'s `openWithoutLogin`), `server/README.md` (contract 2, the job field, the open result), `wiki/stack/cloudflare-access.md`, `.agents/skills/wong-setup/references/cloudflare.md`, tests under `scripts/tests/` (`server-install`, `server-agent`, `server-agent-contract`, `provision`), and a CHANGELOG entry. A minor payload release, since `widen` ships in the payload. Depends on wongstack-cloud PR #52 (contract 2 accepted), already live.

## Decision log

- **2026-09-30** — Assumed: the hosted side's shape is settled by wongstack-cloud's `card-later-on-hosted` design (contract 2, the exact open-result keys, reconnect turns private and leaves the config uncommitted), because the request quoted it and PR #52 is merged.
- **2026-09-30** — Asked whether to guard the widen step's Access checks on a no-card account → chose to guard it: on the open path, an Access probe still refused after the full wait no longer stops the install.
- **2026-09-30** — Assumed: the installer finishes open only when its job carries `openWithoutLogin: true`, which the contract-2 agent adds, because the agent and the installer can come from different commits and a contract-1 agent's open result would be refused by the dashboard.
- **2026-09-30** — Assumed: a reconnect on an installed repo whose `app/wrangler.jsonc` still carries `WORKSPACE_LOGIN` runs `provision` without `keepConfig`, the same rerun `/wong-setup` uses to turn private, because that path is tested and also adds the storage bucket once R2 is on.
- **2026-09-30** — Assumed: an open result mints and revokes no token, and ignores `cleanupTokenIds`, because the open result has no cleanup field and an open install never held a management token.
- **2026-09-30** — Assumed: the widen guard applies only when the installer asks for the open finish; `/wong-setup`'s runbook keeps its widen call as is, because the request covers the server installer only. Its unverified no-card run stays an open thread.
- **2026-09-30** — Assumed: a real hosted install on a no-card account is recorded unverified until wongstack-cloud's staging walk, because no such account is at hand; fake-Cloudflare tests cover it here.
- **2026-09-30** — Assumed: gate tasks 5.1 and 5.2 complete in the ship's one checkpoint: its `/save` runs CI and records the unverified no-card thread, because `/ship` allows one checkpoint and stops before merge if CI fails.
- **2026-09-30** — Assumed: Archive checkpoint for the ship, numbered 28.8.0 from main's 28.7.0.

<!-- end proposal.md -->
<!-- file design.md utf8 6492 -->
# Design

## Context

See proposal.md - Why. `card-after-setup` (28.7.0) gave `provision()` an `openWithoutLogin` option: an `AccessSetupError` from `accessOrganization()` that is not transient, on a site not already private, records `report.access = { mode: 'open', … }`, skips `provisionAccess` and `provisionAccessPolicies`, and `wranglerConfig()` writes `WORKSPACE_LOGIN: "off"`. A rerun without `keepConfig` whose organization succeeds calls `closeOpenConfig()` to turn the config private. `server/install-wongstack.mjs` never passes the option, and always passes `keepConfig: mode === 'installed'`, so a reconnect can't turn an open install private.

wongstack-cloud PR #52 (`card-later-on-hosted`, merged) lists `AGENT_CONTRACTS = [1, 2]`. Its `receiveAccess` accepts an open result, parsed by `openResult()` with an exact key set, only when the VM's recorded `agent_contract >= 2`, and answers with the same `{ ok, connectionId, generation, state: "pending" }` receipt the agent's `deliver()` already checks. An open result on a connection that already holds metadata gets `409`.

The agent (`server/agent/agent.mjs`) runs from the build's source; the installer it runs comes from a clone pinned to the job's `sourceCommit` (`server/agent/source.mjs`). The two can differ.

## Goals / Non-Goals

**Goals:**
- A contract-2 server's install finishes open on the onboarding refusal, and delivers the open result.
- A reconnect after the card turns the install private, delivers the restricted result, and commits nothing.
- A no-card account's refused Access probe in `widen` does not stop the open path first.

**Non-Goals:**
- Any change on wongstack-cloud; `/wong-setup`'s runbook; detecting a card; a by-hand install opening without asking.

## Decisions

### The agent asks; the installer obeys

`CONTRACT` becomes 2. `installWongStack()` adds `openWithoutLogin: true` to the installer's stdin job. `install()` reads `job.openWithoutLogin === true` and passes it to `widen()` and `provision()`. A job without it stops on onboarding as today.

Rejected: the installer always opening. A contract-1 agent may run a newer installer pinned by the host; its open result would reach a Worker that refuses it for that VM, failing the job with a worse reason than today's `cloudflare`. Asking keeps each pairing safe: a contract-1 agent never asks, and a contract-2 agent running an older installer gets the old stop, since that installer ignores the field.

`jobFolder()` ignores the field; `server/README.md`'s job table lists it as optional, so a by-hand run may ask too.

### The open result

In `writeManagementResult()`, when `report.access.mode === 'open'`: skip the permission-group read, the token list, the markers, and cleanup; `writePrivate(destination.path, { version: 1, mode: 'open', recipient, source, accountId, repo, ownerEmail, anchorHostname })`, with `anchorHostname` from `report.urls.production` as today. An existing file for the same job must match those eight fields, else the existing "belongs to another job" failure.

When the report is restricted and the existing file is an open one (the card arrived between retries of one job), treat it as no existing result: mint and overwrite. `validateExistingManagementResult()` already compares only `version`, `recipient`, `accountId`, `repo`, `ownerEmail`, `source`, which both shapes share.

`cleanupTokenIds` on an open run stay untouched: the open result has no field to report them, and an open install never held a management token. Revoking them silently would lose the host's view of what went.

### The reconnect reruns without keepConfig when the config is open

In `install()`: `const loginOff = mode === 'installed' && /"WORKSPACE_LOGIN"\s*:\s*"off"/.test(readFileSync(app/wrangler.jsonc))`, then `keepConfig: mode === 'installed' && !loginOff`. That is the exact rerun `card-after-setup` built and tested: with Zero Trust now on, `provision()` makes the Access app and policies, `closeOpenConfig()` fills the four `CF_ACCESS_*` vars and drops the switch, updates `components.access` in the record, and adds the bucket and its binding if R2 is now on. Still no card: it finishes open again and the config stays as it was.

The push step is unchanged: an installed repo whose `origin/main` exists returns before any commit or push, so the edits stay uncommitted in `~/<name>` for the person's assistant to publish. The Worker stays open until then, never broken: the Worker honors the switch only while no Access id is set, and the deployed config has none.

Rejected: teaching `provision()`'s `keepConfig` to close an open config anyway. It changes `/wong-setup`'s `--keep-config` too, and forks a second path to turn private.

### The widen's Access probes on the open path

`widen({ …, openWithoutLogin })`: the D1 probe keeps stopping on refusal. For the three Access surface probes, when `openWithoutLogin` is set and the probe still fails with 401/403 after the full `PROPAGATION` wait, record it (`report.accessPending: [surface…]`) and go on. `accessOrganization()` then decides: a non-transient refusal there opens the site; a transient one stops.

Cost: a no-card account that refuses those probes waits the full schedule once, about a minute. After the first refused surface exhausts its wait, the other two get one try each, since that wait already covers propagation.

Risk: a card account whose Access groups propagate slower than the wait could reach `accessOrganization()` early and open. The wait is the same one every widen already trusts, and the reconnect turns it private.

## Risks / Trade-offs

- [A reconnect's edits sit uncommitted while the site stays open] → wongstack-cloud's first message has the assistant publish; the deploy check then runs in full.
- [The person has uncommitted edits to `app/wrangler.jsonc` on the server] → `closeOpenConfig()` edits in place and restores the file when the result doesn't parse to the expected private config, adding a `todo` instead.
- [The real no-card behavior of Cloudflare's Access reads is unknown] → The guard covers a refusal; an unverified-run thread stays open until wongstack-cloud's staging walk with a no-card account.
- [Contract-2 agent meets a host that lacks contract 2] → Ordered away: wongstack-cloud lists 2 already.

## Migration Plan

Servers built before this release keep contract 1 and stop as today. New builds declare 2 and finish open. Rollback: revert; wongstack-cloud keeps accepting contract 1.

<!-- end design.md -->
<!-- file tasks.md utf8 3275 -->
# Tasks

## 1. Provisioning script (payload)

- [x] 1.1 `widen()` in `.agents/skills/wong-setup/scripts/provision.mjs` takes `openWithoutLogin`: with it, an Access surface probe still refused (401/403) after the full `PROPAGATION` wait is recorded in `accessPending` and does not stop; the next surfaces get one try each. The D1 probe and every other failure stop as today.
- [x] 1.2 Tests in `scripts/tests/provision.test.mjs`: a refused Access probe stops the widen without the option and passes with it (reported in `accessPending`); a refused D1 probe stops either way; the fake `sleep` shows one full wait, not three.

## 2. Server installer and access result

- [x] 2.1 `install()` in `server/install-wongstack.mjs` reads `openWithoutLogin === true` from the job and passes it to `widen()` and `provision()`.
- [x] 2.2 `install()` passes `keepConfig: false` for an installed repo whose `app/wrangler.jsonc` carries `"WORKSPACE_LOGIN": "off"`; otherwise as today. The push step stays unchanged.
- [x] 2.3 `writeManagementResult()` in `server/access-result.mjs` writes the eight-key open result for `report.access.mode === 'open'`, with no Cloudflare token call and no cleanup; an existing open file for a restricted report is replaced by a newly minted restricted result.
- [x] 2.4 Tests in `scripts/tests/server-install.test.mjs` against the fake Cloudflare: onboarding refused with `openWithoutLogin` → `done`, committed config carries the switch, the result file has exactly the eight keys at mode 0600, and no token was minted; without the option → `cloudflare` as today; a later Access error stops either way; a rerun after onboarding turns private → `done`, restricted result, `app/wrangler.jsonc` private and uncommitted, no new commit or push; a rerun still refused → open result and no file changes; an open-file retry after the card → restricted result replaces it.

## 3. Server agent

- [x] 3.1 `CONTRACT = 2` in `server/agent/agent.mjs`; `installWongStack()` adds `openWithoutLogin: true` to the installer's stdin job.
- [x] 3.2 Tests: `server-agent.test.mjs` checks the poll body's `contract: 2` and the installer's stdin carrying `openWithoutLogin: true` and no `AGENT_TOKEN`; `server-agent-management.test.mjs` delivers an open result through `deliver()` unchanged; `server-agent-contract.test.mjs` reads the job table from the README's `### Contract <CONTRACT>` section and fails when that heading doesn't match `CONTRACT`.

## 4. Docs

- [x] 4.1 `server/README.md`: the job table's optional `openWithoutLogin`; the private result's open shape and when it is written; the reconnect leaving edits uncommitted; `### Contract 1` becomes `### Contract 2`, naming what changed from 1.
- [x] 4.2 `wiki/stack/cloudflare-access.md` and `.agents/skills/wong-setup/references/cloudflare.md`: the server installer finishes open when its host asks, instead of "stops closed".
- [x] 4.3 CHANGELOG.md: a `## Next (minor) — Hosted setup finishes without a card` entry in plain words.

## 5. Gate

- [x] 5.1 `/save`: CI passes.
- [x] 5.2 Record an unverified thread: a real hosted install on a no-card Cloudflare account (open finish, dashboard "off", card, *Turn on the login*, private config left for publish), to check on wongstack-cloud's staging walk.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 1859 -->
## MODIFIED Requirements

### Requirement: One user token widens itself without asking

The person SHALL need only a user-scoped token holding `API Tokens Write` and `Account API Tokens Write`; providing it SHALL be the permission to widen it, so the agent MUST widen without asking and report what it granted afterward, keeping the two groups so a later run can widen again. The widen SHALL include the cloud browser's permission, and an installed repo whose token lacks it SHALL widen the same way the first time a task needs the cloud browser. A widen that fails or does not verify SHALL stop provisioning before anything is created, and narrowing back SHALL be offered, with one exception: when the caller will finish open without login, an Access check still refused after the full propagation wait SHALL NOT stop the widen, and provisioning's Zero Trust step SHALL decide whether to open or stop.

#### Scenario: A two-row token is enough

- **WHEN** provisioning runs with a token holding only the two API-token groups
- **THEN** it widens the token, verifies the widen, and reports the groups it granted

#### Scenario: The widen does not take

- **WHEN** the widen fails or does not verify
- **THEN** provisioning creates nothing and lists the permissions to add by hand

#### Scenario: An older install first needs the cloud browser

- **WHEN** a task needs the cloud browser and the token lacks its permission
- **THEN** the token widens itself, the agent reports the permission it granted, and the task carries on

#### Scenario: Access stays refused on the open path

- **WHEN** the caller will finish open and Cloudflare still refuses an Access check after the full wait, while the database check passes
- **THEN** the widen finishes, and the Zero Trust step opens the site only if Cloudflare refuses the organization, stopping on anything else

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 3343 -->
## MODIFIED Requirements

### Requirement: All installations enable Zero Trust automatically

Both `/wong-setup` and the unattended cloud-managed installer SHALL enable Zero Trust for the workspace's production and staging sites, assets, APIs, mini apps, and previews without asking an enable-or-public question. The owner SHALL authenticate by a reachable email. Setup SHALL preserve memory-key authentication and SHALL NOT make business content public when protection is incomplete, with one exception: when Cloudflare withholds Zero Trust until the account has a payment method, `/wong-setup`, and the unattended installer when its job asks for the open finish, SHALL finish with the site open without login. `/wong-setup` SHALL recommend the card afterwards as optional; the unattended installer SHALL report the open state to its host. An unattended job that does not ask SHALL keep stopping in that case. A site that already has protection SHALL never open. A deliberately public surface requires a separately reviewed exception.

#### Scenario: Interactive setup

- **WHEN** a person installs WongStack through `/wong-setup`
- **THEN** setup automatically provisions protected hosting and does not ask whether to enable protection

#### Scenario: Setup cannot finish protection

- **WHEN** either installation path cannot finish its Zero Trust setup for a reason other than a missing payment method
- **THEN** setup reports the recoverable blocker without publishing public business content

#### Scenario: No card on a personal computer

- **WHEN** `/wong-setup` finds Zero Trust needs a payment method
- **THEN** setup finishes without stopping, and the closing report recommends the card and says what is missing without it

#### Scenario: No card on a server

- **WHEN** the unattended installer, with a job that asks for the open finish, finds Zero Trust needs a payment method
- **THEN** it finishes with `done`, the committed app config carries the login-off switch, and its host receives an open result with no management credential

#### Scenario: No card on a server that did not ask

- **WHEN** the unattended installer, with a job that does not ask for the open finish, finds Zero Trust needs a payment method
- **THEN** it stops without publishing business content, as before

## ADDED Requirements

### Requirement: A server rerun turns an open install private without publishing

When the unattended installer runs again on a repo it installed open, and Cloudflare now allows Zero Trust, it SHALL provision the login, turn the app config private, report the restricted result to its host, and leave its file edits uncommitted in the repo for the person's assistant to publish. It SHALL NOT commit or push over the repo's later work. While Zero Trust is still withheld, the rerun SHALL finish open again.

#### Scenario: The card was added

- **WHEN** the installer reruns on an open install whose account now has Zero Trust
- **THEN** the last line is `done`, the host receives the restricted result, `app/wrangler.jsonc` in the repo is private and uncommitted, and `origin/main` is unchanged

#### Scenario: Still no card

- **WHEN** the installer reruns on an open install whose account still withholds Zero Trust
- **THEN** the last line is `done`, the host receives an open result, and the repo's files are unchanged

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/managed-workspace-access/spec.md utf8 1067 -->
## ADDED Requirements

### Requirement: An open install reports its login is off

When a managed install finishes open because Zero Trust needs a payment method, its private result SHALL say so with exactly `version`, `mode: "open"`, `recipient`, `source`, `accountId`, `repo`, `ownerEmail`, and `anchorHostname`, written to the same job-derived private file and delivered the same way as a restricted result. It SHALL mint no management credential and SHALL carry no Access identifier, token, or cleanup field. A retry of the same job SHALL reuse it; a later run that provisions protection SHALL replace it with the restricted result.

#### Scenario: No card

- **WHEN** a managed install finishes open
- **THEN** the private result file holds exactly the eight open keys, mode 0600, and Cloudflare holds no new management token for the connection

#### Scenario: The card arrives before a retry

- **WHEN** a retry of the same job finds an open result and Zero Trust now provisions
- **THEN** the file is replaced by the restricted result with its management token

<!-- end specs/managed-workspace-access/spec.md -->
<!-- file specs/server-agent/spec.md utf8 2181 -->
## MODIFIED Requirements

### Requirement: The agent declares its contract and commit

The agent SHALL export its contract version as `CONTRACT`, an integer, now 2. Every poll SHALL send `{ contract, commit, paseo }`: that version, the source commit the host recorded for the build, and whether Paseo is up. It SHALL NOT send a features list. A change to any message's shape SHALL raise `CONTRACT`.

#### Scenario: A poll names the contract and commit

- **WHEN** the agent polls on a server built at commit `abc…` (40 hex)
- **THEN** the request body is `{ contract: 2, commit: "abc…", paseo: "up" | "down" }` and nothing else

### Requirement: The contract is written down

`server/README.md` SHALL document the current contract as a host and a fork rely on it: the agent's environment, the poll request and reply, each job type with its payload and result, the job-result delivery, the private access-result delivery with both its restricted and its open shape, the host's setup report, and that the agent never changes itself. It SHALL say what changed from the contract before it. A fork that changes the agent SHALL keep to it or raise `CONTRACT`.

#### Scenario: The README and the agent agree

- **WHEN** the agent handles a job type that `server/README.md`'s contract does not list, or the README lists one the agent does not handle
- **THEN** the source's tests fail and name the job type

#### Scenario: The README names the declared contract

- **WHEN** `CONTRACT` differs from the number of the contract section in `server/README.md`
- **THEN** the source's tests fail

## ADDED Requirements

### Requirement: A contract-2 agent asks for the open finish

A contract-2 agent SHALL ask the installer to finish open when Zero Trust needs a payment method, and SHALL deliver the resulting open access result through the same checked private channel as a restricted one. An agent of an earlier contract SHALL NOT ask, so an older server keeps stopping.

#### Scenario: A cloudflare job on a contract-2 server

- **WHEN** the agent runs the installer for a `cloudflare` job
- **THEN** the installer's stdin job asks for the open finish, and still holds no `AGENT_TOKEN`

<!-- end specs/server-agent/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-30

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 37624 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-09-30-hosted-finishes-open</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-30-hosted-finishes-open">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-30-hosted-finishes-open</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">A hosted WongStack customer whose Cloudflare account has no card still gets a stopped setup: the server install halts where setup on your own computer now finishes. The hosted dashboard is ready to show &quot;login off&quot; and to turn the login on later, so the server install should finish the same way.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A hosted install finishes without a card.</b> When Cloudflare wants a card before it turns on the email login, the server install goes on: the app goes live with the login off, and the dashboard hears that it is off instead of getting a login key. Any other login problem still stops the install, and a site that already has the login never opens.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">BEFORE</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">token ──▶ install ──▶ login?</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">                        │ needs a card</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">                        ▼</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">                   stop, failed</span>

<span class="ln" data-note="item-1-line-7" tabindex="0">AFTER</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">token ──▶ install ──▶ login?</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">                        │ needs a card</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">                        ▼</span>
<span class="ln" data-note="item-1-line-11" tabindex="0">               app live, login off</span>
<span class="ln" data-note="item-1-line-12" tabindex="0">                        │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0">                        ▼</span>
<span class="ln" data-note="item-1-line-14" tabindex="0">            dashboard: &quot;login: off&quot;</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Adding the card later turns the login on.</b> After the card, choosing <i>Turn on the login</i> on the dashboard runs the install again. It turns the login on, sends the dashboard its login key, and leaves the settings change for your assistant to publish. It never overwrites your work.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">card added ──▶ Turn on the login</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">                      │</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">                      ▼</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">        login made, key to dashboard</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">                      │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">                      ▼</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">     change waits in your app folder</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">                      │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">                      ▼</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">       your assistant publishes it</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A slow early check no longer blocks it.</b> Before the card question, the install checks that Cloudflare accepted its permissions. On a hosted install, a login check Cloudflare still refuses after about a minute no longer stops it; the card question decides.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Older servers behave as today.</b> Only servers built from this version ask for the open finish, so an older server still stops, and the dashboard already knows how to tell them apart.</div></div></li>
</ol>
<p class="aside">Non-goals: the dashboard side (already shipped); detecting a card through Cloudflare; changing setup on your own computer; opening a site for any reason but the missing card.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: the hosted side's shape is settled by wongstack-cloud's <code>card-later-on-hosted</code> design (contract 2, the exact open-result keys, reconnect turns private and leaves the config uncommitted), because the request quoted it and PR #52 is merged.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-30</p>Asked whether to guard the widen step's Access checks on a no-card account → chose to guard it: on the open path, an Access probe still refused after the full wait no longer stops the install.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: the installer finishes open only when its job carries <code>openWithoutLogin: true</code>, which the contract-2 agent adds, because the agent and the installer can come from different commits and a contract-1 agent's open result would be refused by the dashboard.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: a reconnect on an installed repo whose <code>app/wrangler.jsonc</code> still carries <code>WORKSPACE_LOGIN</code> runs <code>provision</code> without <code>keepConfig</code>, the same rerun <code>/wong-setup</code> uses to turn private, because that path is tested and also adds the storage bucket once R2 is on.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: an open result mints and revokes no token, and ignores <code>cleanupTokenIds</code>, because the open result has no cleanup field and an open install never held a management token.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: the widen guard applies only when the installer asks for the open finish; <code>/wong-setup</code>'s runbook keeps its widen call as is, because the request covers the server installer only. Its unverified no-card run stays an open thread.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: a real hosted install on a no-card account is recorded unverified until wongstack-cloud's staging walk, because no such account is at hand; fake-Cloudflare tests cover it here.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: gate tasks 5.1 and 5.2 complete in the ship's one checkpoint: its <code>/save</code> runs CI and records the unverified no-card thread, because <code>/ship</code> allows one checkpoint and stops before merge if CI fails.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: Archive checkpoint for the ship, numbered 28.8.0 from main's 28.7.0.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
