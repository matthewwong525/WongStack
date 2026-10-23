# Tasks

## 1. Inbox helper

- [x] 1.1 In `.agents/skills/hand-over/scripts/reply-link.mjs`'s `inboxTick`, end every item whose tap came back `sent`, plans included, and update its comment.
- [x] 1.2 In the same file, raise `PROTOCOL` from 4 to 5.

## 2. Tests

- [x] 2.1 In `scripts/tests/reply-link-inbox.test.mjs`, test that a plan's sent notes close it in the app and here, that a failed send keeps it open, and that opening the rebuilt plan again uploads a new item with a new id; update any test or `startInbox` assertion that expected a plan to stay open after a send or protocol 4.

## 3. Docs and release

- [x] 3.1 In `wiki/development/reply-links.md`'s *In your inbox first*, say a plan leaves once the chat has your notes or build tap, and its updated version comes back under *Needs you* at a new link.
- [x] 3.2 Add a `## Next (patch) — A plan leaves the inbox once you send notes` entry at the top of `CHANGELOG.md`'s entries, with an *Updating.* note that no hand step is needed.

## 4. Verification

- [x] 4.1 Run `node --test scripts/tests/reply-link.test.mjs scripts/tests/reply-link-inbox.test.mjs scripts/tests/hand-over.test.mjs scripts/tests/daily.test.mjs`.
- [x] 4.2 Run `node .github/scripts/checks.mjs --worktree` as a pre-check.

## 5. Review fixes

- [x] 5.1 In `wiki/development/reply-links.md`'s *A day, then a new link*, say a rebuild keeps the same link only while the plan waits on you; after your answer it comes back at a new link.
- [x] 5.2 In `scripts/tests/reply-link-inbox.test.mjs`, test that an action already marked done for the version (a wake that landed before a crash) comes back `sent` with no second wake.
