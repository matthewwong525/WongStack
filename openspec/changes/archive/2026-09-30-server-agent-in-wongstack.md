<!-- openspec-archive v1 2026-09-30-server-agent-in-wongstack -->
<!-- file proposal.md utf8 7714 -->
# The server's helper lives in WongStack

**Status:** ready-to-ship

**Branch:** salty-kolibri

**Open questions:** none

## Why

Each wongstack.com server runs a small helper that takes wongstack.com's requests: pair a device, connect GitHub, install WongStack, copy the server. Today the helper lives in wongstack.com's own code. It is packed onto a server once and never changes, so a fork owner can't change it. Servers built before a newer helper can't connect Cloudflare, and nothing but a rebuild fixes them. Moving the helper here, beside the setup script, lets your fork decide what its servers run. A written, numbered agreement lets wongstack.com check a fork before building from it.

## What Changes

- **The helper moves into WongStack, beside the setup script.** A server built from WongStack, or from your fork, runs the helper from that same copy at the same version. Change the helper in your fork, and your next server gets your version. A running server keeps the helper it was built with; rebuilding is how it gets a newer one.
  ```text
   WongStack or your fork
   ┌──────────────────────┐
   │ server/              │
   │   setup.sh           │
   │   install-wongstack  │
   │   agent/  ◀── new    │
   └──────────┬───────────┘
              │ at build time
              ▼
   ┌──────────────────────┐
   │ your server          │
   │ helper, fixed until  │
   │ the next rebuild     │
   └──────────┬───────────┘
              │ "I follow v1,
              │  I run abc1234"
              ▼
         wongstack.com
  ```
- **The helper and wongstack.com follow a written agreement, version 1.** The server folder's guide spells out each message between them: the check-in, each request and its answer, the private Cloudflare result, and the setup report. The helper says which version it follows and which version of your repo it runs, so wongstack.com can check a fork before building from it. A fork that changes the helper keeps to the agreement, as it does for the setup script.
- **The setup script loses its size limit.** It was capped so a host could pack it into a server's small first-boot data. wongstack.com now downloads it instead, so a fork can grow its setup script freely.
- **Nothing changes for an installed repo.** The helper stays out of what installs copy, like the setup script.

**Non-goals:** a helper that updates itself on a running server; moving existing servers; wongstack.com's side (first boot, checking a fork's helper, the dashboard), which the wongstack.com plan "agent-from-source" covers; changing which version installs WongStack into your repo.

## Capabilities

### New Capabilities

- `server-agent`: the host agent in `server/agent/`, its contract version, its versioned wongstack.com API (poll, jobs, results, access-result delivery, setup report), and that it runs the source it was built from without changing itself.

### Modified Capabilities

- `install-onboarding`: "The server script keeps the host contract" drops the 12 KiB budget and its test.

## Impact

- New: `server/agent/agent.mjs` (declares `CONTRACT = 1`), `server/agent/copy.mjs`, `server/agent/management.mjs`, `server/agent/source.mjs`, moved from wongstack-cloud's `vm/`. The host copy `vm/install-wongstack.mjs` is not moved: the agent imports `run`, `jobFolder`, `repoFolder`, `CLOUDFLARE_CALL`, and `setEnv` from `server/install-wongstack.mjs`, and `cloudflare` from `.agents/skills/wong-setup/scripts/provision.mjs`.
- Tests: `scripts/tests/server-agent*.test.mjs`, moved from `vm/*.test.mjs`; `scripts/tests/.c8rc.json` gains `server/agent/*.mjs`; the size-budget test in `scripts/tests/server-setup.test.mjs` goes.
- Docs: `server/README.md` gains "The agent" section with contract 1 and loses "The size budget"; `CHANGELOG.md` gets a `## Next (minor)` entry.
- Not the payload: `server/` stays source-only, so installed repos and `/wong-sync` see nothing.
- Other repo: wongstack-cloud's plan `agent-from-source` (workspace large-lion) waits for this release, then points first boot at `/opt/wongstack/source/server/agent/agent.mjs` and drops its `vm/` copies.

## Decision log

- **2026-09-30** — Assumed: settled before this chat, the agent and its helpers move to `server/agent/` with their tests, import the installer's shared names instead of a host copy, and stay out of the payload; a fork gains no new power, since its `setup.sh` already runs as root and can read the agent token; wongstack.com still verifies everything the agent sends.
- **2026-09-30** — Assumed: no self-update, no fallback to a previous version, and no supported-versions list in the poll reply, because the user dropped self-update in a review note on the wongstack.com plan (`agent-from-source`), and the user pointed this chat at that plan.
- **2026-09-30** — Assumed: the shared names are the wongstack.com plan's: entry `server/agent/agent.mjs`, `export const CONTRACT = 1`, the source unpacked root-owned at `/opt/wongstack/source`, poll request `{ contract, commit, paseo }` with no `features`, reply `{ jobs, interval }`, because both plans must match and that plan said it follows this one's README.
- **2026-09-30** — Assumed: the agent reports `SOURCE_COMMIT` from `/etc/wongstack/agent.env` as its commit, because first boot unpacks a GitHub tarball with no `.git` to ask.
- **2026-09-30** — Assumed: wongstack.com keeps writing the systemd unit and running the setup report from its bootstrap, because its plan owns first boot; this README documents both as the host's side of contract 1.
- **2026-09-30** — Assumed: drop the 12 KiB `setup.sh` budget, because it existed only for first-boot data and wongstack.com now downloads the script.
- **2026-09-30** — Assumed: install jobs keep running the installer from a separate workspace-user clone at the job's `sourceRepo`/`sourceCommit`, as `vm/source.mjs` does today, because the wongstack.com plan keeps the installer's commit unchanged.
- **2026-09-30** — Assumed: this ships as a minor release with a changelog entry, because past `server/` changes did and wongstack.com pins a release.
- **2026-09-30** — Assumed: this does not wait for wongstack-cloud PR #47, because #47 changes only the dashboard's first message; the only order is that this ships before wongstack.com's `agent-from-source`.
- **2026-09-30** — Assumed: the README says the agent opens no inbound port except `copy-send`'s one-time listener for the job's peer, instead of a flat "never", because that job does listen; and `payload-manifest.md`'s not-copied list names the `server/` agent, because it is source-only like `setup.sh`.
- **2026-09-30** — Check: `scripts/tests/.c8rc.json` adds `server/agent/*.mjs` to coverage, because the moved agent must count toward the coverage floor; this tightens the check.
- **2026-09-30** — Check: `server/agent/agent.mjs` keeps its `c8 ignore` on the process entry point, moved unchanged from wongstack-cloud, because only systemd runs that block and the tests call `main` directly.
- **2026-09-30** — Assumed: task 4.2 sends the PR and README section before merge and the release commit right after it, because a task must be ticked before the archive and the commit exists only after merge.
- **2026-09-30** — Assumed: archived for shipping as release 28.4.0, because every task is ticked and the PR's checks passed.
- **2026-09-30** — Assumed: renumbered to release 28.5.0 after merging main, because 28.4.0 shipped first as tidy-open-threads.

<!-- end proposal.md -->
<!-- file design.md utf8 7586 -->
# Design

## Context

The agent lives in wongstack-cloud's `vm/`: `agent.mjs` (poll loop, job switch, GitHub/Paseo/team jobs, the install and token roll), `copy.mjs` (encrypted home-folder copy between servers), `management.mjs` (the private access-result journal and delivery), `source.mjs` (the per-job workspace-user clone the installer runs from), and `install-wongstack.mjs`, a trimmed host copy of this repo's installer helpers plus `cloudflare` and `setEnv`. Tests are `node:test` files beside them: `agent.test.mjs`, `agent-roll.test.mjs`, `copy.test.mjs`, `management.test.mjs`, `source.test.mjs`, `install-wongstack.test.mjs`. Cloud-init writes them to `/opt/wongstack/`, and nothing rewrites them.

The poll sends `{ paseo, features: ["copy", "access-v1"] }`. wongstack.com's plan `agent-from-source` (wongstack-cloud, workspace large-lion) replaces `features` with a contract number and unpacks this source at the build commit into `/opt/wongstack/source`. That plan owns first boot, the Worker, and the dashboard; this one owns the agent and the written contract. See proposal.md for why.

## Goals / Non-Goals

**Goals:** the agent runs unchanged in behavior from `server/agent/`, with imports from this source instead of host copies; the poll carries `{ contract, commit, paseo }`; contract 1 is written in `server/README.md`; the moved tests run in this repo's CI and coverage.

**Non-Goals:** new job types or changed job shapes; any self-update; changing the installer; first boot, the systemd unit, and the setup report's sender, which stay wongstack.com's.

## Decisions

### Layout and imports

```text
server/
  setup.sh
  install-wongstack.mjs   (unchanged exports; README lists setEnv)
  access-result.mjs
  agent/
    agent.mjs      entry; CONTRACT = 1
    copy.mjs
    management.mjs
    source.mjs
```

- `agent.mjs` imports `run`, `jobFolder`, `repoFolder`, `CLOUDFLARE_CALL`, and `setEnv` from `../install-wongstack.mjs`, and `cloudflare` from `../../.agents/skills/wong-setup/scripts/provision.mjs`. The provision `cloudflare(token, { fetch })` takes options, not a bare fetch, so the token roll passes `{ fetch: fetchFn }`. This repo's `jobFolder` also refuses a missing or synthetic `ownerEmail`, so `installWongStack` checks `ownerEmail` and `managementResult` before `jobFolder`: a job missing them still fails with `access`, and only a present but refused email (a GitHub noreply) becomes `rejected` instead of the installer's `repo`.
- `management.mjs` imports `CLOUDFLARE_CALL` from `../install-wongstack.mjs`.
- `vm/install-wongstack.mjs` and its test are not moved; `scripts/tests/server-install.test.mjs` already covers the shared names.
- `WRITE_TOKEN` (the snippet run as `wong` to write the rolled token) imports `setEnv` from the installer's path resolved from `import.meta.url`, not the old `/opt/wongstack/install-wongstack.mjs`. `wong` can read it because the host unpacks the source mode 0755.
- The code keeps its current style (double quotes, compact `management.mjs`) so the move reviews as a move. `oxlint` already lints `server/`; fix only what it flags.

Alternative: keep a host copy of the helpers under `server/agent/`. Rejected: that is the drift this change removes.

### The contract number and commit

`agent.mjs` exports `CONTRACT = 1`. `tick` sends `{ contract: CONTRACT, commit, paseo }`, where `commit` is `SOURCE_COMMIT` from the environment when it is 40 hex characters, else `null`. `features` goes: wongstack.com's plan grants capabilities by contract, and an old Worker that still reads `features` is not rolled back to once this ships (its risk is in that plan).

Why the environment, not git: first boot unpacks a GitHub tarball with no `.git`. `SOURCE_COMMIT` is the same commit the tarball came from, recorded by wongstack.com in `agent.env`.

Contract 1 is today's shapes, frozen: every job type (`pair`, `suspend`, `resume`, `github`, `cloudflare`, `team-add`, `team-remove`, `copy-key`, `copy-send`, `copy-restore`), their payloads and results, `POST /api/agent/jobs/:id`, `POST /api/agent/jobs/:id/access`, and the host's `POST /api/agent/setup?exit=<code>` with the log tail as text. A later breaking shape raises `CONTRACT`; wongstack.com adds the new number first, then this repo releases it.

### The written contract in `server/README.md`

A new `## The agent` section, after the installer's, holds:

- **What runs it:** the host unpacks the source root-owned and mode 0755 (wongstack.com uses `/opt/wongstack/source`), writes `/etc/wongstack/agent.env` (`APP_URL`, `AGENT_TOKEN`, `VM_ID`, `SOURCE_REPO`, `SOURCE_COMMIT`, mode 0600), runs `server/setup.sh`, sends the setup report, then runs `node server/agent/agent.mjs` as root under a restarting service.
- **Contract 1:** the poll request and reply, a table of job types with payload and result, result delivery, access-result delivery (linking the existing private-result section rather than repeating it), and the setup report.
- **What it never does:** change its own code; open a port; pass `AGENT_TOKEN` to the installer; report installer output beyond the reason word and a `CLOUDFLARE_CALL` line.
- **Forks:** a fork may change the agent and keeps contract 1, or raises `CONTRACT` only after the host supports the new number.

The "What a host may import" table gains `setEnv`, which the agent uses. "What it never does" for `setup.sh` and the installer keeps `/etc/wongstack` and `/opt/wongstack` as the host's and agent's paths. "The size budget" section goes, and the intro's "a host can run WongStack's scripts" line adds the agent.

A test in `scripts/tests/server-agent-contract.test.mjs` reads the README's job table and the agent's `runJob` switch cases and fails on a difference, like the existing end-state check for `setup.sh`.

### Tests

The `vm/*.test.mjs` files move to `scripts/tests/` as `server-agent.test.mjs`, `server-agent-roll.test.mjs`, `server-agent-copy.test.mjs`, `server-agent-management.test.mjs`, and `server-agent-source.test.mjs`, with import paths changed and the poll-body expectations changed to `{ contract, commit, paseo }`. CI already runs `node --test scripts/tests/*.test.mjs` under c8; `.c8rc.json` adds `server/agent/*.mjs` to `include`. Tests that need root, `runuser`, or real systemd stay faked as they are today.

## Risks / Trade-offs

- [A fix to the agent never reaches a running server] → accepted by the user: a rebuild is the update. wongstack.com's dashboard shows the agent's commit.
- [A fork changes the agent and breaks contract 1 without raising `CONTRACT`] → wongstack.com verifies every result against its own records and never trusts a claim, so a broken fork's server fails its own jobs; it cannot affect another owner's. The README says so.
- [A fork's agent runs as root] → no new power: a fork's `setup.sh` already runs as root at build and can read `agent.env`. `AGENT_TOKEN` is scoped to one server.
- [`jobFolder` differs from the host copy's] → the check order above keeps the `access` result; a test pins both the missing and the noreply case.
- [Coverage drops below 85% lines / 81% branches after adding `server/agent/`] → the moved tests covered these files in wongstack-cloud; any gap is filled before `/save`.

## Migration Plan

1. This change ships as a minor WongStack release.
2. wongstack.com's `agent-from-source` moves its `SOURCE_COMMIT` to that release, first-boots from it, and deletes `vm/`.
3. Existing servers keep their old agent until rebuilt.

Rollback: revert this release; wongstack.com keeps its pinned commit, so nothing running changes.

<!-- end design.md -->
<!-- file tasks.md utf8 2513 -->
# Tasks

## 1. Move the agent into server/agent/

- [x] 1.1 Copy `vm/agent.mjs`, `copy.mjs`, `management.mjs`, and `source.mjs` from wongstack-cloud `main` (ff9333d) into `server/agent/`; point the imports at `../install-wongstack.mjs` and `provision.mjs`'s `cloudflare` as design.md says, resolve `WRITE_TOKEN`'s installer path from `import.meta.url`, and check `ownerEmail`/`managementResult` before `jobFolder`; verify `node --check` passes on each file and `oxlint --deny-warnings server` is clean.
- [x] 1.2 Add `export const CONTRACT = 1` and send `{ contract, commit, paseo }` in the poll, with `commit` from `SOURCE_COMMIT` (40 hex, else `null`) and no `features`; verify in 2.1's poll tests.

## 2. Tests

- [x] 2.1 Move the agent's tests to `scripts/tests/server-agent.test.mjs`, `server-agent-roll.test.mjs`, `server-agent-copy.test.mjs`, `server-agent-management.test.mjs`, and `server-agent-source.test.mjs`; change the poll expectations to `{ contract: 1, commit, paseo }`, and add cases for a missing `SOURCE_COMMIT`, an install job missing `ownerEmail` (`failed`/`access`), and a noreply `ownerEmail` (`rejected`); verify `node --test scripts/tests/server-agent*.test.mjs` passes.
- [x] 2.2 Add `server/agent/*.mjs` to `scripts/tests/.c8rc.json`'s `include`; verify the c8 run in CI stays above its thresholds, via `/save`.
- [x] 2.3 Drop the size-budget test from `scripts/tests/server-setup.test.mjs` and its comment; verify that file passes.

## 3. The contract in server/README.md

- [x] 3.1 Add `## The agent` to `server/README.md` as design.md lays out (what runs it, contract 1 with a job-type table, what it never does, forks), add `setEnv` to "What a host may import", drop "The size budget", and update the intro; verify `node scripts/check-payload-links.mjs` passes and every heading linked from elsewhere still exists.
- [x] 3.2 Add `scripts/tests/server-agent-contract.test.mjs`, which fails when the README's job table and `runJob`'s job types differ, naming the type; verify it passes, and fails when a row is removed by hand.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — The server's helper lives in WongStack` entry to `CHANGELOG.md` with an **Updating.** note saying installed repos need nothing; verify the entry sits at the top of the entries.
- [x] 4.2 After `/save`, check CI passes on the PR; then send the wongstack.com chat (large-lion) the PR and the final README section, so `agent-from-source` task 1.1 can reconcile; the release commit follows once it merges.

<!-- end tasks.md -->
<!-- file specs/install-onboarding/spec.md utf8 1175 -->
## REMOVED Requirements

### Requirement: The server script keeps the host contract

**Reason**: Its 12 KiB budget existed so a host could pack `setup.sh` into first-boot data; wongstack.com now downloads the source instead. Replaced by "The server script leaves the host its paths", which keeps every other promise.
**Migration**: None. A fork's `setup.sh` may grow past 12 KiB.

## ADDED Requirements

### Requirement: The server script leaves the host its paths

The script SHALL NOT open an inbound port, touch a host's secret, or write under `/etc/wongstack` or `/opt/wongstack`. It SHALL have no size budget: a host downloads it from the source rather than packing it into first-boot data. `server/README.md` SHALL state the command, the input, the end state, and these limits. `server/` SHALL stay source-only, never installed or synced.

#### Scenario: The script grows past the old budget

- **WHEN** a change makes `server/setup.sh` larger than 12 KiB
- **THEN** the source's tests still pass

#### Scenario: A host's paths stay the host's

- **WHEN** `server/setup.sh` runs on a fresh server
- **THEN** it writes nothing under `/etc/wongstack` or `/opt/wongstack`

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/server-agent/spec.md utf8 3792 -->
# Spec Delta

## Purpose

The WongStack source ships the host agent a server runs to take its control plane's jobs, so a fork owns its servers' agent the way it owns `server/setup.sh`, under a numbered contract the control plane can check.

## ADDED Requirements

### Requirement: The source ships the server agent

The source SHALL ship the host agent under `server/agent/`, with its entry at `server/agent/agent.mjs`, run as root by the host from an unpacked copy of the source. It SHALL reuse the installer's shared helpers from the same source rather than a copy of them. The source's tests SHALL cover it. It SHALL stay out of the payload, so installed repos and `/wong-sync` never receive it.

#### Scenario: The agent runs from the source it came with

- **WHEN** a host unpacks the source at a commit and starts `server/agent/agent.mjs`
- **THEN** the agent runs with no file beyond that copy of the source and the host's `/etc/wongstack/agent.env`

#### Scenario: An installed repo never gets the agent

- **WHEN** WongStack is installed into a repo or synced
- **THEN** no file under `server/agent/` is copied

### Requirement: The agent declares its contract and commit

The agent SHALL export its contract version as `CONTRACT`, an integer, starting at 1. Every poll SHALL send `{ contract, commit, paseo }`: that version, the source commit the host recorded for the build, and whether Paseo is up. It SHALL NOT send a features list. A change to any message's shape SHALL raise `CONTRACT`.

#### Scenario: A poll names the contract and commit

- **WHEN** the agent polls on a server built at commit `abc…` (40 hex)
- **THEN** the request body is `{ contract: 1, commit: "abc…", paseo: "up" | "down" }` and nothing else

### Requirement: The contract is written down

`server/README.md` SHALL document contract 1 as a host and a fork rely on it: the agent's environment, the poll request and reply, each job type with its payload and result, the job-result delivery, the private access-result delivery, the host's setup report, and that the agent never changes itself. A fork that changes the agent SHALL keep to it or raise `CONTRACT`.

#### Scenario: The README and the agent agree

- **WHEN** the agent handles a job type that `server/README.md`'s contract does not list, or the README lists one the agent does not handle
- **THEN** the source's tests fail and name the job type

### Requirement: A running agent never changes itself

The agent SHALL run the source it was built from for the server's life. It SHALL NOT fetch, replace, or restart itself onto other code, and SHALL NOT act on a job that names code for it to run as itself. A rebuild SHALL be the only way a server gets a newer agent.

#### Scenario: The source's branch moves

- **WHEN** the source's default branch gains a commit after a server was built
- **THEN** the server's agent keeps running the build's commit and keeps reporting it

### Requirement: The agent keeps secrets and verification boundaries

The agent SHALL keep today's boundaries: it only calls out, runs a command only through its fixed job switch, rejects an unknown job type, runs the installer as the workspace user with no `AGENT_TOKEN` in its environment, reports only an installer's reason word and a line matching `CLOUDFLARE_CALL`, and sends the private access result only from its exact job-derived file after checking its owner, mode, size, and recipient.

#### Scenario: An unknown job

- **WHEN** a poll reply holds a job of a type the contract does not list
- **THEN** the agent reports it `rejected` and runs nothing

#### Scenario: The installer's environment

- **WHEN** the agent runs the installer for a `cloudflare` job
- **THEN** the installer runs as the workspace user and its environment holds no `AGENT_TOKEN`

<!-- end specs/server-agent/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-30

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 39800 fence=~~~ -->
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
<title>Review · 2026-09-30-server-agent-in-wongstack</title>
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
<body data-change="2026-09-30-server-agent-in-wongstack">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-30-server-agent-in-wongstack</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Each wongstack.com server runs a small helper that takes wongstack.com's requests: pair a device, connect GitHub, install WongStack, copy the server. Today the helper lives in wongstack.com's own code. It is packed onto a server once and never changes, so a fork owner can't change it. Servers built before a newer helper can't connect Cloudflare, and nothing but a rebuild fixes them. Moving the helper here, beside the setup script, lets your fork decide what its servers run. A written, numbered agreement lets wongstack.com check a fork before building from it.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>The helper moves into WongStack, beside the setup script.</b> A server built from WongStack, or from your fork, runs the helper from that same copy at the same version. Change the helper in your fork, and your next server gets your version. A running server keeps the helper it was built with; rebuilding is how it gets a newer one.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0"> WongStack or your fork</span>
<span class="ln" data-note="item-1-line-2" tabindex="0"> ┌──────────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0"> │ server/              │</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> │   setup.sh           │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0"> │   install-wongstack  │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0"> │   agent/  ◀── new    │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0"> └──────────┬───────────┘</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">            │ at build time</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">            ▼</span>
<span class="ln" data-note="item-1-line-10" tabindex="0"> ┌──────────────────────┐</span>
<span class="ln" data-note="item-1-line-11" tabindex="0"> │ your server          │</span>
<span class="ln" data-note="item-1-line-12" tabindex="0"> │ helper, fixed until  │</span>
<span class="ln" data-note="item-1-line-13" tabindex="0"> │ the next rebuild     │</span>
<span class="ln" data-note="item-1-line-14" tabindex="0"> └──────────┬───────────┘</span>
<span class="ln" data-note="item-1-line-15" tabindex="0">            │ &quot;I follow v1,</span>
<span class="ln" data-note="item-1-line-16" tabindex="0">            │  I run abc1234&quot;</span>
<span class="ln" data-note="item-1-line-17" tabindex="0">            ▼</span>
<span class="ln" data-note="item-1-line-18" tabindex="0">       wongstack.com</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>The helper and wongstack.com follow a written agreement, version 1.</b> The server folder's guide spells out each message between them: the check-in, each request and its answer, the private Cloudflare result, and the setup report. The helper says which version it follows and which version of your repo it runs, so wongstack.com can check a fork before building from it. A fork that changes the helper keeps to the agreement, as it does for the setup script.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The setup script loses its size limit.</b> It was capped so a host could pack it into a server's small first-boot data. wongstack.com now downloads it instead, so a fork can grow its setup script freely.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>Nothing changes for an installed repo.</b> The helper stays out of what installs copy, like the setup script.</div></div></li>
</ol>
<p class="aside"><b>Non-goals:</b> a helper that updates itself on a running server; moving existing servers; wongstack.com's side (first boot, checking a fork's helper, the dashboard), which the wongstack.com plan &quot;agent-from-source&quot; covers; changing which version installs WongStack into your repo.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: settled before this chat, the agent and its helpers move to <code>server/agent/</code> with their tests, import the installer's shared names instead of a host copy, and stay out of the payload; a fork gains no new power, since its <code>setup.sh</code> already runs as root and can read the agent token; wongstack.com still verifies everything the agent sends.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: no self-update, no fallback to a previous version, and no supported-versions list in the poll reply, because the user dropped self-update in a review note on the wongstack.com plan (<code>agent-from-source</code>), and the user pointed this chat at that plan.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: the shared names are the wongstack.com plan's: entry <code>server/agent/agent.mjs</code>, <code>export const CONTRACT = 1</code>, the source unpacked root-owned at <code>/opt/wongstack/source</code>, poll request <code>{ contract, commit, paseo }</code> with no <code>features</code>, reply <code>{ jobs, interval }</code>, because both plans must match and that plan said it follows this one's README.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: the agent reports <code>SOURCE_COMMIT</code> from <code>/etc/wongstack/agent.env</code> as its commit, because first boot unpacks a GitHub tarball with no <code>.git</code> to ask.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: wongstack.com keeps writing the systemd unit and running the setup report from its bootstrap, because its plan owns first boot; this README documents both as the host's side of contract 1.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: drop the 12 KiB <code>setup.sh</code> budget, because it existed only for first-boot data and wongstack.com now downloads the script.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: install jobs keep running the installer from a separate workspace-user clone at the job's <code>sourceRepo</code>/<code>sourceCommit</code>, as <code>vm/source.mjs</code> does today, because the wongstack.com plan keeps the installer's commit unchanged.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: this ships as a minor release with a changelog entry, because past <code>server/</code> changes did and wongstack.com pins a release.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: this does not wait for wongstack-cloud PR #47, because #47 changes only the dashboard's first message; the only order is that this ships before wongstack.com's <code>agent-from-source</code>.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: the README says the agent opens no inbound port except <code>copy-send</code>'s one-time listener for the job's peer, instead of a flat &quot;never&quot;, because that job does listen; and <code>payload-manifest.md</code>'s not-copied list names the <code>server/</code> agent, because it is source-only like <code>setup.sh</code>.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-30</p>Check: <code>scripts/tests/.c8rc.json</code> adds <code>server/agent/*.mjs</code> to coverage, because the moved agent must count toward the coverage floor; this tightens the check.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-30</p>Check: <code>server/agent/agent.mjs</code> keeps its <code>c8 ignore</code> on the process entry point, moved unchanged from wongstack-cloud, because only systemd runs that block and the tests call <code>main</code> directly.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: task 4.2 sends the PR and README section before merge and the release commit right after it, because a task must be ticked before the archive and the commit exists only after merge.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: archived for shipping as release 28.4.0, because every task is ticked and the PR's checks passed.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-30</p>Assumed: renumbered to release 28.5.0 after merging main, because 28.4.0 shipped first as tidy-open-threads.</li>
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
