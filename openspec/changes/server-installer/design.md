## Context

wongstack-cloud writes `vm/install-wongstack.mjs` into each server's first-boot data at `/opt/wongstack/`, and its agent runs it as `wong` with `{token, accountId, repo}` on stdin (see proposal.md — Why). The file pins WongStack 20.0.0 (`521f513`), hardcodes a stale `.env.example` and wrangler config, mints a `<repo>-memory` Cloudflare token for memory, and skips `scaffold.files` (the mini-apps router), which arrived after 20.0.0.

Since 23.0.0, memory is served by the production Worker at `/_memory/*`. `memory.mjs migrate` and `member add --admin --env` reach D1 straight through the Cloudflare API with `CLOUDFLARE_API_TOKEN` once `components.memory.worker` is recorded, so both run before the first deploy (`memory.mjs:409`, `lib/members.mjs`). Setup's runbook ([`cloudflare.md`](../../../.agents/skills/wong-setup/references/cloudflare.md) Steps 2 and 4) describes the same provisioning as prose and `curl` calls that an agent runs.

`server/setup.sh` set the pattern in 20.2.0: the host resolves the source's default branch to a commit, fetches the script at that commit, and runs it. `server/` is source-only.

## Goals / Non-Goals

**Goals:**

- One provisioning script, `.agents/skills/wong-setup/scripts/provision.mjs`, with no dependencies, used by the runbook and by the installer.
- `server/install-wongstack.mjs` installs the clone it runs from, so the version is whatever commit the host checked out.
- Tests in this repo install this checkout's real payload, so drift fails CI.

**Non-Goals:**

- The payload copy stays in the installer. `/wong-setup` still copies files through `/plan` and `/apply`.
- `/wong-sync`'s migration steps (older memory stores, older mini apps) stay prose.
- No change to the cloud's agent, first boot, or dashboard; that is wongstack-cloud's follow-up.

## Decisions

### The installer runs from a clone, not a lone file

The host clones the source (WongStack or a fork) at its pinned commit into `~/.cache/wong-stack/WongStack` as the workspace user, then runs `node ~/.cache/wong-stack/WongStack/server/install-wongstack.mjs` with the job on stdin. The installer reads the source from `import.meta.url`'s checkout: `VERSION`, `git rev-parse HEAD`, and `origin`'s URL for `upstream.repo`. It records `upstream.clone` as `~/.cache/wong-stack/WongStack`, the path `/wong-sync` reads.

*Alternative:* keep one self-contained file in first-boot data that clones the source itself. Rejected: it cannot import the shared script without a copy of it, it keeps a 32 KiB first-boot budget on the installer, and the version it installs would be a second pin next to the host's commit.

The job stays `{token, accountId, repo}`, and the reason codes stay `done`, `token`, `repo`, `cloudflare`, and `push`, printed as the last stdout line with exit 0 only on `done`. `jobFolder` and `run` stay exported for a host that wants to check a job the same way. The repo folder is `~/<name>`, as today.

### One provisioning script, two drivers

`provision.mjs` exports the steps and runs them as a CLI:

| Export / subcommand | Does | Setup's runbook | Installer |
|---|---|---|---|
| `widen` | grants the normal-provision groups, keeps its own two, waits out propagation | Step 2 | yes |
| `accounts` | lists accounts the token sees | Step 3 (the agent asks when several) | skipped: job names it |
| `names --repo <r>` | derives names, reports each as free, ours, or taken | Step 4a (the agent offers a suffix) | picks the first free suffix |
| `provision --base <b>` | memory store (R2 check, database, bucket), subdomain, record's `components.memory`, `migrate`, admin key, both app databases, `app/wrangler.jsonc`, the two `db:migrate:*` scripts, deploy token to the GitHub secret | Step 4b–4d, after the one ask | yes |

Each subcommand prints one JSON report: what it created, what it reused, names, URLs, and R2 on or off. It never prints a token. Errors carry a reason (`token`, `cloudflare`) and a plain cause the runbook maps through the [failure map](../../../.agents/skills/wong-setup/references/failure-map.md). The Cloudflare base URL comes from `WONG_CLOUDFLARE_API` when set, like `memory.mjs`, so tests point it at a fake.

The groups live in the script as constants. A test reads the tables in [`permission-groups.md`](../../../.agents/skills/wong-setup/references/permission-groups.md) (`A normal provision`, `The CI deploy token`) and fails when they differ, beside the existing pin in `downstream-contract.test.mjs`.

*Alternative:* the installer imports functions, and the runbook keeps its `curl` prose. Rejected: the person asked for shared code, and two copies are the drift this change removes.

### Memory, in the runbook's order

1. `GET /accounts/{id}/r2/buckets`: success means R2 is on. The Cloudflare error that says to enable R2 means off; any other failure stops `cloudflare`.
2. Reuse or create the `<base>-memory` database, and the bucket when R2 is on.
3. Get or make the workers.dev subdomain, then write `components.memory` (`accountId`, `databaseId`, `database`, `bucket`, `worker: https://<base>.<subdomain>.workers.dev/_memory`) into `.claude/.wong-stack.json`. A fresh install writes the whole record first.
4. Run the target's `memory.mjs migrate`, retried through propagation.
5. Run `memory.mjs member add "$(git config user.email)" --admin --env`, only when `.env` holds no `wongm_` key, so a rerun keeps the key. No git email stops `repo`.

No memory Cloudflare token is minted. The widen always includes `Workers R2 Storage Write`; the deploy token gets the R2 row only when the store has a bucket, and a rerun that finds a bucket adds the row to an existing deploy token's policy.

### Config from the owning fragments

`app/wrangler.jsonc` is built from the `jsonc` block under `wrangler.jsonc` in [`stack-pack-fragments.md`](../../../.agents/skills/wong-sync/references/stack-pack-fragments.md), with its placeholders filled: names, ids, today's date, `MEMORY_DB`, and `r2_buckets` kept only with a bucket. The file keeps the fragment's comments. A test fails when a placeholder is left, and runs the result through `scripts/lib-wrangler-config.mjs`. The target's `.env.example` is the source's own file. Only an installed repo (`mode: installed`) skips writing config; it keeps its committed files.

### Payload copy reads the list

As today: every category in `payload-files.json`, now including `scaffold.files` and every `exclude`, into a real `.agents/` with `.claude` and `.codex` links, `.nvmrc`, `.gitignore`, the `WONG-STACK` block as `AGENTS.md` with a `CLAUDE.md` link, the two seeded hubs, and `openspec init --tools none`. A file in `seededBySetup` that the installer does not write fails the test.

### Tests

- `scripts/tests/provision.test.mjs`: a fake Cloudflare over HTTP (async `execFile`, per the known `spawnSync` deadlock), a fake `gh` on `PATH`. Covers the widen, a name clash, R2 on and off, reruns after each step, a bucket added later, and no token in any argument, error, or output.
- `scripts/tests/server-install.test.mjs`: installs this checkout into a temp repo with a bare `origin`, then checks every payload path landed, the record, the wrangler config, the pushed commit, a rerun, a repo with other work, and each reason code.
- `.c8rc.json` gains `server/*.mjs`; `payload.yml`'s oxlint gains `server`.

## Risks / Trade-offs

- [The R2 "not enabled" error code is read from the runbook's words, not a captured response] → the real server test runs on an account with R2 off, then on, and the code is pinned in a test from that capture.
- [`member add` needs a git email; a hand run may have none] → stop with `repo` and name the fix in stderr; the README says to set it.
- [The runbook becomes script calls, so an agent loses the step-by-step `curl` it could adapt] → each subcommand's JSON report names what happened, and the failure map still translates causes.
- [A fork that breaks the installer breaks its own servers] → same as `setup.sh`: the README says to keep the contract, and the fork's tests run the installer.

## Migration Plan

1. Ship this as a minor release.
2. Real server test, before merge, from this branch: a throwaway server running `server/setup.sh`, then the installer into a throwaway GitHub repo on the maintainer's Cloudflare account. Check the first deploy, the production URL, `memory.mjs digest` through the Worker, and a rerun. Delete the server, repo, Workers, databases, bucket, and deploy token afterward.
3. wongstack-cloud, separately: clone the pinned commit on the server, run the new path, delete its own `vm/install-wongstack.mjs`.

Rollback: the cloud keeps its own installer until step 3 lands, so reverting this release strands no server.
