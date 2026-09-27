# Tasks

## 1. Memory Worker and schema

- [x] 1.1 Add `.agents/skills/memory/migrations/0005_admin_accounts.sql` (`memory_admins`, `memory_keys.github_id`, an end date for every key without one) and extend `KEYS_GUARD` to `memory_admins`; verify with a test that a key naming `memory_admins` gets 403 and that `migrate` applies 0005 and leaves no key without `expires_at`.
- [x] 1.2 In `worker/memory-worker.mjs` `join`, call `GET /user`, grant admin only when `memory_admins` holds the account id, store `github_id`, and treat a missing table as "no admin"; verify with fake-GitHub tests: the linked account joins as admin, another account with the admin's verified email joins as member, and an unmigrated store joins nobody as admin.
- [x] 1.3 Add `KEY_LIMIT = 10` to `join`'s batch: drop the account's expired keys, then its keys on other machines beyond the 9 newest; verify with a test where an eleventh machine joins and the machine that joined longest ago gets 401.
- [x] 1.4 Export `MAX_TRANSCRIPT_BYTES` (50 MB) and refuse an R2 PUT over it with 413 `too_large`, by `Content-Length` and by the body read; verify with tests for both, and that a 50 MB body is stored.

## 2. Memory scripts

- [x] 2.1 In `lib/digest.mjs` `formatFact`, print the author's whole email; verify in `memory-store.test.mjs` that the digest and search lines for `operations@example.com` and `operations@example.org` differ, and the digest stays within 40 lines and 6 KB.
- [x] 2.2 In `lib/members.mjs`, replace `member add` with `member admin` (link from `gh api user`, this machine's 30-day admin key to the primary `.env`, `key.json`); make `member add` a usage error pointing at joining through GitHub; have `member remove` also unlink the email and `member list` show GitHub ids and linked admins; verify with tests, including that no command prints a key and that `member admin` without `gh` or a git email changes nothing.
- [x] 2.3 In `memory.mjs` `migrate`, link the running admin's GitHub account after 0005 when `memory_admins` is empty, or print the `member admin` fix without `gh`; verify with a fake-`gh` test for each case.
- [x] 2.4 In `memory.mjs` `strip`, skip the upload over `MAX_TRANSCRIPT_BYTES` and record `raw_bytes` with no `raw_key`; make `source` name the 50 MB limit; verify in `memory-capture.test.mjs` that an oversized session keeps its facts and `source` says why.
- [x] 2.5 Move every test fixture that used `member add` to `member admin` or a joined key, and update the help text in `memory.mjs`; verify the memory suites pass with `TMPDIR=/var/tmp`.

## 3. Setup

- [x] 3.1 In `wong-setup/scripts/provision.mjs`, run `member admin` where it ran `member add <email> --admin --env`; update `provision.test.mjs` and `server-install.test.mjs`; verify both suites pass.
- [x] 3.2 Update `wong-setup/references/cloudflare.md` step 6, *Moving an older store* step 2, and its closing fallback sentence to `member admin` and joining through GitHub; verify the link checker passes.

## 4. Docs and release

- [x] 4.1 Update `wiki/development/memory.md` (*Joining through GitHub*: three GitHub calls, admin by linked account, 10-key cap; *Add or remove a teammate*: no hand-made keys, `member admin`, `member remove`, `member list`; transcripts over 50 MB) and `.agents/skills/memory/SKILL.md`'s key paragraph; verify the link and retired-name checks pass.
- [x] 4.2 Add a `## Next (minor) — Memory keys come only through GitHub` entry to `CHANGELOG.md`, with an *Updating* note: run `memory.mjs migrate` once with `gh` signed in; every machine rejoins at its next start; a teammate who got a key by hand needs GitHub access to the repo; verify `openspec validate tighten-memory-security --strict --no-interactive` passes.

## 5. Gate

- [x] 5.1 Run `/save` and confirm CI passes on the pull request.
- [x] 5.2 Record a memory thread for the post-deploy check: the admin runs `migrate` on this repo's store, rejoins as admin, and a second GitHub account with a shared email joins as member.
