# Tasks

## 1. Provisioning script

- [x] 1.1 In `.agents/skills/wong-setup/scripts/provision.mjs`, replace `forbidden` with `pending` (`401` or `403`) for the post-widen probe retry, and say why in one comment.
- [x] 1.2 In `scripts/tests/fixtures/cloudflare.mjs`, rename `forbiddenPolls` to `refusedPolls` with a `refusedStatus` (default `403`, code `10000`), and update its doc comment.
- [x] 1.3 In `scripts/tests/provision.test.mjs`, cover a `401` then success (sleeps `[2000]`), keep the `403` cases, and assert an error that is neither is not retried.

## 2. Server installer

- [x] 2.1 In `server/install-wongstack.mjs`, export `CLOUDFLARE_CALL` (the pattern verbatim from wongstack-cloud), and in `main` print a stop's message before the reason when it matches.
- [x] 2.2 In `scripts/tests/server-install.test.mjs`, cover: a refused call prints the call line then `cloudflare`, with no token or query in it; a `repo` stop and an unreachable Cloudflare print the reason alone; the four names the host imports are exported.

## 3. Docs and release

- [x] 3.1 In `server/README.md`, add the refused-call line under *The last line*, and list the names a host may import (`run`, `jobFolder`, `repoFolder`, `CLOUDFLARE_CALL`).
- [x] 3.2 In `.agents/skills/wong-setup/references/permission-groups.md`, say the propagation window refuses with `401` (code `10000`) or `403`.
- [x] 3.3 Add a `## Next (patch) — The cloud can run WongStack's server installer` entry to `CHANGELOG.md`, with an **Updating.** note for a host: pin the commit that ships this and import from the clone.
- [x] 3.4 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and the two test files with `TMPDIR=/var/tmp`; `/save` runs the full gate in CI.
