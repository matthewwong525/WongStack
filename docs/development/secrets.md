# Secrets and environment variables

Real secrets never go in git; a committed **`.env.example`** does. That one file is the source-of-truth list of every environment variable the project reads — each one documented, none of them filled in — so a new contributor can see what the app needs and bootstrap a working local setup without leaking a credential into history.

This is a **convention, not machinery.** WongStack ships the pattern and an example file; nothing in the toolkit reads `.env` or requires a particular platform. Adopt it as-is, or rename the files to whatever your stack already expects (a framework's own dotenv file, a platform's `.dev.vars`, etc.) and keep the same discipline.

## The two files

- **`.env.example` — committed.** Every variable the code reads appears here, blank, with a comment saying *what it is* and *where to get it*. It's a checklist, not a config: no real values ever land in it. Because it's versioned, a diff to this file is how the team sees that a new secret is now required.
- **`.env` — git-ignored.** The real values, filled in per machine. It's listed in [`.gitignore`](../../.gitignore) (alongside common variants like `.env.local` and `.dev.vars`) so it can't be committed by accident.

## Bootstrapping a local setup

```bash
cp .env.example .env   # then fill in the real values
```

Work down the file top to bottom, following each comment to wherever the value comes from. If something is unclear, the fix is to improve the comment in `.env.example` — that's the doc everyone else will read next.

## Keeping the template honest

The template is only useful if it stays complete. **When you add a variable in code, add it to `.env.example` in the same change** — blank, with its comment. Treat a missing entry as a bug: the next contributor's app won't run and they won't know why. Reviewers can watch for a code reference to a new variable that has no matching template line.

This is the same discipline the rest of the wiki runs on — keep the shared source of truth current as you go, rather than letting it drift. For how work moves through the repo, see [the change loop](the-change-loop.md).
