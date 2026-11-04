## 1. Before building

- [x] 1.1 Read what the "Company knowledge in its own repo" part shipped: the knowledge repo's binding, its name var, its branch, and the folder pages sit in. Replace the assumed `ARTIFACTS` / `WONG_KNOWLEDGE_REPOSITORY` / `main` / repo root in design.md and these tasks; a difference that changes behavior goes back to the plan as a note, not a guess
- [x] 1.2 Against a real Artifacts repo, through the REST API with the `.env` token: read `log`, `readCommit` and `readTree` answers and write their shapes into `source.ts`'s types. If a commit gives no root tree hash, stop and report before task 2.2

## 2. Worker: reading and rendering

- [x] 2.1 `app/worker/apps/knowledge/source.ts`: the head commit through the read-only reader core makes from `knowledgeSource(env)` (`app/worker/employee-access/knowledge-reader.ts`) and hands only the Knowledge app's routes and `publicKnowledge`, or `null` on a preview or with no knowledge repo; no lint allow; `path` checks (no `..`, leading `/`, `.git`, empty)
- [x] 2.2 `list.ts`: depth-first tree walk, `.md` only, 2,000-page and 200-folder caps, kept in the Worker's memory per head commit (the Cache API does not work behind Access)
- [x] 2.3 `render.ts` with `marked`: frontmatter parse and strip (bare `public: true`), raw HTML as text, URL scheme allow-list, `.md` links rewritten for the app or the public address, `mermaid` fences as `pre.mermaid`, images to `api/file` in the app and alt text in public; add `marked` to `app/package.json`
- [x] 2.4 `search.ts`: build the index per head commit (6 reads at a time, text stripped of Markdown), keep it in the Worker's memory, scan it, return up to 20 hits with title and matching line; past the cap, say so
- [x] 2.5 `api.ts`: `GET pages`, `GET page`, `GET search`, `GET file` described with the shared contract, so each is a company action; `file` serves `png`, `jpg`, `gif`, `webp` only
- [x] 2.6 `public.ts`: `publicKnowledge(request, env)`: `GET` only, `<path>.md` or `<path>/README.md`, shown only with `public: true`; one fixed 404 for every other case; self-contained HTML with the CSP and `no-store` headers from design.md
- [x] 2.7 `app/worker/index.ts`: answer `/public/*` with `publicKnowledge` before the sign-in check; allow that one import in `app/.oxlintrc.json` if the app-folder rule blocks it, with a `Check:` line in the Decision log
- [x] 2.8 Tests beside each file: a fake binding with a small repo (nested folders, a public page, a private page, a mermaid fence, raw `<script>`, a `javascript:` link, an image, an `svg`); a new head commit shows the edit with no other change; path checks refuse `..`; a private, missing or folder path on `/public/` gets the identical 404 body and status; no page HTML holds a live `<script>` or event attribute; a caller without the `knowledge` app is refused on every route; `index.test.ts` covers `/public/*` with no sign-in and that no other path opens

## 3. Screen

- [x] 3.1 `app/src/apps/knowledge/app.json` (title *Knowledge*, one-line description) and `App.tsx`: the list by folder with the search box, results with their line, a page view with *All pages*, the *Public* tag and its address, *Saved …* from the head date, *not there* with the list, and *Knowledge is not set up yet* when there is no repo. Build it from the app's parts, by `design.md`'s `## UX` and the approved prototype
- [x] 3.2 Links inside a page navigate within the app (no full reload); `/apps/knowledge/<path>` opens that page directly
- [x] 3.3 Load `mermaid` with `import()` only when the page holds a `pre.mermaid`, `securityLevel: 'strict'`; add `mermaid` to `app/package.json`; confirm the main bundle does not grow by it
- [x] 3.4 `App.test.tsx`: list, search results, a page, a link click, not there, not set up, a mermaid page calls the drawer and a page without one does not

## 4. Access setup and checks

- [x] 4.1 `.agents/skills/wong-setup/scripts/private-access.mjs`: add `{ behavior: 'public', path_pattern: '/public/*' }` to both apps' routes; its test
- [x] 4.2 `scripts/check-private-access.mjs`: expect the same route on both apps; a missing one warns and names the Access step, so an install not yet re-run still publishes, closed; its test
- [x] 4.3 Add `/public/*` to this repo's own two Access apps by running the Access step, after a confirm

## 5. Words and release

- [x] 5.1 New `wiki/stack/knowledge-reader.md`: what the reader reads, newest save, who can read, what is public and how to mark it, what a public page leaves out; link it from `wiki/stack/README.md` and `wiki/stack/mini-apps.md`
- [x] 5.2 `wiki/stack/cloudflare-access.md`: a third row in the bypass table, `/public/*`, and why
- [x] 5.3 `.agents/skills/memory/references/areas.json`: a `knowledge-reader` area naming the new folders, the wiki page and the spec
- [x] 5.4 `CHANGELOG.md` `## Next (minor) — A live reader for company knowledge`, with an **Updating.** note in plain words: tick Knowledge for the people who should read it, and run the Access step once so public pages open

## 6. Verification

- [x] 6.1 Run the app's checks and `node .github/scripts/checks.mjs --worktree`; fix what fails
- [ ] 6.2 `/save`, then on the preview: the Knowledge card opens and says knowledge is not set up (previews get no knowledge binding); `/public/<anything>` gives the not-found page with no sign-in; a teammate without the app is refused
