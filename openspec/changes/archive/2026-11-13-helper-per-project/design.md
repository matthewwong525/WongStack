# Design

## Context

What was found on 2026-11-13, on this computer:

- `wongstack-helper.service` runs `~/.wong-stack/helper/run.mjs`, which starts the script in `~/.wong-stack/helper/current.json`: `/root/ClaymooApp/.agents/skills/reply-link/scripts/reply-link.mjs`, `PROTOCOL` 18. `pointCurrent` (`.agents/skills/reply-link/scripts/lib/computer.mjs`) moves `current.json` to whichever copy has the higher `PROTOCOL`; WongStack and relay-ring are at 15.
- That service serves every folder in `~/.wong-stack/helper/folders.json`, `/root/WongStack` and `/root/relay-ring` included. ClaymooApp's `companyFor` builds each app's client from that project's own sign-in code, so the claim succeeds. But `checkRun` (`.agents/inbox/runs.mjs`) gets the person from `signedInAs(origin)` in the helper's own copy. ClaymooApp's copy reads only its pinned per-person store (`$PASEO_HOME/.local/state/claymoo-admin/<sha256(origin)>/target.json`), which holds only `admin.claymoo.app`.
- Reproduced with the service's env (`HOME=/root`, `PASEO_HOME=/root/.paseo`): ClaymooApp's `signedInAs` gives `null` for `https://wongstack.matthewwong525.workers.dev` and `https://admin.relayeverything.com`; WongStack's gives `matthewwong525@gmail.com` for both. So `~/.wong-stack/helper/log.jsonl` shows `blocked / not_approved` for both line-ups every 5 minutes, and one `handed` (ClaymooApp's).
- WongOS has run its own helper since 2026-11-06: `wongstack-helper@wongos-b3abd679.service`, `~/.wong-stack/helpers/wongos-b3abd679/`, launcher with `--project /root/WongOS`, `PROTOCOL` 16. It is the 2026-11-06 plan (PR #529, never merged) carried in WongOS's own repo. Its `runs.mjs` and `approvals.mjs` equal WongStack's today.
- Not the cause: the `daily.mjs serve` from `/tmp/iwp/55` (pid 2874565). `takeRuns` takes only hand-overs whose folder is in its own project. The refusal happens earlier, in the helper, before any hand-over.

## Goals / Non-Goals

**Goals:** one helper per project, ported from WongOS's copy; the shared helper is never moved between projects' copies again; a refusal for no sign-in is told apart from a missing OK; WongStack and relay-ring on this computer get their own helpers.

**Non-Goals:** a per-project private-link page server (`~/.wong-stack/reply-link/server.json` keeps its shared `PROTOCOL` race); keeping test folders out of `folders.json`; ClaymooApp's own update.

## Decisions

### Port WongOS's copy, not PR #529

Diff WongOS's `helper.mjs`, `lib/computer.mjs`, `reply-link.mjs` and the helper log against WongStack's (about 190, 190 and 130 changed lines), keep only the per-project parts, and apply them to current code. WongOS's copy holds, among others:

- `projectId(root)`: the main checkout's folder name in `[a-z0-9-]`, `-`, then 8 hex of the sha256 of its real path.
- `helperFiles(env, root)`: `~/.wong-stack/helpers/<id>/{run.mjs,current.json,runs.json,log.jsonl,inbox.json,items/}`; with no root, the shared paths.
- Linux: template unit `wongstack-helper@.service`, enabled as `wongstack-helper@<id>.service`. macOS: one `com.wongstack.helper.<id>` LaunchAgent.
- The launcher passes `serve-inbox --service --project <main root>`. With `--project`, app lines, schedule rounds, mirror rounds and inbox items are that root's only.
- `leaveShared`: on install, each start and each round (and within a second of a change to `folders.json` or the shared `items/`), remove the root from `folders.json`, copy its started run ids and `<root>:<key>` gaps from the shared `runs.json`, and move its open items.
- Shared stays shared: `computer.json` (one computer id in the app), `~/.wong-stack/helper/approved.json` (each key names origin, email and schedule).

Rejected: rebasing PR #529. It is on v50.5.0 paths (`.agents/skills/hand-over/`, `schedule/scripts/lib/app-runs.mjs`), so nearly every hunk conflicts, and WongOS already adapted it.

Rejected again (as on 2026-11-06): one shared helper that loads each project's own `signedInAs`. It fixes this one check, but one project's code still judges another project's runs.

### Never move the shared helper

Current code's `start` in a project with no helper of its own only restarts the shared helper when it stopped. It never calls `pointCurrent` on the shared `current.json`. WongOS's copy still does, when its copy is newer.

Why: a WongStack copy at 16 in a test folder (several are in `folders.json`) would otherwise not move it (ClaymooApp is at 18), but any copy at 19 would, and would then block ClaymooApp's runs the same way. Moving it is the race. `install` in a project still writes its own `current.json`.

### PROTOCOL

`PROTOCOL` goes to 16, as in WongOS. `install` needs the main folder at 16 or later (`HELPER=outdated` below). A project's helper compares only with its own project's copies.

### `not_signed_in`

- `checkRun`: `who` null → `not_signed_in`; a person signed in with no OK on this version → `not_approved`, as today.
- `checkHandedRun`: `app.email(origin)` null → `not_signed_in`; another person → `not_approved`.
- `app/src/apps/inbox/cadence.ts` `WHY`: `not_signed_in: "didn't start, this computer isn't signed in"`. `needsOk` in `Schedules.tsx` keys on `not_approved` only, so it asks for no OK. The app takes any short reason code (`run-result.ts`), so no worker change.
- An older helper still sends `not_approved` for both; that stays readable.

## Risks / Trade-offs

- [Until its next round, the shared helper may claim one due run of a project that just installed its own helper] → install at a quiet minute, not on the hour or a 5-minute mark.
- [A project on older code stays on the shared helper, with today's risk] → the `/wong-sync` release note offers `helper.mjs install`.
- [ClaymooApp's copy (18) stays the shared helper's code] → it now serves only ClaymooApp and folders with no helper of their own, which is what it reads correctly.
- [Two lines from one computer id to two apps] → the app keys a line per app origin; WongOS has run this way since 2026-11-06.

## Migration Plan

1. Ship; pull `/root/WongStack`'s main checkout.
2. At a quiet minute, `node .agents/skills/reply-link/scripts/helper.mjs install` in `/root/WongStack` (asks first). `systemctl status wongstack-helper@wongstack-<hash>.service` is active; `folders.json` has no `/root/WongStack`.
3. Open a relay-ring workspace: `/wong-sync` to this release through its own loop (asks first), then the same install there.
4. Within 10 minutes each project's `~/.wong-stack/helpers/<id>/log.jsonl` shows `line-up` `handed`, and the Inbox shows a run, not "needs your OK".

Rollback: `helper.mjs uninstall` in the project; it goes back on the shared helper's list on its next chat.
