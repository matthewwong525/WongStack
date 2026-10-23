# Daily's inbox works from every workspace

**Status:** ready-to-ship
**Branch:** snobbish-cat
**Open questions:** none

## Why

The first real morning run of planning the day first hit two snags. The plan cards never reached your inbox: the workspace /daily ran in couldn't find this computer's sign-in, though the main copy had it. And a brief written the way /daily's own guide says, as a list, was refused, so its agent ran in the daily chat instead of its own workspace. Both were fixed by hand once; nobody should have to.

## What Changes

- **Every workspace uses the computer's one sign-in.** A workspace copy of the project finds the same sign-in as its main copy, so plan cards, questions and approvals reach your inbox from any workspace, with no extra login.
  ```mermaid
  flowchart TD
    ws["a workspace"] --> find{"its own sign-in?"}
    find -- yes --> inbox["your inbox"]
    find -- no --> shared["the computer's sign-in<br/>for the same app"] --> inbox
  ```
- **A brief written as a list opens its workspace.** A brief that starts with a list dash opens its agent's own workspace like any other, instead of being refused.

Non-goals: no change to what the inbox shows, or to how a person signs in the first time.

## Capabilities

### New Capabilities

### Modified Capabilities
- `company-api`: a workspace copy reaches the app with the sign-in its main copy uses.
- `multi-part-workspaces`: a brief of any shape opens its workspace.

## Impact

- `scripts/employee-bootstrap.mjs`: `companyClient` finds the per-app sign-in for a copy whose install record names no `companyApi.origin`, by the app origin its memory record names.
- `.claude/skills/schedule/scripts/workspace.mjs`: passes the brief so `paseo run` never reads it as an option; drops the "must not start with -" refusal.
- Tests: `scripts/tests/employee-bootstrap.test.mjs`, the workspace launcher's test.
- `CHANGELOG.md`: a `## Next (patch)` entry. No data changes; nothing here can't be undone.

## Decision log

- **2026-10-22** — Asked what to do after the live run of planning the day first → chose to plan the two snag fixes.
- **2026-10-22** — Assumed: one plan for both snags, because both came from the same run and each is a few lines.
- **2026-10-22** — Assumed: find the sign-in through the app address memory already records, because older installs and this source repo record no company address, while every install records memory's, and memory lives on the same app.
- **2026-10-23** — Asked whether a workspace should borrow the main copy's sign-in when an older sign-in sits only in the main copy's own folder → chose to borrow it, for the same app only, so nobody signs in again after updating.
- **2026-10-23** — Built both fixes and saved for the live check (task 4.2). A review caught a title of `--` landing in the wrong place; fixed. The local pre-check passed except an app screen test this change doesn't touch, which passes alone and times out only when every test runs at once.
- **2026-10-23** — Live check passed from this workspace, whose own sign-in folder was empty: `D open --plan-first` with a list-shaped brief opened workspace *Inbox test*, its agent wrote its plan, and `D inbox add --kind start` reached the live inbox. The test agent, workspace and card were closed after.
- **2026-10-23** — Archived for release 44.9.2 and published through /ship (PR #442).
