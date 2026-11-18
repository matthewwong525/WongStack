<!-- openspec-archive v1 2026-11-04-company-knowledge-repo -->
<!-- file proposal.md utf8 14762 -->
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

<!-- end proposal.md -->
<!-- file design.md utf8 13058 -->
# Design

## Context

- **The wiki today.** `wiki/` holds the pages WongStack ships together with each install's own pages. Every edit goes through the change loop's gate: a pull request, CI, a preview, then a merge. `/close` publishes its wiki edits on `$BRANCH-wiki` through `/ship`, and `/dream-memory` publishes on `dream-<date>` (`.agents/skills/close/SKILL.md`, `.agents/skills/dream-memory/SKILL.md`).
- **Where the edits are.** In WongOS, 180 of about 190 changes since 2026-10-04 touched the wiki, mostly code pages. In ClaymooApp, 170 of 504 changes touched only `docs/`. Bryan made 71 of its business-page edits, and its staff app builds `docs/` into its wiki at deploy time (`openspec/specs/wiki-content-delivery`, part 2's concern).
- **The app's git address.** It already forwards Git through `/api/access/code/git/` (`app/worker/employee-access/code.ts`, 288 lines):
  - `codeSource` picks GitHub or Artifacts from `WONG_CODE_REPOSITORY` and the `ARTIFACTS` binding.
  - `reach` mints a 300-second Artifacts token.
  - `passed` streams each call.
  - `push`/`asked`/`savedBranch` refuse `main`, deletes, tags and more than one ref.
  - `router.ts`'s `codeDenied` checks the `code` key (`app/worker/keys.ts:43`) at `read` for git.
  - `gitCall` accepts only the three Git paths under the prefix.
- **Teammates' copies.** A teammate's copy reaches that address through `scripts/company-git-credential.mjs` with the `cloudflared` sign-in. A new chat moves a clean copy forward in the background (`save/scripts/update-copy.mjs`, called from `memory/scripts/session-start.mjs`).
- **Memory search** indexes `git ls-files -- wiki openspec` in the one checkout. It drops `wiki/people/**` and rejects symlinks and paths outside the real checkout (`memory/scripts/lib/documents/corpus.mjs:20-44`).
- **The digest** reads the person's page from `wiki/people/` (`memory/scripts/lib/digest.mjs:195-204`).
- **The link check** is `checkWiki(root)` in `memory/scripts/lib/links.mjs:121`, which checks `<root>/wiki/` (run by `.github/scripts/wiki-links.mjs`).
- **Setup.** `provision.mjs` creates Artifacts repositories in the `wongstack` namespace (`repository()`, l.659) and binds `ARTIFACTS` only on the Artifacts route (`addCodeBinding`, l.569). It checks the paid plan only on that route.

## Goals / Non-Goals

**Goals:**
- One knowledge repository per install, on Artifacts, on both delivery routes.
- Read and write for every holder of Project code, through the app, with no new key.
- One copy per computer, shown in every workspace at `knowledge/`, kept current without delaying a chat.
- A save goes live at once, after a local link check. It survives two writers, loses nothing, and can be undone in one step.
- Skills, memory search and the digest use it. Installs without it keep today's behavior.
- WongStack itself moves its `wiki/people/` first.

**Non-Goals:** the app's live reader (part 2, workspace "Live reader for company knowledge"); moving existing installs (part 3, workspace "Move old installs' knowledge"); cutting code-explaining pages (the weekly tidy); access for readers without Project code; server-side checks of a page's content.

## Decisions

### 1. The repository and its address

- **The repository.** Setup creates `<base>-knowledge` in the account's `wongstack` namespace on both routes, with `default_branch: main` and one empty first commit. `components.knowledge = { namespace, repo }` in `.claude/.wong-stack.json` records it.
- **Configuration.** `WONG_KNOWLEDGE_REPOSITORY` goes in both Workers' `vars`, beside `WONG_CODE_REPOSITORY`. The Access step binds `ARTIFACTS` to the production Worker on the GitHub route too; staging never gets it, as on the Artifacts route.
- **The address.** Knowledge has its own prefix, `/api/access/knowledge/git/`, in a new `employee-access/knowledge.ts`. It reuses the code route's streaming and token helpers, moved to a shared module and not copied.
  - Alternative: a sub-path under `/code/git/`. Rejected, because `gitCall` and every refusal there assume one project, and a separate judge is easier to test.
- **Access.** The router checks the `code` key at `read` for every knowledge call, a push included. The key's description says it also covers company knowledge. A service token is refused on the live app, as for code.

### 2. The push judge

- **What it takes:** one ref, `refs/heads/main`, updated from the current tip. No delete, no tag, no other branch, no two refs.
- **What it can't see:** the app streams the pack and never holds it, so it can't see whether a push rewrites history.
  - **Mitigation:** the save script never forces. Every computer's copy keeps the full history. An update that finds `main` no longer descends from the copy's tip says so and offers `knowledge.mjs restore`, which pushes the old tip back. The judge takes that push because its old value is the current tip.
- **Logging:** the live app logs one line per accepted save (`knowledge_saved`, with who and the new commit) and per refusal. Worker logs keep this; there is no new table.
- **First check in the build:** whether Artifacts can refuse non-fast-forward pushes by itself. If it can, setup turns that on and the restore path stays as a backstop.

### 3. One copy per computer, linked into each workspace

- **The real copy.** It is `<primary checkout>/knowledge/`, a separate Git repository. `origin` is `<app>/api/access/knowledge/git/`, with the same credential helper teammates use for code. `/knowledge` is in the code repo's `.gitignore`, with no trailing slash, so the link is ignored too.
- **The link.** Each linked worktree gets `knowledge` → that path:
  - `paseo.json`'s `worktree.setup` makes it, through the existing secrets-seeding script.
  - Session start makes it when it is missing.
  - On Windows, the link is a directory junction, which needs no admin rights.
- **Freshness.**
  - Session start runs `git pull --ff-only` on the copy in the background, beside `updateCopy`. A copy with unsaved edits is left alone and named in one line.
  - An expired sign-in is a quiet failure: the chat reads the last copy, and the digest already shows the sign-in link.
  - Every save fetches first, so a write never starts from a stale page.
- **Alternatives.**
  - A full copy per worktree. Rejected: N copies to update, and two chats on one computer could disagree.
  - A copy under `~/.local/state`. Rejected: links between `knowledge/` and code pages would not resolve against the workspace.

### 4. Saving: `knowledge.mjs`

`.agents/skills/memory/scripts/knowledge.mjs` has these commands:

- `status`: copy present, reachable, clean, behind.
- `link`: make the worktree link.
- `update`: fast-forward the copy.
- `save <paths…> -m <msg>`: the save, below.
- `undo <commit>`: `git revert` of one save, saved the same way.
- `restore`: put back history that a forced push rewrote.

`save` runs these steps:

1. Takes a lock in `knowledge/.git/` (stale after two minutes).
2. Takes only the named paths, and only `.md` and pictures (`.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`). Anything else is refused with a line saying where it belongs.
3. Commits as the computer's git user.
4. Fetches and rebases.
5. Runs the link check on `knowledge/`.
6. Pushes, retrying a lost race up to three times.

What it prints:

- **Success:** `saved=<commit>`, the pages, and the undo line.
- **Rebase conflict:** it aborts the rebase, resets to `origin/main`, writes the person's version beside the page as `<page>.mine.md` (git-ignored in the knowledge repo), and prints `conflict=<page>`. The agent writes one page from both versions and saves again.
- **No reach:** if the app can't be reached, the commit stays local, and it prints `pending=<commit>` and *not live yet*. The next `save` or `update` pushes it.

The script is deterministic: the agent picks pages and words, and the script does all the git steps.

### 5. Link checking

- **The shared check.** `checkWiki` gains a pages-root argument and checks `knowledge/` with the same rules: dead links and anchors, orphans, hub coverage, 3,000 words, the title.
- **Links into the code.** A link from `knowledge/` to a code file resolves against the workspace's logical path, never the real path, so it matches the code the chat sees.
- **CI.** The code repo's CI check skips any link into `knowledge/`, because CI has no copy. The payload link check already forbids a shipped page from naming install pages.

### 6. Memory search and the digest

- **Search.** `corpus.mjs` adds the knowledge copy as a second root. It is resolved once to its real path through `knowledge.mjs status`, and its passages carry the role `knowledge`, with paths `knowledge/<page>`. The symlink rule stays for every other path. `knowledge/people/**` stays out, as `wiki/people/**` does. The index keys on the copy's HEAD as well as the checkout.
- **The digest.** `digest.mjs` looks in `knowledge/people/`, then in `wiki/people/` for installs not yet moved.

### 7. Skills and rules

- **The skills.** `/close`, `/dream-memory` and the plain-request rule call `knowledge.mjs save` for knowledge facts and report the save line. They ask no *publish it?*.
  - `/close` no longer opens `$BRANCH-wiki` for them, and `/dream-memory` no longer opens `dream-<date>` for them.
  - Edits to code-repo pages (in the meta-repo: shipped and `maintaining/` pages) keep today's pull request.
  - With no copy (`status` says `absent`), every skill keeps today's flow.
- **`AGENTS.md`.** The four memory surfaces stay four. The `wiki/` line becomes *`wiki/` and `knowledge/`*: shipped pages, and the company's own pages, saved at once.
- **`wiki/wiki-style.md`.** `#repeatable-knowledge` and `### People` point to `knowledge/` and `knowledge.mjs save`. The *Save it through a pull request* sentence moves to code-repo pages only.
- **Cost.** The added words are paid for by cuts in the same files, checked by `measure-context.mjs --check`.
- **The owning page.** A new `wiki/stack/company-knowledge.md` owns the route, the copy, saving, conflicts, undo and restore. `project-git-route.md`, `access-screens.md` and `wiki/development/memory.md` link to it and don't restate it.

### 8. Setup and cost

- **The plan check.** `P plan` runs on both routes. A free account stops before anything is created with one ask: turn the plan on and continue, or stop.
- **Permissions.** `P widen` adds the repository permission and the plan read on the GitHub route, but not the check runner's container.
- **The closing report** adds *This costs about $5 a month, for Cloudflare's paid plan* on both routes.
- **The text.** `getting-started.md`, `artifacts-route.md`'s table and the site's install section drop *free*. The *Install for free* button becomes *Install*.
- **Windows** still takes the GitHub route for code. The knowledge copy works there too, because it reaches the repo only through the app.

### 9. WongStack itself

The meta-repo is on the GitHub route, at `wongstack.matthewwong525.workers.dev`.

1. The build runs the provision step for the knowledge repository and binding. This is an outward step, with a confirm.
2. It fills `wongstack-knowledge` with `wiki/people/` directly, with the owner's Artifacts helper, because the app route is not live before publish.
3. In the same change, it deletes `wiki/people/` from the code repo and drops the People line in `wiki/README.md`.
4. After the publish, the primary checkout gets its `knowledge/` copy through the app.

## Risks / Trade-offs

- **Every new install now pays about $5 a month.** Matthew chose this. A visitor who wanted the free way sees it on the landing page before starting, never midway through setup.
- **A forced push can rewrite history**, because the app can't see it. Every copy keeps history, `update` notices, and `restore` puts it back. If Artifacts can refuse it, the build turns that on.
- **The shared working tree.** A page one chat edited but did not save shows in another workspace on the same computer. `save` commits only named paths, so a second chat never saves the first chat's edit. Skills save right after they edit.
- **The app is unreachable or the sign-in has run out.** Reads use the last copy. Saves stay local as `pending` and are reported as not live.
- **No review before live.** A wrong save is live at once. Undo is one step, and the live app's log says who saved what. This is the same trust as `/dream-memory` publishing with no question today.
- **Two homes during the move.** Until part 3, an install has either `knowledge/` or `wiki/` for its own pages, never both. `status` picks one, and every skill follows it.

## Migration Plan

- **New installs** get the repository at setup.
- **Existing installs** take this release with no action. Skills see no copy and keep `wiki/` and pull requests. The *Updating* note says nothing changes until the move update (part 3).
- **WongStack's own move** is task group 9.
- **Rollback:** revert the release. Knowledge pages stay in the repository and can be copied back into `wiki/`.

## Open Questions

None.

<!-- end design.md -->
<!-- file tasks.md utf8 9073 -->
# Tasks

## 1. Check Cloudflare first

- [x] 1.1 Check whether an Artifacts repository can refuse a non-fast-forward push by itself (API docs, then a throwaway repository in the `wongstack` namespace, deleted after). Record the answer in the Decision log. If yes, add the setting to task 3.1; the restore path in 4.1 stays either way.

## 2. The app's knowledge route

- [x] 2.1 Move the code route's shared upstream helpers (`reach`, `passed`, the Git sign-in challenge, `gitCall` path parsing) from `app/worker/employee-access/code.ts` into a shared module; `code.ts` keeps its behavior and tests unchanged.
- [x] 2.2 Add `app/worker/employee-access/knowledge.ts`:
  - `/api/access/knowledge/git/` reads `WONG_KNOWLEDGE_REPOSITORY` with the `ARTIFACTS` binding.
  - The push judge takes only `refs/heads/main`, one ref, no delete or tag.
  - It logs `knowledge_saved` and `knowledge_refused` with who and the commit.
  - It answers `code_unavailable` with no binding, as on staging.
- [x] 2.3 Route it in `router.ts` behind the `code` key at `read` for every call, a push included. Refuse a service token on the live app. Let `app/worker/index.ts` send the Git sign-in challenge for the new prefix.
- [x] 2.4 Update the `code` key's description in `app/worker/keys.ts` to say it also covers company knowledge. Add `WONG_KNOWLEDGE_REPOSITORY` to both Workers' `vars` in `app/wrangler.jsonc` (empty in the template).
- [x] 2.5 Write `knowledge.test.ts` covering:
  - a read and a save by a Project code holder;
  - a refusal without Project code;
  - a service token refused on the live app;
  - delete, tag, other branch and two refs refused;
  - no binding answering `code_unavailable`;
  - the log lines.

  Also extend the `code.test.ts` and `index.test.ts` cases for the shared module and the new prefix.

## 3. Setup

- [x] 3.1 Change `provision.mjs`:
  - `repository()` also creates `<base>-knowledge` on both routes, never touching one that holds commits, with one empty first commit on `main`.
  - Record `components.knowledge`.
  - Bind `ARTIFACTS` to the production Worker on the GitHub route.
  - Write `WONG_KNOWLEDGE_REPOSITORY`.
- [x] 3.2 Make `P plan` run on both routes. Make `P widen` add the repository and plan-read permissions on the GitHub route, without the check runner's container.
- [x] 3.3 Update `.agents/skills/wong-setup/references/cloudflare.md` and `SKILL.md`:
  - the paid-plan stop on both routes, with the ask *turn it on and continue, or stop*;
  - the knowledge repository line;
  - the closing report's cost line on both routes;
  - the local `knowledge/` copy step (clone through the app after the first deploy; until then, `knowledge.mjs status` reports `not reachable yet`).
- [x] 3.4 Write provision tests:
  - the knowledge repository on each route;
  - rerun leaves a repository with pages untouched;
  - no staging binding;
  - a free plan stops on the GitHub route;
  - the GitHub route's permissions exclude the container.

## 4. The knowledge script

- [x] 4.1 Write `.agents/skills/memory/scripts/knowledge.mjs` with `status`, `link`, `update`, `save`, `undo` and `restore`, by design decision 4:
  - the lock;
  - named paths only, pages and pictures only;
  - fetch and rebase;
  - the link check;
  - the push and retry;
  - `conflict=` with `<page>.mine.md`;
  - `pending=` when unreachable;
  - `saved=` with the undo line;
  - history-rewrite detection in `update`.
- [x] 4.2 Set the remote and helper in `knowledge.mjs`: the copy's `origin` is the app's knowledge address, using `scripts/company-git-credential.mjs` the way `employee-bootstrap.mjs` does for code. No sign-in goes in a URL, a config file or an argument.
- [x] 4.3 Make the worktree link: add `link` to the secrets-seeding step `paseo.json` runs (`.agents/skills/ship/scripts/worktree-secrets.mjs seed`), and a directory junction on Windows. Add `/knowledge` to `.gitignore`, and `*.mine.md` to the knowledge repo's own ignore file, which `save` writes on first use.
- [x] 4.4 In `session-start.mjs`, run `knowledge.mjs link` when the link is missing and a background `update` beside `updateCopy`. Never delay the chat. Print one line for a copy with unsaved edits or a rewritten history.
- [x] 4.5 Write `scripts/tests/knowledge.test.mjs` against local bare repositories:
  - save;
  - a lost race retried;
  - a same-line conflict leaving both versions;
  - different lines both saved;
  - only named paths taken;
  - a script file refused;
  - a broken link refused;
  - unreachable leaving `pending`;
  - undo;
  - restore after a forced rewrite;
  - two chats sharing one copy;
  - `status absent` on an install with no copy.

## 5. Link check, memory search and digest

- [x] 5.1 Give `checkWiki` in `.agents/skills/memory/scripts/lib/links.mjs` a pages-root argument, so `knowledge.mjs` checks `knowledge/` with the same rules. Resolve links from `knowledge/` against the workspace's logical path. Skip links into `knowledge/` when the code repo is checked in CI. Extend `scripts/tests/wiki-links.test.mjs`.
- [x] 5.2 In `lib/documents/corpus.mjs`, add the knowledge copy as a second root:
  - resolve its real path once;
  - role `knowledge`, paths `knowledge/<page>`;
  - exclude `knowledge/people/**`;
  - key the index on the copy's HEAD too.

  Extend `document-corpus.test.mjs` and `document-recall.test.mjs`.
- [x] 5.3 Make `lib/digest.mjs` look in `knowledge/people/`, then `wiki/people/`. Extend the digest's tests in `memory-store.test.mjs`.

## 6. Skills, rules and `AGENTS.md`

- [x] 6.1 Update `/close` (`.agents/skills/close/SKILL.md`): knowledge facts go through `knowledge.mjs save` and the reply names the pages and the undo. The `$BRANCH-wiki` pull request stays only for code-repo pages and installs with no copy.
- [x] 6.2 Update `/dream-memory` (`SKILL.md`, `scripts/dream.mjs`): an install's own pages are read from `knowledge/` when present. Knowledge edits are saved at once, and code-repo page edits keep `dream-<date>`. Extend `scripts/tests/dream.test.mjs`.
- [x] 6.3 In `AGENTS.md`'s `WONG-STACK` block, change the memory-surfaces line to *`wiki/` and `knowledge/`* and the rule *Write repeatable knowledge…* to say it is saved at once. Offset the words with cuts in the same block.
- [x] 6.4 Update `wiki/wiki-style.md` (`#repeatable-knowledge`, `### People`) and `.agents/rules/wiki.md`, so they point to `knowledge/` and the save. Keep every linked heading's exact text.
- [x] 6.5 Run `node scripts/measure-context.mjs --check` and cut until it passes.

## 7. Wiki pages

- [x] 7.1 Add `wiki/stack/company-knowledge.md`, the owning page: what goes there, access, the copy, saving, conflicts, undo, restore, sign-in expiry. Link it from `wiki/stack/README.md`.
- [x] 7.2 Point these pages to the new page in one or two lines each, restating nothing:
  - `wiki/stack/project-git-route.md`
  - `wiki/stack/access-screens.md` (the Project code tick)
  - `wiki/development/memory.md`
  - `wiki/development/wiki-dream.md`
  - `wiki/development/document-retrieval.md` (the allowlist)
  - `wiki/development/the-change-loop.md` (a knowledge edit asks no *publish it?*)
  - `wiki/agent-knowledge-center.md` (where knowledge lives)
- [x] 7.3 Update the cost text: `wiki/stack/getting-started.md` (no free way, both need the paid plan) and `wiki/stack/artifacts-route.md` (the table's Cost row and the free-plan stop).

## 8. Landing site

- [x] 8.1 Under `site/`, change the install section and setup questions so every way names Cloudflare's paid plan, and *Install for free* becomes *Install*. Update the install-cost test that reads `getting-started.md` against the landing page, and the site's own tests.

## 9. WongStack's own knowledge repo

- [x] 9.1 (outward, confirm first) Run the provision step for this repo's account: create `wongstack-knowledge`, bind `ARTIFACTS` on the production Worker only, and write `WONG_KNOWLEDGE_REPOSITORY` and `components.knowledge`.
- [x] 9.2 (outward, confirm first) Fill `wongstack-knowledge` with `wiki/people/README.md` and `wiki/people/matthew-wong.md`, plus a `README.md` hub, pushed directly with the owner's Artifacts helper.
- [x] 9.3 Delete `wiki/people/` from this repo. Remove the People line from `wiki/README.md`, and fix any link `memory.mjs areas wiki/people` names.

## 10. Release bookkeeping

- [x] 10.1 Add a `## Next (minor) — Company knowledge in its own repo` entry at the top of `CHANGELOG.md`. Its *Updating.* note says, in plain words, that nothing changes for an existing install until the move update, and that a new install needs Cloudflare's paid plan.
- [x] 10.2 Add `knowledge.mjs`, its test and `wiki/stack/company-knowledge.md` to `payload-files.json` and the payload manifest's Core and Pack lines.
- [x] 10.3 Add the `company-knowledge` spec to `.agents/skills/memory/references/areas.json`. Add any retired name to `scripts/retired-names.json`.

## 11. Verify

- [x] 11.1 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, context budget, retired names, wiki links, script and app tests) and fix every failure.

<!-- end tasks.md -->
<!-- file specs/artifacts-install/spec.md utf8 1090 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Setup installs with one Cloudflare account

A new install on Mac or Linux SHALL complete from one Cloudflare user token and no GitHub account, with its repository, app hosting, login wall and check runner all in the person's own Cloudflare account. Setup SHALL confirm the account can hold them before it creates anything. Because every install keeps company knowledge in Cloudflare, every route SHALL need Cloudflare's paid plan, and setup SHALL check it before creating anything on either route.

#### Scenario: A fresh computer

- **WHEN** a person whose Cloudflare account has the paid plan asks for an install in an empty folder
- **THEN** the install finishes with its repository and site in that account, and no GitHub sign-in is asked for

#### Scenario: The account is on the free plan

- **WHEN** the token's account lacks the paid plan, on either route
- **THEN** setup stops before creating any resource, says the plan is needed for every way to install and what it costs, and offers to wait while the person turns it on

<!-- end specs/artifacts-install/spec.md -->
<!-- file specs/cloudflare-provisioning/spec.md utf8 1115 -->
# Spec Delta

## ADDED Requirements

### Requirement: Setup makes the knowledge repository on both routes

Setup SHALL create the install's knowledge repository in the chosen Cloudflare account on the GitHub route and the Cloudflare route alike, record it as committed nonsecret configuration, and connect the live app to it so no key is made or pasted. Staging SHALL get no connection that can write to it. On the GitHub route, the user token SHALL widen itself to create the repository and read the plan, and SHALL NOT gain the check runner's permissions. Running the step again SHALL change nothing that is already right, and SHALL never empty or replace a repository that holds pages.

#### Scenario: A GitHub install

- **WHEN** setup provisions a new GitHub-route install on a paid account
- **THEN** a knowledge repository exists in that account, the live app is connected to it, staging is not, and no key was asked for

#### Scenario: Setup runs again

- **WHEN** setup's Cloudflare step runs again on an install whose knowledge repository holds pages
- **THEN** the repository and its pages are unchanged

<!-- end specs/cloudflare-provisioning/spec.md -->
<!-- file specs/company-git/spec.md utf8 1226 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Plain git reaches the project with the company sign-in

In a copy installed through the app, an ordinary `git fetch`, `pull` or `ls-remote` against its origin SHALL succeed with the person's saved company sign-in, run by any tool, with no extra flag, no GitHub account and no key on the computer. The app SHALL check the sign-in and the person's current Project code on every request, then pass the request on to where the project is kept, GitHub or Cloudflare. No sign-in SHALL be written into the copy's files, its git settings, a URL or a log. A push to the code SHALL keep today's rules: it saves a change through the app, and never moves the published project. Company knowledge SHALL follow its own rules, which let a push move its published branch forward.

#### Scenario: Paseo makes a worktree

- **WHEN** Paseo fetches in the background and makes a new worktree from `origin/main` in a teammate's copy
- **THEN** the worktree holds the newest published version

#### Scenario: Project code is taken away

- **WHEN** a person without Project code runs `git fetch` in an old copy
- **THEN** it is refused with ask-your-admin guidance, and the copy is unchanged

<!-- end specs/company-git/spec.md -->
<!-- file specs/company-knowledge/spec.md utf8 6077 -->
# Spec Delta

## Purpose

Company knowledge (people, business, customers, how we work, why) lives in its own repository in the install's Cloudflare account, which every holder of Project code reads and writes through the app, and where a save goes live at once.

## ADDED Requirements

### Requirement: Each install has one knowledge repository in its Cloudflare account

Every new install SHALL get one knowledge repository in its own Cloudflare account, on the GitHub route and on the Cloudflare route alike, holding no page until the first fact is saved. The code repository SHALL keep only the pages WongStack ships; an install's own pages SHALL go in the knowledge repository, which holds what code can't say: people, business, customers, how the team works, and why.

#### Scenario: A new GitHub install

- **WHEN** setup finishes a new install on the GitHub route
- **THEN** the install has a knowledge repository in its Cloudflare account with no pages, and `wiki/` holds only shipped pages

#### Scenario: A fact about a customer

- **WHEN** a chat learns that a customer wants invoices on the first of the month
- **THEN** the fact goes on a page in `knowledge/`, not in `wiki/`

### Requirement: Project code means read and write on company knowledge

Every person who holds Project code on the Access page SHALL be able to read the knowledge repository and save to it through the app, with the same company sign-in they use for code, and with no other tick, key or account. The app SHALL check the sign-in and Project code on every call. A person without Project code, and a service token on the live app, SHALL be refused. A push SHALL only move the published branch forward from its current tip; a delete, a tag, another branch or several branches at once SHALL be refused. No credential SHALL reach the computer.

#### Scenario: A teammate saves a page

- **WHEN** a teammate who holds Project code saves a change to `knowledge/business.md`
- **THEN** the save is accepted, and every other teammate's next read has it

#### Scenario: Project code is taken away

- **WHEN** a person whose Project code was removed tries to read or save knowledge
- **THEN** the app refuses with ask-your-admin guidance, and nothing changes in the repository

### Requirement: Every workspace reads one current copy

Each computer SHALL keep one copy of the knowledge repository, which every workspace on that computer shows at `knowledge/`. When a chat starts, the copy SHALL move to the newest saved version in the background, without delaying the chat. A copy with unsaved edits SHALL be left as it is. When the sign-in has run out or the app can't be reached, chats SHALL read the last copy, and nothing SHALL open a browser or wait for one.

#### Scenario: A teammate saved overnight

- **WHEN** a teammate saved a page last night and the person starts a chat this morning
- **THEN** by the end of the chat's start, every workspace on the person's computer shows that page

#### Scenario: The sign-in ran out

- **WHEN** a chat starts after the company sign-in has expired
- **THEN** the chat reads the last copy, and the sign-in link is shown as it is today

### Requirement: A save goes live at once after a link check

A save SHALL publish the named pages to the knowledge repository at once, with no pull request, no CI and no question, after a link check on the computer that applies the wiki's link, hub, length and title rules to `knowledge/`. A save SHALL take only Markdown pages and pictures, and only the paths it names. It SHALL report the pages saved and how to undo the save. When the app can't be reached, the save SHALL stay on the computer, be reported as not live yet, and go live with the next save or update.

#### Scenario: Remember this

- **WHEN** the person says "remember that Ana wants pull requests under 300 lines"
- **THEN** Ana's page in `knowledge/people/` has the line, it is live for the team, and the reply names the page and the undo

#### Scenario: A broken link

- **WHEN** a save adds a page that links to a page that does not exist
- **THEN** nothing is published, and the reply names the page and the link to fix

### Requirement: Two writers never lose a save

When two saves change the same lines of a page, the later save SHALL NOT overwrite the earlier one: the assistant SHALL be given both versions and SHALL save one page that keeps both. Saves to different lines or pages SHALL both go live with no extra step. Two chats on one computer SHALL never save each other's unsaved edits.

#### Scenario: Same lines, two people

- **WHEN** Bryan and Matthew each change the same paragraph of `knowledge/ops/shipping.md` within a minute
- **THEN** the second save stops, the assistant writes the paragraph from both versions, and the saved page keeps both changes

### Requirement: Every save can be undone and history survives

Each save SHALL be one entry in the knowledge repository's history that a single undo reverses, live at once like any save. If the published history is ever rewritten, the next update on any computer that holds the older history SHALL say so and SHALL be able to put it back. The live app SHALL log who saved each entry.

#### Scenario: Undo a save

- **WHEN** the person says "undo that save" after a wrong fact was saved
- **THEN** the page is back as it was, live for everyone, and the history still shows both entries

#### Scenario: History rewritten

- **WHEN** someone forces an older history onto the knowledge repository by hand
- **THEN** the next update on a computer with the newer history reports it and offers to put it back

### Requirement: Installs without a knowledge copy keep today's wiki

An install with no knowledge copy SHALL keep writing its own pages to `wiki/` through pull requests, exactly as before this release, until it takes the update that moves its knowledge.

#### Scenario: An older install updates

- **WHEN** an install created before this release takes it and then learns a repeatable fact
- **THEN** the fact goes in `wiki/` through a pull request, as it did before

<!-- end specs/company-knowledge/spec.md -->
<!-- file specs/document-retrieval/spec.md utf8 1209 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Indexing stays within the current checkout

The index SHALL derive from allowlisted wiki and OpenSpec paths in the current checkout, including eligible unsaved documents, and from the pages in the computer's knowledge copy, labeled as company knowledge. It SHALL respect ignored paths, reject links escaping the checkout other than the knowledge copy itself, and exclude private store data, transcripts, credentials and people pages, in `wiki/` and in `knowledge/`. Separate worktrees SHALL retain separate indexes outside version control.

#### Scenario: A new plan is not yet saved

- **WHEN** an eligible new active-change document exists and active scope is requested
- **THEN** lookup can find it as proposed evidence

#### Scenario: Linked worktrees contain different plans

- **WHEN** two linked worktrees contain different documents
- **THEN** each lookup returns only its own checkout's evidence without combining indexes

#### Scenario: A knowledge page answers the question

- **WHEN** a question matches `knowledge/ops/shipping.md`
- **THEN** lookup returns its passage labeled as company knowledge, and no `knowledge/people/` page appears

<!-- end specs/document-retrieval/spec.md -->
<!-- file specs/knowledge-center/spec.md utf8 3904 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: Capture happens during the work

The docs SHALL present capture as part of the work: the memory store is short-term memory, company knowledge is long-term memory written when a session learns something, and `/close` is the catch-up that moves a session's and its change's remaining repeatable facts into company knowledge, saved at once. On an install with no knowledge copy, `/close` SHALL publish them in their own pull request.

#### Scenario: Reader sees why capture pays off

- **WHEN** a reader reviews the philosophy page
- **THEN** they see that each change starts with more context than the last

### Requirement: The agent writes what it learns when it learns it

When a request teaches something repeatable, including "read this and remember it", the agent SHALL write it to company knowledge in that request, citing the source by URL or path and never copying the source into the repository. The edit SHALL be saved at once, with no question, and the reply SHALL name the pages and the undo. On an install with no knowledge copy, the edit SHALL be saved like any other file edit, through a pull request; during a change, it SHALL ride in the change's pull request.

#### Scenario: Read this and remember it

- **WHEN** the person pastes an article URL and says "remember this"
- **THEN** the repeatable points land on the page that owns the topic in `knowledge/`, with the URL, live at once, and the reply says how to undo it

### Requirement: People pages are matched by git email

A fact about one person SHALL go on `knowledge/people/<name>.md`, or `wiki/people/<name>.md` on an install with no knowledge copy, which lists every git email the person uses. The agent SHALL find the current person by `git config user.email`; when no page lists it, the next knowledge save SHALL add a short page with the name and email, without asking.

#### Scenario: The first person fact

- **WHEN** a repo with no `people/` folder learns a teammate's review preference
- **THEN** the save adds the people hub, links it from the knowledge hub, and adds the teammate's page with their email

### Requirement: The wiki's links are checked on every run

Every repo's test workflow SHALL check `wiki/` on every run whose change touches a Markdown file or removes or moves any file, docs-only runs included, and on every run with no base to compare; a run whose change touches only other files SHALL skip the check and say so. The check SHALL fail when a link to a file in the repo points nowhere, when a link's `#section` part names no heading on the page it lands on, when a page other than the root hub is linked from no other wiki page, or when a section's hub does not link one of its pages or subfolders. Section names SHALL follow GitHub's heading anchors, and a heading inside a code block SHALL NOT count. The failure SHALL name each page and link. A link into `knowledge/` SHALL be skipped in the workflow, which has no copy; the same rules SHALL apply to `knowledge/` before each knowledge save.

#### Scenario: A page nobody links to

- **WHEN** an install's wiki save adds `wiki/customers/acme.md` and no wiki page links to it
- **THEN** the check fails naming that page, and the save does not publish until a page links it

#### Scenario: A renamed heading breaks a section link

- **WHEN** a wiki save renames the heading `## Saved browser logins` while another wiki page links `browsing.md#saved-browser-logins`
- **THEN** the check fails naming the linking page, its line, and the link, and the save does not publish until the link or the heading is fixed

#### Scenario: A code-only change skips the wiki check

- **WHEN** a branch changes only `app/src/pages/home/Home.tsx`
- **THEN** the test workflow runs the code tests, skips the wiki check, and its summary says the wiki check was skipped because no page or linked file changed

<!-- end specs/knowledge-center/spec.md -->
<!-- file specs/landing-site/spec.md utf8 988 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The landing page says what each way to install costs

On the same page as its install steps, through the steps or their adjacent setup questions, the landing page SHALL say, for each way to install that works on the day it is published, which accounts it needs, which computers it works on, and what it costs. It SHALL NOT call the install, or any way to install, free while every way needs a paid plan from another company.

#### Scenario: A visitor on a Mac reads the install section

- **WHEN** a visitor reads the install section and its adjacent setup questions before starting
- **THEN** they can tell that every way to install needs Cloudflare's paid plan and what that costs, and that the way with GitHub also needs a GitHub account

#### Scenario: Every page is read for the word free

- **WHEN** the install section, its buttons and its setup questions are read
- **THEN** none calls the install or a way to install free

<!-- end specs/landing-site/spec.md -->
<!-- file specs/memory/spec.md utf8 1060 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: The digest holds what always applies and asks for a search

The digest SHALL include the people page that lists the current git email, found in `knowledge/people/` and then in `wiki/people/`, after the current change's threads, within at most 1.5 KB; a page cut short SHALL end with a line naming its path. The digest's opening lines SHALL tell the agent to search memory for the task's key terms, in its own words, once it knows the task and before it acts on more than a quick question.

#### Scenario: A person with a people page

- **WHEN** the current git email is listed on `knowledge/people/ana.md`, a 3 KB page
- **THEN** the digest shows the first part of that page within 1.5 KB, a line naming `knowledge/people/ana.md` for the rest, and then feedback facts

#### Scenario: No people page

- **WHEN** no page in `knowledge/people/` or `wiki/people/` lists the current git email
- **THEN** the digest shows no person section, and its opening lines still ask for a search once the task is known

<!-- end specs/memory/spec.md -->
<!-- file specs/wiki-dream/spec.md utf8 992 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: A dream publishes alone, through the project's checks

A dream's edits to company knowledge SHALL be saved at once, apart from any other work, with no closing question. Its edits to pages in the code repository, and every edit on an install with no knowledge copy, SHALL be published apart from any other work through the same checks as any wiki edit, on either delivery route. A checkout holding unfinished work SHALL stop the dream before it edits anything. The report SHALL name each page changed, the fact behind each edit, and how to undo the knowledge saves.

#### Scenario: Unfinished work in the checkout

- **WHEN** `/dream-memory` is run where a change is half built
- **THEN** it edits nothing and says where to run it instead

#### Scenario: Nothing to add

- **WHEN** no new fact passes the keep test and no re-checked page needs an edit
- **THEN** the dream publishes nothing, says so, and still counts as the last dream

<!-- end specs/wiki-dream/spec.md -->
<!-- file specs/workspace-cleanup/spec.md utf8 1440 -->
# Spec Delta

## MODIFIED Requirements

### Requirement: /close updates the wiki
`/close` SHALL read the facts recorded in this session, on its branch, and on its change by any session, so a renamed branch or a change resumed elsewhere loses none. It SHALL keep only repeatable knowledge, write it into the owning pages, and save those edits to company knowledge at once before closing, naming the pages and the undo. On an install with no knowledge copy, and for an edit to a page in the code repository, it SHALL publish the edits in their own pull request. It SHALL skip the update when unpublished work is kept (the close after that work ships runs it) and when work is thrown away. It SHALL never publish edits the person made and did not publish. A private-life fact SHALL NOT move into the repo's knowledge or wiki, and an unreachable store SHALL skip the step without blocking the close.

#### Scenario: Close after a publish
- **WHEN** `/ship` merged a change whose facts record a convention for future work, and the person runs `/close`
- **THEN** the owning page in `knowledge/` is saved live with no pull request, the reply names it and the undo, and the workspace closes

#### Scenario: A declined publish stays unpublished
- **WHEN** the person declined to publish a wiki note, then runs `/close`
- **THEN** the note is saved to its branch with an open pull request, not published, and `/close` writes no wiki edit of its own

<!-- end specs/workspace-cleanup/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-03

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 101040 fence=~~~ -->
~~~html
<!-- wong-review:3 -->
<!doctype html>
<!--
  WongStack review kit. build-review.mjs writes the proposal as static HTML at the
  review:content marker, puts the app's look (look.mjs) at the look marker, the light and dark switch (theme.js) at the
  theme marker, and the change name in place of its token. The one script adds Note buttons, drawing fit and full screen, notes, drafts, and copy. It loads nothing from the network;
  opened through a reply link (reply-link.mjs), it sends the saved notes to the chat, and its footer
  asks the chat to build, or to build and publish, with saved unsent notes: each button shows when the link offers it.
  A preview page (data-kind="preview", from apply's preview-review.mjs) names the finished build and offers Publish.
-->
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Review · 2026-11-04-company-knowledge-repo</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.625rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.922 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.556 0 0);
}

/* Tailwind's shadow-xs, shadow-sm and shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the
   bottom, so a layer reads as above the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --look-shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
  --look-shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  font-feature-settings: "rlig" 1, "calt" 1;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
:where(h1, h2, h3) { font-weight: 600; letter-spacing: -0.025em; }
:where(a) { color: inherit; text-underline-offset: 0.25rem; }
::selection { background: var(--primary); color: var(--primary-foreground); }
:where(:focus-visible) { outline: 3px solid var(--ring); outline-offset: 2px; }

/* Button (button.tsx): outline by default; .btn-primary, and the pages' button.primary and button.main, filled. */
:where(button, .btn) {
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) - 2px);
  background: var(--background);
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s, border-color 0.15s;
}
:where(button, .btn):where(:hover:not(:disabled)) { background: var(--accent); color: var(--accent-foreground); }
:where(button.primary, button.main, .btn-primary) { border-color: var(--primary); background: var(--primary); color: var(--primary-foreground); box-shadow: none; }
:where(button.primary, button.main, .btn-primary):where(:hover:not(:disabled)) { background: color-mix(in oklab, var(--primary) 90%, transparent); color: var(--primary-foreground); }
:where(.btn-ghost) { border-color: transparent; background: transparent; box-shadow: none; }
:where(button, .btn):where(:disabled) { opacity: 0.5; cursor: default; }

/* Field (input.tsx): a thin border, a soft shadow, and the ring on focus. */
:where(input:not([type=checkbox], [type=radio], [type=file], [type=range], [type=button], [type=submit]), select, textarea, .field) {
  border: 1px solid var(--input);
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--foreground);
  box-shadow: var(--look-shadow-xs);
  font: inherit;
  transition: border-color 0.15s, box-shadow 0.15s;
}
:where(input, textarea)::placeholder { color: var(--muted-foreground); }
:where(input, select, textarea, .field):where(:focus-visible) { outline: none; border-color: var(--ring); box-shadow: 0 0 0 3px var(--look-ring); }
:where(input, select, textarea, .field):where([aria-invalid=true]) { border-color: var(--destructive); }
:where(input[type=checkbox], input[type=radio]) { accent-color: var(--primary); }

/* Card (card.tsx) and tag (badge.tsx, secondary). */
:where(.card) {
  background: var(--card);
  color: var(--card-foreground);
  border: 1px solid var(--border);
  border-radius: calc(var(--radius) + 4px);
  box-shadow: var(--look-shadow-sm);
}
:where(.tag) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.125rem 0.5rem;
  border: 1px solid transparent;
  border-radius: 999px;
  background: var(--secondary);
  color: var(--secondary-foreground);
  font-size: 12px;
  font-weight: 500;
  line-height: 1.33;
  white-space: nowrap;
}
:where(.tag-outline) { border-color: var(--border); background: transparent; color: var(--foreground); }

/* Skeleton (skeleton.tsx): a grey block that pulses while what it stands for loads, and holds still when motion is
   off. .sr-only keeps the words of a loading state for a screen reader alone. */
:where(.skeleton) { display: block; border-radius: calc(var(--radius) - 2px); background: var(--accent); animation: look-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
@keyframes look-pulse { 50% { opacity: 0.5; } }
@media (prefers-reduced-motion: reduce) { :where(.skeleton) { animation: none; } }
:where(.sr-only) { position: absolute; max-width: 1px; max-height: 1px; padding: 0; margin: -1px; overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0; }

/* The light and dark switch (theme.js): a ghost icon button, 44px, in the page's top right corner, above the page and
   below a note box or full-screen view. It scrolls away with the page's top, so it never sits over text read later.
   In a page's [data-theme-toggle] slot it sits in line. The icon shows the look it switches to: moon on light. */
.theme-toggle {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top));
  right: calc(12px + env(safe-area-inset-right));
  z-index: 5;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.75rem;
  min-width: 2.75rem;
  height: 2.75rem;
  min-height: 2.75rem;
  padding: 0;
  border-color: transparent;
  background: transparent;
  box-shadow: none;
  color: var(--foreground);
}
@media (hover: hover) { .theme-toggle:hover { background: var(--accent); color: var(--accent-foreground); } }
[data-theme-toggle] .theme-toggle { position: static; flex: none; }
.theme-toggle svg { width: 1.25rem; height: 1.25rem; pointer-events: none; }

  * { box-sizing:border-box; }
  html { -webkit-text-size-adjust:100%; }
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  header { padding:20px 48px 4px 0; }
  .back { display:flex; align-items:center; gap:8px; min-width:0; margin:0 0 8px; }
  .back .muted { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  .eyebrow { margin:0; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  h1 { margin:2px 0 4px; font-size:22px; line-height:1.25; }
  .jump { display:flex; flex-wrap:wrap; gap:0 18px; margin:4px 0 0; padding:0; list-style:none; }
  .jump a { display:inline-block; padding:8px 0; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  .item { display:grid; grid-template-columns:26px minmax(0,1fr); gap:0 10px; overflow:hidden; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .item > .drawing { position:relative; grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; }
  .item > .drawing:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .drawing summary { display:flex; align-items:center; gap:6px; min-height:44px; padding:0 var(--pad); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:14px; cursor:pointer; list-style:none; }
  .drawing summary::-webkit-details-marker { display:none; }
  .drawing summary::before { content:'\25B8'; display:inline-block; width:1em; }
  .drawing[open] summary::before { transform:rotate(90deg); }
  .drawing[open] .show, .drawing:not([open]) .hide { display:none; }
  .drawing .count { color:var(--foreground); font-weight:600; }
  .frame { overflow:auto; border-top:1px solid var(--border); background:var(--muted); touch-action:pan-y; }
  .js .frame { overflow:hidden; cursor:zoom-in; }
  .art { display:block; width:max-content; margin:0; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; font-size:13px; }
  .art.sketch .f-bg { fill:var(--background); } .art.sketch .f-fg { fill:var(--foreground); } .art.sketch .f-muted { fill:var(--muted); } .art.sketch .f-subtle { fill:var(--muted-foreground); }
  .art.sketch .f-line { fill:var(--border); } .art.sketch .f-card { fill:var(--card); } .art.sketch .f-danger { fill:var(--destructive); }
  .art.sketch .s-bg { stroke:var(--background); } .art.sketch .s-fg { stroke:var(--foreground); } .art.sketch .s-muted { stroke:var(--muted); } .art.sketch .s-subtle { stroke:var(--muted-foreground); }
  .art.sketch .s-line { stroke:var(--border); } .art.sketch .s-card { stroke:var(--card); } .art.sketch .s-danger { stroke:var(--destructive); }
  /* A screen: the look's parts in em, so the kit's fit and zoom scale it; its controls sit in an inert box and never take a tap. */
  .art.screen { line-height:1.4; } .art.screen:not([style]) { width:auto; max-width:49.2em; margin-right:1px; }
  .art.screen .sk { pointer-events:none; user-select:none; } .art.screen .sk > * + * { margin-top:.6em; }
  .art.screen :is(h3, h4, p, ul, ol) { margin:0; } .art.screen h3 { font-size:1.15em; } .art.screen h4, .art.screen small { font-size:.9em; }
  .art.screen .card { margin:0; padding:1em; } .art.screen :is(button, .btn) { min-width:0; min-height:0; padding:.45em 1em; font-size:1em; } .art.screen .tag { margin:0; font-size:.85em; }
  .art.screen :is(input:not([type=checkbox], [type=radio]), textarea, select, .field) { display:block; box-sizing:border-box; width:100%; padding:.45em .7em; }
  .art.screen .skeleton { animation:none; min-height:1em; } .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .sk-bar { display:block; height:.75em; border-radius:.375em; background:color-mix(in oklab, var(--muted-foreground) 25%, transparent); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  /* Picture files: a wrapping row of labelled figures in em, so the fit and zoom scale them like a drawing; two sit side by side when they fit. */
  .art.photo { width:49.2em; display:flex; flex-wrap:wrap; align-items:flex-start; gap:.8em; white-space:normal; line-height:1.3; }
  .art.photo figure { flex:1 1 18em; min-width:0; margin:0; text-align:center; }
  .art.photo img { display:block; width:100%; height:auto; max-height:40em; object-fit:contain; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art.photo figcaption { margin-top:.3em; color:var(--muted-foreground); font-size:.95em; }
  .shot { position:relative; display:block; } .art .pin.spot { position:absolute; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture; several sit side by side when they fit. */
  .art.ads { width:auto; max-width:49.2em; margin-right:1px; }
  .ad { flex:1 1 15em; max-width:20em; min-width:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .art.photo .ad img { max-height:none; aspect-ratio:4 / 5; object-fit:cover; border:0; border-radius:0; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .art.photo .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  .try { margin:8px 0 0; padding:0 var(--pad); }
  .item > .verdict { grid-column:1 / -1; display:flex; align-items:center; gap:8px; margin-top:10px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .item > .table { grid-column:1 / -1; margin:10px calc(-1 * var(--pad)) 0; overflow-x:auto; border-top:1px solid var(--border); }
  .item > .table:last-child { margin-bottom:calc(-1 * var(--pad)); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .enlarge { position:absolute; top:6px; right:var(--pad); min-height:32px; padding:2px 10px; font-size:13px; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  .zoom { display:flex; align-items:center; gap:6px; }
  .zoom .level { margin-right:auto; color:var(--muted-foreground); font-size:13px; }
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--background); }
  #viewer .zoom { flex:none; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); }
  #viewer .vframe { flex:1; min-height:0; overflow:auto; background:var(--muted); touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  #viewer .vhint { flex:none; margin:0; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); color:var(--muted-foreground); font-size:13px; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px system-ui, sans-serif; vertical-align:middle; }
  .pin.draft { border-color:var(--foreground); border-style:dashed; background:var(--background); color:var(--foreground); }
  .entry { display:block; width:100%; margin:0 0 8px; padding:8px 10px; text-align:left; font-weight:400; }
  .entry .where { display:block; color:var(--muted-foreground); font-size:13px; }
  .entry .tag { margin:0 0 0 6px; }
  #chip { position:absolute; z-index:9; border-color:var(--input); box-shadow:var(--look-shadow-overlay); }
  #editor { position:absolute; z-index:6; width:260px; padding:10px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--input); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-overlay); }
  #editor.docked { position:fixed; left:0; right:0; bottom:0; width:auto; display:flex; flex-direction:column; overflow:auto; border-width:1px 0 0; border-radius:0; box-shadow:var(--look-shadow-up); padding:8px 12px max(8px, env(safe-area-inset-bottom)); }
  #editor.docked .where { flex:none; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  #editor.docked textarea { flex:1 1 auto; min-height:44px; }
  #editor.docked .row { flex:none; }
  #editor .where { margin:0 0 6px; color:var(--muted-foreground); font-size:13px; }
  #editor .moved { margin:0 0 6px; font-size:13px; font-weight:600; }
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 system-ui, sans-serif; resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  body.read-only .bar, body.read-only .add, body.read-only .verdict, body.read-only .hint, body.read-only .vhint .note-it, body.read-only #chip { display:none; }
  #ready { display:contents; }
  #ready-confirm { position:absolute; right:12px; bottom:calc(100% + 8px); width:272px; max-width:calc(100vw - 24px); max-height:calc(100dvh - var(--bar, 76px) - 24px); overflow:auto; padding:12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:calc(var(--radius) + 4px); box-shadow:var(--look-shadow-lg); }
  #ready-confirm .row { display:flex; gap:8px; margin-top:10px; }
  #ready-confirm button { flex:1; min-height:44px; }
  #ready-confirm p { margin:0; font-size:14px; }
  #ready-says { position:absolute; right:12px; bottom:calc(100% + 8px); max-width:calc(100vw - 24px); margin:0; padding:8px 12px; background:var(--popover); color:var(--popover-foreground); border:1px solid var(--border); border-radius:var(--radius); box-shadow:var(--look-shadow-lg); font-size:14px; font-weight:500; pointer-events:none; }
  .bar:has(#ready-confirm:not([hidden])) #ready-says { bottom:calc(100% + 16px + var(--choices, 0px)); }
  .spinner { display:inline-block; width:14px; height:14px; margin-right:6px; vertical-align:-2px; border:2px solid currentColor; border-right-color:transparent; border-radius:50%; animation:spin .8s linear infinite; }
  @keyframes spin { to { transform:rotate(360deg); } }
  @media (prefers-reduced-motion:reduce) { .spinner { animation:none; } }
  .session, #editor .copies { color:var(--muted-foreground); font-size:13px; }
  #editor .copies { flex:none; margin:6px 0 0; }
  .pin.sent { background:var(--background); color:var(--foreground); }
  #toast { position:fixed; left:50%; bottom:calc(var(--bar, 76px) - 4px); z-index:7; max-width:90vw; transform:translateX(-50%); padding:8px 14px; border-radius:var(--radius); background:var(--primary); color:var(--primary-foreground); box-shadow:var(--look-shadow-lg); font-size:14px; opacity:0; pointer-events:none; transition:opacity .2s; }
  #toast.show { opacity:1; }
  #copybuf { position:fixed; left:0; top:0; width:1px; height:1px; opacity:0; pointer-events:none; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .eyebrow, h2, .hint, .muted, .num, .drawing summary, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100vw - 700px) / 2 + 12px)); padding-right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100vw - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
</style>
<script>
// The light and dark switch outside the app: inlined in the review page's <head>, served to private pages as /theme.js.
// It applies the saved choice before paint, then adds the button; storage that is off still switches, unremembered.
(function () {
  var KEY = 'wongstack-theme';
  var SVG = 'http://www.w3.org/2000/svg';
  // lucide's moon and sun. The icon shows the look a tap switches to.
  var ICONS = {
    moon: [['path', { d: 'M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z' }]],
    sun: [['circle', { cx: '12', cy: '12', r: '4' }]].concat(['M12 2v2', 'M12 20v2', 'm4.93 4.93 1.41 1.41', 'm17.66 17.66 1.41 1.41', 'M2 12h2', 'M20 12h2', 'm6.34 17.66-1.41 1.41', 'm19.07 4.93-1.41 1.41'].map(function (d) { return ['path', { d: d }]; })),
  };
  var root = document.documentElement;
  var saved = null;
  try { saved = localStorage.getItem(KEY); } catch (e) { saved = null; }
  root.classList.toggle('dark', saved === 'dark');

  function icon(name) {
    var svg = document.createElementNS(SVG, 'svg');
    var attrs = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', 'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'aria-hidden': 'true' };
    Object.keys(attrs).forEach(function (k) { svg.setAttribute(k, attrs[k]); });
    ICONS[name].forEach(function (part) {
      var el = document.createElementNS(SVG, part[0]);
      Object.keys(part[1]).forEach(function (k) { el.setAttribute(k, part[1][k]); });
      svg.appendChild(el);
    });
    return svg;
  }

  function draw(button) {
    var dark = root.classList.contains('dark');
    button.setAttribute('aria-label', dark ? 'Switch to light' : 'Switch to dark');
    button.setAttribute('aria-pressed', dark ? 'true' : 'false');
    button.textContent = '';
    button.appendChild(icon(dark ? 'sun' : 'moon'));
  }

  function mount() {
    if (!document.body || document.querySelector('.theme-toggle')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'theme-toggle';
    draw(button);
    button.addEventListener('click', function () {
      var dark = !root.classList.contains('dark');
      root.classList.toggle('dark', dark);
      try { localStorage.setItem(KEY, dark ? 'dark' : 'light'); } catch (e) { /* switched, not remembered */ }
      draw(button);
    });
    var slot = document.querySelector('[data-theme-toggle]');
    if (slot) slot.appendChild(button);
    else document.body.insertBefore(button, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
</script>
</head>
<body data-change="2026-11-04-company-knowledge-repo" data-own-back>
<main>
<header>
  <p class="eyebrow">Review</p>
  <h1>2026-11-04-company-knowledge-repo</h1>
  <p class="muted"><span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p class="hint"><span class="lead">Tap + Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Open a drawing and tap it to see it full screen.</span></p>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Today every wiki edit is a pull request with checks and a preview. In ClaymooApp, 170 of 504 changes since 2026-10-04 changed only pages. So the team writes down less than it learns, and what it writes waits for checks. Company knowledge (people, business, customers, how we work, why) changes with the business, not with the code. It needs a place where a save goes live at once and the whole team can write.</p>
<p data-note="why-2" tabindex="0">This is part 1 of 3. Part 2 (&quot;Live reader for company knowledge&quot;) lets the app show these pages live. Part 3 (&quot;Move old installs' knowledge&quot;) moves WongOS, ClaymooApp and other installs after one yes.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Company knowledge gets its own repo in your Cloudflare account.</b> Each workspace shows it in a <code>knowledge/</code> folder beside <code>wiki/</code>. The <code>wiki/</code> folder keeps only the pages WongStack ships. Everything code can't say goes in <code>knowledge/</code>: people, business, customers, how we work, why. Pages that only say what code does are not needed, because the code says it.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-1-line-1" tabindex="0">your-project/</span>
<span class="ln" data-note="item-1-line-2" tabindex="0">├─ wiki/        pages WongStack ships</span>
<span class="ln" data-note="item-1-line-3" tabindex="0">├─ knowledge/   your company's own pages</span>
<span class="ln" data-note="item-1-line-4" tabindex="0">│  ├─ README.md</span>
<span class="ln" data-note="item-1-line-5" tabindex="0">│  ├─ people/</span>
<span class="ln" data-note="item-1-line-6" tabindex="0">│  └─ business.md</span>
<span class="ln" data-note="item-1-line-7" tabindex="0">└─ app/ …       the code</span></pre></div></details></li>
<li class="item card" id="item-2"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>Anyone who can read the code can write knowledge, and a save goes live at once.</b> The app's Access page gives no new tick: <i>Project code</i> now also means <i>read and write company knowledge</i>. A save needs no pull request and no checks. A quick link check runs on the computer first. If two people change the same lines, the assistant reads both versions and writes the page again, and nothing is lost.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-2-picture-1" tabindex="0" style="width:22.692em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 295 439" width="295" height="439" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_edit_check_0"><path d="M203.69,56L203.69,97"/><path class="pele-marker" d="M203.69,104L200.33,96L207.05,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_check_live_0"><path d="M181.14,174.69L181.14,187.69C181.14,198.49 59.78,198.49 59.78,209.29L59.78,254.79"/><path class="pele-marker" d="M59.78,261.79L56.42,253.79L63.14,253.79Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_check_fix_0"><path d="M197.14,184.69L197.14,254.79"/><path class="pele-marker" d="M197.14,261.79L193.78,253.79L200.5,253.79Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_fix_check_0"><path d="M218.92,261.79L218.92,215.54C218.92,205.71 213.14,205.71 213.14,195.89L213.14,189.89"/><path class="pele-marker" d="M213.14,182.89L216.5,190.89L209.78,190.89Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_live_merge_0"><path d="M59.78,309.79L59.78,355.29C59.78,362.98 165.24,362.98 165.24,370.67L165.24,375.79" stroke-dasharray="3 4"/><path class="pele-marker" d="M165.24,382.79L161.88,374.79L168.6,374.79Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_merge_check_0"><path d="M181.24,382.79L181.24,369.79C181.24,339.79 286.7,339.79 286.7,309.79L286.7,261.79C286.7,223.84 229.14,223.84 229.14,185.89L229.14,179.89"/><path class="pele-marker" d="M229.14,172.89L232.5,180.89L225.78,180.89Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_check_live_0"><rect x="44.89" y="211.29" width="29.78" height="21" rx="3" fill="var(--_bg)"/><text x="59.78" y="226.69" text-anchor="middle">yes</text></g><g class="pele-edge-label" data-id="L_check_fix_0"><rect x="185.35" y="211.29" width="23.57" height="21" rx="3" fill="var(--_bg)"/><text x="197.14" y="226.69" text-anchor="middle">no</text></g><g class="pele-edge-label" data-id="L_live_merge_0"><rect x="22.33" y="332.29" width="74.91" height="21" rx="3" fill="var(--_bg)"/><text x="59.78" y="347.69" text-anchor="middle">same lines</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="edit" transform="translate(203.69,32)"><rect x="-57.58" y="-24" width="115.17" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">edit a page</text></g><g class="pele-node pele-shape-diam" data-id="check" transform="translate(203.69,146.39)"><polygon points="0,-42.39 67.83,0 0,42.4 -67.83,0" fill="var(--_s)" stroke="var(--_b)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">links OK?</text></g><g class="pele-node pele-shape-rect" data-id="live" transform="translate(59.78,285.79)"><rect x="-51.78" y="-24" width="103.57" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">live for all</text></g><g class="pele-node pele-shape-rect" data-id="fix" transform="translate(205.14,285.79)"><rect x="-53.57" y="-24" width="107.14" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">fix the link</text></g><g class="pele-node pele-shape-rect" data-id="merge" transform="translate(173.24,406.79)"><rect x="-58.46" y="-24" width="116.93" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">merge both</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-3"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>Every chat reads the newest knowledge.</b> Each computer keeps one copy that all its workspaces share. The copy updates when a chat starts, in the background, so the chat does not wait. If the sign-in has run out, the chat reads the last copy and shows the sign-in link.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><div class="art pic" data-note="item-3-picture-1" tabindex="0" style="width:19.231em"><svg xmlns="http://www.w3.org/2000/svg" class="pele pele-flowchart" viewBox="0 0 250 305" width="250" height="305" style="max-width:100%;height:auto;--_bg:var(--pele-bg,#fff);--_fg:var(--pele-fg,#1f1f1f);--_m:var(--pele-muted,#6e6e6e);--_l:var(--pele-line,#1f1f1f);--_s:var(--pele-surface,#f3f3f3);--_a:var(--pele-surface-alt,#e6e6e6);--_b:var(--pele-border,#8a8a8a);--_c:var(--pele-accent,#5b7bd5);color:var(--_fg);--_r:var(--pele-radius,4px);--_fm:var(--pele-font-mono,monospace);font:16px sans-serif;letter-spacing:normal;word-spacing:normal;text-transform:none;direction:ltr;font-family:var(--pele-font,system-ui, -apple-system, &quot;Segoe UI&quot;, Roboto, sans-serif)" fill="var(--_fg)" role="graphics-document document" aria-roledescription="flowchart"><g class="pele-edges" fill="none" stroke="var(--_l)" stroke-linecap="round"><g class="pele-edge" data-id="L_start_update_0"><path d="M124.7,56L124.7,97"/><path class="pele-marker" d="M124.7,104L121.34,96L128.06,96Z" fill="var(--_l)" stroke="none"/></g><g class="pele-edge" data-id="L_update_last_0"><path d="M124.7,176L124.7,242"/><path class="pele-marker" d="M124.7,249L121.34,241L128.06,241Z" fill="var(--_l)" stroke="none"/></g></g><g class="pele-edge-labels" font-size="14"><g class="pele-edge-label" data-id="L_update_last_0"><rect x="76.35" y="198.5" width="96.7" height="21" rx="3" fill="var(--_bg)"/><text x="124.7" y="213.9" text-anchor="middle">sign-in ran out</text></g></g><g class="pele-nodes"><g class="pele-node pele-shape-rect" data-id="start" transform="translate(124.7,32)"><rect x="-54.9" y="-24" width="109.81" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">chat starts</text></g><g class="pele-node pele-shape-rect" data-id="update" transform="translate(124.7,140)"><rect x="-74.03" y="-36" width="148.06" height="72" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" text-anchor="middle" xml:space="preserve"><tspan x="0" y="-6.4">copy updates in</tspan><tspan x="0" y="17.6">background</tspan></text></g><g class="pele-node pele-shape-rect" data-id="last" transform="translate(124.7,273)"><rect x="-116.7" y="-24" width="233.41" height="48" fill="var(--_s)" stroke="var(--_b)" style="rx:var(--_r)"/><text class="pele-label" x="0" y="5.6" text-anchor="middle">read last copy, show sign-in</text></g></g></svg></div></div></details></li>
<li class="item card" id="item-4"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The assistant saves what it learns at once and tells you how to undo it.</b> This applies to a plain request (&quot;remember this&quot;), <code>/close</code> and <code>/dream-memory</code> alike. It does not ask <i>publish it?</i> first. Each save names its pages and gives a one-step undo.</div></div><details class="drawing"><summary><span class="show">Show drawing</span><span class="hide">Hide drawing</span><span class="count"></span></summary><div class="frame"><pre class="art">
<span class="ln" data-note="item-4-line-1" tabindex="0">Saved to company knowledge: people/ana.md</span>
<span class="ln" data-note="item-4-line-2" tabindex="0">(Ana wants pull requests under 300 lines.)</span>
<span class="ln" data-note="item-4-line-3" tabindex="0">To undo it, say &quot;undo that save&quot;.</span></pre></div></details></li>
<li class="item card" id="item-5"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>Memory search and your page at chat start read the new place.</b> Search finds knowledge pages as well as <code>wiki/</code>. As now, people pages are left out of search. Your own people page still opens each chat.</div></div></li>
<li class="item card" id="item-6"><span class="num">6</span><div class="body"><div class="text" data-note="item-6" tabindex="0"><b>Every new install now needs Cloudflare's paid plan, about $5 a month.</b> The repo is kept in Cloudflare, and Cloudflare keeps repos only on its paid plan. The way with GitHub is no longer free, and the landing page and getting-started guide say so. Setup checks the plan for both ways and stops before it creates anything on a free account.</div></div><div class="table"><table class="tbl"><thead><tr><th></th><th>Today</th><th>After</th></tr></thead><tbody><tr data-note="item-6-row-1" tabindex="0"><td>GitHub and Cloudflare</td><td>free</td><td>Cloudflare's paid plan, about $5 a month</td></tr><tr data-note="item-6-row-2" tabindex="0"><td>Cloudflare alone</td><td>Cloudflare's paid plan, about $5 a month</td><td>the same</td></tr></tbody></table></div></li>
<li class="item card" id="item-7"><span class="num">7</span><div class="body"><div class="text" data-note="item-7" tabindex="0"><b>WongStack's own people pages move first.</b> <code>wiki/people/</code> (2 pages) moves to WongStack's own knowledge repo. WongStack uses the new place before any install does.</div></div></li>
<li class="item card" id="item-8"><span class="num">8</span><div class="body"><div class="text" data-note="item-8" tabindex="0"><b>Installs that exist today keep working as now.</b> An install with no knowledge copy keeps writing <code>wiki/</code> through pull requests until it takes part 3's update.</div></div></li>
</ol>
<p class="aside">Non-goals: the app's live reader (part 2); moving existing installs (part 3); cutting pages that only explain code, which the weekly tidy in Background cleanup jobs does later; a database in place of git; any access for staff who can't read the code.</p>

</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked where company knowledge is kept → chose always in Cloudflare, for every install, knowing GitHub installs then need Cloudflare's paid plan.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked which pages move → chose: the knowledge repo holds what code can't say; pages WongStack ships stay; pages that only explain code are not needed, because the code says it.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked when pages that only explain code are cut → chose later, page by page, by the weekly tidy in Background cleanup jobs, not during the move.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked how the app shows knowledge pages → chose a live reader that WongStack ships (part 2).</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked what happens to existing installs → chose that the update moves them after one yes (part 3).</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked how to plan the work → chose three plans in order, each in its own workspace; this is part 1.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: a git repo, not pages in the memory store, because agents keep reading plain files and links, text search and undo by history keep working (Matthew's suggested shape).</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: <i>Project code</i> gives read and write on knowledge, with no new tick, because Matthew said can read the code means can write knowledge.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: staff without Project code get no access to knowledge, because nobody asked for more and the app's live reader (part 2) decides what others see.</li>
<li class="decision card" id="decision-10" data-note="decision-10" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: the folder is <code>knowledge/</code>, a link in each workspace to one copy in the primary checkout, because links and reading then work as for <code>wiki/</code>, and every workspace sees the same copy.</li>
<li class="decision card" id="decision-11" data-note="decision-11" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: every computer, the owner's included, reaches the knowledge repo through the app's address with the company sign-in, because one way is easier to test and the app checks access on each call.</li>
<li class="decision card" id="decision-12" data-note="decision-12" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: a knowledge save asks no <i>publish it?</i>, because a save that waits for a question defeats Matthew's aim of frequent updates, and each save gives a one-step undo.</li>
<li class="decision card" id="decision-13" data-note="decision-13" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: a save takes only Markdown pages and pictures, and the app does not inspect what a push holds, because scripts there would run outside the code's checks, and the app streams a push without reading it.</li>
<li class="decision card" id="decision-14" data-note="decision-14" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: the app can't block a push that rewrites history, so every computer's copy keeps the full history and can put it back, because the app streams a push without reading it. The build first checks whether Cloudflare can refuse such a push by itself.</li>
<li class="decision card" id="decision-15" data-note="decision-15" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: the link check runs on the computer before each push, and the code repo's CI skips links into <code>knowledge/</code>, because CI can't see that copy.</li>
<li class="decision card" id="decision-16" data-note="decision-16" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: an install with no knowledge copy keeps today's <code>wiki/</code> and pull requests, because part 3 creates the repo for existing installs and they must keep working until then.</li>
<li class="decision card" id="decision-17" data-note="decision-17" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: people pages stay out of memory search, as today, because nobody asked to change that privacy rule.</li>
<li class="decision card" id="decision-18" data-note="decision-18" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-03</p>Assumed: a <code>minor</code> release, because no existing install breaks; part 3's move is the <code>major</code> one.</li>
<li class="decision card" id="decision-19" data-note="decision-19" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-03</p>Asked whether the build may make the throwaway test repository, WongStack's knowledge repository with the live app's connection, and copy the two people pages into it → chose yes, all three.</li>
<li class="decision card" id="decision-20" data-note="decision-20" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-03</p>Checked (task 1.1): an Artifacts repository can't refuse a non-fast-forward push by itself. The API docs name no such setting (create takes only <code>name</code>, <code>description</code>, <code>default_branch</code>, <code>read_only</code>; there is no update route), and a throwaway repository in the <code>wongstack</code> namespace took a <code>git push --force</code> that dropped a commit. The repository was deleted after. So setup adds no setting, and <code>knowledge.mjs update</code> and <code>restore</code> are the only guard.</li>
<li class="decision card" id="decision-21" data-note="decision-21" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-04</p>Found while building: the live sign-in wall did not let Git reach <code>/api/access/knowledge/git/*</code>. Setup's live app now opens that path to the Worker as it does the code path, which checks the sign-in itself, and the publish check takes the older pair of open paths or the new three, so an install from before this keeps passing until its next <code>access</code> run.</li>
<li class="decision card" id="decision-22" data-note="decision-22" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: the search index needs no key on the copy's HEAD (task 5.2), because it is keyed on each page's content hash, so a changed page in the copy is seen anyway.</li>
<li class="decision card" id="decision-23" data-note="decision-23" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: a save's link check counts only problems in the pages it publishes or in pages already published and unchanged here, so another chat's unsaved page never stops a save.</li>
<li class="decision card" id="decision-24" data-note="decision-24" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: the knowledge repo's ignore file holds <code>*.mine.*</code>, not only <code>*.mine.md</code> (task 4.3), because a picture can clash too and its other side is kept the same way.</li>
<li class="decision card" id="decision-25" data-note="decision-25" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: on a computer with no saved person (the owner's), the Git sign-in helper gives company knowledge the computer's own company sign-in, because the app checks Project code on every call; the code path keeps its check of the saved person.</li>
<li class="decision card" id="decision-26" data-note="decision-26" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: a copy behind the published version with unsaved edits is left as it is, as the spec says, but a copy only ahead is still published, because a push changes no file in the copy.</li>
<li class="decision card" id="decision-27" data-note="decision-27" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: for WongStack's own repo (tasks 9.1 and 9.2), the repository, its first empty commit and the people pages were made with the API and a five-minute token, not with a full <code>provision.mjs access</code> run, because that run also changes the live sign-in apps and the preview keys, which nobody asked for. The binding and names are in <code>app/wrangler.jsonc</code> and the install record, and go live with the publish. The live sign-in app still needs the knowledge path opened: <code>provision.mjs access</code> after the publish, or by hand.</li>
<li class="decision card" id="decision-28" data-note="decision-28" tabindex="0"><p class="meta"><span class="tag check">check</span>2026-11-04</p>Check: <code>.agents/verification/journeys/landing-site/a-visitor-opens-the-page-on-a-phone.json</code> expects <i>Install it</i>, not <i>Install it for free</i>, because the install heading changed with the paid plan on every way.</li>
<li class="decision card" id="decision-29" data-note="decision-29" tabindex="0"><p class="meta"><span class="tag asked">asked</span>2026-11-04</p>Asked how to open the knowledge address on WongStack's live sign-in wall after the publish → chose to open only that address, beside the code address, then test a save and its undo.</li>
<li class="decision card" id="decision-30" data-note="decision-30" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-04</p>Checked (task 11.1): every local check passed with the new spec in place, in a copy of the plan's format. That copy made the spec-format check fail, and the 49 filed specs pass without it. <code>memory-areas.test.mjs</code> can pass only once the change is filed, because it needs <code>openspec/specs/company-knowledge/spec.md</code>.</li>
<li class="decision card" id="decision-31" data-note="decision-31" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: the preview check (old task 11.2) runs in <code>/ship</code>'s own save and walk, not in a save before filing, because CI fails on <code>memory-areas.test.mjs</code> until the change is filed. Check on the preview: <code>/api/access/knowledge/git/info/refs?service=git-upload-pack</code> answers <code>code_unavailable</code>, and the code route still hands out and saves.</li>
<li class="decision card" id="decision-32" data-note="decision-32" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-04</p>Check after publish (old task 11.3), in the primary checkout, after only the knowledge address is opened on the live sign-in wall: <code>knowledge.mjs link</code> and <code>update</code> give <code>knowledge/</code> with Matthew's page; a new chat's digest shows it; <code>memory.mjs recall</code> finds a knowledge page; a test save and its undo go live through the app.</li>
<li class="decision card" id="decision-33" data-note="decision-33" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-04</p>Assumed: the small wiki tidy that came from <code>main</code> during the publish saves company knowledge like a dream does, with the knowledge copy linked into its own copy of the repo and unlinked before that copy is removed, because a tidy that went through a pull request would leave the knowledge pages behind.</li>
<li class="decision card" id="decision-34" data-note="decision-34" tabindex="0"><p class="meta"><span class="tag log">log</span>2026-11-04</p>Archive checkpoint: filed at <code>openspec/changes/archive/2026-11-04-company-knowledge-repo/</code> on branch <code>pale-parrot</code>, with <code>main</code> merged in (45.5.0 to 45.7.0).</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
</section>
</main>
<button type="button" id="chip" hidden>Add note</button>
<div id="editor" role="dialog" aria-labelledby="editor-where" hidden>
  <p class="where" id="editor-where"></p>
  <p class="moved">Possibly moved: its text changed, so this note is not attached.</p>
  <textarea aria-label="Note text" rows="3" placeholder="A question or a change"></textarea>
  <div class="row"><button type="button" class="primary" data-act="save">Save</button><button type="button" data-act="discard">Discard</button><button type="button" data-act="delete">Delete note</button><button type="button" data-act="close">Close</button></div>
  <p class="copies">Saving a note copies all your notes.</p>
  <p class="session" hidden>Notes last for this session only.</p>
</div>
<div id="viewer" role="dialog" aria-modal="true" aria-label="Drawing, full screen" hidden>
  <div class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button><button type="button" class="primary">Close</button></div>
  <div class="vframe"></div>
  <p class="vhint">Drag to move · pinch or + to zoom<span class="note-it"> · tap a line or picture to note it</span></p>
</div>
<div class="bar" data-busy="false"><button type="button" class="primary" id="copy"><span class="spinner" hidden aria-hidden="true"></span><span id="copy-label">Copy notes</span></button>
  <div id="ready" data-actions="[{&quot;name&quot;:&quot;build&quot;,&quot;label&quot;:&quot;Build it&quot;,&quot;done&quot;:&quot;Asked the chat to build.&quot;},{&quot;name&quot;:&quot;publish&quot;,&quot;label&quot;:&quot;Build and publish&quot;,&quot;done&quot;:&quot;Asked the chat to build and publish.&quot;,&quot;confirm&quot;:{&quot;say&quot;:&quot;Goes live, can't be undone.&quot;,&quot;yes&quot;:&quot;Yes, publish&quot;,&quot;ask&quot;:&quot;Build and publish? This goes live and can't be undone.&quot;}}]" hidden>
    <div id="ready-confirm" role="group" hidden><p></p><div class="row"><button type="button" class="primary" data-ready="yes"><span class="spinner" hidden aria-hidden="true"></span><span></span></button><button type="button" data-ready="cancel">Cancel</button></div></div>
  </div>
  <p id="ready-says" role="status" aria-live="polite" hidden><span class="spinner" hidden aria-hidden="true"></span><span id="ready-message"></span></p>
</div>
<div id="toast" role="status"></div>
<textarea id="copybuf" aria-hidden="true" tabindex="-1" readonly></textarea>
<script>
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  window.addEventListener('error', function (e) {
    $('script-error').hidden = false;
    $('script-error').textContent = 'Review script error: ' + e.message + ' (line ' + e.lineno + ')';
  });
  const root = document.documentElement;
  root.classList.add('js');
  const CHANGE = document.body.getAttribute('data-change');
  const KEY = 'wong-review3:' + CHANGE;
  // A preview page shows a finished build: its words name the preview. A review page of other work names its cards.
  const PREVIEW = document.body.getAttribute('data-kind') === 'preview', NAME = PREVIEW ? CHANGE.replace(/-preview$/, '') : CHANGE;
  const REVIEW = document.body.getAttribute('data-kind') === 'review', NOUN = REVIEW ? 'Card' : 'Change', PAGE = REVIEW ? 'page' : 'plan';
  if (PREVIEW) {
    document.title = 'Preview · ' + NAME;
    document.querySelector('.eyebrow').textContent = NAME;
    document.querySelector('h1').textContent = 'Built: look, then publish?';
    document.querySelector('.hint .lead').textContent = 'Tap a picture to see it full screen, then tap it to note it.';
    document.querySelector('.hint .tail').textContent = '';
  }
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Change on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer'), vframe = viewer.querySelector('.vframe'), vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {} };
  // A note on words keeps its quote; a note on a picture spot keeps the picture, the spot in percent, and its name.
  const EXTRA = { quote: 'string', k: 'number', x: 'number', y: 'number', on: 'string' };
  const ok = function (r, id) {
    return r && typeof r.label === 'string' && typeof r.text === 'string' && /^[\w-]+$/.test(id)
      && Object.keys(EXTRA).every(function (f) { return r[f] === undefined || typeof r[f] === EXTRA[f]; });
  };
  function extraOf(rec) {
    const x = {};
    Object.keys(EXTRA).forEach(function (f) { if (rec && rec[f] !== undefined) x[f] = rec[f]; });
    return x;
  }
  try { store = window.localStorage; store.getItem(KEY); } catch (e) { store = null; }
  function load(text) {
    try {
      const saved = JSON.parse(text || 'null');
      if (saved && Array.isArray(saved.notes)) data.notes = saved.notes.filter(function (n) { return ok(n, n && n.id); });
      if (saved && saved.drafts) Object.keys(saved.drafts).forEach(function (id) { if (ok(saved.drafts[id], id)) data.drafts[id] = saved.drafts[id]; });
      if (saved && saved.ok && typeof saved.ok === 'object') {
        data.ok = {};
        Object.keys(saved.ok).forEach(function (id) { if (/^item-\d+$/.test(id) && (saved.ok[id] === true || saved.ok[id] === 'sent')) data.ok[id] = saved.ok[id]; });
      }
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?(?:-(words|spot)-\d+)?$/.exec(id) || [];
    if (m[5]) return Object.assign(where(id.replace(/-(words|spot)-\d+$/, '')), m[5] === 'words' ? { kind: 'words' } : {});
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: NOUN + ' #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot.
    // A screen's words sit in many small boxes: join every piece of text with a space.
    // Picture files read as their labels, joined with a dot.
    const row = el.tagName === 'TR', photo = el.classList.contains('photo'), cells = row ? c.querySelectorAll('td') : photo ? c.querySelectorAll('img')
      : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = Array.prototype.map.call(cells, function (n) { return (photo ? n.alt : n.textContent).replace(/\s+/g, ' ').trim(); }).join(row || photo ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  // A note on words or a spot sits on its base target: words are found again by their quote, a spot by the base's label.
  function find(id, rec) {
    const m = /^(.*)-(words|spot)-\d+$/.exec(id), el = document.querySelector('[data-note="' + (m ? m[1] : id) + '"]');
    if (!el) return null;
    if (m && m[2] === 'words') return textOf(el).indexOf(rec.quote) >= 0 ? el : null;
    if (m && !el.querySelectorAll('.shot')[rec.k]) return null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add'), function (n) { n.parentNode.removeChild(n); });
    return c.textContent.replace(/\s+/g, ' ');
  }
  // A new note on words or a spot takes the next free number on its target.
  function nextId(base, kind) {
    const pre = base + '-' + kind + '-';
    let k = 1;
    data.notes.map(function (n) { return n.id; }).concat(Object.keys(data.drafts)).forEach(function (id) {
      if (id.indexOf(pre) === 0) k = Math.max(k, +id.slice(pre.length) + 1);
    });
    return pre + k;
  }
  // The notes list groups notes by Why, each card, and Decisions.
  function groupOf(id) {
    const m = /^(why|item|decision)-(\d+)/.exec(id) || [];
    return m[1] === 'why' ? [0, 'Why'] : m[1] === 'item' ? [+m[2], NOUN + ' ' + m[2]] : [1e6, 'Decisions'];
  }
  // A row's pin and Note button go in its last cell: a table row holds only cells.
  function slot(el) { return el.tagName === 'TR' ? el.lastElementChild : el; }
  function noteOf(id) { return data.notes.filter(function (n) { return n.id === id; })[0] || null; }

  // ── render pins, Note buttons, counts, and the notes list ──
  function render() {
    all('.pin, .add', function (p) { p.parentNode.removeChild(p); });
    const n = data.notes.length, d = Object.keys(data.drafts).length;
    const count = plural(n) + (d ? ' · ' + d + (d === 1 ? ' draft' : ' drafts') : '');
    all('.note-count', function (el) { el.textContent = count; });
    all('.session', function (el) { el.hidden = !!store; });
    const ids = data.notes.map(function (x) { return x.id; }).concat(Object.keys(data.drafts).filter(function (id) { return !noteOf(id); }))
      .map(function (id, i) { return [groupOf(id)[0], i, id]; }).sort(function (a, b) { return a[0] - b[0] || a[1] - b[1]; })
      .map(function (x) { return x[2]; });
    $('note-list').innerHTML = ids.length ? '' : '<li class="muted">No notes yet.</li>';
    let group = null;
    ids.forEach(function (id) {
      const note = noteOf(id), draft = data.drafts[id], rec = note || draft, num = note ? data.notes.indexOf(note) + 1 : 0, sent = !!(note && note.sent);
      const el = find(id, rec);
      if (groupOf(id)[1] !== group) {
        group = groupOf(id)[1];
        const head = document.createElement('li');
        head.className = 'group'; head.textContent = group;
        $('note-list').appendChild(head);
      }
      if (el) {
        const pin = document.createElement('button');
        pin.type = 'button'; pin.className = draft ? 'pin draft' : sent ? 'pin sent' : 'pin'; pin.setAttribute('data-open', id);
        pin.textContent = (num || '') + (num && (draft || sent) ? ' · ' : '') + (draft ? 'Draft' : sent ? 'Sent' : '');
        pin.setAttribute('aria-label', (num ? 'Open note ' + num : 'Open draft') + (num && draft ? ' and its draft' : ''));
        if (rec.x !== undefined) {
          pin.className += ' spot'; pin.style.left = rec.x + '%'; pin.style.top = rec.y + '%';
          el.querySelectorAll('.shot')[rec.k].appendChild(pin);
        } else slot(el).appendChild(pin);
      }
      const li = document.createElement('li');
      li.innerHTML = '<button type="button" class="entry" data-open="' + id + '"><span class="where">' + (num ? num + '. ' : '')
        + esc(where(id).at + ' · ' + rec.label) + (draft ? '<span class="tag">Draft</span>' : '') + (sent ? '<span class="tag">Sent</span>' : '') + (el ? '' : '<span class="tag">possibly moved</span>')
        + '</span>' + esc(draft ? draft.text : note.text) + '</button>';
      $('note-list').appendChild(li);
    });
    all('[data-note]', function (el) {
      const id = el.getAttribute('data-note');
      if (el.closest('.art') || el.querySelector('.pin[data-open="' + id + '"]')) return;
      const add = document.createElement('button');
      add.type = 'button'; add.className = 'add'; add.setAttribute('data-open', id);
      add.textContent = '+ Note'; add.setAttribute('aria-label', 'Note on ' + where(id).kind);
      slot(el).appendChild(add);
    });
    all('.verdict', function (v) {
      const id = v.querySelector('[data-ok]').getAttribute('data-ok'), state = data.ok[id], n = id.slice(5);
      v.querySelector('.tag').hidden = !state;
      v.querySelector('.tag').textContent = state === 'sent' ? 'OK · Sent' : 'OK';
      v.querySelector('[data-ok]').textContent = state ? 'Undo' : 'OK';
      v.querySelector('[data-ok]').setAttribute('aria-label', (state ? 'Undo OK on ' : 'OK ') + NOUN.toLowerCase() + ' ' + n);
      v.querySelector('[data-open]').hidden = !!state;
    });
    drawings.forEach(function (d) {
      const k = d.art.querySelectorAll('.pin').length;
      d.count.textContent = k ? ' · ' + k + (k === 1 ? ' note' : ' notes') : '';
      fit(d);
    });
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, chipExtra = null, tap = null;
  // True once the inbox opens this page from its Archive: it takes no note.
  let readOnly = false;
  const pointers = {};
  // `extra` makes the chip start a new note on selected words or a picture spot.
  function showChip(el, x, y, keyboard, extra) {
    if (readOnly) return;
    const id = el.getAttribute('data-note');
    chipFor = el; chipExtra = extra || null;
    chip.textContent = extra && extra.quote ? 'Note' : !extra && (noteOf(id) || data.drafts[id]) ? 'Edit note' : 'Add note';
    chip.hidden = false;
    const w = chip.offsetWidth, vw = root.clientWidth;
    chip.style.left = Math.max(8, Math.min(x - w / 2, vw - w - 8)) + window.pageXOffset + 'px';
    chip.style.top = y + 12 + window.pageYOffset + 'px';
    if (keyboard) chip.focus({ preventScroll: true });
  }
  function hideChip() { chip.hidden = true; chipFor = null; chipExtra = null; }
  document.addEventListener('pointerdown', function (e) {
    if (e.isPrimary) Object.keys(pointers).forEach(function (k) { delete pointers[k]; });
    pointers[e.pointerId] = true;
    tap = Object.keys(pointers).length === 1 && e.button === 0 ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: Date.now(), target: e.target } : null;
  });
  document.addEventListener('pointermove', function (e) {
    if (tap && e.pointerId === tap.id && Math.abs(e.clientX - tap.x) + Math.abs(e.clientY - tap.y) > 8) tap = null;
  });
  document.addEventListener('pointercancel', function (e) { delete pointers[e.pointerId]; tap = null; });
  document.addEventListener('pointerup', function (e) {
    const t = tap;
    delete pointers[e.pointerId]; tap = null;
    if (!t || t.id !== e.pointerId || Date.now() - t.t > 500) return;
    if (t.target.closest('a, button, input, textarea, select, label, summary, #editor')) return;
    const el = t.target.closest('[data-note]');
    const offer = el && (el.closest('#viewer') || (e.pointerType === 'mouse' && !el.closest('.frame')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a picture file in full screen notes that spot of it, kept in percent so it holds at any size.
  function spotAt(el, target, e) {
    if (!el.closest('#viewer') || !el.classList.contains('photo') || target.tagName !== 'IMG') return null;
    const r = target.getBoundingClientRect(), pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: Array.prototype.indexOf.call(el.querySelectorAll('img'), target), x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: target.alt };
  }
  // Selected words in one note target offer a note on just those words.
  let picking = 0;
  document.addEventListener('selectionchange', function () {
    clearTimeout(picking);
    picking = setTimeout(function () {
      const s = window.getSelection ? window.getSelection() : null;
      if (!s || s.isCollapsed || !s.rangeCount || open) return;
      const range = s.getRangeAt(0), at = range.commonAncestorContainer, host = (at.nodeType === 1 ? at : at.parentNode).closest('[data-note]');
      const quote = s.toString().replace(/\s+/g, ' ').trim().slice(0, 200);
      if (!host || !quote || host.closest('.art, #editor, #viewer') || textOf(host).indexOf(quote) < 0) return;
      const r = range.getBoundingClientRect();
      showChip(host, r.left + r.width / 2, r.bottom, false, { quote: quote });
    }, 150);
  });
  chip.addEventListener('click', function () {
    if (!chipFor) return;
    const id = chipFor.getAttribute('data-note'), extra = chipExtra;
    openEditor(extra ? nextId(id, extra.quote ? 'words' : 'spot') : id, chipFor, extra);
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    const id = t.getAttribute('data-open'), rec = data.drafts[id] || noteOf(id);
    const el = rec ? find(id, rec) : t.closest('[data-note]') || document.querySelector('[data-note="' + id + '"]');
    if (el && t.classList.contains('entry')) { reveal(el); el.scrollIntoView({ block: 'center' }); }
    openEditor(id, el);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (open) closeEditor(true);
      else if (chipFor) {
        const el = chipFor, words = chipExtra && chipExtra.quote;
        hideChip();
        if (words && window.getSelection) window.getSelection().removeAllRanges();
        el.focus();
      }
      else if (view) closeViewer(true);
    } else if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('[data-note]')) {
      e.preventDefault();
      const r = e.target.getBoundingClientRect();
      showChip(e.target, r.left + 48, r.top + Math.min(r.height, 24), true);
    }
  });

  // ── the editor: beside its target on a desktop, docked at the bottom of the visible screen on a phone ──
  let open = null;
  function openEditor(id, el, extra) {
    if (readOnly) return;
    closeViewer(false); closeEditor(false); hideChip();
    if (el) reveal(el);
    const note = noteOf(id), draft = data.drafts[id];
    const quote = extra && extra.quote, clip = quote && quote.length > 60 ? quote.slice(0, 59) + '…' : quote;
    const label = draft ? draft.label : note ? note.label : quote ? 'words "' + clip + '"' : labelOf(el);
    open = { id: id, label: label, el: el, extra: extra || extraOf(draft || note) };
    $('editor-where').textContent = where(id).at + ' · ' + label;
    editor.querySelector('.moved').hidden = !!el;
    editor.querySelector('[data-act="delete"]').hidden = !note;
    ta.value = draft ? draft.text : note ? note.text : '';
    editor.hidden = false;
    if (el) el.classList.add('noting');
    place();
    ta.focus({ preventScroll: editor.classList.contains('docked') });
  }
  function closeEditor(restore) {
    if (!open) return;
    const el = open.el;
    open = null; editor.hidden = true;
    document.body.classList.remove('docked'); document.body.style.paddingBottom = '';
    bar();
    if (el) { el.classList.remove('noting'); if (restore) el.focus({ preventScroll: true }); }
  }
  function place() {
    const docked = phone.matches || !open.el;
    editor.classList.toggle('docked', docked);
    document.body.classList.toggle('docked', docked);
    editor.style.left = editor.style.top = editor.style.bottom = editor.style.maxHeight = '';
    if (docked) {
      dock();
      document.body.style.paddingBottom = editor.offsetHeight + 24 + 'px';
      keepVisible();
      return;
    }
    const r = open.el.getBoundingClientRect(), w = editor.offsetWidth, vw = root.clientWidth;
    let left = r.right + 12, top = r.top;
    if (left + w > vw - 8) { left = Math.max(8, Math.min(r.left, vw - w - 8)); top = r.bottom + 8; }
    editor.style.left = left + window.pageXOffset + 'px';
    editor.style.top = top + window.pageYOffset + 'px';
  }
  // The visible screen: a phone keyboard shrinks it, and a host app may shrink the page too, so place from its top.
  function screen() {
    const vv = window.visualViewport;
    return vv ? { top: vv.offsetTop, h: vv.height } : { top: 0, h: window.innerHeight };
  }
  function dock() {
    if (!open || !editor.classList.contains('docked')) return;
    const s = screen();
    editor.style.maxHeight = s.h + 'px';
    editor.style.bottom = 'auto';
    editor.style.top = s.top + Math.max(0, s.h - editor.offsetHeight) + 'px';
  }
  function keepVisible() {
    if (!open || !open.el) return;
    const r = open.el.getBoundingClientRect(), s = screen(), limit = s.top + s.h - editor.offsetHeight - 8;
    if (r.bottom > limit) window.scrollBy(0, Math.min(r.top - s.top - 8, r.bottom - limit));
  }
  let seen = screen().h;
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', function () {
      const h = screen().h, keyboard = Math.abs(h - seen) > 100;
      seen = h; dock();
      if (keyboard) keepVisible();
    });
    window.visualViewport.addEventListener('scroll', dock);
  }
  ta.addEventListener('input', function () {
    if (!open) return;
    const note = noteOf(open.id), text = ta.value;
    if (!text.trim() || (note && text === note.text)) delete data.drafts[open.id];
    else data.drafts[open.id] = Object.assign({ label: open.label, text: text }, open.extra);
    persist();
  });
  editor.addEventListener('click', function (e) {
    const act = e.target.getAttribute('data-act');
    if (!act || !open) return;
    const id = open.id, note = noteOf(id), text = ta.value.trim();
    if (act === 'save') {
      if (!text) { ta.focus(); return; }
      if (!note) data.notes.push(Object.assign({ id: id, label: open.label, text: text }, open.extra));
      else if (note.text !== text) { note.text = text; delete note.sent; }
    }
    if (act === 'delete') data.notes = data.notes.filter(function (n) { return n.id !== id; });
    if (act !== 'close') delete data.drafts[id];
    closeEditor(true); persist();
    if (act === 'save' && live) toast('Saved. Tap Send notes to send it to the chat.');
    else if (act === 'save') {
      const n = unsent().length, k = oks().length;
      copyNotes(function () { toast('Saved and copied ' + plural2(n, k) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── drawings: fitted by font size on the page; a tap shows one full screen, where it zooms and scrolls natively ──
  const BASE = 13, drawings = [];
  let view = null;
  const V = { f: BASE, lo: BASE, hi: BASE };
  function size(art, f, max) {
    art.style.fontSize = f + 'px';
    for (let i = 0; i < 3 && art.offsetWidth > max; i += 1) { f *= max / art.offsetWidth; art.style.fontSize = f + 'px'; }
    return f;
  }
  function fit(d) {
    if (!d.fig.open || view === d) return;
    d.art.style.fontSize = BASE + 'px';
    const w = d.art.offsetWidth, fw = d.frame.clientWidth - 1;
    if (w > 0 && fw > 0) size(d.art, BASE * Math.min(1.25, fw / w), fw);
  }
  function reveal(el) {
    const fig = el.closest('details');
    if (fig && !fig.open) { fig.open = true; drawings.forEach(fit); }
  }
  function scale(f, cx, cy) {
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (vframe.scrollLeft + cx) * k - cx, y = (vframe.scrollTop + cy) * k - cy;
    V.f = f; view.art.style.fontSize = f + 'px';
    vframe.scrollLeft = x; vframe.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  function openViewer(d) {
    hideChip();
    view = d; viewer.hidden = false; document.body.classList.add('viewing');
    vframe.appendChild(d.art);
    d.art.style.fontSize = BASE + 'px';
    const fw = vframe.clientWidth - 1;
    V.lo = size(d.art, BASE * fw / Math.max(1, d.art.offsetWidth), fw);
    V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    vframe.scrollLeft = vframe.scrollTop = 0;
    scale(V.lo, 0, 0);
    vb[3].focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const d = view;
    view = null;
    d.frame.insertBefore(d.art, d.frame.firstChild);
    viewer.hidden = true; document.body.classList.remove('viewing');
    fit(d); bar();
    if (restore) d.enlarge.focus({ preventScroll: true });
  }
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target);
    if (i === 3) closeViewer(true);
    else if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], vframe.clientWidth / 2, vframe.clientHeight / 2);
  });
  vframe.addEventListener('wheel', function (e) {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const r = vframe.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively; two fingers pinch around their midpoint.
  let pinch = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  vframe.addEventListener('touchstart', function (e) { if (e.touches.length === 2) pinch = { f: V.f, dist: span(e.touches) }; }, { passive: true });
  vframe.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = vframe.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  vframe.addEventListener('touchend', function (e) { if (e.touches.length < 2) pinch = null; });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });
  all('.drawing', function (fig) {
    const frame = fig.querySelector('.frame'), enlarge = document.createElement('button');
    enlarge.type = 'button'; enlarge.className = 'enlarge'; enlarge.textContent = 'Full screen';
    frame.appendChild(enlarge);
    const d = { fig: fig, frame: frame, art: fig.querySelector('.art'), count: fig.querySelector('.count'), enlarge: enlarge };
    drawings.push(d);
    fig.addEventListener('toggle', function () { fit(d); });
    frame.addEventListener('click', function (e) { if (!e.target.closest('[data-open]')) openViewer(d); });
  });

  // ── direct links: #/why, #/<n>, #/decisions/<n> ──
  function jump(hash) {
    const m = /^#\/(?:decisions\/(\d+)|(\d+)|(why|changes|decisions))$/.exec(typeof hash === 'string' ? hash : location.hash);
    const el = m ? $(m[1] ? 'decision-' + m[1] : m[2] ? 'item-' + m[2] : m[3]) : null;
    if (!el) return;
    all('.hit', function (n) { n.classList.remove('hit'); });
    el.classList.add('hit');
    el.scrollIntoView({ block: 'start' });
  }

  // ── copy: saved notes only, as notes on the plan: each asks or changes something ──
  // A note sent through a reply link is in the chat already, so it is never copied or sent again.
  function unsent() { return data.notes.filter(function (n) { return !n.sent; }); }
  function snapshot() { return unsent().map(function (n) { return Object.assign({ id: n.id, label: n.label, text: n.text }, extraOf(n)); }); }
  // An OK not yet in the chat, as its card's id, in card order.
  function oks() {
    return Object.keys(data.ok).filter(function (id) { return data.ok[id] === true; }).sort(function (a, b) { return a.slice(5) - b.slice(5); });
  }
  function acknowledge(notes, okd) {
    notes.forEach(function (submitted) {
      data.notes.forEach(function (current) {
        if (current.id === submitted.id && current.label === submitted.label && current.text === submitted.text) current.sent = true;
      });
    });
    okd.forEach(function (id) { if (data.ok[id] === true) data.ok[id] = 'sent'; });
    persist();
  }
  function bullets(notes) {
    return notes.map(function (n) {
      const w = where(n.id), spot = n.x === undefined ? '' : ', spot at ' + n.x + '% across and ' + n.y + '% down on "' + n.on + '"';
      return '- ' + w.spot + spot + ' (' + n.label.slice(w.kind.length + 1) + '): ' + n.text.replace(/\s*\n\s*/g, ' ');
    });
  }
  // What goes to the chat: each OK on its own line, then the notes.
  function lines(notes, okd) {
    return okd.map(function (id) { return NOUN + ' #' + id.slice(5) + ': OK'; }).concat(bullets(notes)).join('\n');
  }
  function notesText() {
    const header = REVIEW ? document.body.getAttribute('data-header')
      : PREVIEW ? 'Notes on the preview of ' + NAME + ' from its review page. Don\'t publish yet.'
      : 'Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.';
    return header + '\n' + lines(unsent(), oks());
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  function plural2(n, k) { return !k ? plural(n) : (n ? plural(n) + ' and ' : '') + k + (k === 1 ? ' OK' : ' OKs'); }
  // One routine for Copy notes and Save: the Clipboard API, else select #copybuf and execCommand, then hand focus back.
  function copyNotes(done, failed) {
    const buf = $('copybuf');
    buf.value = notesText();
    const fallback = function () {
      const back = document.activeElement;
      buf.select();
      const ok = document.execCommand('copy');
      if (back && back !== buf && back.focus) back.focus({ preventScroll: true });
      if (ok) done(); else failed();
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(buf.value).then(done, fallback); else fallback();
  }
  // Nothing to copy or send: say why. True when it spoke.
  function nothing(verb) {
    if (unsent().length || oks().length) return false;
    toast(data.notes.length ? 'Every note is already sent.' : 'No saved notes yet. Drafts are not ' + verb + '.');
    return true;
  }

  // ── reply link: at a web address with #key=, the bar's button sends unsent notes to the chat that made the plan ──
  // `live` is the link's key while the link is open. The key stays in memory and this tab's session, never in a link.
  let live = null, connecting = false, pending = null;
  function setLive(key) {
    live = key;
    if (!key) hideActions();
    all('.copies', function (el) { el.textContent = key ? 'Send notes sends your saved notes to the chat.' : 'Saving a note copies all your notes.'; });
    bar();
  }
  // One request owns every reply control until the response body has been read.
  function busy(kind) {
    pending = kind;
    bar();
  }
  function linkKey() {
    if (!/^https?:$/.test(location.protocol) || !window.fetch) return null;
    const m = /(?:^#|&)key=([0-9a-f]{64})(?:&|$)/.exec(location.hash), at = 'wong-reply-key:' + location.pathname;
    try {
      if (m) window.sessionStorage.setItem(at, m[1]);
      return m ? m[1] : window.sessionStorage.getItem(at);
    } catch (e) { return m ? m[1] : null; }
  }
  function ask(path, key, body) {
    if (hosted) return hostedAsk(path, body);
    const headers = { 'x-reply-key': key };
    if (body) headers['content-type'] = 'application/json';
    return fetch(path, { method: body ? 'POST' : 'GET', cache: 'no-store', headers: headers, body: body ? JSON.stringify(body) : undefined });
  }
  async function sendNotes() {
    const notes = snapshot(), okd = oks(), n = notes.length, k = okd.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural2(n, k) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const r = await ask('send', live, { text: lines(notes, okd) });
      const changed = 'The ' + PAGE + ' changed. Reload to read it first.';
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { says(changed); toast(changed); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes, okd);
      says('Sent ' + plural2(n, k) + ' to the chat.');
      toast('Sent ' + plural2(n, k) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length, k = oks().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural2(n, k) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  // ── OK and Change on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Change ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Change</button>';
    item.appendChild(v);
  });
  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
  });
  // A picture file's spot pins sit over the picture itself.
  all('.art.photo img', function (img) {
    const shot = document.createElement('span');
    shot.className = 'shot';
    img.parentNode.insertBefore(shot, img);
    shot.appendChild(img);
  });

  // ── the page's own buttons, from the builder; one that can't be undone asks once more above the footer ──
  let version = null, confirming = null;
  const ACTIONS = JSON.parse($('ready').getAttribute('data-actions') || '[]');
  const actionOf = function (name) { return ACTIONS.filter(function (a) { return a.name === name; })[0] || null; };
  const choice = function (name) { return $('ready').querySelector('[data-ready="' + name + '"]'); };
  ACTIONS.forEach(function (a) {
    const b = document.createElement('button');
    b.type = 'button'; b.setAttribute('data-ready', a.name); b.setAttribute('data-label', a.label);
    if (a.confirm) { b.textContent = a.label; b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'ready-confirm'); }
    else b.innerHTML = '<span class="spinner" hidden aria-hidden="true"></span><span></span>';
    $('ready').insertBefore(b, $('ready-confirm'));
  });
  function fillConfirm(a) {
    confirming = a;
    $('ready-confirm').querySelector('p').textContent = a.confirm.say;
    $('ready-confirm').setAttribute('aria-label', a.confirm.ask);
    choice('yes').setAttribute('data-label', a.confirm.yes);
  }
  if (ACTIONS.filter(function (a) { return a.confirm; }).length) fillConfirm(ACTIONS.filter(function (a) { return a.confirm; })[0]);
  function says(text) { $('ready-message').textContent = text; $('ready-says').hidden = !text; }
  function closeActions(focus) {
    const wasOpen = !$('ready-confirm').hidden;
    $('ready-confirm').hidden = true;
    all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', 'false'); });
    if (focus && wasOpen && !$('ready').hidden && confirming) choice(confirming.name).focus({ preventScroll: true });
    bar();
  }
  function hideActions() {
    const focused = $('ready').contains(document.activeElement);
    closeActions(false);
    $('ready').hidden = true;
    if (focused) $('copy').focus({ preventScroll: true });
    bar();
  }
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('ready-confirm').hidden) { e.preventDefault(); closeActions(true); }
  });
  document.addEventListener('pointerdown', function (e) {
    if (!$('ready').contains(e.target)) closeActions(false);
  });
  $('ready').addEventListener('focusout', function (e) {
    if (e.relatedTarget && !$('ready').contains(e.relatedTarget)) closeActions(false);
  });
  // Only the row contributes to page padding; popovers and status never increase its height.
  function bar() {
    const el = $('copy').parentNode, waiting = connecting || !!pending;
    $('copy-label').textContent = connecting ? 'Connecting…' : pending === 'send' ? 'Sending…' : live ? 'Send notes' : 'Copy notes';
    $('copy').disabled = waiting;
    $('copy').querySelector('.spinner').hidden = !(connecting || pending === 'send');
    el.setAttribute('data-busy', String(waiting));
    $('copy').setAttribute('aria-busy', String(connecting || pending === 'send'));
    root.style.setProperty('--choices', $('ready-confirm').offsetHeight + 'px');
    $('ready-says').querySelector('.spinner').hidden = !waiting;
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready'), spinner = b.querySelector('.spinner');
      const active = !!spinner && pending === (step === 'yes' ? confirming && confirming.name : step);
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(active));
      if (spinner) {
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : b.getAttribute('data-label');
      }
    });
    const shown = $('ready').hidden ? 0 : $('ready').querySelectorAll('#ready > button:not([hidden])').length;
    el.style.setProperty('--cols', String(Math.min(3, 1 + shown)));
    if (el.offsetHeight) root.style.setProperty('--bar', el.offsetHeight + 19 + 'px');
  }
  // Each button shows when the link offers it; the choices stay hidden when it offers none.
  function offer(answer) {
    const names = answer && answer.actions;
    if (!Array.isArray(names) || typeof answer.version !== 'string') return;
    const shown = ACTIONS.filter(function (a) {
      choice(a.name).hidden = names.indexOf(a.name) < 0;
      return names.indexOf(a.name) >= 0;
    });
    if (!shown.length) return;
    version = answer.version;
    $('ready').hidden = false;
    bar();
  }
  async function act(name) {
    if (pending || connecting || !live) return;
    const notes = snapshot(), okd = oks();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length || okd.length) body.text = lines(notes, okd);
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? actionOf(name).done
        : r.status === 409 && a.changed === true ? 'The ' + PAGE + ' changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes, okd);
      hideActions(); says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready'), a = actionOf(step);
    if (step === 'yes') act(confirming.name);
    else if (step === 'cancel' || a.confirm) {
      says('');
      if (a) fillConfirm(a);
      $('ready-confirm').hidden = step === 'cancel';
      all('#ready > [aria-controls]', function (b) { b.setAttribute('aria-expanded', String(b === button)); });
      bar();
      choice(step === 'cancel' ? confirming.name : 'cancel').focus({ preventScroll: true });
    } else act(step);
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      if (view) { const d = view; closeViewer(false); openViewer(d); }
    }
    drawings.forEach(fit);
    if (open) place();
    bar();
  });
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' ? { changed: true } : state === 'done' ? { done: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      post({ type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' });
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) { load(m.value); render(); }
    else if (hosted.reply && m.type === 'inbox:result') { const reply = hosted.reply; hosted.reply = null; reply(m.state); }
  }
  // Back and the workspace sit first in the page, so they scroll away with its words; the inbox's own bar stays put.
  function backRow(workspace) {
    const row = document.createElement('div'), back = document.createElement('button');
    row.className = 'back'; back.type = 'button'; back.className = 'btn-ghost'; back.textContent = 'Back';
    back.addEventListener('click', function () { post({ type: 'inbox:back' }); });
    row.appendChild(back);
    if (typeof workspace === 'string' && workspace) {
      const where = document.createElement('span');
      where.className = 'muted'; where.textContent = workspace; row.appendChild(where);
    }
    document.querySelector('main > header').prepend(row);
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    hosted = { reply: null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    backRow(m.workspace);
    // A closed page in the inbox's Archive opens read-only: no button, no note.
    if (m.readOnly === true) { readOnly = true; document.body.classList.add('read-only'); render(); return; }
    setLive('inbox'); offer(m); render();
  });
  // In a frame, a link opens its own tab and a # link scrolls in place: the frame never leaves this page.
  // A srcdoc page resolves #why against the inbox's address, so following it would load the inbox here.
  document.addEventListener('click', function (e) {
    const a = window.parent !== window && e.target.closest ? e.target.closest('a[href]') : null;
    if (!a) return;
    const href = a.getAttribute('href');
    if (href.charAt(0) !== '#') { a.target = '_blank'; a.rel = 'noopener noreferrer'; return; }
    e.preventDefault();
    if (href.charAt(1) === '/') { jump(href); return; }
    let el = null;
    try { el = document.getElementById(decodeURIComponent(href.slice(1))); } catch (err) { /* a bad escape names nothing */ }
    if (el) el.scrollIntoView({ block: 'start' });
  }, true);
  window.addEventListener('hashchange', jump);
  render();
  jump();
  const key = linkKey();
  if (key) {
    connecting = true; says('Connecting to the chat…'); bar();
    (async function () {
      try {
        const r = await ask('alive', key);
        if (!r.ok) return;
        const answer = await r.json();
        if (!answer || typeof answer !== 'object') return;
        setLive(key); offer(answer);
      } catch (e) { /* not live: the page copies */ }
      finally { connecting = false; says(''); bar(); }
    }());
  }
}());
</script>
</body>
</html>

~~~
<!-- end review.html -->
