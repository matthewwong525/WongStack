# Review pages

A review page is one HTML page that shows a person what an agent plans or made, and takes their OK, their notes, and their go. A plan, a finished build, and work that changes no repo file, such as ads to approve, all use the same page. This page owns the standard; [UX principles](ux-principles.md#the-review-file) adds what only a plan's page needs. Part of [the WongStack wiki](README.md).

## The frame

Every review page shows the same parts, in this order:

1. **The ask**, in one line: the title of the page, such as *Approve these 3 ads?*
2. **Why**: a few short paragraphs.
3. **The cards**: the things to review, numbered, each with its picture or words.
4. **What the build needs**, on a plan: [each key, login, file, or answer](#what-the-build-needs), *Ready* or *Needs you*.
5. **Decisions**, only when there are some. A page with none shows no Decisions section and no link to one.
6. **The bar** at the bottom: *Send notes*, and only the buttons the page's link offers. Opened from a file, *Send notes* is *Copy notes*.

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
| A website this app doesn't run, such as a shop's pages | a [live card](#the-live-card) of [its prototype](#a-website-prototype) as its *After* picture, with no second picture of the same sample |
| A choice that needs its own control, such as *put these in order* | a [live card](#the-live-card) that sends the pick |
| Answers or files the build needs from you | [questions](#questions-and-files) in the card, or in [What the build needs](#what-the-build-needs) |
| A screen when no prototype can run | a `screen` sketch, and a line `No real picture: <the step that failed>` |
| A flow, states, or a back-and-forth | a `mermaid` picture |
| A finished build | *Approved* and *Built*, or *Live now* and *Preview*, side by side |
| Ads | an [`ad` card](#the-ad-card) per ad, side by side |
| A whole designed page, such as an email | a [page card](#the-page-card), one picture a version |
| Words to send, such as an email or a post | the real words, as the card's text |
| Rows of data | a Markdown table |

[The drawing guide](../.agents/skills/plan/references/drawings.md) says how to write each fence.

## The card view

A card shows each picture, drawing, ad, page, and live card as one labelled picture, side by side, in the order you write them. There are no tabs.

- **On a screen 900 px or wider**, the words sit on the left and the pictures on the right. The pictures are as tall as the words: at least 420 px, so a phone picture stays readable, and at most the window. Each picture shrinks whole to fit, and is never cut. A page or a live card shows its top, with a fade when there is more. All the words show.
- **On a phone**, the words come first, then a row of small pictures, then *OK* and *Note*. Words past about two lines fold, with *More* at the end of the words.
- **A click or a tap opens a picture full screen.** The labels sit on top, and *Close* sits alone at the right. Tap a label, swipe, or use the arrow keys to see the next. The bar at the bottom holds *Phone* and *Computer*, only for a page or a live card, and *Try it*. A tap on the background does not close it; *Close* and Escape do.
- **A picture's name** is its label, such as `Before:`, or the text after a fence's kind, such as ```` ```mermaid Today ````; else the kind, such as *Flow* or *Drawing*. A picture with no label takes its file name. A phone and a computer picture of one screen, labelled `Inbox, phone:` and `Inbox, computer:`, are two pictures.
- **Keep the words short**: lead with what changes in one sentence, and put the detail after it.

## The prototype

A plan that adds or changes a screen makes a throwaway copy of the app, changes the screen there, and puts it on the change's preview address. [`prototype.mjs`](../.agents/skills/plan/scripts/prototype.mjs) runs each step:

1. `prototype.mjs start <change>` makes the copy at `.scratch/<change>-prototype` and prints its path. When an earlier `finish` left a diff, the new copy starts with those edits. Edit the screen in the copy. Write sample data into the screen for each state and for data the copy can't reach, such as another service's: the copy changes no database.
2. `prototype.mjs upload <change>` puts the copy on the change's preview address. A new file in `schema/migrations` stops it, because the preview shares the practice database. When `upload` can't run, `prototype.mjs serve <change>` runs the copy on this computer and prints `PROTOTYPE_URL=`: take the pictures there, and stop it when you are done.
3. Take one picture per state the plan names, with [the browser](development/browsing.md) (`browse.mjs screenshot`), at phone width and the visible part only. Copy them to `<change>/pictures/`, and write them in the bullet's `picture` fence after the *Before* picture, with a `Try it: <https address>` line. The builder draws *Try it* as a link that opens in a new tab, and stops on any address that is not `https://`.
4. Notes on the plan change the copy too: upload again, take new pictures, and rebuild the page.
5. `prototype.mjs finish <change>` keeps the copy's changes as `.scratch/<change>-prototype.diff` and removes the copy. [`/apply`](../.agents/skills/apply/SKILL.md#build-in-a-helper) runs it when the copy is still there, and [its build](../.agents/skills/apply/references/build-helper.md) reads that diff first and builds the same screens properly, with real data and tests.

No step needs a go from the person, and git never takes the copy. Only when every way fails, keep the `screen` sketch and add a line `No real picture: <the step that failed>` to the bullet. The builder warns on a sketch with neither a picture nor that line.

After the build, `preview-review.mjs --approved "<title>|<After picture>|<built picture>"` shows the approved picture and the built screen side by side, as *Approved* and *Built*.

## A website prototype

A plan for a website this app doesn't run, such as a shop's theme or a landing page, makes the site's real files while it plans and shows them in [a live card](#the-live-card). Screens inside the app keep [the prototype](#the-prototype) above.

1. Write the site in `openspec/changes/<change>/prototypes/<site>/`, with `index.html` first. Copy each font and picture into the folder: the card loads nothing from the web.
2. Show it in the bullet's `live` fence, with `folder: prototypes/<site>`.
3. Notes on the plan change the same files; rebuild the page.
4. On the go, [the build](../.agents/skills/apply/references/build-helper.md) starts from those approved files, not from a new start.
5. After the build, take pictures of the approved card and the built page at 390 and 1280 px wide, and pass each pair to `preview-review.mjs --approved`, so the check shows *Approved* beside *Built*.

## The live card

A `live` fence runs a page the chat made inside the review page:

````markdown
```live
folder: prototypes/shop
height: 900
```
````

`folder` is a folder inside the page's own folder that holds `index.html`. `height` is the card's height in pixels, 200 to 4000; 640 when you leave it out.

- **Every file goes inside the page.** The builder copies the page's styles, scripts, pictures, and fonts into it: PNG, JPEG, WebP, GIF, SVG, WOFF, and WOFF2, each checked by its first bytes. A file over 300 KB, a card over 800 KB, a CSS `@import`, a file outside the folder, and any web address stop the build, a link or a form's address too. A page over 800 KB warns, because it opens slowly on a phone; a page over 1.5 MB stops, because the Inbox keeps 1.6 MB a page.
- **The card runs sealed.** It runs its own script, with no network, no sign-in, and no way to reach the review page or the app. A card that tries to leave says *This card tried to leave the page.* and starts again; after three tries it stops until you reload.
- **It sends one answer.** The card's script calls `review.answer(text)`, such as `review.answer('Order: Fern, Palm, Ivy')`. The page keeps the newest answer, up to 2,000 characters, and sends it with the notes as `- Card #2 answer: Order: Fern, Palm, Ivy` (`Change #2 answer` on a plan).
- **It is one of the card's pictures**, named by the text after `live`, such as ```` ```live After ````. The card shows its top at phone width, and a tap there does nothing. Open it full screen to use it: *Phone* draws it 390 px wide and *Computer* 1280 px, shrunk to fit the screen. A live card takes no spot note; *Note* covers it.

## Questions and files

A `form` fence puts questions in a card, one a line, as `<kind>: <question>`:

````markdown
```form
text: Shop name
long: About the shop
choice: Sale ends | Sunday, Next Sunday
choices: Colours | Red, Blue, Green
date: Launch day
tick: Free shipping over $50
pictures: Top picture | pictures/a.png, pictures/b.png
file: Logo | image, pdf | 2
```
````

`choice` takes one option and `choices` several. `pictures` shows 2 to 12 pictures from the change's folder, each under 300 KB, and takes one. `file` takes its types, from `image`, `pdf`, `text` (TXT, CSV, MD, JSON), `office` (DOCX, XLSX, PPTX), and `zip`, and how many files, 1 to 5. A form holds 12 questions at most. An unknown kind or type stops the build.

- **Answers go with the notes**, and with any button in the bar, one line each, such as `- Card #1, "Shop name": Corner Shop`. The page keeps them like notes and sends each answer once.
- **A file goes at once** to the computer the chat runs on: drop it on the question, or tap to pick one on a phone. Each shows *Sending…*, *Sent*, or *Refused* with the reason, and a refused one can go again. A file is 25 MB at most, and one page's files 100 MB. The chat gets a `Files:` line per file, with the question, name, size, and the path where it is saved. [Reply links](development/reply-links.md#files-from-a-page) say where files wait and when they go.
- **Never a secret.** A question named like a password, key, token, or card number stops the build: a page's answers go into the chat. A key goes through [its private link](development/secrets.md#receive-a-key-through-a-private-link).

## What the build needs

Every plan lists what its build needs from you, so a build never stops halfway to ask. Write it as `## What the build needs`, after What Changes, one bullet a thing:

````markdown
## What the build needs

- **Shopify key**: Ready, `SHOPIFY_TOKEN` is in `.env`.
- **Your logo**: Needs you.
  ```form
  file: Logo | image | 1
  ```
- **Meta ads key**: Needs you. Get it: <https://key.example.dev/k>
````

- **Check each thing before you mark it.** A business service's key: `node scripts/company-api.mjs services`, then the computer's own `.env` ([secrets](development/secrets.md)). A website sign-in: open the site with `browse.mjs` and read whether it is signed in ([saved browser logins](development/browsing.md#saved-browser-logins)). A thing that is there is *Ready*.
- **A *Needs you* item holds its question or its link**: a `form` fence, or one `https` link, such as a key's [private link](development/secrets.md#receive-a-key-through-a-private-link), which the page shows as *Open the link*. A plan that needs nothing has one bullet, `- **Nothing.**`
- **The bar waits for it.** An item counts as open until you answer its questions on the page. While any item is open, each button but *Send notes* reads *2 things need you*, and a tap shows the first open item. A key saved on its private link turns *Ready* when the chat builds the page again.
- **A need still open stops the build**, which says what is missing.

## OK and Note

Each numbered card has **OK** and **Note**. *OK* marks the card accepted; tap *Undo* to take it back. *Note* opens a note on the card, for a change or a question. Each OK goes to the chat with the notes, one line per card before them, such as `Card #2: OK` (`Change #2: OK` on a plan). An OK alone starts nothing: only a button in the bar does.

## Notes on words and spots

A reviewer notes a card with its *Note* button, and a *Why* paragraph, a decision, or a table row with *+ Note*. Two more kinds name a smaller part:

- **Selected words.** Select words in one paragraph or card, and the page offers *Note*. The note keeps the words and finds them again by their text, such as `- Card #2 ("Shop now"): Say Buy now.`
- **A picture spot.** Open a picture, a drawing, an ad, or a [whole page](#the-page-card) full screen, and tap a point. The note keeps the point in percent, so it stays in place at any size. The page draws it as a numbered pin, full screen and on the card's picture, such as `- Card #1, picture 1, spot at 50% across and 25% down on "Spring sale"`.

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

Each `--action` is a name, the label the button shows, and the one-line message the chat gets, 6 at most. A name is lowercase letters, digits, and hyphens; `yes`, `cancel`, and `send` are the bar's own. A `--confirm` name asks once more on the page, such as *Launch? This can't be undone.* The page opens in the person's Inbox when one answers, else through [a reply link](development/reply-links.md). Once an answer reaches the chat, the page turns read-only under that answer, and it stays so in the Inbox's Archive ([in your inbox first](development/reply-links.md#in-your-inbox-first)). Its notes come under *Notes on the review page "<ask>". Don't go on yet.*

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

`placement` is `feed` (a 4:5 frame) or `story` (a 9:16 frame); feed is the default. `picture` follows the picture rules: a file in the page's folder, under 300 KB, no web address. Several `ad` fences in one bullet sit side by side, each named *Feed* or *Story* or the text after `ad`. A missing `picture:` line, an unknown placement, or an unknown line stops the build with the card and line.

## The page card

A `page` fence shows a whole designed page, such as an email, as readers will see it. Each line is one version, `<label>: <file>.html`, from the change's folder:

````markdown
```page
A: email/a.html
B: email/b.html
```
````

- **One picture a version**, side by side. The card shows each page's top, with a fade; full screen shows the whole page, and *Phone* / *Computer* shows it 390 or 1280 px wide.
- **It runs none of its own script.** A `<script>`, an `on…` attribute, a `javascript:` address, or a frame stops the build: a page that needs a script is a [live card](#the-live-card). The review page adds one small script of its own, the only one the page lets run, to tell the card how tall the page is, so the card shows the whole page in the Inbox too.
- **Links look real but go nowhere.** Hover over one to see its address.
- **Pictures and fonts go inside**, by the live card's rules: a web address stops the build. A file is under 300 KB, and a card's versions together under 800 KB.
- **A tap full screen places a spot note** that names its version, such as `on "B"`.

## Add a card kind

1. Add the fence to `build-review.mjs`: draw it as escaped HTML from the look's parts, with no link, and read any picture through the same check as a `picture` fence.
2. Style it in the kit's one `<style>`, with the look's colors only, so it follows the light and dark switch.
3. Test it beside the picture tests (`review-pictures.test.mjs`): what it draws, and each input that stops the build.
4. Add one line to [the drawing guide](../.agents/skills/plan/references/drawings.md) and a row to [the table above](#a-card-shows-the-closest-real-result).
