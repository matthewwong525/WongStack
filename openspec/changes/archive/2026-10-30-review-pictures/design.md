# Design

## Context

`.agents/skills/plan/scripts/build-review.mjs` builds the plan page from `proposal.md` into `.agents/skills/plan/references/review-kit.html`. Drawings are `mermaid`, `screen`, `svg`, text fences and Markdown tables; each sits in a `<details class="drawing">` frame, and a tap in the full-screen view pins a note on a spot. The builder refuses any image (`unsafeSvg` blocks `src=`), and [the review file](../../../wiki/ux-principles.md#the-review-file) asked for low detail on purpose. The kit showed *Build it* and *Build and publish* only when the reply link offered both.

After a build, `/apply` *Finish with a preview* step 4 showed one or two preview screenshots in chat. The browser helper writes PNG screenshots (`browse.mjs screenshot`). The Inbox keeps a page body of at most 512 KB (`LIMITS.bodyBytes` in `app/worker/apps/inbox/store.ts`); a larger page falls back to a tunnel link with no error.

## Goals / Non-Goals

**Goals:** real pictures in plan pages, offline, with spot notes; a Before screenshot for a plan that changes a screen the person can open; a preview review page after a build, Live now beside Preview, with spot notes and Publish.

**Non-Goals:** a review kit for other skills; a new plan page layout; picture shrinking.

## Decisions

1. **The `picture` fence.** Each line is `[label:] path`. A path resolves inside the page's source folder; a scheme, an absolute path, a `..` or a link that leaves the folder stops the build with the item and line. The type comes from the first bytes (PNG, JPEG, WebP); anything else stops. Over 150 KB warns; over 300 KB stops. The built page is measured last, as base64 makes each picture a third larger: over 500 KB stops, with no write, so every page fits the Inbox. Each message says to take only the visible part at phone width. The pictures become `<figure><img src="data:…" alt="label"><figcaption>label</figcaption></figure>` in one `.art.photo` frame (`data-note="item-N-picture-K"`, sharing the picture count with Mermaid, SVG and screens), inside a `<details open>`. With no label, the alt text is the file name and there is no caption. Figures wrap: side by side when they fit, else stacked. Alternative: links to files next to the page. Rejected: the page must open alone, offline.
2. **Before screenshots in `/plan`.** For a bullet that changes a screen the person can open today, `/plan` opens it as the person with `browse.mjs`, takes a screenshot of the visible part at phone width (no `--full-page`), copies it to `<change>/pictures/`, and puts a `picture` fence with `Before:` above the sketch. It prefers a seeded preview that shows the same screen, as a screenshot may hold private data. Not reachable → one plain line saying why.
3. **Sketches with real words.** `drawings.md` and `ux-principles.md` drop *low fidelity on purpose*; a gray bar shows only unknown text. No builder change. The skill text must stay in WongStack's context budget (`measure-context.mjs --check`), so `drawings.md` keeps its `svg` sample and `plan/SKILL.md` its sample flow's archive step, while other words get shorter. `drawings.md` drops its table and text samples: its bullets already say how to write both, and they did not fit the budget.
4. **The preview page.** `.agents/skills/apply/scripts/preview-review.mjs <change> --pair "<title>|<live>|<preview>"… [--note <line>]… [--link]` makes `.scratch/<change>-preview/` (with its own `.gitignore` of `*`), copies the pictures into `pictures/`, writes a `proposal.md` with one bullet and one `picture` fence per pair, and calls `buildReview(dir, { kind: 'preview' })`. The `preview` kind has no Decisions section and puts `data-kind="preview"` on `<body>`; the page name `<change>-preview` gives it its own notes key. With `--link` it opens the page through `openReplyLink` with `previewNotesHeader(change)` and one `publish` action that runs `/ship`. It prints the link, or the file when no link opens, and the line to show the person.
5. **The kit by page kind.** `data-kind="preview"` sets the title *Built: look, then publish?*, the preview notes line, the hint for pictures and the label *Publish*. Each of `build` and `publish` shows when the link offers it; the bar hides only when neither is offered, and two buttons share the bar in equal columns.
6. **`/apply` uses it.** *Finish with a preview* step 4 captures each changed screen live and in the preview by `/verify`'s plain checks, at phone width and only the visible part (no `--full-page`), and computer width only where the layout differs and the page has room under 500 KB. It runs `preview-review.mjs … --link` and reports its link. A failed capture → say why and keep the preview link and the choice.

## Risks / Trade-offs

- **The kit change touches every plan page.** → A plan page offers both actions, so it looks as before; browser tests cover both kinds.
- **Page size.** → Warn at 150 KB, stop at 300 KB a picture and 500 KB a page, so every page fits the Inbox; preview pictures stay in `.scratch/`, phone width first.
- **Screenshots may hold private data** in a saved plan. → Prefer a seeded preview; the plan says which screen it shows.
- **Real-word sketches invite review of colours over flow.** → Accepted: the person asked for real sketches.
