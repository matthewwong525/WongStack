## Why

WongStack ships a real secrets convention — a committed `.env.example`, git-ignored real values, and [`wiki/development/secrets.md`](../../../wiki/development/secrets.md) — but the agent entry point never names it. `AGENTS.md` (with `CLAUDE.md` symlinked to it) has zero mentions of `.env`, "secret", "credential", or "auth", so an agent's only path to the convention is three hops down the wiki (`AGENTS.md` → `wiki/README.md` → `wiki/development/README.md` → `secrets.md`), and none of the first three surfaces uses any of those words. In practice an agent asked to run a one-off script against an API doesn't drill blind: it asks the user for a token or stubs the call out, when the value was sitting in `.env` the whole time.

## What Changes

- Add one paragraph to the `WONG-STACK` block in `AGENTS.md`, under **Where context lives**, pointing agents at `.env.example` as the map of what auth exists and at the git-ignored `.env` for the values when a task actually needs to run something.
- Phrase it **stack-neutral** — `.env` at the repo root named as the default, "or your stack's dotenv equivalent" as the escape hatch — because `wong-setup` offers the convention rather than forcing it, and `secrets.md` explicitly invites renaming to a framework's own dotenv file or `.dev.vars`.
- Add a requirement to the `secrets-convention` spec covering the agent instruction block, which it currently doesn't cover.
- Bump `VERSION` 6.1.1 → 6.2.0 and add the `CHANGELOG.md` entry (the block is payload, so editing it is a release).

**Non-goals:** no change to the `.env.example` template, `.gitignore`, `wiki/development/secrets.md`, or `wong-setup`'s opt-in seeding behavior; no duplication of the "keep the template honest" maintenance rule into the block (the link carries it); no fix to the stale `# CLAUDE.md` heading at `AGENTS.md:1` (leftover from the codex-first rename, unrelated).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `secrets-convention`: adds a requirement that the payload's agent instruction block point at the convention. The spec currently requires the wiki page and the installer offer, but says nothing about the surface an agent actually reads first.

## Impact

- **`AGENTS.md`** — one paragraph inside the `WONG-STACK` markers. Because the payload manifest syncs *the block only*, this reaches every target repo's `CLAUDE.md` through `/wong-sync`; everything outside the markers stays the target's own.
- **`VERSION`, `CHANGELOG.md`** — the release ritual for a payload edit.
- **Targets on older versions** — additive guidance, no migration. A target that declined the `.env.example` seed still reads a sentence that is true of the general convention, which is why the wording stays neutral and does not hard-link `.env.example`.
- No code, no dependencies, no build. The payload is prose.
