# Review pages

A review page is one HTML page that shows a person what an agent plans or made, and takes their OK, their notes, and their go. A plan, a finished build, and work that changes no repo file, such as ads to approve, all use the same page. This page owns the standard; [UX principles](ux-principles.md#the-review-file) adds what only a plan's page needs. Part of [the WongStack wiki](README.md).

## The frame

Every review page shows the same parts, in this order:

1. **The ask**, in one line: the title of the page, such as *Approve these 3 ads?*
2. **Why**: a few short paragraphs.
3. **The cards**: the things to review, numbered, each with its picture or words.
4. **Decisions**, only when there are some. A page with none shows no Decisions section and no link to one.
5. **The bar** at the bottom: *Send notes*, and only the buttons the page's link offers. Opened from a file, *Send notes* is *Copy notes*.

[`build-review.mjs`](../.agents/skills/plan/scripts/build-review.mjs) builds each page into [the fixed kit](../.agents/skills/plan/references/review-kit.html). One builder and one kit make all three kinds, so a fix to one page fixes them all:

| Kind | Source | Made by |
|---|---|---|
| A plan | `openspec/changes/<name>/proposal.md` | [`/plan`](../.agents/skills/plan/SKILL.md#draw-in-the-proposal-then-build-the-page) |
| A finished build | `.scratch/<change>-preview/proposal.md` | [`/apply`](../.agents/skills/apply/SKILL.md#finish-with-a-preview), through `preview-review.mjs` |
| Other work | `review.md` in a folder outside tracked files | [a page for other work](#a-page-for-other-work) |

## A card shows the closest real result

A card shows what the go makes, as close to the real thing as you can make it. A person who sees the real result decides once; a person who sees a sketch decides twice, before and after the build. Pick the card's content by the job:

| Job | The card shows |
|---|---|
| A plan that adds or changes a screen | *Before*, a screenshot of today's screen; *After*, one picture per state from [the prototype](#the-prototype); and a *Try it* link |
| A screen when no prototype can run | a `screen` sketch, and one plain line that says why there is no real picture |
| A flow, states, or a back-and-forth | a `mermaid` picture |
| A finished build | *Approved* beside *Built*, or *Live now* beside *Preview* |
| Ads | an [`ad` card](#the-ad-card) per ad |
| Words to send, such as an email or a post | the real words, as the card's text |
| Rows of data | a Markdown table |

[The drawing guide](../.agents/skills/plan/references/drawings.md) says how to write each fence.

## The prototype

A plan that adds or changes a screen makes a throwaway copy of the app, changes the screen there, and puts it on the change's preview address. [`prototype.mjs`](../.agents/skills/plan/scripts/prototype.mjs) runs each step:

1. `prototype.mjs start <change>` makes the copy at `.scratch/<change>-prototype` and prints its path. When an earlier `finish` left a diff, the new copy starts with those edits. Edit the screen in the copy. Write sample data into the screen: the copy changes no database.
2. `prototype.mjs upload <change>` puts the copy on the change's preview address. A new file in `schema/migrations` stops it, because the preview shares the practice database.
3. Take one picture per state the plan names, with [the browser](development/browsing.md) (`browse.mjs screenshot`), at phone width and the visible part only. Copy them to `<change>/pictures/`, and write them in the bullet's `picture` fence after the *Before* picture, with a `Try it: <https address>` line. The builder draws *Try it* as a link that opens in a new tab, and stops on any address that is not `https://`.
4. Notes on the plan change the copy too: upload again, take new pictures, and rebuild the page.
5. `prototype.mjs finish <change>` keeps the copy's changes as `.scratch/<change>-prototype.diff` and removes the copy. [`/apply`](../.agents/skills/apply/SKILL.md#build-in-a-helper) runs it when the copy is still there, and [its build](../.agents/skills/apply/references/build-helper.md) reads that diff first and builds the same screens properly, with real data and tests.

No step needs a go from the person, and git never takes the copy. A step fails → keep the `screen` sketch and write one line on why.

After the build, `preview-review.mjs --approved "<title>|<After picture>|<built picture>"` shows the approved picture beside the built screen, labelled *Approved* and *Built*.

## OK and Change

Each numbered card has **OK** and **Change**. *OK* marks the card accepted; tap *Undo* to take it back. *Change* opens a note on the card. Each OK goes to the chat with the notes, one line per card before them, such as `Card #2: OK` (`Change #2: OK` on a plan). An OK alone starts nothing: only a button in the bar does.

## Notes on words and spots

A reviewer notes a paragraph, a card, a decision, or a table row with *+ Note*. Two more kinds name a smaller part:

- **Selected words.** Select words in one paragraph or card, and the page offers *Note*. The note keeps the words and finds them again by their text, such as `- Card #2 ("Shop now"): Say Buy now.`
- **A picture spot.** In the full-screen view, tap a point on a screenshot or an ad. The note keeps the point in percent, so it stays in place at any size, and the page draws it as a numbered pin, such as `- Card #1, picture 1, spot at 50% across and 25% down on "Spring sale"`.

The notes list groups notes under *Why*, each card, and *Decisions*. Notes stay in the browser, or in the Inbox page around it, never in a repo file.

## A page for other work

Use one for work that changes no repo file and needs a person's choice, such as ads to approve. Write `review.md` in a folder outside tracked files, such as `.scratch/<name>/`:

```markdown
# Approve these 3 ads?

## Why

The spring sale starts Monday.

## To review

- **Feed ad.** For people who follow the shop.

## Decisions

- **2026-10-31** — Assumed: two placements, because the shop posts both.
```

*Decisions* is optional. Then build it with its own buttons:

```bash
node "$(git rev-parse --show-toplevel)/.claude/skills/plan/scripts/build-review.mjs" .scratch/spring-ads --kind review \
  --action "approve=Approve|Approved: run the 3 ads as shown." --action "launch=Launch|Launch the 3 ads now." --confirm launch --link
```

Each `--action` is a name, the label the button shows, and the one-line message the chat gets, 6 at most. A name is lowercase letters, digits, and hyphens; `yes`, `cancel`, and `send` are the bar's own. A `--confirm` name asks once more on the page, such as *Launch? This can't be undone.* The page opens in the person's Inbox when one answers, else through [a reply link](development/reply-links.md). Its notes come under *Notes on the review page "<ask>". Don't go on yet.*

## The ad card

An `ad` fence shows one ad as it runs:

````markdown
```ad
placement: feed
account: Corner Shop
picture: pictures/feed.png
text: Spring sale on all plants.
headline: Spring sale
button: Shop now
```
````

`placement` is `feed` (a 4:5 frame) or `story` (a 9:16 frame); feed is the default. `picture` follows the picture rules: a file in the page's folder, under 300 KB, no web address. Several `ad` fences in one bullet sit side by side where they fit. A missing `picture:` line, an unknown placement, or an unknown line stops the build with the card and line.

## Add a card kind

1. Add the fence to `build-review.mjs`: draw it as escaped HTML from the look's parts, with no link, and read any picture through the same check as a `picture` fence.
2. Style it in the kit's one `<style>`, with the look's colors only, so it follows the light and dark switch.
3. Test it beside the picture tests (`review-pictures.test.mjs`): what it draws, and each input that stops the build.
4. Add one line to [the drawing guide](../.agents/skills/plan/references/drawings.md) and a row to [the table above](#a-card-shows-the-closest-real-result).
