## 1. wong-setup — the ground a fresh repo is missing

- [x] 1.1 Derive the git identity from `gh api user` before the first commit — name from `name`, email from `email` or the `<id>+<login>@users.noreply.github.com` fallback when it's null — set both, state what was set, ask nothing
- [x] 1.2 Add the ask-for-it fallback for when `gh` is unauthenticated or the call fails, so setup never commits without an identity
- [x] 1.3 Move the initial commit so it lands after Step 6/7 have written files, and state in Step 5 that an empty folder has nothing to commit yet — no placeholder file, no commit-less repo
- [x] 1.4 Write the `.gitignore` secrets entries unconditionally in Step 6, before anything can act on `secrets.md`; create the file where absent, append where present, add nothing where both families are already covered
- [x] 1.5 Split the `.gitignore` entries out of the Step 6 secrets *offer* so declining the convention no longer declines the protection — the `.env.example` seed and the docs page stay an offer
- [x] 1.6 Seed `wiki/development/README.md` alongside `wiki/README.md` in the wiki-hub step, with real short sections rather than an empty stub
- [x] 1.7 Correct Step 5's no-Node verb list: `/save`'s change-authoring shells out to the CLI, so it belongs with `/plan`, `/apply`, `/ship` as unavailable — not with the verbs that survive
- [x] 1.8 Add a line after `openspec init` in Step 5 correcting its `/opsx:propose` closing suggestion — this repo drives OpenSpec through `/plan`, and the `/opsx:*` commands aren't installed

## 2. The default branch

- [x] 2.1 Replace the `git symbolic-ref refs/remotes/origin/HEAD` instruction in `save/SKILL.md` and `save/references/git-gate.md` with assuming `main`, detecting only where `main` doesn't exist
- [x] 2.2 Make the same replacement in `ship/SKILL.md`
- [x] 2.3 Sweep the payload for any other copy of the same instruction and bring it in line

## 3. The stack-pack fragments

- [x] 3.1 State `migrations_dir` per layout in the `wrangler.jsonc` fragment — `../schema/migrations` in the `app/` layout, `schema/migrations` at the root — mirroring how the fragment already handles `main`
- [x] 3.2 Add `migrations_dir` as a rule in the fragment's "rules the scripts depend on" list, noting that the pack ships `schema/` at the repo root and the config sits beside the Worker
- [x] 3.3 Make `cf-build.sh`'s no-config message name `/wong-cloudflare` as the fix, leaving the exit status unchanged

## 4. The payload single source

- [x] 4.1 Add the machine-readable payload file list as JSON beside `payload-manifest.md`, carrying paths and category tags (core / pack / scaffold / ui-only); link it from the prose, which keeps the reasoning, gating rules, and exclusions
- [x] 4.2 Rewrite `check-payload-links.mjs` to read that list instead of its `SKILLS` / `DOCS` / `PACK_FILES` constants
- [x] 4.3 Narrow `TARGET_PROVIDED` to paths setup demonstrably writes — after 1.4 and 1.6 land, so the repo isn't red between tasks — and fix, rather than re-exempt, whatever dead links surface
- [x] 4.4 Decide the root `README.md` question from design.md's open questions: seed, offer, or exempt — and make the exemption list match the answer

## 5. Docs

- [x] 5.1 Correct `wiki/development/secrets.md`'s claim so it describes what is now true, and confirm its `../../.gitignore` link resolves in a fresh install
- [x] 5.2 Reality-check the `wiki/stack/` pages touched by 3.x against the corrected fragment values

## 6. Release

- [x] 6.1 Run `node scripts/check-payload-links.mjs` and confirm it exits zero with the seeded hubs in place and the narrowed exemptions
- [x] 6.2 Bump `VERSION` (minor) and add the newest-first `CHANGELOG.md` entry describing the first-install fixes
