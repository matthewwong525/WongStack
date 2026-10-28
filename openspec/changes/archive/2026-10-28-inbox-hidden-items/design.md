# Design

## Context

WongOS's `email-review-ready` change added a hidden, kept-open Inbox item: its `/email` chat puts one watch item, and the Email app's Submit taps it. The code sits in `reply-link.mjs`, the Inbox worker's `item-put.ts` and `items.ts`, and one migration. WongStack has none of it, so WongOS lists the files as differences.

## Decisions

- **Take WongOS's code as is.** It has run in WongOS since 2026-10-27, and the parity check compares bytes. Only the migration's comment changes, to name no WongOS skill; a migration's comment does not change what it did.
- **`item` is a file-less `openInboxItem`.** Its body is the title, its kind `approval`; the same chat and title reuses the open item's id, so a second put replaces it.
- **Kept open means renewed.** After a `sent` tap, the item's deadline moves to `hours` from now, here and in the app, instead of closing.
- **The stop message goes only on a time-out.** A lost chat, or a closed item, wakes no one.
- **`PROTOCOL` 9** so the next open replaces a running inbox helper from older code.
- **`--type change`** on `openspec validate`, because a change named like a spec is otherwise ambiguous and fails.

## Risks

- An older Worker without the `hidden` column refuses no put: the column is additive with a default, and the migration runs at deploy.
