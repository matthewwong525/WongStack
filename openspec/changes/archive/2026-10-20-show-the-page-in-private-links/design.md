# Design

## Context

`hand-over.mjs open` checks the form file, confirms a page is open in the session (`pageFault`), starts the tunnel, writes `state.json`, and spawns the `watch` process that serves the page through `servePage`. Page files come from `pages()`; key-guarded JSON routes come from `formRoutes` / `passwordRoutes`. `--passwords` takes no `--session` today. `browse.mjs` `screenshot()` reads camofox's `/tabs/:id/screenshot`, which also takes `fullPage=true`. Saved logins live in `~/.wong-stack/logins.json` (mode 0600, clear text), written only by `passwords.mjs`, read for a password only by `browse.mjs login`. `sendForm` in `form.mjs` fills fields, clicks once, waits for the finish, and puts every field back on `not-accepted`. See proposal.md for why.

## Goals / Non-Goals

**Goals:** one picture per form or one-site password link, taken before any private input; a zoomable full-screen view; the drop box last on the password page; saved details that the agent reuses after a chat yes without reading private values.

**Non-Goals:** a picture on the key link or the live view; encrypting saved details (logins are not encrypted either); matching saved details by site rather than by box kind; a page to browse or edit saved details.

## Decisions

1. **The opener takes the picture.** `open` calls the session client's new `screenshot({ fullPage: true })` right after `pageFault`, before the tunnel starts, and writes it to `~/.wong-stack/hand-over/picture.png` (0600). `clearLink` removes it. Taking it in the opener, not the watcher, keeps the rule "no picture once the form is open" true by construction. *Alternative:* the agent passes a picture path — rejected, the agent could pass a stale one. A failed picture does not stop the link: the page shows none.
2. **The picture is behind the key.** A new `GET /picture` route, checked with `x-hand-over-key` like every route, serves the PNG with `no-store`. The page fetches it as a blob and shows an object URL. A plain `<img src>` would need the key in the URL and would leave the site's page (with the person's email typed in) one guess away. `/form` and the password page's start say whether a picture exists, so the page draws no empty frame.
3. **Password link: `--session` and a host check.** `--passwords` accepts `--session`. With `--site`, `open` reads the session page's address; it takes the picture only when `hostOf(url)` equals the site's host or ends in `.<host>`. No page or another host → no picture, no error.
4. **One viewer, shared.** A new `picture-view.mjs` is served at `/picture-view.mjs` for the form and password modes and imported by both pages. It renders the thumbnail button and a full-screen `<dialog>`: the image starts fitted to width; pointer events give drag-to-pan and two-finger pinch; `+`/`−` buttons step the zoom from fit to 4×; `Close` and Escape return focus to the thumbnail. *Alternative:* open the image in a new tab — rejected, a blob URL tab loses the key-guarded fetch on reload and leaves the form.
5. **Drop box last.** `passwords-page.html` moves `#drop`, `#file`, `#file-error`, and its hint after `#add-form`, with the *Or drop your password export here* wording always. `prefill` no longer reorders the page. The picture slot sits under the promise line.
6. **Saved details: `details.mjs` and `~/.wong-stack/details.json`.** Shape: `[{ name, hint, private, fields: [{ kind, label, value }] }]`, mode 0600, written whole through a temp file and rename, like `writeLogins`. `kind` is the form's autofill name, so a later form matches by kind, not by site. Commands:
   - `details.mjs list` prints each set's name, hint, and kinds; everyday sets also print values; private values never print.
   - `details.mjs save --name <n> --field <kind>=<value>...` saves an everyday set from the chat. A private set can not be saved this way.
   - `details.mjs forget <name|--all>` deletes and prints the names removed.
   The hint for a set with `cc-number` is `card ending NNNN`; otherwise its labels joined.
7. **Saving from the private form.** The page sends `{ values, save: true|false }`. `checkValues` stays the gate for `values`; `save` must be a boolean. Only when `sendForm` returns `done` and `save` is true does the watcher write a private set named from the form title (`pay-city-of-markham` → replaced on a repeat), and the receipt carries `saved: [name]` with its hint, which `wait` prints. A `not-accepted` send saves nothing.
8. **Filling saved details: `hand-over.mjs fill`.** `fill --form <file> --use <name> (--until | --until-gone) [--session]` reuses the form file and `sendForm`, with values taken from the set by each field's `kind`, in the same process: no value crosses argv, env, or output. Dropdowns match by normalising both sides (trim, case, leading zeros, a two- or four-digit year) against the field's `options`; any field with no saved kind or no matching choice stops before typing and prints `HANDOVER_RESULT=missing` with the label. It prints `HANDOVER_RESULT=done` or `not-accepted`, the same as a form's `wait`. It runs no tunnel, so it shares the private-link lock to stop a form and a fill typing on one page at once.
9. **Docs own the ask.** A new `wiki/development/private-form.md` owns the private form procedure, with the picture and the save tick, and a `## Saved details` section that owns the chat questions, the `fill` steps, and forgetting; `browsing.md`, at its word cap, keeps a short stub linking there. `passwords.md` notes the picture and `--session`. The hand-over skill lists `fill` and `details.mjs`.

## Risks / Trade-offs

- [A saved card sits unencrypted on disk] → mode 0600 beside logins.json, never in git or logs; the proposal says so plainly; *forget my card* deletes it.
- [The picture shows ordinary answers the agent typed (email, address) to anyone holding the link] → the same link already sends to the site; the picture is key-guarded and deleted at close.
- [A long page makes a tall picture] → camofox caps full-page size; the viewer scales to fit width and the thumbnail crops to a fixed height with a *Tap to zoom* caption.
- [A dropdown normaliser picks the wrong choice] → it accepts only one exact normalised match; zero or several → `missing`, and the agent sends a private form.
- [The agent reads details.json with `cat`] → the hand-over skill and wiki forbid it, as for logins.json; the spec forbids it showing in any command output.

## UX

### Use-case brief

The business owner, on a phone or laptop, opens a private link the chat sent mid-task to pay or log in. Done is the site accepting the details without a second look at the chat. Common case: a card form or one site's login; edge case: a link with no page behind it. Mirrors the existing private form and password pages.

### Flow

Open link → see the picture → (optional) tap to zoom, close → fill boxes → (optional) tick *Save for next time* → tap the site's button. Next time: the chat asks *Use card ending 4242?* → yes → receipt picture.

### Hierarchy

Private form: the site's button stays the one primary action; the picture is a quiet thumbnail above the boxes. Password page: *Save and continue* stays primary; the file drop drops to the end.

### Review

[review.html](review.html): the first bullet sketches the form before and after plus the full-screen view; the second the password page before and after; the third the save tick; the fourth the chat question.

### Components

Existing: the private page look (`private-page.css`), `card`, buttons, text boxes. New: the picture thumbnail and full-screen viewer in `picture-view.mjs`, shared by both pages, because no existing part zooms an image.
