# Every reply-link page opens in your inbox; Open and Artifacts

**Status:** ready-to-ship
**Branch:** reply-links-skip-the-tunnel
**Open questions:** none

## Why

Today only a plan's review page opens in your Inbox. Any other page a chat opens with a reply link, such as a form or a list to approve, starts a Cloudflare tunnel, and the Inbox lists only its address. A signed-out computer starts a tunnel even for a plan. A tunnel is slow to start, stops when the computer sleeps, and needs `cloudflared` on every computer. A project with a company app already has a better place for every page: the Inbox, behind the company sign-in. ClaymooApp made this change on 2026-11-24 and it works well there, so every WongStack install gets it too.

## What Changes

- **Every page opens in your Inbox.** A plan, a built preview, a page for other work, and a page a chat wrote itself all open in the Inbox, titled by the page's own title. The page's buttons reach the same chat as before. The page's file never changes.
- **A project with an app never starts a tunnel for a reply link.** Signed out, or with the Inbox out of reach, the chat gives you the page's file and the sign-in link, and takes your answer in the chat.
- **A project with no app keeps its tunnel**, as before.
- **The Inbox's lists are *Open* and *Artifacts*.** *Needs you* becomes *Open*: each page that still waits on you, newest first. With none, it says *Nothing open.* The Archive becomes *Artifacts*: every closed page, newest first. Search finds a page, open or closed, and no page shows twice.
  | Before | After |
  |---|---|
  | *Needs you* | *Open* |
  | *Nothing waits for you.* | *Nothing open.* |
  | Archive | *Artifacts* |
  | *Search reviews by title* | *Search artifacts by title* |
- **A build need can be *Optional*.** A plan's *What the build needs* item marked *Optional* shows its form, and the build buttons never wait for it.

Non-goals: no change to private links or live views, which keep their tunnel; no new Inbox route or item kind; no type filter in *Artifacts*.

## What the build needs

- **Nothing.**

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `reply-links`: every reply-link page opens in the person's inbox in a project with an app, which never opens a tunnel; a project with no app keeps the tunnel; a shipped plan leaves *Open*.
- `inbox`: the waiting list is *Open* and the past list is *Artifacts*.
- `team-shared-pages`: a plain page goes to *Artifacts*, and its row says *Shared* there.

## Impact

- `.agents/skills/reply-link/scripts/reply-link.mjs`: any page file goes to the inbox as a `plan` item, with the new `lib/bridge.js` first in its `<head>` in the uploaded copy only; `openLink` goes inbox-only when `hasApp(cwd)`, with `REPLY_REASON=signed-out` or `inbox-down`; `listPage` and `unlist` go; new `openReviewLink`; `PROTOCOL` 16 → 17.
- `.agents/skills/reply-link/scripts/lib/inbox.mjs`: `hasApp(cwd)`.
- `.agents/skills/plan/`, `.agents/skills/apply/`, `.agents/skills/explore/`: `build-review.mjs` `linked()` calls `openReviewLink`, returns `{link, reason}` and prints a sign-in line when signed out; `Optional` need state; `preview-review.mjs` prints the same lines; the ask convention's link line.
- `app/src/apps/inbox/`: `Archive.tsx` → `Artifacts.tsx`, *Needs you* → *Open* in `Waiting.tsx`, tests and comments.
- `wiki/`: `reply-links.md` (split: the page-author half moves to a new `reply-link-pages.md`), `review-pages.md`, `plain-pages.md`, `daily.md`, `first-day/use-skills.md`, `required-tools.md`, `stack/mini-apps.md`.
- `CHANGELOG.md`: a `minor` entry. `scripts/retired-names.json`: two retired names.

## Decision log

- **2026-11-24** — Assumed: port ClaymooApp's change as it shipped (PR #2509), less its ClaymooApp-only parts, because the owner asked for the generic parts upstream.
- **2026-11-24** — Assumed: a WongStack project has an app when its primary checkout holds `scripts/company-api.mjs` and its `.claude/.wong-stack.json` records an app (`components.companyApi.origin`, or `components.memory.worker` on an older install), because every install ships the helper, so the file alone says nothing.
- **2026-11-24** — Assumed: `PROTOCOL` goes from 16 to 17, below ClaymooApp's 20, so a ClaymooApp copy on the same computer still wins.
- **2026-11-24** — Assumed: the sign-in line names `node scripts/company-api.mjs login`, WongStack's own sign-in command.
- **2026-11-24** — Assumed: split `wiki/development/reply-links.md` at *Open one for another page* into `reply-link-pages.md`, as ClaymooApp has it, because the new lines take the page past the 3,000-word cap; the old heading stays as an entry point.
- **2026-11-24** — Assumed: the *Optional* need line goes in `wiki/review-pages.md`, not the plan's `review-page.md` reference, because skill instructions are at their word budget.
- **2026-11-24** — Assumed: the loop module goes to 3.6.0, a minor: its builders print a sign-in line and take an *Optional* need.
- **2026-11-24** — Assumed: *Artifacts* names the inbox list as in ClaymooApp, though the wiki has an unrelated *Artifacts route* install page, so a synced repo keeps one name.
