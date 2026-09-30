---
name: improve
description: Find and ship one improvement that makes the project more useful, reliable, or easier to maintain. Supports --audit-only and an area or desired outcome.
user-invocable: true
---

# /improve

Find and ship **one meaningful improvement** that makes the project more useful, reliable, or easier to maintain. Use its goals, [remembered problems](../../../wiki/development/memory.md) when available, current work, and any supplied focus to choose your investigation and approach.

`/improve [focus]` accepts an area, including a repository-relative path, or a desired outcome. A normal invocation authorizes selecting and delivering one supported improvement through [`/ship`](../ship/SKILL.md); discussing this skill does not. Unresolved material choices follow [normal exploration](../explore/SKILL.md) and the [ask convention](../explore/references/asking-the-user.md).

Require concrete evidence of value and an appropriate verification. If nothing worthwhile is supported, report **no change** and material limits; make no change.

`/improve --audit-only [focus]` reports supported findings and recommendations with no edit, fetch, branch, pull request, saved report, or delivery.

Explain the benefit, what was checked, and the result, including material uncertainty and delivery links. Results stay in the caller's output unless asked otherwise. [Repository improvement](../../../wiki/development/repository-improvement.md) owns cadence and scheduling.
