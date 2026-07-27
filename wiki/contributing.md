# Contributing a WongStack improvement upstream

Improved a WongStack skill, a convention page in [this wiki](README.md), or the `WONG-STACK` block here? Run **`/wong-sync contribute`** and it offers that improvement to WongStack upstream — curated, opt-in per file, PR opened for you. A bare [`/wong-sync`](../.claude/skills/wong-sync/SKILL.md) only pulls updates down; contributing is this separate, explicit ask.

## What `/wong-sync contribute` does

It runs the ordinary sync first, then adds two steps:

1. **Pull** — refreshes the cached WongStack clone, three-way-diffs every [payload manifest](../.claude/skills/wong-sync/references/payload-manifest.md) file, and pulls upstream updates into your working tree. This happens *before* curation on purpose: a local change that already landed upstream self-cancels here, so it's never offered back up as news.
2. **Curate** — whatever is still local-only is genuinely yours. Each file gets a one-line rationale and a recommendation.
3. **PR** — for the files you approve, the skill branches in its own clone, bumps `VERSION` and adds a `CHANGELOG.md` entry in the same commit, pushes (forking upstream first if you lack push access), and opens the pull request against WongStack.

Nothing lands in your own repo's git — pulled updates wait in the working tree for [`/save`](../.claude/skills/save/SKILL.md), the same as any sync.

## The bar: does this belong in *every* WongStack repo?

That's the whole test. WongStack is process everyone shares, so a contribution has to be generic:

- **Yes** — a skill that handles a case it used to fumble, a sharper convention in [wiki style](wiki-style.md) or [voice](voice.md), a `WONG-STACK` block rule that any repo would want.
- **No** — anything that encodes *this* repo: your stack, your deploy target, your team's naming, your one-off workaround. Useful here, noise everywhere else.

The skill writes that rationale for each candidate before asking, so you're judging a stated argument rather than a diff.

## Opt-in per file, skip by default

Nothing moves upstream without an explicit yes on that specific file. The skill recommends skip for drift it reads as app-specific or marginal and says why; you can override either direction. Decline everything and the clone is left untouched — no branch, no PR.

Only manifest files are ever read, in either direction. Your app code, app skills, and business docs are outside the manifest, so they cannot reach the PR even by accident.

## Nothing to run by hand

You don't fork, branch, bump the version, write the changelog entry, or open the PR — `/wong-sync contribute` does all of it. It needs `gh` authenticated; if it isn't, the sync still succeeds and the commit is parked on a local branch in the clone for you to push later.
