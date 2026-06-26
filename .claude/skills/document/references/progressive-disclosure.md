# Progressive-disclosure docs: the rulebook

A `docs/` wiki built this way is a **progressive-disclosure process tree**: one place to start, and every node drills down into more detail. You read the high level, click into the part you care about, and that part breaks down the same way — recursively. This page is how to add to such a wiki so it keeps working that way.

It uses **plain Markdown and standard Markdown links** — nothing tool-specific — so it works in GitHub's renderer, any static-site generator, an in-app viewer, or just a folder of `.md` files.

## The shape: start general, break down as needed

Every section starts from the **general process** and breaks each step down into its own page — and those pages break down again, as many layers deep as the work actually has. There's no fixed number of layers; you keep drilling until a page is specific enough to act on.

- A section's `README.md` is the top: an overview of the whole process, each step clickable.
- Any step with more to it links to its own page.
- That page does the same for *its* steps — and so on, only as far as the real work goes.

A worked shape: a section README with a "core loop" overview → a sub-process hub (e.g. `onboarding/README.md`, which is both a page and the folder's overview) → a single atomic leaf page specific enough to act on. **Don't manufacture depth** — add a layer only when there's genuinely more to break down. Many processes only need a level or two.

## One topic, one page

Each thing is documented in **exactly one place**. If the same procedure is written in two pages, that's a bug — pick the right home and replace the copy with a link. This is what keeps the tree trustworthy: there's never a second, stale version.

Two patterns fall out of this:

- **When vs. how.** Checklist/cadence pages (a daily or weekly list) say *when* to do something and link out; they never restate the procedure. The procedure page owns the *how*.
- **Generic before specific.** Write the shared process once (e.g. "how to cut a release") and keep the specific leaves thin (one environment just covers its quirks, then links up to the generic page).

## Every page stands on its own

Readers don't browse a table of contents — they **follow inline links down, or search straight to a page**. So a reader can land anywhere, mid-tree, with no context. That means:

- Give every page a clear **`#` title** and a strong **first sentence** that says what it is. Many doc tools (and GitHub's search) use that first line of prose as the result snippet or hover preview, so don't open with a breadcrumb, a caveat, or filler.
- **Title the topic, not its place in a sequence.** A page's title is the thing itself — `Find inspiration`, never `Stage 1 — Find inspiration`; `Postgres backups`, never `Step 3`. Ordering belongs to the parent hub's numbered list, not the child's title. Truly atomic pages can be reordered, reused, and linked from anywhere without their titles going stale — and they read as clean topics in search results. The same applies to the opening sentence and body: define the topic and link to its neighbours by name; don't lean on "this is the fourth step of…".
- Put drill-down links **inline, at the point of need** — inside the step a reader would be on when they want more — not only in a list at the bottom.

## Link everything, generously

Links are the connective tissue of a progressive-disclosure tree: the more the pages interlink, the easier it is to land anywhere and find the next thing. So **link every doc, app, page, tool, or external resource the moment you name it** — inline, at the point of need. The bar is low: if you mention something that has a page or URL, link it.

- Naming another doc? Link it (`[finding inspiration](../marketing/find-inspiration.md)`) — never just say its name in plain text.
- Naming an app page, dashboard, or external tool? Link it (`[the deploy dashboard](https://…)`).
- Pointing at one **section** of a page, not the whole thing? Append the heading anchor: `[count raw materials](weekly-cadence.md#count-raw-materials)`. The anchor is the heading text **lowercased, spaces → hyphens, punctuation dropped** (so `## Count raw materials — Monday` becomes `#count-raw-materials--monday`). Linking the exact section beats linking the page and making the reader hunt. The same `#anchor` works within a page (`[see below](#adding-a-page--the-checklist)`).
- Every page should point **up** to its hub, **down** to anything it references, and **sideways** to the sibling pages it hands off to or depends on.

Err on the side of more links — a reader who doesn't need them loses nothing, and a reader who does shouldn't have to go searching. (The one exception: never put links inside a `mermaid` diagram — keep those visual-only; see below.)

## Folders only for deep branches

A folder is what makes a branch's hierarchy visible (in most rendered wikis, breadcrumbs and sidebars are driven by folder structure). Use one only when a step expands into several of its own pages worth grouping (like `onboarding/` — a hub plus a page per role). A lone page stays flat in the section folder. Don't hand-write breadcrumbs in the Markdown.

A subfolder's `README.md` is its hub (most renderers, GitHub included, show a folder's `README.md` as its overview/index). Moving a page into a folder changes its URL, so update the links that point at it.

## Maps are pictures; links live in the list

Open a section with a `mermaid` diagram when a picture helps see the whole flow — but keep the **diagram visual-only**. Put the clickable links in the numbered stage list beside it, where they get normal link behavior. (Clickable diagram nodes are brittle; the list is the source of navigation.)

## No orphans, no dead-ends, full hub-coverage

- **No orphans:** every page must be reachable — something links to it (its hub at minimum).
- **Hub-coverage:** a hub (a section or folder `README`) must link *every one* of its own children.
- **No dead-ends:** a page should link onward — up to its hub at least, ideally down/sideways too.

## Adding a page — the checklist

1. Is this genuinely a new topic, or detail that belongs inside an existing page? **Prefer extending an existing page.**
2. Put it at the right layer, linked from its parent's stage/step.
3. Give it a **topic title** (the thing itself, not a "Step N" label) and a strong opening sentence that defines the topic on its own.
4. Link **generously** — *up* to its hub, *down* to anything it references, *sideways* to siblings — and link every doc, app, and resource you name. Make sure its parent links *to it*.
5. Don't restate anything already documented — link instead.
6. Add a subfolder only when a step grows into several of its own pages (a hub + children), not for a single new page.

## Keeping it tidy

In this framework, the wiki is gardened at **ship time**: when `/ship` distills a reusable process from a conversation, it extends the page that owns it (or, rarely, adds a properly-placed and linked new one) — following exactly the rules above. The discipline is: document **general, reusable processes only**; the conversation's specifics go in the GitHub **summary issue** that `/ship` records, never the wiki. One topic, one page; link, don't restate.
