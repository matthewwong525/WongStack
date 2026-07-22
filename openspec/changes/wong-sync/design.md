# wong-sync — design

## Context

Today the round trip is split across two skills doing blind two-way diffs. `install-wong-stack` Step 3U pulls updates down (per-file ask against `$WS`); `contribute-wong-stack` pushes drift up, runs no git, and leaves the clone dirty with a "go run /save over there" handoff. Both duplicate the payload manifest list. The `.wong-stack.json` manifest records only the installed `version`, so neither side can tell "you customized this" from "upstream moved" without asking.

This design was settled in an /explore session; the decisions below record its conclusions.

## Goals / Non-Goals

**Goals:**
- One skill, one pass: pull → curate → contribute → PR.
- Ask only real questions: three-way classification collapses most files into silent pulls or silent skips.
- Fully automated upstream PR, fork-aware, with the clone never left dirty.
- Single source of truth for the payload manifest list.

**Non-Goals:**
- Fresh install (stays in `install-wong-stack`).
- Any git in the target repo — pulled updates land in the working tree for `/save`.
- Syncing anything outside the payload manifest; app files still cannot leak upstream.
- Multi-upstream / non-GitHub forges.

## Decisions

**D1 — Absorb, don't compose.** `wong-sync` owns the update+contribute round trip outright; `install-wong-stack` shrinks to fresh-install-only and redirects to `/wong-sync` when a manifest exists; `contribute-wong-stack` is retired. Alternatives: a third skill alongside (three copies of the manifest list) or a thin orchestrator calling the other two (two disjoint question-walks). Absorption is the only shape that reduces surface area.

**D2 — wong-sync is payload, not source-only tooling.** Unlike the old meta-skills (symlinked, never copied), `wong-sync` is installed into every target as a real skill — "install once, then `/wong-sync` forever" requires it. Consequence: sync ships via sync, and the payload manifest list lives inside `wong-sync` (`references/payload-manifest`), with the installer referencing it rather than keeping its own copy. The manifest list adds `wong-sync` itself and drops `contribute-wong-stack`.

**D3 — Three-way diff with a recorded base.** The manifest gains `commit`: the `$WS` HEAD the repo last synced/installed to. Per payload file, compare base→upstream and base→local:

| upstream vs base | local vs base | classification | behavior |
|---|---|---|---|
| changed | unchanged | upstream update | pull down; show, minimal ask (batch-approve OK) |
| unchanged | changed | contribution candidate | curate (D6) |
| changed | changed | true conflict | show three-way, ask |
| unchanged | unchanged | in sync | silent |

Base file content comes from `git -C $WS show <commit>:<path>`. No `commit` in the manifest (pre-existing installs) → fall back to today's two-way walk once, then record the base. Alternative (deriving base from `VERSION` via `git log -S`) rejected as fragile; a recorded SHA is sturdier.

**D4 — Order: pull first, then contribute.** After the pull, remaining local drift is genuinely local — staleness is gone, and a local change that already landed upstream self-cancels instead of being offered back.

**D5 — Clone in the XDG cache, treated as a disposable hint.** Canonical location `${XDG_CACHE_HOME:-$HOME/.cache}/wong-stack/WongStack`, recorded in the manifest as `upstream.clone`. Missing/broken path → silently re-clone; present → `fetch` + hard-reset to the upstream default branch so every sync starts clean and current. Full clone (repo is tiny; history is needed for D3). Rejected: `~/src` (squats in the user's workspace), `mktemp` per run (path not meaningfully recordable, loses warm cache).

**D6 — Curation bar for contributions.** For each candidate, write a one-line generality rationale answering "does this belong in every WongStack repo?". Default is **skip** (contributing is opt-in); app-specific or marginal drift is filtered before the user is asked. Approved rationales become the PR body — exactly what an upstream reviewer needs.

**D7 — Git split: none in the target, full in the clone.** The CLAUDE.md rule is rescoped, not deleted: `/save`'s branch→PR→CI gate stays the only way changes land in the target; `wong-sync` does branch/commit/push/PR in `$WS` only. Clone-side flow when contributions are approved: branch `wong-sync/<target-repo-name>-<date>` → copy files + VERSION bump + CHANGELOG entry (release ritual, one commit) → push → `gh pr create` → reset clone to default branch. Nothing approved → clone untouched, no ritual, no PR.

**D8 — Fork-aware PR, fork recorded.** Check push permission on upstream (`gh api repos/{owner}/{repo} --jq .permissions.push`, or fall back to attempting the push). Push access (internal team) → branch directly on upstream. No access → `gh repo fork --remote` once, push branch to the fork, `gh pr create` against upstream; record the fork URL in `upstream.fork` and reuse it on later syncs.

**D9 — Manifest schema (v2, backward compatible).**

```json
{
  "version": "4.5.0",
  "commit": "<WS HEAD at last sync>",
  "installedAt": "…", "updatedAt": "…",
  "upstream": {
    "repo":  "https://github.com/matthewwong525/WongStack",
    "fork":  null,
    "clone": "~/.cache/wong-stack/WongStack"
  },
  "components": { "skills": [ …, "wong-sync" ], "claudeMd": true, "docs": true, "openspec": true }
}
```

Missing keys are filled in on first sync; nothing breaks on an old manifest.

## Risks / Trade-offs

- [Hard-reset of the clone eats manual edits someone made there] → Reset only after checking `git -C $WS status --porcelain`; dirty → warn and ask before resetting.
- [First sync on an old install is still the noisy two-way walk] → One-time cost; say so up front and record `commit` at the end.
- [User renamed a payload skill locally] → Same handling contribute-wong-stack had: diff under the target's name via the manifest mapping; carried into the wong-sync spec.
- [`gh` unauthed / no network at PR time] → Pull leg still completes; contribution leg degrades to "changes are on branch `<name>` in the clone — push when you're back online"; never block the pull on the push.
- [Retiring `/contribute-wong-stack` breaks muscle memory / older installed copies] → CHANGELOG note; installer's legacy-traces step offers to remove an installed/symlinked copy and point at `/wong-sync`.

## Migration Plan

1. Ship `wong-sync` + shrunken installer + retirement in one release (VERSION minor-bump won't do — installer behavior changes are **BREAKING** → major bump to 5.0.0; CHANGELOG explains the round trip).
2. Existing targets: next `/install-wong-stack` run redirects to symlink-or-copy `wong-sync`… in practice the first `/wong-sync` in a target is bootstrapped by running the updated installer once more (its manifest-exists path installs `wong-sync` and stops). Old manifests migrate lazily (D9).
3. Rollback: the retired skill stays in git history; restoring is a revert.
