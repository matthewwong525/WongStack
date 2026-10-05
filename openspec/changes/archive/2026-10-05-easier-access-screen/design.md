# Design

## Context

See [the proposal](proposal.md) for why. Access's owner screens live in `app/src/apps/access/`: four list views (`People.tsx`, `Roles.tsx`, `Apps.tsx`, `Keys.tsx`), a page under each, and shared parts (`SetFields.tsx`, `LevelChoice.tsx`, `Page.tsx`, `View.tsx`). `Owner.tsx` reads the whole status once and hands every view the same `save`. Text lines come from `levels.ts`, `subjects.ts` and `status.ts`.

Constraints that shape the work:

- `style.test.ts` holds `Access.css` to `.access-` selectors, no pixel widths, wrapping rows, and a current view and level marked by more than colour.
- The page is the shared 32rem column from `app/public/style.css`, the only file that styles whole elements.
- The app uses a data router (`createBrowserRouter` in `app/src/main.tsx`), so `useBlocker` is available; the Access tests render through `MemoryRouter`, which is not one.
- `policy.ts` gives the verification service token every app and the role `employee`; `ownerCore()` in `core.ts` refuses anything but the owner's verified human email. `WONG_ENVIRONMENT` is `production`, `staging` or `local`, committed per Worker in `app/wrangler.jsonc`.
- This repo's one saved key, Cloudflare, is used by no app.

## Goals / Non-Goals

**Goals:** one place to give an app and its key level; lists that read at a glance; the assistant can walk the owner's screens on a preview.

**Non-Goals:** any change to the status response, the save routes or the database; a table view; a design system beyond `Access.css`.

## Decisions

### 1. `SetFields` nests each ticked app's keys under it

`SetFields` keeps its props. For a ticked app it renders a `LevelChoice` per `appUses(status, app)` key, bound to the same `set.keys[key.id]`, so two apps sharing a key stay in step with no extra state. Under the picker, `shortLine` becomes a hint that names the fix (*Pick Read & write to let it*). An unticked app shows a short `uses …` beside its name. Below, a second group lists the keys no ticked app uses, with `heldUseLine`'s note for a key that works alone.

*Instead of* a separate "raise all to Read & write" shortcut: ticking must never give Read & write, and a shortcut one tap from the tick blurs that.

*Shared keys:* each `LevelChoice` already takes its radio group name from `useId`, so the same key under two apps is two groups showing one value. A muted line under the second says the level is shared.

### 2. Labels are one small part, fed by data helpers

A new `Labels.tsx` renders a list of short strings as `<ul class="access-labels">` chips. `levels.ts` gains helpers that return arrays where it now returns dotted strings (apps as titles, levels as `Stripe Read`), and a `gaps(status, set)` that returns each `shortLine` with its app's title. `People`, `Roles`, `Apps`, `Keys` and `Own` use them. `subjects.ts` gains `holdersByLevel(status, key)` for the Keys list. The dotted-line helpers that lose their last caller are deleted, with their tests moved to the new ones.

*Instead of* colour-coded chips: the level is written in the chip, and a gap line starts with a `!` and the word, so nothing depends on colour, as `style.test.ts` already demands for the level picker.

### 3. The save result is a notice box, and leaving asks first

`Owner.tsx` already carries the result in router state. It renders in the `access-notice` box with `role="status"`, and with `role="alert"` when the save did not finish; the empty paragraph it leaves today goes.

`Page.tsx` takes a `changed` flag from each page (current state compared with its starting state). When set, the back link, *Cancel* and the view switch ask through the existing `Confirm` part; `beforeunload` covers a reload or a closed tab. `useBlocker` covers the browser's Back button where a data router is present; the guard on the page's own links is what the `MemoryRouter` tests exercise.

*Instead of* autosave: a removal and a role change govern people's next request, so each save stays one deliberate press.

### 4. The checker is the owner on staging

`policy.ts` exports its `checker()` test. In `currentPolicy()`, and in `ownerCore()`, a checker identity counts as the owner when `env.WONG_ENVIRONMENT === "staging"`. `ownerCore()` uses the token's `common_name` as the subject. Production and local keep today's rule. The policy comment and the `policy.test.ts` and `core.test.ts` cases change with it: staging allows, production still refuses.

*Why it is safe:* staging holds no sign-in-list key and makes no Cloudflare call, its people are practice data that each preview check reseeds, and the environment name is committed config, not something a request can set. The same token on the live app still gets `owner_required`.

*Instead of* a second, owner-flavoured token: one more secret to mint, store and rotate, for the same reach.

## Risks / Trade-offs

- [The checker no longer sees the non-owner view on a preview] → `Own.tsx` keeps its code tests, and its new look is checked there; the walk says so.
- [No built app here uses a saved key, so a preview can't show a key under an app] → `PersonPage.test.tsx` and `Roles.test.tsx` cover it with the Stripe and Bank fixtures; the report names it as shown in tests only.
- [A leave question on every stray tap would annoy] → it shows only when the page's state differs from where it started.
- [An install that named its staging environment differently] → the rule reads the same `WONG_ENVIRONMENT` value setup writes; anything else behaves as today.

## UX

### Use-case brief

The owner of a small business, at a desk or on a phone, a few times a month: *give this person the app they need and let it do its job*, and *check what someone can do*. Done is a saved person or role whose apps work, with no gap line left. Common case: one person, one or two apps, one level raised. Edge cases: a key shared by two apps, a key that works with no app, a role held by many. The closest existing screen is the person page itself; this change regroups it, phone-first.

### Flow

People → *Edit* → tick the app → pick the level under it → *Save access* → back on People with a *Saved* box and the person's labels updated. Nothing in the common case needs a scroll to a second list. A key no app uses is one group further down the same page.

### Hierarchy

- **Lists:** the name is the loudest thing; sign-in status sits muted beside it; labels carry the answer; a gap line is the one accented item. *Add person* / *Add role* stays the one filled button.
- **Pages:** *Save access* / *Save role* is the one filled button. App names carry weight; `uses …` and hints are muted; pickers sit indented under their app.

### Review

[review.html](review.html) sketches each screen in the proposal's What Changes: the person and role page under *An app's keys sit under its tick*, the People and Roles lists under *People and Roles show apps and levels as labels*, the Keys list under *Apps and Keys group who has what by level*, the non-owner box under *Your own view uses the same labels*, and the save and leave states under *A save you can't miss*.

### Components

Existing: `View`, `Page`, `SetFields`, `LevelChoice`, `Confirm`, `Notices`, `CopyText`. New: `Labels`, because five screens show the same chips.
