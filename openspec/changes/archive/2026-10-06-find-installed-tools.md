<!-- openspec-archive v1 2026-10-06-find-installed-tools -->
<!-- file proposal.md utf8 6417 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 11734 -->
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

<!-- end design.md -->
<!-- file tasks.md utf8 3577 -->
# Tasks

The snippet, the hook command, and every test case are in design.md; copy them from there. In `.agents/skills/wong-setup/references/tools.md`, change the one paragraph named in 1.1 and nothing else: pull request #291 edits the same file.

Run no test before section 4: each *verify … passes* in sections 1 and 2 is checked there, after every source and test file is written.

## 1. Setup's line

- [x] 1.1 `.agents/skills/wong-setup/references/tools.md`: replace the paragraph that starts *After a user-folder install* with the text in design.md - Decision 1. Verify `git diff --stat` shows that file changed in one hunk, and the fenced snippet equals design.md's character for character.
- [x] 1.2 Add `scripts/tests/tools-on-path.test.mjs` with the snippet cases in design.md - Decision 4: the snippet is read out of `tools.md`, each child starts with `env -i`, `SHLVL=1`, and `stdin` ignored, and the file is skipped on Windows. Verify it holds the five cases and the bottom-line case that must find nothing under root's files.

## 2. Claude Code's session step

- [x] 2.1 `.agents/settings.json`: add the shell hook first under `SessionStart`, timeout 3, and prefix the two `node` hook commands, by design.md - Decision 2. Verify the file parses as JSON and `git diff --stat` does not list `.agents/hooks.json`.
- [x] 2.2 Extend `scripts/tests/tools-on-path.test.mjs` with the hook cases in design.md - Decision 4: the command is read out of `.agents/settings.json`, four cases each exiting 0, the prefix on both `node` commands, and no `PATH=` in `.agents/hooks.json`. Verify the cases are written.

## 3. Guide and release

- [x] 3.1 `wiki/development/required-tools.md`: add `## Where an assistant finds its tools` after *Runtimes install at the point of need*, by design.md - Decision 5, in the wiki's voice (`wiki/voice.md`). Verify it is under 150 words, links `tools.md` the way the section above it does, and that the heading text matches the anchor `tools.md` links.
- [x] 3.2 `CHANGELOG.md`: add `## Next (patch) — A later chat finds the tools setup installed` at the top of the entries, with the **Updating.** note in design.md - Decision 6. Verify `git diff --stat` does not list `VERSION`.

## 4. Verification

- [x] 4.1 Run `node --test scripts/tests/tools-on-path.test.mjs`. Verify it passes. Then prove it can fail: change the snippet in `tools.md` to append the line (`echo "$L" >> "$F"`), see the root-files cases fail by name, and restore the snippet.
- [x] 4.2 Claude Code's path on this server, by design.md - Decision 7: start a new Claude Code session in this workspace with one instruction, to print `PATH`. Verify `/root/.local/bin` is on it and the memory digest loaded. If the folder is missing, stop and report it as a blocker: `CLAUDE_ENV_FILE` did not work as read, and Decision 2 needs another way.
- [x] 4.3 Codex's path on this server, by design.md - Decision 7: copy `~/.bashrc` to `/tmp/bashrc.before-find-installed-tools`, record that `env -i HOME=/root SHLVL=1 bash -lc 'echo $PATH' </dev/null` does not name `/root/.local/bin`, run the snippet from `tools.md` against the real file, and verify the same command now names it. Verify the file's first line is the line, lines 2 on equal the copy, and a second run changes nothing.
- [x] 4.4 Run `node .github/scripts/checks.mjs --worktree`. Verify every step passes, the context budget included; if it fails, trim this change's own lines in `tools.md`, not another file's.
- [x] 4.5 Run `openspec validate "find-installed-tools" --strict --no-interactive`. Verify it passes.

<!-- end tasks.md -->
<!-- file specs/install-onboarding/spec.md utf8 2097 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Setup readies the computer first

Before it clones the source or writes in the folder, setup SHALL ready the tools it needs, one GitHub sign-in with the `workflow` and `user:email` scopes, the git name and email, and on Windows real symbolic links, asking before each install; the person SHALL type no command. The same install question SHALL also cover the agent's browser tool and Cloudflare's tunnel tool when absent. Setup SHALL never install a package manager. A decline or failure SHALL stop setup with nothing written, except that a failed browser or tunnel install SHALL be reported and skipped, and an existing git identity SHALL stay unchanged. A tool setup installed in the person's own folder SHALL be found by a later chat in the installed repo, in Claude Code and in Codex, however the assistant was started, with no command typed and nothing removed from the person's own files.

#### Scenario: A new computer

- **WHEN** setup runs where tools, sign-in, and git identity are missing
- **THEN** it installs tools after asking, signs in through GitHub in the browser, and sets git identity from that account

#### Scenario: Sign-in not completed

- **WHEN** the person does not finish the GitHub approval
- **THEN** setup stops and has created no Cloudflare resource

#### Scenario: The helpers come with the one question

- **WHEN** setup runs where the browser tool and the tunnel tool are absent and the person says yes to its install question
- **THEN** both are installed, and no later step asks to install either

#### Scenario: A helper fails to install

- **WHEN** the browser tool or the tunnel tool fails to install during setup
- **THEN** setup names it, says it will be offered again at first need, and continues

#### Scenario: Tools in the person's own folder, in a later chat

- **WHEN** setup installed its tools in the person's own folder on Linux, and a new chat opens in the installed repo from an app that was started before the install
- **THEN** that chat's commands find the tools, and its memory loads

<!-- end specs/install-onboarding/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-06

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 38207 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker and puts the change name in place of its token. The one
  script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-10-06-find-installed-tools</title>
<style>
  :root { --ink:#222; --muted:#5f5f5f; --line:#b5b5b5; --fill:#f3f3f3; }
  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { margin:0; padding-bottom:76px; background:#e6e6e6; color:var(--ink); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  a { color:inherit; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--fill); border:1px solid #ddd; border-radius:3px; padding:0 3px; font-size:.88em; }
  :focus-visible { outline:3px solid #111; outline-offset:2px; }
  [hidden] { display:none !important; }
  header { padding:18px 0 4px; }
  .eyebrow { margin:0; color:var(--muted); font-size:13px; letter-spacing:.06em; text-transform:uppercase; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted); font-size:14px; margin:4px 0 0; }
  #script-error { color:#a00; font-weight:600; }
  section { margin:18px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted); font-size:13px; letter-spacing:.08em; text-transform:uppercase; }
  .card { background:#fff; border:1px solid var(--line); border-radius:6px; padding:12px; margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:#d6d6d6; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:3px; }
  [data-note]:hover, .noting { background:#f1f1f1; }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px -12px 0; }
  .item > .drawing:last-child { margin-bottom:-12px; }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 12px; border-top:1px solid #ddd; color:var(--muted); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--ink); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--line); background:var(--fill); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:12px; min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-color:#aaa; border-radius:17px; color:var(--muted); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:#fff; }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--line); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--fill); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); color:var(--muted); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted); font-size:13px; }
  .tag { display:inline-block; margin-right:8px; padding:0 8px; border:1px solid #777; border-radius:10px; background:#fff; color:var(--ink); font-size:12px; font-weight:700; }
  .tag.assumed { border-style:dashed; }
  .tag.check { border:2px dotted #333; }
  .hit { outline:3px solid #888; outline-offset:3px; }
  button { font:inherit; font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; border:1px solid #777; border-radius:4px; background:#fff; color:var(--ink); cursor:pointer; }
  button.primary { background:#333; border-color:#333; color:#fff; }
  button:disabled { opacity:.45; cursor:default; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; background:#333; border-color:#333; color:#fff; font:700 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { background:#fff; color:var(--ink); border-style:dashed; }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; }
  .entry .where { display:block; color:var(--muted); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; box-shadow:0 2px 8px rgba(0,0,0,.3); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:#fff; border:2px solid #333; border-radius:6px; box-shadow:0 4px 16px rgba(0,0,0,.25); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:2px 0 0; border-radius:0; padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; border:1px solid #777; border-radius:4px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:flex; align-items:center; gap:10px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:#fff; border-top:1px solid var(--line); }
  .bar .note-count { margin-right:auto; font-size:14px; }
  body.docked .bar, body.viewing .bar { display:none; }
  .session, #editor .copies { color:var(--muted); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  #toast { position:fixed; left:50%; bottom:72px; z-index:7; max-width:90vw; transform:translateX(-50%); padding:6px 12px; border-radius:4px; background:#222; color:#fff; font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
</style>
</head>
<body data-change="2026-10-06-find-installed-tools">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-06-find-installed-tools</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">When a computer gives setup no admin password, setup puts its tools in your own folder. A later chat can then fail to find them: the assistant reports a missing program, and nothing you ask for works. The readiness check on 2026-10-06 named this as a blocker for a person with no technical help.</p>
<p data-note="why-2" tabindex="0">Most personal computers take this path: Linux asks for a password, and a Mac without Homebrew has no other way in.</p>
<p data-note="why-3" tabindex="0">Checked on this server, the bug has two causes, one per assistant. The fix idea from 2026-09-29 covers only the first.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Setup writes its line where an assistant reads it.</b> Setup adds one line to your start-up file so later chats know the tools folder. Today the line lands at the bottom. Ubuntu's file tells an assistant to stop reading near the top, so the line is never reached. Setup now puts it first. This fixes Codex.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">your start-up file</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">┌────────────────────────┐</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">│ +the line, new place   │ ◀─ Codex stops below this</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│ &quot;assistants stop here&quot; │</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│ ...                    │</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│ the line, today        │ ◀─ only your own terminal</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">└────────────────────────┘</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">Claude Code reads none of it:</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">+each new chat adds the folder</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Each new Claude Code chat adds the tools folder itself.</b> Claude Code never reads that file. It knows only the folders its app started with, so no line in any file reaches it when Paseo or a desktop app starts it. The project now tells it at the start of every chat. Memory loading at the start of a chat is covered the same way.</div></div></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>You type nothing and see nothing new.</b> An install that already has the bug gets the fix at its next update: the new chat step arrives with it, and the assistant moves the line then.</div></div></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>This server gets the fix first, as the real test.</b> One line is added to the top of its start-up file, which holds the old line twice below the stop. The old lines stay.</div></div></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A check keeps it fixed.</b> It runs setup's real line against Ubuntu's stock file, and the new chat step against a computer with and without the tools folder, whenever either changes.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>The tools guide says where each assistant looks for tools</b>, so the next fix starts from the facts.</div></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>Not tried on a Mac.</b> The same fix is written for a Mac, from how its shell is documented to start. The fresh-Mac install will show whether it holds.</div></div></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: fix both causes in one change, because the check showed that moving the line fixes Codex and not Claude Code, and Matthew's page says a fix the checking finds goes in the same change, not a follow-up.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: on bash the line goes first in <code>~/.bashrc</code>, because it was the one place every tested start found it: a login shell, a shell that reads the file by name, and a terminal, on both of Ubuntu's stock files. A line only in <code>~/.profile</code> missed two of four.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: on zsh the line goes in <code>~/.zshenv</code> and stays in <code>~/.zshrc</code>, because zsh reads the first for every shell, and a Mac moves it behind the system folders in a login shell, where the second puts it back in front. Not tested: this server has no zsh.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: Claude Code gets the folder from the project's own session-start step, because its program (2.1.287) writes the PATH its app started with into every command and ignores what a start-up file sets.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: Codex's hook file stays as it is, because Codex starts a hook in a login shell on Mac and Linux, which the moved line reaches, and in <code>cmd.exe</code> on Windows, where a prefix would break it.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the chat step adds the folder only when it exists and is not already known, because moving it to the front on a computer that had it later could put an old copy of a tool ahead of the system's.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: a line an earlier setup wrote stays, because setup never deletes from a person's own file and a second copy of the folder does no harm.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: the existing promise is extended, not a new one added, because pull request #291 adds a requirement at the end of the same spec and two additions there would clash.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: this server's own start-up file is the real test, because it is the exact failing case: root's stock files, and the old line twice below the stop. Strike that line in review to skip it.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-06</p>Assumed: a patch release, because it changes no behavior a person asked for; it makes the installed tools findable.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-06</p>Asked what to do with the finished plan → chose build and publish.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-06</p>Archive checkpoint: built setup's start-up-file snippet, Claude Code's session-start step, the test, and the guide section; reconciled the installation spec; numbered release 37.2.3. Local checks passed, with <code>shellcheck</code> not installed here. On this server a new Claude Code chat started with <code>/root/.local/bin</code> first on PATH and loaded memory, and <code>bash -lc</code> found the folder after the snippet ran on the real <code>~/.bashrc</code>. The Mac half is untested.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom · tap a line to note it</p>
</div>
<div class="bar"><span class="note-count" aria-live="polite">0 notes</span><span class="session" hidden>Session only</span><button type="button" class="primary" id="copy">Copy notes</button></div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {} };
  const ok = function (r, id) { return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id); };
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  try {
    const saved = store ? JSON.parse(store.getItem(KEY) || 'null') : null;
    if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
    if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
  } catch (e) { /* unreadable notes start empty */ }
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-line-(\d+))?$/.exec(id) || [];
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    if (m[1] === 'item') return { at: '#/' + m[2], kind: m[3] ? 'drawing line ' + m[3] : 'item', spot: 'Change #' + m[2] + (m[3] ? ', drawing line ' + m[3] : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add'), function (n) { n.parentNode.removeChild(n); });
    const text = c.textContent.replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function find(id, label) {
    const el = document.querySelector('[data-note="' + id + '"]');
    return el && labelOf(el) === label ? el : null;
  }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }));
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0;
      const el = find(id, rec.label);
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && draft ? ' · ' : '') + (draft ? 'Draft' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        el.appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      if (el.closest('.art') || el.querySelector('.pin')) return;
      const id = el.getAttribute('data-note'), add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      el.appendChild(add);
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, tap = null;
  const pointers = {};
  function showChip(el, x, y, keyboard) {
    const id = el.getAttribute('data-note');
    chipFor = el;
    chip.textContent = noteOf(id) || data.drafts[id] ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false); else hideChip();
  });
  chip.addEventListener('click', function () { if (chipFor) openEditor(chipFor.getAttribute('data-note'), chipFor); });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id), el = rec ? find(id, rec.label) : t.closest('[data-note]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) { const el = chipFor; hideChip(); el.focus(); }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el) {
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const label = draft ? draft.label : note ? note.label : labelOf(el);
    open = { id: id, label: label, el: el };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = { label: open.label, text: text };
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (note) note.text = text; else data.notes.push({ id: id, label: open.label, text: text });
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save') {
      const n = data.notes.length;
      copyNotes(function () { toast('Saved and copied ' + plural(n) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d);
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump() {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  function notesText() {
    const lines = ['Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.'];
    data.notes.forEach(function (n) {
      const w = where(n.id);
      lines.push('- ' + w.spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' '));
    });
    return lines.join('\n');
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  $('copy').addEventListener('click', function () {
    const n = data.notes.length;
    if (!n) { toast('No saved notes yet. Drafts are not copied.'); return; }
    copyNotes(function () { toast('Copied ' + plural(n) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
  });
  window.addEventListener('hashchange', jump);
  render();
  jump();
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
