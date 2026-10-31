# Tasks

Each picture task: find the sent screenshot, crop, blur private text, mark the button, save it as WebP at its address (at most 1200 px wide, under 150 KB), look at the result, and delete its entry in `site/guides/shot-list.json`, by the design and `wiki/maintaining/service-guides.md`. If the screen's labels differ from the step, change the step's words, alt text, and `lastChecked`.

## 1. Shopify

- [ ] 1.1 `site/public/guides/shopify/01.webp`: Settings, Apps, Develop apps, with *Build apps in Dev Dashboard* marked
- [ ] 1.2 `site/public/guides/shopify/02.webp`: the Create app form with the name typed, *Create* marked
- [ ] 1.3 `site/public/guides/shopify/03.webp`: the new version form with the three scopes, *Release* marked
- [ ] 1.4 `site/public/guides/shopify/04.webp`: the app's Home page, *Install app* marked

## 2. Shopify theme

- [ ] 2.1 `site/public/guides/shopify-theme/02.webp`: the Theme Access *Create password* form, name and email blurred, *Create password* marked

## 3. Klaviyo

- [ ] 3.1 `site/public/guides/klaviyo/01.webp`: the API keys page, existing key names blurred, *Create Private API Key* marked
- [ ] 3.2 `site/public/guides/klaviyo/02.webp`: the Create private API key form with *Read-only key* chosen, *Create* marked

## 4. Meta ads

- [ ] 4.1 `site/public/guides/meta-ads/02.webp`: Use cases with *Create & manage ads with Marketing API* chosen, *Next* marked
- [ ] 4.2 `site/public/guides/meta-ads/03.webp`: the Business step, portfolio name blurred, *Next* marked
- [ ] 4.3 `site/public/guides/meta-ads/04.webp`: System users, *Add* marked
- [ ] 4.4 `site/public/guides/meta-ads/05.webp`: Assign assets with an ad account and *View performance*, account name and ID blurred, *Assign* marked
- [ ] 4.5 `site/public/guides/meta-ads/06.webp`: Generate token with `ads_read` and `business_management` ticked, *Generate token* marked
- [ ] 4.6 `site/public/guides/meta-ads/08.webp`: an ad account open, the number under its name marked and blurred

## 5. Canva

- [ ] 5.1 `site/public/guides/canva/01.webp`: the developer portal, *Create an integration* marked
- [ ] 5.2 `site/public/guides/canva/02.webp`: the Scopes page with Read on `design:meta`, `asset`, `brandtemplate:meta`
- [ ] 5.3 `site/public/guides/canva/03.webp`: the Authentication page with the redirect address typed

## 6. Verification

- [ ] 6.1 Before each publish, move every group still open to a new change `guide-screenshots-<n>` with this proposal and design, so this change holds only finished groups
- [ ] 6.2 Run the site's tests and build; confirm `guides.test.tsx` passes the size and shot-list checks for the new pictures
- [ ] 6.3 After `/save`, open each finished guide on the preview at phone width; see each new picture in its step, with no readable name, email, store, or ID; the person looks and chooses to publish
