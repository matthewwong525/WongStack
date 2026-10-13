# Tasks

## 1. Starter app

- [x] 1.1 In `app/src/pages/home/Tutorial.tsx`, replace the first request with design decision 1's exact text, the supporting line with decision 2's, and the comment above the message per decision 3; update `app/src/pages/home/Tutorial.test.tsx` to the new message and supporting line. Verify by reading that the test's quoted strings equal the source's.
- [x] 1.2 Replace the quoted message in `.agents/verification/journeys/mini-apps/the-starter-landing-page-teaches-the-loop-a-fresh-install.json` per design decision 4, and fix any other file `grep -rn "Make this home page mine"` still finds outside `CHANGELOG.md` and `openspec/changes/archive/`. Verify the grep returns nothing else.

## 2. Docs

- [x] 2.1 Update the welcome's description in `wiki/stack/mini-apps.md`, the starter-site bullet in `wiki/stack/getting-started.md`, and the closing clause of `wiki/stack/learning-from-chats.md`'s first paragraph so each says the message asks about your work and builds your first app, by the wiki rules and voice. Reword the welcome line in `.agents/skills/wong-sync/references/payload-manifest.md` at the same length or shorter. Verify no page still says the message only changes the page.

## 3. Release

- [x] 3.1 Add a `## Next (minor) — The first message builds your first app` entry at the top of `CHANGELOG.md`'s entries with a plain **Updating.** note: the welcome box's message changes only where your home page still shows it; a removed box stays removed. Leave `VERSION` alone.

## 4. Final verification

- [x] 4.1 After all source, tests, and docs are written, run `node .github/scripts/checks.mjs --worktree` and repair failures this change caused: app tests, payload links, wiki checks, context budget, and `openspec validate "first-request-builds-first-app" --strict --no-interactive`. Report local evidence without claiming remote checks passed.
