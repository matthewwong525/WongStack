# Tasks

The source to port is the hosted app's repo, `wongstack-cloud`, at `origin/main` commit `8de0f01` (on this host: `/root/wongstack-cloud`; fetch first, the checkout is behind). Read files with `git -C <repo> show origin/main:<path>` and copy pictures with `git -C <repo> archive origin/main <paths>`. Nothing in that repo is edited.

## 1. Site scaffold

- [x] 1.1 Create `site/package.json` (private, `type: module`, the scripts and dependencies in design § 1, versions equal to `app/package.json`'s), `site/package-lock.json` by `npm install --package-lock-only`, `site/tsconfig*.json`, `site/vite.config.ts`, `site/vitest.config.ts` (jsdom), `site/.oxlintrc.json` copied from `app/`, and `site/.gitignore` for `dist/` and `.wrangler/`. Done when the files exist and `package.json` names no router, `zod`, or Cloudflare Vite plugin.
- [x] 1.2 Create `site/wrangler.site.jsonc` as design § 2: `wongstack-site`, assets only with the single-page fallback, `env.staging` as `wongstack-site-staging`, `workers_dev: true`, no `main`, no `routes`, no bindings. Done when the file holds exactly those keys and no file under `site/` is named `wrangler.jsonc`, `wrangler.json`, or `wrangler.toml`.
- [x] 1.3 Copy `app/public/` to `site/public/` except `logos/hetzner.svg`, and `brand/` to `site/brand/`. Port `app/index.html` to `site/index.html` with its share-card tags unchanged and a canonical link to `https://wongstack.com/`. Done when every picture `Landing.tsx` and `index.html` name exists under `site/public/`.

## 2. Pages and content

- [x] 2.1 Port `Compare.tsx`, `compare.ts`, `Rotator.tsx`, `CopyButton.tsx`, `mockups.tsx`, and `main.tsx` unchanged. Port `apps.tsx` with `Table` moved to `site/src/Table.tsx`, `dollars` as a local helper, and its opening comment reworded to name no private repo. Done when the files import nothing that is not under `site/src/`.
- [x] 2.2 Write `site/src/install.ts` as design § 4, with `INSTALL_PROMPT` copied character for character from the README's fenced message and the accounts and computers the README names today. Done when no other file under `site/src/` states an account, a system, or the message.
- [x] 2.3 Port `Landing.tsx` with the removals and the FAQ of design § 3, building the install section, the hero's actions (*Install for free*, *See it on GitHub →*), and the account sentences from `install.ts`. Done when the file imports nothing from a pricing, plan, or account module and the words in spec *The landing page offers no paid hosting* appear nowhere in it.
- [x] 2.4 Port `SiteHeader.tsx` (GitHub, Install) and `SiteFooter.tsx` (License, Privacy, support email), write `Privacy.tsx` as design § 5 with today's date as *Last updated*, and write `App.tsx` mapping `/privacy` to it and every other path to the landing page. Done when no file links `/terms`, `/pricing`, `/login`, or `/pay`.
- [x] 2.5 Port `index.css`, then delete the rules only removed parts used. Done when every class selector left in it is used by a file under `site/src/`, and it loads fonts only from `/fonts/`.
- [x] 2.6 Port the tests for what stayed (`Landing.test.tsx`, `CopyButton.test.tsx`, `apps.test.tsx` and its snapshot, `shareCard.test.ts`, the public-page parts of `App.test.tsx`), dropping every case about plans, pricing, sign-in, or the old legal pages. Add tests for: no hosting word on any page (spec scenario *Every page is read for hosting words*, allowing the sample apps' made-up prices); old addresses `/pricing`, `/login`, `/terms`, `/dashboard` render the landing page; the install section shows `INSTALL_PROMPT` and the refused-clipboard line; the privacy page's headings; every `img`, `link`, and `script` address in `index.html` and the rendered pages is relative or on `wongstack.com`. Done when each spec scenario for the page has a named test.

## 3. Checks and publishing

- [x] 3.1 Add `.github/workflows/site.yml` as design § 6: the scope step, `npm ci`, `npm test`, `npm run build`, the default-branch and other-branch deploys with `--config wrangler.site.jsonc`, the `landing-preview` commit status, and one summary line whether it ran or skipped. Pin actions to the SHAs the other workflows use and set a job timeout. Done when the workflow contains no `routes`, no custom domain, and no step that runs when the scope is empty except the summary.
- [x] 3.2 Add `scripts/tests/landing-site.test.mjs` with the two guards of design § 7, each with a case proving it refuses: a README without the message, and a second findable config. Done when the file has four tests and reads `INSTALL_PROMPT` from `site/src/install.ts`, not a copy.
- [x] 3.3 Add an npm entry for `/site` to `.github/dependabot.yml`, a `['site', 'site']` stage to `.agents/skills/update-dependencies/scripts/update.mjs`, and `site/` to the folder list in that skill's `SKILL.md` with an equal cut in the same file. Done when the three files name `site`.
- [x] 3.4 Add a `landing-page` area to `.agents/skills/memory/references/areas.json` (paths `site/` and `.github/workflows/site.yml`; docs the wiki page and `openspec/specs/landing-site/spec.md`), so the memory areas test finds the new spec once the first save creates it. Done when the entry exists and the file parses.
- [x] 3.5 Add the `## Next (patch)` entry to `CHANGELOG.md` with an Updating note saying no action is needed, because the areas file ships. Done when the entry sits above the newest numbered release.

## 4. Docs

- [x] 4.1 Write `wiki/maintaining/landing-page.md` as design § 9 and link it from `wiki/maintaining/README.md`'s Pages list. Done when the page opens with a title and one sentence saying what it is, links `site/src/install.ts`, `site/src/Privacy.tsx`, the workflow, and the guard test, points up to its hub, and names no private repo.

## 5. Verification

- [x] 5.1 Run `node scripts/measure-context.mjs --check`, `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/check-retired-names.mjs`, and confirm each passes after tasks 3.3 to 3.5.
- [ ] 5.2 Run `/save`. Confirm the Landing page, Payload checks, Test, and Deploy checks all pass on the change, and that the Landing page run created `wongstack-site-staging` and posted a `landing-preview` status. A refused Worker create is a blocker to report with the token's missing permission, not to work around.
- [ ] 5.3 Open the `landing-preview` address with `/verify` at phone width and at desktop width. Confirm: the landing page shows every section in the proposal's AFTER sketch and none from BEFORE only; the copy button copies the install message; `/privacy` shows the privacy page; `/pricing` and `/login` show the landing page; no page needs sideways scrolling; no hosting word appears.
- [ ] 5.4 Confirm the starter app is unaffected: the Deploy run's preview still opens the starter app, and `node scripts/lib-wrangler-config.mjs config-path` prints `app/wrangler.jsonc`.
- [ ] 5.5 Confirm `wongstack.com` still serves the old app (its page still shows *Pricing* and *Log in*), so nothing in this change moved the domain.
