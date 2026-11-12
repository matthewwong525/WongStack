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
