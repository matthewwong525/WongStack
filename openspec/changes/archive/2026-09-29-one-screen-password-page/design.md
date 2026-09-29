## Context

The password link's page (`passwords-page.html` and `passwords-page.mjs`, served by `hand-over.mjs open --passwords`) swaps between `section`s today: `start` (two buttons), `list` (the export's rows, search, *Save N logins*, *Back*), `add` (the one-login form, *Save*, *Back*), `saved` (*Add another*, *Done*), and `closed`. Its server side (`passwords.mjs`) takes `POST /save` with `{logins: [{url, username, password}]}` and answers `{saved, failed}` with `failed` as indexes into the sent list, `413` over its limit, and `403` once the link closed; `POST /done` closes the link. See proposal.md for why.

## Goals / Non-Goals

**Goals:** one screen, one list model for file and typed logins, drop anywhere, tests for the page's behavior.

**Non-Goals:** any change to `passwords.mjs`, `hand-over.mjs`, the `/save` body, or `parseExport`'s contract.

## Decisions

- **One list model.** `logins` holds rows `{url, host, username, password, label, source: 'file' | 'typed', state: 'open' | 'saved'}`, keyed by `host\nusername`. A file's rows merge in unticked, skipping keys already present. A typed row with a present key replaces that row's `url` and `password`, sets `source: 'typed'`, reopens it if saved, and ticks it; a new key appends ticked. The list re-sorts by host and username after each merge, as `parseExport` sorts. Alternative: two lists, file and typed. Rejected: two lists need two Save rules and a merge at save time anyway.
- **Rows track by key, not index.** `ticked` becomes a `Set` of keys, so re-sorting and merging never tick the wrong row. The request's `failed` indexes map back through the list the page sent.
- **Save takes a filled form.** When all three fields hold text and the site parses, *Save* first adds the form as a typed row, then sends. A partly filled form is left alone and does not block Save. The Save button's count includes a complete form, updated on `input`.
- **Drop anywhere.** `dragover` and `drop` are handled on `document`, with `preventDefault`, so no drop navigates the tab. Any drop with a file reads the first file through the same path as the picker. The drop box gets a highlight class while a drag is over the page. The box is a `<button>` that clicks the hidden file input, so a tap or keyboard opens the picker.
- **Saved rows stay visible.** A saved row shows *Saved*, its box disabled and unticked. A status line under the list names the saved sites cumulatively. The delete-the-export hint shows once any file row was saved. A failed row stays ticked, and the error line names its site, as today.
- **Done guards unsaved ticks.** With ticked open rows, the first *Done* tap writes *N ticked logins aren't saved. Tap Done again to leave without them.* and arms; any tick change or save disarms it. The second tap posts `/done`.
- **Search shows past eight rows.** Search filters by host, username, and label as today, and hides itself while the list holds eight or fewer rows. The list is hidden while empty.
- **Tests in jsdom.** `scripts/tests/passwords-page.test.mjs` loads the HTML with the module inlined (jsdom does not load module scripts over a file URL), stubs `fetch` for `save`, `done`, and `page.mjs`, and drives the DOM: a picked file, a dropped file, a typed row, merge rules, Save with a filled form, partial failure, a closed link, and the Done guard. It skips with the `needs` helper when jsdom is missing, as `review.test.mjs` does. Alternative: Playwright in `review-browser.test.mjs`'s style. Rejected: slower, and nothing here needs layout.

## Risks / Trade-offs

- [A password manager treats *Add* as a login submit and offers to save the typed login in the browser's own manager] → Same as today's add-one *Save*; the hint line already says the page isn't the site's own.
- [A long list pushes the form and Save below the fold on a phone] → The list keeps its `max-height: 55vh` scroll box, and Save and Done sit in a bar that sticks to the bottom of the screen.
- [A dropped folder or non-CSV file] → Read like a picked file; the unreadable-file message shows under the drop box.

## Migration Plan

Nothing to migrate: the page ships with the skill and is served fresh on each link. Rollback is reverting the two page files.

## UX

### Use-case brief

The business owner, on a laptop with an export file or on a phone with saved passwords, gives the agent the logins it may use. Done is: the chosen logins saved, the chat naming them, the link closed. Common case: one file, a handful of sites ticked; or one site typed from the phone's password list. Edge: a second file; a typed site the file lacked; a partial failure; the link closing mid-save. Assumed rare: several hundred rows, or more than one account per site. Mirrors today's password page (`passwords-page.html`), keeping its styles.

### Flow

Open the link → drop or pick a file, and tick sites → or fill the form and tap *Add* → tap *Save* → tap *Done*. One typed login: fill the form → *Save* → *Done*.

### Hierarchy

One screen. The primary action is *Save*, the only filled button; *Done* sits beside it, plain. The drop box is the first thing on the page; the form sits under the list, secondary.

### Review

[review.html](review.html): What Changes item *One screen for everything* sketches the screen; *One Save for everything ticked* shows how the form and ticks feed Save.

### Components

Existing: the page's buttons, inputs, list rows, `.hint`, `.miss`, and `#status`. New: the drop box (a dashed-border `<button>` with a drag highlight) and the sticky Save and Done bar.
