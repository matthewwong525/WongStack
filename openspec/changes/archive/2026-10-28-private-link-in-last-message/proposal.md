# Private links come in the last message

## Why

When the agent sends a password link, a key link, a private form or a live view, the person often never sees it. The agent writes the link between its steps, and many chat apps hide that text: only the last message of a turn shows for sure. Every WongStack computer sends links this way, so every install has the problem; one install already fixed it on 2026-10-28.

## What Changes

- **The link goes in the agent's last message, every time.** The agent opens the link, starts waiting for it in the background, and then ends its turn with the link on its own line. It never puts the link only in text between its steps. The rule is written once, in the shared private-links part of the browsing guide, and the password, key, private form and live view guides point to it.
  ```mermaid
  flowchart LR
    open["open"] --> wait["wait"] --> last["last message"]
    open -. never .-> mid["between steps"]
  ```
- **The link tool reminds the agent.** Right under the link, the tool prints one more line telling the agent to end its turn with the link. The reminder arrives at the moment the agent needs it, even when it skipped the guide. It holds no part of the link or its secret, and a link that fails to open prints neither line.
  | Line the tool prints | What it tells the agent |
  |---|---|
  | `HANDOVER_LINK=https://….trycloudflare.com/#key=…` | the link to send |
  | `HANDOVER_SEND=…` | end this turn with the link on its own line |

Non-goals: how a link works, opens or closes; reply links such as a plan's link, which already end their reply.

## Capabilities

### New Capabilities

### Modified Capabilities
- `browser-logins`: a new requirement: `open` prints a send reminder under `HANDOVER_LINK`, and the agent ends the turn with the link.

## Impact

- `.agents/skills/hand-over/scripts/hand-over.mjs` (one printed line, usage text) and `scripts/tests/hand-over.test.mjs`.
- `wiki/development/browsing.md#how-private-links-work` owns the rule; `passwords.md`, `live-view.md`, `private-form.md` and `secrets.md` link to it.
- `CHANGELOG.md`: a minor entry; installs have nothing to do.
- Overlaps the unpublished plan `per-chat-private-links` in the same `browsing.md` section; whichever publishes second catches up.

## Decision log

- **2026-10-28** — Asked whether WongStack should get the private-link-in-last-message fix → chose to port it by hand, generalized, from the published WongOS change (its PR #220).
- **2026-10-28** — Asked whether to open the pull request → chose yes, after the person sees its text first, because opening it is outward.
- **2026-10-28** — Assumed: the new requirement goes in the `browser-logins` spec, because its *Every private link goes through Cloudflare and closes itself* requirement already covers all four links.
- **2026-10-28** — Assumed: the reminder keeps the published wording, so both repos print the same line.
- **2026-10-28** — Assumed: to keep `browsing.md` under the 3,000-word cap, nearby text in the private-links section is shortened with every fact kept, because the page sits at 2,909 words.
- **2026-10-28** — Assumed: the pull request body argues the fix for every install (any chat app may hide text between steps; the tool line costs nothing and carries no secret), because WongStack takes only general fixes.
- **2026-10-28** — Assumed: `secrets.md` step 4 drops its *return to chat and say continue* clause, because the new link pushed the key-save reading route 53 bytes over its budget and `browsing.md#how-private-links-work` already owns that fact.
- **2026-10-28** — Asked whether to open the pull request with the drafted text → chose yes, open it.
- **2026-10-28** — Assumed: task 3.2 counts as done with one local failure, `view-page.test.mjs` "the page closes at the time limit", because it fails the same way on the untouched branch and CI is the gate.
