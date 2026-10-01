# Keep wiki pages short, titled, and their section links working

**Status:** ready-to-ship

**Branch:** wiki-file-size-limits

**Open questions:** none

## Why

Code has limits it can't pass: no file over 500 lines, no function too tangled. The wiki has only a link check. A page can grow without end, and three already passed 3,000 words: the deploy pipeline (4,300), browsing (3,500), and memory (3,300). A long page is slow for a person to read and costly for the assistant to load. A link to one section of a page breaks without warning when that heading is renamed, and nothing checks that a page opens with its title and a first sentence, though the wiki rules require both.

## What Changes

- **Each publish checks every wiki page, the way code is checked.** Beside the link check, three new checks run here and in every install:
  - a page over 3,000 words fails, and the message says to split it by its sections;
  - a link to a section of a page, like `browsing.md#hand-the-browser-over`, must land on a heading that exists;
  - a page opens with one title, then a sentence that says what it is.
  ```text
   publish
      │
      ▼
   wiki check ── links land?        (today)
      │       ── under 3,000 words? (new)
      │       ── section links?     (new)
      │       ── title + sentence?  (new)
      ▼
   all pass ──▶ live
   one fails ─▶ fix it, publish again
  ```
- **The three long pages get split.** Each keeps its address and its opening sections, so the links pointing at it still work. Its longest later sections move to a new page beside it, linked from where they were. You read the same words, in shorter pages.
  ```text
   BEFORE              AFTER
   d1-pipeline  4,300  d1-pipeline   <3,000
                       + 1 new page
   browsing     3,500  browsing      <3,000
                       + blocked sites
   memory       3,300  memory        <3,000
                       + the memory key
  ```
- **Each check runs only when its kind of file changed.** A change to wiki pages alone already skips the code tests. Now a change to code alone skips the wiki check too, unless it removes or moves a file, which could break a wiki link.
  ```text
   changed          │ code tests │ wiki check
   ─────────────────┼────────────┼───────────
   wiki pages only  │ skipped    │ runs
   code only        │ runs       │ skipped
   code + moved file│ runs       │ runs
   both             │ runs       │ runs
  ```
- **The wiki rules name the limit.** The page that sets how the wiki is written says a page stays under 3,000 words, so the assistant splits a page before the check has to catch it.

Non-goals: a limit on line length or on the number of lines, since a wiki paragraph is one line; a ban on filler words from the voice guide; checking links from skills and other files outside the wiki, which this repo's release check already covers; a warning-only mode.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `knowledge-center`: the wiki check on every run adds a page-size cap, section-link check, and title-and-first-sentence check.

## Impact

- `.agents/skills/memory/scripts/lib/links.mjs`: heading anchors and the three new page checks, beside `checkWiki`.
- `.github/scripts/wiki-links.mjs` (ships): the report names the new problems; `.github/workflows/test.yml`: the step's comment and summary line.
- `scripts/tests/wiki-links.test.mjs`: a test per new check, its refusal included.
- `wiki/stack/d1-pipeline.md`, `wiki/development/browsing.md`, `wiki/development/memory.md`: split; new sibling pages linked from their section hubs and listed in `payload-files.json` and the payload manifest where the source page ships.
- `wiki/wiki-style.md`: one line for the cap, offset by an equal cut, since the start-up load sits at 2,197 of 2,200 words.
- `CHANGELOG.md`: a `## Next (minor)` entry whose Updating note asks installs to split any own page over 3,000 words.

## Decision log

- **2026-10-01** — Asked how a size limit on wiki pages should work → a hard cap at 3,000 words that fails the check; the three pages over it today get split in this change.
- **2026-10-01** — Asked which other checks should run on the wiki, like the code checks → section links must land on a real heading, and every page opens with one title and a first sentence; filler-word bans were not chosen.
- **2026-10-01** — Assumed: words are counted as in `measure-context.mjs` (whitespace-separated, whole file, code blocks included), because one counting rule across the repo can't disagree with itself, and a code block costs a reader as much as prose.
- **2026-10-01** — Assumed: no line-count cap like code's 500 lines, because a wiki paragraph is one line, so lines measure nothing; the longest page today is 363 lines.
- **2026-10-01** — Assumed: the new checks run in every install, inside the existing wiki check, because that check already ships to every install's test workflow and one rule for every wiki can't drift. An install whose own page is over the cap gets a to-do in its update plan to split it.
- **2026-10-01** — Assumed: a split keeps the old page at its address with its opening sections, and moves later sections out, because AGENTS.md, skills, and installs' own pages link those pages and their headings; keeping the linked headings in place avoids a retired name and broken links. The new section-link check proves the split left none.
- **2026-10-01** — Assumed: section anchors follow GitHub's rule (lowercase, punctuation dropped, spaces to hyphens, `-1` for a repeated heading), because the wiki is read on GitHub and `wiki-style.md` already states that rule.
- **2026-10-01** — Assumed: the section-link check covers links in wiki pages only, including `#section` links within the same page, because the shipped check is about the wiki, and `check-payload-links.mjs` already checks anchors from skills and rules into shipped pages here.
- **2026-10-01** — Assumed: the title check reads the page with code blocks blanked, because a `# comment` in a shell block is not a title; a trial on 2026-10-01 found every page passes the title, first-sentence, and section-link checks already (218 section links across the wiki, AGENTS.md, and skills, none broken).
- **2026-10-01** — Assumed during the build: links in this repo to a moved `##` section, not only its subheadings, point straight at the new page (the memory key's owner links and `store.mjs`'s help line included), because a reader then lands in one hop; the stubs stay for installs' own links.
- **2026-10-01** — Asked (mid-build) that a wiki-only change runs only the wiki checks and a code-only change only the code checks, so CI wastes no time → wiki-only already skipped the code tests; the wiki check now skips when the change touches no Markdown and removes or moves no file.
- **2026-10-01** — Assumed: any changed `.md` file, or any removed or moved file, runs the wiki check, because a wiki link can point at a skill's heading or at a code file, and a skipped check must be a proven skip, like the code tests' skip. A change with no base to compare runs it.
- **2026-10-01** — Check: `.github/scripts/wiki-links.mjs` now fails on more problems (page size, section links, title and first sentence) and names them in its report; it is stricter, not looser.
- **2026-10-01** — Check: `.github/scripts/app-untouched.sh` prints a fourth answer, `wiki_affected`, false only when the change touches no Markdown and removes or moves no file, because the person asked that a code-only change skip the wiki check; any doubt (no base, an empty diff) answers true.
- **2026-10-01** — Check: `.github/workflows/test.yml` skips *Check the wiki's links* when `wiki_affected` is false and says so in the summary, because no wiki link can break when no Markdown changed and no file was removed or moved.
- **2026-10-01** — Saved for the online checks (task 4.3): all build tasks done; local checks pass except three browser-page tests that need `jsdom`, which this machine lacks.
- **2026-10-01** — Archived for /ship as 29.5.0; the online checks passed on the branch after one lint fix (`startsWith` over a caret regex).
