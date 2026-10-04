# Tasks

## 1. Site config and its guard

- [x] 1.1 In `site/wrangler.site.jsonc`, add the top-level `routes` for `wongstack.com` and `www.wongstack.com` (`custom_domain: true`), keep `workers_dev: true`, add `"routes": []` to `env.staging`, and rewrite the two comments that say the site has no domain (design § 1, § 2). Done when the file parses and holds exactly those two routes at the top level and an empty list under staging.
- [x] 1.2 In `scripts/tests/landing-site.test.mjs`, add the third guard from design § 3: the real config passes; a copy whose staging block has no `routes` is refused, naming the environment. Update the file's opening comment. Done when the new tests are written beside the existing ones; they are run in the final phase.

## 2. Wiki

- [x] 2.1 In `wiki/maintaining/landing-page.md`, replace the section *wongstack.com moves only on the owner's word* with *wongstack.com is the site's address*, and update publish step 3 (design § 4), in [our voice](../../../wiki/voice.md). Done when no sentence on the page says the site has no domain, and `grep -rn 'moves-only-on-the-owners-word'` outside `openspec/changes/archive` finds nothing.

## 3. Verification

- [x] 3.1 Run `node --test scripts/tests/landing-site.test.mjs` and the wiki link check the Test job runs. Done when both pass.
