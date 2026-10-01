# Design

## Context

See [the proposal](proposal.md) for the intended experience. Fresh `/wong-setup` currently bootstraps the original GitHub repository explicitly. Its pre-clone tool instructions also read that repository's `.nvmrc`. The shared [latest-source reference](../../../.agents/skills/wong-sync/references/latest-source.md) already follows a recorded `upstream.repo`, but a fresh target has no record. The unattended server installer already records its actual source origin and installs that checkout's payload.

The source fork is a maintained template; an installed project gets its own app, hosting, memory, and install record. Source-only server scripts do not ship into that project. Setup and sync must never install the source checkout into itself.

## Goals / Non-Goals

**Goals:** give readers one customization guide and make its one-request installation example work from a selected fork, with the existing full setup and update flow.

**Non-Goals:** a new installer, a source-switch command for existing projects, customer account provisioning, or a hosting abstraction. No new app screens or dependencies.

## Decisions

### One shipped guide owns customization

Add `wiki/stack/customizing-wongstack.md`, titled **Make WongStack your own**. `wiki/stack/` already ships as a directory, so no duplicate inventory entry is needed. Link it from the stack hub, getting-started page, README's developer section, and the server guide's existing fork section. Keep the README's numbered normal install steps as their sole copy.

The guide covers:

- When a change should apply to every new project through a fork, and when to change just an installed project's site, tools, or business knowledge.
- Forking the source and asking the assistant to change workflow skills, generic rules, shipped docs, or the starter app. Link the payload manifest for what ships and what stays source-only; explain that changing server tools affects servers using that fork.
- Maintaining the fork as a template, preserving the inventory and environment examples, and creating fresh project-specific hosting and memory rather than copying the source's live IDs or install record.
- A copyable request such as `Install WongStack from github.com/your-name/your-stack`, accompanied by a fork-specific raw setup-runbook address with an explicitly replaceable owner/repository. Explain that the assistant runs the same tools, sign-in, token, hosting, and first-deploy flow.
- Receiving original WongStack changes in the fork through ordinary reviewed upstream updates, publishing the fork's changes, and running `/wong-sync` in installed projects to get that fork's latest version. The source fork never runs setup or sync against itself.

Link existing provisioning, release, contribution, and server contracts rather than copying their procedures. Shipped pages link source-only docs through GitHub addresses, since those files are absent in an installed project. The guide does not imply a customized provider other than Cloudflare works without changing its own setup flow.

An alternative was enlarging the existing source-contribution paragraph in README. A shipped wiki leaf is easier to find later and avoids mixing customization with contributing to the original project.

### Carry one source choice through setup

Update `/wong-setup`, its tool reference, and the shared latest-source reference so a fresh setup uses the explicit repository in the user's install request. With no explicit source, retain `https://github.com/matthewwong525/WongStack`. Existing installed targets still route to sync using their recorded source; a new setup request does not silently switch them to another source.

Use the selected repository's default branch and read its runbook and pre-clone prerequisites from that same repository. After retrieval, resolve references within that source checkout and record the actual repository, version, commit, and cache location in the fresh target. Keep the existing cache safeguards: a cache for another repository or one with local work gets a separate clean checkout, never a reset or remote rewrite. Failure to retrieve the requested fork stops with a plain explanation; do not substitute the original stack.

This is an instruction-driven setup flow already; adding a second runtime installer or a static assertion of instruction phrases would add machinery without exercising the agent's behavior. Reuse the existing retrieval and provisioning flow, and validate its source-selection scenarios explicitly.

### Record the fork as the project's upstream

Clarify the install-record guidance in the payload manifest: `upstream.repo` is the source actually installed, including a custom fork. Do not copy the source repo's own install record, memory bindings, or live config. The server installer already derives this from its origin; preserve that contract.

Sync's current retrieval reference supports this representation. Add the promise to its spec and validate with an installed-fork fixture rather than inventing a parallel fork configuration. Keep the original source as the default only for targets with no recorded custom source.

## Risks / Trade-offs

- **A bootstrap URL quietly loads the original stack.** Carry the chosen repository into every source-derived pre-clone URL; review `.nvmrc`, setup references, and install-record guidance together.
- **A normal cache already contains another source.** Preserve its remote and work and use the existing fresh-checkout behavior.
- **A fork removes setup prerequisites or changes its hosting architecture.** Report the missing requirement; the guide explains the fork owner must adapt and maintain its setup contract.
- **A source-only documentation link works here but breaks in an install.** Use existing upstream link conventions and run payload and wiki link checks.

## Validation

Review the guide's fork example as a reader, checking every link and placeholder. Walk the setup instructions for four cases: original default source; an explicit fork with distinguishable prerequisites and starter content; an unavailable fork; and a cache that holds another source or local work. Record evidence that the chosen source supplies the payload and record, and that failures never fall back or change the cache.

Use an installed-project fixture whose record names a fork to exercise the existing sync preflight against that source, including a local adaptation. Run the relevant existing server-install and sync preflight tests; add fixture coverage only where the source-following behavior lacks a meaningful check. Do not test prose by asserting its wording.

Run payload links, wiki links, OpenSpec config and strict validation, retired-name checks, and the instruction budget check. No local app build. Any real hosted install or deployment check is completed through `/save` and its checks; report unverified live behavior honestly if the change is kept at a host preview.

## Migration Plan

Add `## Next (minor) — Make WongStack your own` to `CHANGELOG.md`, leaving `VERSION` for `/ship`. Existing installs keep their recorded source; no owner action is required. The guide becomes available through normal sync. Reverting the instruction changes restores the original bootstrap defaults without deleting projects or rewriting their install records.
