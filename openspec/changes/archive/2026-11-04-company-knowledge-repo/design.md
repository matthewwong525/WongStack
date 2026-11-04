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
