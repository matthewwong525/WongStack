# Better thinking before a plan

**Status:** ready-to-ship
**Branch:** tough-puma
**Open questions:** none

## Why

Today's explore skill limits unnecessary questions, but gives little direction on how to investigate an idea, compare approaches, or find weak assumptions. Better guidance should give you grounded recommendations and uncover consequential choices before a plan is written.

## What Changes

- **Investigate before asking.** The assistant follows how the relevant work happens today and checks what it can discover itself. It explains any remaining uncertainty and asks you only about a choice you need to make.
  ```text
  open question
        │
        ▼
  fact or choice?
        │
    ┌───┴────┐
    ▼        ▼
  fact     choice
    │        │
    ▼        ▼
  check    ask you
    │        │
    └───┬────┘
        ▼
  update the recommendation
  ```
- **Ask choices in the order they depend on each other.** Small groups contain only questions that can already be answered. While the assistant checks a fact, independent questions can move ahead. If your answer changes an earlier premise, it revisits the affected choices and keeps unrelated answers settled.
- **Compare different approaches when the answer is unclear.** You see what each approach gives you, its cost, and why one is recommended. Straightforward requests keep a straightforward response.
- **Challenge the recommendation before handing it over.** The assistant investigates its weakest assumption and a realistic way it could fail, then summarizes what is settled, what is assumed, and what evidence is still missing.
- **Finish when every important choice is resolved.** An unanswered choice that could change the result stays open until you answer it. Inexpensive details can use explained defaults, and facts that still need proof stay clearly identified.

Non-goals: changing the question format or publishing choices; exhaustive interviews; mandatory panels of agents; building prototypes during exploration; a new testing framework.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: exploration grounds recommendations in evidence, compares meaningful alternatives, revisits decisions affected by changed premises, keeps independent questions moving, and resolves material choices before handoff.

## Impact

- `.agents/skills/explore/SKILL.md`: the investigation guidance, question dependency rule, and final summary; existing linked headings and commands stay intact.
- `wiki/development/the-change-loop.md`: its exploration summary links to the skill as the owner rather than repeating the new rules.
- `CHANGELOG.md`: a minor-release entry with no manual update step; `VERSION` remains unchanged until publishing.
- The change folder retains source references and [the comparison record](exploration-comparison.md). Six usable paired dialogues show concrete behavior and gaps, but no demonstrated overall gain. The final simplified wording has static validation only. No application, dependency, or account changes.

## Decision log

- **2026-10-04** — Asked what next for the focused explore improvement → chose to plan it.
- **2026-10-04** — Assumed: the four recommendations from the research are the scope, because the person selected the focused improvement after seeing them.
- **2026-10-04** — Assumed: keep small groups and the 80/20 rule, because the research found both already supported and the request concerns better exploration rather than more questions.
- **2026-10-04** — Assumed: write original instructions informed by Matt Pocock and poteto, because adopting their complete workflows would add exhaustive interviews, prototype writes, or mandatory agent panels outside this request.
- **2026-10-04** — Assumed: observation is read-only during explore; a missing experiment becomes a named evidence gap for later work, because explore writes nothing and the request does not change that boundary.
- **2026-10-04** — Assumed: keep one change and a small paired comparison, because these improvements affect the same skill and earlier research on 2026-09-27 rejected a costly multi-build arena.
- **2026-10-04** — Assumed: a minor release, because the payload gains new exploration behavior without breaking its invocation or handoffs.
- **2026-10-04** — Asked what next for the first plan → chose to review it without implementation.
- **2026-10-04** — Assumed: the subsequent `/plan` adds all three grill-me refinements discussed immediately before it, because the person invoked planning after that recommendation.
- **2026-10-04** — Assumed: a changed premise reopens only its affected choices, because restarting the interview would discard still-valid answers and conflict with the existing no-repeat rule.
- **2026-10-04** — Assumed: the existing expenses comparison includes a later privacy correction and an unavailable fact alongside independent choices, because those steps exercise the refinements without adding sessions.

- **2026-10-04** — Built original compact exploration guidance; retained linked headings, memory and overlap checks, shared questions, 80/20, no writes, bounded reuse, and authorized/unattended defaults. Quoted the unchanged description so its colon is valid YAML.
- **2026-10-04** — Comparison: six Claude setup requests hit the weekly usage limit before inference. Three initial Codex setup threads responded but source reads failed inside a nested namespace sandbox. Retained those failures and usage separately; the parent instructed disabling the inner sandbox while preserving outer read-only mounts, hidden repo/other transcripts, and no approvals.
- **2026-10-04** — Comparison: ran six usable Codex dialogues on gpt-6.1-sol with identical paired facts and fixed replies. Both kept unresolved preferences open and respected settled duplicate handling; explicit queue/notification-audience revision remains unshown. Candidate omitted visibility in its initial expense group and explicitly handled role-change invalidation in caching where baseline's final approach did not. No overall gain meets the fixed criteria.
- **2026-10-04** — Simplified the failure-check sentence after the candidate added a payment-related replacement choice beyond the source and settled replacement preference; speculative or cheaply changed concerns must not create questions or reopen settled preferences. The final simplification is not behaviorally retested. Unanswered rejection policy in the scripted replies limits the expense handoff evidence; it is not an assistant completion failure.
- **2026-10-04** — Validation: payload links, OpenSpec configuration, retired names, and context limits pass. The instruction inventory is 26,287 words / 190,792 bytes, below the existing 27,084 / 190,845 baseline; startup is 2,174 words within 2,200. No baseline or version number was changed. These static results do not establish conversational improvement.

- **2026-10-04** — Archive checkpoint: the person chose to publish the guidance and comparison evidence after release checks, without claiming a measured gain. The six usable dialogues did not meet the fixed gain rule; the final simplified wording remains behaviorally untested. Archived after all seven tasks and strict validation passed.
