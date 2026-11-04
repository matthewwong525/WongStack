# The knowledge reader

The Knowledge app shows [company knowledge](company-knowledge.md) in the company app, at `/apps/knowledge/`: every page by folder, a search box, and each page as the newest save has it. A page marked public also opens for anyone at `/public/<page>`, with no sign-in.

## What it reads

It reads the knowledge repository's `main` at its newest save, on each open. A save from any chat shows on the next open, with no publish. It reads that repository only: WongStack's own [wiki](../README.md) pages stay in the code repository.

- **The list** holds every `.md` page, by folder. A name that starts with `.` is skipped. It reads the first 2,000 pages and 200 folders, and says so past that.
- **A page's address** is its path without `.md`: `how-we-work/refunds.md` opens at `/apps/knowledge/how-we-work/refunds`. A folder's `README.md` opens at the folder.
- **Search** finds a page by its title or its words, and shows the line that matched. The first search after a save reads every page, so it is slower; the next ones are fast.
- **Links** between pages open in the app, with no reload. A link that leaves the repository, such as to `../wiki/`, shows as plain text.
- **Diagrams** in a `mermaid` block draw as pictures. **Pictures** show when they are `png`, `jpg`, `gif` or `webp`.
- **Raw HTML** in a page shows as text, and a link to an unsafe address, such as `javascript:`, shows as text. Anyone with **Project code** can save a page, so a page must not run code in a reader's browser.

The app's core hands the Knowledge app's routes [a reader](../../app/worker/employee-access/knowledge-reader.ts) with three reads: the newest save, a folder, and a file. The routes never get the repository's binding, so the Knowledge app can not save a page, make a token, or read the code repository. The reader follows [`knowledgeSource()`](../../app/worker/employee-access/knowledge.ts), the same rule the Git address uses. A preview has no knowledge repository, so the app says *Knowledge is not set up yet* there. Check real pages on the live app after publish.

## Who can read it

The [Access screens](access-screens.md) decide, like any [mini app](mini-apps.md): the owner has it from the start, and a teammate gets it when the owner ticks **Knowledge** for them or gives it in a role. A teammate without it sees no card, and every route refuses them. Its list, page and search are [company actions](company-api.md), so a skill can read pages with the person's own access, with no copy of the repository.

## Public pages

A page is public when its first lines are frontmatter with a bare `public: true` line:

```markdown
---
public: true
---
# Welcome
```

Save it as usual ([save a page](company-knowledge.md#save-a-page)). It then opens for anyone at `/public/<address>`, such as `/public/welcome`, with no sign-in. The app shows its public address beside a **Public** tag.

- **Every other path gets the same *not found* page**: a private page, a missing page, a folder, a picture, or an app with no knowledge repository. A private page's name never leaks.
- **A public page leaves out pictures** and shows a diagram as its text, because the plain server page runs no code. A link to another page goes to that page's public address, which opens only if that page is public too.
- **No copy stays in a cache.** Remove `public: true` and save: the page closes at the next open.

The route skips the sign-in wall on both Access apps ([the bypass table](cloudflare-access.md#4-bypass-the-public-surface)). Setup's Access step adds it. An install whose Access step ran before this feature still publishes, but each publish warns that public pages still ask for the sign-in. Run the Access step once to open them, after the update that brings this reader is live; until then they stay closed. Run it before, and the publish check, still the old one, refuses every publish and preview.
