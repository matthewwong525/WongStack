# Let the knowledge save accept a page marked public

**Status:** ready-to-ship
**Branch:** stingy-parrot
**Open questions:** none

## Why

The Knowledge app opens a page for anyone when its first lines say `public: true`. But the knowledge save refuses that page: its check wants the page's title on the very first line. So no public page can exist yet. ClaymooApp's own pages already start this way, so their move to the knowledge repo would stop on the same check.

## What Changes

- **A page may start with its settings block.** A page can open with a short block between two `---` lines, such as `public: true`. The check reads past that block and wants the title right after it. A save of such a page goes through, and the page opens at its public address with no sign-in. The same rule holds for wiki pages in the code repo.
  ```text
  ---              <- settings block,
  public: true        read past
  ---
  # Welcome        <- the title
  Welcome to ...   <- the first sentence
  ```

- **Every other page rule stays.** A page still needs one title and a first sentence after it. A block with no closing `---` is not a settings block, so that page still fails for its missing title.

- **Moving old pages keeps the block.** When an older install moves its own pages to the knowledge repo, each page arrives with its settings block as it was, and the move's check passes.

- **Checked on the live app.** After the publish, a test page marked public is saved, opened with no sign-in, then removed.

Non-goals: new settings beyond `public: true`, a check of what the block holds, and what the wiki and knowledge pages hold versus memory (its own part, not opened yet).

## What the build needs

- **Saving to the live knowledge repo from this computer**: Ready. A test save went through here on 2026-11-04, and the sign-in lasts one more day.

## Capabilities

### New Capabilities

### Modified Capabilities
- `knowledge-center`: "Every wiki page stays short and opens with its title" lets a page open with one frontmatter block before its title.

## Impact

- `.agents/skills/memory/scripts/lib/links.mjs`: `pageProblems` skips one leading frontmatter block, matched as the reader's `FRONT` in `app/worker/apps/knowledge/render.ts` matches it. This one function serves `knowledge.mjs save`, the CI wiki check (`.github/scripts/wiki-links.mjs`), and the move's check.
- Tests: `scripts/tests/wiki-links.test.mjs`; `scripts/tests/knowledge-move.test.mjs` gains a page with frontmatter.
- No change to `.agents/skills/wong-sync/scripts/knowledge-move.mjs`: it copies each page whole.
- Wiki: `wiki/wiki-style.md` names the allowed block.
- `CHANGELOG.md` `## Next (patch)`.

## Decision log

- **2026-11-04** — Assumed: the check reads a block only when `---` is the page's very first line and a closing `---` follows, the same match the reader uses to find `public: true`, because two rules for one block would let a page pass the save and still not open, or the reverse.
- **2026-11-04** — Assumed: a `#` line inside the block, such as a YAML comment, is not a title, because it is a setting, not a heading.
- **2026-11-04** — Assumed: the word count still counts the block, because the spec counts the whole file and a block is a few words.
- **2026-11-04** — Assumed: `knowledge-move.mjs` needs no code change, because it copies each page byte for byte (`copyFileSync`) and rewrites only lines that hold links. A test proves it. The one place it rewrites a page's text, a moving root `README.md` merged into the knowledge hub, can't take a page with frontmatter: a root `README.md` is shipped and never moves.
- **2026-11-04** — Assumed: this is a `patch` release, because it fixes a refusal and adds no new behavior a person must learn.
- **2026-11-04** — Assumed: the live check uses a test page linked from the knowledge hub and an undo of that save, because the save refuses an unlinked page and the undo removes both edits at once.
- **2026-11-04** — Assumed: the frontmatter rule joins the title bullet in `wiki/wiki-style.md` as one sentence, and two lines that repeat their own heading ("The numbered list beside it holds the links", "Follow the rules above") are cut, because that page loads at every session start and the startup context ceiling (2,200 words) was already full.
- **2026-11-04** — Assumed: `knowledge-move.mjs`'s hub list still takes a page's first `# ` line as its link text, even one inside frontmatter, because the plan keeps that script unchanged and only a YAML comment in the block would show; ClaymooApp's pages have none.
- **2026-11-04** — Assumed: the live check is not a task, because `/ship` refuses an unticked task and the check can run only after publishing. After the merge, from the primary checkout: save `knowledge/public-save-check.md` (`public: true` frontmatter, a title, a sentence) linked from `knowledge/README.md`, open `https://wongstack.matthewwong525.workers.dev/public/public-save-check` with no sign-in and see the page, then undo that save and see *not found*.
- **2026-11-04** — Archive checkpoint: built, second look done (one test added for the two frontmatter patterns, one choice logged), archived and numbered 46.3.1 inside `/ship`.
