# Design

## Context

See [proposal.md](proposal.md) for why. camofox 1.18.1 (`server.js`) makes refs in two passes:

1. `buildRefs` numbers interactive lines (`lib/interactive-roles.js`, minus `SKIP_PATTERNS` names, up to `MAX_SNAPSHOT_NODES` = 500) in order: the main frame's aria snapshot first, then each processed child frame's (up to 8, skipping tracker and `about:` frames, and frames with no interactive line). Each ref stores `{role, name, nth}`; frame refs add `frameName`/`frameUrl`, with `nth` counted per frame.
2. The `/snapshot` route prints the main YAML plus one appended `- iframe "<label>":` block per processed frame, then writes refs onto lines by the key `role:name:nth`. The key has no frame, and frame `nth` restarts at 0, so a frame's `textbox:Email:0` overwrites the main page's in the key map. The main *Email* line prints the frame ref; the frame's own *Email* line counts as `nth` 1 and prints none.

Resolution (`refToLocator`) is right: a frame ref resolves inside its frame. Only the printed text is wrong. The 2026-10-21 transcript shows it: main `textbox "Email" [e76]`, Link's `textbox "Email":` with no ref, and a reload renumbering the main box to `e20` once Link's frame was gone.

Clicks: camofox tries `locator.click`, then `force`, then a DOM click only if those throw. A click that lands on a covering element or a React re-render returns `ok`. `/type` with `mode: "keyboard"` and `text: ""` focuses the target and types nothing; `/press` sends a key to the focused element.

## Goals / Non-Goals

**Goals:** printed refs equal camofox's own ids; no ref printed when that can't be shown; tick-box clicks verified with one keyboard retry; zero added calls on other clicks by ref, and one read before a click by CSS selector.

**Non-Goals:** editing or patching camofox (the person's choice); prefix-name ref resolution (#13522, fix #14004 open upstream); verifying clicks by `text=` or `role=` selectors.

## Decisions

**Renumber the printed snapshot in `browse.mjs` from camofox's own order.** After `read()` joins the chunks, a pure `relabel(snapshot, refsCount)` runs only when the text holds an appended frame block (a column-0 `- iframe "<label>":` line with indented children). It strips camofox's `[eN]` marks, walks the main section then each block in order, and numbers each interactive, non-skipped line `e1, e2…`: the same walk `buildRefs` does, so each printed id is the ref camofox resolves. Other pages print unchanged unless the main-page check below drops a mark.

*Why not our own ref map with Playwright selectors:* `/click` appends `:visible` to a selector, which breaks role and frame-chain selectors (seen 2026-10-21: `role=checkbox[...]` failed to parse). *Why not patch camofox:* the person preferred not to touch it, and a patch must be redone on every camofox move.

**Check the count before trusting it.** The snapshot response carries `refsCount` (camofox's map size). When the relabel count differs, or passes 500, the two passes saw different pages: `relabel` keeps camofox's marks but removes them from every line whose `role:name` appears in more than one section. The output adds one line, `- note: some boxes have no ref; read the page again or use a selector`.

**Check main-page marks on every page.** A frame camofox numbered but left out of the printed text has no block, yet its ref still lands on a same-named main-page line. camofox numbers the main page first, in order, so a main-page interactive line's own ref is its place among them. On any page, frame blocks or none, `relabel` drops a main-page mark that isn't its place and adds the note. A page where every mark matches prints byte for byte. A windowed read (over 80,000 characters) skips this check: its count is already unsure, and the frame-page rule above covers it.

camofox's two lists, its interactive roles (`lib/interactive-roles.js`) and `SKIP_PATTERNS` (four date patterns in `server.js`), are copied into `browse.mjs` beside the `CAMOFOX` pin, with a comment naming both sources. A camofox move already needs a check on a real camofox; that check now also compares the two copies with the installed files. A copy gone stale fails safe: the count differs or the places shift, and the doubtful lines print no ref.

**Keep each ref's role and ticked state in the tab file.** `snapshot()` writes `refs: { e27: ["checkbox", "I understand", false], … }` for check-like roles only (`checkbox`, `radio`, `switch`, `menuitemcheckbox`), read from `[checked]`. A later `click` needs no extra read to know what it clicks. After the click camofox may renumber, so the same ref can name another box: a different role or name then counts as changed, and gets no Space.

**Verify a tick-box click.** `click(target)`:

- A ref found in the tab file's `refs`: click, read the snapshot, compare the ref's `[checked]`.
- A CSS selector: one `evaluate` before and after, returning the matched element's `checked` (or `aria-checked`) when it is check-like, else `null`. Of several matches, camofox's click takes the only visible one when exactly one is visible (`visibleSelectorCandidate`, skipped for a selector list), but its keyboard focus takes the first. When those differ the read returns `null`, so the click gets no check and no Space retry; otherwise it reads the first. A selector `querySelectorAll` can't parse returns `null`. So every CSS-selector click makes one read first, even on a button.
- `null` or a ref not in `refs`: click as today, nothing added.
- Unchanged: `type` the target with `mode: "keyboard"`, `text: ""`, then `press` `Space`, then read again. Still unchanged: throw `BrowseError('the box did not change')`, which prints `BROWSE_ERROR=the box did not change`.

A radio clicked when already picked stays picked: "unchanged" for a radio means it is still not picked.

## Risks / Trade-offs

- [camofox's next version changes its walk or its lists] → The pin holds it at 1.18.1; a move's real-camofox check compares the lists; a mismatch drops refs rather than mislabels.
- [A page changes between camofox's two passes] → The `refsCount` check catches a count change. A same-count swap between passes remains possible but needs a frame to swap same-named boxes within milliseconds.
- [The Space retry ticks a box the agent meant to leave] → It only runs after the agent asked to click that box, and only when the click changed nothing. The rule that *I agree* needs the person's yes is unchanged.
- [A tick-box click costs one more page read] → Only tick boxes, about a second.

## Migration Plan

None. The next `snapshot` writes the new tab-file field; an old tab file without `refs` clicks as today. Rollback is reverting `browse.mjs`.
