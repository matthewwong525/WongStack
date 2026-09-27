# Design

## Context

Setup is prose an agent follows: [`wong-setup/SKILL.md`](../../../.agents/skills/wong-setup/SKILL.md) and its runbook, [`references/cloudflare.md`](../../../.agents/skills/wong-setup/references/cloudflare.md). Today the skill clones the source first, which needs `git`. Runbook Step 1a stops with "run `gh auth login`" when `gh` is signed out. Node and OpenSpec are installed "at the point of need", under a rule in [required tools](../../../wiki/development/required-tools.md#runtimes-install-at-the-point-of-need) that prefers user-local installs. Git identity is claimed by `/save`, but no `/save` step sets it, and runbook 4b.6 reads `git config user.email` before any commit. Windows links are made with `ln -s`, which Git Bash turns into a folder copy when symlinks are off.

The agent's shell is not a terminal: it cannot answer a `sudo` password prompt or an interactive `gh` question. `gh auth login --web` works without one: it prints a one-time code and the device URL, then waits.

## Goals / Non-Goals

**Goals:**
- Setup finds and fixes every missing tool before it writes a file, with a consent that names every install.
- One GitHub approval carries `workflow` and `user:email`.
- No setup step asks the person to type a command.
- The human pages match what setup does.

**Non-Goals:**
- A script or installer binary. The check runs before any WongStack file is on the machine.
- Installing Homebrew, or any package manager.
- Changing how `/verify`, `/save`, or other verbs install tools.

## Decisions

- **Owner: a new [`wong-setup/references/tools.md`](../../../.agents/skills/wong-setup/references/tools.md).** It holds the check, the per-system install table, the GitHub sign-in, identity, and the Windows link test. `SKILL.md` gets a short *Get the computer ready* section that links it, placed after *Start from an empty folder* and before the source clone. Alternative: grow the runbook's Step 1. The runbook runs after the clone and is about Cloudflare, so the check would come too late.
- **Check order: `git`, `gh`, Node, OpenSpec.** `git` is needed for the clone, and OpenSpec needs Node. Each check is `command -v`, plus `node --version` at least `.nvmrc`'s major version (22), read from the raw URL before the clone.
- **Install route, per tool, first that works without a password:**

  | System | Route |
  |---|---|
  | macOS | `brew install` when `brew` is on `PATH`; else user folder |
  | Windows | `winget install --id <Git.Git / GitHub.cli / OpenJS.NodeJS.LTS>` (a Windows consent popup, not a password) |
  | Linux | `apt-get install` when `sudo -n true` succeeds; else user folder |

  The user folder means `~/.local`. Node comes from nodejs.org's official tarball for the platform, and `gh` from its GitHub release archive. Both add `~/.local/bin` to `PATH` for the session and to the shell profile. OpenSpec uses the install command owned by [`save/references/preconditions.md`](../../../.agents/skills/save/references/preconditions.md), with `--prefix ~/.local` when global npm needs `sudo`. `git` on a Mac with no `brew` triggers Apple's own command-line-tools prompt, a dialog the person clicks. Alternative: user-folder installs everywhere. The person chose the package manager, which is easier to update.
- **GitHub sign-in: `gh auth login --web --hostname github.com --git-protocol https --scopes workflow,user:email`,** run in the background. The agent reads the one-time code from its output and shows the code and `https://github.com/login/device` in the ask format. Already signed in → `gh auth status` scopes; missing ones → one `gh auth refresh --hostname github.com --scopes <missing>`, same code flow. `--git-protocol https` also sets git's credential helper, so the first push needs no second login. Runbook Step 1a then verifies and keeps its stop as the failure path. 4e's `workflow` check stays as a backstop.
- **Identity:** when either value is unset, `gh api user --jq '.name // .login'` gives the name, and `gh api user/emails --jq '.[] | select(.primary and .verified) | .email'` gives the email (this needs `user:email`, which is now requested). Set with `git config --global`. An existing value is never touched. `SKILL.md:33`'s "`/save` for Git identity" is dropped.
- **Windows links:** when `uname -s` matches `MINGW*|MSYS*|CYGWIN*`, test `MSYS=winsymlinks:nativestrict ln -s` in a temp folder. On failure, show *Settings → System → For developers → Developer Mode: On*, run `git config --global core.symlinks true`, and test again. The agent-folder step in `SKILL.md` makes its links with `MSYS=winsymlinks:nativestrict` on Windows, so a failure is loud, not a silent copy.
- **Memory line in the closing report:** Step 5 reads 4g's digest result. "On" only when it answered; else *"Memory starts once your site first goes live; until then, what I learn waits on this computer."*
- **Point-of-need rule:** [required tools](../../../wiki/development/required-tools.md#runtimes-install-at-the-point-of-need) keeps *consent always* and adds setup as the one skill that checks ahead. The user-local preference becomes the fallback route. The spec replaces the requirement, because its scenarios (no install during the check, a partial install on decline) invert.

## Risks / Trade-offs

- [`winget` missing on an old Windows 10] → user-folder install via the Node `.zip` and the `gh` `.zip`; `git` on Windows ships with Git Bash, which the Claude app already needs.
- [A distro without `apt`] → user-folder route; the table names only `apt`, to stay short.
- [`gh auth login --web` changes its output] → the agent reads the code from whatever line holds `one-time code`. If none appears, it stops with the failure-map entry rather than guessing.
- [The profile edit for `~/.local/bin` misses the shell the agent host uses] → setup exports `PATH` for its own session and rechecks with `command -v`. A later session finding the tool missing is caught by `/save`'s preconditions.
- [The flow is prose, and no test runs it] → the known cost of setup (memory: install defects are found by driving a real install). The *walkthrough matches reality* requirement stands.

## Migration Plan

Minor release, 25.10.0. Installed repos receive the `required-tools.md`, `getting-started.md`, and `cloudflare-credentials.md` edits through `/wong-sync`. `wong-setup` is source-only, so the setup changes reach only new installs. No installed repo needs a step.
