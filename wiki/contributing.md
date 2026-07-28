# Contributing a WongStack improvement upstream

Improved a WongStack skill, a convention page in [this wiki](README.md), or the `WONG-STACK` block here? Send it to WongStack upstream as an ordinary pull request. It's a manual, deliberate act — [`/wong-sync`](../.claude/skills/wong-sync/SKILL.md) brings improvements *down* into this repo and never sends anything up.

## The bar: does this belong in *every* WongStack repo?

That's the whole test, and it's worth applying before you write anything. WongStack is process everyone shares, so a contribution has to be generic:

- **Yes** — a skill that handles a case it used to fumble, a sharper convention in [wiki style](wiki-style.md) or [voice](voice.md), a `WONG-STACK` block rule that any repo would want.
- **No** — anything that encodes *this* repo: your stack, your deploy target, your team's naming, your one-off workaround. Useful here, noise everywhere else.

If it doesn't clear the bar, keep it local. A repo diverging from upstream on purpose is fine — it's what [the adapt step](../.claude/skills/wong-sync/references/adapt.md) calls a `divergent` capability, and it leaves your version alone rather than nagging you toward WongStack's.

## What's in scope

Only files on the [payload manifest](../.claude/skills/wong-sync/references/payload-manifest.md): the workflow skills, the convention pages at this wiki's root, and the `WONG-STACK` block of `CLAUDE.md`. Your app code, app skills, and business docs aren't WongStack's to carry.

## The route

1. **Fork** [WongStack](https://github.com/matthewwong525/WongStack) and clone your fork. Don't work in the cached clone under `~/.cache/wong-stack/` — `/wong-sync` resets it on every run and your work would be lost.
2. **Branch** off the default branch.
3. **Make the change** in the fork, generalized. Strip anything repo-specific that came along for the ride: your paths, your stack, your examples. What reads naturally here usually needs rewording to read naturally everywhere.
4. **Apply the release ritual in the same commit** — editing the payload *is* a release:
   - bump `VERSION` (semver: patch for wording, minor for new behavior, major for breaking),
   - add a newest-first entry to `CHANGELOG.md` naming what changed and why.

   A payload change without these is incomplete: the updater relies on them to tell every other repo that something moved.
5. **Open the PR** against WongStack, with the generality argument in the body — why this belongs in every repo, not just yours. That's the case a reviewer is actually weighing.

## Why this isn't automated

It used to be, as `/wong-sync contribute`. Contributing turns out to be rare and deliberate, and the automation cost more in machinery and prose than it saved in typing — while forcing the sync to keep a tight read boundary so that nothing local could leak into a PR. Removing it let the sync read this repo properly, which is what makes [adaptation](../.claude/skills/wong-sync/references/adapt.md) work at all.

If you have a contribution branch parked in the cached clone from an older version of the skill, it's still there and untouched. Push it to your fork and open the PR by hand.
