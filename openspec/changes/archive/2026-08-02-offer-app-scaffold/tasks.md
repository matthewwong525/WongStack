## 1. Payload manifest — the gated category

- [x] 1.1 Add an **app scaffold** section to `.claude/skills/wong-sync/references/payload-manifest.md`, parallel to "The opt-in stack pack", gated on `components.appScaffold: true` *and* `components.stackPack: true`
- [x] 1.2 List the scaffold's files (all of upstream `app/` — `package.json`, `package-lock.json`, `index.html`, `.gitignore`, `.oxlintrc.json`, the four tsconfigs, `vite.config.ts`, `worker-configuration.d.ts`, `README.md`, `worker/index.ts`, `src/`, `public/`)
- [x] 1.3 State the exclusion explicitly: **`app/wrangler.jsonc` is never copied**, with the live-`database_id` reason and the pointer to the `wrangler.jsonc` fragment as the file's actual source
- [x] 1.4 State the invariant that no copied payload file may contain a `database_id` or a database name, and note where the `db:migrate:*` scripts live instead
- [x] 1.5 Update the "Not in the manifest" section — `app/` is no longer flatly excluded as app source; it is gated payload

## 2. Config fragments

- [x] 2.1 In `.claude/skills/wong-sync/references/stack-pack-fragments.md`, extend the `wrangler.jsonc` fragment with `main`, `assets` (SPA not-found handling), `compatibility_date`, and `compatibility_flags`, keeping the existing five rules and the `env.staging` twin structure intact
- [x] 2.2 Add a rule explaining that the fragment is the only thing that creates a wrangler config, so it must describe a deployable Worker rather than bindings alone
- [x] 2.3 Add `db:migrate:staging` and `db:migrate:prod` to the `package.json` fragment, with the database name shown as filled by `/wong-cloudflare`, and note the subdirectory-layout path variant alongside the existing `../scripts/` ones

## 3. The app scaffold itself

- [x] 3.1 Remove `db:migrate:staging` and `db:migrate:prod` from `app/package.json` (they now arrive via the fragment); leave every other script unchanged
- [x] 3.2 Verify no remaining file under `app/` — excluding `wrangler.jsonc` and `package-lock.json` — contains the string `wongstack`, any `database_id`, or any other value specific to this repo
- [x] 3.3 Confirm `app/wrangler.jsonc` still works for this repo after 3.1, since WongStack builds and deploys from it

## 4. /wong-setup — detection and the offer

- [x] 4.1 Extend Step 2's research to determine whether the repo has an app of its own — a `package.json` with a build script, an application entry point, or a wrangler config; record the verdict for Step 6
- [x] 4.2 Rewrite Step 6's stack-pack offer so that, when the repo has no app, the same single outcome-shaped prompt also covers the starter site — no second question, no product or component vocabulary
- [x] 4.3 Keep the offer unchanged for a repo that already has an app: the scaffold is not mentioned
- [x] 4.4 Update Step 7's seed-manifest instructions to write `components.appScaffold` alongside `components.stackPack`, set together and only together

## 5. /wong-cloudflare — provisioning a scaffolded repo

- [x] 5.1 Extend the skill's own pack offer (the late-adoption path) to include the scaffold on the same detection rule, setting both flags on a yes
- [x] 5.2 State that the created wrangler config supplies the Worker entry point as well as the ids, so a scaffolded repo needs no hand-written application code
- [x] 5.3 Have the skill fill the `db:migrate:*` script names from the databases it derives, as part of applying the `package.json` fragment

## 6. Docs

- [x] 6.1 Update `wiki/stack/getting-started.md` — a repo can arrive with no app and be given one; say what lands and what `/wong-cloudflare` fills in
- [x] 6.2 Update `wiki/stack/d1-pipeline.md` where it assumes the repo brought its own Worker
- [x] 6.3 Check every page under `wiki/stack/` for prose that assumes an existing app, and fix what contradicts the new path

## 7. Verify end to end

- [x] 7.1 Re-run the fresh-repo install against a repo with no app: confirm `app/` lands, no `database_id` or `wongstack` string appears anywhere in the target, and no `wrangler.jsonc` is present before provisioning
- [x] 7.2 Run the install against a repo that already has an app: confirm the scaffold is neither offered nor copied, and the pack installs exactly as it does today
- [x] 7.3 Confirm a manifest with `appScaffold` absent produces byte-identical behavior to the current release

## 8. Release

- [x] 8.1 Bump `VERSION` from 9.0.0 to 9.1.0
- [x] 8.2 Add the newest-first `CHANGELOG.md` entry describing the offer change and the fragment fix
