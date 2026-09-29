# Reshape the wiki: its own section for WongStack upkeep, and a page for database fixes

**Status:** ready-to-ship
**Branch:** soft-skunk
**Open questions:** none

## Why

The wiki's "Development" section mixes two readers: pages every install relies on sit beside two guides only this repo ever uses, and its description says it is about cutting releases. The deploy page runs to about 400 lines, with the guides for fixing a broken live database buried at the bottom. A few how-tos are written out in two or three places, so one copy goes stale, and a few pages open without saying what they are.

## What Changes

- **WongStack's own upkeep gets its own section.** The guide to adding a skill and the guide to the folder layout move out of "Development" into a new "Maintaining WongStack" section, with the release notes that were in Development's opening. Development keeps what every install uses, and its description says so: how work gets planned, built, checked, and published.
  ```text
   BEFORE                  AFTER
   Development             Development
   ├ the change loop       ├ the change loop
   ├ memory, browsing      ├ memory, browsing
   ├ secrets, tools        └ secrets, tools
   ├ adding a skill ─┐
   └ repo layout ────┤     Maintaining WongStack
                     └───▶ ├ adding a skill
                           └ repo layout
  ```
- **The database fix-it guides get their own page.** The three guides for when the live database breaks (undo a bad update, never change it by hand, repair its record of updates) move off the deploy page onto one page, listed in the stack section and linked from the deploy page.
- **Each how-to lives in one place.** Sending an improvement to WongStack, cutting a release, and the folder links each get one home, and the other pages link to it. The release rule also gains what *patch*, *minor*, and *major* mean, which only the contributing page said.
- **Pages open by saying what they are.** The wiki's front page, the Cloudflare token page, and the login-wall page start with what the page covers. The wiki rulebook's "Adding a page" section becomes a real short checklist, with no more words than today.

**Non-goals:** splitting the login-wall page; renaming the Development folder, which every install links; the wording fixes planned in "Docs that disagree".

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. The `stack-pack` requirement that `wiki/stack/` hold the recovery runbooks stays true: they move within that section. `.openspec.yaml` sets `skip_specs: true`.

## Impact

- **Wiki (source only):** new `wiki/maintaining/{README,adding-a-skill,repo-layout}.md` (the last two moved from `wiki/development/`); `wiki/README.md`; `wiki/development/README.md`.
- **Wiki (payload):** new `wiki/stack/d1-recovery.md`; `wiki/stack/{d1-pipeline,README,cloudflare-credentials,cloudflare-access}.md`; `wiki/contributing.md`; `wiki/wiki-style.md`; `wiki/development/required-tools.md` if its layout sentence restates more than the Windows setting.
- **Rules and checks:** `.agents/rules/payload.md` (level meanings, `paths:`, the repo-layout link, the closing hub link); `scripts/retired-names.json`; the example path in `scripts/check-payload-links.mjs`'s comment.
- **GitHub:** `.github/CONTRIBUTING.md`.
- **Release:** a `## Next (patch)` entry in `CHANGELOG.md`.
- **Unchanged, checked:** `payload-files.json` (neither moved page is listed; `wiki/stack` ships as a folder, so the new page ships with it); `server/install-wongstack.mjs`, whose seeded Development hub already reads "How this repo plans, builds, checks, and ships changes"; `.agents/skills/memory/scripts/memory.mjs`, which no longer has a `HOME_PAGE` path.
- **Overlap:** "Docs that disagree" edits pages in `wiki/development/` and `wiki/stack/`; whichever publishes second catches up.

## Decision log

- **2026-09-29** — Asked (earlier /explore audit) whether to fix the wiki's mixed Development section, the long deploy page, the duplicated how-tos, and the weak opening sentences → chose fix them, as this part of a four-part request.
- **2026-09-29** — Assumed: the browser rules part is already done, because 27.0.0 moved them to `wiki/development/browsing.md`; and no `HOME_PAGE` update is needed, because `memory.mjs` no longer has that constant.
- **2026-09-29** — Assumed: the new section is `wiki/maintaining/`, titled "Maintaining WongStack", with a hub and the two moved pages, because the wiki's folder rule allows a folder once a step has several pages, and the name says who it is for.
- **2026-09-29** — Assumed: `wiki/development/` keeps its folder name and only its source hub is retitled, because every install's pages and skills link that path; installs already get the right hub title from setup.
- **2026-09-29** — Assumed: only the recovery guides move off `d1-pipeline.md`, into `wiki/stack/d1-recovery.md`, with headings that drop the "Recovery:" prefix and the old anchors retired, because the request named those guides; the Cloudflare Access page stays whole and only its first sentence changes.
- **2026-09-29** — Assumed: `.github/CONTRIBUTING.md` owns the fork-to-pull-request steps and `wiki/contributing.md` keeps the bar, the scope, and the install-only cautions, linking the steps by URL, because the GitHub page is where outside contributors land and already carries the checks.
- **2026-09-29** — Assumed: the payload rule owns the release steps and the patch, minor, and major meanings; the other pages keep one line and a link, because the rule already says every other page links to it.
- **2026-09-29** — Assumed: the payload manifest's "The agent folder" owns the folder-link layout; `repo-layout.md` keeps only editing, linking, and auditing through the links, and `required-tools.md` only the Windows setting, because the manifest is what setup and sync follow.
- **2026-09-29** — Assumed: the "Adding a page" checklist adds no words, because the start-up load stood at 2,199 of 2,200 words on 2026-09-29 and `wiki-style.md` counts toward it.
- **2026-09-29** — Assumed: one patch release, because the payload edits move and trim wording and change no behavior.
- **2026-09-29** — Assumed: `AGENTS.md`'s meta-repo line and the README's "Working on WongStack" link now point at `wiki/maintaining/`, because both describe changing the toolkit itself and sit outside the `WONG-STACK` block.
- **2026-09-29** — Assumed: `development/adding-a-skill.md` and `development/repo-layout.md` are retired names too, because the payload rule retires a moved page's old path.
- **2026-09-29** — Assumed: the footers of four shipped Development pages now say "development", not "working on WongStack", because the hub they link is titled Development in every install.
- **2026-09-29** — Assumed: checkpoint inside /ship for task 5.3; all other tasks built and the four release checks pass locally.
- **2026-09-29** — Assumed: archived and numbered 27.1.1 after merging 27.1.0 from main, because /ship numbers the release from main at its checkpoint.
