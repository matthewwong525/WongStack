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
