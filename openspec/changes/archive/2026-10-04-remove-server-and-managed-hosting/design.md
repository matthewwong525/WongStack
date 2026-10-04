# Design

## Context

See proposal.md for why. Three groups of files only ever served a host:

- `server/`: `setup.sh`, `preserve.sh`, `agent-runtime.sh`, the installer (`install-wongstack.mjs`, `prepare-project.mjs`, `project-github.mjs`, `access-result.mjs`, `sign-ins.mjs`, `preservation.json`), the agent (`agent/*.mjs`), and the hosted bootstrap and starter (`hosted/*.mjs`). It sits outside the target inventory, so no install holds a copy.
- The managed delivery pieces in the payload: `save/scripts/hosted-delivery.mjs`, `save/scripts/hosted-main-pre-push.mjs`, `save/references/hosted-delivery.md`, `wong-sync/scripts/hosted-context.mjs`.
- Source-only checks for them: `scripts/check-hosted-starter.mjs`, `scripts/acceptance/cloudflare-hosted/`, and fifteen test files.

"Check each for other users" found three shared files:

| File | Other user | What happens |
|---|---|---|
| `save/scripts/saved-revision.mjs` | `/verify` and `/save` on GitHub | Loses its Artifacts branch; keeps the GitHub path byte for byte |
| `wong-setup/scripts/provision.mjs`, `private-access.mjs` | `/wong-setup` | Comments only; `openWithoutLogin` stays because `--open-without-login` is interactive setup's own option |
| `.github/scripts/checks.mjs` | GitHub CI | Untouched; `--discover` holds no hosting code |

Nothing else imports from `server/` or the hosted modules: the only importers outside the deleted set are `saved-revision.mjs` and `check-hosted-starter.mjs`.

## Goals / Non-Goals

**Goals:**

- No live file names the server folder, the managed route, or wongstack.com as a host.
- The GitHub route of every verb reads and behaves as before.
- The release checks pass with no leftover link, anchor, or retired name.

**Non-Goals:**

- Touching `openspec/changes/archive/` or past `CHANGELOG.md` entries.
- Removing `--discover` from `checks.mjs`, `openWithoutLogin` from the provisioner, or the `wongstack-cloud` guard in `private-names.test.mjs`.
- Rewording mentions that are not about this: Access's `self_hosted` app type, Claude's managed-settings policy in `extract-host.mjs`, generated `app/worker-configuration.d.ts`, "a hosted server" as a generic example in `mini-apps`, "hosted account" in `memory`.

## Decisions

### Delete whole files; edit only the three shared ones

Each deleted file loses its last importer in the same change. `saved-revision.mjs` drops its two hosted imports, the `hosted` branch, the `hostedInput` and `delivery` parameters, and the `--hosted-input` flag. It keeps `SHA` as a local constant (`/^[a-f0-9]{40}$/`, the value `hosted-context.mjs` exported) and treats a non-GitHub `origin` as it already does: `UNKNOWN`, "Unsupported or foreign repository identity". Its test file loses the one hosted case.

Alternative considered: keep `hosted-context.mjs` for the own-account Artifacts part. Rejected: that part brings its own files and does not reuse these, and `HOSTED_ORIGIN` there is `https://wongstack.com`.

### Skill text loses the fork, not the steps

Each verb has one line that sends an Artifacts checkout to hosted delivery before its GitHub steps. That line goes and the steps under it stay as written:

- `wong-setup/SKILL.md`: the *Hosted workspace first* section.
- `save/SKILL.md` line on hosted transport; `save/references/preconditions.md` first line; `save/references/git-gate.md` saved-revision paragraph (the "verified hosted gate" and "Hosted candidate/generation/base" clauses).
- `ship/SKILL.md`, `continue/SKILL.md`: "for hosted/GitHub transport".
- `apply/SKILL.md`: "Managed preview: hosted delivery. Otherwise:".
- `verify/SKILL.md`: "or verified `--hosted-input <file>`".
- `wong-sync/references/catch-up.md`: the "Managed installs also need…" sentences. `wong-sync/references/payload-manifest.md`: "the `server/` setup script and agent" in the outside-the-inventory list.
- `wong-setup/references/cloudflare.md`: the two server-installer clauses.
- `memory/references/areas.json`: the `server` area, and `hosted-projects.md` wherever another area lists it.

This is a net cut, so `measure-context.mjs --check` gains headroom. If its baseline names a deleted file, record a new baseline at this revision rather than editing counts by hand.

### Specs: retire four, rename where a scenario drops

`retire_capabilities: true` is set, so archiving deletes the four emptied specs. A MODIFIED block must keep every scenario, so each requirement that loses a hosted or server scenario is REMOVED and ADDED under a new name ([the CLI contract](../../../.agents/skills/plan/references/openspec-cli.md#validate-and-archive)); those that lose only a paragraph are MODIFIED. The GitHub paragraphs are kept word for word, so the own-account Artifacts part finds the text it expects under the new names.

`install-onboarding`'s Purpose names the server script. A delta cannot change a Purpose, so `/apply` edits `openspec/specs/install-onboarding/spec.md` directly, ending the sentence at "through the normal workflow".

### Retired names, with the frozen fixtures allowed

Add to `scripts/retired-names.json`: `server/setup.sh`, `server/README.md`, `install-wongstack.mjs`, `hosted-delivery`, `hosted-main-pre-push`, `hosted-context.mjs`, `check-hosted-starter`, `hosted-projects.md`, `cloudflare-hosted-projects`, `managed-workspace-access`, `HOSTED_ACCEPTANCE_`. Each `replacement` says the piece was removed and names `/wong-setup` where one exists. The retrieval corpus under `scripts/tests/fixtures/document-retrieval/corpus/` is a pinned snapshot that names several of these; list those exact files under `allow` with that reason, as `session-notes` already does. `CHANGELOG.md` and `openspec/changes/` are exempt by the checker.

`server-agent` and `preserved-server-setup` are not added as names: both are ordinary words a later change could use.

### A major release with nothing to do

`## Next (major)` in `CHANGELOG.md`. The **Updating.** note, in plain words: an installed project needs no step; the update removes pieces it never used. Someone who set up servers from the `server` folder of a fork keeps them by staying on, or copying from, version 30.10.0.

### The wiki keeps one route

- Delete `wiki/stack/hosted-projects.md` and its hub line in `wiki/stack/README.md`; rewrite that hub's two opening paragraphs and its closing lines for one route.
- `wiki/stack/getting-started.md`: the first two paragraphs become one that points at the README's three steps; drop "Personal GitHub setup" qualifiers and the managed-cost sentence.
- `wiki/stack/customizing-wongstack.md`: "your hosted project" → "your project" in the drawing; drop the *For servers you run* paragraph.
- `wiki/stack/cloudflare-access.md`: the server-installer clause in the first paragraph, "serves both standalone setup and the managed server installer", and the *Managed membership* paragraph.
- `wiki/stack/cloudflare-cli.md`, `wiki/development/required-tools.md`: "hosted or scoped workspace" → "scoped workspace"; the three "server setup script installs it" clauses; "Setup and the server installer" → "Setup"; "server installer" in the cf line.
- `wiki/development/the-change-loop.md`: the two managed sentences in *The gate*. `wiki/README.md`: the Save line's managed half.
- `wiki/people/matthew-wong.md`: the "hosted inside WongStack cloud" clause.

`#the-gate` and every other heading stay, so installed repos' links to them hold.

## Risks / Trade-offs

- [Coverage falls under the floor once well-tested server code leaves the total] → The floors in `scripts/tests/.c8rc.json` stay at 85 and 81. If CI reports under, add tests for what remains; lowering a floor would need its own `Check:` reason and the person's say.
- [The loosened-checks guard flags the deleted tests and changed check settings] → The Decision log carries a `Check:` bullet naming each file. A file flagged beyond those gets its own bullet before the next save.
- [The own-account Artifacts part edits the same verbs, `delivery-gate`, and the change-loop page] → Whichever publishes second catches up: it keeps this change's removals and re-adds only its own route, targeting the renamed requirements.
- [`installation-owned-memory-devices` edits `server/README.md`, `server/agent/agent.mjs`, `server/install-wongstack.mjs` and MODIFIES "The server installer installs WongStack unattended"] → When it catches up it drops those edits and that delta; its memory work does not depend on them.
- [`choose-project-in-setup` edits `areas.json`, `payload-manifest.md`, `wiki/stack/README.md`] → Different lines; an ordinary merge.
- [An older install's wiki still links `server/README.md` on GitHub until it syncs] → Dead link only; the next `/wong-sync` delivers the fixed pages.
- [wongstack.com is still running when this publishes] → Its servers hold a clone at a pinned commit, which history keeps. Not checked in the wongstack-cloud repo; the *Shut down the wongstack.com app* part owns that side.

## Migration Plan

One change, published once. Undo it by reverting that publish; nothing outside the repo changes, and no key, account, or data is touched.
