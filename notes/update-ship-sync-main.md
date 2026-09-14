---
slug: update-ship-sync-main
started: 2026-09-14
updated: 2026-09-14
consolidated:
---

# A ship should leave your checkout in sync

## What the user asked for

> "update the ship command so that it basically goes to the root (if in a worktree) and pulls the
> main so that it's in sync with the most recent push after we complete the ship"

The pain is concrete and repeat: work happens in throwaway paseo worktrees under
`/root/.paseo/worktrees/<id>/<name>/`, the durable checkout is `/root/WongStack`, and every ship
left it behind. Each new session started by noticing `main` was stale and pulling by hand.

## Answers given in the exit round

Three questions, all answered with the recommended option:

- **Plain single checkout** → fast-forward the local `main` ref too, via `git fetch origin main:main`.
  The user did not want the scope limited to the literal worktree case. Checking out `main` was
  offered and not taken — after a ship you should still be standing where you were.
- **Target checkout cannot fast-forward** → skip and report one line. Prompting was rejected as
  turning a finished ship into another question; forcing/stashing was rejected as able to clobber
  a concurrent session in that checkout.
- **Stale refs** → `--prune` remote-tracking refs only. Deleting merged local branches was offered
  and declined as wider than asked, even though `git branch -vv` here lists dozens of `[gone]`
  branches. That cleanup is still open, unclaimed by any change.

## The design turn worth remembering

The first framing was *"am I in a worktree? → primary root, else → local ref"*, resolving the
primary root from Git's common directory the way [the secrets convention](../wiki/development/secrets.md)
does. That framing is wrong, and the proposal was corrected mid-change: a primary checkout parked on
some *third* feature branch is neither shape, and the common-dir snippet answers *where the durable
file lives*, not *which checkout holds a branch*.

The question that actually picks the command is **which checkout has `main` out**:

```bash
git worktree list --porcelain | awk '/^worktree /{p=$2} /^branch refs\/heads\/main$/{print p}'
```

A plain checkout prints one worktree entry, so the same scan covers both shapes with no special
case. Verified live in this repo: it returns `/root/WongStack`.

Two mechanics chosen deliberately:

- **Gate on a clean tree before touching another checkout.** `git merge --ff-only` aborts only when
  it would *clobber* a change — unrelated modified files fast-forward right underneath whoever is
  editing them. That surprise is the whole thing to avoid, so skip unless
  `git -C "$WT" status --porcelain` is empty.
- **`merge --ff-only origin/main`, not `pull`.** Worktrees share the object store and ref namespace,
  so the one `git fetch` in the active worktree already refreshed `origin/main` everywhere. A `pull`
  in the sibling would be a second network trip and could merge rather than fast-forward.

## Loose ends

- This ship is the first real end-to-end exercise of the `/ship <intent>` chain that v12.4.0 added —
  the previous change shipped by hand because the chain did not exist yet when its work started.
- `openspec/changes/improve-openspec-plans/` is still an empty scaffold holding only `.openspec.yaml`.
  It showed up in `openspec list` again this session. It was noticed and left alone in the v12.4.0
  change too; nobody has claimed removing it.
