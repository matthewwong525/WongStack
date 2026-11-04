# Tasks

## 1. The connect skill

- [x] 1.1 Write `.agents/skills/connect/SKILL.md`: a description of about 10 words, then only its rules (design decision 2), pointing to `wiki/stack/connect-your-tools.md` for the steps.
- [x] 1.2 Add `connect` to `core.skillDirs` in `.agents/skills/wong-sync/references/payload-files.json`, and to the payload manifest if it lists skills.

## 2. Setup

- [x] 2.1 In `.agents/skills/wong-setup/references/cloudflare.md` Step 5, add the line that goes on to `connect` after the report and before the *Make it yours* step, with *skip* (design decision 1); add a matching clause in `.agents/skills/wong-setup/SKILL.md`'s last paragraph only if Step 5 alone is not read there.

## 3. Docs

- [x] 3.1 Write `wiki/stack/connect-your-tools.md` (design decisions 3 to 6): the three groups, the look-up, how to work out a new tool (the decision 4 table and its notes page), the owner's one key link and one yes, the teammate's message and *for <name>*, and *not connected yet*.
- [x] 3.2 Link it from `wiki/stack/README.md`, `wiki/stack/getting-started.md`, `wiki/stack/api-keys.md` and `wiki/stack/service-catalogue.md`, one sentence each.
- [x] 3.3 Sync `openspec/specs/install-onboarding/spec.md` and add `openspec/specs/connect-tools/spec.md` from the deltas; add the spec and the page to an area in `.agents/skills/memory/references/areas.json`.
- [x] 3.4 Add a `## Next (minor) — Connect your tools after install` entry to `CHANGELOG.md`, with an **Updating.** note: an owner who installed before can type *connect my tools* in a chat.

## 4. Verify

- [x] 4.1 Run `node scripts/measure-context.mjs --check`; if start-up or instructions are over, cut `update-dependencies`' description or the new skill's own lines (design decision 2), and rerun after bringing `main` in.
- [x] 4.2 Run `node --test scripts/tests/memory-areas.test.mjs`, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node .github/scripts/checks.mjs --worktree`.
- [x] 4.3 Dry run in a scratch chat on this computer: *connect my tools* with one saved service, one the app doesn't know, and Gmail. Check the list and the key-link guide match the page; stop before the key link is sent and before any publish; no browser opens and Access is unchanged.
- [ ] 4.4 `/save`, and check CI passes.
