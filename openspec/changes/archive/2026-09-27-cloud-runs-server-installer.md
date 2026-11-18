<!-- openspec-archive v1 2026-09-27-cloud-runs-server-installer -->
<!-- file proposal.md utf8 5346 -->
# The cloud can run WongStack's server installer

**Status:** ready-to-ship
**Branch:** chatty-cheetah
**Open questions:** none

## Why

The hosted cloud still installs WongStack with its own old copy of the server installer. It wants to run WongStack's installer instead, from the same WongStack version it already pins for server setup. Three gaps stop it: our installer can give up too early right after it widens the person's Cloudflare token, it doesn't say which Cloudflare step failed, and it lacks one piece the cloud's server program reads from it.

## What Changes

- **A new token gets a minute to start working.** Right after the installer widens a token, Cloudflare can refuse calls for a few seconds with a different answer than we expected. It now waits that out, as it already did for the other answer. `/wong-setup` shares the same Cloudflare steps, so setup gets the fix too.
  ```text
  widen the token
        │
        ▼
  try ──▶ refused? ──▶ wait 2, 4, 8,
   ▲       (either      15, 30 s
   │        answer)         │
   └────────────────────────┘
        │ works
        ▼
  carry on installing
  ```
- **A failed install names the Cloudflare step.** When Cloudflare refuses a call, the installer's output names that call and Cloudflare's error codes, just before the one-word reason. The cloud shows this line to the person. It never holds a token or a search term.
  ```text
  Cloudflare PUT /user/tokens/abc: HTTP 403 9109
  cloudflare
  ```
- **The cloud can drop its own copy.** The installer offers every piece the cloud's server program uses from it today, including the pattern that checks that failure line. The installer's contract page says all of this.

Non-goals: the cloud's own switch to this installer, which its own chat plans and ships. Retrying calls later in the install, beyond the check right after the widen.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `cloudflare-provisioning`: the post-widen propagation retry covers `401` as well as `403`.
- `install-onboarding`: the server installer's host contract adds the refused-call line before the reason word, and the exports a host imports.

## Impact

- Changed: `.agents/skills/wong-setup/scripts/provision.mjs` (retry on `401` or `403`), `server/install-wongstack.mjs` (the refused-call line; exports `CLOUDFLARE_CALL`), `server/README.md` (the host contract), `.agents/skills/wong-setup/references/permission-groups.md` (the propagation note), `CHANGELOG.md`.
- Tests: `scripts/tests/provision.test.mjs`, `scripts/tests/server-install.test.mjs`, and the fake in `scripts/tests/fixtures/cloudflare.mjs`.
- Source-only: `server/` and `wong-setup` never reach an installed repo, so `/wong-sync` brings nothing new to targets.
- Downstream: wongstack-cloud drops `vm/install-wongstack.mjs` and pins the commit that ships this, in its own change (workspace regular-goat).

## Decision log

- **2026-09-27** — Asked where server install changes belong → chose WongStack: wongstack-cloud drops its `vm/install-wongstack.mjs` and runs `server/install-wongstack.mjs` from a WongStack clone at the commit it pins for `server/setup.sh` (settled before this plan).
- **2026-09-27** — Assumed: the propagation retry treats `401` and `403` alike, only on the probe after the widen, because that is where the 401-then-200 was seen (2.8 s), and wongstack-cloud's installer after its PR #17 does the same. A bad token still fails fast: `/user/tokens/verify` runs before the widen and is not retried.
- **2026-09-27** — Assumed: the installer prints the refused-call line only when it matches wongstack-cloud's `CLOUDFLARE_CALL` pattern, and exports that pattern, because the host already imports it and the Worker checks the same shape. An unreachable Cloudflare, or any other stop, prints the reason alone.
- **2026-09-27** — Assumed: the host relies on `run`, `jobFolder`, `repoFolder`, and `CLOUDFLARE_CALL` and nothing else, from reading `vm/agent.mjs` on `test-end-to-end-workflow`. Upstream's `run` already takes `input` and `timeout` and rejects with `stdout` on the error, which the host reads.
- **2026-09-27** — Assumed: a patch release, because it fixes source-only scripts and adds one line to the installer's output without changing its last line.
- **2026-09-27** — Assumed: no real-server test in this change, because the fake Cloudflare covers each fix, and wongstack-cloud's switch runs the installer end to end on a real server before it ships.
- **2026-09-27** — Built tasks 1.1–3.4 in a helper. The two test files pass (50/50), as do the other tests that read these files (115 in all), `check-payload-links`, `check-openspec-config`, and `check-retired-names`. The plan had said the pattern refuses `_`; it allows it, so a refused `/user/tokens/permission_groups` call prints its line too. The wording here and in the design is corrected.
- **2026-09-27** — Distilled: no fact on the change in memory; the one repeatable fact, that a widen's propagation refuses with `401` or `403`, is in `.agents/skills/wong-setup/references/permission-groups.md` from task 3.2. No wiki page changed.
- **2026-09-27** — Archive checkpoint for 26.16.1: archived by `/ship`, which synced both spec deltas into `openspec/specs/`.

<!-- end proposal.md -->
<!-- file design.md utf8 2811 -->
# Design

## Context

wongstack-cloud's `vm/agent.mjs` (branch `test-end-to-end-workflow`, PR #17) imports four names from the installer beside it: `CLOUDFLARE_CALL`, `jobFolder`, `repoFolder`, and `run`. It runs the installer as `wong` with `runuser … node <installer>`, passes `{ input, timeout }`, and on a non-zero exit reads only `error.stdout`: the last line is the reason, and the line before it becomes `detail` when `CLOUDFLARE_CALL.test(line)`.

Upstream `server/install-wongstack.mjs` already exports `run` (re-exported from `provision.mjs`), `jobFolder`, and `repoFolder`. Its `run` takes `input`, `timeout`, and `env`, and rejects with `{ stdout, stderr }` on the error, so the host's use works unchanged. It lacks `CLOUDFLARE_CALL`, prints only the reason word, and `provision.mjs`'s `widen` retries the post-widen probe on `403` alone.

## Goals / Non-Goals

**Goals:**

- The installer is a drop-in for wongstack-cloud's copy: same imports, same stdout shape.
- The post-widen probe waits out `401` as well as `403`, for setup and the installer alike.

**Non-Goals:**

- Changing wongstack-cloud; its own change moves the agent's import and `INSTALLER` path to the clone.
- Retrying later calls (`names`, `provision`) on `401`.

## Decisions

- **`pending` replaces `forbidden` in `provision.mjs`:** `error instanceof CloudflareError && (error.status === 401 || error.status === 403)`. It guards only the probe in `widen`, as now. `/user/tokens/verify` runs before it inside `step('token')`, so a bad token still stops at once with `token`.
- **`CLOUDFLARE_CALL` lives in the installer**, since it is the installer's stdout contract, copied verbatim from wongstack-cloud: `/^Cloudflare (GET|POST|PUT|PATCH|DELETE) \/[A-Za-z0-9/._:-]{1,200}: HTTP \d{3}( \d+(,\d+)*)?$/`.
- **`main` tests the stop's message, not its cause.** `step()` in both files wraps a `CloudflareError` into a `ProvisionError` with the same message, so `if (CLOUDFLARE_CALL.test(error.message)) out(error.message)` before `out(reason)` needs no new field. The pattern is the safety net: a `run` failure starts with the command name, a hand-written `ProvisionError` has no method, and `CloudflareError` already drops the query. Alternative: carry `cause` on `ProvisionError`; more code for the same line.
- **The fake gets a status knob.** `forbiddenPolls` becomes `refusedPolls` plus `refusedStatus` (default `403`), so one test covers `401` and the existing ones keep `403`.

## Risks / Trade-offs

- [A `401` that is not propagation now waits about a minute before failing] → only after `verify` and the widen succeeded, where a real `401` is rare; the reason word stays `cloudflare`.
- [Other calls may lag after the probe passes] → out of scope; wongstack-cloud's installer ran the same way on its end-to-end test.

<!-- end design.md -->
<!-- file tasks.md utf8 1759 -->
# Tasks

## 1. Provisioning script

- [x] 1.1 In `.agents/skills/wong-setup/scripts/provision.mjs`, replace `forbidden` with `pending` (`401` or `403`) for the post-widen probe retry, and say why in one comment.
- [x] 1.2 In `scripts/tests/fixtures/cloudflare.mjs`, rename `forbiddenPolls` to `refusedPolls` with a `refusedStatus` (default `403`, code `10000`), and update its doc comment.
- [x] 1.3 In `scripts/tests/provision.test.mjs`, cover a `401` then success (sleeps `[2000]`), keep the `403` cases, and assert an error that is neither is not retried.

## 2. Server installer

- [x] 2.1 In `server/install-wongstack.mjs`, export `CLOUDFLARE_CALL` (the pattern verbatim from wongstack-cloud), and in `main` print a stop's message before the reason when it matches.
- [x] 2.2 In `scripts/tests/server-install.test.mjs`, cover: a refused call prints the call line then `cloudflare`, with no token or query in it; a `repo` stop and an unreachable Cloudflare print the reason alone; the four names the host imports are exported.

## 3. Docs and release

- [x] 3.1 In `server/README.md`, add the refused-call line under *The last line*, and list the names a host may import (`run`, `jobFolder`, `repoFolder`, `CLOUDFLARE_CALL`).
- [x] 3.2 In `.agents/skills/wong-setup/references/permission-groups.md`, say the propagation window refuses with `401` (code `10000`) or `403`.
- [x] 3.3 Add a `## Next (patch) — The cloud can run WongStack's server installer` entry to `CHANGELOG.md`, with an **Updating.** note for a host: pin the commit that ships this and import from the clone.
- [x] 3.4 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and the two test files with `TMPDIR=/var/tmp`; `/save` runs the full gate in CI.

<!-- end tasks.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 969 -->
## MODIFIED Requirements

### Requirement: Token mistakes are named in plain words

The token SHALL be verified before any other step, and a failure SHALL name its cause and the one fix instead of the raw API error. An early authorization failure right after a widen, `401` or `403`, SHALL be retried as propagation before it is reported.

#### Scenario: Account-scoped token

- **WHEN** the token was made under the account instead of My Profile
- **THEN** the person is told that and given the right route

#### Scenario: No account in the token's resources

- **WHEN** the token is valid but sees no account
- **THEN** the person is told to set Account Resources and nothing is provisioned

#### Scenario: A widened token is refused for a few seconds

- **WHEN** Cloudflare answers the first check after a widen with `401` or `403`, then with success
- **THEN** provisioning waits it out and carries on, and reports a failure only when the last try is still refused

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/install-onboarding/spec.md utf8 1483 -->
## MODIFIED Requirements

### Requirement: The server installer keeps the host contract

`server/README.md` SHALL state how a host runs the installer, the job it reads on stdin, the one-word last line it prints for each outcome, the refused-call line before it, the names a host may import from it, and what it never does. When a refused Cloudflare call stops the install, the installer SHALL print that call as `Cloudflare <METHOD> <path>: HTTP <status> <codes>` on the line before the reason, only when the line matches the `CLOUDFLARE_CALL` pattern it exports. The installer SHALL NOT put a token value in a command's arguments, an error, its output, or a committed file, and SHALL NOT write under `/etc/wongstack` or `/opt/wongstack`. The source's tests SHALL install the current payload with it, so a payload file the installer misses fails before release.

#### Scenario: A token in the job

- **WHEN** the installer runs with a Cloudflare token on stdin
- **THEN** no argument list, error, output line, or committed file holds the token or any token it minted

#### Scenario: The payload gains a file

- **WHEN** a change adds a payload file the installer does not install
- **THEN** the source's tests fail and name the file

#### Scenario: Cloudflare refuses a call

- **WHEN** Cloudflare refuses a call and the install stops
- **THEN** the second-last line names the method, the path without its query, the status, and the error codes, and the last line is the reason word

<!-- end specs/install-onboarding/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-09-27

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 35945 fence=~~~ -->
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
<title>Review · 2026-09-27-cloud-runs-server-installer</title>
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
<body data-change="2026-09-27-cloud-runs-server-installer">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-09-27-cloud-runs-server-installer</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">The hosted cloud still installs WongStack with its own old copy of the server installer. It wants to run WongStack's installer instead, from the same WongStack version it already pins for server setup. Three gaps stop it: our installer can give up too early right after it widens the person's Cloudflare token, it doesn't say which Cloudflare step failed, and it lacks one piece the cloud's server program reads from it.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>A new token gets a minute to start working.</b> Right after the installer widens a token, Cloudflare can refuse calls for a few seconds with a different answer than we expected. It now waits that out, as it already did for the other answer. <code>/wong-setup</code> shares the same Cloudflare steps, so setup gets the fix too.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">widen the token</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">      │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">try ──▶ refused? ──▶ wait 2, 4, 8,</span>
<span class="ln" data-note="item-1-line-5" tabindex="0"> ▲       (either      15, 30 s</span>
<span class="ln" data-note="item-1-line-6" tabindex="0"> │        answer)         │</span>
<span class="ln" data-note="item-1-line-7" tabindex="0"> └────────────────────────┘</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">      │ works</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">      ▼</span>
<span class="ln" data-note="item-1-line-10" tabindex="0">carry on installing</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A failed install names the Cloudflare step.</b> When Cloudflare refuses a call, the installer's output names that call and Cloudflare's error codes, just before the one-word reason. The cloud shows this line to the person. It never holds a token or a search term.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">Cloudflare PUT /user/tokens/abc: HTTP 403 9109</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">cloudflare</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>The cloud can drop its own copy.</b> The installer offers every piece the cloud's server program uses from it today, including the pattern that checks that failure line. The installer's contract page says all of this.</div></div></li>
</ol>
<p class="aside">Non-goals: the cloud's own switch to this installer, which its own chat plans and ships. Retrying calls later in the install, beyond the check right after the widen.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-09-27</p>Asked where server install changes belong → chose WongStack: wongstack-cloud drops its <code>vm/install-wongstack.mjs</code> and runs <code>server/install-wongstack.mjs</code> from a WongStack clone at the commit it pins for <code>server/setup.sh</code> (settled before this plan).</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the propagation retry treats <code>401</code> and <code>403</code> alike, only on the probe after the widen, because that is where the 401-then-200 was seen (2.8 s), and wongstack-cloud's installer after its PR #17 does the same. A bad token still fails fast: <code>/user/tokens/verify</code> runs before the widen and is not retried.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the installer prints the refused-call line only when it matches wongstack-cloud's <code>CLOUDFLARE_CALL</code> pattern, and exports that pattern, because the host already imports it and the Worker checks the same shape. An unreachable Cloudflare, or any other stop, prints the reason alone.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: the host relies on <code>run</code>, <code>jobFolder</code>, <code>repoFolder</code>, and <code>CLOUDFLARE_CALL</code> and nothing else, from reading <code>vm/agent.mjs</code> on <code>test-end-to-end-workflow</code>. Upstream's <code>run</code> already takes <code>input</code> and <code>timeout</code> and rejects with <code>stdout</code> on the error, which the host reads.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: a patch release, because it fixes source-only scripts and adds one line to the installer's output without changing its last line.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-09-27</p>Assumed: no real-server test in this change, because the fake Cloudflare covers each fix, and wongstack-cloud's switch runs the installer end to end on a real server before it ships.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Built tasks 1.1–3.4 in a helper. The two test files pass (50/50), as do the other tests that read these files (115 in all), <code>check-payload-links</code>, <code>check-openspec-config</code>, and <code>check-retired-names</code>. The plan had said the pattern refuses <code>_</code>; it allows it, so a refused <code>/user/tokens/permission_groups</code> call prints its line too. The wording here and in the design is corrected.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Distilled: no fact on the change in memory; the one repeatable fact, that a widen's propagation refuses with <code>401</code> or <code>403</code>, is in <code>.agents/skills/wong-setup/references/permission-groups.md</code> from task 3.2. No wiki page changed.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-09-27</p>Archive checkpoint for 26.16.1: archived by <code>/ship</code>, which synced both spec deltas into <code>openspec/specs/</code>.</li>
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
