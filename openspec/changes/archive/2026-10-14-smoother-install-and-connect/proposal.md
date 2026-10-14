# Smoother install and connect

**Status:** planned
**Branch:** uneven-scorpion
**Open questions:** none

## Why

Two real runs on 2026-10-14, a fresh install and a teammate's Connect your assistant, both worked, but each hit snags a newcomer can't get past alone. On the install, the assistant improvised its own copy step, wrote 24 made-up reasons to pass a check, and restarted a stuck check run by hand. After publishing, it left the folder on an old branch. On connect, the project's own tools couldn't find the sign-in that setup had just saved, while setup said nothing else was needed.

## What Changes

- **Setup puts the files in place with one ready-made step.** The assistant no longer writes its own copy script. One step copies everything, makes the folder links, the wiki's starting pages and the ignore rules, and writes the install record, the same way on every install. The assistant still plans and reports as before; only the hand-work goes.
  ```text
      BEFORE                  AFTER
  read 5 docs ─▶ write    one install step
  a copy script ─▶ run    ─▶ files, links,
  ─▶ hand-write hubs,        wiki hubs, record
  ignore rules, record       ─▶ provision
  ─▶ provision               ─▶ first save
  ─▶ first save
  ```
- **A new install's first save passes the loosened-checks check.** Nothing existed before the first change, so nothing can have been weakened. The check says so and passes, instead of asking for a reason per settings file. Its quick run on your computer also stops crashing on brand-new files and on the folder links.
- **The first save already matches your project's settings.** Setup refreshes one generated file to fit your project, so it no longer turns up as a stray change at publish time.
- **Publishing restarts a cut-off check run by itself.** When Cloudflare cuts off the main branch's last check run, publishing starts it again, waits, and carries on. The assistant no longer stops to do that by hand.
- **After publishing, your folder is on the live version.** When you work straight in the project folder and nothing is unsaved, publishing switches it to `main`, the version that went live. Before, it stayed on the old branch.
- **A save explains a missing summary file.** A passing save deletes its summary file. A second save that reuses it now says so and asks for a new one, instead of a bare "no such file".
- **The project's own tools find your sign-in right after connect.** After the setup link signs you in and downloads the project, the project's tools work at once. Before, they said *Connect first* unless given a long hidden folder path. Setup checks this before it says nothing else is needed.
- **Connect says when it reused a sign-in, and whose.** If this computer was already signed in, the report says *Used this computer's existing sign-in as <email>*. That way a shared computer can't silently connect as someone else.
- **Listing actions says when the company ones are missing.** When you're not signed in, the list still shows memory actions, and now also prints a plain line saying the company actions are missing and how to sign in.
- **Setup asks for a new enough Node.** The tool check now asks for the Node version the app's packages accept (24.15 or later on Node 24), not just the major version. Older versions printed warnings on every install.

Non-goals: wording around Claude's safety prompts (the user said one prompt is fine); the cost of the check runs themselves; documents search setup on connect.

## Capabilities

### New Capabilities

### Modified Capabilities

- `install-onboarding`: a finished install comes from one install program; the tools check takes the Node range the app's packages need.
- `ci-tests`: a loosened-check run on a project's first change passes with nothing to compare.
- `delivery-gate`: ship restarts a cut-off default-branch run once, and moves a clean primary checkout off the merged branch onto the default branch.
- `employee-onboarding`: setup's report holds only once the project's own tools find the saved sign-in, and names a reused sign-in.
- `agent-api-discovery`: a combined list with no company sign-in says so in a plain line.

## Impact

- `.agents/skills/wong-setup/scripts/install.mjs` (new), `references/seed/` (new), `SKILL.md`, `references/tools.md`, `references/cloudflare.md`, `scripts/provision.mjs`
- `scripts/check-target-app.mjs` reuses the install program's file list
- `.github/scripts/loosened-checks.mjs`
- `.agents/skills/ship/scripts/ship.mjs`, `merge.sh`; `.agents/skills/save/scripts/checkpoint.mjs`
- `scripts/employee-bootstrap.mjs`, `scripts/company-api.mjs`
- `app/package.json` engines; `.agents/skills/wong-sync/references/payload-manifest.md`, `payload-files.json` (`seededBySetup`)
- `wiki/development/loosened-checks.md`, `wiki/stack/company-api.md`, `CHANGELOG.md`

## Decision log

- **2026-10-14** — Asked whether to plan all findings as one change or start with a subset → chose one change.
- **2026-10-14** — Asked (unprompted note from the user) about Claude's safety prompts → *"don't worry that much about safety checks one is fine"*; dropped the README install-wording and the Connect popup "go ahead" hint.
- **2026-10-14** — Assumed: the install program is a source-only setup script that `/apply` runs inside setup's normal plan, because the skill requires the normal workflow and thread #997 asked for exactly this program.
- **2026-10-14** — Assumed: the project's tools find the sign-in by falling back to setup's per-company folder named by the project's recorded address, not by a new pointer file, because the git helper already finds it that way and computers already connected are fixed without running setup again.
- **2026-10-14** — Assumed: publishing switches only the primary checkout, only when it is clean and still on the merged branch, because a linked worktree holding `main` would block the primary one from it later.
- **2026-10-14** — Assumed: the missing-company-actions line goes to the error output with exit 0, because the memory actions in the same list still work.
- **2026-10-14** — Check: `.github/scripts/loosened-checks.mjs` passes a branch whose base holds no files without reading it, because an empty first commit has no check to loosen (design decision 2); its quieter Git reads and skipped folder links change no verdict.
- **2026-10-14** — Assumed: provisioning refreshes the generated binding types right after it writes the project's settings, because that is the moment they change.
