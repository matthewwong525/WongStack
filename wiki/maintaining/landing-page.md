# The landing page

The landing page is the public site in [`site/`](../../site/): it tells a visitor what WongStack is and how to install it, with no login. It is **meta-only**: no install or update receives it, and it stays apart from the starter app in `app/`, which sits behind a login and ships to every install.

It is plain files, with no server code, database, or secret. Two pages exist: the landing page, and [the privacy page](#privacy-promises) at `/privacy`. Every other address shows the landing page, so an old link never lands on an error.

## Change what it says about installing

Everything the page says about installing sits in [`site/src/install.ts`](../../site/src/install.ts): the message to paste, the steps, the agents with their logos, the accounts a person needs, the computers it works on, the two ways to install with what each costs, and the pictured optional chat app. Edit that one file, and the install section and questions follow. Route, computer, account and cost-consent details appear in the existing setup question after the steps; the steps stay short. No other file under `site/src/` names an account, a system, a cost, or the message.

Four rules:

- **The message is the README's, character for character.** [The guard test](../../scripts/tests/landing-site.test.mjs) reads `INSTALL_PROMPT` from `install.ts` and fails when [the README](../../README.md)'s fenced message differs, naming both files. Change both in the same change.
- **A changed cost or computer changes the README and the guide too.** `WAYS` and `PAID_COST` in `install.ts` hold each way's accounts, computers, and cost. [The cost guard](../../scripts/tests/install-cost.test.mjs) reads them and fails when [the README](../../README.md) or [getting started](../stack/getting-started.md#what-it-costs) stops saying the paid way's cost and computers, or which way is free, naming the page and `install.ts`. Change all three in the same change. The guard runs on a wiki-only change too: that is how the guide once came to disagree.
- **Describe the install that works today**, not one that is planned. A page that promises a route early sends a visitor to a dead end.
- **Name an assistant or a chat app as an example, never as needed.** `STEPS` in [`site/src/install.ts`](../../site/src/install.ts) says *any assistant that can work on your computer* first, then names one as an example. A picture names the optional chat app shown in its caption. The headline and the text a shared link shows name no assistant today; if one ever does, name only assistants in `AGENTS`, each one tried as a working assistant first: a name that was never tried sends a visitor to a dead end.

## Keep the comparison chart true

The chart after the story compares WongStack with other products, one row each for Data, Process and Reason. A wrong claim about another company's product is a liability, so every mark is one of two: **what that product's own page says, or *not stated*. Never *no***: an absent quote proves nothing.

1. Open each source in [`site/src/compare.ts`](../../site/src/compare.ts) yourself, on the live page, not through a summary.
2. Set a mark to `"yes"` only from a quote you read there word for word, and keep the URL and quote beside it. A mark you can't confirm is `"not-stated"`, with no source.
3. Update `CHECKED` to the month you checked. The chart prints it.

[`Site.test.tsx`](../../site/src/Site.test.tsx) fails when a mark is anything else, a *yes* has no source, the chart says a product lacks something, or a compared product is named outside the chart.

## No hosting offer

The page never offers or mentions a WongStack paid plan, price, trial, subscription, account or sign-in, or a rented server, and it names no server provider. WongStack is free and runs on the visitor's own computer; a page that says otherwise sells something that does not exist.

**No WongStack price, not no price.** The page names one cost: what another company charges for an account the install uses, said with that company's name, such as Cloudflare's paid plan. Every such sentence is in `COST_LINES` in [`site/src/install.ts`](../../site/src/install.ts), and the page prints those strings as they are.

[`Site.test.tsx`](../../site/src/Site.test.tsx) reads every page for those words, and allows only the exact `COST_LINES` sentences: a reworded one, or a price written anywhere else, fails. It also fails when a line that names a price leaves out the company, or names WongStack.

## Privacy promises

[`site/src/Privacy.tsx`](../../site/src/Privacy.tsx) is a draft no lawyer has reviewed. It speaks only for the site and the software, and each sentence must be true of the site as built. The code keeps these promises:

- **No sign-in.** No page has a login, a form, or an account.
- **No cookies, and nothing stored in the browser.** No file under `site/src/` writes a cookie or browser storage, or sends a request.
- **No analytics, tracking, or ads.** Every file a page loads comes from the site itself: no outside script, font, or picture.
- **Cloudflare delivers the pages**, so it handles each request, the visitor's IP address included.
- **The software runs on the visitor's computer and in their own accounts.** Their code, files, chats, and AI logins never reach WongStack.
- **An email to the support address is kept to answer it**, and deleted on request.

A change that breaks one updates the page's sentence and its *Last updated* date in the same change. [`Site.test.tsx`](../../site/src/Site.test.tsx) checks the first three; adding a counter, a form, or an outside font fails it. The site carries no terms of service, because nothing is sold: the footer links [the license](../../LICENSE).

## Check, preview, and publish

[The Landing page workflow](../../.github/workflows/site.yml) owns all three, apart from the starter app's:

1. **Check.** A change that touches `site/` or the workflow runs the site's lint, type check, tests, and build. A change that leaves both alone skips them, and the check still reports, in one line.
2. **Preview.** On a branch, the workflow publishes the staging site and posts the change's own address on the commit as the `landing-preview` status. It shows as a *Details* link beside the change's checks. Read it with `gh api repos/<repo>/commits/<sha>/statuses`. The main preview link stays the starter app's. [Kept checks](../development/kept-checks.md#what-is-kept) of the landing page name `landing-preview` as their `site`, so they replay at this address, and read *not run* on a change that gets none.
3. **Publish.** A merge to the default branch puts the site live at [wongstack.com](#wongstackcom-is-the-sites-address). It keeps its own `workers.dev` address too.

A change under `site/` also runs the starter app's checks and staging deploy, as any code folder does: [the gate](../development/the-change-loop.md#the-gate) treats every path outside the docs as the main app.

### The deploy config has its own name

The site's deploy config is [`site/wrangler.site.jsonc`](../../site/wrangler.site.jsonc), and every wrangler call for the site passes `--config wrangler.site.jsonc`. Never rename it `wrangler.jsonc`: the starter app's scripts find their config by looking in each folder for that name, and with two to find they pick one by chance. [The guard test](../../scripts/tests/landing-site.test.mjs) fails on a second findable config, and when [the payload list](../../.agents/skills/wong-sync/references/payload-files.json) names anything under `site/`.

## wongstack.com is the site's address

The live site answers at `wongstack.com` and `www.wongstack.com`, and at its own `workers.dev` address as a second way in. Both names are the top-level `routes` in [`site/wrangler.site.jsonc`](../../site/wrangler.site.jsonc), so every publish attaches them. Never attach one by hand: the config is the record.

**A preview never takes either name.** An environment in that config inherits the top-level `routes`, so `env.staging` declares `"routes": []`. Without that list, a branch's preview would move `wongstack.com` to the staging site.

[The guard test](../../scripts/tests/landing-site.test.mjs) fails when an environment loses its empty list, when the two names change, or when `"workers_dev": true` goes: with `routes` declared and that key absent, the site loses its own address.

Both names show the same page; `www` does not send a visitor on. Every page names `wongstack.com` as its one address to index and share ([`site/index.html`](../../site/index.html)), so neither `www` nor a preview becomes the indexed copy.

The compatibility section describes any model or setup through a coding agent that can read/change files and run commands. Keep Claude Code/Codex automatic memory loading distinct from another assistant’s manual lookup. There is no separate Supports row.

## Pictures and brand files

- **The business story** sits in [`site/src/Story.tsx`](../../site/src/Story.tsx), styled in [`site/src/index.css`](../../site/src/index.css). It follows Matthew's talk *How to self-drive your business*, one scene per slide: the same three a self-driving car needs, then Data, Process, Reason, and one example (publishing an ad). Each scene has a short step label, a heading, one line, and the slide redrawn in markup; the page loads no business data, and every example is made up. Keep the talk's words when you change one, and keep labels to one short phrase.
- **The talk's pictures**: the hero's car and the road under Reason's questions are the deck's own drawings, converted to WebP at 1600 px wide in [`site/public/art/`](../../site/public/art/) (`car.webp`, `road.webp`), each with its `width`, `height` and a plain `alt`. The slide icons are drawn inline in [`site/src/icons.tsx`](../../site/src/icons.tsx), so the page loads no icon file.
- **Data, Process and Reason keep the slides' accent each**, wherever they appear: green, blue, and purple. A crossed-out item, like the SOP card, also carries a ✗ and a hidden *Not*, so it reads right without color.
- **Reason says reasons are saved from chats**, and never shows the visitor asking the assistant to remember: saving is not their job. Don't promise every transcript or detail is kept.
- **Keep the page short and about the ideas**, not the app's screens: [Matthew](../people/matthew-wong.md) wants no chat app screenshot, sample tools, or team scene. Add a picture of the app only when he asks.
- **The setup section** sits right before the install steps and lists what setup handles. Its *Servers and databases* item is the one place the page may say *servers*: [`Site.test.tsx`](../../site/src/Site.test.tsx) allows that exact phrase and still catches any other.
- **The logo and the share card** are drawn in [`site/brand/`](../../site/brand/). `share-image.svg` is the source of `site/public/share.png`, the picture a shared link shows; its opening comment says how to render it.
- **The Paseo pictures** remain in [`site/public/paseo/`](../../site/public/paseo/); the page shows none. The share card draws `phone.webp`. The install steps contain no separate add-on block.
- **The older illustrations** remain in [`site/public/art/`](../../site/public/art/), unused. These images were generated once with Gemini (`gemini-3.1-flash-image`, 16:9), then resized to 960 px wide WebP. Their shared prompt was: “minimal line illustration, soft white and gray lines on a near-black background, no text, no logos, generous empty space.” The individual prompts are kept here:

| File | Subject prompt |
| --- | --- |
| `shared-memory.webp` | Three people at their own laptops, each linked by thin lines to one shared open notebook in the middle |
| `browser-use.webp` | A browser window with a cursor clicking a button, and beside it a phone showing a message with a link |
| `best-practices.webp` | Neat stacked building blocks on a blueprint grid, with a padlock, a key, a check mark, and a plain database cylinder with no letters |
| `company-brain.webp` | A brain outline made of connected notes and small gears, with a few notes being tidied into place |

## Keep its packages current

[`/update-dependencies`](../../.agents/skills/update-dependencies/SKILL.md) updates `site/` as its own stage, and Dependabot opens its weekly update requests for `/site`.

Part of [Maintaining WongStack](README.md).
