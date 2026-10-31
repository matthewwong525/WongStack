# Tasks

## 1. The builder scripts

- [x] 1.1 Add `.agents/skills/deck/scripts/lib/zip.mjs`: a store-and-deflate zip writer on `zlib.deflateRawSync` and `zlib.crc32`, built-in modules only.
- [x] 1.2 Add `.agents/skills/deck/scripts/lib/pptx.mjs`: the layout function (slide shapes in inches from `deck.json`, problem/picture and title layouts, grid nodes, edge-to-edge arrows, overflow estimate) and the OOXML writer (content types, presentation, master, layout, theme, slides, notes slides, core props; text boxes, `roundRect`/`rect` boxes, `p:cxnSp` arrows with triangle heads, struck-through crossed nodes; all text escaped).
- [x] 1.3 Add `.agents/skills/deck/scripts/deck.mjs build <dir>` with `isMain`/`parseCli` from `memory/scripts/lib/cli.mjs`: validate `deck.json` (unknown fields, unknown colors and styles, dangling arrow ids → exit 2 naming the slide), write `deck.pptx` and a self-contained `preview.html` (inline SVG per slide from the same layout, Download as a `data:` URL, the shared look), print `DECK_FILE=`, `DECK_PREVIEW=`, `DECK_WARN=` lines.
- [x] 1.4 Add `scripts/tests/deck.test.mjs`: the zip reads back (central directory, CRCs match after inflate); the parts and slide count match the outline; special characters are escaped; notes land in notes slides; validation errors name the slide; an overlong label warns; preview and file share coordinates.

## 2. The skill and the wiki

- [x] 2.1 Add `.agents/skills/deck/SKILL.md` (`name: deck`, a description of about ten words, `user-invocable: true`): write the outline in `~/.wong-stack/decks/<name>/deck.json`, build, fix warnings, look at the slides, open the preview by reply link (header `Changes to the deck <name>`), rebuild on sent changes, path fallback on `REPLY_LINK=none`; link the outline's format in the design-owned page.
- [x] 2.2 Add `wiki/development/decks.md`: what `/deck` makes, the outline format with one example, how a good deck reads (one idea per slide, short labels, detail in speaker notes, add to a person's existing deck rather than rewrite it, a Drive copy is replaced whole so merge its wording first, import into Google Slides rather than upload raw); link it from `wiki/development/README.md`.
- [x] 2.3 Add `deck` to `core.skillDirs` in `.agents/skills/wong-sync/references/payload-files.json`, and `slide-decks` to `.agents/skills/memory/references/areas.json`.
- [x] 2.4 Add a `## Next (minor) — Make slide decks` entry to `CHANGELOG.md`, with an Updating note saying nothing needs doing by hand.

## 3. The first deck

- [x] 3.1 Write `~/.wong-stack/decks/harness-problems/deck.json`: a title slide, the problem slides from the proposal's table (problem in words left, WongStack's answer as a picture right, detail in speaker notes, each claim checked against the owning wiki page), and a closing slide with wongstack.com.
- [x] 3.2 Build it and fix every `DECK_WARN=`.

## 5. Picture kinds and the 7-problem deck

- [ ] 5.1 Add the `loop`, `compare`, `hub`, `layers` and `timeline` kinds to `lib/pptx.mjs`'s layout (one function each, same shape list), with curved connectors for `loop`, check marks and strike-through for `compare`; keep a slide with no `kind` as `steps`.
- [ ] 5.2 Draw the new shapes in `lib/preview.mjs` from the same layout, and validate each kind's fields and counts in `deck.mjs`, naming the slide.
- [ ] 5.3 Extend `scripts/tests/deck.test.mjs`: each kind builds and its text lands in the slide; counts out of range and unknown fields exit 2; an outline with no kind builds as before.
- [ ] 5.4 Document the kinds in `wiki/development/decks.md`'s outline section, one short example each, and add "pick the kind that fits the idea; don't repeat one kind slide after slide" to how a good deck reads.
- [ ] 5.5 Rewrite `~/.wong-stack/decks/harness-problems/deck.json` to the proposal's 7 slides, in plain words, each with its listed kind, plus the title and closing slides; build it and fix every `DECK_WARN=`.

## 4. Verification

- [ ] 4.1 Run `node --test scripts/tests/deck.test.mjs`, `node scripts/measure-context.mjs --check`, `node scripts/check-payload-links.mjs`, and `node .github/scripts/checks.mjs --worktree`.
- [ ] 4.2 Render the harness deck with LibreOffice (`soffice --headless --convert-to pdf`, then page images) and look at every slide: nothing overflows, arrows meet their boxes, the preview matches the file.
- [ ] 4.3 Open the deck's reply link and confirm the page shows every slide and the Download gives a file that opens.
- [ ] 4.4 Ask the person to import the downloaded file into Google Slides once and say whether it opens; record the answer.
