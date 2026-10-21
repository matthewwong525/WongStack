## MODIFIED Requirements

### Requirement: The lookup lists the code that uses a path

For each path asked about directly, the area load SHALL print, before its facts and even when the store is unreachable, the code files outside that path that load code from it, with the lines and names they use. A user SHALL count when it imports or requires by a literal path — relative, or through a folder shortcut the repo's own TypeScript or JavaScript configuration defines — through `.claude/` or `.codex/` read as `.agents/`, through a file that re-exports from the path, or purely for the module's side effects; a name reached through a re-exporter SHALL count only when the asked path's own code exports that name; a file that only defines or calls a function of the same name SHALL NOT count. A folder shortcut SHALL resolve through the nearest configuration above the importing file, else through any configuration whose included files cover it, each with the shortcuts it inherits by a relative `extends`. The list SHALL be read fresh on each call, never stored, and SHALL need no package beyond Node. Paths a change names SHALL NOT get the list.

#### Scenario: A shared helper

- **WHEN** the lookup is asked about `lib/cli.mjs`, which exports `parseCli`; `a.mjs` imports `parseCli` from it and calls it; `b.mjs` imports it through `.claude/` and calls it; `c.mjs` imports `parseCli` from `lib-cli.mjs`, which re-exports everything from `lib/cli.mjs`; `d.mjs` defines and calls its own `parseCli`; `e.tsx` imports it as `@/cli.mjs` through a `@/*` shortcut its config maps to that folder; and `shared/f.ts`, under no config of its own, imports it as `@/cli.mjs` through a shortcut defined by an app's config whose `include` lists `shared`
- **THEN** it lists `a.mjs`, `b.mjs`, `c.mjs` (via `lib-cli.mjs`), `e.tsx`, and `shared/f.ts` with their lines and `parseCli`, and not `d.mjs`

#### Scenario: A change's paths

- **WHEN** the lookup runs for a change whose tasks name `lib/cli.mjs`
- **THEN** it prints no code-user list
