# Company knowledge

Company knowledge is the team's own pages (people, customers, how the company works) in a repository of its own, which a save makes live at once, with no pull request. Pages about the code stay in [the wiki](../README.md), through [the gate](../development/the-change-loop.md#the-gate).

## What goes there

A fact goes in `knowledge/` when it is about the company, not the code: a person and how they like work done, a customer, a supplier, a process, a price. Pages and pictures only (`.md`, `.png`, `.jpg`, `.gif`, `.webp`); a script or a config file goes in the code repository, through a pull request. The [wiki rules](../wiki-style.md#repeatable-knowledge) say what makes a fact repeatable, and they apply to these pages too: a hub `README.md` in each folder, every page linked, no orphans.

People pages live in `knowledge/people/`. The [memory digest](../development/memory.md) reads the current person's page from there first, then from `wiki/people/`. [Memory search](../development/document-retrieval.md) finds every other knowledge page, never a people page.

## Where it lives

Setup makes the repository `<repo>-knowledge` in the account's Cloudflare Artifacts, with one empty first commit, and binds only the live app to it ([provisioning](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md)). Previews have no binding, so they answer `code_unavailable`: a preview never reads or changes company knowledge. Every install needs Cloudflare's paid plan for this ([what it costs](getting-started.md)).

The app hands it out at `/api/access/knowledge/git/`, beside [the project's Git address](project-git-route.md). Every call, a save included, needs the **Project code** tick on [the Access screens](access-screens.md); a service token is refused. A save may only move `main` forward: a new branch, a tag, a delete or a second ref is refused. The app logs each save as `knowledge_saved` and each refusal as `knowledge_refused`, with who and the commit.

## The copy on your computer

Each computer keeps one copy, in the primary checkout's `knowledge/` folder (git-ignored). Each workspace gets a `knowledge` link to that copy (a junction on Windows), so every chat on the computer sees the same pages. The workspace setup step and each chat's start make the link; you can also run it:

```bash
node .claude/skills/memory/scripts/knowledge.mjs status   # the copy, its link, unsaved pages, and whether the app answers
node .claude/skills/memory/scripts/knowledge.mjs update   # make the copy, or move it to the newest saved version
```

Git reaches the app with the copy's own sign-in helper, [`company-git-credential.mjs`](../../scripts/company-git-credential.mjs), set for that address alone. No sign-in goes in a URL, a config file or an argument. When a chat starts, the copy moves to the newest version in the background; a copy with unsaved edits is left as it is, and the chat names those pages in one line.

## Save a page

The assistant picks the pages and the words; the script does every git step:

```bash
node .claude/skills/memory/scripts/knowledge.mjs save knowledge/people/ada.md knowledge/people/README.md -m "Add Ada's page"
```

A save takes only the pages you name, so two chats on one computer never save each other's edits. It puts them on top of the newest published version, checks the links by [the wiki rules](../wiki-style.md#no-orphans-no-dead-ends-full-hub-coverage), and publishes with no force. It prints:

- `saved=<commit>`, each `page=`, and the undo line: the pages are live for the team now. Tell the person which pages changed and how to undo it.
- `broken=<problem>`: nothing was published. Fix the link (often a hub line for a new page), then save again.
- `pending=<commit>`: the app could not be reached, or the sign-in ran out. The save is kept, and the next save or update publishes it.
- `refused=`: not a page or a picture, or outside `knowledge/`.

## When two saves meet

Saves to different pages, or to different lines of one page, both go live with no extra step. When someone else saved the same lines first, the script prints `conflict=<page>`: the page now holds their version, and `<page>.mine.md` holds yours. Write one page that keeps both, delete the `.mine` file, then save the page again. Nothing is lost, and the later save never overwrites the earlier one.

## Undo a save

Each save prints its commit. `knowledge.mjs undo <commit>` takes that one save back as a new save, live at once. When a later save changed the same lines, edit the page by hand instead.

## Restore a lost history

The repository can't refuse a forced push on its own, so the copy keeps watch: `update` notices when the published history no longer holds what this computer last saw, and prints `rewritten=`. `knowledge.mjs restore` then puts the lost saves back as a merge on top of what is published now, with no force.

## Move an older install's pages

An install from before the knowledge repo keeps its own pages in the code repo, in `wiki/` or `docs/`. The update's [catch-up step](../../.agents/skills/wong-sync/references/catch-up.md) `own-pages` moves them, with [`knowledge-move.mjs`](../../.agents/skills/wong-sync/scripts/knowledge-move.mjs):

1. **The plan lists.** `knowledge-move.mjs plan --target . --source <source path>` writes nothing. It prints each page that moves (`moves`, with `counts` by folder), each file that stays and why (`stays`), the link fixes (`rewrites`), and what needs a person (`hand`, `outside`). Put the counts and the stays in the plan, and make each `hand` and `outside` item a task.
2. **A held move waits.** When the app shows the whole wiki from the code repo (`replacedReaders`) and WongStack ships no live reader yet, the plan says `held`. List the pages and say they wait for the live reader; nothing moves. The install record keeps `components.knowledgeMove: 'held'`, so the next update asks again; the move drops it. A held update also leaves WongStack's pages in `docs/` (`wiki-elsewhere`) and the record keeps its docs folder setting: without it, the next update looks for your pages in `wiki/`, finds none, and never moves them.
3. **The build moves.** When the update also moves WongStack's pages out of `docs/` (`wiki-elsewhere`), both moves run in this update, that one first, so the moved pages link them at their place in `wiki/`. Make the copy if it is missing (`knowledge.mjs update`), then run `knowledge-move.mjs move` with the same arguments. It copies each page to `knowledge/`, deletes it from the code repo, fixes each link and path it listed, and writes the moves list. It makes no git commit and no save, and never touches a `hand` item.
4. **You finish by hand.** Do each `hand` task. Move each page in `stays` that a reader reads to the place it names, beside that reader. Fix the problems `move` prints for both wikis, then save the pages it printed with `knowledge.mjs save`.
5. **Recopy before publish.** `knowledge-move.mjs recopy --target . --main origin/main` carries each edit a teammate saved to a moved page in the code repo since the move. Save again if it carried a page. When a page changed in both places, it stops, names the page, and writes nothing: merge the two by hand.

Pages the payload ships stay in the code repo. A page that your code reads as it runs (an `import ...?raw`, a `readFile`, a pattern, or a config value) stays with that code, so the app keeps working and an edit goes through [the gate](../development/the-change-loop.md#the-gate).

### Old paths

The moves list, `.agents/knowledge-moves.json`, maps each old path to its new place, and it never gets shorter. Past plans, finished changes and memory keep their old paths; `memory.mjs areas <old path>` prints the new place. The wiki check fails on a file at an old path and names the new place, so a chat that started before the move can't put a page back in the code repo.

## When the sign-in runs out

Chats keep reading the last copy. Nothing opens a browser or waits for one: saves print `pending=` until you sign in again with `node scripts/company-api.mjs login`, and the next update publishes them.
