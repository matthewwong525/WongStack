# A later chat finds the tools setup installed

**Status:** ready-to-ship

**Branch:** fierce-ladybug

**Open questions:** none

## Why

When a computer gives setup no admin password, setup puts its tools in your own folder. A later chat can then fail to find them: the assistant reports a missing program, and nothing you ask for works. The readiness check on 2026-10-06 named this as a blocker for a person with no technical help.

Most personal computers take this path: Linux asks for a password, and a Mac without Homebrew has no other way in.

Checked on this server, the bug has two causes, one per assistant. The fix idea from 2026-09-29 covers only the first.

## What Changes

- **Setup writes its line where an assistant reads it.** Setup adds one line to your start-up file so later chats know the tools folder. Today the line lands at the bottom. Ubuntu's file tells an assistant to stop reading near the top, so the line is never reached. Setup now puts it first. This fixes Codex.
  ```text
  your start-up file
  ┌────────────────────────┐
  │ +the line, new place   │ ◀─ Codex stops below this
  │ "assistants stop here" │
  │ ...                    │
  │ the line, today        │ ◀─ only your own terminal
  └────────────────────────┘
  Claude Code reads none of it:
  +each new chat adds the folder
  ```
- **Each new Claude Code chat adds the tools folder itself.** Claude Code never reads that file. It knows only the folders its app started with, so no line in any file reaches it when Paseo or a desktop app starts it. The project now tells it at the start of every chat. Memory loading at the start of a chat is covered the same way.
- **You type nothing and see nothing new.** An install that already has the bug gets the fix at its next update: the new chat step arrives with it, and the assistant moves the line then.
- **This server gets the fix first, as the real test.** One line is added to the top of its start-up file, which holds the old line twice below the stop. The old lines stay.
- **A check keeps it fixed.** It runs setup's real line against Ubuntu's stock file, and the new chat step against a computer with and without the tools folder, whenever either changes.
- **The tools guide says where each assistant looks for tools**, so the next fix starts from the facts.
- **Not tried on a Mac.** The same fix is written for a Mac, from how its shell is documented to start. The fresh-Mac install will show whether it holds.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: *Setup readies the computer first* gains the promise that tools setup put in the person's own folder are found by a later chat, with no command typed.

## Impact

- `.agents/skills/wong-setup/references/tools.md`: the one paragraph after the OpenSpec install, and nothing else in the file. Pull request #291 edits the Paseo section of the same file.
- `.agents/settings.json`: Claude Code's session-start step and the two memory hooks. `.agents/hooks.json` (Codex) does not change.
- `scripts/tests/tools-on-path.test.mjs`: new.
- `wiki/development/required-tools.md`: one new section.
- `CHANGELOG.md`: a `## Next (patch)` entry.
- `~/.bashrc` on this server, outside the repo: one line added at the top.
- No app change. Branch: `fierce-ladybug`.

Non-goals: installing tools anywhere but the user folder, changing how any tool is installed, deleting a line an earlier setup wrote, reading PATH from the shell on Windows, the fresh-Mac install, and any other part of `tools.md`.

## Decision log

- **2026-10-06** — Assumed: fix both causes in one change, because the check showed that moving the line fixes Codex and not Claude Code, and Matthew's page says a fix the checking finds goes in the same change, not a follow-up.
- **2026-10-06** — Assumed: on bash the line goes first in `~/.bashrc`, because it was the one place every tested start found it: a login shell, a shell that reads the file by name, and a terminal, on both of Ubuntu's stock files. A line only in `~/.profile` missed two of four.
- **2026-10-06** — Assumed: on zsh the line goes in `~/.zshenv` and stays in `~/.zshrc`, because zsh reads the first for every shell, and a Mac moves it behind the system folders in a login shell, where the second puts it back in front. Not tested: this server has no zsh.
- **2026-10-06** — Assumed: Claude Code gets the folder from the project's own session-start step, because its program (2.1.287) writes the PATH its app started with into every command and ignores what a start-up file sets.
- **2026-10-06** — Assumed: Codex's hook file stays as it is, because Codex starts a hook in a login shell on Mac and Linux, which the moved line reaches, and in `cmd.exe` on Windows, where a prefix would break it.
- **2026-10-06** — Assumed: the chat step adds the folder only when it exists and is not already known, because moving it to the front on a computer that had it later could put an old copy of a tool ahead of the system's.
- **2026-10-06** — Assumed: a line an earlier setup wrote stays, because setup never deletes from a person's own file and a second copy of the folder does no harm.
- **2026-10-06** — Assumed: the existing promise is extended, not a new one added, because pull request #291 adds a requirement at the end of the same spec and two additions there would clash.
- **2026-10-06** — Assumed: this server's own start-up file is the real test, because it is the exact failing case: root's stock files, and the old line twice below the stop. Strike that line in review to skip it.
- **2026-10-06** — Assumed: a patch release, because it changes no behavior a person asked for; it makes the installed tools findable.
- **2026-10-06** — Asked what to do with the finished plan → chose build and publish.
- **2026-10-06** — Archive checkpoint: built setup's start-up-file snippet, Claude Code's session-start step, the test, and the guide section; reconciled the installation spec; numbered release 37.2.3. Local checks passed, with `shellcheck` not installed here. On this server a new Claude Code chat started with `/root/.local/bin` first on PATH and loaded memory, and `bash -lc` found the folder after the snippet ran on the real `~/.bashrc`. The Mac half is untested.
