# Design

## Context

35.0.0 put every screen on shadcn parts and Tailwind, with one stylesheet, `app/src/index.css`. Layout was left as it was:

- `Layout.tsx` puts `main` in `mx-auto max-w-lg`, and Access breaks out of it with a negative-margin class, `WIDE`, in `access/App.tsx`. An opened page then narrows its form to `max-w-lg` again.
- Each Access view returns either its list or a page (`People` returns `PersonPage` when the address names one), so opening one replaces the list.
- `Confirm.tsx` is a card in the page flow; `ConnectDialog.tsx` is a `Dialog`.
- `AssistantSetup.tsx` has two shapes, a card and a popup body, and three callers: Home's card, `access/Connect.tsx`, and `access/App.tsx` for a person who manages nothing.
- List cells hold `SetLabels`: a wrapping row of badges per app and key level, plus `Gaps`.

The checkout this is built in must hold 35.0.0: `app/src/components/ui/` exists there.

## Goals / Non-Goals

**Goals:**

- One container decides every page's width and left edge; no page overrides it.
- One way to open an item, one way to ask a question, one place for Connect.
- Keep every address, every server call and every saved shape as it is.

**Non-Goals:**

- No Worker change: `app/worker/` is untouched, the setup prompt's text included.
- No new colour, font or token in `index.css`.
- No change to `Tutorial.tsx`.

## Decisions

### The frame lives in `Layout.tsx`

`main` becomes `mx-auto w-full max-w-[60rem] px-4`, and the bar's contents sit in a div with the same three classes, so the logo and every `h1` share a left edge. A page that is text or a form wraps its content in `max-w-lg`: Home, Hello, Tips, `AppPage`'s stopped states and `NotFound`. Access's lists take the frame. `WIDE` and its `calc` margins are deleted.

*Over a `width` prop per route:* the route table would need to know each app's shape, and a mini app the assistant builds later would have to register it. A class on the page is local and matches how [mini apps](../../../wiki/stack/mini-apps.md) are written.

*Over centring the narrow pages in the wide frame:* that keeps the jump the proposal removes.

`@container` stays on Access's root, so rows still stack by the room they have.

### An opened item is a `Sheet` driven by the address

Add the `sheet` part (`npx shadcn@latest add sheet` from `app/`). Each view always renders its list; when the address names an item, or `new`, it also renders the item in `<Sheet open>` on the right, `w-full sm:max-w-md`. `onOpenChange(false)` navigates to the view's home through the same `hold` check `Page.tsx` has today, so *✕*, Escape, a click outside and *Cancel* all ask when there are changes. `Page.tsx` becomes the sheet's frame: title, fields in a scrolling body, *Save* and *Cancel* in a footer that stays in view. The breadcrumb line and the page's own `h2` go; `SheetTitle` names the item.

*Over local `useState` for which item is open:* the address already names it, the three kept journeys and the save redirect rely on it, and Back closes the panel for free.

*Over a two-column page with no overlay:* at 60rem the list's four columns do not fit beside a form; an overlay keeps the list at its width.

The list's row for the open item gets `aria-current="true"`, a `bg-muted` fill and a bar on its leading edge, so it is not marked by colour alone.

`Group` in `Fields.tsx` loses its border and padding and keeps its `fieldset` and bold `legend`, with a larger gap between groups than within one.

### Questions use `AlertDialog`

Add the `alert-dialog` part. `Confirm.tsx` keeps its props and renders an `AlertDialog` that is open while mounted: the cancel button is the default focus, the action is the one solid button. `RowMenu` already runs `modal={false}`, so a pick that opens a question hands it the keyboard. The leave question opens over the sheet; Radix stacks the two and returns focus to the sheet on *Keep editing*.

*Over `Dialog`:* `AlertDialog` does not close on an outside click, which is right for *Remove*.

### Rows are text, not badges

`levels.ts` gains `summary(status, set)`, returning the count line (*2 apps, 1 key*, *No apps*, *1 app*) and the number of gaps from the existing `gaps()`. People's last column becomes that line with `! 1 gap` after it in semibold when there is one; the owner's row says *Everything*. *Manager* joins *You* beside the email. Roles shows the same summary and a people count; Apps shows *Uses* and a holders count; Keys shows saved, used by, and one cell with a count per level. `SetLabels`, `Names` and `Gaps` stay for the sheet (`RoleSet`) and for `Own.tsx`.

Cells drop `align-top` and wrapping for `truncate` on the email, with the full email in `title`. The `STACK` classes for a narrow container stay.

An unsaved key's row says its state in words and opens the sheet, where `FinishStep` shows the request to copy.

### The views are the heading

`View.tsx`'s `nav` becomes one flex row: the four links, then an `add` slot pushed to the end. `Table.tsx` drops its visible `h2` and labels the table from the current link's id. Apps and Keys pass no `add`; their hint moves to a muted line under the table. `App.tsx`'s header row is the `h1` alone.

### Connect has one body

`AssistantSetup.tsx` loses the `popup` prop and the card shape and is rendered only by `ConnectDialog.tsx`. Its ready state is an ordered list of three steps; step 1 holds `CopyText` with the solid button, step 3 the email. Under the list: the line to try and the apps. `CopyText` takes a `variant` for its button and its `details` summary reads *Can't copy? Show the message*. The error text no longer mentions signing in. `access/Connect.tsx` is deleted, `access/App.tsx` stops rendering `AssistantSetup` for a person who manages nothing, and `access/app.json`'s description drops *Connect your assistant*.

The workspace *Connect installs the project* adds its step to this list; this change leaves `setup.ts` and `prompt.ts` alone so the two do not meet in the Worker.

## Risks / Trade-offs

- [A screen an install built assumed the centred narrow column] → It moves to the frame's left edge at its own width; the changelog says so, and nothing breaks. An install screen that set its own `max-w-*` keeps it.
- [One-line rows hide which apps a person has] → Chosen knowingly; the gap count stays on the row and the sheet names everything.
- [Two overlays stacked: the sheet, then the leave question] → `Leaving.test.tsx` covers focus going to the question and back; the kept journey for leaving is recorded again on the preview.
- [The three kept journeys click through pages that no longer exist as pages] → They are recorded again in the last group, after the build is saved.
- [`components/ui/` grows by two copied parts] → That folder is already exempt from coverage, dead-code and duplicate checks; no new exemption.

## Migration Plan

No data moves. A release entry at `minor`; installs get the new frame and Access on their next update with no hand step.

## UX

### Use-case brief

- **Who and the job.** The owner or a manager, at a desk, about weekly: add a person, change what one person can use, remove one. Done is the list showing the change and *Saved*. Everyone else, once per computer: connect their assistant; done is the assistant answering *What can I do here?*
- **Context.** A computer for both jobs: Access is managed at a desk, and Connect is pasted into an assistant on that computer. A phone must still work, so the panel fills the screen and rows stack.
- **Common vs edge.** Common: change one person's role (stays in the row) or apps (the panel). Edge: a key not saved yet, a removed person added back, a gap between an app and a key level.
- **Frequency, assumed.** A list is scanned far more often than an item is opened, so the list gets the density and the panel gets the air.
- **Closest existing screen.** The People list as 33.4.0 left it; the other three views mirror it.

### Flow

Home → Access → click a row → change → *Save access* → the list, with *Saved*. Connect: Home → the card → *Copy* → paste in the assistant → approve.

### Hierarchy

- **A list:** the add button is the one solid button. Counts and sign-in state are muted; names are not.
- **The panel:** *Save* is solid; *Cancel* and *Remove role* are outline.
- **A question:** the action is solid, the way out is outline and focused first.
- **Connect:** *Copy* is solid; *Try again* is the one button in the failed state.

### Review

[review.html](review.html). What Changes item 1 sketches the frame, 2 the rows, 3 the list's heading, 4 the panel on a computer and a phone, 5 a question, 6 Connect's steps, 7 its two failure states.

### Components

Existing: `Table`, `Button`, `Badge`, `Dialog`, `DropdownMenu`, `NativeSelect`, `Alert`, `Input`, `Label`, `Card`. New, both copied from shadcn: `Sheet` for the panel, `AlertDialog` for questions.
