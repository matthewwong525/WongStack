# Complete safe verification before asking for help

**Status:** ready-to-ship
**Branch:** sleek-dragonfly
**Open questions:** none

## Why

Verification should check as much as it safely can without bringing you in halfway through. You should get the results together, with a clear list of the few checks that need your login, permission, or hands-on help.

## What Changes

- Finish independent checks before asking for help, even when another check is blocked or its result is unclear.
  ```text
  Safe checks ──▶ Results together
      │                │
      ▼                ▼
  Continue others   One help list
                       │
                       ▼
                  Resume remaining
  ```
- Exercise changes on disposable staging data, preserving shared data and keeping real-world actions behind the permissions they need.
- Try safe simulations for checks that cannot be completed directly, and explain what they show and what remains unproven. Give you one list of remaining checks with the option to help, skip selected checks, or skip them all. Skipped checks stay clearly marked as unchecked. Already completed checks stay completed unless your action changes their conditions.

**Non-goals:** changing publishing approval, broadening verification into an unrelated audit, or inventing new testing tools.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `staging-walkthrough`: continue safe independent checks, protect staging data, and consolidate human handoffs.

## Impact

The verify skill and walkthrough reference, their owning wiki page, and the payload changelog. No app, dependency, or driver changes.

## Decision log

- **2026-10-03** — Assumed: finish safe independent checks before one consolidated handoff, because the request asks to do as much as possible before involving the person.
- **2026-10-03** — Assumed: staging writes use disposable data and known test integrations; a staging URL alone does not authorize resetting shared data or triggering real-world effects.
- **2026-10-03** — Assumed: retain the existing scope and retry bounds, because autonomy should complete the requested checks without widening the assignment.
- **2026-10-03** — Asked: review note on Change #3 → added safe best-effort simulations before the handoff and options to skip selected or all remaining checks. Simulated evidence must name its limits, and skipped checks remain unverified; implementation waits for a later instruction.
- **2026-10-03** — Asked: `/ship` → authorized completing the remaining simulation and skip work and publishing it. All eight tasks passed their checks; the archive checkpoint carries release 29.16.0 and the before/after grading and independent handoff reviews.
