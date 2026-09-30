# Tasks

## 1. Move the agent into server/agent/

- [x] 1.1 Copy `vm/agent.mjs`, `copy.mjs`, `management.mjs`, and `source.mjs` from wongstack-cloud `main` (ff9333d) into `server/agent/`; point the imports at `../install-wongstack.mjs` and `provision.mjs`'s `cloudflare` as design.md says, resolve `WRITE_TOKEN`'s installer path from `import.meta.url`, and check `ownerEmail`/`managementResult` before `jobFolder`; verify `node --check` passes on each file and `oxlint --deny-warnings server` is clean.
- [x] 1.2 Add `export const CONTRACT = 1` and send `{ contract, commit, paseo }` in the poll, with `commit` from `SOURCE_COMMIT` (40 hex, else `null`) and no `features`; verify in 2.1's poll tests.

## 2. Tests

- [x] 2.1 Move the agent's tests to `scripts/tests/server-agent.test.mjs`, `server-agent-roll.test.mjs`, `server-agent-copy.test.mjs`, `server-agent-management.test.mjs`, and `server-agent-source.test.mjs`; change the poll expectations to `{ contract: 1, commit, paseo }`, and add cases for a missing `SOURCE_COMMIT`, an install job missing `ownerEmail` (`failed`/`access`), and a noreply `ownerEmail` (`rejected`); verify `node --test scripts/tests/server-agent*.test.mjs` passes.
- [ ] 2.2 Add `server/agent/*.mjs` to `scripts/tests/.c8rc.json`'s `include`; verify the c8 run in CI stays above its thresholds, via `/save`.
- [x] 2.3 Drop the size-budget test from `scripts/tests/server-setup.test.mjs` and its comment; verify that file passes.

## 3. The contract in server/README.md

- [x] 3.1 Add `## The agent` to `server/README.md` as design.md lays out (what runs it, contract 1 with a job-type table, what it never does, forks), add `setEnv` to "What a host may import", drop "The size budget", and update the intro; verify `node scripts/check-payload-links.mjs` passes and every heading linked from elsewhere still exists.
- [x] 3.2 Add `scripts/tests/server-agent-contract.test.mjs`, which fails when the README's job table and `runJob`'s job types differ, naming the type; verify it passes, and fails when a row is removed by hand.

## 4. Release

- [x] 4.1 Add a `## Next (minor) — The server's helper lives in WongStack` entry to `CHANGELOG.md` with an **Updating.** note saying installed repos need nothing; verify the entry sits at the top of the entries.
- [ ] 4.2 After `/save`, check CI passes on the PR; then send the wongstack.com chat (large-lion) the shipped release's commit and the final README section, so `agent-from-source` task 1.1 can reconcile.
