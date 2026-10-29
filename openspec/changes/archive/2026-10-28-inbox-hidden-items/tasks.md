# Tasks

## 1. Code

- [x] 1.1 In `.claude/skills/hand-over/scripts/reply-link.mjs`, add the `item` command (`--title`, `--hidden`, `--keep-open`, `--stop`), renew a kept-open item after each tap, wake a timed-out item's chat once with its stop message, and raise `PROTOCOL` to 9.
- [x] 1.2 In `app/worker/apps/inbox/item-put.ts` keep `hidden`; in `items.ts` list no hidden item; add `schema/migrations/20261101120000_inbox_hidden_items.sql` and list it in `payload-files.json` and the `inbox` area.
- [x] 1.3 In `.claude/skills/ship/scripts/ship.mjs`, validate with `--type change`.
- [x] 1.4 Tests: a hidden item is not listed and still takes taps (`api.test.ts`); a hidden kept-open item wakes on each tap, moves its close, and sends its stop once (`reply-link-inbox.test.mjs`).

## 2. Docs and release

- [x] 2.1 In `wiki/development/reply-links.md`, add *Put an item with no page*. Verify: `node scripts/check-payload-links.mjs`.
- [x] 2.2 Add a `## Next (minor) — Hidden Inbox items` entry to `CHANGELOG.md`.

## 3. Verification

- [x] 3.1 Run `node .github/scripts/checks.mjs --worktree`; it passes, or each failure is unrelated and noted in the Decision log.
