# Drawing in plans and explore

How plans draw: pick by what the bullet explains.

- **A flow is a `mermaid` fence**: steps, states, or a back-and-forth (`sequenceDiagram`). Keep labels short: the builder warns past 640 px. Quote `"/apply"`: bare `[/apply]` is a shape.
- **A screen is a `screen` fence**, HTML in the app's parts with real words: `card`, `btn-primary`, `btn-ghost`, `field`, `tag`, `tag-outline`, `skeleton`; layout `row`, `col`, `gap`, `grow`, `phone`, `muted`, `danger`, `bar` (unknown text), `sep`. No route draws it: add `No real picture: <why>` ([what it holds](review-page.md#the-review-file)).
- **A screenshot is a `picture` fence** of `[label:] path` lines, one picture each: `Before: pictures/a.png`, `Inbox, phone:`.
- **A whole page, such as an email, is a `page` fence**, with no script: `A: email/a.html`.
- **An ad is an `ad` fence**: `placement: feed|story`, `account:`, `picture:`, `text:`, `headline:`, `button:`.
- **A site or tool is a `live` fence**, ```` ```live After ````: `folder: prototypes/<site>`, `height:` (640), nothing from the web.
- **A needed file is a [`form` fence](review-page.md#what-the-build-needs)**: `file: Logo | image | 1`.
- **Arrows or layers are an `svg` fence**, in named colors.
- **A table is a Markdown table**; each row takes a note.
- **Chat and file lists stay a `text` fence**: chat shows no pictures.

**Screen**
```screen
<div class="card col gap phone">
  <div class="row gap"><h3>Notes</h3><span class="tag">3</span></div>
  <div class="row gap"><span class="grow"/><button class="btn-primary">Save</button></div>
</div>
```

## The `## UX` section in design.md

`### Use-case brief` (who, the job, edge cases), `### Flow`, `### Hierarchy` (one primary action a screen), `### Review` (links to review.html and the What Changes items that sketch each screen, no sketches), `### Components` (existing parts used; anything new, and why). Mirror the closest existing screen.
