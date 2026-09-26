## Context

See proposal.md — Why. The change touches doctrine that many skills cite: the shared ask convention (`explore/references/asking-the-user.md`), `/plan`, the `WONG-STACK` block, and the change loop page. The pattern in this repo is one owner per rule and links from everywhere else (`.claude/rules/payload.md`). The drafting rules the OpenSpec CLI shows the agent live in `openspec/config.yaml`.

## Goals / Non-Goals

**Goals:**
- One owner for the reader-level rule, cited by every skill that writes to the person.
- The routing and stop rules for a code change with no verb, stated once in the change loop and summarized in the `WONG-STACK` block.
- A deterministic link path from the page builder, so the agent never guesses it.

**Non-Goals:**
- A reader-level switch per skill, or any repo-wide setting.
- Rewriting archived proposals.

## Decisions

- **The ask convention owns the reader-level rule.** `asking-the-user.md` already governs how every question looks, and eight skills cite it. A new "Write at the reader's level" section there covers questions, next-step asks, and blocker reports, and names where the level comes from. The alternative, a new wiki page, adds a hop for every skill. The People section of `wiki/wiki-style.md` owns the page line's format; the ask convention links it.
- **The proposal rule goes in `openspec/config.yaml` and `/plan`.** The CLI shows config rules while drafting, so the rule reaches every drafting path, including `/save` authoring a change from a session. `/plan` states the lookup (git email → people page → level line → default non-technical) in one sentence and links the ask convention.
- **The two stops come from the routing rule, not new skill flags.** With no verb, the agent runs `/plan` as a standalone stop, then `/apply` on yes (which saves and returns the preview), then `/ship` on the second yes. `/apply` and `/save` already end with a next-step ask when the person invoked them directly; the no-verb path treats each stage as invoked by the person, so no skill needs a new mode. The change loop page owns the rule; the `WONG-STACK` block's verbs line changes from "build or change code through the verbs" to "ask for the change; the agent runs the verbs".
- **The builder prints the path on a second line.** `review: current, updated` stays the first line, so nothing that reads it breaks. A second line holds the absolute path of `review.html`. `/plan` builds its link from that line. The alternative, a relative path, does not open from the Paseo browser or a terminal link.
- **Failure asks reuse the existing fix loops.** `/save` already tries CI fixes three times and `/verify` tries in-scope fixes twice. Only the wording of `/ship`'s walk-failure ask and blocker reports changes, through the ask convention.

## Risks / Trade-offs

- [An engineer with no page gets a plain plan] → They say once that they are technical; the agent records it and every later plan has full detail.
- [Plain words hide a risky technical detail from a reviewer] → The detail is still in design, specs, and tasks, and the pull request still carries the full change; the rule moves detail, it does not remove it.
- [An agent writes jargon anyway] → The rule is in config, which the CLI shows at drafting time, and in `/plan`; the reviewer's notes catch the rest.
