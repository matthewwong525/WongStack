# Ask for a change, get a plan to review

**Status:** ready-to-ship
**Branch:** seamless-nav-build
**Open questions:** none

## Why

Ask for a change without a command, and the assistant can stop at *Plan it?* before it writes anything. Once the plan is ready, it asks again with a card: *Build it now / Build and publish / Review the plan / Stop*. The plan's page already has *Build it* and *Build and publish* buttons, so the card repeats a choice the page owns, and the extra stop slows every change.

## What Changes

- **A request goes straight to a plan.** Ask for a change in plain words and the assistant thinks it through, asks only what it must, and writes the plan. It never stops at *Plan it?* and never says which step it is on. Typing `/explore` yourself still means "let's just think": that one asks *Plan it?* before writing anything.
  ```mermaid
  flowchart TD
    ask["You ask for a change"] --> q{"Only you can answer?"}
    q -- yes --> answer["It asks; you answer"] --> plan
    q -- no --> plan["It writes the plan"]
    plan --> link["Review the plan: link"]
    link --> page["Tap Build it or Build and publish"]
  ```
- **A finished plan ends with its link, never a card.** The reply sums up the plan in a few lines, gives the link, and tells you to review it. You build, or build and publish, from the page's buttons. When the page opens only from its file, with no buttons, you say *build it* or *build and publish* in the chat.
  | | Today | After |
  |---|---|---|
  | Before the plan | Can stop at *Plan it?* | Asks only what it must |
  | End of the reply | The link, then a four-choice card | The link and "review the plan" |
  | Next step | Pick on the card or the page | Tap on the page |

- **Questions and the plan flow into each other.** Ask in the chat for a change to a waiting plan, and the assistant asks only what your message opens, updates the plan, and gives the new link, with no restart and no announcement. A question gets an answer and leaves the plan as it is. Notes sent from the page work as they do today.
- **The morning chief of staff leaves plans to you.** It used to answer an agent's *Build it now* card on its own. Now a plan from an agent it watches waits under *Needs you* in your inbox, or as a link in the daily chat, until you tap *Build it*.

Non-goals: no change to the plan page, its buttons, or the inbox. A typed command keeps its reach: `/apply` still plans and builds without a stop, and `/ship` still runs the whole way.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `asking-the-user`: a finished plan's reply ends with its link and a review line, with no question; a request with no command goes straight to planning; a follow-up asking to change a waiting plan updates it without restarting.
- `change-loop`: a change asked with no verb stops at the plan's link, from whose page the person builds or builds and publishes, with no question.
- `daily-routine`: a watched agent stopped at a plan's link is the person's to answer; the chief never builds it.
- `mini-apps`: a new tool asked with no verb ends on the plan's link and review line.
- `repository-improvement`: an `/improve-code` run ends at the plan's link like any finished plan, with no card.
- `ux-wireframes`: pasted notes that update a plan end on its link and review line, not a build question.

## Impact

- `.agents/skills/explore/references/asking-the-user.md` (End every reply, Print the plan's link), `.agents/skills/explore/SKILL.md` (standalone means typed), `.agents/skills/plan/SKILL.md` (Finish; a chat follow-up on a waiting plan), `.agents/skills/improve-code/SKILL.md`, `.agents/skills/daily/references/chief.md`.
- `.agents/skills/plan/scripts/build-review.mjs`: the next-step line differs for a page with buttons and one opened from its file; `scripts/tests/review.test.mjs`.
- `AGENTS.md` (and so `CLAUDE.md`): a request with no command starts at `/plan`.
- Wiki: `wiki/development/the-change-loop.md` (Just ask), `wiki/development/daily.md`, `wiki/development/repository-improvement.md`, `wiki/stack/mini-apps.md`, `wiki/development/reply-links.md`.
- `CHANGELOG.md`: a minor entry, no hand step. Installed repos get it on their next update.

## Decision log

- **2026-10-23** — Asked how a reply should end when the plan page has no Build buttons (opened from its file) → chose never a card: the page is always where the next step happens; without buttons, the person types it.
- **2026-10-23** — Asked whether a typed `/explore` should also flow straight into a plan → chose no: it still asks *Plan it?* first.
- **2026-10-23** — Asked what the morning chief does when a watched agent finishes a plan, now that there's no card → chose the plan waits for the person in the inbox; the chief never builds it.
- **2026-10-23** — Assumed: "plan mode" means WongStack's plan step, not a chat app's own plan mode, because WongStack works in any chat app.
- **2026-10-23** — Assumed: the link line keeps its wording (*Click here to see the plan:*) and the line under it changes to tell the person to review and tap, because only the ending needs to change and nothing reads the link line.
- **2026-10-23** — Assumed: a reply that changed a plan and still has to ask something (a blocker, a material question) keeps its card and its *Review the plan* option, because only the finished plan's own card repeats the page.
- **2026-10-23** — Assumed: a minor release, because a finished plan behaves differently and nothing needs doing by hand.
- **2026-10-23** — Assumed: the `change-loop` rule for a request with no verb gets a delta saying it stops at the plan's link with no question, because its old text still asked whether to build (second-look review).
- **2026-10-23** — Assumed: the `mini-apps` tip-calculator scenario ends on the link and review line, because it still asked whether to build now (second-look review).
- **2026-10-23** — Assumed: the `ux-wireframes` pasted-notes rule ends on the link and review line, because it still asked whether to build now (second-look review).
- **2026-10-23** — Assumed: only a chat message asking for a change updates a waiting plan; a question is answered as review notes are, leaving the plan unchanged, because the broader wording clashed with *Review notes change only what they ask to* (second-look review). `/plan`'s *Review notes* and *Just ask* wording follow it.
- **2026-10-23** — Assumed: the `WONG-STACK` block prints the plan's link above *any* closing question, because a finished plan now has none (second-look review). No other live copy of that sentence exists.
- **2026-10-23** — Archive checkpoint: every task built and ticked; the second look's five findings fixed (three older rules still promised the build card, a chat question no longer edits the plan, the always-loaded link rule says *any* closing question); numbered 44.10.0. The tap that started this build sat undelivered because this computer's inbox helper watches another app; collected by hand.
