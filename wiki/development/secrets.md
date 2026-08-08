# Secrets and environment variables

Real secrets never go in git; a committed **`.env.example`** does. That one file is the source-of-truth list of every environment variable the project reads — each one documented, none of them filled in — so a new contributor can see what the app needs and bootstrap a working local setup without leaking a credential into history.

This is a **convention with worktree-aware consumers**, not a required dotenv implementation. WongStack ships the pattern and an example file; its credential-aware skills follow the locations below, but the toolkit does not require a particular platform or make the application read `.env`. Adopt the names as-is, or use whatever your stack already expects (a framework's own dotenv file, a platform's `.dev.vars`, etc.) and keep the same discipline.

## The two files

- **`.env.example` — committed in the active branch.** Every variable the code reads appears here, blank, with a comment saying *what it is* and *where to get it*. It's a checklist, not a config: no real values ever land in it. Because it's versioned, a diff to this file is how the team sees that a new secret is now required.
- **`.env` — git-ignored in the primary worktree.** The real values, filled in per machine. A normal single checkout is already the primary worktree. From a linked worktree, resolve the durable checkout from Git's common directory rather than saving a second copy in the disposable checkout:

  ```bash
  COMMON_DIR=$(git rev-parse --path-format=absolute --git-common-dir)
  PRIMARY_ROOT=$(dirname "$COMMON_DIR")
  ```

  Setup writes the protection into [`.gitignore`](../../.gitignore) before this page can be acted on — `.env*` with a `!.env.example` negation, and the same pair for `.dev.vars` — so a per-environment variant full of live values can't be committed by accident either. Before writing a value, verify the destination from the primary worktree with `git -C "$PRIMARY_ROOT" check-ignore -q .env`. If it is not ignored, stop before accepting the secret and fix the protection first.

  If `.env` was already tracked before the rule existed, widening `.gitignore` does **not** untrack it: `git rm --cached .env`, and rotate whatever was in it, because it's in the history of every clone.

## Bootstrapping a local setup

In a normal checkout, copy the example beside itself. In a linked worktree, initialize the durable file in the primary worktree **from the active branch's example** — the active branch may introduce variables that `main` does not have yet:

```bash
cp .env.example "$PRIMARY_ROOT/.env"   # then fill in the real values
```

Work down the file top to bottom, following each comment to wherever the value comes from. If something is unclear, the fix is to improve the comment in `.env.example` — that's the doc everyone else will read next.

## Keeping the template honest

The template is only useful if it stays complete. **When you add a variable in code, add it to the active branch's `.env.example` in the same change** — blank, with its comment. Put the real value only in the primary worktree's ignored `.env`. Treat a missing entry as a bug: the next contributor's app won't run and they won't know why.

Rotating an existing value is different: update the durable `.env`, but leave `.env.example` alone unless the variable's name, purpose, or acquisition instructions changed. Rewriting an already-blank declaration creates noise and does not document the rotation.

## Existing linked-worktree copies

If both the primary worktree and a linked worktree have regular `.env` files, preserve both until you reconcile them. Do not print, compare in output, overwrite, delete, or bulk-merge their values. WongStack consumers prefer the primary file and report the duplicate without exposing it.

After reconciliation, tooling that insists on finding `.env` inside the linked checkout can use an **ignored symlink** to the primary file (or the stack's equivalent configuration). Never replace an existing regular file with that link automatically: reconcile it first, then confirm the link itself remains ignored.

This is the same discipline the rest of [the wiki](../README.md) runs on — keep the shared source of truth current as you go, rather than letting it drift. Other development processes live in [Development](README.md).
