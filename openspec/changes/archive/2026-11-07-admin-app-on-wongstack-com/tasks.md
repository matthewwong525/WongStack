## 1. Config and guard

- [x] 1.1 In `app/wrangler.jsonc`, add top-level `"workers_dev": true` and `"routes": [{ "pattern": "admin.wongstack.com", "custom_domain": true }]` with the two comments in design § 1; add `"routes": []` to `env.staging` and `env.local`. Done when the file parses and holds exactly that one route at the top level and an empty list in each environment.
- [x] 1.2 Write `scripts/tests/admin-address.test.mjs` (design § 4): the real config passes; staging with no routes, staging with the name, an added environment with none, changed top-level routes, and `workers_dev` removed each fail with a reason that names the problem.

## 2. Wiki

- [x] 2.1 Write `wiki/maintaining/admin-address.md`: the app's two addresses, why the computer keeps `workers.dev`, why every environment declares `"routes": []`, and that the config is the record (never attach the name by hand). Link it from `wiki/maintaining/README.md`.

## 3. Checks

- [x] 3.1 Run `node --test scripts/tests/admin-address.test.mjs scripts/tests/untrusted-build.test.mjs scripts/tests/landing-site.test.mjs` and the wiki link check; all pass.
