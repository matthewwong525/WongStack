# Design

## Context

See proposal.md for why. This ports WongOS commit `1dedc6b` (PR 221, archive `2026-10-28-login-in-site-frames`): WongStack's `browse.mjs` equals WongOS's before that commit except for WongOS-only parts (upstream proxy, `network off`, en-CA, `--main-domain`), so the frame-login hunks apply as they are, minus those. Facts WongOS checked on 2026-10-28 against camofox 1.18.1 and a live sign-in frame from another host:

- camofox already reads child frames, cross-origin included, with Playwright's `frame.locator('body').ariaSnapshot()` (`getAriaSnapshot`, up to 8 frames, 3 s each, tracking frames skipped). It appends each frame with boxes as `- iframe "<label>":` after the main page, where `<label>` is the frame's name (Shopify suffixes cut by `replace(/card-fields-/, '').replace(/-[a-z0-9]{10,}$/, '')`) or else its URL's hostname.
- `buildRefs` gives frame boxes refs that hold `frameName`/`frameUrl`; `refToLocator` resolves them in the frame, so `type`/`click` by ref work in a cross-origin frame. Fresh opens of a live sign-in page showed `- iframe "<name>":` with its email textbox near the end, after the footer; `type` then `get value` by that ref worked.
- The main page's `iframe` element carries the `name` (or `id`) camofox uses as the label and a `src` on the frame's host.
- `/tabs/:id/evaluate` runs only in the main frame (`tabState.page.evaluate`). So `SECRETS_SCRIPT`, `MARK_SCRIPT`, `fieldScript`, and `count` can't reach a cross-origin frame, and an invalid selector throws a `SyntaxError` from `querySelectorAll`.
- `login` checks only `page.url()` (the main frame) against the entry's host, and after the password waits up to `LOGIN_WAIT_MS` for `leftPage`, else `rejected`.

## Goals / Non-Goals

**Goals:** frame boxes found on the first read; a per-box site check in `login`; a typed password hidden in any frame; `next-step` for a code page; a plain selector error.

**Non-Goals:** WongOS's upstream proxy, en-CA, `network off`, and `--main-domain`; changing or forking camofox (pinned by `CAMOFOX`); selectors that pierce frames; nested frames beyond "unknown site"; raising camofox's 8-frame or 3-second limits.

## Decisions

### 1. Frame note and site headers, added after `relabel`

`page.snapshot()` already runs one `evaluate` for `SECRETS_SCRIPT`; it also runs `FRAMES_SCRIPT`: `[...document.querySelectorAll('iframe')].map(f => [f.name, f.src])`. A pure `frameSites(snapshot, frames)` maps each `- iframe "<label>":` header to a host: a label equal to a cleaned name (same clean-up as camofox) gives that iframe's `src` host; a label that parses as a hostname is the host; else unknown. Two iframes with the same cleaned name but different hosts make the label unknown. A pure `labelFrames(snapshot, sites)` rewrites each header to `- iframe "<label>" (<host>):` or `(unknown site)` and puts `- note: boxes in frames are at the end: <label> (<host>), …` as the first line when any frame block has a ref.

It runs after `relabel` and `hideSecrets`, so `FRAME` and `relabel`'s numbering see camofox's raw headers. `settle` keeps comparing raw reads.

*Alternative:* move each frame block in place of its bare `- iframe` line in the main page. Rejected: tracking frames also print a bare `- iframe`, so with several frames the match is a guess.

### 2. `login` checks each box's frame site

`login` reads `page.snapshot()` once before typing and once more before the password when a username was typed (the page may have moved). A pure `frameOf(snapshot, ref)` returns `null` for a main-page ref, else the host from its block's header, or `''` when unknown. A box is on site when the main address is (`onSite`, as today) **and** its frame host, if any, passes the same `onSite` test; `''` fails. Only `--username` and `--password` refs are checked; `--submit` types nothing.

A fresh read is used rather than the agent's earlier one: camofox resolves a ref against its newest refs, so the fresh read is the one the typing hits.

### 3. A keyed record of the typed password

After typing a password, `login` adds `HMAC-SHA256(apiKey(), plain(password))` to the tab file's `typed` list (last 5 kept; the tab file is 0600 and goes on `close`). `hideSecrets(snapshot, secretValues, typed)` also hides a box whose `plain(value)` HMAC is in `typed`. `page.mark()` stays for same-origin boxes. The key is the 32-byte random camofox API key already in `~/.wong-stack/camofox/api-key`.

*Alternative:* let `snapshot` read saved passwords to compare. Rejected: `login` is the only reader of passwords. *Alternative:* plain SHA-256. Rejected: a weak password can be guessed back offline.

### 4. Enter in the typed box, and `next-step` by the password box

With no `--submit`, `login` presses Enter in the box it typed into, not page-wide: a page-wide Enter misses a cross-origin frame.

When the wait ends with no `leftPage`, `login` reads the snapshot. If a textbox named `/password|passcode|passwort/i` is there, or the password ref's line is still a textbox, the result is `rejected`; else `next-step`. `SECRET_NAME` is not used here: it matches *verification code*, the very box a code page shows.

### 5. Plain selector error

`count` and `fieldScript` wrap `querySelector(All)` in `try`, returning a marker on a `SyntaxError`; the client throws `BrowseError('<selector> is not a selector this page can read; a selector reads only the main page, so use the box's ref')`. A valid selector that matches nothing keeps today's output.

### Docs

`USAGE` lists `next-step` and the selector rule. `wiki/development/browsing.md#saved-browser-logins` gets a short *boxes in a frame* paragraph, `next-step` in the result list and step 2, and "use a frame's refs and the saved login, or the password form, before a live view", in general words. `.agents/skills/browser/SKILL.md` gets one line. browsing.md is at 2,919 words, so its *Steps for you to finish* list moves to `wiki/development/finish-steps.md` (the heading stays with a link, so old anchors land), linked from `wiki/development/README.md`.

### Tests

WongStack's browser tests live in `scripts/tests/browse.test.mjs` (run by `payload.yml` through `node --test scripts/tests/*.test.mjs` under c8), not beside the script. Port WongOS's frame tests there, adapted to that file's style: pure tests for `frameSites`, `labelFrames`, `frameOf`, `hideSecrets` with `typed`, and the selector error; `login` tests through a fake page or the existing fake camofox fixture.

## Risks / Trade-offs

- [A frame's label matches no iframe's `name` or `id` in the main page, as with a frame inside a frame] → the label is not found; the frame shows `(unknown site)` and `login` refuses it. Safe, and the agent falls back to the password link.
- [camofox skips a slow frame (over 3 s)] → no frame block; `open`'s settle and a second read usually catch it. The guide says to read again once.
- [`next-step` on a page that clears the password box after a wrong password] → the agent asks for a code the site never sent; the next read shows the error, and the guide says to check the page before asking.
- [Extra reads slow `login`] → two snapshot reads, about a second each.

## Migration Plan

None: the script runs fresh each command. Old tab files lack `typed` and read as an empty list.
