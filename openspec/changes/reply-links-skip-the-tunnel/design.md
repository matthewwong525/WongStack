# Design

## Context

ClaymooApp shipped this as merge commit `35fb01a6d` (PR #2509, archived change `2026-11-24-review-pages-skip-the-tunnel`). WongStack has the same reply-link code: `openInboxItem` sent a page to the inbox only when its file started with `<!-- wong-review:3 -->`. Every other page fell through `openLink` to `ensureServer`, which starts `cloudflared`, and `listPage` listed that tunnel link in the inbox. A signed-out computer started a tunnel even for a plan.

The inbox shows a page in a sealed frame (`app/src/apps/inbox/PlanView.tsx`, `frame.ts`). After load it posts `inbox:hello` with a `MessagePort`, the item's `version`, `actions` and `readOnly`. The page answers with `inbox:tap {action, text}`, and the inbox replies `inbox:result {state}`. The review kit's hosted adapter is the one page that speaks this today.

## Goals / Non-Goals

**Goals:** every reply-link page opens in the inbox; a project with a company app never starts a tunnel for a reply link; the inbox's lists read *Open* and *Artifacts*, as in ClaymooApp.

**Non-goals:** private links and live views, which keep their tunnel; new inbox routes or item kinds; ClaymooApp's own pages (its email draft, standup and statement pages).

## Decisions

### D1. Any page file goes to the inbox as a `plan` item

Drop the review-kit gate. A kit page uploads as before. Any other page uploads with the page bridge (D2) first in its `<head>`, at upload time only: the file on disk stays as written, so its `version` hash and the no-app tunnel path are unchanged. The item keeps kind `plan`, so *Artifacts*, Share and the read-only view work with no app change. `titleOf` already reads a page's `<title>`.

### D2. A page bridge, not a page rewrite

`reply-link/scripts/lib/bridge.js`, inlined at upload, makes a hand-written page work in the frame:

- It sets `window.REPLY_KEY = 'inbox'` before the page's own script runs. A page reads its key as `window.REPLY_KEY || new URLSearchParams(location.hash.slice(1)).get('key')`, the documented contract in `wiki/development/reply-link-pages.md`.
- It wraps `fetch` for the relative `alive`, `send` and `act` only, and passes every other call through. `alive` waits up to 10 s for `inbox:hello`, then answers from it, or `410` when `readOnly`. `send` and `act` post `inbox:tap` and answer from `inbox:result` with the kit's status map (`sent` 200, `changed`/`done`/`gone` 409, `soon` 429, `closed`/`expired` 410, else 502).
- It turns a `#` link into a scroll and opens other links in a new tab.

The bridge carries no notes storage and no files. A page that needs a file question is a review page for other work.

### D3. No tunnel where the project has an app

`openLink` decides by the project, not by the sign-in. `companyFor` returns null both for a project with no app and for a signed-out one, so `hasApp(cwd)` in `lib/inbox.mjs` tells them apart. Every WongStack install ships `scripts/company-api.mjs`, so the helper alone says nothing: `hasApp` is true when the primary checkout holds the helper and its `.claude/.wong-stack.json` records an app, `components.companyApi.origin` or, on an older install, `components.memory.worker`.

- Has an app → inbox only. Signed out → `REPLY_LINK=none`, `REPLY_REASON=signed-out`; an inbox that does not answer or take the page → `REPLY_REASON=inbox-down`. The plan and preview builders print the file and a line that asks the chat to give the `node scripts/company-api.mjs login` link.
- No app → the tunnel path as before (`ensureServer`), with no inbox listing. `no-cloudflared` and `tunnel-down` stay, for no-app projects only.
- `listPage` and `unlist` go: a project with an app has no tunnel pages to list, and one without has no inbox.
- `openReviewLink` returns `{link, reason}`, so the builder can tell signed out from the rest; `openReplyLink` keeps returning the link or null for every other caller. The loop profile's `reviewLink` calls `openReviewLink`; `linked()` still takes a bare string from an older profile.
- `PROTOCOL` goes 16 → 17, so an older page server or inbox helper is replaced at the next open. It stays below ClaymooApp's 20.

### D4. Open, then Artifacts

The set of open items is already right: the computer ends an item when its chat is gone, its deadline passes, or a tap reaches the chat. So this is a naming and docs change, with no handler change.

- `Waiting.tsx`: the *Needs you* heading becomes *Open*, with the same count; its empty text becomes *Nothing open.*
- `Archive.tsx` becomes `Artifacts.tsx`: heading *Artifacts*, search label *Search artifacts by title*, empty texts *No artifacts yet.* and *No artifact matches.* It keeps today's rule: closed pages, plus open ones only in a search, so no page shows twice.
- The *Needs you* label on a review page's *What the build needs* item stays: it names what the build needs, not the inbox list.

### D5. An Optional build need

`build-review.mjs` takes `**<what>**: Optional` beside *Ready* and *Needs you*. It draws the item's form with an *Optional* tag and `data-need="optional"`. The kit counts only `data-need="needs"`, so the build buttons never wait for it.

### D6. Docs

`wiki/development/reply-links.md` loses the tunnel-first framing: every page opens in the inbox; signed out → the file and the sign-in link; no app → tunnel. The new lines take it past the 3,000-word cap, so its *Open one for another page* half moves to `reply-link-pages.md`, as ClaymooApp has it, with the `window.REPLY_KEY` line, the bridge and the new reasons. The old heading stays as an entry point, and old changelog links move to the new page.

## Risks / Trade-offs

- **A hand-written page that fetches other relative paths** breaks in the frame. The bridge passes them through, and they fail as they would offline.
- **A signed-out computer gets no link.** Before, it got a tunnel. The chat says how to sign in.
- **An install with its own `.claude/loop/profile.mjs`** keeps `openReplyLink` for `reviewLink` until it takes the new line, and so gets no sign-in line. The changelog's *Updating* note says so.

## Migration Plan

None in the app: no route or table changes. The raised `PROTOCOL` replaces an older running helper at the next open.

## Open Questions

None.
