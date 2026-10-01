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
