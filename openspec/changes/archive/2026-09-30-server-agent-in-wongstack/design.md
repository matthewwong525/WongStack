# Design

## Context

The agent lives in wongstack-cloud's `vm/`: `agent.mjs` (poll loop, job switch, GitHub/Paseo/team jobs, the install and token roll), `copy.mjs` (encrypted home-folder copy between servers), `management.mjs` (the private access-result journal and delivery), `source.mjs` (the per-job workspace-user clone the installer runs from), and `install-wongstack.mjs`, a trimmed host copy of this repo's installer helpers plus `cloudflare` and `setEnv`. Tests are `node:test` files beside them: `agent.test.mjs`, `agent-roll.test.mjs`, `copy.test.mjs`, `management.test.mjs`, `source.test.mjs`, `install-wongstack.test.mjs`. Cloud-init writes them to `/opt/wongstack/`, and nothing rewrites them.

The poll sends `{ paseo, features: ["copy", "access-v1"] }`. wongstack.com's plan `agent-from-source` (wongstack-cloud, workspace large-lion) replaces `features` with a contract number and unpacks this source at the build commit into `/opt/wongstack/source`. That plan owns first boot, the Worker, and the dashboard; this one owns the agent and the written contract. See proposal.md for why.

## Goals / Non-Goals

**Goals:** the agent runs unchanged in behavior from `server/agent/`, with imports from this source instead of host copies; the poll carries `{ contract, commit, paseo }`; contract 1 is written in `server/README.md`; the moved tests run in this repo's CI and coverage.

**Non-Goals:** new job types or changed job shapes; any self-update; changing the installer; first boot, the systemd unit, and the setup report's sender, which stay wongstack.com's.

## Decisions

### Layout and imports

```text
server/
  setup.sh
  install-wongstack.mjs   (unchanged exports; README lists setEnv)
  access-result.mjs
  agent/
    agent.mjs      entry; CONTRACT = 1
    copy.mjs
    management.mjs
    source.mjs
```

- `agent.mjs` imports `run`, `jobFolder`, `repoFolder`, `CLOUDFLARE_CALL`, and `setEnv` from `../install-wongstack.mjs`, and `cloudflare` from `../../.agents/skills/wong-setup/scripts/provision.mjs`. The provision `cloudflare(token, { fetch })` takes options, not a bare fetch, so the token roll passes `{ fetch: fetchFn }`. This repo's `jobFolder` also refuses a missing or synthetic `ownerEmail`, so `installWongStack` checks `ownerEmail` and `managementResult` before `jobFolder`: a job missing them still fails with `access`, and only a present but refused email (a GitHub noreply) becomes `rejected` instead of the installer's `repo`.
- `management.mjs` imports `CLOUDFLARE_CALL` from `../install-wongstack.mjs`.
- `vm/install-wongstack.mjs` and its test are not moved; `scripts/tests/server-install.test.mjs` already covers the shared names.
- `WRITE_TOKEN` (the snippet run as `wong` to write the rolled token) imports `setEnv` from the installer's path resolved from `import.meta.url`, not the old `/opt/wongstack/install-wongstack.mjs`. `wong` can read it because the host unpacks the source mode 0755.
- The code keeps its current style (double quotes, compact `management.mjs`) so the move reviews as a move. `oxlint` already lints `server/`; fix only what it flags.

Alternative: keep a host copy of the helpers under `server/agent/`. Rejected: that is the drift this change removes.

### The contract number and commit

`agent.mjs` exports `CONTRACT = 1`. `tick` sends `{ contract: CONTRACT, commit, paseo }`, where `commit` is `SOURCE_COMMIT` from the environment when it is 40 hex characters, else `null`. `features` goes: wongstack.com's plan grants capabilities by contract, and an old Worker that still reads `features` is not rolled back to once this ships (its risk is in that plan).

Why the environment, not git: first boot unpacks a GitHub tarball with no `.git`. `SOURCE_COMMIT` is the same commit the tarball came from, recorded by wongstack.com in `agent.env`.

Contract 1 is today's shapes, frozen: every job type (`pair`, `suspend`, `resume`, `github`, `cloudflare`, `team-add`, `team-remove`, `copy-key`, `copy-send`, `copy-restore`), their payloads and results, `POST /api/agent/jobs/:id`, `POST /api/agent/jobs/:id/access`, and the host's `POST /api/agent/setup?exit=<code>` with the log tail as text. A later breaking shape raises `CONTRACT`; wongstack.com adds the new number first, then this repo releases it.

### The written contract in `server/README.md`

A new `## The agent` section, after the installer's, holds:

- **What runs it:** the host unpacks the source root-owned and mode 0755 (wongstack.com uses `/opt/wongstack/source`), writes `/etc/wongstack/agent.env` (`APP_URL`, `AGENT_TOKEN`, `VM_ID`, `SOURCE_REPO`, `SOURCE_COMMIT`, mode 0600), runs `server/setup.sh`, sends the setup report, then runs `node server/agent/agent.mjs` as root under a restarting service.
- **Contract 1:** the poll request and reply, a table of job types with payload and result, result delivery, access-result delivery (linking the existing private-result section rather than repeating it), and the setup report.
- **What it never does:** change its own code; open a port; pass `AGENT_TOKEN` to the installer; report installer output beyond the reason word and a `CLOUDFLARE_CALL` line.
- **Forks:** a fork may change the agent and keeps contract 1, or raises `CONTRACT` only after the host supports the new number.

The "What a host may import" table gains `setEnv`, which the agent uses. "What it never does" for `setup.sh` and the installer keeps `/etc/wongstack` and `/opt/wongstack` as the host's and agent's paths. "The size budget" section goes, and the intro's "a host can run WongStack's scripts" line adds the agent.

A test in `scripts/tests/server-agent-contract.test.mjs` reads the README's job table and the agent's `runJob` switch cases and fails on a difference, like the existing end-state check for `setup.sh`.

### Tests

The `vm/*.test.mjs` files move to `scripts/tests/` as `server-agent.test.mjs`, `server-agent-roll.test.mjs`, `server-agent-copy.test.mjs`, `server-agent-management.test.mjs`, and `server-agent-source.test.mjs`, with import paths changed and the poll-body expectations changed to `{ contract, commit, paseo }`. CI already runs `node --test scripts/tests/*.test.mjs` under c8; `.c8rc.json` adds `server/agent/*.mjs` to `include`. Tests that need root, `runuser`, or real systemd stay faked as they are today.

## Risks / Trade-offs

- [A fix to the agent never reaches a running server] → accepted by the user: a rebuild is the update. wongstack.com's dashboard shows the agent's commit.
- [A fork changes the agent and breaks contract 1 without raising `CONTRACT`] → wongstack.com verifies every result against its own records and never trusts a claim, so a broken fork's server fails its own jobs; it cannot affect another owner's. The README says so.
- [A fork's agent runs as root] → no new power: a fork's `setup.sh` already runs as root at build and can read `agent.env`. `AGENT_TOKEN` is scoped to one server.
- [`jobFolder` differs from the host copy's] → the check order above keeps the `access` result; a test pins both the missing and the noreply case.
- [Coverage drops below 85% lines / 81% branches after adding `server/agent/`] → the moved tests covered these files in wongstack-cloud; any gap is filled before `/save`.

## Migration Plan

1. This change ships as a minor WongStack release.
2. wongstack.com's `agent-from-source` moves its `SOURCE_COMMIT` to that release, first-boots from it, and deletes `vm/`.
3. Existing servers keep their old agent until rebuilt.

Rollback: revert this release; wongstack.com keeps its pinned commit, so nothing running changes.
