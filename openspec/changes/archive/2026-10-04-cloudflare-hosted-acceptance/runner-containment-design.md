# Offline customer commands inside the existing SDK runner

**State:** DEFERRED by the user's restricted functionality-trial choice. This is retained design research for later customer isolation work; none of its nested Docker/offline-cache/adversarial gates is a prerequisite for the current internal functionality trial. No isolation claim follows from the trial; design.md owns current scope.

## Boundary and supported interfaces

Keep CI0.2.0 Workflow/runner, Sandbox0.12.1, ordinary Source checks and npm commands, and the existing fresh trusted preview/publication runners. Add one fixed Docker guest at a time inside the check/build runner. It runs only customer dependency hooks, tests and build code. The outer runner runs pinned Source checks, Git/history verification, the Docker controller and output validation. No customer JavaScript or customer shell script executes in the outer runner. No new provider service, runner adapter, SDK fork or write broker is introduced.

Cloudflare documents [Docker-in-Docker for Sandbox0.x](https://developers.cloudflare.com/sandbox/sdk/guides/docker-in-docker/), but its example uses host networking and disables iptables. That example would expose the outer control network and is unsuitable here. Docker documents a [none network](https://docs.docker.com/engine/network/drivers/none/) and ordinary [container execution controls](https://docs.docker.com/reference/cli/docker/container/run/). Combining those controls with Cloudflare's nested Docker entry point is a design inference, not a documented or tested guarantee for our exact pinned image. CI and subsequently authorized real probes must demonstrate the complete combination; a rejected or ineffective flag stops the run without a permissive fallback.

```text
existing SDK Workflow
          │
          ▼
outer SDK runner: pinned checks + controller
          │
          ▼
offline Docker guest: npm ci / test / build
          │ stop + inspect, then validate files
          ▼
canonical output + SDK workspace backup
          │
          ▼
existing fresh trusted preview/deploy runner
```

## Exact image and dependency preparation

CI builds the ordinary outer Dockerfile from the already reviewed Sandbox0.12.1 base digest. Keep its sandbox binary and SDK contract. Add pinned Docker daemon/client inputs and a standard Docker image archive for a fixed inner Node22 image, with exact Node/npm/OS/architecture and digest in compatibility.json. Load it using ordinary `docker image load`; never pull or build a customer Dockerfile at runtime. The inner image has no Docker socket/client authority, platform credentials, checkout token, SDK binary or trusted receipt emitter.

CI generates the starter from the reviewed Source commit and freezes its package/lock/install records. Prepare a complete npm cache for that same lock and architecture, including native/optional packages and lifecycle-tool inputs needed by ordinary tests/build. Cache preparation executes only reviewed starter inputs in the maintenance build, with no hosted provider credentials. Verify an actual offline `npm ci`, shared tests and `npm run build:app` in the guest; measuring only cache presence is insufficient. The two acceptance edits keep package and lock identities unchanged. Missing packages, an install hook needing the network, incompatible native binaries or a changed dependency lock fail closed; do not enable networking, skip hooks or alter the ordinary commands. This bounded acceptance recipe does not claim arbitrary future dependency changes are supported.

Use `NPM_CONFIG_OFFLINE=true`, an explicit trusted cache path, and no inherited npm configuration or user home. npm's [offline configuration](https://docs.npmjs.com/cli/v10/using-npm/config/) forbids network requests; prefer-offline is insufficient. Include daemon inputs, inner image/archive, cache, dispatcher, validation code and prepared starter hashes in the final manifest. Final publication approval binds these prepared inputs, then the returned outer registry digest must be independently read back before use. No registry push or starter publication during preparation.

## Admission before SDK checkout and restore

SDK0.2.0 checks out and tar-overlays candidate source before our command starts, including after restoring a backup. Command-time validation alone is therefore too late. Before calling the SDK runner, the existing trusted Worker must inspect the exact candidate/base trees through documented Artifacts `readCommit`, recursive `readTree` and `readBlob` methods. Bind the returned tree/object identities to the registered project/base/head; cap depth, entries, bytes and request time, and deny missing objects or unsupported methods. Keep optional declarations explicit and prove their deployed interfaces before customer delivery; the current Wrangler pins are not silently upgraded. A missing interface blocks delivery rather than delegating unsafe validation to customer code.

Validate canonical relative names and permitted Git modes, disallow submodules/special files, absolute or escaping symlinks and symlink cycles/ancestor collisions, and exclude tracked paths colliding with compiled output or trusted history. Existing internal payload links must pass a bounded canonical-target validator, not be blindly rejected or followed. CI fixtures must test malicious source entering the first runner and the later restore/overlay, not only build output. The final starter tree must pass this exact validator. SDK checkout stays from Artifacts; no customer runtime GitHub fetch is introduced.

Only backups emitted by this trusted pipeline for the same operation/head/image manifest can be restored. No customer-supplied backup or cross-head install cache is admitted. Before every successful SDK backup, validate the complete workspace tree and retain only admitted tracked source, verified credential-free Git history and canonical compiled output. Raw customer dependency/cache/coverage/temp directories and guest control data never enter that backup. This prevents malicious generated links from being restored before the SDK source overlay.

## Guest filesystem, processes and network

The outer runner prepares a separate disposable copy of the validated candidate under its private temporary directory. Mount only that copy at the guest's `/workspace`; do not give the guest writable access to the outer SDK `/workspace`. Provide a separate verified credential-free Git history copy read-only if ordinary checks need Git. The source copy is compared to the admitted source after commands; a tracked mutation invalidates checks. Constrain each command to its fixed cwd and args, with a canonical mount source created by the controller; do not follow customer-created paths when starting the next command. Do not mount `/opt`, outer `/tmp`, `/proc`, root, SDK sockets, daemon sockets, R2 mounts, secrets or credential-bearing checkout remnants into the guest. The prepared npm cache is copied into guest-owned disposable storage, not mounted writable over trusted image/cache inputs.

The trusted controller owns the exact image, argv, cwd mapping, mounts, environment, container ID and limits. Fixed Docker execution requires `--network=none`, private PID/IPC namespaces, `--cap-drop=ALL`, `--security-opt=no-new-privileges`, the default seccomp policy, read-only image root and bounded writable temp/workspace paths. Use a fixed unprivileged guest UID as an additional restriction; the actual boundaries are namespaces, mounts and dropped capabilities. No privileged mode, host PID/IPC/network, devices, added capabilities, security-unconfined setting or TCP daemon listener. Dockerd listens only on an outer Unix socket inaccessible to the guest. The controller verifies Docker inspect facts and runtime probes; silently ignored options do not qualify.

Freeze CPU/memory/PID/workspace/log limits from CI measurements, within the selected outer instance and approved aggregate caps. Timeouts, OOM, excess bytes, failed inspect or failed shutdown cannot return success. Count nested execution and image/cache storage in the same outer-runner budget; it adds no provider container app, instance or independently authorized resource. Only one guest may run at once. One failed guest cannot be replaced under an uncertain operation.

## Shared commands and trusted receipts

Source `.github/scripts/checks.mjs` continues to run from the pinned outer Source path, using exact repo/base/head/default-branch context. Its trusted Git/scope/loosened/wiki checks read the admitted outer tree. Its `npm ci` and `npm test` calls go through a fixed outer dispatcher that maps a canonical candidate cwd into the guest. Cloud's ordinary `npm run build:app` uses the same dispatcher. Preserve actual arguments, ordinary dependency hooks, whole-change scope and failure status; no customer shell interpolation or alternate check implementation. The inner npm process uses its real fixed Node/npm environment, not the outer dispatcher recursively. Audit every shared check subprocess so an indirect customer script/import cannot execute on the outer host.

The outer controller records Docker's exact container ID, verified configuration, wait/exit/OOM/timeout status and confirmed stopped state. Guest stdout is diagnostic customer data, never trusted receipt JSON. Keep controller summaries outside guest mounts and prefix/type them independently of customer output. The Workflow trusts only its pinned outer entry's exit and bound receipt, not a matching line printed by tests. After each command, stop/remove the exact guest and confirm no guest processes remain before reading output or emitting success; a background process or uncertain destroy blocks the backup and privileged stages. Preserve exact IDs/errors for cleanup readback.

Validate compiled output using no-follow canonical regular-file reads after confirmed guest stop: reject escaping or any output symlink, hard-linked/special files, unexpected paths, changed files during inspection, oversized output and unsafe configuration. Transfer only validated regular bytes into the outer SDK compiled-output directory; rehash the transferred tree. A copy/archive made by customer code is not accepted validation. Trusted identity/manifest construction and fixed project/Worker/Access targets remain outside the guest. A fresh deployment runner independently revalidates source, output, identity and target before receiving the existing project-bound publication authority; it never runs customer hooks with that authority.

## Evidence and fail-closed sequence

| Gate | Required evidence | What it permits |
| --- | --- | --- |
| Revised design review | This design, coherent Source/Cloud tasks/specs, explicit remaining pins | Preparation only |
| Complete maintenance gate | CI-built exact recipe/starter, true offline ordinary checks/build, adversarial fixture results, measured limits and immutable artifacts | Reviewable final live request, no resource/configuration mutation |
| Exact fresh live authorization | Complete prospective inputs, owner/workspace/targets/grants, cost/time/cleanup and manifest/ledger digests | Only named staging configuration/publication/VM/probes |
| Initial real runtime gate | Exact deployed image; actual namespace/mount/capability/seccomp/limit denial, Artifacts object interface, complete runner/grant cleanup readbacks | Restricted ordinary customer acceptance steps; no claim that the whole journey passed |
| Candidate-specific real gate | Exact head/tree, red refusal, protected check receipt/output, stopped guest and complete outer lifecycle readback | Existing private preview/approval path for that candidate |

CI adversarial fixtures attempt outer localhost/control-port access, external DNS/egress, outer process/environment read or signaling, namespace/capability escape, trusted-tool writes, daemon socket access, checkout/Artifact grant read, forged receipt/log success, source mutation, malicious source/backup links, output symlink/hardlink/special files, surviving children, timeout/OOM and failed teardown. Use synthetic sentinels without real credentials in CI. Later real probes log only booleans/reasons/public identities; no secret values or secret-derived hashes. Missing evidence leaves `runner.isolationVerified=false` and blocks privileged stages. Reserve these probes within the existing40-runner/90-minute/storage/cost caps; do not add an unbounded side experiment.

If the pinned platform cannot enforce even one required primitive, or offline ordinary starter commands cannot pass, retain disabled creation and report that precise unsupported prerequisite. Do not loosen the boundary, replace SDK pins, add a service or extend spend/time automatically. Planning readiness means the correction is concrete, not that future platform support has been proved.

## Alternatives considered

- Separate Linux users or PID-only SDK sessions leave shared files/control networking and cannot establish the needed boundary.
- Cloudflare's host-network Docker example exposes outer localhost; it cannot protect the SDK control channel.
- Treating the whole SDK runner as untrusted while trusting its success JSON leaves check status and backup/overlay safety unproved.
- A new runner service, SDK fork or serialized lexical function exceeds the settled scope and introduces new lifecycle/credential ownership.
- Network-free fixed Docker guests with separate working copies preserve the existing Workflow/shared commands and give concrete runtime denial tests. Their exact nested-platform compatibility remains a gate, not an assumption of success.
