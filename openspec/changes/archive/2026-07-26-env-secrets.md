<!-- openspec-archive v1 2026-07-26-env-secrets -->
<!-- file proposal.md utf8 2884 -->
## Why

WongStack ships a real secrets convention — a committed `.env.example`, git-ignored real values, and [`wiki/development/secrets.md`](../../../wiki/development/secrets.md) — but the agent entry point never names it. `AGENTS.md` (with `CLAUDE.md` symlinked to it) has zero mentions of `.env`, "secret", "credential", or "auth", so an agent's only path to the convention is three hops down the wiki (`AGENTS.md` → `wiki/README.md` → `wiki/development/README.md` → `secrets.md`), and none of the first three surfaces uses any of those words. In practice an agent asked to run a one-off script against an API doesn't drill blind: it asks the user for a token or stubs the call out, when the value was sitting in `.env` the whole time.

## What Changes

- Add one paragraph to the `WONG-STACK` block in `AGENTS.md`, under **Where context lives**, pointing agents at `.env.example` as the map of what auth exists and at the git-ignored `.env` for the values when a task actually needs to run something.
- Phrase it **stack-neutral** — `.env` at the repo root named as the default, "or your stack's dotenv equivalent" as the escape hatch — because `wong-setup` offers the convention rather than forcing it, and `secrets.md` explicitly invites renaming to a framework's own dotenv file or `.dev.vars`.
- Add a requirement to the `secrets-convention` spec covering the agent instruction block, which it currently doesn't cover.
- Bump `VERSION` 6.1.1 → 6.3.0 and add the `CHANGELOG.md` entry (the block is payload, so editing it is a release).

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

<!-- end proposal.md -->
<!-- file design.md utf8 4814 -->
## Context

The secrets convention already exists and works: `.env.example` is committed and documented, `.env`/`.env.local`/`.dev.vars` are git-ignored, [`wiki/development/secrets.md`](../../../wiki/development/secrets.md) explains the pattern, and `openspec/specs/secrets-convention/spec.md` specs it. The only gap is discovery — `AGENTS.md` never says the word.

`AGENTS.md` has two halves that behave very differently, and picking the right one is the whole design question:

```
AGENTS.md  (CLAUDE.md ─symlink─▶ AGENTS.md)
├─ "What this is" + "Working on WongStack"   ← this repo only; not payload
├─ <!-- WONG-STACK:BEGIN -->
│    "Where context lives"                   ← lifted VERBATIM into every
│    "Rules"                                    target repo's CLAUDE.md
└─ <!-- WONG-STACK:END -->
```

The payload manifest syncs **the block only** — "everything outside the markers belongs to the target and is never compared or copied."

## Goals / Non-Goals

**Goals:**
- An agent reading the entry point learns, without drilling, that credentials already exist in the repo and where the map of them is.
- The wording survives being lifted into a target repo that renamed its dotenv file or declined the `.env.example` seed.
- The `secrets-convention` spec covers the agent instruction block, not just the wiki page and the installer.

**Non-Goals:**
- Changing the convention itself, the template, `.gitignore`, or `wong-setup`'s opt-in behavior.
- Restating `secrets.md` in the block. One paragraph and a link; the wiki page owns the detail.
- Fixing the stale `# CLAUDE.md` heading at `AGENTS.md:1`.

## Decisions

**Inside the `WONG-STACK` block, not above it.** Above the marker reaches only this repo — and WongStack has no runtime and reads no secrets, so the guidance would be inert exactly where it landed. Inside, it reaches every repo that installs WongStack, which is where agents actually need it. This matches the precedent that put `development/secrets.md` in the payload manifest while leaving app docs out.

**Under "Where context lives", not "Rules".** The paragraph answers *where does a thing live* — same question as the wiki paragraph above it and the OpenSpec paragraph below it. "Rules" is process obligations (`/save` before you stop, don't edit `wiki/` mid-task); this isn't one.

**Point at `.env.example` first, `.env` second.** These are different instructions with different costs. `.env.example` is the committed, valueless map — safe to read freely and it answers "what auth does this project need." `.env` holds live credentials, and reading it pours them into the transcript. The user's stated use is one-off scripts, so the framing is: read the map to orient, read the values when you actually need to run something.

**Stack-neutral wording.** `.env` at the repo root is named as the default because a concrete first place to look is the entire point, but "or your stack's dotenv equivalent" keeps it honest for a target using `.dev.vars` or a framework's own file — which `secrets.md` explicitly invites.

**Don't hard-link `.env.example`; do hard-link the wiki page.** `wong-setup` seeds `.env.example` on opt-in, so a link would be dead in a target that declined, while inline code still reads fine. The wiki link is different: `wiki/development/secrets.md` is in the payload manifest, so it exists wherever the block does. Its path is hardcoded even though the manifest resolves the wiki root as `wiki/` with a `docs/` fallback — the block already hardcodes `wiki/README.md` and `wiki/wiki-style.md` the same way, and inventing a one-off exception here would be worse than the consistent, pre-existing behavior.

**Alternative considered — a `Rules` bullet carrying the "keep the template honest" discipline** (add a variable in code → add it to `.env.example` in the same change). Rejected: `secrets.md` already covers it, and every sentence in the block is inherited by every target, so the block earns its length by being short.

## Risks / Trade-offs

- **The sentence is false in a target with no dotenv file at all** → the "don't ask for a token" clause is scoped to the environment files existing; neutral phrasing plus the link means a reader with no `.env` follows through to the convention rather than hunting for a file that isn't there.
- **Agents read `.env` eagerly and spill secrets into transcripts** → the paragraph orders the two files deliberately, making `.env.example` the default read and `.env` the conditional one ("when you actually need to run something").
- **Block bloat — every added line ships to every target forever** → one paragraph, no restatement of the wiki page, no extra rule.
- **Version choice** → additive payload guidance with no migration, so minor: 6.1.1 → 6.3.0.

<!-- end design.md -->
<!-- file tasks.md utf8 1011 -->
## 1. AGENTS.md — the WONG-STACK block

- [x] 1.1 Add the secrets paragraph as the third paragraph under `## Where context lives`, inside the `WONG-STACK:BEGIN`/`END` markers — `.env.example` named first as the committed map, the git-ignored `.env` at the repo root (or the stack's dotenv equivalent) second for values, per design.md **Decisions**
- [x] 1.2 Verify the wording holds up when lifted: `.env.example` mentioned as inline code and not hard-linked, `wiki/development/secrets.md` linked, no repo-specific detail
- [x] 1.3 Confirm the edit sits wholly between the markers and nothing outside them changed (`git diff AGENTS.md`)

## 2. Release ritual

- [x] 2.1 Bump `VERSION` 6.1.1 → 6.3.0
- [x] 2.2 Add the newest-first `CHANGELOG.md` entry for 6.3.0 describing the added guidance

## 3. Verification

- [x] 3.1 Re-run the discovery check that motivated the change — `grep -inE 'env|secret|credential|auth' AGENTS.md` now hits inside the block
- [x] 3.2 `openspec validate env-secrets` passes

<!-- end tasks.md -->
<!-- file specs/secrets-convention/spec.md utf8 1984 -->
## ADDED Requirements

### Requirement: The agent instruction block points at the secrets convention

The payload's `WONG-STACK` block SHALL tell agents that credentials and config already live in the repo's environment files, naming `.env.example` as the committed map of every variable the project reads and the git-ignored `.env` as where the filled-in values sit when a task needs to run something. The guidance SHALL be stack-neutral — naming `.env` at the repo root as the default while allowing a stack's own dotenv equivalent — since the convention is offered, not forced, and a target may have renamed the files. It SHALL link the wiki's secrets page rather than restating it, and SHALL NOT hard-link `.env.example`, which a target may have declined to seed.

#### Scenario: An agent finds the credentials without drilling through the wiki

- **WHEN** an agent reads the repo's `CLAUDE.md`/`AGENTS.md` before running a one-off script that needs an API credential
- **THEN** the `WONG-STACK` block names `.env.example` as the map of available variables and the git-ignored `.env` as the source of values
- **AND** the agent neither asks the user for a token nor stubs the call out when the value is already present

#### Scenario: The guidance survives being lifted into a target that renamed its dotenv file

- **WHEN** the block is copied verbatim into a target repo that uses `.dev.vars` or a framework's own dotenv file, or that declined the `.env.example` seed
- **THEN** the wording still reads true, because it names `.env` as the default while allowing the stack's equivalent
- **AND** it contains no link that resolves to a file the target does not have

#### Scenario: The block defers to the wiki page for detail

- **WHEN** a reader wants the full convention — why real secrets stay out of git, how the template stays the source-of-truth list, how to bootstrap a local file
- **THEN** the block links the wiki secrets page instead of duplicating its content

<!-- end specs/secrets-convention/spec.md -->
<!-- file .openspec.yaml utf8 40 fence=~~~ -->
~~~yaml
schema: spec-driven
created: 2026-07-26

~~~
<!-- end .openspec.yaml -->
