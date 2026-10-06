# Design

## Context

See proposal.md - Why. What was checked on 2026-10-06, on this server (Ubuntu 26.04, bash, Claude Code 2.1.287, Codex 0.159.2, both started by the Paseo daemon):

**The bug is live here.** `~/.bashrc` holds `export PATH="$HOME/.local/bin:$PATH"` on lines 100 and 101, below `[ -z "$PS1" ] && return` on line 6. This chat's `PATH` has no `~/.local/bin`. The line is there twice: *add that line once* is prose, and an assistant followed it twice.

**Ubuntu ships two guards.** `/etc/skel/.bashrc`, for a new user, opens with `case $- in *i*) ;; *) return;; esac`. Root's opens with `[ -z "$PS1" ] && return`. `/etc/skel/.profile` sources `~/.bashrc`, then adds `~/.local/bin` when the folder exists; root's `~/.profile` only sources `~/.bashrc`.

**Where each start finds a tool in `~/.local/bin`**, run in a throwaway home with the stock files (`</dev/null`, `SHLVL` set, as a real child has). Both guards gave the same answers. The third column is the snippet in Decision 1, which also gave *found* in every row under a user's files:

| How the shell starts | Line at the bottom, user's files | Line at the bottom, root's files | Line first, root's files | Line only in `~/.profile` |
|---|---|---|---|---|
| `bash -lc` (Codex) | found | **missing** | found | found |
| `bash -c -l 'source ~/.bashrc; …'` | found | **missing** | found | found |
| `bash -c 'source ~/.bashrc; …'` | **missing** | **missing** | found | **missing** |
| `bash -ic` (a terminal) | found | found | found | **missing** |

A user's stock `~/.profile` already rescues a login shell, but only once `~/.local/bin` exists at login. A `~/.bash_profile` that does not source `~/.bashrc` hides the line from `bash -lc` wherever it sits in `~/.bashrc`; Ubuntu ships none.

**How each assistant starts a shell:**

| | Commands | Hooks |
|---|---|---|
| Codex | `/bin/bash -lc <command>`: 1,292 of 1,292 calls in a recent session log | `$SHELL -lc <command>` on Mac and Linux, `cmd.exe /C` on Windows ([`command_runner.rs`](https://github.com/openai/codex/blob/main/codex-rs/hooks/src/engine/command_runner.rs)) |
| Claude Code | `bash -c 'source <snapshot> && eval <command>'`. The snapshot is built once per session by `$SHELL -c -l` sourcing `~/.bashrc` or `~/.zshrc`, and ends with `export PATH=` set to **Claude Code's own `process.env.PATH`**, read before any shell runs (not on Windows, where it asks the shell) | Claude Code's own environment |

So a start-up file reaches Codex and never reaches Claude Code. Claude Code finds a tool only when the program that started it had the folder on `PATH`: a terminal opened after the install does; a desktop app or the Paseo desktop app does only after the next login, on a stock user account; a daemon under systemd (`EnvironmentFile=/etc/environment`, as here) never does.

**Claude Code's own way in** is `CLAUDE_ENV_FILE`: a `SessionStart` hook appends shell lines to that file, and Claude Code runs them before every later command. This chat has its session folder under `~/.claude/session-env/`, so the mechanism is on when Paseo starts Claude Code; no hook writes to it yet.

**The repo's hooks call bare `node`.** `.agents/settings.json` (Claude Code) and `.agents/hooks.json` (Codex) both start `node …/session-start.mjs`. With Node only in `~/.local/bin`, Claude Code's hook fails and no memory loads.

**Setup's own chat.** *Run `export PATH=…`* holds for one command: each tool call is a new shell in both assistants.

**Other work.** Pull request #291 removes the Paseo section of `tools.md`, edits `wiki/development/required-tools.md` near its top, and adds a requirement at the end of `openspec/specs/install-onboarding/spec.md`. It touches neither hook file nor the PATH paragraph.

## Goals / Non-Goals

**Goals:**

- A later chat finds a user-folder tool in Codex and in Claude Code, whatever started the assistant.
- Setup's line is written by a snippet that gives the same file every run, not by prose.
- A test holds both to Ubuntu's stock files.

**Non-Goals:**

- Other assistants. They get the moved line and nothing else; none is named as needed.
- A repair script. The update note carries the one-time fix for an install that has the bug.
- Windows. Nothing installs to the user folder there.

## Decisions

### 1. The line goes first in the file, written by a snippet

Replace the paragraph after the OpenSpec install in `tools.md` with this, and change nothing else in the file:

````markdown
After a user-folder install, start every later command in this chat with `export PATH="$HOME/.local/bin:$PATH"; `, since each command is a new shell. Then put that line first in the start-up file, above the point where the file stops for a shell that is not interactive:

```bash
L='export PATH="$HOME/.local/bin:$PATH"'
case "$SHELL" in */zsh) set -- ~/.zshenv ~/.zshrc ;; *) set -- ~/.bashrc ;; esac
for F; do
  [ "$(head -n 1 "$F" 2>/dev/null)" = "$L" ] && continue
  touch "$F" && { echo "$L"; cat "$F"; } > "$F.new" && cat "$F.new" > "$F" && rm "$F.new"
done
```

Then check every tool again; one still missing is a failed install. [Why the line goes first](../../../../wiki/development/required-tools.md#where-an-assistant-finds-its-tools).
````

- **First line, not "above the guard".** Finding the guard means matching each distro's wording; line one is above all of them.
- **`cat "$F.new" > "$F"`, not `mv`.** It keeps a linked start-up file linked and its permissions as they were.
- **`touch` first, then every step joined by `&&`.** A missing file is created, and a file that can not be read is left as it was: a first draft without `touch` made no file at all in a home with no `~/.bashrc`.
- **The first-line test makes a second run a no-op.** A line an earlier setup left lower down stays.
- **zsh gets two files.** `~/.zshenv` is read by every zsh, which covers `zsh -lc`. A Mac's `/etc/zprofile` then moves `~/.local/bin` behind the system folders in a login shell; `~/.zshrc`, where the line is today, puts it back in front for a terminal.

Over `~/.profile`: the table shows it misses a shell that sources `~/.bashrc` by name, and a terminal under root's files. Over `BASH_ENV`: nothing sets it for the assistant.

### 2. Claude Code adds the folder at session start

In `.agents/settings.json`, `SessionStart` gains a first hook, in shell so it needs no Node:

```sh
case ":$PATH:" in *":$HOME/.local/bin:"*) ;; *) [ -n "$CLAUDE_ENV_FILE" ] && [ -d "$HOME/.local/bin" ] && echo 'export PATH="$HOME/.local/bin:$PATH"' >> "$CLAUDE_ENV_FILE" ;; esac; true
```

It writes only when the folder exists and `PATH` lacks it, so a computer that has the folder later on `PATH` keeps its order. It always exits 0: a failed hook must not block a session. Timeout 3.

The two `node` hook commands in the same file gain the prefix `PATH="$HOME/.local/bin:$PATH" `, since `CLAUDE_ENV_FILE` reaches commands, not hooks. On Windows these run in Git Bash, where the folder is absent and the prefix does nothing.

Over a new script file: a file is one more payload entry, in two lists pull request #291 also edits, and it would need Node or a path to itself. Over writing the line into the memory hook: `installation-owned-memory-devices` is rewriting those scripts, and a missing Node would stop it before it ran.

### 3. Codex's hook file does not change

Codex starts a hook with `$SHELL -lc`, a login shell, so Decision 1 reaches it. On Windows it uses `cmd.exe /C`, where the prefix is a syntax error.

### 4. One test file for both

`scripts/tests/tools-on-path.test.mjs`, skipped on Windows. It reads the snippet out of `tools.md` (the fenced block that starts `L='export PATH=`) and the hook command out of `.agents/settings.json`, so it tests the shipped text, and fails with a plain message when either is gone.

For the snippet, in a temp `HOME` holding a fake tool in `.local/bin`, for each of Ubuntu's two guards and each of the two `~/.profile` files (written inline, as quoted in Context):

- after the snippet, `bash -lc`, `bash -c 'source ~/.bashrc; …'`, and `bash -c -l 'source ~/.bashrc; …'` each find the tool; before it, with the line at the bottom, root's files find it in none (the test proves it can fail);
- a second run leaves the file byte-for-byte the same;
- a symlinked `~/.bashrc` stays a symlink, and its target gets the line;
- no `~/.bashrc` → one is created holding the line;
- `SHELL=/bin/zsh` → `~/.zshenv` and `~/.zshrc` both start with the line, and `~/.bashrc` is untouched.

Start each child with `env -i`, `SHLVL=1`, and `stdin` ignored. A bash started with no `SHLVL` and a socket on `stdin` reads `~/.bashrc` on its own, which made the first run of this table wrong.

For the hook: the folder present and off `PATH` → the env file holds the line; already on `PATH`, folder missing, or `CLAUDE_ENV_FILE` unset → nothing written; exit 0 in all four. Both `node` hook commands start with the prefix, and `.agents/hooks.json` holds no `PATH=`.

The suite runs it on any change outside `wiki/` and `openspec/`, which covers both files; no workflow step is added.

### 5. The wiki owns why

A new `## Where an assistant finds its tools` section in `wiki/development/required-tools.md`, placed after *Runtimes install at the point of need*, away from pull request #291's edit: the two assistants' rows from Context in plain words, what follows (setup's line goes first; Claude Code is told at session start), and a link to `tools.md` for the how. Under 150 words. `tools.md` links it and keeps no copy of the reasons.

### 6. The release

`## Next (patch) — A later chat finds the tools setup installed`. Its **Updating.** note, in plain words: *On a Mac or Linux computer where setup put its tools in your own folder, your assistant adds one line to the top of your shell's start-up file during this update, so every chat finds them. You do nothing.* It links the paragraph in `tools.md`, so the sync plan's to-do runs the same snippet.

### 7. This server is the acceptance test

Root's stock files with the line below the guard is the failing column of the table. After the build:

- **Codex's path:** run the snippet against the real `~/.bashrc`, then `env -i HOME=/root SHLVL=1 bash -lc 'echo $PATH' </dev/null` names `/root/.local/bin`. Before the snippet it does not.
- **Claude Code's path:** start a new Claude Code session in this workspace and read its `PATH`. It runs under the Paseo daemon, whose `PATH` cannot hold the folder, so only the hook can put it there. `~/.local/bin` exists here and holds `claude` and `codex`.

## Risks / Trade-offs

- [`CLAUDE_ENV_FILE` is unset or ignored in some way of starting Claude Code] → the hook writes nothing and exits 0; that session is no worse than today. Task 4.2 proves it on this server, and a miss stops the change before it is saved.
- [The Mac is untested: `/etc/zprofile` ordering, and what `PATH` a Mac desktop app hands Claude Code] → the zsh half follows zsh's documented start order, and the hook does not depend on the app's `PATH`. The fresh-Mac install, which waits for Matthew, is the check; this change does not claim it.
- [Another assistant that neither reads a start-up file nor runs hooks] → still misses the tools. It gets the moved line only; the wiki section says so.
- [A person's `~/.bashrc` whose first line must stay first] → none is known for a sourced file; a `#!` line there does nothing.
- [Pull request #291 lands first] → `tools.md` and `required-tools.md` merge without overlap; the spec delta replaces one requirement #291 leaves alone.
- [The hook puts `~/.local/bin` in front for Claude Code's commands] → the same order setup's line gives every other shell, and only when the folder was absent from `PATH`.
