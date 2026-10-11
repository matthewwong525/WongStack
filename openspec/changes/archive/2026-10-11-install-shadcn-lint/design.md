# Design

## Context

See [proposal.md](proposal.md) for scope. `app/` owns an npm lockfile and Oxlint 1.86, React, Tailwind 4, shared parts under `src/components/ui/`, and a theme in `src/index.css`. Oxlint runs at the start of `npm test`.

## Goals / Non-Goals

Load the new plugin through the existing lint command. Keep installation separate from selecting policy, as [the upstream setup guide](https://github.com/shadcn-ui/lint/blob/main/SETUP.md) recommends. No user-facing screen changes or UX section are needed.

## Decisions

- Add `@shadcn/lint` as an app development dependency using npm, committing its resolved lockfile with the change. Register it through `jsPlugins` in `app/.oxlintrc.json`; preserve scripts, built-in plugins, rules, and overrides.
- Rely on upstream automatic discovery for the existing component aliases and Tailwind theme unless setup reveals a concrete discovery requirement. Do not create a second linter.
- Document the lint command, configuration file, and absence of newly enabled design rules in `wiki/stack/testing.md`. Add a `Next (minor)` release note with the updater's installation step. Leave `VERSION` untouched.
- Verify plugin loading through the actual lint command and repository checks. The existing bad-sample proof covers preserved gates; no new policy test is needed when no design rules are enabled.

## Risks / Trade-offs

- Plugin integration may expose dependency-discovery or package compatibility problems → run the existing check chain, including its bad-sample and install-shaped app checks, and repair integration only.
- Registration does not enforce a design system yet → state this clearly in the wiki and handoff; future rule selection remains visible work.

## Migration Plan

Existing installs run npm install in their app after syncing. Revert the dependency, lockfile, and registration to remove the plugin. [review.html](review.html) is the review page.
