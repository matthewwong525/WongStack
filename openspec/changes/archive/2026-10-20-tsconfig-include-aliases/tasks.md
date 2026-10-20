# Tasks

## 1. Memory skill

- [x] 1.1 In `.agents/skills/memory/scripts/lib/callers.mjs`, load each scanned config once with its relative `extends` chain (inherited `paths`, `baseUrl`, `include`, and `files`, each resolved against the folder of the config that defines it); keep the nearest-config alias rule, and when it yields no scanned file, try the configs whose `include`/`files` cover the importer, by the rules in design.md.
- [x] 1.2 In `scripts/tests/memory-areas.test.mjs`, extend the shared-helper fixture with `shared/f.ts` covered by an app config's `include`, and add a test mirroring ClaymooApp: `apps/admin/tsconfig.app.json` extending a root base, mapping `@/*` to `../../packages/spa/*` with `include` of `src` and `../../packages/spa`, a root `tsconfig.json` with `files: []`; a `packages/spa` file importing `@/lib/x` is listed, an `exclude`d test file is listed too, and a `paths` set only in the extended base resolves.

## 2. Release

- [x] 2.1 Add a `## Next (patch) — The code lookup follows ClaymooApp's shared-code shortcuts` entry at the top of `CHANGELOG.md`, with **Updating.** Nothing to do by hand.

## 3. Verification

- [x] 3.1 Count resolved `@/` imports on `/root/ClaymooApp` before and after with `scanCode`; expect `packages/spa`'s 2,252 to resolve. Run `memory.mjs areas` on one shared file there and on `.agents/skills/memory/scripts/lib/cli.mjs` here, checking the latter is unchanged.
- [x] 3.2 Run `node .github/scripts/checks.mjs --worktree` as a pre-check, then `/save`; CI is the gate.
