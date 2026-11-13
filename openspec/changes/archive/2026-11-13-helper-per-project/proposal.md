# Each project runs its own background helper, so "Keep my chats in line" starts again

## Why

Every "Keep my chats in line" run in WongStack and relay-ring stops with "needs your OK", though you gave the OK. One background helper serves every project on this computer, and it now runs ClaymooApp's copy. That copy looks for your sign-in only where ClaymooApp keeps it, so it finds no one signed in to the WongStack and relay-ring apps and refuses their runs. WongOS runs its own helper, so its runs start. The same fix was written on 2026-11-06 but never went live.

## What Changes

- **Each project gets its own helper.** It runs that project's own code and sign-in, and serves only that project's app, schedules and inbox taps. Another project's update can no longer stop your schedules.
  ```mermaid
  flowchart LR
    subgraph Today
      h1["one helper: ClaymooApp's copy"] --> a1["WongStack: needs your OK"]
      h1 --> r1["relay-ring: needs your OK"]
      h1 --> c1["ClaymooApp: runs"]
    end
    subgraph After
      h2["WongStack's helper"] --> a2["WongStack: runs"]
      h3["relay-ring's helper"] --> r2["relay-ring: runs"]
      h4["shared helper"] --> c2["ClaymooApp: runs"]
    end
  ```
- **Nothing to approve again.** Your OKs stay in one file for all projects, because each OK names its app. A project's helper takes over the list of runs that already started, so no run starts twice and no schedule runs sooner than it may. Each inbox tap still arrives once.
  ```mermaid
  sequenceDiagram
    participant S as Shared helper
    participant P as WongStack's helper
    P->>S: take WongStack off your list
    P->>P: copy started runs and open taps
    Note over S: serves only the projects with no helper of their own
  ```
- **A run that can't see your sign-in says so.** When this computer isn't signed in to the app, the run shows "didn't start, this computer isn't signed in", not "needs your OK". An OK can't fix that, so the page no longer asks for one.
  ```screen
  <div class="card col gap phone">
    <div class="row gap"><h3>Keep my chats in line</h3><span class="tag-outline">every 5 min</span></div>
    <div class="muted">11:25 · didn't start, this computer isn't signed in</div>
  </div>
  ```
  No real picture: the Inbox's schedule list shows this line only after a blocked run, and no route here makes one.
- **WongStack and relay-ring get their helpers on this computer.** After the fix is live, WongStack's main folder takes it and installs its helper. Then relay-ring takes the update and installs its own. Each install asks first. Their line-up runs start again.
  ```mermaid
  flowchart TD
    f["fix is live"] --> w["WongStack: install helper"]
    w --> s["relay-ring: update, install helper"]
    s --> ok["both line-ups start"]
  ```

Non-goals: change how you give an OK; change the shared private-link page server; stop test folders from adding themselves to the shared helper's list.

## What the build needs

- **Nothing.** Ready: the sign-ins to the WongStack and relay-ring apps are on this computer, and the OKs for both line-ups are saved.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `live-line`: the background helper becomes one per project; each serves only its own project's app, schedules and inbox taps; a project with its own helper leaves the shared one; a run refused for no sign-in says so.

## Impact

- **Code:** `.agents/skills/reply-link/scripts/{helper.mjs,reply-link.mjs,lib/computer.mjs}` and the helper log; `.agents/inbox/runs.mjs`; `.agents/plugins/daily/skills/schedule/scripts/schedule.mjs` (the OK's helper paths); `app/src/apps/inbox/cadence.ts`; their tests in `scripts/tests/` and `app/src/apps/inbox/`.
- **Docs:** `wiki/stack/live-line.md`, `wiki/stack/host-schedules.md`.
- **Each install:** `helper.mjs install` once, at a quiet minute, in each project that used the shared helper. The release note for `/wong-sync` offers it.
- **This computer:** `wongstack-helper@<id>.service` for WongStack and for relay-ring.
- **Supersedes:** PR #529 (the 2026-11-06 copy of this fix, on code from v50.5.0).

## Decision log

- **2026-11-13** — Asked whether this work should also update relay-ring and start its own helper after the fix is live → chose yes, as the last step, asking once before relay-ring changes.
- **2026-11-13** — Assumed: one helper per project, as decided in the 2026-11-06 plan (PR #529), over one shared helper that asks each project for its sign-in, because a shared helper still lets one project's code judge another project's runs.
- **2026-11-13** — Assumed: build from WongOS's working copy (`/root/WongOS`, on WongStack 59), not by rebasing PR #529, because WongOS has run it on this computer since 2026-11-06 and its layout matches current code; `runs.mjs` and `approvals.mjs` are the same in both.
- **2026-11-13** — Assumed: current code never points the shared helper at its own copy; it only restarts it when it stopped, because moving it between projects' copies is the race that caused this bug, and a test clone could otherwise move it off ClaymooApp's copy and block ClaymooApp's runs.
- **2026-11-13** — Assumed: `PROTOCOL` goes to 16, as in WongOS, where 16 means one helper per project; a project's own helper compares it only with that project's copies.
- **2026-11-13** — Assumed: a run refused because no one is signed in reports `not_signed_in`, because "needs your OK" sent the person to give an OK that could not help.
- **2026-11-13** — Assumed: close PR #529 when this ships, after a yes, because this change replaces it.
- **2026-11-13** — Assumed: the stray `daily.mjs serve` from `/tmp/iwp/55` stays out of scope: it takes only its own folder's runs, so it does not cause this.
- **2026-11-13** — Assumed (inside `/ship`): the go-live steps (install WongStack's helper, update relay-ring and install its helper, see both line-ups start, close PR #529) run after the merge, each after a yes, as the design's Migration Plan says, not as tasks, because a task must be done before the change is archived and these need the fix live first.
- **2026-11-13** — Assumed (inside `/ship`, build): `pointCurrent` now moves only a project's own launcher; its shared branch is gone, because no caller may move the shared one.
- **2026-11-13** — Check: dropped the helper test that the shared launcher, still naming the old hand-over script, is pointed at reply-link's, and its two `scripts/retired-names.json` exceptions, because the shared launcher is never moved now.
- **2026-11-13** — Assumed (inside `/ship`, build): the helper's rounds find each folder's main checkout through `computer.mjs`'s per-folder cache, not two `git` calls each round, because the extra calls made the round-gap test in `live-line.test.mjs` flaky under the full suite.
- **2026-11-13** — Assumed (inside `/ship`, build): WongOS's and ClaymooApp's names in ported code, tests and the wiki became `myapp` and `shop`, because `private-names.test.mjs` keeps private names out of live files.
- **2026-11-13** — Assumed (inside `/ship`): 4.1 ticked with every local check passing but `module-versions`, which fails only because `origin/main` gained browser 3.3.0 after this branch was cut; `/ship`'s prepare merges `main` and reruns every local check before the save.
