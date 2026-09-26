## Context

See proposal.md, Why. The engine already routes plain requests directly (`request-routing`), so this change touches only prose: the README, the `WONG-STACK` block, the voice page, one skill reference line, and two wiki entry pages. No script or test reads the rule wording (checked with grep over `scripts/` and `.agents/skills/`).

## Goals / Non-Goals

**Goals:**
- A stranger learns what the assistant does from the README's first screen, in everyday words.
- One owner for the writing rule: the `WONG-STACK` block states it in one line, and `wiki/voice.md` owns the detail.

**Non-Goals:**
- Rewording skill bodies. Their prose steers agent behavior, and a tone pass there needs its own review.

## Decisions

- **Merge the two rules into one.** "Write in STE100" and "Answer in a few lines" both govern message length and wording. One rule, "Keep messages short and plain", replaces both. The `simplified-technical-english` spec's "Chat replies are short" requirement still holds, because the merged rule keeps "a few lines" and "more detail only when asked". The alternative, keeping both rules, leaves two owners for one topic.
- **The jargon line lives in `voice.md`, not in the block.** The block stays one line and one link per rule, as `context-economy` asks. `voice.md` is payload, so installed repos get it through `/wong-sync`.
- **Keep the capability path.** `simplified-technical-english` keeps its name. Its Purpose is edited directly in `openspec/specs/` at apply time. Renaming a capability moves a spec, and the archive (which is never rewritten) keeps pointing at the old path.
- **The README keeps one page.** Developer material moves under a `## For developers` heading, not into a separate `DEVELOPERS.md`. The `open-source-release` spec and the downstream-contract test read the README, and one file keeps the setup URL test simple.
- **Where to chat.** The README names the Claude desktop app (Code tab) as the easiest place, and says any capable coding agent works. It mentions the [Paseo](https://paseo.sh) phone app as an option for chatting away from the computer, because `/routine` already depends on Paseo.

## Risks / Trade-offs

- [The agent names git terms less, and a person misses a step they must take, such as approving a pull request] → The rule lets the agent name a term when the person must act on it.
- [Installed repos keep STE100 prose in their own wiki pages] → Nothing breaks. Their next edit follows the new rule.
- [The README's first screen promises more than the engine does] → Example requests are limited to what shipped: plain requests, research, reminders through `/routine`, mini apps, and memory.

## Migration Plan

Release 23.2.0. `/wong-sync` brings the new block rule, `voice.md`, and the skill reference line to installed repos. Rollback is a revert of the pull request.
