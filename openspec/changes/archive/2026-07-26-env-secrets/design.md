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
