# Tasks

## 1. Memory script

- [x] 1.1 Add `--all`, `--parts`, and `--part <k>` to `recent-chats` in `.agents/skills/memory/scripts/memory.mjs` (and `recentTranscripts` in `lib/transcripts.mjs` where the day cutoff lives), per design decision 1; keep the flag-less output unchanged; update the command's usage line.
- [x] 1.2 Author tests beside the existing ones in `scripts/tests/memory-capture.test.mjs`: `--all` includes a chat older than 30 days; `--parts` reports the count and date span; parts cover each chat once, newest first, with a chat kept whole; a part beyond the last says so and succeeds; redaction still holds in a part; no chats still says so.

## 2. Setup skill and docs

- [x] 2.1 Write `wiki/stack/learning-from-chats.md` by the wiki rules and voice, owning the procedure in design decisions 2–6; link it from the stack hub `wiki/stack/README.md` and from `wiki/stack/getting-started.md`.
- [x] 2.2 Add one sentence to `.agents/skills/wong-setup/SKILL.md` that starts the read after the source checkout and links the page, and keep `node scripts/measure-context.mjs --check` passing by cutting at least as many bytes from instruction files without losing a rule.
- [x] 2.3 Update the memory skill's `recent-chats` row in `.agents/skills/memory/SKILL.md` for the new flags and *ask first outside setup*, within the same budget.
- [x] 2.4 Update `wiki/stack/getting-started.md` and `wiki/stack/mini-apps.md` so the starter-site text says the message only changes the page and setup learns from past chats; check `README.md`'s setup paragraph still reads true and fix it if not.

## 3. Starter app

- [x] 3.1 Replace the first request in `app/src/pages/home/Tutorial.tsx` with design decision 7's text and update `Tutorial.test.tsx` to match; fix any other test that quotes the old message.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — Setup learns from your past chats` entry at the top of `CHANGELOG.md` with a plain **Updating.** note: the welcome box now only changes the page, and to learn from past chats on an existing install ask *get to know me from my past chats*. Leave `VERSION` alone.
- [x] 4.2 Add any new shipped file to the payload file list and manifest if they list files singly, and name the new spec text's area only if a check asks for it.

## 5. Final verification

- [x] 5.1 After all source and tests are authored, run `node .github/scripts/checks.mjs --worktree` and repair failures this change caused: script tests, app tests, payload links, wiki checks, retired names, context budget, and `openspec validate "setup-learns-from-chats" --strict --no-interactive`. Report local evidence without claiming remote checks passed.
