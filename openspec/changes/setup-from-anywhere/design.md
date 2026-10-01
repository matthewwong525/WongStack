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
