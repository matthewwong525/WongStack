# Tasks

## 1. Maintaining section

- [x] 1.1 `git mv` `wiki/development/adding-a-skill.md` and `wiki/development/repo-layout.md` to `wiki/maintaining/`; repoint their footers and any sibling links; verify every `../../` link still resolves.
- [x] 1.2 Write `wiki/maintaining/README.md` ("Maintaining WongStack") with the payload paragraph and release line from `wiki/development/README.md`, linking both pages and `.agents/rules/payload.md`; verify it links every child and up to `wiki/README.md`.
- [x] 1.3 Retitle `wiki/development/README.md`: open with "How this repo plans, builds, checks, and ships changes", drop the payload paragraph and the two moved entries; update its line in `wiki/README.md` to match and add a Maintaining WongStack entry.
- [x] 1.4 Repoint `.agents/rules/payload.md` (the `repo-layout.md#linking` link and the closing hub line), add `wiki/maintaining/**` to its `paths:`, and update the example path in `scripts/check-payload-links.mjs`'s comment; verify `grep -rn "development/adding-a-skill\|development/repo-layout" --exclude-dir=archive .agents wiki scripts AGENTS.md README.md .github` finds nothing.

## 2. Database recovery page

- [x] 2.1 Move the three `## Recovery: …` sections from `wiki/stack/d1-pipeline.md` into a new `wiki/stack/d1-recovery.md` ("Fix a broken production database"), headings without the prefix, with up and sideways links; verify the moved text is otherwise unchanged.
- [x] 2.2 Repoint `d1-pipeline.md`'s line 7 and Time Travel links, add it to the page's `## Next`, and list the new page in `wiki/stack/README.md`; retire the three old anchors in `scripts/retired-names.json`.

## 3. One owner per procedure

- [x] 3.1 Add the patch, minor, and major meanings to step 1 of `.agents/rules/payload.md`; cut the restated release steps in `wiki/contributing.md`, `.github/CONTRIBUTING.md`, and `wiki/maintaining/adding-a-skill.md` step 3 to one line and a link.
- [x] 3.2 Make `.github/CONTRIBUTING.md` the fork-to-pull-request owner: trim `wiki/contributing.md`'s route to its install-only cautions plus a link to the GitHub page's steps.
- [x] 3.3 Cut `repo-layout.md`'s layout restatement to a sentence linking the manifest's "The agent folder", and `wiki/development/required-tools.md`'s symlink section to the Windows setting and the Codex check.

## 4. Opening sentences

- [x] 4.1 Rewrite the first sentences of `wiki/README.md`, `wiki/stack/cloudflare-credentials.md`, and `wiki/stack/cloudflare-access.md` to say what the page is.
- [x] 4.2 Turn `wiki/wiki-style.md`'s "Adding a page — the checklist" into `## Adding a page` with three numbered steps; verify `node scripts/measure-context.mjs --check` passes.

## 5. Release and checks

- [x] 5.1 Add a `## Next (patch) — The wiki keeps WongStack upkeep apart, and database fixes on their own page` entry to `CHANGELOG.md`, with an **Updating.** note in plain words: a page of yours that links the deploy page's recovery sections should link the new database fixes page.
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-retired-names.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`; fix each failure.
- [x] 5.3 Run `/save` and confirm the `payload` and `test` checks pass in CI.
