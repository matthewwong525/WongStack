# Install shadcn/lint

**Status:** ready-to-ship
**Branch:** lintapple-ui-improvements
**Open questions:** none

## Why

WongStack uses shared UI parts, but its checks do not yet include shadcn's design-rule plugin. Install it so future design rules can use the existing check command.

## What Changes

- **Add the design-rule plugin to the existing checks.** Installation makes it available; selecting design rules comes separately.
  ```text
  Existing checks
        │
        ▼
  Load design-rule plugin
        │
        ▼
  Run the current rules
  ```
- **Document where to configure it.** Explain how to run the checks and where to add design rules.

Non-goals: selecting design policies or changing screens.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

None. This is tooling setup with existing rule behavior preserved; `skip_specs: true` applies.

## Impact

Branch: `lintapple-ui-improvements`.

Add `@shadcn/lint` to app development dependencies and register it with Oxlint. Update the lockfile, testing wiki, and release notes. No runtime dependency or service is introduced.

## Decision log

- **2026-10-11** — Asked: install shadcn/lint in this repo → chose installation.
- **2026-10-11** — Assumed: register the plugin without new rules, because the upstream setup guide separates installation from policy selection and existing designs should keep passing unchanged.
- **2026-10-11** — Assumed: use the existing app Oxlint configuration and npm lockfile, because they already own UI linting and dependency resolution.
- **2026-10-11** — Check: `app/.oxlintrc.json` adds only the shadcn/lint plugin registration, because installation should use the existing lint command. No existing rule, severity, override, or check is loosened, and no new design rules are enabled.
- **2026-10-11** — Asked: publish the installed plugin → chose `/ship`; archive checkpoint retains the completed installation and the current branch.
