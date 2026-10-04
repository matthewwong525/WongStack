# Tasks

## 1. Try the wording (change folder)

- [x] 1.1 Write `candidate-writing-facts.md` in the change folder: a full copy of `.agents/skills/memory/references/writing-facts.md` with design.md decision 2's Keep bullet and narrowed Drop bullet. Verify it differs from the live file only in those two bullets.
- [x] 1.2 Run the dry run by design.md decision 6 on three past chats (one own-words answer, one repeated failure, one smooth), reduced read-only with `parseTranscriptText` and `strip`; store nothing. Write `dry-run.md` with the keep rule first, then date, model, each chat's candidate notes, and the verdict. Verify the verdict follows the keep rule as written.

## 2. Memory skill (writing rule)

- [x] 2.1 Apply the kept wording to `.agents/skills/memory/references/writing-facts.md`. Verify the Keep list names struggle notes as a `thread` tagged `improve` with the no-private-detail and smooth-chat-gets-none rules, and the Drop list carries the exception.

## 3. Improve skill

- [x] 3.1 Edit `.agents/skills/improve/SKILL.md` by design.md decision 3: load open `improve` notes first, a note is evidence, prefer recorded trouble in parts that change often, a check before an instruction, the removal test, and name the fixed note for the save. Keep `--audit-only` write-free. Verify the description line is unchanged and every existing rule is still stated.
- [x] 3.2 Offset the added bytes where a size check needs it, rewording without dropping a rule, and compare each cut sentence by sentence (as built: design.md decision 5). Verify by reading `node scripts/measure-context.mjs --json` that no route grew past its baseline; the pass itself is 5.1's.

## 4. Docs and release

- [x] 4.1 `wiki/development/memory.md`, *How facts are captured*: add one bullet on struggle notes, who writes them and that `/improve` reads them, linking the writing rule. Verify the page stays under 3,000 words.
- [x] 4.2 `wiki/development/repository-improvement.md`: say notes are read first and a check comes before an instruction, and credit Matt Pocock's `retro` and `improve-codebase-architecture` with links. Verify every link resolves.
- [x] 4.3 `CHANGELOG.md`: add `## Next (minor) — Learn from chats where the assistant struggled` above the newest entry, in plain words, with an **Updating.** note that no action is needed and notes begin with the next saved chat. Verify `VERSION` is untouched.

## 5. Final checks

- [x] 5.1 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/measure-context.mjs --check`, and `openspec validate "struggle-notes-for-improve" --strict --no-interactive`; all pass.
