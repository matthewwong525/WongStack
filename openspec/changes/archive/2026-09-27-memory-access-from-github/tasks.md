# Tasks

## 1. Key schema and the Worker's checks

- [x] 1.1 Add `.agents/skills/memory/migrations/0003_key_machines.sql` (nullable `machine`, `expires_at` on `memory_keys`). In `memory-worker.mjs`, change the grant lookup to return `expires_at` and `team` in one query, falling back to the old query when the columns are missing; answer 401 `key_expired` past expiry; set `Wong-Memory-Team` on every authenticated response. Tests in `scripts/tests/memory-worker.test.mjs`: an expired key runs nothing, a `NULL`-expiry key works, the header flips when a second email gets a key, and a pre-migration table still serves old keys.
- [x] 1.2 Move the memory script's write statements into a shared module with their author indexes, used by `memory.mjs` and `memory-worker.mjs`. Add the member check: exact writes with the author equal to the key's email, and scanned reads. Tests: every shared statement passes as a member with its own email; a fact, tag, or session under another author answers 403; `DELETE`, `UPDATE facts SET body`, `INSERT OR REPLACE`, `DROP`, `PRAGMA`, `ATTACH`, mixed case, comments, and a bad statement hidden in a batch each answer 403 `member_write` with nothing run; an admin key still runs a `DELETE`.
- [x] 1.3 Through a memory key, write the key's email as the author (`store.mjs` / `memory.mjs`), and add it to the person's emails in `digest.mjs`. Tests in `memory-worker.test.mjs`: a fact written with a key for `ana@example.com` while `git config` says `dev@example.com` is stored under Ana's email, and her supersede and search work in a team.

## 2. Joining through GitHub

- [x] 2.1 Add `POST /_memory/join` to `memory-worker.mjs`: `GITHUB_REPOSITORY` from `env` (503 `no_repo` without it), `GITHUB_API` override, the repo check (private → `pull`, public → `push`), the verified-email choice, `needs_scope`, admin carry-over, the replace keyed on `(email, machine)`, 30-day expiry, and no logging of the token. Tests against a fake GitHub API: every scenario in the "joins memory" requirement, a join request naming another repository or GitHub address is ignored (the fake GitHub sees only the Worker's own repository), and a spy on `console` proving the token never appears.
- [x] 2.2 Add `memory.mjs join [--background]` in a new `lib/join.mjs`: `gh auth token`, machine name plus stored suffix, POST, write `.env` through `members.mjs`'s `writeEnvKey`, `<stateDir>/key.json`, and `join-error.json` in background mode. Give it a `--help`. Make the missing-token message name `join`. Record `team.json` from the header in `store.mjs`, and read it in `loadConfig`. Tests in `memory-worker.test.mjs` with a fake `gh` and the real route over a fake GitHub: success writes `.env` and prints no key, each refusal changes no file and prints its fix, renewal replaces the key, and the team header turns on the personal-fact filter.
- [x] 2.3 `scripts/cf-deploy.sh`: production `wrangler deploy` passes `--var GITHUB_REPOSITORY:$GITHUB_REPOSITORY`; staging does not. Test with the fake wrangler in the existing deploy test.

## 3. Admin commands per machine

- [x] 3.1 `lib/members.mjs`: `add` replaces only `machine IS NULL` rows; `remove` deletes every row for the email; `list` prints email, role, machine, and expiry. Tests in `memory-worker.test.mjs`, including the "list shows each machine" and "removed with joined keys" scenarios.

## 4. Session start

- [x] 4.1 `session-start.mjs`: spawn a detached `join --background` when there is no token, when `key.json` expires within 7 days, or on a `key_expired` digest error; print one line; print `join-error.json`'s reason and fix instead of spawning; skip under `WONG_MEMORY_RUN=1`. Tests in `memory-worker.test.mjs`: each scenario in the "joins and renews in the background" requirement, and the hook still ends within its timeout when the fake Worker hangs.

## 5. Docs and release

- [x] 5.1 `wiki/development/memory.md` "The memory key" and "Add or remove a teammate": joining through GitHub, who gets in, per-machine keys, expiry, what members may write, the `repo`-scoped token trade-off, and `migrate` after upgrading. `wiki/development/required-tools.md`: `gh` needs `user:email`, beside the `workflow` section. `.env.example`: the memory key comment names `join`. `.agents/skills/wong-setup/references/cloudflare.md`: teammates join on their own; `member add` is the fallback. `.agents/skills/memory/SKILL.md`: add `join`. Verified by `node scripts/check-payload-links.mjs` and `node scripts/check-retired-names.mjs`.
- [x] 5.2 `.agents/skills/wong-sync/references/payload-manifest.md` memory section: installed repos run `memory.mjs migrate` once after syncing this release. Bump `VERSION` to 25.5.0 and add the `CHANGELOG.md` entry; `node scripts/check-openspec-config.mjs` passes.

## 6. Integration

- [x] 6.1 The payload checks pass locally (oxlint, 291 script tests with the c8 floor, links, retired names, OpenSpec config); `/ship`'s one `/save` checkpoint confirms `payload` and `test` in CI, with shellcheck, before the merge. The live join, after merge, production deploy, and `memory.mjs migrate`, is a memory thread: it cannot run before the merge.
