## Context

See proposal.md. `qs` reaches the scaffold only through `@stryker-mutator/core` → `typed-rest-client` 2.3.1, which pins `qs` 6.15.1 exactly.

## Decisions

- **An npm `overrides` entry, `"qs": "^6.16.0"`.** It is the one npm mechanism that replaces a pinned transitive version. Scoping it under `typed-rest-client` would work too, but `qs` has no other path into the tree, so the flat form is simpler to read and to remove.
- **Rejected: waiting for Stryker.** Its latest release still pins `typed-rest-client ~2.3.0`, and `main` stays red until then.
- **Rejected: `typed-rest-client` 3 through an override.** It is a major version that Stryker does not declare support for.

## Risks / Trade-offs

- `qs` 6.16.0 is a minor release above what `typed-rest-client` asks for → it is used only by Stryker's dashboard reporter, which `npm test` does not use. CI runs Stryker on every push, so a break shows there.
- The override outlives its need → the proposal's Non-goals say when to remove it.
