<!-- openspec-archive v1 2026-09-27-server-installer -->
<!-- file proposal.md utf8 8515 -->
# Server installs come from WongStack

**Status:** ready-to-ship
**Branch:** fabulous-tiger
**Open questions:** none

## Why

The hosted cloud sets up WongStack on each customer's server with its own copy of the installer. That copy is stuck on WongStack 20.0.0, and it lives in the cloud's repo, so nobody who forks WongStack can change what it installs. Since then, memory moved into each app's own site, and the old installer doesn't set that up. It also repeats, by hand, the Cloudflare steps `/wong-setup` already does, so the two drift apart.

## What Changes

- **The server installer moves into WongStack.** It sits beside the server setup script. The cloud runs the copy from the WongStack version it pins, as it already does for the setup script. Fork WongStack, change the installer, and your servers install your version.
  ```text
  your WongStack (or your fork)
   ├─ server setup script
   └─ server installer ◀── new home
          │  the cloud runs both
          ▼  from one pinned version
    customer's server
          │
          ▼
    their repo: WongStack, the app,
    memory, and automatic publishing
  ```
- **A server install gets today's WongStack, memory included.** The installer puts in the same WongStack version it came from. It sets up memory the current way: memory lives in the app's own site, the person gets their admin memory key, and full transcripts are kept when Cloudflare storage is on.
- **Setup and the installer share one set of Cloudflare steps.** `/wong-setup` still asks its questions: which account, and whether to create things. It then runs the same code the server installer runs. A fix to one now fixes both.
  ```text
   /wong-setup          server installer
   (asks first)         (choices made ahead)
        │                     │
        └──────────┬──────────┘
                   ▼
        one set of Cloudflare steps
   (memory, databases, config, publishing)
  ```
- **WongStack's own checks cover the installer.** Its tests install today's WongStack into a practice repo, against a pretend Cloudflare. A new WongStack file the installer misses now fails before release, not on a customer's server.
- **One real test before it ships.** We make a throwaway server, install into a throwaway repo, check the site and memory answer, then delete everything.

Non-goals: changing the cloud itself; it moves to the new installer in its own change. The steps `/wong-sync` uses to move older repos stay as they are. How `/wong-setup` copies WongStack's files into a folder doesn't change.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: the source ships an unattended server installer with a host contract beside `server/setup.sh`.
- `cloudflare-provisioning`: one provisioning script does the Cloudflare work for both `/wong-setup` and the server installer.

## Impact

- New: `server/install-wongstack.mjs`, `.agents/skills/wong-setup/scripts/provision.mjs`, and their tests under `scripts/tests/`.
- Changed: `server/README.md` (the installer's host contract), `.agents/skills/wong-setup/references/cloudflare.md` (Steps 2 and 4 call the script), `scripts/tests/.c8rc.json` and `.github/workflows/payload.yml` (lint and coverage reach `server/`), `CHANGELOG.md`.
- Source-only: `server/` and `wong-setup` never reach an installed repo, so `/wong-sync` brings nothing new to targets.
- Downstream: wongstack-cloud drops `vm/install-wongstack.mjs` and runs `server/install-wongstack.mjs` from its pinned commit, in a separate change.

## Decision log

- **2026-09-27** — Asked where the installer should live → chose WongStack, as a pull request here, so a fork owns its server template (settled before this plan).
- **2026-09-27** — Asked where the real server test runs → chose a fresh throwaway server with a throwaway repo, deleted afterward.
- **2026-09-27** — Asked whether `/wong-setup` should use the installer's Cloudflare code → chose yes, share one provisioning script.
- **2026-09-27** — Assumed: the installer installs the WongStack checkout it runs from, its `VERSION` and commit, not a version written in the code, because the cloud already pins a source commit per server, and a fork's installer must install the fork. The request named 26.1.0; `main` is now 26.5.0, so the first release to carry the installer is what it installs.
- **2026-09-27** — Assumed: the host clones the source at its pinned commit into `~/.cache/wong-stack/WongStack` and runs the installer from there, not from a lone file in first-boot data, because the installer now imports the shared provisioning script and reads the payload from that clone. This also drops the first-boot size budget for the installer.
- **2026-09-27** — Assumed: the job on stdin and the last-line reason codes (`done`, `token`, `repo`, `cloudflare`, `push`) stay as they are in wongstack-cloud, because the cloud's agent and dashboard already read them.
- **2026-09-27** — Assumed: the admin memory key goes to the git email of the workspace user, because the cloud sets it from GitHub when the person connects, and setup's runbook uses `git config user.email` too.
- **2026-09-27** — Assumed: the widen always adds `Workers R2 Storage Write`, because the token can't tell whether R2 is on without it, and `.env.example` already lists R2 among provisioning's groups. The real server test confirms both R2 on and off.
- **2026-09-27** — Assumed: the app config is built from the `wrangler.jsonc` fragment in `stack-pack-fragments.md`, and the target's `.env.example` is the source's own, not text written into the code, because the old installer's copies had drifted (it still named a memory Cloudflare token).
- **2026-09-27** — Assumed: a minor release, like `server/setup.sh` in 20.2.0, because it adds a source-only feature and changes setup's runbook.
- **2026-09-27** — Check: `.github/workflows/payload.yml` now lints `server/`, and `scripts/tests/.c8rc.json` counts `server/*.mjs` toward coverage. Both reach new code; no check is loosened.
- **2026-09-27** — Built tasks 1.1–3.3 in a helper: `provision.mjs`, `server/install-wongstack.mjs`, their tests with a pretend Cloudflare, the README contract, the runbook calling the script, and the changelog entry. The full script suite passed locally (434 pass, 11 skipped); oxlint and c8 run only in CI. The "R2 is off" code `10042` is assumed until the real server test confirms it. Saved for task 2.3 (coverage and lint in CI); tasks 4.1–4.2 wait for a green run and the person's OK.
- **2026-09-27** — Real server test passed on a throwaway Hetzner CX23 (fsn1, Ubuntu 24.04), from this branch at `e492af8`. `server/setup.sh` exited 0. The installer printed `done` in 16 s, pushed `feat: install WongStack 26.5.0` to a throwaway private repo, and recorded the memory Worker and bucket. The repo's first Deploy and Test runs passed, the site and `/apps/hello/api/greeting` answered 200, and `memory.mjs digest` read through the Worker with the admin key. A rerun printed `done` with the same commit, a clean tree, the same `.env`, and untouched secrets. No token appeared in the pushed commit or the output.
- **2026-09-27** — Assumed: the "R2 is off" code `10042` stays unconfirmed, because the test account has R2 on and nobody can turn it off by token; the thread stays open in memory.
- **2026-09-27** — Cleanup removed the Hetzner server and SSH key, the Worker `wongstack-install-test` (no staging Worker was ever deployed), the three D1 databases, the memory bucket, and the `wongstack-install-test-deploy` token. The GitHub repo `matthewwong525/wongstack-install-test` still exists: deleting it needs the `delete_repo` scope.
- **2026-09-27** — Deleted the throwaway GitHub repo `matthewwong525/wongstack-install-test` after the person granted `gh` the `delete_repo` scope. Nothing from the test is left standing.
- **2026-09-27** — Distilled: the real-server test steps went into `server/README.md` as *Test a change on a real server*, the page that owns both scripts. No wiki page changed.
- **2026-09-27** — Archive checkpoint for 26.8.0: merged `main` twice (26.6.0 and 26.7.0). The installer builds the wrangler config from the fragment, so it picks up 26.6.0's `disallow_importable_env` flag unchanged. The new tests' temp folders now start with `wong-test-`, the 26.7.0 convention. The full script suite passed locally again (464 pass, 11 skipped).

<!-- end proposal.md -->
<!-- file design.md utf8 8727 -->
## Context

wongstack-cloud writes `vm/install-wongstack.mjs` into each server's first-boot data at `/opt/wongstack/`, and its agent runs it as `wong` with `{token, accountId, repo}` on stdin (see proposal.md — Why). The file pins WongStack 20.0.0 (`521f513`), hardcodes a stale `.env.example` and wrangler config, mints a `<repo>-memory` Cloudflare token for memory, and skips `scaffold.files` (the mini-apps router), which arrived after 20.0.0.

Since 23.0.0, memory is served by the production Worker at `/_memory/*`. `memory.mjs migrate` and `member add --admin --env` reach D1 straight through the Cloudflare API with `CLOUDFLARE_API_TOKEN` once `components.memory.worker` is recorded, so both run before the first deploy (`memory.mjs:409`, `lib/members.mjs`). Setup's runbook ([`cloudflare.md`](../../../.agents/skills/wong-setup/references/cloudflare.md) Steps 2 and 4) describes the same provisioning as prose and `curl` calls that an agent runs.

`server/setup.sh` set the pattern in 20.2.0: the host resolves the source's default branch to a commit, fetches the script at that commit, and runs it. `server/` is source-only.

## Goals / Non-Goals

**Goals:**

- One provisioning script, `.agents/skills/wong-setup/scripts/provision.mjs`, with no dependencies, used by the runbook and by the installer.
- `server/install-wongstack.mjs` installs the clone it runs from, so the version is whatever commit the host checked out.
- Tests in this repo install this checkout's real payload, so drift fails CI.

**Non-Goals:**

- The payload copy stays in the installer. `/wong-setup` still copies files through `/plan` and `/apply`.
- `/wong-sync`'s migration steps (older memory stores, older mini apps) stay prose.
- No change to the cloud's agent, first boot, or dashboard; that is wongstack-cloud's follow-up.

## Decisions

### The installer runs from a clone, not a lone file

The host clones the source (WongStack or a fork) at its pinned commit into `~/.cache/wong-stack/WongStack` as the workspace user, then runs `node ~/.cache/wong-stack/WongStack/server/install-wongstack.mjs` with the job on stdin. The installer reads the source from `import.meta.url`'s checkout: `VERSION`, `git rev-parse HEAD`, and `origin`'s URL for `upstream.repo`. It records `upstream.clone` as `~/.cache/wong-stack/WongStack`, the path `/wong-sync` reads.

*Alternative:* keep one self-contained file in first-boot data that clones the source itself. Rejected: it cannot import the shared script without a copy of it, it keeps a 32 KiB first-boot budget on the installer, and the version it installs would be a second pin next to the host's commit.

The job stays `{token, accountId, repo}`, and the reason codes stay `done`, `token`, `repo`, `cloudflare`, and `push`, printed as the last stdout line with exit 0 only on `done`. `jobFolder` and `run` stay exported for a host that wants to check a job the same way. The repo folder is `~/<name>`, as today.

### One provisioning script, two drivers

`provision.mjs` exports the steps and runs them as a CLI:

| Export / subcommand | Does | Setup's runbook | Installer |
|---|---|---|---|
| `widen` | grants the normal-provision groups, keeps its own two, waits out propagation | Step 2 | yes |
| `accounts` | lists accounts the token sees | Step 3 (the agent asks when several) | skipped: job names it |
| `names --repo <r>` | derives names, reports each as free, ours, or taken | Step 4a (the agent offers a suffix) | picks the first free suffix |
| `provision --base <b>` | memory store (R2 check, database, bucket), subdomain, record's `components.memory`, `migrate`, admin key, both app databases, `app/wrangler.jsonc`, the two `db:migrate:*` scripts, deploy token to the GitHub secret | Step 4b–4d, after the one ask | yes |

Each subcommand prints one JSON report: what it created, what it reused, names, URLs, and R2 on or off. It never prints a token. Errors carry a reason (`token`, `cloudflare`) and a plain cause the runbook maps through the [failure map](../../../.agents/skills/wong-setup/references/failure-map.md). The Cloudflare base URL comes from `WONG_CLOUDFLARE_API` when set, like `memory.mjs`, so tests point it at a fake.

The groups live in the script as constants. A test reads the tables in [`permission-groups.md`](../../../.agents/skills/wong-setup/references/permission-groups.md) (`A normal provision`, `The CI deploy token`) and fails when they differ, beside the existing pin in `downstream-contract.test.mjs`.

*Alternative:* the installer imports functions, and the runbook keeps its `curl` prose. Rejected: the person asked for shared code, and two copies are the drift this change removes.

### Memory, in the runbook's order

1. `GET /accounts/{id}/r2/buckets`: success means R2 is on. The Cloudflare error that says to enable R2 means off; any other failure stops `cloudflare`.
2. Reuse or create the `<base>-memory` database, and the bucket when R2 is on.
3. Get or make the workers.dev subdomain, then write `components.memory` (`accountId`, `databaseId`, `database`, `bucket`, `worker: https://<base>.<subdomain>.workers.dev/_memory`) into `.claude/.wong-stack.json`. A fresh install writes the whole record first.
4. Run the target's `memory.mjs migrate`, retried through propagation.
5. Run `memory.mjs member add "$(git config user.email)" --admin --env`, only when `.env` holds no `wongm_` key, so a rerun keeps the key. No git email stops `repo`.

No memory Cloudflare token is minted. The widen always includes `Workers R2 Storage Write`; the deploy token gets the R2 row only when the store has a bucket, and a rerun that finds a bucket adds the row to an existing deploy token's policy.

### Config from the owning fragments

`app/wrangler.jsonc` is built from the `jsonc` block under `wrangler.jsonc` in [`stack-pack-fragments.md`](../../../.agents/skills/wong-sync/references/stack-pack-fragments.md), with its placeholders filled: names, ids, today's date, `MEMORY_DB`, and `r2_buckets` kept only with a bucket. The file keeps the fragment's comments. A test fails when a placeholder is left, and runs the result through `scripts/lib-wrangler-config.mjs`. The target's `.env.example` is the source's own file. Only an installed repo (`mode: installed`) skips writing config; it keeps its committed files.

### Payload copy reads the list

As today: every category in `payload-files.json`, now including `scaffold.files` and every `exclude`, into a real `.agents/` with `.claude` and `.codex` links, `.nvmrc`, `.gitignore`, the `WONG-STACK` block as `AGENTS.md` with a `CLAUDE.md` link, the two seeded hubs, and `openspec init --tools none`. A file in `seededBySetup` that the installer does not write fails the test.

### Tests

- `scripts/tests/provision.test.mjs`: a fake Cloudflare over HTTP (async `execFile`, per the known `spawnSync` deadlock), a fake `gh` on `PATH`. Covers the widen, a name clash, R2 on and off, reruns after each step, a bucket added later, and no token in any argument, error, or output.
- `scripts/tests/server-install.test.mjs`: installs this checkout into a temp repo with a bare `origin`, then checks every payload path landed, the record, the wrangler config, the pushed commit, a rerun, a repo with other work, and each reason code.
- `.c8rc.json` gains `server/*.mjs`; `payload.yml`'s oxlint gains `server`.

## Risks / Trade-offs

- [The R2 "not enabled" error code is read from the runbook's words, not a captured response] → the real server test runs on an account with R2 off, then on, and the code is pinned in a test from that capture.
- [`member add` needs a git email; a hand run may have none] → stop with `repo` and name the fix in stderr; the README says to set it.
- [The runbook becomes script calls, so an agent loses the step-by-step `curl` it could adapt] → each subcommand's JSON report names what happened, and the failure map still translates causes.
- [A fork that breaks the installer breaks its own servers] → same as `setup.sh`: the README says to keep the contract, and the fork's tests run the installer.

## Migration Plan

1. Ship this as a minor release.
2. Real server test, before merge, from this branch: a throwaway server running `server/setup.sh`, then the installer into a throwaway GitHub repo on the maintainer's Cloudflare account. Check the first deploy, the production URL, `memory.mjs digest` through the Worker, and a rerun. Delete the server, repo, Workers, databases, bucket, and deploy token afterward.
3. wongstack-cloud, separately: clone the pinned commit on the server, run the new path, delete its own `vm/install-wongstack.mjs`.

Rollback: the cloud keeps its own installer until step 3 lands, so reverting this release strands no server.

<!-- end design.md -->
<!-- file tasks.md utf8 3308 -->
# Tasks

## 1. Provisioning script

- [x] 1.1 Write `.agents/skills/wong-setup/scripts/provision.mjs` with the `widen`, `accounts`, `names`, and `provision` exports and subcommands in design.md, porting the tested pieces of wongstack-cloud's `vm/install-wongstack.mjs` (widen, `ensureToken`, `chooseBase`, `database`, `subdomain`) and adding the memory steps, the R2 check and bucket, and the wrangler config built from the fragment. Verify: `node provision.mjs --help` lists the four subcommands.
- [x] 1.2 Write `scripts/tests/provision.test.mjs` with a fake Cloudflare and a fake `gh` covering the cases in design.md's Tests, plus a check that the group constants match both tables in `permission-groups.md`. Verify: the file passes under `node --test`.

## 2. Server installer

- [x] 2.1 Write `server/install-wongstack.mjs`: repo check, `.git/info/exclude` and `.env` first, the payload copy from this clone's `payload-files.json` (with `scaffold.files`), the source's `.env.example`, the hubs, `openspec init`, then `provision.mjs` with the job's account and the first free base, the install record from this clone's `VERSION` and commit, and the commit and push. Keep the job, reason codes, and `jobFolder`/`run` exports. Verify: task 2.2 passes.
- [x] 2.2 Write `scripts/tests/server-install.test.mjs` installing this checkout into a temp repo with a bare `origin`, covering the cases in design.md's Tests and that no token reaches an argument, error, output line, or committed file. Verify: it fails when a `payload-files.json` path is removed from the copy.
- [x] 2.3 Add `server/*.mjs` to `scripts/tests/.c8rc.json` (`src` and `include`) and `server` to the oxlint paths in `.github/workflows/payload.yml`. Verify: coverage stays above the floor in CI, through `/save`.

## 3. Docs and runbook

- [x] 3.1 In `server/README.md`, add the installer's host contract: clone at a commit into `~/.cache/wong-stack/WongStack`, run it as the workspace user, the job on stdin, the last-line codes, the git email it needs, and what it never does. Verify: `node scripts/check-payload-links.mjs` passes.
- [x] 3.2 Rewrite Steps 2 and 4a–4d of `.agents/skills/wong-setup/references/cloudflare.md` to call `provision.mjs`, keeping the account question, the one billable ask, the suffix offer, and the boundaries; point `permission-groups.md` at the script's check. Grep `wong-setup` by hand for any heading anchor it changed, since the link check skips it.
- [x] 3.3 Add a `## Next (minor) — Server installs come from WongStack` entry at the top of `CHANGELOG.md`, with an **Updating** line saying installed repos get nothing new and hosts move to `server/install-wongstack.mjs`.

## 4. Real server test

- [x] 4.1 After `/save` is green, confirm with the person, then make a throwaway Ubuntu 24.04 server, run `server/setup.sh`, clone this branch into `~/.cache/wong-stack/WongStack` as `wong`, and run the installer into a throwaway private GitHub repo. Check the first deploy, the production URL, `memory.mjs digest` through the Worker, and a rerun that prints `done` and changes nothing. Record the R2 error code seen; pin it in 1.2's test.
- [x] 4.2 Delete the server, the GitHub repo, and the test's Workers, databases, bucket, and deploy token, and list what was removed in the change's Decision log.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 941 -->
## ADDED Requirements

### Requirement: Setup and the server installer provision the same way

`/wong-setup` and the server installer SHALL create the same Cloudflare resources, names, app config, memory store, and deploy token through one shared script, so a fix to provisioning reaches both. Setup SHALL keep its questions: which account when there are several, and one ask before anything billable. The installer SHALL take those choices from its job, and SHALL pick the first free name suffix instead of asking when a derived name is taken.

#### Scenario: Setup provisions

- **WHEN** a person approves provisioning during `/wong-setup`
- **THEN** setup runs the shared script and reports what it created and what it reused

#### Scenario: A taken name on a server

- **WHEN** the server installer finds a derived name held by another project
- **THEN** it uses the next free suffix for every name and touches nothing it did not create

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 2066 -->
## ADDED Requirements

### Requirement: The server installer installs WongStack unattended

The source SHALL ship a server installer that, run as the workspace user from a clone of the source, installs that clone's WongStack into an empty GitHub repo with no question: the full payload, the install record naming the clone's version and commit, the app's Cloudflare hosting, a memory store served by the production Worker with the person's admin memory key in `.env`, and the CI deploy token as a GitHub secret. It SHALL commit the install on `main` and push it. A second run SHALL finish a first run that stopped, and SHALL leave a repo it already pushed untouched. It SHALL refuse a repo that already holds other work.

#### Scenario: A fresh repo

- **WHEN** a host runs the installer for an empty repo with a valid Cloudflare token and account
- **THEN** the repo's `main` holds the install, its record names the source's version, commit, and memory Worker, and the last output line is `done`

#### Scenario: A repo with other work

- **WHEN** the repo already has commits the installer did not make
- **THEN** it changes nothing and its last output line is `repo`

### Requirement: The server installer keeps the host contract

`server/README.md` SHALL state how a host runs the installer, the job it reads on stdin, the one-word last line it prints for each outcome, and what it never does. The installer SHALL NOT put a token value in a command's arguments, an error, its output, or a committed file, and SHALL NOT write under `/etc/wongstack` or `/opt/wongstack`. The source's tests SHALL install the current payload with it, so a payload file the installer misses fails before release.

#### Scenario: A token in the job

- **WHEN** the installer runs with a Cloudflare token on stdin
- **THEN** no argument list, error, output line, or committed file holds the token or any token it minted

#### Scenario: The payload gains a file

- **WHEN** a change adds a payload file the installer does not install
- **THEN** the source's tests fail and name the file

<!-- end specs/install-onboarding/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41138 fence=~~~ -->
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
<title>Review · 2026-09-27-server-installer</title>
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
  .session { color:var(--muted); font-size:13px; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-09-27-server-installer">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-server-installer</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The hosted cloud sets up WongStack on each customer's server with its own copy of the installer. That copy is stuck on WongStack 20.0.0, and it lives in the cloud's repo, so nobody who forks WongStack can change what it installs. Since then, memory moved into each app's own site, and the old installer doesn't set that up. It also repeats, by hand, the Cloudflare steps <code>/wong-setup</code> already does, so the two drift apart.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>The server installer moves into WongStack.</b> It sits beside the server setup script. The cloud runs the copy from the WongStack version it pins, as it already does for the setup script. Fork WongStack, change the installer, and your servers install your version.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">your WongStack (or your fork)</span>
<span class="ln" data-note="item-1-line-2" tabindex="0"> ├─ server setup script</span>
<span class="ln" data-note="item-1-line-3" tabindex="0"> └─ server installer ◀── new home</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">        │  the cloud runs both</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">        ▼  from one pinned version</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">  customer's server</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">        │</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">        ▼</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">  their repo: WongStack, the app,</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">  memory, and automatic publishing</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A server install gets today's WongStack, memory included.</b> The installer puts in the same WongStack version it came from. It sets up memory the current way: memory lives in the app's own site, the person gets their admin memory key, and full transcripts are kept when Cloudflare storage is on.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Setup and the installer share one set of Cloudflare steps.</b> <code>/wong-setup</code> still asks its questions: which account, and whether to create things. It then runs the same code the server installer runs. A fix to one now fixes both.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0"> /wong-setup          server installer</span>
<span class="ln" data-note="item-3-line-2" tabindex="0"> (asks first)         (choices made ahead)</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">      │                     │</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">      └──────────┬──────────┘</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">                 ▼</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">      one set of Cloudflare steps</span>
<span class="ln" data-note="item-3-line-7" tabindex="0"> (memory, databases, config, publishing)</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>WongStack's own checks cover the installer.</b> Its tests install today's WongStack into a practice repo, against a pretend Cloudflare. A new WongStack file the installer misses now fails before release, not on a customer's server.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>One real test before it ships.</b> We make a throwaway server, install into a throwaway repo, check the site and memory answer, then delete everything.</div></div></li>
</ol>
<p class="aside">Non-goals: changing the cloud itself; it moves to the new installer in its own change. The steps <code>/wong-sync</code> uses to move older repos stay as they are. How <code>/wong-setup</code> copies WongStack's files into a folder doesn't change.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked where the installer should live → chose WongStack, as a pull request here, so a fork owns its server template (settled before this plan).</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked where the real server test runs → chose a fresh throwaway server with a throwaway repo, deleted afterward.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked whether <code>/wong-setup</code> should use the installer's Cloudflare code → chose yes, share one provisioning script.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the installer installs the WongStack checkout it runs from, its <code>VERSION</code> and commit, not a version written in the code, because the cloud already pins a source commit per server, and a fork's installer must install the fork. The request named 26.1.0; <code>main</code> is now 26.5.0, so the first release to carry the installer is what it installs.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the host clones the source at its pinned commit into <code>~/.cache/wong-stack/WongStack</code> and runs the installer from there, not from a lone file in first-boot data, because the installer now imports the shared provisioning script and reads the payload from that clone. This also drops the first-boot size budget for the installer.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the job on stdin and the last-line reason codes (<code>done</code>, <code>token</code>, <code>repo</code>, <code>cloudflare</code>, <code>push</code>) stay as they are in wongstack-cloud, because the cloud's agent and dashboard already read them.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the admin memory key goes to the git email of the workspace user, because the cloud sets it from GitHub when the person connects, and setup's runbook uses <code>git config user.email</code> too.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the widen always adds <code>Workers R2 Storage Write</code>, because the token can't tell whether R2 is on without it, and <code>.env.example</code> already lists R2 among provisioning's groups. The real server test confirms both R2 on and off.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the app config is built from the <code>wrangler.jsonc</code> fragment in <code>stack-pack-fragments.md</code>, and the target's <code>.env.example</code> is the source's own, not text written into the code, because the old installer's copies had drifted (it still named a memory Cloudflare token).</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a minor release, like <code>server/setup.sh</code> in 20.2.0, because it adds a source-only feature and changes setup's runbook.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-09-27</p>Check: <code>.github/workflows/payload.yml</code> now lints <code>server/</code>, and <code>scripts/tests/.c8rc.json</code> counts <code>server/*.mjs</code> toward coverage. Both reach new code; no check is loosened.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Built tasks 1.1–3.3 in a helper: <code>provision.mjs</code>, <code>server/install-wongstack.mjs</code>, their tests with a pretend Cloudflare, the README contract, the runbook calling the script, and the changelog entry. The full script suite passed locally (434 pass, 11 skipped); oxlint and c8 run only in CI. The &quot;R2 is off&quot; code <code>10042</code> is assumed until the real server test confirms it. Saved for task 2.3 (coverage and lint in CI); tasks 4.1–4.2 wait for a green run and the person's OK.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Real server test passed on a throwaway Hetzner CX23 (fsn1, Ubuntu 24.04), from this branch at <code>e492af8</code>. <code>server/setup.sh</code> exited 0. The installer printed <code>done</code> in 16 s, pushed <code>feat: install WongStack 26.5.0</code> to a throwaway private repo, and recorded the memory Worker and bucket. The repo's first Deploy and Test runs passed, the site and <code>/apps/hello/api/greeting</code> answered 200, and <code>memory.mjs digest</code> read through the Worker with the admin key. A rerun printed <code>done</code> with the same commit, a clean tree, the same <code>.env</code>, and untouched secrets. No token appeared in the pushed commit or the output.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the &quot;R2 is off&quot; code <code>10042</code> stays unconfirmed, because the test account has R2 on and nobody can turn it off by token; the thread stays open in memory.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Cleanup removed the Hetzner server and SSH key, the Worker <code>wongstack-install-test</code> (no staging Worker was ever deployed), the three D1 databases, the memory bucket, and the <code>wongstack-install-test-deploy</code> token. The GitHub repo <code>matthewwong525/wongstack-install-test</code> still exists: deleting it needs the <code>delete_repo</code> scope.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Deleted the throwaway GitHub repo <code>matthewwong525/wongstack-install-test</code> after the person granted <code>gh</code> the <code>delete_repo</code> scope. Nothing from the test is left standing.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled: the real-server test steps went into <code>server/README.md</code> as <i>Test a change on a real server</i>, the page that owns both scripts. No wiki page changed.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archive checkpoint for 26.8.0: merged <code>main</code> twice (26.6.0 and 26.7.0). The installer builds the wrangler config from the fragment, so it picks up 26.6.0's <code>disallow_importable_env</code> flag unchanged. The new tests' temp folders now start with <code>wong-test-</code>, the 26.7.0 convention. The full script suite passed locally again (464 pass, 11 skipped).</li>
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
  <textarea aria-label="Note text" rows="3" placeholder="What should change here?"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
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
    const count = n + (n === 1 ? ' note' : ' notes') + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
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

  // ── copy: saved notes only, as a plain request to update the plan ──
  function notesText() {
    const lines = ['Update the plan ' + CHANGE + ' with these notes from the review page. Don\'t build yet.'];
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
  $('copy').addEventListener('click', function () {
    const n = data.notes.length, buf = $('copybuf');
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    buf.value = notesText();
    const done = function () { toast('Copied ' + n + (n === 1 ? ' note' : ' notes') + '. Paste them into chat to update the plan.'); };
    const fallback = function () { buf.select(); if (document.execCommand('copy')) done(); else toast('Copy failed. Copy the notes list by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
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
