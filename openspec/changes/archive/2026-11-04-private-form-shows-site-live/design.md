## Context

This change ports WongOS PR #279 (commit `f25f88c1` in `/root/WongOS`, its archived plan `openspec/changes/archive/2026-11-04-pay-with-live-view-backup/`). That plan's `design.md` owns the full reasoning; read it before building. This page holds only what differs here.

Every hand-over script this change touches (`hand-over.mjs`, `form.mjs`, `form-page.mjs`, `passwords-page.{html,mjs}`, `view.mjs`, `view-page.{html,mjs}`) and the pages `passwords.md` and `private-form.md` are byte-identical here to WongOS at `f25f88c1^`, so WongOS's diff applies as is. `browse.mjs` differs only in a comment's line wrap near `boxAt`; `browser-server.mjs` applies with offsets. `browsing.md`, `live-view.md` and `wiki/development/README.md` differ in WongOS-only lines.

## Goals / Non-Goals

**Goals:** the behavior of WongOS's decisions 1–7: a view phase from the press with a status line, a shown-only `--until-gone` and `--until-text`, a `ready()` check before typing (`HANDOVER_REASON=page-changed`), the after-check written in the wiki, password sign-in with a view, `BROWSE_CLICK=script`, the 30 s slow-step rule, `open --view --keep-open`, no `putBack` after a press, PayPal through a live view.

**Non-goals:** WongOS-only parts: `refused-sites.md` and its move of the refusal steps; the home Pi and Canadian proxy; `network off`; en-CA; the email browser lease; Matthew's accounts. No change to `wiki/development/README.md` (its WongOS hunk only rewords the `refused-sites.md` line).

## Decisions

### 1. Apply the code diff, then fix the one hunk

`git diff f25f88c1^ f25f88c1 -- .agents/skills/hand-over/scripts .agents/skills/browser/scripts ':!*.test.mjs'` from `/root/WongOS`, applied here. The `refNames` hunk in `browse.mjs` fails only on context (a re-wrapped comment above `boxAt`): insert `refNames` after `boxesIn` by hand. The code diff holds no WongOS-only part (checked: no proxy, locale, lease, or account names).

### 2. Tests move into `scripts/tests/`

WongOS keeps tests beside each script; here they sit in `scripts/tests/` and import `../../.agents/skills/...`. Port each new or changed case from WongOS's `browse.test.mjs`, `browser-server.test.mjs`, `hand-over.test.mjs`, `form.test.mjs` (new in WongOS; this repo's `form.test.mjs` already exists, so add the cases to it) and `live-pages.test.mjs` (new file here) into the same-named file, with this repo's imports and helpers. A case that depends on a WongOS-only helper is rewritten on this repo's equivalents, not dropped. Store examples in test data may stay as WongOS wrote them.

### 3. The wiki: WongOS's hunks, minus WongOS-only lines

- `private-form.md`, `passwords.md`: apply WongOS's hunks as is.
- `live-view.md`: apply WongOS's hunks; the lines that differ here are WongOS wording of the Messenger example, outside the hunks.
- `browsing.md`: apply WongOS's hunks except the *When a site refuses the browser* rewrite and the email browser lease context; keep this repo's refusal steps. The page is at 2,994 words and its cap is 3,000: WongOS's own trims (the *24 hours*, *After it closes*, *Is a link safe?*, *The private form* lines, the `cookies clear` sentence) offset part; cut further words elsewhere on the page without losing a rule, or move a detail to the page that owns it (`live-view.md`, `private-form.md`), until `wc -w` is under 3,000 and the wiki checks pass.
- Generic wording: WongOS's dated DigiKey lessons stay where they explain a rule (a real case teaches it); drop any mention of Matthew, WongOS-only pages, or an email lease.

### 4. Release

A `## Next (minor) — A card form shows the site live from the press` entry in `CHANGELOG.md`, with an **Updating.** note that the running browser gets the new `front` route at its next start, and nothing else to do by hand.

## Risks / Trade-offs

- **Two copies drift again** → after this lands, WongOS's next sync finds these files equal to WongStack's, and their difference list shrinks.
- **The running browser lacks the `front` route until it restarts** → the window raise fails quietly, as WongOS found; no restart just for this.
- **Live checks need a real card** → the build runs WongOS's no-card local test only if this computer has the browser and live view tools; else the automated tests are the check.

## Migration Plan

None: new flags are optional; old links keep working. Rollback is a revert.

## UX

### Use-case brief
A person pays a site the agent filled, or finishes a login or a stuck step. Done: the site accepts and they know within a minute, or they see why not. Mirrors WongOS's [live view](../../../wiki/development/live-view.md) screen.

### Flow
Form → Pay → the same page shows the site live with *Paying <Site> · n s* → finish → *<Site> accepted. Done.* No finish in a minute → *Don't pay again unless it shows an error* → *done* → the agent reads the page and reports.

### Hierarchy
The status line first; the site below is the place to act; no button but the view's own *Done* (or *I'm finished* on a view that stays open).

### Review
`review.html` in this folder; What Changes item 1 sketches the view phase and its one-minute state.

### Components
The existing `form-page.html` and `view-page.html` (noVNC viewer); no new component.
