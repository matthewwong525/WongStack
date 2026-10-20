## ADDED Requirements

### Requirement: The lookup lists the code that uses a path

For each path asked about directly, the area load SHALL print, before its facts and even when the store is unreachable, the code files outside that path that load code from it, with the lines and names they use. A user SHALL count when it imports or requires by a literal path — relative, or through a folder shortcut the repo's own TypeScript or JavaScript configuration defines — through `.claude/` or `.codex/` read as `.agents/`, through a file that re-exports from the path, or purely for the module's side effects; a name reached through a re-exporter SHALL count only when the asked path's own code exports that name; a file that only defines or calls a function of the same name SHALL NOT count. The list SHALL be read fresh on each call, never stored, and SHALL need no package beyond Node. Paths a change names SHALL NOT get the list.

#### Scenario: A shared helper

- **WHEN** the lookup is asked about `lib/cli.mjs`, which exports `parseCli`; `a.mjs` imports `parseCli` from it and calls it; `b.mjs` imports it through `.claude/` and calls it; `c.mjs` imports `parseCli` from `lib-cli.mjs`, which re-exports everything from `lib/cli.mjs`; `d.mjs` defines and calls its own `parseCli`; and `e.tsx` imports it as `@/cli.mjs` through a `@/*` shortcut its config maps to that folder
- **THEN** it lists `a.mjs`, `b.mjs`, `c.mjs` (via `lib-cli.mjs`), and `e.tsx` with their lines and `parseCli`, and not `d.mjs`

#### Scenario: A change's paths

- **WHEN** the lookup runs for a change whose tasks name `lib/cli.mjs`
- **THEN** it prints no code-user list

## MODIFIED Requirements

### Requirement: One lookup shows everything linked to a path or topic

Each area in the `memory` skill's area list MAY name the wiki pages and specs that own it. A path asked about SHALL match an area when it falls under one of the area's folders or is named among the area's docs, so a spec or wiki page lands on its own subject, not only the folder that holds it. Given paths, a topic name, or a change, the area load SHALL print, before its facts and even when the store is unreachable: the matched areas; their named docs that exist in the repo, skipping any it lacks; each matched area's code folders; up to five archived changes, newest first, those naming a given path ahead of those sharing only an area; and, for each path asked about directly, the Markdown files and lines outside archived changes that link to it, read fresh on each call and never stored. In WongStack's own repo, every capability spec SHALL be named by at least one area and every named doc SHALL exist, or its tests fail.

#### Scenario: A mini-app file

- **WHEN** the lookup is asked about `app/worker/apps/hello/index.ts`, the `mini-apps` area names `wiki/stack/mini-apps.md` and `openspec/specs/mini-apps/spec.md`, and the archived change `mini-apps-in-the-main-app` names that folder
- **THEN** it prints `mini-apps` and `worker`, both docs, their code folders, that change among its past changes, the pages linking to the file, then the `mini-apps` and `worker` facts

#### Scenario: Looking up a spec

- **WHEN** the lookup is asked about `openspec/specs/memory/spec.md`, which the `memory` area names among its docs
- **THEN** it prints `memory` with its docs and code folders, and the `memory` facts, not only the generic area of the `openspec/` folder

#### Scenario: A new spec with no area

- **WHEN** a change in WongStack's own repo adds `openspec/specs/reports/spec.md` and no area names it
- **THEN** the tests fail and name that spec
