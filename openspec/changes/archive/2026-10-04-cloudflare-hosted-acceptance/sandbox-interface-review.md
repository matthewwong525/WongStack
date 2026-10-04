# Bounded runner interface review

Observed 2026-10-04. This is read-only official-documentation and published-package research, not an executed isolation probe, provider acceptance, or vulnerability reproduction. No SDK package was installed/executed and no container, credential, or provider resource was created.

## Pinned inputs and documented boundary

Cloud's freshly fetched main lock pins `@cloudflare/ci@0.2.0` and `@cloudflare/sandbox@0.12.1`. The published Sandbox archive at [npm's pinned tarball](https://registry.npmjs.org/@cloudflare/sandbox/-/sandbox-0.12.1.tgz) was read and independently checked against the lock's SHA512 integrity:

`sha512-P1ZmNDLYtuEY1ZUcAx0OgTol98VqS617LGd4nf1RTOjSV2yHLDAp59NI36/gg3/pxkHPgmAEyFIjH/ie8FoA7g==`

Cloudflare's [current Sandbox security documentation](https://developers.cloudflare.com/sandbox/concepts/security/) (updated September30,2026) says the sandbox is the unit of trust: processes share files/processes/localhost, and a separate Linux user is not a security boundary in deployed sandboxes because processes have root-equivalent capabilities. Its [0.x security model](https://developers.cloudflare.com/sandbox/sdk/concepts/security/) likewise documents shared resources within one sandbox and separation between sandboxes. These docs do not prove the exact deployed pinned image's behavior; they invalidate treating image permissions or a `USER`/`runuser` choice alone as isolation proof.

The published0.12.1 declarations expose `BaseExecOptions` for timeout/environment/cwd/encoding; `ProcessOptions` adds process/session identifiers and lifecycle callbacks. They expose no per-command filesystem/capability restriction. `SessionOptions.isolation` describes PID namespace isolation requiring `CAP_SYS_ADMIN`; it does not document an immutable filesystem or private localhost boundary. Current [0.x command documentation](https://developers.cloudflare.com/sandbox/sdk/api/commands/) similarly gives command/environment/cwd/timeouts, not that missing boundary.

Published CI0.2.0 `SandboxRunner.run` creates a random fresh sandbox with `enableDefaultSession:false`, restores only its workspace backup, overlays the exact source, and launches the configured command with `startProcess`. Its public runner options/config expose no session or capability isolation primitive. `CIWorkflow` owns a private context and runner invocation; no documented public runner replacement seam was found. This is a bounded interface finding, not a claim that every conceivable supported correction is impossible.

## Concrete preparation blocker

Cloud's shipped `scripts/hosted/check-build.mjs` runs the trusted Source checks and customer-controlled npm commands inside one SDK sandbox. The current design requires actual trusted tooling/process isolation. A path under `/opt`, frozen image inputs, a clean child environment, and fresh runners cannot establish that same-sandbox boundary by themselves. The existing later privileged runners are fresh and important, but do not independently prove the earlier check receipt trustworthy or restored workspace material safe.

Do not mark `runner.isolationVerified`, compatible deployment, passing live tests, or publication accepted from these static observations. Do not configure the recipe or start a privileged live stage on the assumption that file ownership solves it. Preserve the shipped default-disabled implementation and frozen acceptance evidence.

## Required correction review

Re-plan the smallest supported correction within the existing SDK Workflow and ordinary shared commands. Treat the entire customer-executing sandbox and its outputs as untrusted. The review must explicitly cover trusted check orchestration and receipts, the sandbox control channel/localhost/processes, exact checkout credentials, workspace backup and overlay, and canonical compiled output entering fresh privileged runners. Require a supported containment or external trust boundary with named interfaces, CI-owned adversarial fixtures, and later separately authorized real runtime probes before accepting its claims.

No replacement orchestration service, custom packer, serialized function, write broker, dependency upgrade, Docker user permission claim, or weaker acceptance requirement is implicitly approved. If no supported correction fits the settled scope/pins, retain disabled creation and present the precise revised scope choice; do not guess a fix. Completing the separately chosen VM Source-pin preparation does not clear this blocker.

## Revised preparation design

The user requested completion of the focused revision. [runner-containment-design.md](runner-containment-design.md) selects a fixed offline Docker guest inside the existing SDK runner, with a separate working copy, trusted outer checks/receipts, pre-SDK source-tree admission and canonical stopped-guest output transfer. It resolves the design choice without a new service or SDK upgrade. Read-only review of official nested Docker, Docker network/run and Artifacts object-inspection interfaces supports preparing this composition; it does not prove our exact pinned platform enforces it. CI and later bounded real probes remain mandatory, with isolation proof false until observed. This revision supersedes the request to choose an approach, not the original blocker evidence or frozen shipped evidence. No Docker execution, build, push or provider mutation was used to design it.
