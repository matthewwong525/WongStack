# Your chats in line

The daily's line-up keeps your open chats in one project pointed the same way, in Paseo, a plain terminal or any other app that runs Claude Code or Codex. It is one part of [the daily routine](daily.md#your-chats-in-line). **The goal:** no two chats do the same work or work against each other, each chat gets as far as what all your chats know allows, and your recent choices weigh most. How to reach it is the daily's judgment, not a fixed rule.

- **A short map.** A few minutes after an open chat in the project ends a turn, one background run reads what is new and notes, for each chat: what it works on, how far it is, what you decided there and when, and what it waits for. It finds each chat by a small status card the chat's own hooks write at its start, at each message and at each stop: its name, folder, transcript, and Paseo id when it has one. A closed chat stays on the map for 7 days. The map stays on this computer, outside the project.
- **Notes.** The run tells each chat the news that changes its work, and names the chat and time it came from. A note starts *From the daily:*. Nothing stops a step in the middle. A note goes one of two ways, Claude Code or Codex alike:
  - **A chat in Paseo** gets it through Paseo: into its running step when waiting would waste work, else at its next stop, or at once as a new turn when it is idle.
  - **Any other chat** gets a waiting note: its own hooks hand it over at its next stop, or with your next message when it is idle. No hook fires in an idle chat, so the note waits for you there.
  - **A note Paseo fails to send** becomes a waiting note, with one journal line, so no note is lost.
- **Waits.** When the work, the change or the answer a chat waits for lands, the run tells that chat, so it goes on without you.
- **Covered.** A chat told that another chat covers its work passes on what only it has, then waits; *what's going on?* offers to [close it](daily.md#close-finished-chats).

The [check-ins'](daily.md#check-ins) limits hold: risky steps wait for you, no chat closes without your pick, an agent's words are never your yes, and notes count toward the five in a row. Each note writes one journal line. *Stop check-ins* stops it too. It is the *Keep my chats in line* [default schedule](../stack/host-schedules.md#default-schedules): pause it in the Inbox's *Schedules* list to turn off only this.

