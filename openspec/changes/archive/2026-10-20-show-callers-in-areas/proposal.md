# Proposal

**Status:** ready-to-ship
**Branch:** graphify-memory-review
**Open questions:** none

## Why

Before changing code, the assistant looks up a file or folder to see what is linked to it: its docs, past plans, warnings, and the pages that link to it. It can't see which other code uses it, which is the part most likely to break. Today it finds that by searching for a function's name, and a third of those answers are wrong, because many files have their own function with the same name.

## What Changes

- **Looking up a file or folder also lists the code that uses it.** Below the pages that link to it, the lookup lists each file outside it that loads its functions and uses them, with line numbers. A function that only shares a name with one in another file doesn't count. Code that loads it through the `.claude` shortcut folder, or through a file that passes it on, does count. Shortcut names a repo sets up for its own folders, like ClaymooApp's `@/` for its shared app code, are followed too — a third of that repo's connections use one. The lookup reads the code fresh each time, so the list is never out of date: measured at a tenth of a second here and half a second on ClaymooApp, the biggest install. It installs nothing new, and it still prints when memory is offline.
  ```text
  Code using …/memory/scripts/lib/cli.mjs:
  - …/browser/scripts/browse.mjs:457 (parseCli)
  - scripts/check-private-access.mjs:84
      (parseCli, via scripts/lib-cli.mjs)
  - …
  +53 more
  ```

- **Looking up a spec or wiki page now lands on its own subject and points at its code.** Today, looking up the memory spec answers with the generic plans folder: its docs and warnings are about planning, not memory. Specs name no code files on purpose, so this map is the only road between a spec and its code. Now a page listed as one of a subject's docs matches that subject, and every lookup also prints the subject's code folders, so spec → code and code → spec both answer in one step.
  ```text
  Areas: memory (openspec/specs/memory/spec.md)
  Docs: wiki/development/memory.md, …
  Code: .agents/skills/memory/
  ```

- **Planning sees it with no extra step.** `/explore` already looks up the paths it expects to touch, so it now gets the code that depends on them as well.

Tested on 2026-10-20 against 8 functions used across this repo: this way found all 91 files that use them and listed none that don't. Graphify, an outside code-mapping tool, found 41% of them. A plain text search found all of them, but a third of what it listed was wrong.

Non-goals: installing Graphify or any code parser; naming which function inside a file makes the call; calls through an object's methods; showing what a file itself uses; a saved map of the code; skill pages that run a script by its path (the linked-pages list already shows those).

## Capabilities

### New Capabilities

### Modified Capabilities

- `memory`: a new requirement: the area lookup lists, for each path asked about directly, the code files outside it that import from it and use what they import, read fresh. And a modified one: a path named among an area's docs matches that area, and the lookup prints each matched area's code folders.

## Impact

- `.agents/skills/memory/scripts/lib/callers.mjs` (new): finds code files, resolves relative imports and re-exports, and returns each user's file, lines, and names. Node built-ins only.
- `.agents/skills/memory/scripts/memory.mjs`: the `areas` command prints a `Code using <path>:` block after the backlinks, capped at 10 files, and a `Code:` line of folders per matched area.
- `.agents/skills/memory/scripts/lib/areas.mjs`: a path in an area's `docs` matches that area.
- `scripts/tests/memory-areas.test.mjs`: fixture-repo tests for the new block.
- `wiki/development/memory.md#facts-by-code-area`: the "one lookup" bullet names the new block.
- `CHANGELOG.md`: a `minor` entry.

## Decision log

- **2026-10-20** — Asked whether Graphify would help memory and connect specs, code, and everything → chose to try it without changing the repo. Graphify linked code well but found only 30 spec-to-code links, and the ones checked were name matches, not real.
- **2026-10-20** — Asked to build a call map and judge Graphify against it → the call map found 91 of 91 callers with none wrong; Graphify found 41%, and plain text search was wrong a third of the time. Chose to take ideas from Graphify, not the tool.
- **2026-10-20** — Asked to add the call map to the lookup → chose to plan it.
- **2026-10-20** — Asked how the call map reads code → chose no new software: follow each file's import lines and find the imported names, which gave the same files and lines as a code parser in the test.
- **2026-10-20** — Asked what the lookup shows → chose who calls into the path, not what it calls.
- **2026-10-20** — Assumed: the block prints only for paths asked about directly, never for every path a change names, because the backlinks already follow that rule and a change's many folders would bury the rest of the output.
- **2026-10-20** — Assumed: links are not marked found or guessed, and there is no most-connected report, though Graphify has both, because every link here comes from an import line, so none is a guess, and a report is a separate ask.
- **2026-10-20** — Assumed: the list is capped at 10 files with a count of the rest, like the backlinks, because a shared helper like `cli.mjs` has 63 users.
- **2026-10-20** — Asked to scrutinize the plan and make sure code, wiki, and specs all link both ways → found that looking up a spec landed on the generic plans area, because specs name no code and only folder prefixes matched; chose to match a page listed among an area's docs and to print each area's code folders.
- **2026-10-20** — Assumed: a file loaded only for its side effects, and one loaded with `require`, both count as users, because the loading file still breaks when the loaded one changes.
- **2026-10-20** — Assumed: a use that arrives through a passing-on file counts only when the looked-up code really provides that name, because a passing-on file with its own additions would otherwise blame the wrong source.
- **2026-10-20** — Asked whether the edit-time warning should also say when other files depend on the file being edited → chose no: the list shows up only when the assistant looks a file up, at planning time and on request.
- **2026-10-20** — Asked whether this works on a bigger repo like ClaymooApp → measured there: 2,812 code files read in half a second, but a third of its internal connections use a `@/` folder shortcut the plan skipped; chose to follow shortcuts defined in a repo's own settings files, still skipping ones defined only in build code.
- **2026-10-20** — Assumed: wiki/development/memory.md lost a few meaning-preserving trims beyond the bullet task 2.1 extends, because the page has a 3,000-word cap and the longer bullet pushed it over.
- **2026-10-20** — Archive checkpoint: built, reviewed in two rounds (type-only imports, regex literals, JSX self-closing tags and `x++ / y` fixed with tests), local checks pass; saved for `/ship`.
