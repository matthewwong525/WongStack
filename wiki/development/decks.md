# Slide decks

Ask for a deck and [`/deck`](../../.agents/skills/deck/SKILL.md) makes a PowerPoint file you can open, change and present in PowerPoint, Keynote, LibreOffice or Google Slides. Part of [development](README.md).

## What you get

- **A link to look at the deck.** The page shows every slide with its speaker notes, and a *Download* button. Type changes in its box and tap *Send changes*: the chat gets them and builds the deck again, at the same link. [Reply links](reply-links.md) explains the link; where none can open, the chat gives the file's place on the computer.
- **Shapes you can edit.** Text, boxes and arrows stay shapes, not pictures: click one to move or retype it. An arrow stays joined to its boxes when you move them.
- **Nothing to install.** A Node script builds the file with Node's own modules, so the [required tools](required-tools.md) are enough.
- **A deck you can change later.** Each deck has a folder, `~/.wong-stack/decks/<name>/`, outside every repo: `deck.json` (the outline), `deck.pptx` and `preview.html`. A later chat changes the same deck, and git never sees it.

## Make a deck

The agent runs these steps for `/deck`, or when you ask for a deck:

1. **Write the outline** in `~/.wong-stack/decks/<name>/deck.json`, by [the outline](#the-outline) and [how a good deck reads](#how-a-good-deck-reads). To change a deck, edit only the slides the person names.
2. **Build it:** `node "$(git rev-parse --show-toplevel)/.claude/skills/deck/scripts/deck.mjs" build ~/.wong-stack/decks/<name>`. It prints `DECK_FILE=` and `DECK_PREVIEW=`. Shorten each `DECK_WARN=` label, fix what an exit 2 names, and build again.
3. **Look at every slide** in the `DECK_PREVIEW` page before the person does.
4. **Send the link:** `node "$(git rev-parse --show-toplevel)/.claude/skills/hand-over/scripts/reply-link.mjs" open <DECK_PREVIEW> --header "Changes to the deck <name>"` prints `REPLY_LINK=`. On `REPLY_LINK=none`, give the `DECK_FILE` path.
5. **Changes arrive under that header:** do steps 1 to 4 again. The link stays the same.

## The outline

The agent writes `deck.json`; the script decides where everything goes, so slides line up. One slide with a picture:

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

- **The deck:** `title` (the file's name in the app), optional `subtitle`, and `slides`.
- **A slide with a `picture`:** `title` on top, `problem` in words on the left, the picture on the right, and `notes`.
- **A slide with no picture** is a title or closing slide: `title`, `subtitle` and `notes`.
- **A picture:** an optional small `label`, then `nodes` and `arrows`.
- **A node** is a box on a grid: `id`, `text`, `col` and `row` from 0, and `span` for a box several columns wide. `color` is `gray` (the default), `mint`, `blue` or `purple`. `style` is `box` (the default), `pill`, `dashed`, or `crossed`: gray and struck through, for the wrong way.
- **An arrow** goes `from` one node's id `to` another's, with an optional short `text`.

The script refuses an unknown field, colour or style, two boxes in one place, and an arrow to no node: it exits 2 and names the slide, so a typo never builds. It prints `DECK_WARN=` for a label that may not fit its box.

## How a good deck reads

- **One idea per slide.** The title says it.
- **Short labels.** A few words on the slide, the detail in the speaker notes. Long text on a slide gets cut by the person, so write it short first.
- **Words left, picture right.** The problem in a sentence or two; the answer as boxes and arrows.
- **Add to a person's deck, don't rewrite it.** Change only the slides they name, and keep their words on the others.
- **A Drive copy is replaced whole.** When the person edited the deck in Google Slides, get that wording into `deck.json` first, or a new file loses it.
- **Import into Google Slides, don't upload the raw file.** In Google Slides, use *File → Import slides*, or open the uploaded file *with Google Slides* to convert it. An earlier deck uploaded raw to Drive did not open in Slides; converted, it did.
