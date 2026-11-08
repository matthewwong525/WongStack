# Tasks

## 1. Chat list

- [x] 1.1 `chat-list.mjs`: status cards for every chat, Claude Code and Codex; drop the read of `~/.claude/sessions/`; find by key, name or Paseo id; card expiry; by design.md decision 1.
- [x] 1.2 `daily.mjs` `mark`: write the card on `start` and `prompt` for both tools, and `stop-check.mjs` on `stop` (`working` when it or the ask check sends the stop back), with the Paseo id when it has one; keep its Paseo stop mark; no card for a background run or a sub-agent.
- [x] 1.3 `transcript.mjs`: undo the received-message rule; nothing sends one now.

## 2. Waiting notes

- [x] 2.1 `waiting-notes.mjs` (append, locked take, the `UserPromptSubmit` output), by decision 3.
- [x] 2.2 `stop-check.mjs`: take waiting notes before the judge, as the block reason, counted toward the streak, with one journal line each.

## 3. Line-up

- [x] 3.1 `line-up.mjs`: `lineUpData` and `lineUpDue` read the cards and transcripts; marks are transcript sizes; the map is keyed by chat key; no `PASEO_AGENT_ID` check.
- [x] 3.2 `tell` queues `paseo` for a chat with a Paseo id and `waiting` for any other; drop the `message` way; `deliverNotes` sends every `paseo` note and moves a failed one to waiting notes with one journal line.
- [x] 3.3 `references/briefs/line-up.md`: chats by key or name; no `SendMessage` step. Keep the skill-text budget.

## 4. Hooks

- [x] 4.1 `.agents/settings.json`: `mark` on `SessionStart` and `UserPromptSubmit` (it gives waiting notes there). `.codex/hooks.json`: the same.

## 5. Tests

- [x] 5.1 `scripts/tests/daily-chat-list.test.mjs`: cards for both tools; a card from another repo or a bad file is skipped; expiry; find by key, name and Paseo id.
- [x] 5.2 `scripts/tests/daily-waiting-notes.test.mjs`: append and take; two takers never get one note; the `UserPromptSubmit` output.
- [x] 5.3 `daily-line-up.test.mjs`: the line-up reads chats in Paseo and not; an old map keyed by Paseo ids starts fresh with one journal line; `tell` queues `paseo` or `waiting`; a failed Paseo send becomes a waiting note; each note writes one journal line. `daily-stop-check.test.mjs`: a waiting note goes out before the judge and counts toward the streak. `daily.test.mjs`: `mark` writes the card for both tools; both hook files have the new entries.

## 6. Docs, release and checks

- [x] 6.1 `wiki/development/chats-in-line.md` and `daily.md`: works in any app; Paseo first, else a waiting note at the next stop or message; *Tell* stays Paseo-only. `CHANGELOG.md` entry to match; no hand step.
- [x] 6.2 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate restart-after-limit --strict --no-interactive`; fix what fails.
- [ ] 6.3 Live check, after `/save`: with a temporary state folder, run the line-up on one chat in Paseo and one in a plain terminal; see the idle Paseo chat wake with its note, the terminal chat get its note at its next stop, and the journal have one line for each.
