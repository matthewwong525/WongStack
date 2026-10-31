# Design

## Context

Past decks (`/root/decks/tinkerers/build4.py`, the self-drive deck) were python-pptx scripts on one computer, with a lucide icon helper reading another repo's `node_modules`. [Required tools](../../../wiki/development/required-tools.md) allow only `git`, `gh`, `node`, `openspec`, `curl`, and core scripts use only Node's built-in modules. A python-pptx file uploaded raw to Drive failed to open in Google Slides; converted on upload it opened. [Reply links](../../../wiki/development/reply-links.md) already show one self-contained HTML page and send text back to the chat.

## Goals / Non-Goals

**Goals:** a dependency-free .pptx builder; a deck outline format an agent writes easily; a preview page drawn from the same layout; the harness-problems deck as the first use.

**Non-Goals:** Drive or other uploads; images, photos or data charts; reading or editing a .pptx made elsewhere; themes beyond one default look.

## Decisions

### The outline: `deck.json`

The agent writes one JSON file; the script owns layout. Shape:

```json
{
  "title": "Building an AI harness",
  "subtitle": "The problems, and how WongStack solves each",
  "slides": [
    {
      "title": "Keys leak into chat",
      "problem": "The agent needs your keys. Pasted in chat, they stay in its history.",
      "picture": {
        "label": "How WongStack solves it",
        "nodes": [
          { "id": "you", "text": "You", "col": 0, "row": 0 },
          { "id": "link", "text": "Private link", "col": 1, "row": 0, "color": "blue" },
          { "id": "env", "text": "Key file on your computer", "col": 2, "row": 0, "color": "mint" },
          { "id": "chat", "text": "Chat", "col": 1, "row": 1, "style": "crossed" }
        ],
        "arrows": [{ "from": "you", "to": "link" }, { "from": "link", "to": "env" }]
      },
      "notes": "Speaker notes: the detail."
    }
  ]
}
```

- A slide with `picture` uses the problem/picture layout: title on top, problem text left (about 40%), picture right under its small label. A slide without one is a title or closing slide (`title`, `subtitle`).
- Nodes sit on a grid (`col`, `row`, optional `span`); the script sizes the grid to the picture area. `color` is one of `mint`, `blue`, `purple`, `gray`; `style` is `box` (default), `pill`, `dashed` or `crossed` (struck-through gray, for the wrong way). Arrows join node edges, with an optional short `text`.
- The script refuses unknown fields and dangling arrow ids with a line naming the slide, so a typo never builds silently.
- It warns (does not fail) when a label likely overflows its box, by an average-character-width estimate, so the agent shortens labels before the person sees them.

Alternative rejected: free x/y coordinates per shape. More control, but every agent re-solves layout and slides drift out of line.

### The builder: `deck.mjs` with a hand-written .pptx writer

- `lib/zip.mjs` writes a zip with `zlib.deflateRawSync` and `zlib.crc32` (Node ≥ 22.2; the repo's floor is 22.22.2).
- `lib/pptx.mjs` writes the minimum OOXML parts: content types, presentation, one master, one blank layout, a theme, one slide per entry, notes slides, and core props. Text is `p:sp` text boxes; boxes are `prstGeom roundRect`/`rect`; arrows are `p:cxnSp` straight connectors with `a:tailEnd type="triangle"`; crossed nodes add a strike-through run. All text is XML-escaped.
- One layout function returns each slide's shapes in inches; both the .pptx writer and the preview's SVG draw from it, so the preview matches the file.
- `deck.mjs build <dir>` reads `<dir>/deck.json` and writes `<dir>/deck.pptx` and `<dir>/preview.html`: each slide as an inline SVG in a 16:9 frame, and a Download link holding the .pptx as a `data:` URL, so the page stays one self-contained file for the reply link. It prints `DECK_FILE=` and `DECK_PREVIEW=` and any `DECK_WARN=` lines.

Alternatives rejected: python-pptx (Python is not a required tool); `pptxgenjs` (adds an npm dependency to every install); slides as images (not editable, and the past image-heavy deck failed in Google Slides).

### Picture kinds

`picture.kind` picks the drawing; no `kind` keeps today's grid (`steps`), so existing outlines still build. Each kind is a layout function returning the same shape list (boxes, ellipses, lines, connectors, text) that both the .pptx writer and the preview draw:

| kind | Fields | Drawn as |
|-|-|-|
| `steps` | `nodes`, `arrows` (today's grid) | boxes on a grid joined by arrows |
| `loop` | `items` (3–6), optional `center` | items evenly round a circle, curved-arrow arcs between them, the center label inside |
| `compare` | `before` and `after`, each `{title, items}` | two cards side by side; *before* gray with struck-through items, *after* in color with check marks |
| `hub` | `center`, `spokes` (3–8) | a circle in the middle, spokes as lines to pills placed round it |
| `layers` | `items` (2–5), widest first | stacked bars narrowing downward, the last one highlighted, a down arrow at the side |
| `timeline` | `items` of `{when, text}` (2–6) | a line with dots, `when` above each dot, `text` below |

- Items in every kind take the same `text`, `color` and `style` as a grid node, so color and the crossed style mean one thing everywhere.
- Curved arrows in `loop` are `a:arc`-free: each is a `p:cxnSp` with `prstGeom curvedConnector3` and a triangle head, which PowerPoint, Keynote, LibreOffice and Slides all draw; the preview draws the same quadratic curve.
- Validation per kind: required fields present, counts in range, unknown fields refused, with the slide named.
- Alternative rejected: free-drawn SVG pictures embedded as images: not editable, and Slides drops SVG.

### Where decks live and how they arrive

- `~/.wong-stack/decks/<name>/` holds `deck.json`, `deck.pptx` and `preview.html`, outside every repo and worktree, so a later chat finds it and git never sees it.
- The skill opens `preview.html` with `reply-link.mjs open … --header "Changes to the deck <name>"`. The page's send box carries change requests back; the agent edits `deck.json`, rebuilds, and reopens. `REPLY_LINK=none` → print the file's path.

### The look

The self-drive deck's colors: background `0A0A0A`, text `FFFFFF`, muted `A3A3A3`, card `1C1C1C`, line `3A3A3A`, accents mint `86D5C1`, blue `93C5FD`, purple `C4B5FD`. Font: the theme's default sans (Arial in the file), so every app has it.

### Skill text and the startup budget

The startup route sits at 2,151 of 2,200 words. The description stays about ten words: *Make a slide deck as an editable PowerPoint file.* `SKILL.md` keeps the steps and the outline's link; [`wiki/development/decks.md`](../../../wiki/development/decks.md) owns how a good deck reads (one idea per slide, short labels, detail in notes, keep a person's existing deck and add to it, Drive copies are replaced whole).

## Risks / Trade-offs

- **A hand-written OOXML writer can make a file one app rejects.** Mitigation: tests check the zip and parts; verification opens the built deck in LibreOffice (renders PNGs) and imports it into Google Slides by hand once. Evidence limit: Google Slides and Keynote can only be checked by a person; that check is a task.
- **Grid layout limits the pictures.** Accepted: boxes and arrows cover every slide in the first deck; a later change can add shapes.
- **The preview's `data:` URL makes the page bigger.** A shapes-only deck is tens of KB, well within what a reply link serves.
