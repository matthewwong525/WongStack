# Drawing in plans and explore

How plans draw: pick by what the bullet explains.

- **A flow is a `mermaid` fence**: steps, states, or a back-and-forth (`sequenceDiagram`). Keep labels short: the builder warns past 640 px. Quote `"/apply"`: bare `[/apply]` is a shape.
- **A screen is a `page` fence**, by [the prototype rules](prototypes.md).
- **A part the system draws is a `screen` fence**, only beside the page: HTML in the app's parts with real words: `card`, `btn-primary`, `btn-ghost`, `field`, `tag`, `tag-outline`; layout `row`, `col`, `gap`, `grow`, `phone`, `muted`, `danger`, `sep`.
- **A screenshot is a `picture` fence** of `[label:] path` lines, one picture each: `Before: pictures/a.png`, `Inbox, phone:`.
- **A whole page, such as an email, is a `page` fence**, with no script: `A: email/a.html`.
- **An ad is an `ad` fence**: `placement: feed|story`, `account:`, `picture:`, `text:`, `headline:`, `button:`.
- **A site or tool is a `live` fence**, ```` ```live After ````: `folder: prototypes/<site>`, `height:` (640), nothing from the web.
- **A needed file is a [`form` fence](review-page.md#what-the-build-needs)**: `file: Logo | image | 1`.
- **Arrows or layers are an `svg` fence**, in named colors.
- **A table is a Markdown table**; each row takes a note.
- **Chat and file lists stay a `text` fence**: chat shows no pictures.

**Sketch**
```screen
<div class="card col gap phone">
  <div class="row gap"><span class="tag-outline">Copy</span><span class="tag-outline">Paste</span></div>
</div>
```

## The `## UX` section in design.md

`### Use-case brief` (who, the job, edge cases), `### Flow`, `### Hierarchy` (one primary action a screen), `### Review` (links to review.html and the What Changes items that show each screen, no drawings), `### Components` (existing parts used; anything new, and why). Mirror the closest existing screen.
