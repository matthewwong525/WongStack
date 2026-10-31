# Tasks

## 1. Site build and pages

- [x] 1.1 Add `marked` as a site dev dependency and write `site/scripts/build-guides.mjs`: read `site/guides/*.md` and its front matter, insert `_agent.md`, write `dist/guides/<id>/index.html` (static, no script, shared header/footer template, built CSS linked), `dist/guides/<id>.md` (absolute picture addresses), `dist/guides/index.html`, `dist/guides.md`, and `dist/llms.txt`; chain it into `site/package.json`'s `build`
- [x] 1.2 Add the *Guides* link to `site/src/SiteHeader.tsx`, and guide styles (list cards, step figures, code blocks, phone width) to `site/src/index.css`
- [x] 1.3 Write `site/guides/_agent.md` and `site/guides/keep-keys-safe.md`
- [x] 1.3a Add `site/public/guides/copy.js`, loaded by each guide page, which adds a Copy button to each code box (select-to-copy when the browser refuses), with its style and a test
- [x] 1.4 Write tests: every guide has each required part, every picture exists with alt text and no outside address, built HTML has no script and serves at `/guides/<id>`, `llms.txt` and `guides.md` list every guide, the static header links match `SiteHeader`, and `Site.test.tsx` reads the guide pages for hosting words, prices, and outside files

## 2. Guide content

- [x] 2.1 Read each tool's own help pages and confirm the current path for: Shopify (Dev Dashboard or admin app), Shopify theme (Theme Access + CLI), Klaviyo, Meta (system user token), Google (service account with delegation; OAuth desktop client), Canva (Connect integration), Slack (manifest app), Notion (internal integration); note each source address
- [x] 2.2 Write the 8 guides in `site/guides/`, each with front matter, needs, steps, least permissions, *Save it*, *Check it works*, *If it leaks*, last-checked date, and source links; include the Slack manifest, the Google sign-in script, and the Canva sign-in step
- [x] 2.3 Take each step's picture with Matthew's saved logins through `browse.mjs`, stopping before any button that creates or reveals a key; draw the key screens as SVG with no value; crop, mark the button, blur private data, save as WebP under `site/public/guides/<id>/`, each under 150 KB (done for every screen the saved logins reached; the rest wait on the shot list, 2.5)
- [x] 2.5 List each picture the saved logins could not reach in `site/guides/shot-list.json` (page, what to show, where to stop); the build leaves those pictures out, and a test keeps the list to pictures still missing
- [x] 2.4 Moved after publish: Matthew runs each guide's check with a real key as he sends the shot-list screenshots (Decision log)

## 3. Wiki

- [x] 3.1 Write `wiki/maintaining/service-guides.md`: what a guide holds, how to add one, the picture stop point and redaction, how to recheck a guide; link it from `wiki/maintaining/README.md`
- [x] 3.2 Update `wiki/maintaining/landing-page.md`: the site has more than two pages, and the guides follow every site rule

## 4. Verification

- [x] 4.1 Run the site's lint, type check, tests, and build; open `dist/guides/shopify/index.html` and its `.md` with a plain fetch and confirm the full text
- [x] 4.2 Opened `/guides`, a guide, and the safety page at phone width on a local build; Matthew viewed every guide on a temporary link and chose to publish; the CI preview gets its own look in `/ship`
