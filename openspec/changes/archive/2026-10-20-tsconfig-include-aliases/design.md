# Design

## Context

43.15.0's [`callers.mjs`](../../../.agents/skills/memory/scripts/lib/callers.mjs) resolves an alias specifier (`@/x`) by the `compilerOptions.paths` of the nearest folder at or above the importer whose own `tsconfig*.json`/`jsconfig.json` defines `paths`. TypeScript doesn't work that way: a file belongs to the project whose `include`/`files` covers it, wherever that config sits.

ClaymooApp, read 2026-10-20: `packages/spa` has no config. `apps/admin/tsconfig.app.json` and `apps/public/tsconfig.app.json` each set `"paths": {"@/*": ["../../packages/spa/*"]}`, `baseUrl: "."`, and `include: ["src", "../../packages/spa", "../../shared"]`. The root `tsconfig.json` has `files: []` and only `references`. So of 2,386 `@/` imports, the 2,252 inside `packages/spa` resolve to nothing today.

## Decisions

- **Nearest first, covering configs as fallback.** `resolveSpec` tries, in order: the first matching alias of the nearest config with `paths` (today's rule), then the first matching alias of each config whose `include`/`files` covers the importer, in config-path order. It takes the first candidate that lands on a scanned file. Nothing 43.15.0 resolves changes.
- **Coverage by TypeScript's rules, simplified.** Patterns resolve against the config's folder. A pattern with no `*` or `?` covers that file or anything under that folder. `**/` matches any folders, `*` any name part, and `?` one character. With neither `include` nor `files`, the config covers its whole folder; `files: []` with no `include` covers nothing. `exclude` is ignored: on ClaymooApp it only drops test files, and those still load the code through the test runner's own `@/` alias, so they belong on the list. A pattern that resolves outside the repo is ignored.
- **Relative `extends` is followed.** A config inherits `paths`, `baseUrl`, `include`, and `files` from its relative `extends`, one string or an array, with a missing `.json` added. Inherited `paths` resolve against the `baseUrl` of the config that set it, else the folder of the config that set `paths`. Inherited globs resolve against the folder of the config that defines them. Package `extends` (`@tsconfig/node20`) and cycles stop the chain.
- **Memoized per scan.** Each config is loaded once per `scanCode`; the covering list is memoized per importer. Only non-relative specifiers reach this path.

## Risks / Trade-offs

- **Two apps mapping one shortcut differently**: the first config by path wins. A shared folder serving two apps nearly always maps the same way, as ClaymooApp's does.
- **Glob differences from TypeScript** (e.g. its default extension filter) fail toward listing a covering config that TypeScript wouldn't. That only matters if that config maps the shortcut to a different real file.
