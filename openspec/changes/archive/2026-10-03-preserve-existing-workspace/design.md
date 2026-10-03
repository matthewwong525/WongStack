# Design

## Context

See proposal.md. Existing `server/setup.sh` is a fresh-host installer and rewrites shared tools and the Paseo unit. The agent is source-only, is pinned for its life, and currently assumes `wong`. The consuming cloud plan is `use-private-repo-on-existing-server` in wongstack-cloud; its schema/enrollment remain outside this source change.

## Goals / Non-Goals

Goals: preservation mode, configured workspace identity, guarded authenticated clone/reuse, dependency/configuration readiness and explicit compatibility. Non-goals: server enrollment authority, app publication, Artifacts migration or assuming contract-number ordering implies capability inheritance.

## Decisions

1. Expose `server/preservation.json` as `{ "version": 1 }` and `bash server/setup.sh --preserve` as the canonical entry, taking `WORKSPACE_USER` and `WORKSPACE_HOME`. Expose `--preserve --preflight` as a mutation-free compatibility check. A missing nonroot account may be created only after successful preflight with an unoccupied safe home/service. Preflight Ubuntu 24.04 x86-64/Arm, root authorization, user/home ownership and regular paths, existing tool versions and Paseo unit/ports before mutation. Reuse compatible tools and the selected user's compatible Paseo instance; fail rather than overwrite unrelated configuration. Missing tools get per-user installations where possible; missing OS libraries/packages are added only when needed. Do not upgrade the OS, reboot, rewrite firewall/network rules, replace global Node/tools, remove a browser cache or rewrite unrelated units/AppArmor configuration. Keep fresh setup defaults untouched. The setup helpers write no host credentials or files under `/etc/wongstack` or `/opt/wongstack`; the host owns enrollment.
2. Configure the agent's workspace user/home through explicit environment with validated identity, retaining `wong` defaults. Parameterize execution, Paseo home, clone folder and result-file ownership/path validation together. Never change a running agent's source; unrelated existing agent installations remain a host preflight conflict. Preserve today's managed private Access contract and no-AI-credential-read boundary.
3. Reserve contract 4. It extends the legacy contract-2 paths with preservation/project preparation, not the still-open Artifacts contract-3 feature set. Poll retains `{contract,commit,paseo}`; hosts use the preservation manifest plus contract for capability checks. Document this explicitly. Host already plans support for 4 before pinning this release.
4. Add `preserve:true` and expected `login` to the authenticated existing `github` job. Preserve existing global/repo git config. Reuse a matching accessible gh identity; refuse a different stored login without overwriting it; use scoped process credentials when no login exists, never a token in arguments. Authenticate the token through GitHub before cloning as the chosen unprivileged user. Verify path ownership, regular/no-symlink target and normalized origin (HTTPS/SSH/worktrees); reuse matching dirty/unpushed checkouts without checkout/reset/clean/pull. Foreign folders/logins or locally changed dependency manifests become explicit review reasons, not silent mutation.
5. Add fixed job `project-prepare` with `{repo,generation}` (nonnegative; 0 for fresh/rebuilt hosts and positive for attachment). It verifies the selected repo and executes supported frozen dependency setup as the workspace user; package lifecycle runs cannot receive AGENT_TOKEN or root privileges. Support npm-lockfile projects first and explicitly refuse unsupported dependency contracts. Add generic Python/browser prerequisites only where repo metadata/guidance declares them, with no repo-specific credentials in source code. Persist step fingerprints outside the checkout to make retries idempotent. Register Paseo/project/workspaces once; no AI sign-in output or credential files are read.
6. Deliver authenticated `POST /api/agent/jobs/:id/project` with `{generation,clone,dependencies,configuration,paseo,missingSettings,reason?}`. States: clone `done|failed`; dependencies `done|failed|needs_input`; configuration `done|needs_input`; paseo `done|failed`. `reason` is a bounded enum (`repo|path_conflict|identity_conflict|dependencies|configuration|paseo|unsupported`). Report only required missing setting names from an explicit repository setup contract or a reviewed profile; never treat every example key as mandatory or claim unknown configuration is verified. Keep private values and command output off this channel. Dependency/configuration outcome remains distinct from clone success, and unknown configuration stays needs_input.

## Risks / Trade-offs

- Existing installations vary → preflight and explicit refusal; no fresh installer fallback.
- Arbitrary project installation code → authenticated selected repo only, unprivileged workspace user, no host credential in environment.
- Old/new user paths can differ → shared validated user/home configuration applies to all execution/result checking.
- Parallel contract 3 work → no claim that contract 4 includes Artifacts; coordinate by explicit manifest/capability and keep fixtures deterministic.
- Repo guidance may not declare configuration precisely → needs_input until reviewed; do not invent secrets or transfer another host's config.

## Migration Plan

Keep preserved setup opt-in. Add tests and README together, add a minor changelog entry and leave VERSION to the shipping skill. Run required checks through remote CI, then release the source before the cloud host enables attachment. Existing agents do not self-update. A rollback stops selecting this release; fresh defaults and prior built agents remain unchanged.


## Pre-merge safety corrections

Both fresh and preserved setup ensure a separate trusted root runtime at `/usr/local/lib/wongstack-agent-runtime/bin/node`. Source `server/agent-runtime.sh --preflight|--ensure|--path` validates root-owned nonwritable symlink-free ancestors and a regular executable single-link ELF Node 22/24 binary. Missing runtime copies only a verified root-owned system binary or downloads official Node 22 with checked SHA256 into guarded private staging; tar does not restore archive ownership/permissions. The selected user's writable Node remains available only to unprivileged workspace commands. Runtime preflight stays mutation-free; unsafe occupied paths refuse. Host and source root process use only the system PATH, independent of workspace tools.

Preserved host units set `WORKSPACE_MODE=preserve` and `Restart=on-failure`. An authenticated poll HTTP 401 makes the source agent return and exit 0 without changing shared Paseo, so revocation stops the root agent normally. Other failures still retry. This changes environment/runtime behavior within unreleased contract 4, not a poll or receipt shape.

Preservation preflight also inventories MemTotal and available 1024-byte disk blocks for root plus the selected home (or nearest validated existing parent for an absent home), before mutation. Failure to read valid data refuses with bounded memory/disk reasons. This is observation only: no new hardware, free-space or MemAvailable floor changes eligibility. The host owns its provider hardware check; project dependency failure stays an incomplete step rather than a capacity guarantee.
