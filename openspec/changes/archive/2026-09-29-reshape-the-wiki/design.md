# Design

## Context

See proposal.md for why. Checked against `main` at 3c7ff20:

- `wiki/development/` holds nine pages. `payload-files.json` ships seven (`secrets`, `the-change-loop`, `required-tools`, `staging-walkthrough`, `repository-improvement`, `memory`, `browsing`); `adding-a-skill.md` and `repo-layout.md` never ship, and the hub `README.md` is `seededBySetup`, so each install writes its own. `server/install-wongstack.mjs:163` seeds it as "Development: How this repo plans, builds, checks, and ships changes"; the source `wiki/README.md` describes the section as "editing the payload and cutting a release".
- Links into the two moving pages: `wiki/development/README.md:13,16`, `adding-a-skill.md` → `repo-layout.md`, `.agents/rules/payload.md:35` (`repo-layout.md#linking`), and the example path in `scripts/check-payload-links.mjs:14-15`. Archived changes also name them; archives are history and stay.
- `wiki/stack/d1-pipeline.md` is 409 lines; the three `## Recovery: …` sections are lines 358-402, and lines 7, 278, and 292 link `#recovery-a-bad-migration-reached-production`. Nothing outside the page links a recovery anchor.
- The start-up load (`node scripts/measure-context.mjs --check`) counts `wiki/wiki-style.md` and stood at 2,199 of its 2,200-word ceiling.

## Goals / Non-Goals

**Goals:**
- No shipped page links a page that does not ship, and every hub links each of its children.
- Each procedure named in the proposal has one owning page; the rest link it.

**Non-Goals:**
- Changing what ships: `payload-files.json` stays as it is.
- Rewording beyond the moved, trimmed, and opening sentences; "Docs that disagree" owns the payload and stack-optional wording.

## Decisions

### A root-level `wiki/maintaining/` section

`wiki/maintaining/README.md` ("Maintaining WongStack") takes the payload paragraph and the release sentence from `wiki/development/README.md`'s opening, and lists `adding-a-skill.md`, `repo-layout.md`, and [the payload rule](../../../.agents/rules/payload.md). The two pages move with `git mv` so history follows; their `Part of [working on WongStack](README.md)` footers point at the new hub, and their `../../` links stay valid at the same depth. `wiki/README.md` links the section; `wiki/development/README.md` keeps only shipped pages plus `/routine` and contributing, and opens with the line setup seeds.

*Alternatives:* `wiki/development/maintaining/` keeps the audiences in one tree and still makes shipped pages sit beside unshipped ones in the hub list. Renaming `wiki/development/` itself breaks every install's links and every skill's `wiki/development/…` path.

The section is not payload, so `payload-files.json` does not change. `.agents/rules/payload.md` adds `wiki/maintaining/**` to its `paths:` so the release rule loads while editing those pages, and its closing line points at the new hub. `scripts/tests/payload-rule-paths.test.mjs` only checks that payload files are covered, so an extra path passes.

### Recovery guides move to `wiki/stack/d1-recovery.md`

The new page, "Fix a broken production database", holds the three sections unchanged except their headings, which drop the `Recovery:` prefix the title now carries: `## A bad migration reached production`, `## Never hand-apply schema to production`, `## Production schema drifted from d1_migrations`. `d1-pipeline.md` keeps one sentence at line 7 and a `## Next` entry linking it, and its two Time Travel links point at the new page's first section. `wiki/stack/README.md` lists the page and drops "and the prod-recovery runbooks" from the pipeline's line. `wiki/stack` ships as a folder, so the page ships with no manifest edit.

The three old anchors go in `scripts/retired-names.json` (`#recovery-a-bad-migration-reached-production`, `#recovery-never-hand-apply-schema-to-production`, `#recovery-production-schema-drifted-from-d1_migrations`), so a missed link fails the check. *Alternative:* keep the old headings on the new page; then the anchors survive but the page repeats its own title in every heading.

### One owner per procedure

| Procedure | Owner | Others keep |
|---|---|---|
| Fork to pull request | `.github/CONTRIBUTING.md` | `wiki/contributing.md` keeps the bar, the scope, the cache-clone warning, *generalize it*, and *argue generality in the PR body*, and links the steps by URL (targets have no `.github/CONTRIBUTING.md`) |
| Release steps and level meanings | `.agents/rules/payload.md` step 1 gains *patch for wording, minor for new behavior, major for breaking* | `contributing.md`, `.github/CONTRIBUTING.md`, `adding-a-skill.md` step 3, and the maintaining hub each keep one line and a link |
| The folder links in an install | `payload-manifest.md` "The agent folder" | `repo-layout.md` keeps Editing, Linking, and Auditing; its "Why it's this way" restatement becomes one sentence linking the manifest. `required-tools.md` keeps only the Windows setting and the Codex check |

`wiki/contributing.md` links the payload rule by its GitHub URL today, because the rule is meta-only; keep that form.

### Opening sentences and the checklist

- `wiki/README.md:3`: open with what the wiki is ("This wiki is what WongStack has learned: …"), then who it serves.
- `wiki/stack/cloudflare-credentials.md:3`: fold line 5's "This page is the token screen in detail" into the first sentence.
- `wiki/stack/cloudflare-access.md:3`: open with "This page puts a login wall in front of your app with Cloudflare Access, …".
- `wiki/wiki-style.md`: `## Adding a page — the checklist` becomes `## Adding a page` with three numbered steps built from the current sentence's words. No page links the old anchor. The start-up count must not rise.

## Risks / Trade-offs

- An install's own page may link a retired recovery anchor → the changelog's **Updating.** note says to point it at the new page; `/wong-sync` adapts local pages anyway.
- "Docs that disagree" edits some of the same pages → whichever publishes second rebases and keeps both edits; neither changes page locations.
- The start-up ceiling has one word of room → count before and after the checklist edit; cut a word elsewhere in `wiki-style.md` if needed.
