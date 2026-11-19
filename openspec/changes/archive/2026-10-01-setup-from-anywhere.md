<!-- openspec-archive v1 2026-10-01-setup-from-anywhere -->
<!-- file proposal.md utf8 7900 -->
# Proposal

**Status:** ready-to-ship
**Branch:** setup-from-anywhere
**Open questions:** none

## Why

wongstack.com will soon ask people to install WongStack themselves, for free, by pasting one prompt into whatever chat they have open. Today that prompt stops unless the chat is in an empty folder, and the starter site's first message only renames the page, so the assistant still knows nothing about the person it now works for.

## What Changes

- **Setup works from any folder.** Paste the prompt anywhere. When the open folder already has files, setup makes a new `wongstack` folder in your home folder and installs there, instead of stopping. It tells you where it went and to open that folder in Paseo next time. An empty folder still installs in place, and a folder that already has WongStack still gets an update.
  ```text
  paste the prompt
         │
         ▼
   folder empty? ──yes──▶ install here
         │ no
         ▼
   ~/wongstack (or ~/wongstack-2)
         │
         ▼
   install there, say where it is
  ```

- **"Make it yours" gets to know you.** The same single box on your starter site gets a new message. Paste it, and the assistant asks before it looks at anything. Then it skims your Claude Code and Codex chats from the last 30 days on this computer, asks two or three short rounds of questions about what it could not find, saves short notes about you, and makes the home page yours. You see a preview, and it asks before publishing. On a server with no past chats, it skips straight to the questions.
  ```text
     BEFORE                      AFTER
  ┌──────────────────────┐  ┌──────────────────────┐
  │ Make it yours        │  │ Make it yours        │
  │ Help me make this    │  │ Get to know me and   │
  │ home page my own.    │  │ make this home page  │
  │ Ask me what to call  │  │ mine. First ask if   │
  │ it ...               │  │ you may skim my      │
  │                      │  │ chats ...            │
  │ [Copy your first     │  │ [Copy your first     │
  │  request]            │  │  request]            │
  └──────────────────────┘  └──────────────────────┘
  ```

- **Your past chats are read safely.** The assistant reads them through a small built-in tool, not by opening the files itself. The tool keeps only what you typed, hides passwords and keys, and keeps the reading short. The notes it saves never hold passwords, keys, or copies of your chats.
  ```text
  last 30 days of chats
         │
         ▼
  ┌──────────────────┐
  │ keep what you    │
  │ typed; hide keys │
  │ cap the length   │
  └──────────────────┘
         │
         ▼
  assistant reads ──▶ asks the rest
         │
         ▼
  short notes: your wiki page + memory
  ```

- **The README's three steps match.** Step 2 no longer says to make an empty folder: open Paseo and paste `Install WongStack from github.com/matthewwong525/WongStack`. Step 3 ends with opening your site and pasting its "Make it yours" message.
  ```text
     BEFORE                  AFTER
  2. Make an empty      2. Open Paseo and
     folder, open it       paste this:
     in Paseo, paste:      Install WongStack
     Install WongStack     from github.com/...
     in this folder ...
  ```

Non-goals: no step to paste history from ChatGPT or Claude.ai; no change to wongstack-cloud's own "Get to know me" message; no change to how setup asks for the GitHub sign-in or the Cloudflare key.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `install-onboarding`: setup makes its own folder instead of stopping; the README prompt no longer asks for an empty folder.
- `mini-apps`: the starter welcome's first request learns about the person from past chats and questions before personalizing the page.
- `memory`: a `recent-chats` read that returns the person's own redacted messages from the last 30 days, with no store needed.

## Impact

- `.agents/skills/wong-setup/SKILL.md` (source-only): the empty-folder section and description.
- `app/src/pages/home/Tutorial.tsx` and `Tutorial.test.tsx`: the new message (payload, app scaffold).
- `.agents/skills/memory/scripts/memory.mjs`, `lib/transcripts.mjs`, `SKILL.md`: the `recent-chats` command; tests in `scripts/tests/memory-capture.test.mjs`.
- `README.md`, `wiki/stack/getting-started.md`, `wiki/stack/mini-apps.md`, `wiki/README.md`, `wiki/stack/README.md`: wording that says setup needs an empty folder, and getting-started's stale box name.
- `CHANGELOG.md`: a `## Next (minor)` entry.
- The landing-page part in wongstack-cloud (workspace "joyful-bumblebee") goes live after this release; its prompt stays `Install WongStack from github.com/matthewwong525/WongStack`.

## Decision log

- **2026-10-01** — Asked where setup makes the new folder when the open one has files → chose `~/wongstack` in the home folder (or `~/wongstack-2` when taken), so it is easy to find and never lands inside another project.
- **2026-10-01** — Asked how the assistant should skim past chats → chose a small built-in memory tool that keeps only the person's own messages, hides keys, and caps the length.
- **2026-10-01** — Assumed: setup makes the new folder without asking, and creates it only when it writes its first file, so a declined tool install or a missing Cloudflare key still leaves nothing behind.
- **2026-10-01** — Assumed: after setup in a new folder, the "Make it yours" paste still goes into the setup chat, because that paste is setup's human-login check; the closing report adds where the folder is and to open it in Paseo for later chats.
- **2026-10-01** — Assumed: a `~/wongstack` that already holds WongStack goes to `/wong-sync` there, and one with other files moves on to `~/wongstack-2`, because setup never writes into an existing project.
- **2026-10-01** — Assumed: the message's wording, shown in the After sketch and the spec, because a reviewer can cheaply change it; it names no file or command, and the memory skill's description mentions skimming recent chats so the assistant finds the tool.
- **2026-10-01** — Assumed: the tool reads chats from every folder on the computer, not only this one, because the person asked to learn from their recent work, which mostly happened elsewhere.
- **2026-10-01** — Assumed: the box keeps its title and its "Copy your first request" button, and existing installs get the new message on their next update only while the box is still showing, as today.
- **2026-10-01** — Assumed: the landing prompt stays `Install WongStack from github.com/matthewwong525/WongStack`, so the landing chat needs no new wording.
- **2026-10-01** — Assumed: the memory skill's description reads *"Search and record repo memory: decisions, preferences, open threads; skim recent chats to learn about someone."*, dropping *"each traceable to its transcript"*, because the planned wording put the session-start word count 8 over its 2200 ceiling; the Read table still lists `source`.
- **2026-10-01** — Assumed: save the built change to check it in CI before asking to publish, because task 5.3 needs the test run and a preview.
- **2026-10-01** — Saved as PR #228; checks passed, and the preview home page shows the new message in the one *Make it yours* box. Task 5.4 waits for the release.
- **2026-10-01** — Assumed: telling the landing-page chat (old task 5.4) moves to right after the merge, because it can only say the release is out once it is; a memory thread tracks it.
- **2026-10-01** — Archive checkpoint: numbered 29.2.0 for release.

<!-- end proposal.md -->
<!-- file design.md utf8 7454 -->
# Design

## Context

- `/wong-setup` ([SKILL.md](../../../.agents/skills/wong-setup/SKILL.md)) is source-only: a person's agent reads it from the raw GitHub address. Its *Start from an empty folder* section stops on a folder with files and offers a choice. The landing page's prompt will be pasted into any open chat, often one opened in the home folder or another project.
- The starter home page's welcome lives in [`Tutorial.tsx`](../../../app/src/pages/home/Tutorial.tsx), a payload file in the app scaffold. Its `message` is the copied text, and [`Tutorial.test.tsx`](../../../app/src/pages/home/Tutorial.test.tsx) pins it verbatim. `/wong-sync` updates it only while a target still renders `<Tutorial />` ([mini apps](../../../wiki/stack/mini-apps.md)).
- [`transcripts.mjs`](../../../.agents/skills/memory/scripts/lib/transcripts.mjs) already parses both Claude Code (`~/.claude/projects/<escaped-cwd>/<uuid>.jsonl`) and Codex (`~/.codex/sessions/YYYY/MM/DD/rollout-*.jsonl`) transcripts, drops injected text, and honours `WONG_MEMORY_CLAUDE_HOME` / `WONG_MEMORY_CODEX_HOME` for tests. [`scan.mjs`](../../../.agents/skills/memory/scripts/lib/scan.mjs)'s `redact` replaces `.env` values and token shapes. Its discovery is scoped to this clone's checkouts; this read is not.
- Setup's closing report ([cloudflare.md Step 5](../../../.agents/skills/wong-setup/references/cloudflare.md#step-5--the-closing-report)) already ends on the site and the box, and the paste is the human-login check. That stays.

## Goals / Non-Goals

**Goals:**

- The prompt `Install WongStack from github.com/matthewwong525/WongStack` works from any open folder.
- The first message learns about the person cheaply and safely, then personalizes the page through the normal loop.

**Non-Goals:**

- Adding WongStack to an existing project (still a separate, unplanned idea).
- Reading ChatGPT or Claude.ai history.
- wongstack-cloud's dashboard message, or the hosted setup path.

## Decisions

### Setup picks its target before anything else

Replace *Start from an empty folder* with *Pick the folder*:

1. The open folder has `.claude/.wong-stack.json` → `/wong-sync`, as today.
2. It is empty, or holds only a `.git` with no commits → install here.
3. Otherwise the target is `~/wongstack`: missing or empty → use it; it holds an install record → `/wong-sync` there; it holds anything else → try `~/wongstack-2`, `-3`, and so on.

Tell the person the target in one line (*"This folder already has files, so I'll set up WongStack in ~/wongstack."*), with no question. Create it with `mkdir -p` only at the first write, after the tools and the token, so the existing promise *a declined or failed step stops setup with nothing written* holds. Every later step, `/explore` intent included, uses the target's absolute path; the intent's *"in this empty folder"* becomes *"in <target>"*. Step 5 gets one line: when the target is not the open folder, name it and say *"Next time, open <target> in Paseo to chat."* The paste still comes into this chat.

Alternative: a subfolder of the open folder. Rejected by the person: it nests inside another project when the chat was opened in one.

The description changes from *"in an empty folder"* to *"from any folder"*, so the agent picking the skill from its listing does not expect to stop.

### A `recent-chats` memory command

`memory.mjs recent-chats [--days 30] [--limit <chars>]`:

- Walks every project folder under the Claude home and the Codex day folders for the window, by file modification time; skips `subagents/` paths and registry entries marked `background`; skips the current session when `WONG_MEMORY_EXCLUDE` names it.
- Parses each file with `parseTranscriptText`, keeps only `role === 'user'` messages, and drops `<pasted_content>` blocks the person pasted from elsewhere.
- Redacts with `redact(text, secretValues(.env))`, trims each message to about 500 characters, and prints newest session first under a one-line header (date and folder name, never a full path into another repo's files).
- Stops at the total cap (default 40,000 characters) with a line saying more was left out.
- Prints `No Claude Code or Codex chats from the last <n> days on this computer.` and exits 0 when nothing qualifies, as on a hosted server.
- Needs no store: `repoContext()` only needs git, and the command never calls `openStore`.

Shared discovery code moves into `transcripts.mjs` as a small exported `recentTranscripts({ days, now })`, so the clone-scoped `discover` stays unchanged.

Alternative: the message names the two folders and the agent reads them. Rejected by the person: transcripts are large and mixed with tool output and secrets.

### The message

```text
Get to know me and make this home page mine. First ask if you may skim my Claude Code and Codex chats from the last 30 days on this computer. Then ask me two or three short rounds of questions about what you couldn't find. Save short notes about me on my wiki page and in your memory, never passwords, keys, or copies of my chats. Then ask what to call this page, update its heading, remove this welcome guide, explain each step, and show me a preview before publishing.
```

It names no command; the memory skill's description gains *"and skims recent chats to learn about a person"* so the agent finds `recent-chats`, and the skill's Read table gets a row for it. The notes follow [the People rules](../../../wiki/wiki-style.md#people): `wiki/people/<name>.md` with their git email, plus `user` facts through the memory skill. The page edit and the wiki page travel in one change through the loop, so the preview and *publish it?* come from the normal flow.

The heading, description, button labels, and paste line stay. Only `message` and its test constant change.

### Docs

- README step 2: *"Open Paseo and paste this:"* with `Install WongStack from github.com/matthewwong525/WongStack`; the agent line stays. Step 3 ends: *"Then open your site and paste its Make it yours message: the assistant gets to know you and makes the page yours."* The closing *"In a folder that already has files, setup stops and says so."* becomes *"Paste it in any folder: if it already has files, setup makes a `wongstack` folder in your home folder."*
- `wiki/stack/getting-started.md`: the starter-site bullet names *Make it yours* (it still says *Learn the development loop*) and says the first message gets to know you.
- `wiki/stack/mini-apps.md`: the welcome sentence describes the new request.
- `wiki/README.md` and `wiki/stack/README.md`: *"once in an empty folder"* → *"once, from any folder"*. `d1-pipeline.md`'s *"An install starts from an empty folder"* stays true (the target is empty) and is left alone.

## Risks / Trade-offs

- **Privacy of other projects' chats.** The read spans every folder on the computer. Mitigated by asking first, keeping only the person's own words, redacting keys, and saving only short notes; the raw text never reaches memory or git.
- **The agent may skip the tool and read files directly.** The description and Read-table row make the tool findable; the message cannot name it without showing a command on the person's page.
- **A Paseo chat opened in one folder now installs in another.** Later chats opened in the old folder will not see WongStack; the closing report says which folder to open.
- **The cap may drop useful older chats.** Newest first keeps the current picture; questions fill the gaps.

<!-- end design.md -->
<!-- file tasks.md utf8 3179 -->
# Tasks

## 1. Setup (source-only skill)

- [x] 1.1 In `.agents/skills/wong-setup/SKILL.md`, replace *Start from an empty folder* with *Pick the folder* by the design: open folder, then `~/wongstack`, `~/wongstack-2`…, an install record goes to `/wong-sync`, one plain line naming the target, no question, the folder made only at the first write.
- [x] 1.2 Use the target's absolute path in the `/explore` intent (*"in <target>"*) and change the description to *"from any folder"*.
- [x] 1.3 In `references/cloudflare.md` Step 5, add the line naming the new folder and *"Next time, open <target> in Paseo to chat."*, only when the target is not the open folder.

## 2. Recent chats (memory script)

- [x] 2.1 Add `recentTranscripts({ days, now })` to `lib/transcripts.mjs`: every Claude project folder and the Codex day folders in the window, skipping `subagents/`, background registry entries, and `WONG_MEMORY_EXCLUDE`.
- [x] 2.2 Add `recent-chats [--days n] [--limit chars]` to `memory.mjs`: user messages only, `<pasted_content>` dropped, `.env` and token redaction, about 500 characters per message, newest session first under a date-and-folder header, a total cap with a "more left out" line, the no-chats line with exit 0, and no store call. Add it to `USAGE`.
- [x] 2.3 Cover it in `scripts/tests/memory-capture.test.mjs` with fixture homes: a Claude and a Codex chat in the window, one older than the window, a subagent file, a token in a user message, an assistant reply, the cap, and an empty home that prints the no-chats line and exits 0 with no store configured.
- [x] 2.4 In `.agents/skills/memory/SKILL.md`, add the Read-table row and the description's *"and skims recent chats to learn about a person"*; run `node scripts/measure-context.mjs --check`.

## 3. Starter home page (app scaffold)

- [x] 3.1 Replace `message` in `app/src/pages/home/Tutorial.tsx` with the design's wording, leaving the heading, description, labels, and paste line.
- [x] 3.2 Update the `message` constant in `Tutorial.test.tsx`; the existing tests then pin the new text, the single box, and both copy paths.

## 4. Docs

- [x] 4.1 README *Start in three steps*: step 2's *Open Paseo and paste this* with `Install WongStack from github.com/matthewwong525/WongStack`, step 3's closing *Make it yours* sentence, and the *any folder* line replacing *setup stops and says so*.
- [x] 4.2 `wiki/stack/getting-started.md`: name *Make it yours* and say its message gets to know you.
- [x] 4.3 `wiki/stack/mini-apps.md`: describe the new first request.
- [x] 4.4 `wiki/README.md` and `wiki/stack/README.md`: *once in an empty folder* → *once, from any folder*.

## 5. Release

- [x] 5.1 Add a `## Next (minor) — Setup from any folder, and a first message that gets to know you` entry to `CHANGELOG.md`, with an **Updating.** note saying the new message arrives only while the welcome box is still on the home page.
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`.
- [x] 5.3 Through `/save`, confirm CI passes, and that the preview's home page shows the new message in the one *Make it yours* box.

<!-- end tasks.md -->
<!-- file specs/install-onboarding/spec.md utf8 2684 -->
## MODIFIED Requirements

### Requirement: The README offers one prompt to paste

The README SHALL give a one-line prompt that names the WongStack GitHub repository and asks the agent to install it, with no folder named and no folder to make first. Next to it, a line addressed to the agent SHALL give the raw address of `.agents/skills/wong-setup/SKILL.md` by its real path. The README SHALL send the person to Paseo, running Claude Code or Codex on their own computer, as the place to paste it, with no terminal inside the chat and no cloud-container session. It SHALL say what they need first: a free GitHub account and a free Cloudflare account. Its steps SHALL end with opening the starter site and pasting its first message.

#### Scenario: A newcomer reads the README

- **WHEN** someone new to coding agents reads the install section
- **THEN** they find one prompt, an app to paste it in, and what they need first, with no step to make a folder

#### Scenario: The agent finds the runbook

- **WHEN** an agent is given only the one-line prompt and reads the repository's README
- **THEN** it finds the setup runbook's raw address there and follows it

## REMOVED Requirements

### Requirement: Setup installs only into an empty folder

**Reason**: Setup no longer stops in a folder with files; it makes its own folder. Replaced by "Setup installs into an empty folder it finds or makes".
**Migration**: None for installed repos; a person pastes the same prompt anywhere.

## ADDED Requirements

### Requirement: Setup installs into an empty folder it finds or makes

`/wong-setup` SHALL install into the open folder when it is empty, or holds only a `.git` with no commits. A folder with an install record SHALL go to `/wong-sync`. Any other folder SHALL stay untouched: setup SHALL install instead into a new `wongstack` folder in the person's home folder, taking the next free numbered name when one exists with other files, and going to `/wong-sync` when one already holds WongStack. Setup SHALL make that folder without asking, only once it writes its first file, and SHALL say where it is and to open it in Paseo for later chats. The install SHALL always take everything, with no component question.

#### Scenario: Empty folder

- **WHEN** a person runs setup in an empty folder with a Cloudflare token
- **THEN** setup installs everything there without asking which parts to take

#### Scenario: A folder with files

- **WHEN** setup runs in a folder with files and no install record
- **THEN** it writes nothing in that folder, installs into a new `wongstack` folder in the home folder, and its closing report names that folder and says to open it in Paseo next time

<!-- end specs/install-onboarding/spec.md -->
<!-- file specs/memory/spec.md utf8 992 -->
## ADDED Requirements

### Requirement: Recent chats are read through code

Memory SHALL offer a read of the person's recent chats that needs no memory store: their own typed messages from Claude Code and Codex chats on this computer over the last 30 days by default, from every folder, newest first. It SHALL leave out the agent's replies, tool output, injected instructions, background runs, and subagent chats; replace every non-empty `.env` value and known token pattern with a placeholder; and cap the total length. With no recent chats, it SHALL say so and succeed.

#### Scenario: Chats with a key in them

- **WHEN** a recent chat holds a message with a GitHub token and an agent reply
- **THEN** the read shows the person's message with a placeholder for the token, and no agent reply

#### Scenario: A computer with no chats

- **WHEN** the read runs where no Claude Code or Codex chat is newer than 30 days
- **THEN** it prints that it found no recent chats and exits successfully

<!-- end specs/memory/spec.md -->
<!-- file specs/mini-apps/spec.md utf8 2438 -->
## MODIFIED Requirements

### Requirement: The starter landing page teaches the loop

The starter landing page SHALL have a permanent workspace heading and open its guidance with one removable welcome, titled *Make it yours*, that makes clear that changes begin by asking in the person's existing chat. It SHALL offer one selectable, copyable first request that asks the agent to get to know the person, personalize the workspace heading, remove the welcome, explain the steps, and show a preview before publishing. The page SHALL confirm a successful copy and retain a way to copy by hand if clipboard access is unavailable. The mini-app list SHALL sit below the welcome. Removing the welcome SHALL leave the workspace heading and app list usable. Sync SHALL update the welcome only while the target still shows it.

#### Scenario: A fresh install

- **WHEN** a person opens a new install's production app
- **THEN** they see a workspace heading, the welcome and its one copyable first request, and the example app listed below
- **AND** the guidance makes clear where to paste the request and that a preview precedes publishing

#### Scenario: A removed tutorial after an update

- **WHEN** a target removed its tutorial and syncs to a later release
- **THEN** no tutorial comes back, and the workspace heading and app list remain usable

## ADDED Requirements

### Requirement: The first request learns about the person

The first request SHALL ask the agent to ask permission before reading anything, then skim the person's Claude Code and Codex chats from the last 30 days on this computer, then ask two or three short rounds of questions about what it could not find. It SHALL ask the agent to save short notes about the person on their wiki page and in memory, never passwords, keys, or copies of chats, and only then to personalize the page with a preview and ask before publishing. The request SHALL name no file, folder, or command.

#### Scenario: Past chats found

- **WHEN** a person pastes the request on a computer with recent chats and allows the skim
- **THEN** the agent asks only what the chats did not answer, saves short notes about them, and shows a preview of their page before publishing

#### Scenario: No past chats or no permission

- **WHEN** the person declines the skim, or the computer has no recent chats, such as a hosted server
- **THEN** the agent reads nothing and goes straight to the question rounds

<!-- end specs/mini-apps/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-10-01

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 41901 fence=~~~ -->
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
<title>Review · 2026-10-01-setup-from-anywhere</title>
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
<body data-change="2026-10-01-setup-from-anywhere">
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-10-01-setup-from-anywhere</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint">Tap + Note to comment. Saving a note copies all your notes. Open a drawing and tap it to see it full screen.</p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">wongstack.com will soon ask people to install WongStack themselves, for free, by pasting one prompt into whatever chat they have open. Today that prompt stops unless the chat is in an empty folder, and the starter site's first message only renames the page, so the assistant still knows nothing about the person it now works for.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Setup works from any folder.</b> Paste the prompt anywhere. When the open folder already has files, setup makes a new <code>wongstack</code> folder in your home folder and installs there, instead of stopping. It tells you where it went and to open that folder in Paseo next time. An empty folder still installs in place, and a folder that already has WongStack still gets an update.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">paste the prompt</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">       │</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">       ▼</span>
<span class="ln" data-note="item-1-line-4" tabindex="0"> folder empty? ──yes──▶ install here</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">       │ no</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">       ▼</span>
<span class="ln" data-note="item-1-line-7" tabindex="0"> ~/wongstack (or ~/wongstack-2)</span>
<span class="ln" data-note="item-1-line-8" tabindex="0">       │</span>
<span class="ln" data-note="item-1-line-9" tabindex="0">       ▼</span>
<span class="ln" data-note="item-1-line-10" tabindex="0"> install there, say where it is</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>&quot;Make it yours&quot; gets to know you.</b> The same single box on your starter site gets a new message. Paste it, and the assistant asks before it looks at anything. Then it skims your Claude Code and Codex chats from the last 30 days on this computer, asks two or three short rounds of questions about what it could not find, saves short notes about you, and makes the home page yours. You see a preview, and it asks before publishing. On a server with no past chats, it skips straight to the questions.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-2-line-1" tabindex="0">   BEFORE                      AFTER</span>
<span class="ln" data-note="item-2-line-2" tabindex="0">┌──────────────────────┐  ┌──────────────────────┐</span>
<span class="ln" data-note="item-2-line-3" tabindex="0">│ Make it yours        │  │ Make it yours        │</span>
<span class="ln" data-note="item-2-line-4" tabindex="0">│ Help me make this    │  │ Get to know me and   │</span>
<span class="ln" data-note="item-2-line-5" tabindex="0">│ home page my own.    │  │ make this home page  │</span>
<span class="ln" data-note="item-2-line-6" tabindex="0">│ Ask me what to call  │  │ mine. First ask if   │</span>
<span class="ln" data-note="item-2-line-7" tabindex="0">│ it ...               │  │ you may skim my      │</span>
<span class="ln" data-note="item-2-line-8" tabindex="0">│                      │  │ chats ...            │</span>
<span class="ln" data-note="item-2-line-9" tabindex="0">│ [Copy your first     │  │ [Copy your first     │</span>
<span class="ln" data-note="item-2-line-10" tabindex="0">│  request]            │  │  request]            │</span>
<span class="ln" data-note="item-2-line-11" tabindex="0">└──────────────────────┘  └──────────────────────┘</span></pre></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Your past chats are read safely.</b> The assistant reads them through a small built-in tool, not by opening the files itself. The tool keeps only what you typed, hides passwords and keys, and keeps the reading short. The notes it saves never hold passwords, keys, or copies of your chats.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-3-line-1" tabindex="0">last 30 days of chats</span>
<span class="ln" data-note="item-3-line-2" tabindex="0">       │</span>
<span class="ln" data-note="item-3-line-3" tabindex="0">       ▼</span>
<span class="ln" data-note="item-3-line-4" tabindex="0">┌──────────────────┐</span>
<span class="ln" data-note="item-3-line-5" tabindex="0">│ keep what you    │</span>
<span class="ln" data-note="item-3-line-6" tabindex="0">│ typed; hide keys │</span>
<span class="ln" data-note="item-3-line-7" tabindex="0">│ cap the length   │</span>
<span class="ln" data-note="item-3-line-8" tabindex="0">└──────────────────┘</span>
<span class="ln" data-note="item-3-line-9" tabindex="0">       │</span>
<span class="ln" data-note="item-3-line-10" tabindex="0">       ▼</span>
<span class="ln" data-note="item-3-line-11" tabindex="0">assistant reads ──▶ asks the rest</span>
<span class="ln" data-note="item-3-line-12" tabindex="0">       │</span>
<span class="ln" data-note="item-3-line-13" tabindex="0">       ▼</span>
<span class="ln" data-note="item-3-line-14" tabindex="0">short notes: your wiki page + memory</span></pre></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The README's three steps match.</b> Step 2 no longer says to make an empty folder: open Paseo and paste <code>Install WongStack from github.com/matthewwong525/WongStack</code>. Step 3 ends with opening your site and pasting its &quot;Make it yours&quot; message.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">   BEFORE                  AFTER</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">2. Make an empty      2. Open Paseo and</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">   folder, open it       paste this:</span>
<span class="ln" data-note="item-4-line-4" tabindex="0">   in Paseo, paste:      Install WongStack</span>
<span class="ln" data-note="item-4-line-5" tabindex="0">   Install WongStack     from github.com/...</span>
<span class="ln" data-note="item-4-line-6" tabindex="0">   in this folder ...</span></pre></div></details></li>
</ol>
<p class="aside">Non-goals: no step to paste history from ChatGPT or Claude.ai; no change to wongstack-cloud's own &quot;Get to know me&quot; message; no change to how setup asks for the GitHub sign-in or the Cloudflare key.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked where setup makes the new folder when the open one has files → chose <code>~/wongstack</code> in the home folder (or <code>~/wongstack-2</code> when taken), so it is easy to find and never lands inside another project.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-10-01</p>Asked how the assistant should skim past chats → chose a small built-in memory tool that keeps only the person's own messages, hides keys, and caps the length.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: setup makes the new folder without asking, and creates it only when it writes its first file, so a declined tool install or a missing Cloudflare key still leaves nothing behind.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: after setup in a new folder, the &quot;Make it yours&quot; paste still goes into the setup chat, because that paste is setup's human-login check; the closing report adds where the folder is and to open it in Paseo for later chats.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: a <code>~/wongstack</code> that already holds WongStack goes to <code>/wong-sync</code> there, and one with other files moves on to <code>~/wongstack-2</code>, because setup never writes into an existing project.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the message's wording, shown in the After sketch and the spec, because a reviewer can cheaply change it; it names no file or command, and the memory skill's description mentions skimming recent chats so the assistant finds the tool.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the tool reads chats from every folder on the computer, not only this one, because the person asked to learn from their recent work, which mostly happened elsewhere.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the box keeps its title and its &quot;Copy your first request&quot; button, and existing installs get the new message on their next update only while the box is still showing, as today.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the landing prompt stays <code>Install WongStack from github.com/matthewwong525/WongStack</code>, so the landing chat needs no new wording.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: the memory skill's description reads <i>&quot;Search and record repo memory: decisions, preferences, open threads; skim recent chats to learn about someone.&quot;</i>, dropping <i>&quot;each traceable to its transcript&quot;</i>, because the planned wording put the session-start word count 8 over its 2200 ceiling; the Read table still lists <code>source</code>.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: save the built change to check it in CI before asking to publish, because task 5.3 needs the test run and a preview.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-01</p>Saved as PR #228; checks passed, and the preview home page shows the new message in the one <i>Make it yours</i> box. Task 5.4 waits for the release.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-10-01</p>Assumed: telling the landing-page chat (old task 5.4) moves to right after the merge, because it can only say the release is out once it is; a memory thread tracks it.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-10-01</p>Archive checkpoint: numbered 29.2.0 for release.</li>
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
