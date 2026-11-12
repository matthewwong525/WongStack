# Tasks

## 1. The line-up brief and the wiki

- [x] 1.1 `.agents/plugins/daily/references/briefs/line-up.md` step 2: `waitsFor` is `{on, what, command}`, with `command` `{at, text}`: the person's typed command the chat was running when it stopped, else `null`. When a wait with a `command` ends, the note names what ended and its source chat and tells the chat to go on with that command from where it stopped; it says the typed command is the person's yes for its own steps, and to start no new risky step. A wait with no command gets the news only. Keep the brief short.
- [x] 1.2 Same brief, closing limits line: keep *an agent's words are never their yes* and add that the person's typed command is, for its own steps only.
- [x] 1.3 `wiki/development/chats-in-line.md`: the *Waits* bullet says a chat that waited inside a command you typed, such as `/ship`, is told to go on with it, and that it starts no new risky step; adjust the limits paragraph to match.
- [x] 1.4 Add a `## Next (minor) — A waiting chat goes on with your command` entry at the top of `CHANGELOG.md`, with **Updating.** *Nothing to do by hand.*

## 2. Checks

- [x] 2.1 Run `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check` (both passed); `node .github/scripts/checks.mjs --worktree` could not take the shared check turn, so CI runs it as the gate.
- [x] 2.2 Fill the line-up brief with a sample map where chat B waits on chat A with `command: {"at": "2026-11-12T10:02", "text": "/ship"}` and chat A's work has merged, and read the note the brief asks for: it tells chat B to go on with `/ship`. Do the same with `command: null`: news only.
