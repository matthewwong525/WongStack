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
