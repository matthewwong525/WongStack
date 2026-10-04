# Hosted starter and workspace bootstrap preparation

Tasks 2.2 and 2.3 are prepared, with the maintenance gate still pending. Neither task is checked off. This slice creates no hosted resource or credential, publishes no starter and enables no managed creation. `VERSION` remains unchanged.

## Prepared behavior

- The offline starter helper reuses payload copying, wiki hubs and the actual selected-source install record. It refuses an existing destination or dirty source. Direct dependencies are frozen to resolved lockfile versions, including Wrangler 4.144.0; the currently unused `qs` security override remains a constraint instead of inventing a resolved package.
- The HTTP/static configuration has native `previews.vars`, top-level assets and signed Access checks. It rejects business-data, memory, background, service and custom-build bindings. Existing GitHub `env.staging` is untouched. Compatibility route code remains shipped but has no provisioned memory bindings. The install record keeps `components.memory: null`.
- A compiled `/_hosted/identity` endpoint uses build-time project/SHA literals behind the existing signed identity verifier. The generated starter retains the complete app test chain and adds an identity-route test using the existing actual RSA-signed Access fixture. Ordinary build delegates to `build:app`, without migration/deployment hooks.
- The contract-5 fixed bootstrap job verifies the service's exact project/remote/template/generation before writes, clones the already-seeded Artifacts repository once, keeps later customer work and reuses the existing Paseo setup helper. Repo-scoped Git credentials and project-scoped delivery authority stay in private files outside history. No personal provisioning, GitHub login, platform credential or memory readiness enters the job or its report.
- Git remotes follow the official `.artifacts.cloudflare.net/git/<namespace>/<repo>.git` contract. Git token validation follows `art_v1_<40 lowercase hex>?expires=<digits>`, preventing Git-config quoting/control injection. The service-bound bearer token rejects controls. Foreign folders/remotes, stale generations, symlinks, weak permissions, untrusted markers and incomplete receipts stop with reconnect guidance.
- `/wong-setup` selects and verifies hosted context before choosing a personal target. A marker or Artifacts origin identifies the route but grants no authority.

## Local non-build evidence

`node --test scripts/tests/hosted-bootstrap.test.mjs scripts/tests/hosted-starter.test.mjs`: **18 passed**. Fixtures execute preparation using the real Source manifest/lockfile and exercise the maintenance command orchestration with stubbed npm output; this is not compilation evidence.

`node --test scripts/tests/hosted-bootstrap.test.mjs scripts/tests/hosted-starter.test.mjs scripts/tests/server-agent-contract.test.mjs scripts/tests/server-agent.test.mjs scripts/tests/server-agent-source.test.mjs scripts/tests/agent-layout.test.mjs scripts/tests/payload-rule-paths.test.mjs`: **77 passed** on the final prepared code, including the new orchestration and required-anchor fixtures.

The combined installer/agent/new/project run passed **98 of 104** under this root host. All **29 personal installer cases passed**. Six existing project cases failed on simulated UID-1000 versus root-owned private state directories, before reaching the extracted Paseo helper. A disposable copy of the exact existing `server-project.test.mjs` and its public module dependencies was then run as UID/GID 1000 with `setpriv --reuid=1000 --regid=1000 --clear-groups <temporary-node> --test <temporary-checkout>/scripts/tests/server-project.test.mjs`: **11 passed**, including all six cases. The temporary Node executable, public module copies and fixture checkout were removed. No existing assertion was changed for this environment.

These checks passed:

```text
scripts/tests/node_modules/.bin/oxlint --deny-warnings server/hosted server/agent/hosted.mjs server/agent/agent.mjs server/install-wongstack.mjs server/prepare-project.mjs scripts/check-hosted-starter.mjs scripts/tests/hosted-starter.test.mjs scripts/tests/hosted-bootstrap.test.mjs .agents/skills/wong-sync/scripts/hosted-context.mjs
node scripts/check-payload-links.mjs
node scripts/check-openspec-config.mjs
node scripts/check-retired-names.mjs
node .github/scripts/wiki-links.mjs
node scripts/measure-context.mjs --check
openspec validate cloudflare-hosted-starter --strict --no-interactive
```

The context budget remains within its limits, including startup at 2,174 words against 2,200. The script coverage inventory now includes `server/hosted/*.mjs`; no new coverage suppression or lower threshold was added.

## Maintenance gate still required

Source's payload maintenance workflow adds `node scripts/check-hosted-starter.mjs`. It refuses local execution and, in maintenance CI only, prepares the real starter and runs ordinary `npm ci --no-audit --no-fund`, `npm run cf-typegen`, `npm test`, and `npm run build`. It then reads the actual Vite/Wrangler redirected config, compiled Worker identity and HTML asset output, rejecting resource bindings or missing native Preview configuration. No deploy or preview command runs in this generated-starter check.

This generated app has **not** been installed, type-generated, tested or built locally. Its compilation, full app quality chain and compiled handoff require the fresh authorized Source maintenance gate. Full Source script coverage and existing app Test/Deploy/Payload checks are also still required. Existing staging authorization applied to prior prepared slices only; the parent owns the fresh checkpoint and permission boundary.

Cloud still must implement the authenticated project-scoped `POST /api/hosted/projects/:projectId/context` companion endpoint and negotiate contract 5 before dispatch. The Source helper targets the canonical service origin `https://wongstack.com`. Service integration, any noncanonical host configuration, immutable Artifacts starter staging and live acceptance remain subsequent work; no operational readiness is claimed here.

## Review fixes before the gate

Config validation now rejects absent/non-string Access audiences and name inputs, including when both production and Preview audiences are absent. Starter generation requires each Worker, routing-test, Vitest and Vite patch anchor exactly once; missing or duplicate anchors fail as `starter_anchor`. The Worker anchor includes the signed Access denial block so a changed protection block cannot silently move the compiled identity route outside it. The focused fixtures mutate only disposable copied payload files, cover missing and duplicate anchors for all four transformations, and pass with the final 77-case regression command above. No build, git, CI or provider action ran for this review fix.

## First maintenance attempt and repair

Exact Source head `bb01e066f3dd45b150e67a51c1c94c2391d44c98` passed [Test](https://github.com/matthewwong525/WongStack/actions/runs/37168659224) and [Deploy](https://github.com/matthewwong525/WongStack/actions/runs/37168659225). [Payload](https://github.com/matthewwong525/WongStack/actions/runs/37168659258) passed its full script suite, then the generated-starter step failed at `compiled_configuration`, after its awaited ordinary installation/type-generation/test/build commands returned successfully. This does not complete the starter gate.

Read-only inspection of the [published Cloudflare Vite plugin 1.62.1](https://registry.npmjs.org/@cloudflare/vite-plugin/-/vite-plugin-1.62.1.tgz), its normalized Wrangler defaults and `getOutputConfig` showed nested empty resource metadata, including `durable_objects: {bindings: []}` and `queues: {producers: [], consumers: []}`. The original check treated these harmless objects as configured resources. The repair checks actual contents recursively, retains rejection of nonempty arrays/scalars, adds service/KV guards and names the failed resource category without printing values. Seven focused starter cases and focused lint pass; the orchestration fixture now uses provider-shaped nested defaults. A complete maintenance rerun remains required.
