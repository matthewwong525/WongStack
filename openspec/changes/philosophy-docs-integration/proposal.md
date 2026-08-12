# State the working principles, and drop the buzzwords

**Status:** ready-to-ship
**Open questions:** none

## Why

The README and philosophy page sell WongStack with buzzwords ("AI-native", "the compounding loop") instead of stating the working principles behind it. The maintainer wants the docs to state those principles plainly — six maxims, matter-of-fact, presented as one way of working that a team can adapt — and wants one of them (prefer code over AI for repeatable process improvements) to guide planning, not just sit on a page.

## What Changes

- Rewrite `wiki/agent-knowledge-center.md` around six maxims, in plain impersonal prose:
  1. Building in-house is about speed and quality, not saving money.
  2. Most process improvements should be code, not AI.
  3. Consolidate the processes and the data in one place you own — processes become code, which is also the record of how the work is done, and the business data sits behind that code. An agent that reads both is far more capable than one querying disconnected tools.
  4. Using AI must not require a complicated setup — no local dev environment, minimum dependencies.
  5. Context has to survive the session.
  6. Give AI as much access as you can, and as little autonomy as it needs — humans stay in the loop through the plan, PR review, tests, and Zero Trust, because AI does not disobey instructions, it misinterprets them.
- Strip and tighten `README.md`: keep the structure, remove "AI-native", "the compounding loop", and sales-style phrasing.
- Add code-first planning guidance to `.claude/skills/explore/SKILL.md` and `.claude/skills/plan/SKILL.md`: for a repeatable process, prefer a deterministic script over an AI-run step. The canonical statement lives on the philosophy page; the skills reference it.
- Update `wiki/README.md` pointer text and `CLAUDE.md` cross-references only where their wording depends on removed phrases.
- Release bookkeeping: bump `VERSION` (minor), add a `CHANGELOG.md` entry, run `node scripts/check-payload-links.mjs`.

Non-goals: no tooling or workflow mechanics change (the no-local-dev principle is framing only — CI and previews already are the gate); no first-person founder voice in the repo; no edits to the generated `openspec-*` skills; no wiki restructuring beyond the pages named above.

## Capabilities

### New Capabilities

- `code-first-planning`: `/explore` and `/plan` steer repeatable process improvements toward deterministic code instead of recurring AI-run steps, referencing the canonical principle on the philosophy page.

### Modified Capabilities

- `agent-knowledge-center`: the philosophy page and README present the six working principles in matter-of-fact prose; the "compounding loop" framing and "AI-native" label are removed; the docs present the setup as one way of working that a team can adapt.

## Impact

- `README.md`, `wiki/agent-knowledge-center.md` (rewritten), `wiki/README.md` (pointer text)
- `.agents/skills/explore/SKILL.md`, `.agents/skills/plan/SKILL.md` — the tracked path; `.claude/skills` is a symlink to `.agents/skills`
- `VERSION` (12.0.0 → 12.1.0), `CHANGELOG.md` (payload edit = release)
- `CLAUDE.md` needed no edit: it names the philosophy page by path, not by any removed phrase.
- No application code, no tests, no generated `openspec-*` skills.

## Decision log

- **2026-08-12** — Shipped the rewrite. Six principles, not five: the user added data consolidation mid-implementation and chose to give it its own principle rather than fold it into "building in-house", because it is the bridge between building in-house and granting an agent access. Their framing decided the wording — the consolidation covers *processes written as code* (which double as the record of how the work is done) *plus the business data behind that code*, so an agent reads both together. Placed third, after "most process improvements shouldn't use AI", since code is what does the consolidating. Change renamed from the Paseo-generated `devilish-kiwi` to `philosophy-docs-integration`, and the branch renamed from `philosophy/docs-integration` to match — a slash in the branch would have broken the `openspec/changes/<branch>/` lookup that `/continue` and `/ship` rely on. Ruled out: a first-person founder-voice page, and a standalone `wiki/philosophy.md` (two pages would both claim to own the philosophy; the existing page already had every inbound link). The three new links into `wiki/stack/` are conditional — they resolve only where the target took the Cloudflare pack — so the prose marks that optionality; `check-payload-links.mjs` reports them and passes with no dead links.
