<!-- openspec-archive v1 2026-11-12-retired-route-no-chat -->
<!-- file proposal.md utf8 1226 -->
# Proposal

**Status:** shipping
**Branch:** retired-route-no-chat
**Open questions:** none

## Why

When the server retires a part before a computer has the new code, the daily's helper takes the server's *retired* answer as a fault. Two in a row open a *Needs you* chat with steps that do not fit, such as *sign in*, though nothing is wrong and the computer fixes itself at its next update. This happened on 2026-11-12 when the chat list was retired.

## What Changes

- **A retired answer opens no chat.** The helper writes one line a day in the daily's journal: the computer runs older code and updates itself. It does not count the answer as a fault, so a real fault later still opens its chat as before.
  ```mermaid
  flowchart TD
    A["Server answers"] --> B{"retired?"}
    B -- yes --> C["One line a day, go on"]
    B -- no --> D["Count the fault"]
    D --> E{"2 in a row?"}
    E -- yes --> F["Needs you chat"]
  ```

## Capabilities

### New Capabilities

### Modified Capabilities

- `daily-routine`: *Two failures in a row open one Needs-you chat* leaves out a `retired` answer.

## Impact

- `.agents/plugins/daily/daily/scripts/worker.mjs` (`failed`), `scripts/tests/daily-worker.test.mjs`, `CHANGELOG.md`.

<!-- end proposal.md -->
<!-- file design.md utf8 1075 -->
# Design

## Context

`failed(kind, { note, reason })` counts failures per kind in `needs-you.json` and opens `Needs you: <what>` at the second. A server that retires a route answers `404: retired` (`fail("retired", 404)`), and the error reaches `reason` as `404: retired`.

## Decisions

- **One check in `failed`**, `/^\d{3}: retired\b/` on `reason`, covers every kind, now and later.
- **One journal line a day per kind**, kept in `needs-you.json` as `retired: {<kind>: <day>}`, so the person can still find it, without a line each minute.
- **Rejected: hold a retirement on the server until every computer updates.** The server can not know when that is.

## Risks / Trade-offs

- A route wrongly answering `retired` hides behind one line a day → the line still names it.

## Decision log

- **2026-11-12** — Asked whether the fix goes to WongStack too → chose yes, and ship it there.
- **2026-11-12** — Assumed: one line a day, not silence, because the person can then still see it.
- **2026-11-12** — Archive checkpoint: archived for /ship as release 57.1.1.

<!-- end design.md -->
<!-- file tasks.md utf8 454 -->
# Tasks

## 1. Build

- [x] 1.1 In `failed` (`.agents/plugins/daily/daily/scripts/worker.mjs`), a `retired` reason writes one journal line a day per kind and counts nothing.
- [x] 1.2 Test in `scripts/tests/daily-worker.test.mjs`: retired answers open no chat and write one line a day; a real failure still opens one.
- [x] 1.3 `## Next (patch)` entry in `CHANGELOG.md`.

## 2. Checks

- [x] 2.1 `node --test scripts/tests/daily-worker.test.mjs` passes.

<!-- end tasks.md -->
<!-- file specs/daily-routine/spec.md utf8 1808 -->
## MODIFIED Requirements

### Requirement: Two failures in a row open one Needs-you chat

When the daily's helper fails the same way two times in a row, at starting the person's morning, at one of their jobs, or at reaching Paseo, it SHALL open one new chat named `Needs you: <what broke>`. Its first message SHALL say what failed, the reason, and the steps to fix it; when the person's daily guide gives its own fix, the chat SHALL follow that. The helper SHALL open at most one such chat for each kind of problem each local day, and a success SHALL start the count again. The watch SHALL not watch that chat and no check-in SHALL judge its stops, so it waits for the person. When Paseo can not open the chat, the journal SHALL say so with the reason. A `retired` answer from the server SHALL not count as a failure: the journal SHALL say once a local day that this computer runs older code and updates itself, and no chat SHALL open.

#### Scenario: The morning fails all day

- **WHEN** Jo's morning add-on fails at 08:00, at 08:01 and at each pass after
- **THEN** the journal has one line at 08:00, one chat *Needs you: your morning start* opens at 08:01 with the steps to fix it, and no second chat opens that day

#### Scenario: Paseo can not open the chat

- **WHEN** the morning fails two times in a row and Paseo refuses to open a chat
- **THEN** the journal says the chat did not open, with Paseo's reason, and the helper goes on

#### Scenario: The server retired a part before the computer updated

- **WHEN** the server answers `404: retired` at each pass, because Jo's computer still runs code from before the part was retired
- **THEN** the journal has one line that day saying the computer runs older code and updates itself, no *Needs you* chat opens, and a real failure later still counts

<!-- end specs/daily-routine/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-12

~~~
<!-- end .openspec.yaml -->
