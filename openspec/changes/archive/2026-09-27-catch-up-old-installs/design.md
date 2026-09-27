# Design

## Context

Exploration ran the source preflight, read-only, against every real install on this host (2026-09-27, source 26.11.0):

| Install | Version | Units changed | Locally adapted | Result |
|---|---|---|---|---|
| ClaymooApp | 16.6.0 | 155 | 31 | `update` |
| ClaymooStore | 15.0.0 | 147 | 22 | `update` |
| WongOS | 16.6.1 | 155 | 47 | `update` |
| CarolOS | 16.3.0 | 155 | 37 | `update` |
| SuccessStoryClub | 7.2.0 | — | — | `error missing-inventory` |
| wongstack-cloud | 26.1.0 | — | — | synced 2026-09-27 |

Every run took 2–4 s. What the numbers hide:

- **No version floor.** `CHANGELOG.md` 19.0.0 says pre-19 installs are unsupported, but neither `wong-sync/SKILL.md` nor `preflight.mjs` checks it; five of six real installs are pre-19 and get an ordinary `update`. 19.0.0's premise ("no installs older than this release to support", `archive/2026-09-26-trim-legacy-and-restatement`) was wrong on this host.
- **Layouts vary.** ClaymooStore, CarolOS, and SuccessStoryClub keep a real `.claude/` and a real `CLAUDE.md`. ClaymooApp has the reverse links (`.agents → .claude`, `AGENTS.md → CLAUDE.md`), a real `.codex/`, `components.docsPath: "docs/development"`, and `stackPack: false`, so its wiki pages report `missing` although they exist under `docs/`. ClaymooStore and SuccessStoryClub still carry generated `openspec-*` skills. The manifest's agent-folder rule covers only the three `CLAUDE.md`/`AGENTS.md` cases; the reverse link and the folder move are unhandled since 19.0.0.
- **Hand steps are scattered.** 38 `**Updating.**` notes sit in `CHANGELOG.md`; several need a person (`memory.mjs migrate` after deploy in 25.5.0, 26.6.0, 26.11.0; `disallow_importable_env` in 26.6.0; OpenSpec 1.13.2 in 24.0.2; `Check:` bullets). `latest-source.md` reads the changelog but nothing gathers the range.
- **Plans aren't plain.** wongstack-cloud's 26.1.0 sync proposal holds 38 code spans in What Changes ("payload units", `workspace.mjs`, `MEMORY_DB`, Stryker, SHA). This repo's last twelve proposals hold 2–7. `wong-sync/SKILL.md`'s handoff to `/plan` is itself technical and says nothing about the reader.
- **Silent drops are known.** Memory #12: a rewrite of `wiki/stack/cloudflare-credentials.md` dropped a new upstream section with no conflict marker.

## Goals / Non-Goals

**Goals:** a deterministic list of what an old install needs; a plan the person can read; proof on a real install.

**Non-Goals:** repos with no install record; the pre-17 `notes/` move (memory #158: each repo handles its own); restoring `retire-generated-openspec.mjs`; splitting one sync into several changes; syncing any real repo.

## Decisions

### 1. Preflight reports catch-up needs, schema 1, additive

`installed.version` is read from the record; old installs run their own installed `wong-sync/SKILL.md` against the source preflight and reject an unknown `schemaVersion`, so the report stays schema 1 and gains two top-level fields.

`catchUp` — `{ needed, reasons: [...] }`, each reason a fixed code plus the paths it saw:

| Code | Detected when |
|---|---|
| `agent-folder` | `.agents` is missing or not a real directory, or `.claude` is a real directory |
| `codex-folder` | `.codex` is a real directory, or missing |
| `rules-file` | `CLAUDE.md` is real and `AGENTS.md` absent, or both real |
| `rules-file-reversed` | `AGENTS.md` links to `CLAUDE.md` |
| `wiki-elsewhere` | the record has `components.docsPath` other than `wiki` |
| `opted-out` | the record has `components.stackPack`, `appScaffold`, or `ui` set to `false` (lists which) |
| `generated-openspec` | a skills folder named `openspec-*` exists |
| `deploy-token` | the installed version is below 18.0.0 and the repo has `.github/workflows/deploy.yml` |
| `no-baseline` | the installed commit has no `payload-files.json` |

`needed` is true when any reason is present or the installed version is below 19.0.0. Detection reads only `lstat` and the record: no file bodies, matching the report's no-contents rule.

`updating` — `[{ version, title, note }]`, one per `## <version> — <title>` entry in the source `CHANGELOG.md` at `HEAD` whose version is above the installed one, carrying the text of its `**Updating.**` or `**Moving an existing install.**` paragraph. A missing or unparsable changelog yields `[]` and `updatingComplete: false`, never an error, because the file changes are still proven.

With no installed inventory, `baseSelection` is empty: every current unit is `added`, and `classify` gives `missing`, `latest-equivalent`, or `locally-adapted`. `missing-inventory` stays an error for the current commit.

### 2. `references/catch-up.md` owns the moves

One page, "Catching up an older install", one numbered step per code, each only where the report lists it, each keeping local files:

1. `agent-folder` / `codex-folder` — the 18.0.0 move restored from `git show v19.0.0^:.agents/skills/wong-sync/references/payload-manifest.md` (*Moving to 18.0.0*, step 1), plus the reverse case: replace the `.agents → .claude` link by moving the real folder to `.agents` and linking `.claude`.
2. `rules-file` / `rules-file-reversed` — link to *The agent folder* for the forward cases; the reverse case moves the real `CLAUDE.md` over the `AGENTS.md` link, then links `CLAUDE.md`.
3. `wiki-elsewhere` — `git mv` each WongStack page from the docs path to `wiki/`, update the repo's own links to them, drop `docsPath` from the record. Repo-owned pages in that folder stay.
4. `opted-out` — left out, named in What Changes with the reason; no files added.
5. `generated-openspec` — list each folder as a removal for review; the WongStack verbs replace it.
6. `deploy-token` — the 18.0.0 CI secret step, through setup's runbook section 4d.
7. `no-baseline` — every existing WongStack file is protected; the plan reads each against upstream before taking text.

The manifest's *The agent folder* and *Not copied* sections link the page; the *Before 19.0.0* note in `CHANGELOG.md` says installs from before 19.0.0 update through it.

### 3. `merge-check.mjs`

`node merge-check.mjs --target <dir> --source <dir> --from <installed commit> [--record <path>]` reuses the preflight's selection (exported helpers, no copy) to find `modified` units whose state was `locally-adapted`. For each, it runs `git diff -U0 <from> HEAD -- <sourcePath>` in the source, groups added lines by hunk, and marks a hunk missing when any non-blank added line, trimmed, is absent from the target file's trimmed lines. For the `CLAUDE.md` block unit, it compares within the block. Output is JSON: `{ schemaVersion: 1, files: [{ targetPath, missing: [{ sourceLines, count, first }] }] }`, exit 0 when nothing is missing, 1 when something is, 2 on usage error. `first` is the first missing line cut to 80 characters, so a reader can find it without the report carrying bodies. With `no-baseline` it reports `skipped: "no-baseline"`.

A line match is loose: a moved or reworded line passes. That is the right side to err on: the check catches dropped sections, and the plan's review catches rewording.

### 4. The handoff to `/plan`

The handoff lines live in `references/payload-manifest.md`, under *Planning an update* at the end of *Deterministic sync preflight*, and `wong-sync/SKILL.md`'s description to `/plan` links there. An old install runs its own installed `/wong-sync`, which reads only the source's manifest, so lines kept in the source `SKILL.md` would never reach it. In this order:

- when `catchUp.needed`, "Plan each reported move by `references/catch-up.md`";
- "Carry each applicable `updating` note as a task; post-publish steps come after the gate";
- "Before the install-record task, run `merge-check.mjs`; take or name every missing hunk";
- "Write Why and What Changes for the person, not an engineer, as five groups: what they get, what changes in how they work, what of theirs stays, what is left out and why, and what they do themselves. Name a file, skill, or command there only when they must type it, and keep to 12 code spans or fewer; counts, paths, and commands go in the design and tasks."

The page tells the sync to add the lines to whichever skill the installed `/wong-sync` hands the report to, `/explore` or `/plan`, word for word: the first WongOS run showed a 16.x skill invoking `/explore` with its own fixed text, so the lines never reached the plan, and its builder has no code-span warning.

The skill's "prescribe no proposal format" line stays: these are reading groups, not a template.

### 5. The builder warning

`build-review.mjs` counts code spans in the parsed Why and What Changes (drawings excluded) and, above 12, prints `review: warning: Why and What Changes name <n> files or commands; move them to the design and tasks`. It is a warning, not a failure, like the 60-column one.

### 6. The real run

In `/var/tmp` (`/tmp` is a 3.8 GB tmpfs, memory #347): `git clone /root/WongOS wongos-sync`, `git remote remove origin`, and point the source at this branch's checkout. Run the installed `/wong-sync` headless with `WONG_MEMORY_RUN=1` and the prompt naming the source path, up to the review page, no build. Then read `review.html`'s What Changes as a business owner with no tools: record code spans, any jargon, whether each by-hand step is there, and whether the moves match `catchUp.reasons`. Fix what this change owns; record the rest as facts.

## Risks / Trade-offs

- **Catch-up grows back.** The page restores steps 19.0.0 removed. It is one page, loaded only when the report asks, with no script.
- **Loose merge check.** A reworded upstream line counts as missing; the plan names it and moves on. False alarms cost a line each; misses cost a section.
- **Real-run cost.** One headless sync of a 155-unit install is a large agent run; WongOS was picked to keep it moderate.
- **Sibling overlap.** The sibling part shortens `/wong-sync`'s text without changing rules; whichever publishes second rebases the handoff wording.
