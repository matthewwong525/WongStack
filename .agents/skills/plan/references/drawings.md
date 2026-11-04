# Drawing in plans and explore

How `/plan` and `/explore` draw: pick by what the bullet explains.

- **A flow is a `mermaid` fence**: steps, states, or a back-and-forth (`sequenceDiagram`). Keep labels short: the builder warns past 640 px. Quote `"/apply"`: bare `[/apply]` is a shape.
- **A screen is a `screen` fence**, HTML in the app's parts with real words: `card`, `btn-primary`, `btn-ghost`, `field`, `tag`, `tag-outline`, `skeleton`; layout `row`, `col`, `gap`, `grow`, `phone` (360 px), `muted`, `danger`, `bar` (unknown text), `sep`. No style, id, link, or image: the build stops. Sketch each named state ([what it holds](../../../../wiki/ux-principles.md#the-review-file)).
- **A screenshot is a `picture` fence** of `[label:] path` lines: `Before: pictures/a.png`.
- **An ad is an `ad` fence**: `placement: feed|story`, `account:`, `picture:`, `text:`, `headline:`, `button:`.
- **A site or job control is a [`live` fence](../../../../wiki/review-pages.md#the-live-card)**: `folder: prototypes/<site>`, `height:` (640).
- **Questions are a [`form` fence](../../../../wiki/review-pages.md#questions-and-files)**: `text: Shop name`, `file: Logo | image | 1`.
- **Arrows or layers are an `svg` fence**, painted only `bg`, `fg`, `muted`, `subtle`, `line`, `card`, `danger`.
- **A table is a Markdown table** under its bullet; each row takes a note.
- **Chat and file lists stay a `text` fence**: chat shows no pictures.

**Screen**
```screen
<div class="card col gap phone">
  <div class="row gap"><h3>Notes</h3><span class="tag">3</span></div>
  <div class="row gap"><span class="grow"/><button class="btn-primary">Save</button></div>
</div>
```
