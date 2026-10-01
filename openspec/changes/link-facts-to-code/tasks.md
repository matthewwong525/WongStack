# Tasks

## 1. Area list and lookup

- [x] 1.1 Before any text edit, record each file's words and bytes with `node scripts/measure-context.mjs --json` for `.agents/skills/apply/references/build-helper.md`, `.agents/skills/memory/references/writing-facts.md`, and `.agents/skills/memory/SKILL.md`, and note them in the Decision log. Verify the three counts are logged.
- [x] 1.2 Add `.agents/skills/memory/references/areas.json` with the first entries in design.md's *The list*, copying each existing tag's definition from `memory.mjs tags`, and `.agents/skills/memory/scripts/lib/areas.mjs` with path normalization and longest-prefix matching by design.md's *Matching*. Verify with unit tests in a new `scripts/tests/memory-areas.test.mjs`: `.claude/` paths match like `.agents/`, `app/worker/apps/x.ts` gives `mini-apps` and `worker` but not `stack-pack`, an unmapped path gives none, and every tag in the file has a non-empty definition.
- [x] 1.3 Add `memory.mjs areas [paths…] [--change <name>] [--limit n]` by design.md, reusing `search`'s team filter and alias clause widened to a tag list, and list it in the usage text. Verify in `memory-areas.test.mjs` against the test store: a change whose `tasks.md` names `app/worker/index.ts` prints `worker` and its fact; threads print first; `--limit` caps; a teammate's key does not see another person's `feedback` fact; no match prints `No mapped area for these paths.`; an unreachable store prints the not-loaded line and exits 0.

## 2. Re-tagging and self-defining tags

- [x] 2.1 Add `memory.mjs retag --file <input>` by design.md, with per-fact `sessionId` and `author` overrides in `writeStatements` beside `createdAt`. Verify in `memory-areas.test.mjs`: a re-tagged fact keeps slug, type, body, `created_at`, `session_id`, author, and old tags, gains the new tag, and supersedes the old id; an already-tagged or superseded id is skipped and reported; a member key's batch skips another author's fact and still writes its own.
- [x] 2.2 In `putFacts` and `retag`, add a used tag that is missing from the store but in `areas.json` to `newTags` with the list's definition. Verify a test where `put-facts` tags a fact `worker` in an empty store with no `newTags`, and the tag is stored with the list's definition.

## 3. Skill text

- [x] 3.1 In `writing-facts.md` under *Specifics*, add: tag the code area a fact concerns; `memory.mjs areas <path>` prints it. In memory `SKILL.md` step 3.2, merge the untagged-thread sentence with re-tagging facts about mapped folders, both through `retag`. In `build-helper.md` *Build* step 1, add the `areas --change "<name>"` load, as dated context the repo overrides. Trim each file so it ends at or under its 1.1 words and bytes. Verify with `measure-context.mjs --json` against the logged counts, and `node scripts/measure-context.mjs --check` passes.

## 4. Wiki and release

- [x] 4.1 In `wiki/development/memory.md`, add a short *Facts by code area* section (the list, how a fact gets its area, the build loading it, how a repo adds a folder) and extend *Consolidation* with re-tagging that keeps date, author, and chat. Verify it matches the spec deltas and `node scripts/check-payload-links.mjs` passes.
- [x] 4.2 Add `## Next (minor) — Link memory facts to the code they're about` at the top of `CHANGELOG.md`'s entries, in plain words, with no hand step to update. Verify `node scripts/check-openspec-config.mjs` passes.
- [ ] 4.3 Run the memory tests and the payload checks in CI through `/save`. Verify CI passes.
