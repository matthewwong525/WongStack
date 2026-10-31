# Design

## Context

`.agents/skills/plan/scripts/build-review.mjs` builds a page from `proposal.md` into `.agents/skills/plan/references/review-kit.html`. It has two page kinds: `plan` and `preview` (from `.agents/skills/apply/scripts/preview-review.mjs`, written in `.scratch/`). Drawings are `mermaid`, `screen`, `svg`, `picture`, text fences and Markdown tables. Notes anchor to `data-note` ids and are kept in `localStorage` under `wong-review3:<name>`. The kit hard-codes two actions, `build` and `publish`, with fixed labels. The reply link (`.agents/skills/hand-over/scripts/reply-link.mjs`) takes up to 6 `name → message` actions. It sends any page that starts with the builder's mark to the Inbox, and the Inbox keeps at most 512 KB per page.

The preview upload (`scripts/cf-preview.sh --alias <name>`) builds the whole app for staging, applies pending migrations to the staging database, and uploads a staging Worker version under the alias.

## Goals / Non-Goals

**Goals:** one frame for every review page; OK and Change per card; notes on selected words and picture spots, listed by card; pages for work that is not a plan, with their own buttons; an `ad` card; a throwaway prototype that gives a code plan real *After* pictures and a *Try it* link; *Approved* beside *Built* after the build; one wiki page that owns the standard.

**Non-Goals:** an email card; a clickable prototype inside the page; making ad pictures; launching ads; changing the Inbox's API or limits.

## Decisions

1. **One builder, three kinds.** `plan`, `preview`, and a new `review` kind. A `review` page's source is `review.md` in its own folder: `# <ask>`, `## Why`, `## To review` (one bullet per card, with the same fences as a plan), and an optional `## Decisions`. The frame comes from the builder, and a source can't leave a part out. A missing `## Why` or `## To review` stops the build. A plan keeps `proposal.md` and the heading *Changes*. Its ask is the change name, as today. Alternative: a separate builder for non-plan pages. Rejected: two copies of the frame drift.
2. **Cards.** Each item is already an `<li>` card. The kit adds an OK / Change pair to each card. OK is kept in the same `localStorage` record as notes (`ok: {"item-2": true}`), and tapping it again undoes it. Change opens the editor on the card, as + Note does today. Sent and copied blocks list `Card #n: OK` (plan: `Change #n: OK`) under the header and above the notes. A sent OK is marked sent like a note, so it is not sent twice.
3. **Notes on words and spots.** A text selection inside a `[data-note]` element shows a *Note* chip. The note stores the quote and its target id, and the pin finds the quote again by text, as labels do today. A tap on a picture in full screen stores the spot as a percentage (`x`, `y`) and draws a numbered pin there. The notes list groups notes by card number. Why and decision notes keep their own groups.
4. **Labelled actions.** `build-review.mjs <folder> --kind review --action "<name>=<label>|<message>" [--confirm <name>]… --link`. The builder writes the labels into the page as `data-actions` JSON. It sends `name → message` to `openReplyLink`, the same contract as today, with a limit of 6. The kit draws the bar from `data-actions`. The `plan` and `preview` kinds pass their current actions and labels, so those pages look the same. A name in `--confirm` gets the confirmation step that *Build and publish* has today.
5. **The `ad` fence.** Lines `placement: feed|story`, `account:`, `picture:`, `text:`, `headline:`, `button:`. The `picture:` line goes through the `picture` path checks and limits. It is drawn as a fixed frame with the look's parts: a 4:5 frame for feed and 9:16 for story, account row, picture, text, headline, button. The frame is escaped, like other fences, and has no links. Several `ad` fences in one bullet wrap side by side. A missing `picture:` or an unknown `placement:` stops the build with the item and line.
6. **The prototype.** New `.agents/skills/plan/scripts/prototype.mjs`:
   - `start <change>` adds a detached git worktree at `.scratch/<change>-prototype` from `HEAD`, links the checkout's `app/node_modules` into it, and prints its path.
   - `upload <change>` refuses when the copy has a new migration, then runs `cf-preview.sh --alias <change>` inside it and prints the URL.
   - `finish <change>` writes `git diff` of the copy to `.scratch/<change>-prototype.diff` and removes the worktree.

   `/plan` runs these steps for a bullet that adds or changes a screen. It edits the screen in the copy with sample data inline (no migration) and uploads it. It takes one picture per named state with `browse.mjs screenshot`, at phone width and the visible part only. It copies the pictures to `<change>/pictures/` and writes `Before:` and `After:` lines in the bullet's `picture` fence, with a `Try it: <https url>` line, which the builder draws as a link that opens in a new tab and accepts only an `https:` address. A failed step means one line on why, and the `screen` sketch stays. Alternative: running the app on this computer. Rejected: a preview is what the person can open from a phone.
7. **`/apply` uses the prototype.** `build-helper.md` says: when `.scratch/<change>-prototype.diff` exists, read it first and build the same screens properly, with real data paths and tests. `preview-review.mjs` takes `--pair "<title>|<approved>|<built>" --approved`, which labels the pair *Approved* and *Built*. `/apply` step 4 passes the plan's *After* picture for screens that have one.
8. **The standard's home.** `wiki/review-pages.md` owns the frame, the rule that a card shows the closest real result, the choice of card content per job, OK and Change, and how to add a card kind. `wiki/ux-principles.md#the-review-file` keeps only the plan-specific parts and links it. `drawings.md` gains one `ad` line and a note on prototype pictures, with offsetting cuts for the context budget.

## Risks / Trade-offs

- **Planning gets slower and uses the preview upload.** → A prototype is made only for a bullet that adds or changes a screen. Notes reuse the same copy until `finish`.
- **The prototype's preview takes the change's alias.** → `/apply` uploads to the same alias, so the build replaces it. Between the plan and the build, the alias shows the prototype, which is what the person approved.
- **A migration in the prototype would change the shared staging database.** → `upload` refuses a copy with a new migration file. The prototype shows sample data written into the screen.
- **Screenshots in a saved plan may hold private data.** → The prototype runs on staging with seed data only.
- **The kit grows.** → Browser tests cover OK and Change, word notes, spot pins, labelled actions, and the ad frame at 320 px.
- **The context budget is tight.** → The new rules go in the wiki page. The skills link to it, and `measure-context.mjs --check` passes before save.

## UX

### Use-case brief
The business owner, often on a phone in the Inbox, approves an agent's work: a plan, a build, or ads. Done means one tap gives a result they have already seen. They review a few times a day. The common case is OK on most cards, a note on one, then a go. The edge case is a page with no real picture, which uses a sketch with a reason. This mirrors today's plan review page.

### Flow
Open from the Inbox → read the ask → scan cards → OK or Change per card → Send notes, or the bar's main button. Notes go back to the chat, and a rebuilt page comes back as a new Inbox item.

### Hierarchy
Per page, the bar's main button (Build it, Approve, Publish) is the one primary action. OK and Change are ghost buttons on each card, and Send notes is secondary unless the page has no other button.

### Review
[review.html](review.html), items 1 (the frame), 4 (OK and Change), 5 (notes), and 7 (the ad card).

### Components
The kit's existing card, buttons, tag, pins and editor. New: the OK and Change pair, the word-selection chip, the spot pin, and the ad frame, all built from the look's parts.
