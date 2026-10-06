# The landing page

The landing page is the public site in [`site/`](../../site/): it tells a visitor what WongStack is and how to install it, with no login. It is **meta-only**: no install or update receives it, and it stays apart from the starter app in `app/`, which sits behind a login and ships to every install.

It is plain files, with no server code, database, or secret. Two pages exist: the landing page, and [the privacy page](#privacy-promises) at `/privacy`. Every other address shows the landing page, so an old link never lands on an error.

## Change what it says about installing

Everything the page says about installing sits in [`site/src/install.ts`](../../site/src/install.ts): the message to paste, the steps, the agents, the accounts a person needs, the computers it works on, the two ways to install with what each costs, and the optional add-on. Edit that one file, and the install section, the questions, and the list of what WongStack is built on all follow. No other file under `site/src/` names an account, a system, a cost, or the message.

Four rules:

- **The message is the README's, character for character.** [The guard test](../../scripts/tests/landing-site.test.mjs) reads `INSTALL_PROMPT` from `install.ts` and fails when [the README](../../README.md)'s fenced message differs, naming both files. Change both in the same change.
- **A changed cost or computer changes the README and the guide too.** `WAYS` and `PAID_COST` in `install.ts` hold each way's accounts, computers, and cost. [The cost guard](../../scripts/tests/install-cost.test.mjs) reads them and fails when [the README](../../README.md) or [getting started](../stack/getting-started.md#what-it-costs) stops saying the paid way's cost and computers, or which way is free, naming the page and `install.ts`. Change all three in the same change. The guard runs on a wiki-only change too: that is how the guide once came to disagree.
- **Describe the install that works today**, not one that is planned. A page that promises a route early sends a visitor to a dead end.
- **Name an assistant or a chat app as an example, never as needed.** `STEPS` in [`site/src/install.ts`](../../site/src/install.ts) says *any assistant that can work on your computer* first, then names one as an example. A picture of a chat app says it shows what Matthew uses. The headline and the text a shared link shows name no other product: a visitor who uses something else otherwise leaves at step one.

## No hosting offer

The page never offers or mentions a WongStack paid plan, price, trial, subscription, account or sign-in, or a rented server, and it names no server provider. WongStack is free and runs on the visitor's own computer; a page that says otherwise sells something that does not exist.

**No WongStack price, not no price.** The page names one cost: what another company charges for an account the install uses, said with that company's name, such as Cloudflare's paid plan. Every such sentence is in `COST_LINES` in [`site/src/install.ts`](../../site/src/install.ts), and the page prints those strings as they are.

[`Site.test.tsx`](../../site/src/Site.test.tsx) reads every page for those words, and allows only the exact `COST_LINES` sentences: a reworded one, or a price written anywhere else, fails. It also fails when a line that names a price leaves out the company, or names WongStack. The sample apps keep their made-up prices: each is a pretend screen.

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
2. **Preview.** On a branch, the workflow publishes the staging site and posts the change's own address on the commit as the `landing-preview` status. It shows as a *Details* link beside the change's checks. Read it with `gh api repos/<repo>/commits/<sha>/statuses`. The main preview link stays the starter app's.
3. **Publish.** A merge to the default branch puts the site live at [wongstack.com](#wongstackcom-is-the-sites-address). It keeps its own `workers.dev` address too.

A change under `site/` also runs the starter app's checks and staging deploy, as any code folder does: [the gate](../development/the-change-loop.md#the-gate) treats every path outside the docs as the main app.

### The deploy config has its own name

The site's deploy config is [`site/wrangler.site.jsonc`](../../site/wrangler.site.jsonc), and every wrangler call for the site passes `--config wrangler.site.jsonc`. Never rename it `wrangler.jsonc`: the starter app's scripts find their config by looking in each folder for that name, and with two to find they pick one by chance. [The guard test](../../scripts/tests/landing-site.test.mjs) fails on a second findable config, and when [the payload list](../../.agents/skills/wong-sync/references/payload-files.json) names anything under `site/`.

## wongstack.com is the site's address

The live site answers at `wongstack.com` and `www.wongstack.com`, and at its own `workers.dev` address as a second way in. Both names are the top-level `routes` in [`site/wrangler.site.jsonc`](../../site/wrangler.site.jsonc), so every publish attaches them. Never attach one by hand: the config is the record.

**A preview never takes either name.** An environment in that config inherits the top-level `routes`, so `env.staging` declares `"routes": []`. Without that list, a branch's preview would move `wongstack.com` to the staging site.

[The guard test](../../scripts/tests/landing-site.test.mjs) fails when an environment loses its empty list, when the two names change, or when `"workers_dev": true` goes: with `routes` declared and that key absent, the site loses its own address.

Both names show the same page; `www` does not send a visitor on. Every page names `wongstack.com` as its one address to index and share ([`site/index.html`](../../site/index.html)), so neither `www` nor a preview becomes the indexed copy.

## Pictures and brand files

- **The logo and the share card** are drawn in [`site/brand/`](../../site/brand/). `share-image.svg` is the source of `site/public/share.png`, the picture a shared link shows; its opening comment says how to render it.
- **The four point pictures** in `site/public/art/` were each made once from a prompt. The prompts and the shared style sit in a comment above `POINTS` in [`site/src/Landing.tsx`](../../site/src/Landing.tsx).
- **The comparison table**'s marks and their sources sit in [`site/src/compare.ts`](../../site/src/compare.ts). Check every mark against its source and update the *Checked* date: a wrong claim about another company's product is a liability.

## Keep its packages current

[`/update-dependencies`](../../.agents/skills/update-dependencies/SKILL.md) updates `site/` as its own stage, and Dependabot opens its weekly update requests for `/site`.

Part of [Maintaining WongStack](README.md).
