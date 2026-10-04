# Design

## Context

See [the proposal](proposal.md) for why. What shapes the approach:

- The page today is a React and Vite single-page app in `wongstack-cloud` (`origin/main` at `8de0f01`): `app/src/Landing.tsx` and the parts it imports, 1,292 lines of `index.css`, about 520 KB of pictures in `app/public/`, and two files in `brand/`. Its Worker also serves accounts, billing, and servers; none of that moves.
- `wongstack.com` and `www.wongstack.com` are custom domains on that repo's production Worker. The zone is in the same Cloudflare account as this repo's Workers (read 2026-10-04 with the host token).
- This repo's starter app in `app/` is behind Access and is copied to every install. [`payload-files.json`](../../../.agents/skills/wong-sync/references/payload-files.json) is an explicit list, so a new top-level folder is meta-only by default.
- [`lib-wrangler-config.mjs`](../../../scripts/lib-wrangler-config.mjs) finds the deploy config by scanning each immediate subfolder for `wrangler.jsonc`, `wrangler.json`, or `wrangler.toml`, in whatever order the file system returns. A second file with one of those names would make the starter app's build and deploy pick one at random.
- [`app-untouched.sh`](../../../.github/scripts/app-untouched.sh) treats every path outside `wiki/`, `openspec/`, and `*.md` as the main app. It ships to every install.
- [`private-names.test.mjs`](../../../scripts/tests/private-names.test.mjs) fails any live file that names the hosted app's repo or the Claymoo app's repo. Only `CHANGELOG.md` and `openspec/changes/` may.
- [`preview-url.sh`](../../../.agents/skills/save/scripts/preview-url.sh) returns the first GitHub Deployment on a commit that carries an address.

## Goals / Non-Goals

**Goals:**

- A port, not a rewrite: the same components, styles, and pictures, minus hosting.
- No payload file changes, so no release.
- The starter app's build, deploy, and checks behave exactly as before.

**Non-Goals:**

- Attaching `wongstack.com` (see [the switch](#10-the-switch-is-the-next-change)).
- Teaching the shipped scope script about folders that are not the main app.
- Server code of any kind for the site.

## Decisions

### 1. A top-level `site/` folder with its own package

```text
site/
  package.json  package-lock.json
  wrangler.site.jsonc
  index.html  vite.config.ts  vitest.config.ts
  tsconfig*.json  .oxlintrc.json
  brand/       share-image.svg, wongstack-logo-silver.svg
  public/      art/ fonts/ logos/ paseo/ favicon.svg me.webp share.png
  src/         main.tsx App.tsx index.css install.ts
               Landing.tsx SiteHeader.tsx SiteFooter.tsx Privacy.tsx
               Compare.tsx compare.ts Rotator.tsx CopyButton.tsx
               apps.tsx mockups.tsx Table.tsx InstallButton.tsx  + tests
```

Dependencies match `app/package.json`'s versions for `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `vitest`, `jsdom`, `@testing-library/react`, `oxlint`, `typescript`, and `wrangler`. No router, no `zod`, no Cloudflare Vite plugin. `npm test` is `oxlint --deny-warnings && tsc -b && vitest run`; `npm run build` is `tsc -b && vite build`.

Alternatives: a page inside `app/` (every install would receive it, and Access would hide it); a hand-written static HTML page (throws away the three interactive sample apps and their tests); a separate repo (the decision was to move it here).

### 2. Plain files on Cloudflare, no server code

`site/wrangler.site.jsonc` declares the Worker `wongstack-site` with only an `assets` block: `directory: "./dist"`, `not_found_handling: "single-page-application"`, and no `main`. `env.staging` renames it `wongstack-site-staging`. `workers_dev: true`, `observability` off, and **no `routes`**. Requests for static assets do not count against the Workers request limit, so traffic costs nothing.

The single-page fallback is what makes an old address (`/pricing`, `/login`, `/dashboard`, `/terms`) show the landing page. `App.tsx` maps `/privacy` to the privacy page and every other path to the landing page.

`index.html` keeps its share-card tags and gains `<link rel="canonical" href="https://wongstack.com/">`, so a preview or the `workers.dev` address is never the indexed one, and `www` needs no redirect code once it is attached.

**The config is not named `wrangler.jsonc`**, so the starter app's lookup can never find it. Every wrangler call in the site's workflow passes `--config wrangler.site.jsonc`. A script test pins this ([decision 7](#7-two-guard-tests-in-scriptstests)).

Alternative: a small Worker that redirects `www` and marks previews `noindex`. Declined: it makes every request a billed Worker call for two things a tag already does.

### 3. What is ported, dropped, and reworded

| Source (`app/src/`) | In `site/src/` |
| --- | --- |
| `Landing.tsx` | Ported. Drops the *Or let us host it* section, `PlanCards`, `Trial`, `HostLink`, and the Hetzner row of `INFRASTRUCTURE`. `Actions` becomes the install button and a *See it on GitHub →* link. |
| `steps.tsx` | Becomes `install.ts` (data) and the install parts in `Landing.tsx`. Drops `SetupSteps`, `Trial`, `HostLink`, and the *Add a server* extra. `InstallButton` gets its own file, so `Landing.tsx` and `Compare.tsx` share it without importing each other; that import is `Compare.tsx`'s one changed line. |
| `SiteHeader.tsx` | Nav becomes a *GitHub* link and an *Install* link to `#install`. |
| `SiteFooter.tsx` | *License* (the MIT license on GitHub), *Privacy*, and the support email. No *Terms*. |
| `Compare.tsx`, `compare.ts`, `Rotator.tsx`, `CopyButton.tsx`, `mockups.tsx` | Ported as they are. |
| `apps.tsx` | Ported. `Table` moves to `Table.tsx`; `dollars` becomes a local helper. The comment naming the private app repo is reworded. |
| `Legal.tsx` | Replaced by `Privacy.tsx` ([decision 5](#5-a-short-privacy-page-no-terms)). |
| `Pricing.tsx`, `pricing.ts`, `github.ts`, `account/`, `hetzner*`, `sourceRepo.ts`, `worker/` | Not ported. `repoUrl` is inlined. |
| `index.css` | Ported, then the rules only removed parts used (plans, pricing, account cards, legal tables no page uses) are deleted. |
| `public/` | Ported except `logos/hetzner.svg`. |

FAQ after the port:

- *Is WongStack free?* Yes: free and open source, installed on your own computer with one message, with your own AI plan and the free accounts `install.ts` names.
- *Why is it free?* The first sentence only.
- *Do I need to know how to code?*, *What can I ask it to do?*, *How does my team use it?* Unchanged.
- *Is my business's data safe?* Your code, apps, and memory sit in your own accounts, and your AI login stays on your own computer. Nothing passes through us.
- *What does it cost, with AI?* The software is free. Each person uses their own Claude or ChatGPT plan; there is no markup and no per-seat fee.
- *Will Anthropic ban my Claude account?* It runs the official, unmodified Claude Code on your own computer; you sign in yourself.
- *What happens if I cancel?* Removed. Replaced by *What if I stop using it?*: everything is plain files in accounts you own, so it all stays yours.

The comparison table keeps its marks and its *Checked September 2026* line; no mark depended on hosting.

### 4. Install wording lives in `site/src/install.ts`

One module exports the message to paste (`INSTALL_PROMPT`), the three steps, the links to the agents, the accounts a person needs, the computers it works on, and the optional add-on (Paseo). `Landing.tsx` and the FAQ build their install sentences from it; no other file states an account or a system.

`INSTALL_PROMPT` is the README's message, character for character. Today that is the GitHub-and-Cloudflare install. The `electric-fox` workspace changes the README; the guard test then fails until `install.ts` matches, which is the intended hand-off.

Alternative: import the message from `README.md` at build time. Declined: the README is prose for GitHub, parsing it is brittle, and a README-only change would still not republish the site.

### 5. A short privacy page, no terms

`Privacy.tsx` says, under a *Last updated* date: who runs the site (Matthew Wong, doing business as WongStack) and the support email; that the site has no sign-in, sets no cookie, and uses no analytics, tracking, or ads; that Cloudflare serves the page and so handles the request, IP address included; that the software runs on the visitor's computer and in their own accounts, so code, files, chats, and AI logins never reach WongStack; that an email sent to the support address is kept to answer it; and how to ask about or delete that email.

The framing and the promises the code must keep move to the new wiki page ([decision 9](#9-one-wiki-page-owns-the-site)), with the note that no lawyer has reviewed it.

### 6. A meta-only workflow, `.github/workflows/site.yml`

Same triggers, fork rule, concurrency shape, pinned actions, and timeouts as [`payload.yml`](../../../.github/workflows/payload.yml). One job, `site`:

1. Checkout with full history, then [`change-scope`](../../../.github/actions/change-scope/action.yml) for `base`.
2. Scope: `git diff --name-only --no-renames <base> HEAD -- site .github/workflows/site.yml`. Empty means skip every later step and write one summary line. No base means run.
3. `npm ci`, `npm test`, `npm run build` in `site/`.
4. With `CLOUDFLARE_API_TOKEN` set: on the default branch, `wrangler deploy --config wrangler.site.jsonc`. On any other branch, the same two calls `cf-deploy.sh` makes, with `--config wrangler.site.jsonc --env staging`: `wrangler deploy`, then `wrangler versions upload --preview-alias <alias>`; the address is read from wrangler's output, never built by hand, as [`cf-deploy.sh`](../../../scripts/cf-deploy.sh) does.
5. Post the preview address as a commit status named `landing-preview` (`statuses: write`), and write it to the run summary.

A commit status, not a GitHub Deployment: `preview-url.sh` takes the first Deployment with an address, so a second one would make `/save`'s preview link a race between the starter app and the site. A status shows as a *Details* link beside the change's checks and is read with `gh api repos/<repo>/commits/<sha>/statuses`.

The workflow uses the repo's existing `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` secrets. The deploy token already covers Workers scripts on the account; the site needs no database or secret.

The branch logic is small enough to stay inline in the workflow. It is not added to `cf-deploy.sh`, which ships.

### 7. Two guard tests in `scripts/tests/`

`landing-site.test.mjs`, run by the payload checks on every non-docs change:

- **Install message.** Reads `INSTALL_PROMPT` from `site/src/install.ts` and asserts `README.md` contains it exactly; the failure names both files.
- **Deploy config.** Asserts exactly one immediate subfolder holds a file `lib-wrangler-config.mjs` looks for, and that it is `app/`; and that `payload-files.json` names nothing under `site/`.

They live here, not in `site/`, because a README-only or scripts-only change never runs the site's workflow.

### 8. The starter app's checks still run on a site-only change

`app-untouched.sh` is left alone. A change under `site/` therefore runs the starter app's suite and staging deploy too, exactly as a change under `server/` or `scripts/` does today. The site's own check obeys the rule that a check runs only when its kind of file changed. Narrowing the other direction is a payload release and is left out.

### 9. One wiki page owns the site

`wiki/maintaining/landing-page.md`, linked from [the maintaining hub](../../../wiki/maintaining/README.md): what the site is and that it never ships; where the install wording lives and the README guard; how it is checked, previewed (the `landing-preview` status), and published; the privacy promises and the rule that a change breaking one updates the page and its date; the rule that no hosting offer returns; where the brand files and picture prompts are; and that `wongstack.com` attaches only on the owner's word. It names no private repo.

### 10. The switch is the next change

Not built here. Recorded so the next step is ready:

1. Confirm with Matthew, naming the consequence: from that moment nobody can sign in at `wongstack.com`.
2. Add `routes` for `wongstack.com` and `www.wongstack.com` (`custom_domain: true`) to `site/wrangler.site.jsonc`'s production block, and remove them from the hosted app's config in the same sitting, or its next deploy takes them back.
3. Check first that the deploy token may attach a custom domain; if not, Matthew widens it through [a key link](../../../wiki/development/secrets.md#receive-a-key-through-a-private-link) or attaches the two names in Cloudflare by hand.
4. Check that the support address still receives mail.

### 11. Dependency upkeep

`.github/dependabot.yml` gains an npm entry for `/site`. [`update.mjs`](../../../.agents/skills/update-dependencies/scripts/update.mjs) gains a `['site', 'site']` stage, and the skill's one sentence listing the folders gains `site/` with an equal cut, since the skill text budget has one byte of headroom.

## UX

### Use-case brief

- **Who and the job:** a business owner who followed a link from a post or a friend, usually on a phone. They want to know what WongStack is and whether it is worth trying.
- **Done:** they have copied the install message, or opened the GitHub page, to act on at their computer.
- **Context of use:** phone first, one-handed, a minute or two of attention. The install itself happens later at a computer, so the page must be easy to come back to.
- **Common vs edge:** common is read, scroll, copy. Edge is a browser that refuses the clipboard (select by hand), and an old link to a page that no longer exists (shows the landing page).
- **Frequency (assumed):** most visitors come once or twice; nobody uses it daily.
- **Mirrors:** the current landing page, section for section.

### Flow

Headline → *Install for free* → the install section: three steps, the message, one copy button. Every section between offers the same button, so the install is always one tap away. No second screen.

### Hierarchy

- **Landing page:** the one filled button is *Install for free*. *See it on GitHub* is a quiet link. The header's *Install* is a text link, so the hero keeps the only filled button above the fold.
- **Privacy page:** text only, no action.

### Review

Sketches are on [the review page](review.html): the before-and-after of the landing page under *The page says what WongStack is…*, and the privacy page under *A short privacy page…*.

### Components

All existing, ported from the current page: `Rotator`, `Supports`, `PhoneTour`, `Chips`, `Bubbles`, `PaseoShot`, `YourApps` and its three sample apps, `Compare`, `Stack`, `CopyMessage`, the FAQ `details`. New: `Privacy` (a plain article) and `Table.tsx` (the existing table, moved to its own file). Nothing comes from the starter app's shared styles; the site keeps its own `index.css`.

## Risks / Trade-offs

- [The deploy token may not be able to create the two new Workers] → It already holds Workers Scripts on the account; the first branch push proves it. A refusal is reported as a blocker, with the key link as the fix.
- [A second wrangler config confuses the starter app's scripts] → It has a name they do not look for, and a test pins that.
- [The page promises an install route that has not shipped] → `install.ts` is written from the README as it is on publish day, and the guard test keeps them equal.
- [A wrong claim about another company's product] → The comparison is ported unchanged with its sources and its *Checked* date; nothing is added.
- [Preview and `workers.dev` addresses are public] → Intended: the page is public and holds no secret. The canonical tag keeps search engines on the real address.
- [A site-only change costs a starter app test and staging deploy] → Accepted; see decision 8.
- [The support address stops receiving mail when the old app is removed] → Outside this change; named in step 4 of the switch and in the proposal for the shutdown workspace.

## Migration Plan

1. Build and save; the first branch push creates `wongstack-site-staging` and a preview.
2. Publish; the push to the default branch creates `wongstack-site` at its `workers.dev` address.
3. Nothing else moves. Rollback is reverting the change; the two Workers can then be deleted with no effect on anything else.

## Open Questions

- Whether the `electric-fox` install route ships before or after this. Either order works: the guard test forces whichever lands second to update the other.
