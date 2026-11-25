<!-- openspec-archive v1 2026-11-25-reply-links-skip-the-tunnel -->
<!-- file proposal.md utf8 5455 -->
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
- **2026-11-25** — Assumed: archive checkpoint after bringing in main's one-stack update (62.0.0): `linked()` calls `openReviewLink` straight, as profiles are gone; the loop version bump and profile line drop; file-page text from 62.1.0 says *Artifacts*.
- **2026-11-25** — Check: the kept check `team-shared-pages/a-plain-page-arrives` is replaced: it now also expects *Nothing open.*, because its promise names *Artifacts* and the empty Open list; nothing it checked before is dropped.

<!-- end proposal.md -->
<!-- file design.md utf8 6012 -->
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
- `openReviewLink` returns `{link, reason}`, so the builder can tell signed out from the rest; `openReplyLink` keeps returning the link or null for every other caller. `linked()` calls `openReviewLink` straight, and still takes a bare string.
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

## Migration Plan

None in the app: no route or table changes. The raised `PROTOCOL` replaces an older running helper at the next open.

## Open Questions

None.

<!-- end design.md -->
<!-- file tasks.md utf8 2751 -->
# Tasks

## 1. Reply links

- [x] 1.1 `reply-link.mjs`: any page file goes to the inbox as a `plan` item, with `lib/bridge.js` first in its `<head>` in the uploaded copy only. Verify in `reply-link-inbox.test.mjs`: the uploaded body starts with the bridge, the file and its version stay as written, and a review-kit page gets no bridge.
- [x] 1.2 Add `lib/bridge.js`. Verify a jsdom case: `alive` waits for the hello, `send` and `act` answer from the port, an old version answers 409, other calls pass through, a link opens its own tab, and a closed page answers 410.
- [x] 1.3 Add `hasApp(cwd)` to `lib/inbox.mjs`; `openLink` goes inbox-only when it is true, with `signed-out` and `inbox-down`; remove `listPage` and `unlist`; add `openReviewLink`; raise `PROTOCOL` to 17. Verify: an app project signed out or with the inbox down never calls the tunnel; a no-app project still gets one; `hasApp` answers for a subfolder, an older install, a helper alone, and a folder outside a checkout.

## 2. The loop

- [x] 2.1 `build-review.mjs`: `linked()` returns `{link, reason}` and still takes a bare string; `linkLines` adds the sign-in line when signed out; an `Optional` need. `preview-review.mjs` prints `previewLines`. `linked()` calls `openReviewLink`. Verify in `review.test.mjs` and `preview-review.test.mjs`, the `--link` tunnel case run outside a checkout.
- [x] 2.2 Update the loop README's `reviewLink` row and the ask convention's link line, within the instruction budget. Verify `node scripts/measure-context.mjs --check`.

## 3. Inbox

- [x] 3.1 `Waiting.tsx`: *Open* and *Nothing open.*; `Archive.tsx` → `Artifacts.tsx` with its heading, search label and empty texts; tests, comments, `payload-files.json` and the verification journeys follow. Verify `npm test` in `app/`.

## 4. Docs and release

- [x] 4.1 `wiki/development/reply-links.md`: every page in the inbox, signed out, no-app tunnel, new reasons, *Open* and *Artifacts*; move its page-author half to `reply-link-pages.md` with the key line and the bridge; link the new page from the development hub, the seed hub and `payload-files.json`. Verify `node .github/scripts/wiki-links.mjs` and `node scripts/check-payload-links.mjs`.
- [x] 4.2 Rename the inbox lists in `review-pages.md` (and the *Optional* need), `plain-pages.md`, `daily.md`, `first-day/use-skills.md`, `stack/mini-apps.md`; `required-tools.md` says a reply link needs `cloudflared` only with no app.
- [x] 4.3 Retire `inbox/Archive.tsx` and *Nothing waits for you* in `scripts/retired-names.json`; add a `## Next (minor)` entry to `CHANGELOG.md`. Verify `node scripts/check-retired-names.mjs`.

## 5. Checks

- [x] 5.1 Run `node scripts/payload-checks.mjs`, oxlint, the script tests and the app's tests; all pass.

<!-- end tasks.md -->
<!-- file specs/inbox/spec.md utf8 3981 -->
## RENAMED Requirements

- FROM: `### Requirement: The inbox keeps past review pages in an Archive`
- TO: `### Requirement: The inbox keeps past pages in Artifacts`

## MODIFIED Requirements

### Requirement: Items close on their own

A plan item SHALL close once a tap on it, notes or an action, reaches its chat, when its link's time runs out, or when its chat closes. A plan whose tap did not arrive SHALL stay open. An approval or question SHALL close once its answer reaches the chat, when its chat closes, or when the daily watch that sent it ends. A closed item SHALL leave *Open*. A closed review page SHALL be kept with its page and its answers, and SHALL never be deleted; any other closed item SHALL be removed after a day. A plan the chat updates and opens again SHALL come back as a new item.

#### Scenario: The answer arrived

- **WHEN** an approval's tap is delivered
- **THEN** the approval leaves the inbox, and a day later it is gone

#### Scenario: Notes on a plan arrived

- **WHEN** the person sends notes on a plan and the chat gets them
- **THEN** the plan moves to *Artifacts* with its page, and its updated version waits as a new entry once the chat opens it again

### Requirement: An archived review page opens read-only

An archived review page SHALL open in the same view as an open one, showing the same page. It SHALL offer no action and take no notes, and no tap on it SHALL ever reach a chat. Above the page it SHALL say what reached the chat and when, with any notes sent, or that no answer came and when it closed. A page whose answer has just reached the chat SHALL look the same at once, before it moves to *Artifacts*.

#### Scenario: Opening an answered page

- **WHEN** the person opens a page they answered with *Build and publish* and notes
- **THEN** the page shows read-only under the answer, its time and the notes, and offers no button

#### Scenario: Just answered

- **WHEN** the person taps *Approve* on a page in the inbox and the chat gets it
- **THEN** the page shows read-only under *Approve* and its time, with no *Send notes* and no *Remove* on a sent file

#### Scenario: An older page tries to send

- **WHEN** an archived page built before this change sends its notes
- **THEN** nothing reaches the chat, and the page says the link has closed

### Requirement: The inbox keeps past pages in Artifacts

Below *Open*, the inbox SHALL show every signed-in person *Artifacts*: their own answered or closed pages, newest first, whether or not they use the daily. A search SHALL find pages by their title, open or closed, and no page SHALL show twice. *Artifacts* SHALL show no other person's pages, and no question, approval, private link or hidden item.

#### Scenario: Looking back at a past plan

- **WHEN** Jo, who never set up the daily, opens the inbox and searches *profit*
- **THEN** Jo sees each version of the profit plan they reviewed, newest first, and no one else's pages

#### Scenario: A page that ran out of time

- **WHEN** a review page's 24 hours pass with no answer
- **THEN** it leaves *Open*, and the page shows in *Artifacts* with no answer

### Requirement: The inbox opens on the pages waiting for the person

The inbox SHALL open on the signed-in person's pages that wait on them, under *Open*, newest first, only theirs, each with its title, its folder, and when it came, and a tap SHALL open that page. A page SHALL leave *Open* when it is answered, closed, or runs out of time. The inbox SHALL show no list of open chats, and no days, dates, tasks or backlog. A plan item SHALL still open from its own link.

#### Scenario: Opening the inbox

- **WHEN** Jo has two plans waiting on Jo's review and four open chats with nothing waiting
- **THEN** Jo sees the two plans under *Open*, newest first, and no row for the four chats, and a tap on the first opens its plan

#### Scenario: Nothing waits

- **WHEN** no page waits on Jo
- **THEN** the inbox says *Nothing open.*, and shows *Artifacts* below

<!-- end specs/inbox/spec.md -->
<!-- file specs/reply-links/spec.md utf8 3741 -->
## RENAMED Requirements

- FROM: `### Requirement: A shipped plan leaves Needs you`
- TO: `### Requirement: A shipped plan leaves Open`

## MODIFIED Requirements

### Requirement: No reply link where no chat can be woken

When the host gives no way to wake the chat, opening a reply link SHALL end quickly with no link and no request to install anything, so the caller can fall back to its file. In a project with no company app, the same SHALL hold when the tunnel tool is missing or the tunnel does not come up.

#### Scenario: A host with no way to wake a chat

- **WHEN** a plan is made on a host that can not be sent a message
- **THEN** no link is opened and the plan's file is offered as before

### Requirement: A shipped plan leaves Open

When a change ships and is live, its plan's page in the person's Inbox SHALL close and move from *Open* to *Artifacts*, wherever the plan was made: another chat, folder or computer. A page whose chat or folder is gone SHALL still close in its app while any folder on the computer can reach that app. A failed close SHALL NOT stop the ship. Asking for a shipped plan's link SHALL NOT open a new page under *Open*.

#### Scenario: A plan made in a closed chat ships

- **WHEN** a plan's page waits in the Inbox, its chat was closed and its folder deleted, and the change ships from another chat
- **THEN** once the change is live, the page leaves *Open* and opens read-only from *Artifacts*

#### Scenario: The Inbox can not be reached at ship time

- **WHEN** the change merges but the Inbox does not answer the close
- **THEN** the ship finishes and its report says the plan page was not closed

## REMOVED Requirements

### Requirement: A reply link opens in the inbox when it can

**Reason**: Every reply-link page now opens in the inbox, not only a plan, and a project with a company app no longer falls back to a tunnel or lists a tunnel link.
**Migration**: Replaced by *Every reply-link page opens in the person's inbox*.

## ADDED Requirements

### Requirement: Every reply-link page opens in the person's inbox

In a project with a company app, every page a chat opens as a reply link, a plan's review page, a page for other work, or a page the chat wrote itself, SHALL open inside the person's inbox and give its inbox address when the computer is signed in and the inbox takes the page. The page's file SHALL stay as written. Such a project SHALL never open a tunnel for a reply link: signed out, or with the inbox out of reach, opening SHALL give no link and say why, so the chat gives the page's file and the sign-in link and takes the answer in the chat. A project with no company app SHALL keep opening its reply links at a tunnel, and SHALL list none in an inbox. While any inbox item is open, the computer SHALL collect the person's taps, deliver them under the same fixed-message, version and once-per-action rules, and report each result back. A rebuilt page SHALL replace its inbox copy at the same address while that item is open; one opened again after its item closed SHALL get a new address.

#### Scenario: A page the chat wrote, signed in

- **WHEN** a chat in a project with an app opens an intake form it wrote, on a computer signed in to that app
- **THEN** the printed link opens the form in the person's inbox, no tunnel starts, and its *Submit* reaches that chat only

#### Scenario: Signed out

- **WHEN** a chat in a project with an app opens a page while the computer is signed out
- **THEN** no tunnel starts, and the chat shows the page's file and the sign-in link

#### Scenario: A project with no app

- **WHEN** a chat in a project with no company app opens a page
- **THEN** the page opens at a tunnel link, as before, and nothing is listed in an inbox

<!-- end specs/reply-links/spec.md -->
<!-- file specs/team-shared-pages/spec.md utf8 2432 -->
## MODIFIED Requirements

### Requirement: An agent can put a plain page in a person's inbox
A chat SHALL be able to put a plain HTML page in its person's Inbox, with a title. A plain page SHALL show no review bar and take no taps, and it SHALL stay in the person's *Artifacts*, marked as a page. The same chat and id SHALL replace the page with a new version. A plain page SHALL be kept within the Inbox's size limit for a review page.

#### Scenario: A plain page arrives
- **WHEN** a chat puts a plain page titled "Kit sales, November" in the person's Inbox
- **THEN** the person can open it from the link the chat prints, it shows no OK, Note or Send, and its *Artifacts* row says it is a page

#### Scenario: A page loads from the web
- **WHEN** the page names a script, style, picture or font at a web address
- **THEN** the agent's check refuses it and names the address, and nothing goes to the Inbox

### Requirement: The maker can share any inbox page with the team
The person whose Inbox holds a page, plain or review, SHALL be able to share it with one action, which gives a link under the app's own address. Only that person SHALL be able to share or stop sharing it. Sharing a page that is already shared SHALL give the same link.

#### Scenario: Share and copy
- **WHEN** the person taps *Share with team* on a page in their Inbox
- **THEN** the page shows that it is shared, with its link and a way to copy it, and its *Artifacts* row says *Shared*

#### Scenario: Someone else tries to share it
- **WHEN** another signed-in person asks the app to share or stop sharing a page that is not in their own Inbox
- **THEN** the app refuses and changes nothing

### Requirement: A file page shows a Download button and downloads on open only from its link

A plain page that carries files SHALL show a Download action outside the page's sealed frame. Opening the page from the inbox list or *Artifacts* SHALL NOT start a download by itself. Only the person whose inbox holds the page, or a signed-in teammate with an open team link, SHALL get its files; a service token SHALL get none.

#### Scenario: Opened from the Archive

- **WHEN** the person opens a file page from *Artifacts*
- **THEN** nothing downloads until they tap Download

#### Scenario: Someone else asks for the file

- **WHEN** another signed-in person asks for the file of a page that has no open team link
- **THEN** the app refuses and sends no bytes

<!-- end specs/team-shared-pages/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-11-24

~~~
<!-- end .openspec.yaml -->
<!-- file review.html utf8 114346 fence=~~~ -->
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
<title>Review · 2026-11-25-reply-links-skip-the-tunnel</title>
<style>
  /* The app's look for pages outside the app: the plan review page, the private pages, and a closed link's page.
   look.mjs swaps the colour sets between the markers for the app's own, from app/src/index.css; this copy of
   shadcn's neutral light and dark colours stays only for a colour it can't find. The app's font, corner size and
   shadows come in the same sets; the font and the shadows below fall back to their own values without them. Every page starts light, even on a
   dark device; theme.js adds `.dark` to the root element when the person switches, and draws the switch (.theme-toggle).
   The parts below draw app/src/components/ui/ (button, input, card, badge, skeleton) in plain CSS. Each sits in
   :where(), so a page's own rule always wins.
   Nothing here loads a file: these pages fetch nothing from the network. */
:root {
  --radius: 0.875rem;
  --background: oklch(1 0 0);
  --foreground: oklch(0.24 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.24 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.24 0 0);
  --primary: oklch(0.54 0.22 292);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.24 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.52 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.24 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.62 0.19 292);
  --font: system-ui, sans-serif;
  --shadow-low: 0 1px 2px rgb(0 0 0 / 0.04);
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.04), 0 6px 20px rgb(0 0 0 / 0.06);
  --shadow-raised: 0 2px 4px rgb(0 0 0 / 0.04), 0 12px 32px rgb(0 0 0 / 0.12);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.205 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.205 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.76 0.13 292);
  --primary-foreground: oklch(0.2 0.03 292);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.704 0.191 22.216);
  --border: oklch(1 0 0 / 10%);
  --input: oklch(1 0 0 / 15%);
  --ring: oklch(0.62 0.19 292);
  --shadow-low: 0 1px 2px rgb(0 0 0 / 0.3);
  --shadow-card: 0 1px 2px rgb(0 0 0 / 0.3), 0 6px 20px rgb(0 0 0 / 0.3);
  --shadow-raised: 0 2px 4px rgb(0 0 0 / 0.3), 0 12px 32px rgb(0 0 0 / 0.5);
}

/* The app's three shadows (--shadow-low, --shadow-card, --shadow-raised), else Tailwind's shadow-xs, shadow-sm and
   shadow-lg; Radix's popover shadow, and its upward twin for a box docked at the bottom, so a layer reads as above
   the page; and the 3px focus ring at half strength. */
:root {
  color-scheme: light;
  --look-shadow-xs: var(--shadow-low, 0 1px 2px 0 rgb(0 0 0 / 0.05));
  --look-shadow-sm: var(--shadow-card, 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1));
  --look-shadow-lg: var(--shadow-raised, 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1));
  --look-shadow-overlay: 0 10px 38px -10px rgb(0 0 0 / 0.35), 0 10px 20px -15px rgb(0 0 0 / 0.2);
  --look-shadow-up: 0 -8px 24px rgb(0 0 0 / 0.12);
  --look-ring: color-mix(in oklab, var(--ring) 50%, transparent);
}
.dark { color-scheme: dark; }

:where(body) {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif);
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
  /* The app's font (--font, from the look) leads every font rule below, so none beats it; each keeps its own stack for a repo with no app. */
  body { --pad:12px; margin:0; padding-bottom:var(--bar, 76px); font:16px/1.5 var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); overflow-wrap:anywhere; }
  main { max-width:700px; margin:0 auto; padding:0 12px; }
  code, pre, .ln { font-family:ui-monospace, Menlo, Consolas, monospace; }
  code { background:var(--muted); border-radius:4px; padding:.1em .3em; font-size:.88em; }
  [hidden] { display:none !important; }
  /* A short top: the name, one line with the kind and note count, and one row of links that scrolls sideways. The 48px
     clears the standalone theme switch. */
  header { padding:12px 48px 0 0; }
  .back { display:flex; align-items:center; gap:8px; min-width:0; margin:0 0 8px; }
  .back .muted { margin:0; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
  h1 { margin:0; font-size:22px; line-height:1.25; }
  header .muted { margin:2px 0 0; }
  .jump { display:flex; flex-wrap:nowrap; overflow-x:auto; scrollbar-width:none; gap:0 14px; margin:0; padding:0; list-style:none; white-space:nowrap; }
  .jump a { display:inline-block; padding:6px 0; font-size:14px; }
  header + section { margin-top:12px; }
  .hint, .muted { color:var(--muted-foreground); font-size:14px; margin:4px 0 0; }
  #script-error { color:var(--destructive); font-weight:600; }
  section { margin:24px 0; scroll-margin-top:8px; }
  h2 { margin:0 0 8px; color:var(--muted-foreground); font-size:14px; font-weight:500; letter-spacing:0; }
  .card { padding:var(--pad); margin:0 0 10px; }
  .card p { margin:0 0 10px; } .card p:last-child { margin-bottom:0; }
  .items, .decisions, .note-list { list-style:none; margin:0; padding:0; }
  /* A card on a phone: its words, a row of small pictures, then OK and Note. At 900px and wider the pictures sit right. */
  .item.card { padding:0; overflow:hidden; }
  .words { display:grid; grid-template-columns:26px minmax(0,1fr); align-content:start; gap:0 10px; min-width:0; padding:var(--pad); }
  .words > .table, .words > .live-said { grid-column:1 / -1; margin-top:10px; }
  .item > .verdict { padding:0 var(--pad) var(--pad); }
  .text { position:relative; }
  .clamp { display:block; }
  .text:not(.folded) .clamp { display:inline; }
  .text.folded .clamp { display:-webkit-box; -webkit-box-orient:vertical; -webkit-line-clamp:2; overflow:hidden; }
  .more { min-width:0; min-height:0; padding:0; border:0; background:none; box-shadow:none; color:var(--muted-foreground); font:inherit; font-weight:400; text-decoration:underline; }
  .text:not(.folded) .more { margin-left:.4em; }
  .text.folded .more { position:absolute; right:0; padding-left:1.6em; background:linear-gradient(to right, transparent, var(--card) 1.2em); }
  .view { min-width:0; padding:0 var(--pad) 10px calc(var(--pad) + 36px); }
  .stage { display:flex; gap:8px; overflow-x:auto; scrollbar-width:none; }
  /* A part: one labelled picture, drawing, page, or live card; a click opens it full screen. */
  .part { flex:none; width:84px; margin:0; text-align:center; cursor:zoom-in; }
  .part .clip { position:relative; width:84px; height:112px; overflow:hidden; border:1px solid var(--border); border-radius:8px; background:var(--card); }
  .part .clip:not(.big) * { pointer-events:none; }
  .part .clip:not(.big) .pin { pointer-events:auto; }
  .part figcaption { margin-top:3px; color:var(--muted-foreground); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
  .part:hover figcaption, .part:focus-visible figcaption { color:var(--foreground); }
  .part:hover .clip:not(.big) { outline:2px solid var(--ring); outline-offset:2px; }
  .part .art { margin:0; font-size:var(--f, 13px); }
  .part .art.screen:not([style]) { width:49.2em; }
  /* A page or live card taller than its space shows its top; a fade says there is more. */
  .clip.tall::after { content:""; position:absolute; left:0; right:0; bottom:0; height:48px; background:linear-gradient(to bottom, transparent, var(--card)); pointer-events:none; }
  .item, .decision { scroll-margin-top:8px; }
  .num { flex:0 0 26px; height:26px; border-radius:50%; background:var(--secondary); color:var(--secondary-foreground); font-size:13px; font-weight:600; display:flex; align-items:center; justify-content:center; }
  .body { flex:1; min-width:0; }
  [data-note] { border-radius:4px; }
  [data-note]:hover, .noting { background:var(--accent); }
  .art { position:relative; display:block; width:max-content; margin:0 auto; padding:.6em .8em; font-size:13px; line-height:1.2; white-space:pre; overflow-wrap:normal; }
  .art.pic { box-sizing:content-box; white-space:normal; --pele-bg:transparent; --pele-fg:var(--foreground); --pele-muted:var(--muted-foreground); --pele-line:var(--foreground); --pele-border:var(--ring); --pele-surface:var(--card); --pele-surface-alt:var(--muted); --pele-accent:var(--foreground); --pele-error:var(--destructive); --pele-font:var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); --pele-critical:var(--destructive); }
  .art.pic svg { display:block; width:100%; height:auto; }
  /* A hand-drawn sketch: named colours become classes painted from the look; text inherits the page's ink and font at a fixed size. */
  .art.sketch svg { fill:var(--foreground); font-family:var(--font, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif); font-size:13px; }
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
  .art.screen hr, .art.screen .sep { border:0; border-top:1px solid var(--border); margin:.6em 0; }
  .art.screen .row { display:flex; align-items:center; flex-wrap:wrap; } .art.screen .col { display:flex; flex-direction:column; }
  .art.screen .gap { gap:.6em; } .art.screen .grow { flex:1 1 0; min-width:0; } .art.screen .muted { margin:0; color:var(--muted-foreground); font-size:inherit; } .art.screen .danger { color:var(--destructive); }
  .art.screen .tbl, .art.screen table { width:100%; border-collapse:collapse; } .art.screen :is(th, td) { padding:.35em .6em; text-align:left; border-bottom:1px solid var(--border); }
  /* A picture file: as wide in em as its file is in px, so the fit and zoom scale it like a drawing. */
  .art.photo { padding:0; line-height:0; }
  .art.photo img { display:block; width:20em; height:auto; border:1px solid var(--border); border-radius:.4em; background:var(--background); }
  .art .pin.spot, .page .pin.spot { position:absolute; z-index:2; margin:0; transform:translate(-50%, -50%); }
  /* An ad: the card a feed or a story shows, in em like a picture. */
  .art.ad { width:20em; padding:0; overflow:hidden; border:1px solid var(--border); border-radius:.6em; background:var(--card); color:var(--card-foreground); text-align:left; white-space:normal; line-height:1.3; }
  .ad .ad-account { margin:0; padding:.5em .7em; } .ad .ad-account span { color:var(--muted-foreground); font-size:.85em; }
  .ad img { display:block; width:100%; aspect-ratio:4 / 5; object-fit:cover; }
  .ad-words { display:flex; flex-wrap:wrap; align-items:center; gap:.3em .6em; padding:.6em .7em; }
  .ad-words .ad-text { flex:1 1 100%; margin:0; } .ad-words .ad-headline { flex:1 1 0; min-width:0; }
  .ad-button { padding:.3em .8em; border-radius:.4em; background:var(--primary); color:var(--primary-foreground); font-size:.9em; }
  .ad.story { position:relative; } .ad.story img { aspect-ratio:9 / 16; }
  .ad.story .ad-account { position:absolute; top:0; left:0; right:0; z-index:1; background:color-mix(in oklab, var(--background) 70%, transparent); }
  .ad.story .ad-words { position:absolute; left:0; right:0; bottom:0; background:color-mix(in oklab, var(--background) 80%, transparent); }
  /* A page or a live card: drawn at a phone or computer width, scaled; a cover over a page takes a tap as a spot note. */
  .page, .live { position:relative; overflow:hidden; margin:0 auto; background:white; }
  .page iframe, .live iframe { display:block; border:0; transform-origin:0 0; }
  .live iframe { background:var(--background); }
  .cover { position:absolute; top:0; left:0; right:0; bottom:0; cursor:crosshair; }
  .verdict { display:flex; align-items:center; gap:8px; }
  .verdict button { min-width:64px; }
  .note-list .group { margin:12px 0 6px; color:var(--muted-foreground); font-size:14px; font-weight:500; }
  .words > .table { overflow-x:auto; border:1px solid var(--border); border-radius:var(--radius); }
  .tbl { width:100%; border-collapse:collapse; font-size:14px; }
  .tbl th, .tbl td { padding:6px var(--pad); text-align:left; vertical-align:top; border-bottom:1px solid var(--border); }
  .tbl th { color:var(--muted-foreground); font-weight:500; background:var(--muted); }
  .tbl tbody tr:last-child td { border-bottom:0; }
  .art .pin { min-width:1.8em; min-height:1.6em; margin-left:.4em; padding:0 .5em; border-radius:.8em; font-size:.85em; line-height:1.5em; }
  .add { min-width:0; min-height:34px; margin-left:6px; padding:0 12px; border-radius:17px; box-shadow:none; color:var(--muted-foreground); font-size:13px; vertical-align:middle; }
  /* Full screen: the labels and Close on top; the part's own frame fills the middle; what changes it sits at the foot. */
  #viewer { position:fixed; top:0; left:0; right:0; bottom:0; z-index:8; display:flex; flex-direction:column; background:var(--muted); }
  #viewer .vtop { flex:none; display:flex; align-items:center; gap:8px; padding:calc(6px + env(safe-area-inset-top)) 12px 6px; border-bottom:1px solid var(--border); background:var(--background); }
  #viewer .names { flex:1 1 0; min-width:0; display:flex; gap:4px; overflow-x:auto; scrollbar-width:none; }
  #viewer .name { flex:none; min-width:0; padding:0 12px; border:0; background:transparent; box-shadow:none; color:var(--muted-foreground); font-weight:400; white-space:nowrap; }
  #viewer .name[aria-selected="true"] { background:var(--muted); color:var(--foreground); font-weight:600; }
  #viewer .vspace { flex:1; min-height:0; }
  #viewer .vfoot { flex:none; display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; padding:6px 12px calc(6px + env(safe-area-inset-bottom)); border-top:1px solid var(--border); background:var(--background); }
  #viewer .vhint { flex:1 1 220px; margin:0; color:var(--muted-foreground); font-size:13px; }
  .zoom, .sizes { display:flex; align-items:center; gap:6px; }
  .zoom .level { color:var(--muted-foreground); font-size:13px; }
  .sizes { gap:0; padding:2px; border-radius:var(--radius); background:var(--muted); }
  .sizes button { min-height:36px; border:0; background:none; box-shadow:none; color:var(--muted-foreground); font-weight:400; }
  .sizes button[aria-pressed="true"] { background:var(--card); color:var(--foreground); font-weight:600; box-shadow:var(--look-shadow-xs); }
  .clip.big { position:fixed; left:0; right:0; top:var(--vtop, 52px); bottom:var(--vfoot, 52px); z-index:9; width:auto !important; height:auto !important; max-height:none !important;
    padding:12px; overflow:auto; border:0; border-radius:0; background:var(--muted); cursor:auto; touch-action:pan-x pan-y; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; }
  .clip.big::after { display:none; }
  .clip.big > .art, .clip.big > .page, .clip.big > .live { margin:0 auto; }
  .clip.big > :is(.art.photo, .art.ad, .art.pic, .page) { cursor:crosshair; }
  body.viewing { overflow:hidden; }
  .meta { margin:0 0 4px !important; color:var(--muted-foreground); font-size:13px; }
  .tag { margin-right:8px; vertical-align:1px; }
  .tag.assumed { border-color:var(--border); border-style:dashed; background:transparent; color:var(--foreground); }
  .tag.check { border-color:var(--foreground); border-style:dotted; background:transparent; color:var(--foreground); }
  .hit { outline:3px solid var(--ring); outline-offset:3px; }
  button { font-size:14px; min-width:40px; min-height:40px; padding:4px 12px; }
  .pin { min-width:24px; min-height:24px; margin-left:6px; padding:0 7px; border-radius:12px; border-color:var(--primary); background:var(--primary); box-shadow:none; color:var(--primary-foreground); font:600 12px/22px var(--font, system-ui, sans-serif); vertical-align:middle; }
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
  #editor textarea { display:block; width:100%; min-height:76px; padding:6px 8px; font:16px/1.4 var(--font, system-ui, sans-serif); resize:vertical; }
  #editor .row { display:flex; flex-wrap:wrap; gap:6px; margin-top:8px; }
  .bar { position:fixed; left:0; right:0; bottom:0; z-index:4; display:grid; grid-template-columns:repeat(var(--cols, 1), minmax(0, 1fr)); align-items:stretch; gap:8px; padding:8px 12px calc(8px + env(safe-area-inset-bottom)); background:var(--background); border-top:1px solid var(--border); }
  .bar > button, #ready > button { min-width:0; height:64px; padding:6px; white-space:normal; line-height:1.3; }
  body.docked .bar, body.viewing .bar { display:none; }
  body.read-only .bar, body.read-only .add, body.read-only .verdict, body.read-only .hint, body.read-only .vhint .note-it, body.read-only #chip, body.read-only .drop, body.read-only .files button { display:none; }
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
  /* Files and the needs list: the look's parts. */
  .live-said { margin:6px 0 0; }
  .form { display:grid; gap:14px; }
  .need .form { margin-top:10px; }
  .q { min-width:0; margin:0; padding:0; border:0; }
  .q-label { display:block; margin:0 0 4px !important; font-weight:500; }
  .drop { position:relative; display:flex; align-items:center; justify-content:center; min-height:64px; padding:12px; border:1px dashed var(--input); border-radius:var(--radius); text-align:center; cursor:pointer; }
  .drop.over, .drop:focus-within { border-color:var(--ring); background:var(--accent); }
  .drop input { position:absolute; width:1px; height:1px; opacity:0; }
  .files { list-style:none; margin:6px 0 0; padding:0; }
  .files li { display:flex; flex-wrap:wrap; align-items:center; gap:6px; font-size:14px; }
  .files .why { color:var(--destructive); }
  .needs { list-style:none; margin:0; padding:0; }
  .need { scroll-margin-top:8px; }
  @media (min-width:701px) {
    body { --pad:16px; font-size:20px; }
    h1 { font-size:30px; }
    .jump a, h2, .hint, .muted, .num, .add, .meta, .entry .where, #editor .where, #editor .moved, .session, #editor .copies, #ready-confirm p, #ready-says { font-size:16px; }
    button { font-size:18px; }
    .entry { font-size:20px; }
    .bar { padding-left:max(12px, calc((100% - 700px) / 2 + 12px)); padding-right:max(12px, calc((100% - 700px) / 2 + 12px)); }
    .bar > button, #ready > button { height:44px; }
    #ready-confirm, #ready-says { right:max(12px, calc((100% - 700px) / 2 + 12px)); }
    #ready-confirm { width:320px; }
  }
  /* Wide screen: every part and the bar share one 1160px column; a card's words and buttons sit left, and its
     pictures sit right, side by side, as tall as the words (the kit sets the height). */
  @media (min-width:900px) {
    main { max-width:1160px; padding:0 24px; }
    .bar { padding-left:max(24px, calc((100% - 1160px) / 2 + 24px)); padding-right:max(24px, calc((100% - 1160px) / 2 + 24px)); }
    #ready-confirm, #ready-says { right:max(24px, calc((100% - 1160px) / 2 + 24px)); }
    .item.has-view { display:grid; grid-template-columns:minmax(280px, 380px) minmax(0, 1fr); grid-template-rows:auto 1fr; align-items:start; }
    .item.has-view > .words { grid-column:1; grid-row:1; padding:20px 20px 12px; }
    .item.has-view > .verdict { grid-column:1; grid-row:2; padding:0 20px 20px; }
    .item.has-view > .view { grid-column:2; grid-row:1 / span 2; display:flex; padding:0; border-left:1px solid var(--border); background:var(--muted); }
    .stage { flex:1; min-width:0; gap:16px; padding:16px; align-items:center; }
    .stage > .part:first-child { margin-left:auto; } .stage > .part:last-child { margin-right:auto; }
    .part { width:auto; }
    .part .clip { width:auto; height:auto; border:0; border-radius:0; background:none; }
    .part[data-kind="draw"] .clip:not(.big) { border:1px solid var(--border); border-radius:var(--radius); background:var(--card); }
    .part:is([data-kind="page"], [data-kind="live"]) .clip:not(.big) { border:1px solid var(--border); border-radius:12px; background:var(--card); }
    .part figcaption { margin-top:6px; font-size:14px; }
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
<body data-change="2026-11-25-reply-links-skip-the-tunnel" data-own-back>
<main>
<header>
  <h1>2026-11-25-reply-links-skip-the-tunnel</h1>
  <p class="muted"><span class="kind">Review</span> · <span class="note-count">0 notes</span></p>
  <nav aria-label="Sections"><ul class="jump"><li><a href="#why">Why</a></li><li><a href="#changes">Changes</a></li><li><a href="#needs">Needs</a></li><li><a href="#decisions">Decisions</a></li><li><a href="#notes">Notes</a></li></ul></nav>
  <p id="script-error" role="alert" hidden></p>
</header>
<section id="why" aria-labelledby="why-h"><h2 id="why-h">Why</h2>
<div class="card">
<p data-note="why-1" tabindex="0">Today only a plan's review page opens in your Inbox. Any other page a chat opens with a reply link, such as a form or a list to approve, starts a Cloudflare tunnel, and the Inbox lists only its address. A signed-out computer starts a tunnel even for a plan. A tunnel is slow to start, stops when the computer sleeps, and needs <code>cloudflared</code> on every computer. A project with a company app already has a better place for every page: the Inbox, behind the company sign-in. ClaymooApp made this change on 2026-11-24 and it works well there, so every WongStack install gets it too.</p>
</div></section>
<section id="changes" aria-labelledby="changes-h"><h2 id="changes-h">What Changes</h2>
<ol class="items">
<li class="item card" id="item-1"><div class="words"><span class="num">1</span><div class="body"><div class="text" data-note="item-1" tabindex="0"><b>Every page opens in your Inbox.</b> A plan, a built preview, a page for other work, and a page a chat wrote itself all open in the Inbox, titled by the page's own title. The page's buttons reach the same chat as before. The page's file never changes.</div></div></div></li>
<li class="item card" id="item-2"><div class="words"><span class="num">2</span><div class="body"><div class="text" data-note="item-2" tabindex="0"><b>A project with an app never starts a tunnel for a reply link.</b> Signed out, or with the Inbox out of reach, the chat gives you the page's file and the sign-in link, and takes your answer in the chat.</div></div></div></li>
<li class="item card" id="item-3"><div class="words"><span class="num">3</span><div class="body"><div class="text" data-note="item-3" tabindex="0"><b>A project with no app keeps its tunnel</b>, as before.</div></div></div></li>
<li class="item card" id="item-4"><div class="words"><span class="num">4</span><div class="body"><div class="text" data-note="item-4" tabindex="0"><b>The Inbox's lists are <i>Open</i> and <i>Artifacts</i>.</b> <i>Needs you</i> becomes <i>Open</i>: each page that still waits on you, newest first. With none, it says <i>Nothing open.</i> The Archive becomes <i>Artifacts</i>: every closed page, newest first. Search finds a page, open or closed, and no page shows twice.</div></div><div class="table"><table class="tbl"><thead><tr><th>Before</th><th>After</th></tr></thead><tbody><tr data-note="item-4-row-1" tabindex="0"><td><i>Needs you</i></td><td><i>Open</i></td></tr><tr data-note="item-4-row-2" tabindex="0"><td><i>Nothing waits for you.</i></td><td><i>Nothing open.</i></td></tr><tr data-note="item-4-row-3" tabindex="0"><td>Archive</td><td><i>Artifacts</i></td></tr><tr data-note="item-4-row-4" tabindex="0"><td><i>Search reviews by title</i></td><td><i>Search artifacts by title</i></td></tr></tbody></table></div></div></li>
<li class="item card" id="item-5"><div class="words"><span class="num">5</span><div class="body"><div class="text" data-note="item-5" tabindex="0"><b>A build need can be <i>Optional</i>.</b> A plan's <i>What the build needs</i> item marked <i>Optional</i> shows its form, and the build buttons never wait for it.</div></div></div></li>
</ol>
<p class="aside">Non-goals: no change to private links or live views, which keep their tunnel; no new Inbox route or item kind; no type filter in <i>Artifacts</i>.</p>

</section>
<section id="needs" aria-labelledby="needs-h"><h2 id="needs-h">What the build needs</h2>
<ol class="needs">
<li class="need card" id="need-1" data-need="none"><p><b>Nothing.</b></p></li>
</ol>
</section>
<section id="decisions" aria-labelledby="decisions-h"><h2 id="decisions-h">Decisions</h2>
<ol class="decisions">
<li class="decision card" id="decision-1" data-note="decision-1" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-24</p>Assumed: port ClaymooApp's change as it shipped (PR #2509), less its ClaymooApp-only parts, because the owner asked for the generic parts upstream.</li>
<li class="decision card" id="decision-2" data-note="decision-2" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-24</p>Assumed: a WongStack project has an app when its primary checkout holds <code>scripts/company-api.mjs</code> and its <code>.claude/.wong-stack.json</code> records an app (<code>components.companyApi.origin</code>, or <code>components.memory.worker</code> on an older install), because every install ships the helper, so the file alone says nothing.</li>
<li class="decision card" id="decision-3" data-note="decision-3" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-24</p>Assumed: <code>PROTOCOL</code> goes from 16 to 17, below ClaymooApp's 20, so a ClaymooApp copy on the same computer still wins.</li>
<li class="decision card" id="decision-4" data-note="decision-4" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-24</p>Assumed: the sign-in line names <code>node scripts/company-api.mjs login</code>, WongStack's own sign-in command.</li>
<li class="decision card" id="decision-5" data-note="decision-5" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-24</p>Assumed: split <code>wiki/development/reply-links.md</code> at <i>Open one for another page</i> into <code>reply-link-pages.md</code>, as ClaymooApp has it, because the new lines take the page past the 3,000-word cap; the old heading stays as an entry point.</li>
<li class="decision card" id="decision-6" data-note="decision-6" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-24</p>Assumed: the <i>Optional</i> need line goes in <code>wiki/review-pages.md</code>, not the plan's <code>review-page.md</code> reference, because skill instructions are at their word budget.</li>
<li class="decision card" id="decision-7" data-note="decision-7" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-24</p>Assumed: the loop module goes to 3.6.0, a minor: its builders print a sign-in line and take an <i>Optional</i> need.</li>
<li class="decision card" id="decision-8" data-note="decision-8" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-24</p>Assumed: <i>Artifacts</i> names the inbox list as in ClaymooApp, though the wiki has an unrelated <i>Artifacts route</i> install page, so a synced repo keeps one name.</li>
<li class="decision card" id="decision-9" data-note="decision-9" tabindex="0"><p class="meta"><span class="tag assumed">assumed</span>2026-11-25</p>Assumed: archive checkpoint after bringing in main's one-stack update (62.0.0): <code>linked()</code> calls <code>openReviewLink</code> straight, as profiles are gone; the loop version bump and profile line drop; file-page text from 62.1.0 says <i>Artifacts</i>.</li>
</ol>
</section>
<section id="notes" aria-labelledby="notes-h"><h2 id="notes-h">Your notes</h2>
<p class="session" hidden>Storage is off. Notes and drafts last for this session only.</p>
<ul class="note-list" id="note-list"></ul>
<p class="hint"><span class="lead">Tap Note to comment.</span> <span class="copies">Saving a note copies all your notes.</span> <span class="tail">Tap a picture to see it full screen.</span></p>
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
<div id="viewer" role="dialog" aria-modal="true" aria-label="Full screen" hidden>
  <div class="vtop"><div class="names" role="tablist" aria-label="Pictures"></div><button type="button" class="primary" data-close>✕ Close</button></div>
  <div class="vspace"></div>
  <div class="vfoot"><p class="vhint"></p>
    <span class="zoom"><span class="level"></span><button type="button" aria-label="Zoom out">−</button><button type="button">Fit</button><button type="button" aria-label="Zoom in">+</button></span>
    <span class="sizes" role="group" aria-label="Width"><button type="button" data-size="0" aria-pressed="true">Phone</button><button type="button" data-size="1" aria-pressed="false">Computer</button></span>
    <a class="try" target="_blank" rel="noopener noreferrer" hidden>Try it ↗</a></div>
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
    // A browser notice that a resize watcher waited a frame is no script error.
    if (/ResizeObserver loop/.test(e.message)) return;
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
    document.querySelector('header .kind').textContent = NAME;
    document.querySelector('h1').textContent = 'Built: look, then publish?';
    document.querySelector('.hint .lead').textContent = 'Tap a picture to see it full screen, then tap it to note it.';
    document.querySelector('.hint .tail').textContent = '';
  }
  if (REVIEW) document.querySelector('.hint .lead').textContent = 'Tap OK or Note on each card, or select words to note them.';
  const phone = window.matchMedia ? window.matchMedia('(max-width: 700px)') : { matches: false };
  const chip = $('chip'), editor = $('editor'), ta = editor.querySelector('textarea');
  const viewer = $('viewer');
  const all = function (sel, fn) { Array.prototype.forEach.call(document.querySelectorAll(sel), fn); };
  const esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };

  // ── storage: a refused store keeps notes for this session ──
  let store = null, data = { notes: [], drafts: {}, ok: {}, files: {} };
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
  const QID = /^need-\d+-q-\d+$/;
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
      const kept = function (name, fits) {
        if (!saved || !saved[name] || typeof saved[name] !== 'object') return;
        data[name] = {};
        Object.keys(saved[name]).forEach(function (id) { if (QID.test(id) && fits(saved[name][id])) data[name][id] = saved[name][id]; });
      };
      kept('files', function (v) {
        return Array.isArray(v) && v.every(function (f) { return f && /^[0-9a-f]{32}$/.test(f.id) && typeof f.name === 'string' && typeof f.size === 'number' && typeof f.sent === 'boolean'; });
      });
    } catch (e) { /* unreadable notes start empty */ }
  }
  load(store ? store.getItem(KEY) : null);
  function persist() {
    if (store) { try { store.setItem(KEY, JSON.stringify(data)); } catch (e) { store = null; } }
    render();
  }

  // ── targets: a data-note id names its location; the label pins a note to its text ──
  function where(id) {
    const m = /^(why|item|decision)-(\d+)(?:-(line|picture|row)-(\d+))?(?:-(words|spot|more)-\d+)?$/.exec(id) || [];
    if (m[5]) return Object.assign(where(id.replace(/-(words|spot|more)-\d+$/, '')), m[5] === 'words' ? { kind: 'words' } : {});
    if (m[1] === 'why') return { at: '#/why', kind: 'paragraph ' + m[2], spot: 'Why, paragraph ' + m[2] };
    const part = m[3] === 'line' ? 'drawing line ' + m[4] : m[3] ? m[3] + ' ' + m[4] : '';
    if (m[1] === 'item') return { at: '#/' + m[2], kind: part || 'item', spot: NOUN + ' #' + m[2] + (part ? ', ' + part : '') };
    return { at: '#/decisions/' + m[2], kind: 'decision', spot: 'Decision #' + m[2] };
  }
  function labelOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .meta, .add, .more, title, desc'), function (n) { n.parentNode.removeChild(n); });
    // A picture's labels are separate SVG text elements: join them with spaces so they read as words.
    // A table row's cells read joined with a dot. A screen's words sit in many small boxes: join every piece with a space.
    // A picture file, an ad, and a page read as their label.
    const row = el.tagName === 'TR', named = el.getAttribute('data-label');
    const cells = row ? c.querySelectorAll('td') : el.classList.contains('screen') ? texts(c) : el.classList.contains('pic') ? c.querySelectorAll('text') : [c];
    const text = named !== null ? named : Array.prototype.map.call(cells, function (n) { return n.textContent.replace(/\s+/g, ' ').trim(); })
      .join(row ? ' · ' : ' ').replace(/\s+/g, ' ').trim();
    return where(el.getAttribute('data-note')).kind + ' "' + (text.length > 60 ? text.slice(0, 59) + '…' : text) + '"';
  }
  function texts(c) {
    const found = [], walk = document.createTreeWalker(c, NodeFilter.SHOW_TEXT);
    while (walk.nextNode()) found.push(walk.currentNode);
    return found;
  }
  // A note on words, a spot, or one more note sits on its base target: words are found again by their quote, the rest by the base's label.
  function find(id, rec) {
    const m = /^(.*)-(words|spot|more)-\d+$/.exec(id), el = document.querySelector('[data-note="' + (m ? m[1] : id) + '"]');
    if (!el) return null;
    if (m && m[2] === 'words') return textOf(el).indexOf(rec.quote) >= 0 ? el : null;
    return labelOf(el) === rec.label ? el : null;
  }
  function textOf(el) {
    const c = el.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.pin, .add, .more'), function (n) { n.parentNode.removeChild(n); });
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
  // The base target's own note, or one more note on it (`-more-k`): a sent note leaves room for the next.
  function onBase(id, base) { return id === base || (id.indexOf(base + '-more-') === 0 && /^\d+$/.test(id.slice(base.length + 6))); }
  // The note a Note button opens on a base target: its unsent note or draft; else a new one, beside any sent note.
  function noteFor(base) {
    const ids = data.notes.map(function (n) { return n.id; }).concat(Object.keys(data.drafts)).filter(function (id) { return onBase(id, base); });
    const unsent = ids.filter(function (id) { return data.drafts[id] || !noteOf(id).sent; })[0];
    return unsent || (noteOf(base) ? nextId(base, 'more') : base);
  }

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
          el.appendChild(pin);
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
      // An item's words take their note through the Note button beside OK; a part takes its notes full screen.
      const unsentPin = Array.prototype.some.call(el.querySelectorAll('.pin:not(.sent)'), function (p) { return onBase(p.getAttribute('data-open'), id); });
      if (el.closest('.art, .stage') || el.matches('.items > .item .text') || unsentPin) return;
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
    const answers = replies();
    all('.form [data-q]', function (q) {
      const id = q.getAttribute('data-q'), held = data.files[id] || [];
      if (!held.length) return;
      if (!$('note-list').querySelector('.group.answers')) $('note-list').insertAdjacentHTML('beforeend', '<li class="group answers">Answers</li>');
      const line = asker(id) + ', "' + q.getAttribute('data-label') + '"', done = !answers.some(function (a) { return a.id === id; });
      $('note-list').insertAdjacentHTML('beforeend', '<li class="entry"><span class="where">' + esc(line) + (done ? '<span class="tag">Sent</span>' : '') + '</span>'
        + esc(held.map(function (f) { return f.name; }).join(', ')) + '</li>');
    });
    if (ids.length || $('note-list').querySelector('.answers')) { const none = $('note-list').querySelector('li.muted'); if (none) none.remove(); }
    document.querySelector('#notes .hint').hidden = !$('note-list').querySelector('li.muted');
    drawFiles();
    views.forEach(counts);
    bar();
  }

  // ── still-tap to note: a mouse on text, or any pointer on a full-screen drawing line, shows the chip ──
  let chipFor = null, chipExtra = null, tap = null;
  // True once the inbox opens this page closed, or a tap on it reaches the chat: it takes no note.
  let readOnly = false;
  const pointers = {};
  // `extra` makes the chip start a new note on selected words or a picture spot.
  function showChip(el, x, y, keyboard, extra) {
    if (readOnly) return;
    const id = el.getAttribute('data-note');
    chipFor = el; chipExtra = extra || null;
    const next = noteFor(id);
    chip.textContent = extra && extra.quote ? 'Note' : !extra && (noteOf(next) || data.drafts[next]) ? 'Edit note' : 'Add note';
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
    const offer = el && (el.closest('.clip.big') || (e.pointerType === 'mouse' && !el.closest('.stage')));
    if (offer) showChip(el, e.clientX, e.clientY, false, spotAt(el, t.target, e)); else hideChip();
  });
  // A tap on a whole part full screen notes that spot of it, kept in percent so it holds at any size; a drawing's line is a line.
  function spotAt(el, target, e) {
    if (!el.parentNode.classList.contains('big')) return null;
    const r = el.getBoundingClientRect(), fig = el.closest('.part');
    const pct = function (v, size) { return Math.max(0, Math.min(100, Math.round(v / Math.max(1, size) * 100))); };
    return { k: 0, x: pct(e.clientX - r.left, r.width), y: pct(e.clientY - r.top, r.height), on: fig.querySelector('figcaption').firstChild.textContent };
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
    openEditor(extra ? nextId(id, extra.quote ? 'words' : 'spot') : noteFor(id), chipFor, extra);
  });
  document.addEventListener('click', function (e) {
    const t = e.target.closest ? e.target.closest('[data-open]') : null;
    if (!t) return;
    // A pin or a notes-list entry opens its own note, sent or not; a Note button opens the part's next note.
    const exact = t.classList.contains('pin') || t.classList.contains('entry');
    const id = exact ? t.getAttribute('data-open') : noteFor(t.getAttribute('data-open')), rec = data.drafts[id] || noteOf(id);
    const el = rec ? find(id, rec) : t.closest('[data-note]') || document.querySelector('[data-note="' + t.getAttribute('data-open') + '"]');
    if (el && t.classList.contains('entry')) { reveal(el, rec && rec.k); el.scrollIntoView({ block: 'center' }); }
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
    } else if (view && !open && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && V.f <= V.lo * 1.001) {
      openViewer(view.c, view.i + (e.key === 'ArrowRight' ? 1 : -1));
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
    const note = noteOf(id), draft = data.drafts[id];
    if (el) reveal(el, extra ? extra.k : (draft || note || {}).k);
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
      const n = unsent().length, k = oks().length, a = replies().length;
      copyNotes(function () { toast('Saved and copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
        function () { toast('Saved. Tap Copy notes to copy them.'); });
    }
  });

  // ── OK and Note on each card: an OK is kept with the notes until undone, and goes to the chat with them ──
  all('.items > .item', function (item) {
    const v = document.createElement('div');
    v.className = 'verdict';
    v.innerHTML = '<span class="tag" hidden>OK</span><button type="button" class="btn-ghost" data-ok="' + item.id + '">OK</button>'
      + '<button type="button" class="btn-ghost" data-open="' + item.id + '" aria-label="Note on ' + NOUN.toLowerCase() + ' ' + item.id.slice(5) + '">Note</button>';
    item.appendChild(v);
  });

  // ── the card view: each part sits in a labelled frame, sized by the card's words; a click opens it full screen ──
  const BASE = 13, PAGE_W = [390, 1280], FIRST_SCREEN = 760;
  const WIDE = window.matchMedia ? window.matchMedia('(min-width: 900px)') : { matches: false };
  const later = window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function (fn) { return setTimeout(fn, 16); };
  const views = [];
  // Each page frame's height, as its page posted it at 1 px tall; and each overflow seen at full height, measured once.
  const pageH = new WeakMap(), pageOver = new WeakMap(), PAGE_MAX = 40000;
  let view = null, queued = false;
  // A resize watcher's work waits for the next frame, so a size it sets never loops back into the same frame.
  function queue() {
    if (queued) return;
    queued = true;
    later(function () { queued = false; views.forEach(layout); if (view && big().paged) fitBig(); });
  }
  // A new width measures a page again from 1 px tall, so a shorter page doesn't keep the old height.
  function pageWidth(f, w) {
    if (f.style.width === w + 'px') return;
    f.style.width = w + 'px'; f.style.height = '1px'; pageH.delete(f);
  }
  // A page or live card drawn w px wide and h px tall, scaled by k; a page keeps the height its page posted.
  function frameAt(p, w, h, k) {
    const f = p.el.querySelector('iframe');
    if (!f) return;
    if (p.kind === 'page') pageWidth(f, w); else { f.style.width = w + 'px'; f.style.height = h + 'px'; }
    f.style.transform = k < 1 ? 'scale(' + k + ')' : '';
    p.el.style.width = w * k + 'px'; p.el.style.height = h * k + 'px';
  }
  // A part's own size: a drawing or picture at the base size, a page or live card at a phone's width.
  function natural(p) {
    if (p.kind === 'page') return { w: PAGE_W[0], h: pageH.get(p.el.querySelector('iframe')) || 200 };
    if (p.kind === 'live') return { w: PAGE_W[0], h: +p.el.getAttribute('data-height') || 640 };
    p.clip.style.setProperty('--f', BASE + 'px');
    return { w: p.el.offsetWidth, h: p.el.offsetHeight };
  }
  // On a computer the parts are as tall as the words, at least 420 px and at most the window, each shrunk whole
  // to fit the row down to about 110 px wide, past which the row scrolls. On a phone each is a small picture.
  function layout(c) {
    const wide = WIDE.matches, bar = document.querySelector('.bar'), verdict = c.item.querySelector('.verdict');
    const H = Math.min(Math.max(420, c.words.offsetHeight + (verdict ? verdict.offsetHeight : 0)), Math.max(240, window.innerHeight - (bar ? bar.offsetHeight : 0) - 32));
    c.el.style.height = wide ? H + 'px' : '';
    const room = wide ? H - 32 - 30 : 112;
    const sized = c.parts.map(function (p) {
      if (p.clip.classList.contains('big')) return null;
      const s = natural(p);
      if (!s.w || !s.h) return null;
      s.p = p;
      s.k = !wide ? (p.paged ? 84 / s.w : Math.min(84 / s.w, 112 / s.h))
        : p.paged ? Math.min(1, room / Math.min(s.h, FIRST_SCREEN)) : Math.min(p.kind === 'draw' ? 1.25 : 1, room / s.h);
      return s;
    }).filter(Boolean);
    if (wide) shrink(sized, c.stage.clientWidth - 32 - 16 * (c.parts.length - 1));
    sized.forEach(function (s) {
      const p = s.p;
      if (p.paged) frameAt(p, s.w, s.h, s.k); else p.clip.style.setProperty('--f', BASE * s.k + 'px');
      const h = s.h * s.k, shown = wide ? Math.min(room, Math.ceil(h)) : 112;
      p.clip.style.height = wide ? shown + 'px' : '';
      p.fig.style.width = wide ? Math.ceil(s.w * s.k) + 2 + 'px' : '';
      p.clip.classList.toggle('tall', h > shown + 2);
    });
  }
  // Parts too wide for the row shrink by one factor; one that would fall under 110 px keeps 110, and the rest share what is left.
  function shrink(sized, row) {
    let small = [], f = 1;
    for (let i = 0; i < sized.length; i += 1) {
      const rest = sized.filter(function (s) { return small.indexOf(s) < 0; });
      f = Math.min(1, (row - 110 * small.length) / Math.max(1, rest.reduce(function (t, s) { return t + s.w * s.k; }, 0)));
      const more = rest.filter(function (s) { return s.w * s.k * f < 110; });
      if (!more.length) break;
      small = small.concat(more);
    }
    sized.forEach(function (s) { s.k *= small.indexOf(s) >= 0 ? Math.min(1, 110 / (s.w * s.k)) : Math.max(f, 0); });
  }
  function counts(c) {
    c.parts.forEach(function (p) {
      const k = p.clip.querySelectorAll('.pin').length;
      p.count.textContent = k ? ' · ' + k : '';
      p.fig.setAttribute('aria-label', p.label + (k ? ', ' + plural(k) : '') + ', open full screen');
    });
  }
  all('.view', function (v) {
    const item = v.closest('.item'), c = { el: v, item: item, stage: v.querySelector('.stage'), words: item.querySelector('.words'),
      try: v.getAttribute('data-try') || '', at: 0, parts: [] };
    Array.prototype.forEach.call(c.stage.children, function (fig) {
      const cap = fig.querySelector('figcaption'), kind = fig.getAttribute('data-kind');
      const p = { fig: fig, clip: fig.querySelector('.clip'), el: fig.querySelector('.clip').firstElementChild, kind: kind, paged: kind === 'page' || kind === 'live', label: cap.textContent };
      p.count = document.createElement('span'); p.count.className = 'count'; cap.appendChild(p.count);
      fig.tabIndex = 0; fig.setAttribute('role', 'button');
      c.parts.push(p);
    });
    c.stage.addEventListener('click', function (e) {
      const fig = e.target.closest('.part');
      if (fig && !e.target.closest('.clip.big, [data-open]')) openViewer(c, partIndex(c, fig));
    });
    c.stage.addEventListener('keydown', function (e) {
      if ((e.key === 'Enter' || e.key === ' ') && e.target.classList.contains('part')) { e.preventDefault(); openViewer(c, partIndex(c, e.target)); }
    });
    if (window.ResizeObserver) { const watch = new ResizeObserver(queue); watch.observe(c.words); watch.observe(c.stage); }
    views.push(c);
  });
  const partIndex = function (c, fig) { return c.parts.map(function (p) { return p.fig; }).indexOf(fig); };
  // A picture file is as wide in em as its file is in px, so it scales like a drawing.
  all('.art.photo img', function (img) {
    const size = function () { if (img.naturalWidth) { img.style.width = img.naturalWidth / BASE + 'em'; queue(); } };
    if (img.complete) size(); else img.addEventListener('load', size);
  });
  // A note's target shows: folded words unfold.
  function reveal(el) {
    folds.forEach(function (f) { if (f.text === el && !f.open) { f.open = true; measure(f); } });
  }

  // ── full screen: one part over everything, the card's labels on top, its changes at the foot; it zooms and scrolls natively ──
  const vtop = viewer.querySelector('.vtop'), vfoot = viewer.querySelector('.vfoot'), names = viewer.querySelector('.names');
  const vbar = viewer.querySelector('.zoom'), vb = vbar.querySelectorAll('button'), sizes = viewer.querySelector('.sizes'), tryIt = viewer.querySelector('.try');
  const V = { f: BASE, lo: BASE, hi: BASE };
  const HINTS = { draw: ['Drag to move · pinch or + to zoom', 'tap a line or picture to note it'], photo: ['Pinch or + to zoom', 'tap a spot to note it'],
    page: ['Scroll to read', 'tap a spot to note it'], live: ['Try it here: it sends nothing', ''] };
  function big() { return view && view.c.parts[view.i]; }
  function scale(f, cx, cy) {
    const box = big().clip;
    f = Math.max(V.lo, Math.min(V.hi, f));
    const k = f / V.f, x = (box.scrollLeft + cx) * k - cx, y = (box.scrollTop + cy) * k - cy;
    V.f = f; box.style.setProperty('--f', f + 'px');
    box.scrollLeft = x; box.scrollTop = y;
    const atFit = f <= V.lo * 1.001;
    vbar.firstChild.textContent = (atFit ? 'Fit · ' : '') + Math.round(f / BASE * 100) + '%';
    vb[0].disabled = atFit; vb[2].disabled = f >= V.hi * 0.999;
  }
  // A drawing fits the screen's width; a picture fits whole; a page or live card shows at the picked width, shrunk to fit.
  function fitBig() {
    const p = big();
    root.style.setProperty('--vtop', vtop.offsetHeight + 'px'); root.style.setProperty('--vfoot', vfoot.offsetHeight + 'px');
    const aw = p.clip.clientWidth - 24, ah = p.clip.clientHeight - 24;
    V.f = V.lo = V.hi = BASE;
    if (p.paged) {
      const w = PAGE_W[view.c.at], k = Math.min(1, aw / w), f = p.el.querySelector('iframe');
      frameAt(p, w, p.kind === 'live' ? ah / k : pageH.get(f) || ah / k, k);
      return;
    }
    p.clip.style.setProperty('--f', BASE + 'px');
    const w = p.el.offsetWidth, h = p.el.offsetHeight;
    if (!w || !h || aw <= 0) return;
    V.lo = BASE * (p.kind === 'draw' ? aw / w : Math.min(aw / w, ah / h)); V.hi = Math.max(V.lo * 4, 40); V.f = V.lo;
    p.clip.scrollLeft = p.clip.scrollTop = 0;
    scale(V.lo, 0, 0);
  }
  function openViewer(c, i) {
    hideChip();
    if (view) big().clip.classList.remove('big');
    view = { c: c, i: (i + c.parts.length) % c.parts.length };
    const p = big(), hint = HINTS[p.kind];
    viewer.hidden = false; document.body.classList.add('viewing');
    names.innerHTML = c.parts.map(function (q, k) {
      return '<button type="button" class="name" role="tab" data-i="' + k + '" aria-selected="' + (k === view.i) + '">' + esc(q.label) + '</button>';
    }).join('');
    viewer.querySelector('.vhint').innerHTML = esc(hint[0]) + (hint[1] ? '<span class="note-it"> · ' + esc(hint[1]) + '</span>' : '');
    vbar.hidden = p.paged; sizes.hidden = !p.paged; tryIt.hidden = !c.try;
    if (c.try) tryIt.href = c.try;
    Array.prototype.forEach.call(sizes.children, function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-size') === c.at)); });
    p.clip.classList.add('big');
    layout(c); fitBig();
    viewer.querySelector('[data-close]').focus({ preventScroll: true });
  }
  function closeViewer(restore) {
    if (!view) return;
    const c = view.c, p = big();
    p.clip.classList.remove('big'); p.clip.scrollLeft = p.clip.scrollTop = 0;
    view = null; c.at = 0;
    viewer.hidden = true; document.body.classList.remove('viewing');
    layout(c); bar();
    if (restore) p.fig.focus({ preventScroll: true });
  }
  viewer.querySelector('[data-close]').addEventListener('click', function () { closeViewer(true); });
  names.addEventListener('click', function (e) { const b = e.target.closest('[data-i]'); if (b) openViewer(view.c, +b.getAttribute('data-i')); });
  sizes.addEventListener('click', function (e) {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    view.c.at = +b.getAttribute('data-size');
    Array.prototype.forEach.call(sizes.children, function (s) { s.setAttribute('aria-pressed', String(s === b)); });
    fitBig();
  });
  vbar.addEventListener('click', function (e) {
    const i = Array.prototype.indexOf.call(vb, e.target), box = big().clip;
    if (i >= 0) scale([V.f / 1.25, V.lo, V.f * 1.25][i], box.clientWidth / 2, box.clientHeight / 2);
  });
  const zoomable = function (e) { return view && !big().paged && e.target.closest && e.target.closest('.clip.big'); };
  document.addEventListener('wheel', function (e) {
    if (!zoomable(e) || (!e.ctrlKey && !e.metaKey)) return;
    e.preventDefault();
    const r = big().clip.getBoundingClientRect();
    scale(V.f * (e.deltaY < 0 ? 1.1 : 1 / 1.1), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  // One finger scrolls natively, or swipes to the next part at fit; two fingers pinch around their midpoint.
  // A swipe starts only on the shown part, so a swipe along the scrolling label row keeps the part.
  let pinch = null, swipe = null;
  const span = function (t) { return Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY) || 1; };
  document.addEventListener('touchstart', function (e) {
    const t = e.touches, on = e.target.closest && e.target.closest('.clip.big');
    swipe = view && on && t.length === 1 ? { x: t[0].clientX, y: t[0].clientY } : null;
    if (zoomable(e) && t.length === 2) pinch = { f: V.f, dist: span(t) };
  }, { passive: true });
  document.addEventListener('touchmove', function (e) {
    if (!pinch || e.touches.length !== 2) return;
    if (e.cancelable) e.preventDefault();
    const r = big().clip.getBoundingClientRect(), t = e.touches;
    scale(pinch.f * span(t) / pinch.dist, (t[0].clientX + t[1].clientX) / 2 - r.left, (t[0].clientY + t[1].clientY) / 2 - r.top);
  }, { passive: false });
  document.addEventListener('touchend', function (e) {
    const s = swipe, t = e.changedTouches[0];
    if (e.touches.length < 2) pinch = null;
    swipe = null;
    if (!s || !view || !t || V.f > V.lo * 1.001) return;
    const dx = t.clientX - s.x;
    if (Math.abs(dx) > 60 && Math.abs(dx) > 2 * Math.abs(t.clientY - s.y)) openViewer(view.c, view.i + (dx < 0 ? 1 : -1));
  });
  document.addEventListener('gesturestart', function (e) { if (view) e.preventDefault(); });

  // ── page parts: a page posts its height at 1 px tall; a cover over it takes taps ──
  // A page frame is sealed from this page, so the kit's one script in it posts its height, and the link under a point.
  // Only a message from one of this page's own page frames counts; a height for an old width is dropped.
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (!m || (m.type !== 'review:page' && m.type !== 'review:link')) return;
    const f = Array.prototype.find.call(document.querySelectorAll('.page iframe'), function (x) { return x.contentWindow === e.source; });
    if (!f) return;
    if (m.type === 'review:link') {
      const cover = f.parentNode.querySelector('.cover'), href = typeof m.href === 'string' ? m.href.slice(0, 2000) : '';
      if (cover) { cover.title = href; cover.style.cursor = href ? 'pointer' : ''; }
      return;
    }
    if (typeof m.h !== 'number' || !isFinite(m.h) || typeof m.vh !== 'number' || m.w + 'px' !== f.style.width) return;
    const h = Math.max(1, Math.min(PAGE_MAX, Math.round(m.h)));
    // A height counts only when measured 1 px tall; a page past its full-height frame grew late, so it measures again.
    if (m.vh > 1) {
      if (m.vh === pageH.get(f) && h > m.vh && pageOver.get(f) !== h) { pageOver.set(f, h); f.style.height = '1px'; }
      return;
    }
    pageH.set(f, h); f.style.height = h + 'px';
    if (!f.parentNode.querySelector('.cover')) f.parentNode.insertAdjacentHTML('beforeend', '<span class="cover"></span>');
    queue();
  });
  // A link in a page goes nowhere: hovering over it shows its address.
  document.addEventListener('mousemove', function (e) {
    const cover = e.target.classList && e.target.classList.contains('cover') ? e.target : null, f = cover && cover.parentNode.querySelector('iframe');
    if (!f || !f.contentWindow) return;
    const r = cover.getBoundingClientRect(), k = r.width / f.offsetWidth;
    f.contentWindow.postMessage({ type: 'review:point', x: (e.clientX - r.left) / k, y: (e.clientY - r.top) / k }, '*');
  });

  // ── long words fold after about two lines behind More, on a phone only; a note on hidden words unfolds them ──
  const folds = [];
  function measure(f) {
    // The fold never cuts the bold first sentence: it keeps at least the lines that sentence takes.
    f.text.classList.remove('folded');
    f.more.style.top = '';
    if (WIDE.matches) { f.more.hidden = true; return; }
    const lead = f.clamp.querySelector(':scope > b:first-child'), line = parseFloat(getComputedStyle(f.clamp).lineHeight) || 24;
    const leadLines = lead ? Math.ceil((lead.getBoundingClientRect().bottom - f.clamp.getBoundingClientRect().top - 1) / line) : 0;
    f.clamp.style.webkitLineClamp = String(Math.max(2, leadLines));
    f.text.classList.add('folded');
    const long = f.clamp.scrollHeight > f.clamp.clientHeight + 2;
    f.text.classList.toggle('folded', long && !f.open);
    f.more.hidden = !long;
    f.more.textContent = f.open ? 'Less' : 'More';
    f.more.setAttribute('aria-expanded', String(f.open));
    // Folded, More sits on the last shown line, at its end.
    if (long && !f.open) f.more.style.top = f.clamp.offsetTop + f.clamp.clientHeight - line + 'px';
  }
  all('.items > .item .text', function (text) {
    const clamp = document.createElement('span'), more = document.createElement('button'), f = { text: text, clamp: clamp, more: more, open: false };
    clamp.className = 'clamp';
    while (text.firstChild) clamp.appendChild(text.firstChild);
    text.appendChild(clamp);
    more.type = 'button'; more.className = 'more';
    text.appendChild(more);
    more.addEventListener('click', function () { f.open = !f.open; measure(f); });
    folds.push(f);
    measure(f);
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
  function acknowledge(notes, okd, ans) {
    ans.forEach(function (a) {
      (data.files[a.id] || []).forEach(function (f) { if (a.files.indexOf(f.id) >= 0) f.sent = true; });
    });
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
  function lines(notes, okd, ans) {
    return okd.map(function (id) { return NOUN + ' #' + id.slice(5) + ': OK'; }).concat(ans.map(function (a) { return a.line; }), bullets(notes)).join('\n');
  }
  function notesText() {
    const header = REVIEW ? document.body.getAttribute('data-header')
      : PREVIEW ? 'Notes on the preview of ' + NAME + ' from its review page. Don\'t publish yet.'
      : 'Notes on the plan ' + CHANGE + ' from the review page. Don\'t build yet.';
    return header + '\n' + lines(unsent(), oks(), replies());
  }
  function toast(text) {
    $('toast').textContent = text; $('toast').classList.add('show');
    setTimeout(function () { $('toast').classList.remove('show'); }, 2000);
  }
  function plural(n) { return n + (n === 1 ? ' note' : ' notes'); }
  function plural2(n, k, a) {
    const parts = n || !(k || a) ? [plural(n)] : [];
    if (k) parts.push(k + (k === 1 ? ' OK' : ' OKs'));
    if (a) parts.push(a + (a === 1 ? ' answer' : ' answers'));
    return parts.join(' and ');
  }
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
    if (unsent().length || oks().length || replies().length) return false;
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
    const notes = snapshot(), okd = oks(), ans = replies(), n = notes.length, k = okd.length, a = ans.length;
    if (pending || connecting || nothing('sent')) return;
    busy('send'); says('Sending your notes…');
    // A closed link or an unreachable chat: the same tap copies, and the page goes back to Copy notes.
    const closed = function () {
      setLive(null); says('This link has closed. Copy your notes into chat.');
      copyNotes(function () { toast('This link has closed. Copied ' + plural2(n, k, a) + ': paste them into chat.'); },
        function () { toast('This link has closed. Tap Copy notes to copy them.'); });
    };
    try {
      const body = { text: lines(notes, okd, ans) };
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('send', live, body);
      const changed = 'The ' + PAGE + ' changed. Reload to read it first.';
      if (r.status === 429) { says('Wait a few seconds, then tap Send notes again.'); toast('Wait a few seconds, then tap Send notes again.'); return; }
      if (r.status === 409) { const why = ((await r.json()) || {}).gone ? GONE : changed; says(why); toast(why); return; }
      if (!r.ok) { closed(); return; }
      const answer = await r.json();
      if (!answer || answer.sent !== true) { closed(); return; }
      acknowledge(notes, okd, ans);
      says('Sent ' + plural2(n, k, a) + ' to the chat.');
      toast('Sent ' + plural2(n, k, a) + ' to the chat.');
    } catch (e) { closed(); }
    finally { busy(null); }
  }
  $('copy').addEventListener('click', function () {
    if (pending || connecting) return;
    if (live) { sendNotes(); return; }
    const n = unsent().length, k = oks().length, a = replies().length;
    if (nothing('copied')) return;
    copyNotes(function () { toast('Copied ' + plural2(n, k, a) + '. Paste them into chat.'); },
      function () { toast('Copy failed. Copy the notes list by hand.'); });
  });

  document.addEventListener('click', function (e) {
    const b = e.target.closest ? e.target.closest('[data-ok]') : null;
    if (!b) return;
    const id = b.getAttribute('data-ok');
    if (data.ok[id]) delete data.ok[id]; else data.ok[id] = true;
    persist();
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
    const gate = drawNeeds();
    all('#ready > [data-ready]', function (b) {
      if (!b.querySelector('.spinner')) b.textContent = gate || b.getAttribute('data-label');
    });
    all('[data-ready]', function (b) {
      const step = b.getAttribute('data-ready'), spinner = b.querySelector('.spinner');
      const active = !!spinner && pending === (step === 'yes' ? confirming && confirming.name : step);
      b.disabled = waiting;
      b.setAttribute('aria-busy', String(active));
      if (spinner) {
        spinner.hidden = !active;
        b.querySelector('span:last-child').textContent = active ? 'Sending…' : (b.parentNode === $('ready') && gate) || b.getAttribute('data-label');
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
    const notes = snapshot(), okd = oks(), ans = replies();
    busy(name); says('Sending your request…');
    const closed = function () { setLive(null); says('This link has closed. Copy your notes and choose in the chat.'); toast('This link has closed. Copy your notes and choose in the chat.'); };
    try {
      const body = { action: name, version: version };
      if (notes.length || okd.length || ans.length) body.text = lines(notes, okd, ans);
      if (fileIds(ans).length) body.files = fileIds(ans);
      const r = await ask('act', live, body);
      if (r.status === 429) { says('Wait a few seconds, then tap again.'); return; }
      const a = await r.json() || {};
      const line = r.status === 200 && a.sent === true ? actionOf(name).done
        : r.status === 409 && a.changed === true ? 'The ' + PAGE + ' changed. Reload to read it first.'
        : r.status === 409 && a.done === true ? 'The chat was already asked.' : r.status === 409 && a.gone === true ? GONE : '';
      if (r.status === 410 || r.status === 403) { closed(); return; }
      if (!line) { says('The request was not confirmed. Your notes are saved. Try again.'); return; }
      if (r.status === 200 && a.sent === true) acknowledge(notes, okd, ans);
      // A gone file keeps the buttons, as a 429 does: the person picks it again and taps once more.
      if (line !== GONE) hideActions();
      says(line);
    } catch (e) { says('The request was not confirmed. Your notes are saved. Try again.'); }
    finally { busy(null); }
  }
  $('ready').addEventListener('click', function (e) {
    const button = e.target.closest('[data-ready]');
    if (!button || pending || connecting) return;
    const step = button.getAttribute('data-ready'), a = actionOf(step), gaps = needsOpen();
    // While the build needs the person, a go button leads to the first thing it needs instead.
    if (a && gaps.length) {
      all('.hit', function (n) { n.classList.remove('hit'); });
      gaps[0].classList.add('hit'); gaps[0].scrollIntoView({ block: 'center' });
      return;
    }
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

  // ── answers: the files a need asks for, sent with the notes under their question; a sent file never goes again ──
  const asker = function (id) { return 'Need #' + /^need-(\d+)/.exec(id)[1]; };
  function answered(q) { const id = q.getAttribute('data-q'); return !!(data.files[id] && data.files[id].length); }
  // Each question with files the chat has not got yet, in page order: its id, its line, and the files it names.
  function replies() {
    const out = [];
    all('.form [data-q]', function (q) {
      const id = q.getAttribute('data-q'), fresh = (data.files[id] || []).filter(function (f) { return !f.sent; });
      if (fresh.length) out.push({ id: id, files: fresh.map(function (f) { return f.id; }),
        line: '- ' + asker(id) + ', "' + q.getAttribute('data-label') + '": ' + fresh.map(function (f) { return f.name; }).join(', ') });
    });
    return out;
  }
  const fileIds = function (ans) { return ans.reduce(function (ids, a) { return ids.concat(a.files); }, []); };

  // ── files: checked here first, then sent at once through the link or the inbox; a send later names them by id ──
  const MB = 1024 * 1024, uploads = {}, waiting = {};
  let refs = 0;
  function upload(file, question) {
    if (hosted) {
      return file.arrayBuffer().then(function (buf) {
        return new Promise(function (resolve) {
          const ref = 'f' + (refs += 1);
          waiting[ref] = resolve;
          port.postMessage({ type: 'inbox:file', ref: ref, name: file.name, question: question, data: buf }, [buf]);
        });
      });
    }
    return fetch('file', { method: 'POST', cache: 'no-store', body: file,
      headers: { 'x-reply-key': live, 'x-file-name': encodeURIComponent(file.name), 'x-file-question': encodeURIComponent(question) } })
      .then(function (r) { return r.json().then(function (a) { return r.ok && a && /^[0-9a-f]{32}$/.test(a.id) ? { id: a.id } : { error: (a && a.error) || 'it was not sent; try again' }; }); })
      .catch(function () { return { error: 'it was not sent; try again' }; });
  }
  // The app deletes a file a day after it came, or with a tap that failed or was cancelled: one this page holds unsent
  // and the app no longer does goes back to its question, to be picked again.
  const GONE = 'A file is no longer held. Pick it again, then send.';
  function keepHeld(held) {
    let gone = 0;
    Object.keys(data.files).forEach(function (id) {
      data.files[id] = data.files[id].filter(function (f) {
        if (f.sent || held.indexOf(f.id) >= 0) return true;
        gone += 1;
        (uploads[id] = uploads[id] || []).push({ name: f.name, size: f.size, state: 'refused', why: 'the app no longer holds it; pick it again' });
        return false;
      });
    });
    if (gone) persist();
  }
  function bytesHeld() {
    return Object.keys(data.files).concat(Object.keys(uploads)).reduce(function (sum, id) {
      return sum + (data.files[id] || []).concat(uploads[id] || []).reduce(function (s, f) { return s + (f.state === 'refused' ? 0 : f.size); }, 0);
    }, 0);
  }
  function refusal(q, file) {
    const id = q.getAttribute('data-q'), ext = (/\.([a-z0-9]+)$/i.exec(file.name) || [])[1];
    const kept = (data.files[id] || []).length + (uploads[id] || []).filter(function (f) { return f.state === 'sending'; }).length;
    if (!live) return 'open this page from the chat\'s link to send files';
    if (!ext || q.getAttribute('data-types').split(',').indexOf(ext.toLowerCase()) < 0) return 'this question does not take this type of file';
    if (file.size > 25 * MB) return 'too big: 25 MB at most';
    if (kept >= +q.getAttribute('data-count')) return 'this question takes ' + q.getAttribute('data-count') + ' at most';
    if (bytesHeld() + file.size > 100 * MB) return 'the files for this page pass 100 MB';
    return '';
  }
  function send(q, entry) {
    const id = q.getAttribute('data-q');
    entry.state = 'sending'; entry.why = ''; render();
    upload(entry.file, asker(id) + ', "' + q.getAttribute('data-label') + '"').then(function (a) {
      if (a.id) {
        uploads[id] = uploads[id].filter(function (f) { return f !== entry; });
        (data.files[id] = data.files[id] || []).push({ id: a.id, name: entry.file.name, size: entry.file.size, sent: false });
        persist();
      } else { entry.state = 'refused'; entry.why = String(a.error); entry.retry = true; render(); }
    });
  }
  function pick(q, list) {
    const id = q.getAttribute('data-q');
    Array.prototype.forEach.call(list, function (file) {
      const why = refusal(q, file), entry = { file: file, name: file.name, size: file.size, state: why ? 'refused' : 'sending', why: why };
      (uploads[id] = uploads[id] || []).push(entry);
      if (!why) send(q, entry);
    });
    render();
  }
  const sizeText = function (n) { return n < MB ? Math.max(1, Math.ceil(n / 1024)) + ' KB' : (n / MB).toFixed(1) + ' MB'; };
  function drawFiles() {
    all('.form [data-kind="file"]', function (q) {
      const id = q.getAttribute('data-q'), list = q.querySelector('.files');
      list.innerHTML = (data.files[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + ' <span class="tag">Sent</span><button type="button" class="btn-ghost" data-file="' + i + '">Remove</button></li>';
      }).concat((uploads[id] || []).map(function (f, i) {
        return '<li>' + esc(f.name) + ' · ' + sizeText(f.size) + (f.state === 'sending' ? ' <span class="muted">Sending…</span>'
          : ' <span class="why">Refused: ' + esc(f.why) + '</span>' + (f.retry ? '<button type="button" class="btn-ghost" data-retry="' + i + '">Retry</button>' : '')
            + '<button type="button" class="btn-ghost" data-drop="' + i + '">Remove</button>') + '</li>';
      })).join('');
    });
  }
  all('.form [data-kind="file"]', function (q) {
    const drop = q.querySelector('.drop'), input = drop.querySelector('input');
    input.addEventListener('change', function () { pick(q, input.files); input.value = ''; });
    drop.addEventListener('dragover', function (e) { e.preventDefault(); drop.classList.add('over'); });
    drop.addEventListener('dragleave', function () { drop.classList.remove('over'); });
    drop.addEventListener('drop', function (e) { e.preventDefault(); drop.classList.remove('over'); pick(q, e.dataTransfer.files); });
    q.querySelector('.files').addEventListener('click', function (e) {
      const b = e.target.closest('button'), id = q.getAttribute('data-q');
      if (!b) return;
      if (b.hasAttribute('data-file')) { data.files[id].splice(+b.getAttribute('data-file'), 1); persist(); return; }
      const entry = uploads[id][+(b.getAttribute('data-retry') || b.getAttribute('data-drop'))];
      if (b.hasAttribute('data-retry')) send(q, entry);
      else { uploads[id] = uploads[id].filter(function (f) { return f !== entry; }); render(); }
    });
  });

  // ── what the build needs: an item that needs you counts until each of its questions has an answer ──
  function needsOpen() {
    return Array.prototype.filter.call(document.querySelectorAll('.need[data-need="needs"]'), function (n) {
      const qs = n.querySelectorAll('[data-q]');
      return !qs.length || Array.prototype.some.call(qs, function (q) { return !answered(q); });
    });
  }
  function drawNeeds() {
    const gaps = needsOpen();
    all('.need[data-need="needs"]', function (n) {
      const done = gaps.indexOf(n) < 0, tag = n.querySelector('.tag-outline, .tag');
      tag.className = done ? 'tag' : 'tag-outline';
      tag.textContent = done ? 'Answered' : 'Needs you';
    });
    return gaps.length ? gaps.length + (gaps.length === 1 ? ' thing needs you' : ' things need you') : '';
  }

  // ── live cards: the chat's own page in a sealed frame, to try; it sends this page nothing ──
  // A frame loads once; a second load means its page went somewhere else, so it starts again from its own copy.
  const cards = [];
  function mount(c) {
    const f = document.createElement('iframe');
    let loads = 0;
    f.setAttribute('sandbox', 'allow-scripts'); f.title = c.title; f.setAttribute('srcdoc', c.doc);
    f.addEventListener('load', function () {
      loads += 1;
      if (loads === 1) return;
      c.resets += 1;
      c.said.hidden = false;
      c.said.textContent = 'This card tried to leave the page.' + (c.resets > 2 ? ' Reload the page to try it again.' : '');
      if (c.resets > 2) f.remove(); else mount(c);
    });
    c.box.replaceChildren(f);
    queue();
  }
  // The card's view sizes the frame; a live card never moves, since a moved frame loads again.
  all('.live[data-live]', function (box) {
    const old = box.querySelector('iframe'), said = document.createElement('p');
    said.className = 'muted live-said'; said.setAttribute('role', 'status'); said.hidden = true;
    const c = { box: box, doc: old.getAttribute('srcdoc'), title: old.title, said: said, resets: 0 };
    box.closest('.item').querySelector('.words').appendChild(said);
    cards.push(c);
    mount(c);
  });

  let width = root.clientWidth;
  window.addEventListener('resize', function () {
    if (root.clientWidth !== width) {
      width = root.clientWidth; hideChip();
      folds.forEach(measure);
    }
    queue();
    if (view) fitBig();
    if (open) place();
    bar();
  });
  window.addEventListener('load', queue);
  // ── hosted: in the live app's inbox, a sealed frame that reaches the inbox only through the port its first greeting carries ──
  let hosted = null, port = null;
  const CODES = { sent: 200, changed: 409, done: 409, gone: 409, soon: 429, closed: 410, expired: 410 };
  function post(message) { port.postMessage(message); }
  // The inbox answers a tap only once the chat has it, or once it is refused, cancelled or failed.
  function hostedAsk(path, body) {
    return new Promise(function (resolve) {
      hosted.reply = function (state) {
        const status = Object.prototype.hasOwnProperty.call(CODES, state) ? CODES[state] : 502;
        const answer = status === 200 ? { sent: true } : state === 'changed' || state === 'done' || state === 'gone' ? { [state]: true } : { sent: false };
        resolve({ ok: status === 200, status: status, json: function () { return Promise.resolve(answer); } });
      };
      const tap = { type: 'inbox:tap', action: path === 'send' ? 'send' : body.action, text: body.text || '' };
      if (body.files) tap.files = body.files;
      post(tap);
    });
  }
  // The inbox's switch owns the look: this frame can't remember a choice, so its own switch goes. Unknown looks change nothing.
  function look(theme) { if (theme === 'light' || theme === 'dark') document.documentElement.classList.toggle('dark', theme === 'dark'); }
  function heard(m) {
    if (!m || typeof m !== 'object') return;
    if (m.type === 'inbox:theme') look(m.theme);
    else if (m.type === 'inbox:notes' && (typeof m.value === 'string' || m.value === null)) {
      load(m.value);
      if (hosted.held) keepHeld(hosted.held);
      hosted.held = null; render();
    } else if (hosted.reply && m.type === 'inbox:result') {
      if (Array.isArray(m.files)) keepHeld(m.files);
      const reply = hosted.reply; hosted.reply = null; reply(m.state);
      // A tap that reached the chat closes the page in the inbox, so it reads as answered now, as Artifacts shows it.
      if (m.state === 'sent') closePage();
    } else if (m.type === 'inbox:file-result' && waiting[m.ref]) {
      const done = waiting[m.ref];
      delete waiting[m.ref];
      done(typeof m.id === 'string' && /^[0-9a-f]{32}$/.test(m.id) ? { id: m.id } : { error: typeof m.error === 'string' ? m.error : 'it was not sent; try again' });
    }
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
  // A closed or answered page in the inbox is read-only: no button, no note, no answer or file.
  function closePage() {
    readOnly = true; document.body.classList.add('read-only');
    all('.form input', function (el) { el.disabled = true; });
    render();
  }
  window.addEventListener('message', function (e) {
    const m = e.data;
    if (hosted || window.parent === window || e.source !== window.parent || !e.ports || !e.ports[0] || !m || m.type !== 'inbox:hello'
      || typeof m.version !== 'string' || !Array.isArray(m.actions)) return;
    // The files the app still holds for this page, checked once its notes arrive.
    hosted = { reply: null, held: Array.isArray(m.files) ? m.files : null };
    port = e.ports[0];
    port.onmessage = function (ev) { heard(ev.data); };
    document.querySelectorAll('.theme-toggle').forEach(function (button) { button.remove(); });
    look(m.theme);
    // Notes live with the inbox page: this frame has no storage of its own.
    store = { setItem: function (key, value) { post({ type: 'inbox:notes-set', key: key, value: value }); } };
    post({ type: 'inbox:notes-get', key: KEY });
    backRow(m.workspace);
    if (m.readOnly === true) { closePage(); return; }
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
