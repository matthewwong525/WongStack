# Company knowledge in its own repo

**Status:** ready-to-ship
**Branch:** pale-parrot
**Open questions:** none

## Why

Today every wiki edit is a pull request with checks and a preview. In ClaymooApp, 170 of 504 changes since 2026-10-04 changed only pages. So the team writes down less than it learns, and what it writes waits for checks. Company knowledge (people, business, customers, how we work, why) changes with the business, not with the code. It needs a place where a save goes live at once and the whole team can write.

This is part 1 of 3. Part 2 ("Live reader for company knowledge") lets the app show these pages live. Part 3 ("Move old installs' knowledge") moves WongOS, ClaymooApp and other installs after one yes.

## What Changes

- **Company knowledge gets its own repo in your Cloudflare account.** Each workspace shows it in a `knowledge/` folder beside `wiki/`. The `wiki/` folder keeps only the pages WongStack ships. Everything code can't say goes in `knowledge/`: people, business, customers, how we work, why. Pages that only say what code does are not needed, because the code says it.
  ```text
  your-project/
  ├─ wiki/        pages WongStack ships
  ├─ knowledge/   your company's own pages
  │  ├─ README.md
  │  ├─ people/
  │  └─ business.md
  └─ app/ …       the code
  ```
- **Anyone who can read the code can write knowledge, and a save goes live at once.** The app's Access page gives no new tick: *Project code* now also means *read and write company knowledge*. A save needs no pull request and no checks. A quick link check runs on the computer first. If two people change the same lines, the assistant reads both versions and writes the page again, and nothing is lost.
  ```mermaid
  flowchart TB
    edit[edit a page] --> check{links OK?}
    check -->|yes| live[live for all]
    check -->|no| fix[fix the link] --> check
    live -.->|same lines| merge[merge both] --> check
  ```
- **Every chat reads the newest knowledge.** Each computer keeps one copy that all its workspaces share. The copy updates when a chat starts, in the background, so the chat does not wait. If the sign-in has run out, the chat reads the last copy and shows the sign-in link.
  ```mermaid
  flowchart TB
    start[chat starts] --> update[copy updates in background]
    update -->|sign-in ran out| last[read last copy, show sign-in]
  ```
- **The assistant saves what it learns at once and tells you how to undo it.** This applies to a plain request ("remember this"), `/close` and `/dream-memory` alike. It does not ask *publish it?* first. Each save names its pages and gives a one-step undo.
  ```text
  Saved to company knowledge: people/ana.md
  (Ana wants pull requests under 300 lines.)
  To undo it, say "undo that save".
  ```
- **Memory search and your page at chat start read the new place.** Search finds knowledge pages as well as `wiki/`. As now, people pages are left out of search. Your own people page still opens each chat.
- **Every new install now needs Cloudflare's paid plan, about $5 a month.** The repo is kept in Cloudflare, and Cloudflare keeps repos only on its paid plan. The way with GitHub is no longer free, and the landing page and getting-started guide say so. Setup checks the plan for both ways and stops before it creates anything on a free account.
  | | Today | After |
  |---|---|---|
  | GitHub and Cloudflare | free | Cloudflare's paid plan, about $5 a month |
  | Cloudflare alone | Cloudflare's paid plan, about $5 a month | the same |
- **WongStack's own people pages move first.** `wiki/people/` (2 pages) moves to WongStack's own knowledge repo. WongStack uses the new place before any install does.
- **Installs that exist today keep working as now.** An install with no knowledge copy keeps writing `wiki/` through pull requests until it takes part 3's update.

Non-goals: the app's live reader (part 2); moving existing installs (part 3); cutting pages that only explain code, which the weekly tidy in Background cleanup jobs does later; a database in place of git; any access for staff who can't read the code.

## Capabilities

### New Capabilities
- `company-knowledge`: the knowledge repo, its access through the app, the copy on each computer, saving at once with a link check, conflicts, undo, and what goes there.

### Modified Capabilities
- `knowledge-center`: the agent saves repeatable knowledge to `knowledge/` at once; people pages live in `knowledge/people/`; `/close`'s catch-up saves without a pull request; the code repo's link check skips links into `knowledge/`.
- `workspace-cleanup`: `/close` saves knowledge facts at once instead of in a pull request.
- `wiki-dream`: a dream saves knowledge edits at once; shipped-page rules stay.
- `document-retrieval`: the index also reads the computer's knowledge copy.
- `memory`: the digest finds the person's page in `knowledge/people/`, then `wiki/people/`.
- `company-git`: a push to the knowledge repo follows its own rules; the code repo's rules stay.
- `cloudflare-provisioning`: setup and the Access step create the knowledge repo and connect the live app to it on both routes.
- `artifacts-install`: the paid-plan check applies to every new install; GitHub stays a choice, not a free way.
- `landing-site`: the cost section no longer names a free way.

## Impact

- Worker: `app/worker/employee-access/` (a knowledge git route beside `code.ts`, its push judge, router), `app/worker/keys.ts` (the `code` key's description), `app/wrangler.jsonc` (`WONG_KNOWLEDGE_REPOSITORY`, the `ARTIFACTS` binding on the GitHub route), tests beside each.
- Setup: `.agents/skills/wong-setup/scripts/provision.mjs` (the knowledge repository on both routes, the plan check and the repository permission on the GitHub route), its references and tests.
- A new script, `.agents/skills/memory/scripts/knowledge.mjs` (status, link, update, save, undo), with tests; `session-start.mjs` (the background update); `paseo.json`'s worktree setup (the `knowledge` link); `.gitignore`.
- Memory: `lib/documents/corpus.mjs` (second root), `lib/digest.mjs` (people page), their tests.
- Link check: `.agents/skills/memory/scripts/lib/links.mjs` (a pages root, links into `knowledge/` skipped in CI).
- Skills: `close`, `dream-memory`, the plain-request rule in `AGENTS.md`'s `WONG-STACK` block (four memory surfaces), `wiki/wiki-style.md`, `wiki/development/{memory,wiki-dream,document-retrieval,the-change-loop}.md`, `wiki/agent-knowledge-center.md`, `wiki/stack/{project-git-route,access-screens,artifacts-route,getting-started}.md`, a new `wiki/stack/company-knowledge.md`.
- Site: `site/` install cost text and the *Install for free* button.
- Meta-repo: `wiki/people/` moves out; `wiki/README.md` loses its People link.
- `CHANGELOG.md` (a `minor` entry), `payload-files.json` and the payload manifest (the new script and page), `scripts/retired-names.json` if a name retires.

## Decision log

- **2026-11-03** — Asked where company knowledge is kept → chose always in Cloudflare, for every install, knowing GitHub installs then need Cloudflare's paid plan.
- **2026-11-03** — Asked which pages move → chose: the knowledge repo holds what code can't say; pages WongStack ships stay; pages that only explain code are not needed, because the code says it.
- **2026-11-03** — Asked when pages that only explain code are cut → chose later, page by page, by the weekly tidy in Background cleanup jobs, not during the move.
- **2026-11-03** — Asked how the app shows knowledge pages → chose a live reader that WongStack ships (part 2).
- **2026-11-03** — Asked what happens to existing installs → chose that the update moves them after one yes (part 3).
- **2026-11-03** — Asked how to plan the work → chose three plans in order, each in its own workspace; this is part 1.
- **2026-11-03** — Assumed: a git repo, not pages in the memory store, because agents keep reading plain files and links, text search and undo by history keep working (Matthew's suggested shape).
- **2026-11-03** — Assumed: *Project code* gives read and write on knowledge, with no new tick, because Matthew said can read the code means can write knowledge.
- **2026-11-03** — Assumed: staff without Project code get no access to knowledge, because nobody asked for more and the app's live reader (part 2) decides what others see.
- **2026-11-03** — Assumed: the folder is `knowledge/`, a link in each workspace to one copy in the primary checkout, because links and reading then work as for `wiki/`, and every workspace sees the same copy.
- **2026-11-03** — Assumed: every computer, the owner's included, reaches the knowledge repo through the app's address with the company sign-in, because one way is easier to test and the app checks access on each call.
- **2026-11-03** — Assumed: a knowledge save asks no *publish it?*, because a save that waits for a question defeats Matthew's aim of frequent updates, and each save gives a one-step undo.
- **2026-11-03** — Assumed: a save takes only Markdown pages and pictures, and the app does not inspect what a push holds, because scripts there would run outside the code's checks, and the app streams a push without reading it.
- **2026-11-03** — Assumed: the app can't block a push that rewrites history, so every computer's copy keeps the full history and can put it back, because the app streams a push without reading it. The build first checks whether Cloudflare can refuse such a push by itself.
- **2026-11-03** — Assumed: the link check runs on the computer before each push, and the code repo's CI skips links into `knowledge/`, because CI can't see that copy.
- **2026-11-03** — Assumed: an install with no knowledge copy keeps today's `wiki/` and pull requests, because part 3 creates the repo for existing installs and they must keep working until then.
- **2026-11-03** — Assumed: people pages stay out of memory search, as today, because nobody asked to change that privacy rule.
- **2026-11-03** — Assumed: a `minor` release, because no existing install breaks; part 3's move is the `major` one.
- **2026-11-03** — Asked whether the build may make the throwaway test repository, WongStack's knowledge repository with the live app's connection, and copy the two people pages into it → chose yes, all three.
- **2026-11-03** — Checked (task 1.1): an Artifacts repository can't refuse a non-fast-forward push by itself. The API docs name no such setting (create takes only `name`, `description`, `default_branch`, `read_only`; there is no update route), and a throwaway repository in the `wongstack` namespace took a `git push --force` that dropped a commit. The repository was deleted after. So setup adds no setting, and `knowledge.mjs update` and `restore` are the only guard.
- **2026-11-04** — Found while building: the live sign-in wall did not let Git reach `/api/access/knowledge/git/*`. Setup's live app now opens that path to the Worker as it does the code path, which checks the sign-in itself, and the publish check takes the older pair of open paths or the new three, so an install from before this keeps passing until its next `access` run.
- **2026-11-04** — Assumed: the search index needs no key on the copy's HEAD (task 5.2), because it is keyed on each page's content hash, so a changed page in the copy is seen anyway.
- **2026-11-04** — Assumed: a save's link check counts only problems in the pages it publishes or in pages already published and unchanged here, so another chat's unsaved page never stops a save.
- **2026-11-04** — Assumed: the knowledge repo's ignore file holds `*.mine.*`, not only `*.mine.md` (task 4.3), because a picture can clash too and its other side is kept the same way.
- **2026-11-04** — Assumed: on a computer with no saved person (the owner's), the Git sign-in helper gives company knowledge the computer's own company sign-in, because the app checks Project code on every call; the code path keeps its check of the saved person.
- **2026-11-04** — Assumed: a copy behind the published version with unsaved edits is left as it is, as the spec says, but a copy only ahead is still published, because a push changes no file in the copy.
- **2026-11-04** — Assumed: for WongStack's own repo (tasks 9.1 and 9.2), the repository, its first empty commit and the people pages were made with the API and a five-minute token, not with a full `provision.mjs access` run, because that run also changes the live sign-in apps and the preview keys, which nobody asked for. The binding and names are in `app/wrangler.jsonc` and the install record, and go live with the publish. The live sign-in app still needs the knowledge path opened: `provision.mjs access` after the publish, or by hand.
- **2026-11-04** — Check: `.agents/verification/journeys/landing-site/a-visitor-opens-the-page-on-a-phone.json` expects *Install it*, not *Install it for free*, because the install heading changed with the paid plan on every way.
- **2026-11-04** — Asked how to open the knowledge address on WongStack's live sign-in wall after the publish → chose to open only that address, beside the code address, then test a save and its undo.
- **2026-11-04** — Checked (task 11.1): every local check passed with the new spec in place, in a copy of the plan's format. That copy made the spec-format check fail, and the 49 filed specs pass without it. `memory-areas.test.mjs` can pass only once the change is filed, because it needs `openspec/specs/company-knowledge/spec.md`.
- **2026-11-04** — Assumed: the preview check (old task 11.2) runs in `/ship`'s own save and walk, not in a save before filing, because CI fails on `memory-areas.test.mjs` until the change is filed. Check on the preview: `/api/access/knowledge/git/info/refs?service=git-upload-pack` answers `code_unavailable`, and the code route still hands out and saves.
- **2026-11-04** — Check after publish (old task 11.3), in the primary checkout, after only the knowledge address is opened on the live sign-in wall: `knowledge.mjs link` and `update` give `knowledge/` with Matthew's page; a new chat's digest shows it; `memory.mjs recall` finds a knowledge page; a test save and its undo go live through the app.
- **2026-11-04** — Assumed: the small wiki tidy that came from `main` during the publish saves company knowledge like a dream does, with the knowledge copy linked into its own copy of the repo and unlinked before that copy is removed, because a tidy that went through a pull request would leave the knowledge pages behind.
- **2026-11-04** — Archive checkpoint: filed at `openspec/changes/archive/2026-11-04-company-knowledge-repo/` on branch `pale-parrot`, with `main` merged in (45.5.0 to 45.7.0).
