# Setup installs the tools it needs

**Status:** in-progress
**Branch:** explore/setup-usage-ux
**Open questions:** none

## Why

The setup page promises that nothing gets installed on your computer and that you need no terminal. In practice, setup needs four free tools. When one is missing, setup stops partway with an error only a programmer can act on. Other stops come later: a second GitHub sign-in, a bare error on a new computer, and on Windows, skills that silently don't load. Setup should get your computer ready at the start, ask before each install, and let the pages tell you honestly what happens.

## What Changes

- **Setup gets your computer ready first.** Before it touches your folder or Cloudflare, setup checks for the four tools it needs. It installs the missing ones, asking before each. If one can't be installed, it says what went wrong and what to try, and stops before anything else is made.
  ```text
  empty folder? ──no──▶ stop
       │ yes
       ▼
  check the four tools
       │
  missing one? ──yes──▶ "May I install
       │                 Node? (free)"
       │                    │ yes
       │◀───────────────────┘
       ▼
  sign in to GitHub (once)
       │
       ▼
  Cloudflare key, then the
  usual plan and build
  ```
- **One GitHub sign-in, with everything it needs.** Setup shows you a short code and a link. You approve once in the browser, with every permission setup needs, and don't have to type any commands. Today a missing permission only fails at the first save, and you have to sign in again.
  ```text
  I need you to approve GitHub once.
  1. Open github.com/login/device
  2. Enter the code  ABCD-1234
  3. Approve, then come back here
  ```
- **Your name and email are set for you.** On a new computer, setup takes them from your GitHub account. Without them, setup used to stop partway with a bare error.
- **Windows gets a real check.** Setup tests whether Windows lets it make the folder links the assistant needs. If not, it walks you through the one switch in Settings, then checks again. Today the assistant just silently finds none of its skills.
- **Memory is reported honestly.** At the end, setup says memory is on only when it actually answers. Otherwise it says memory starts working once your site first goes live.
- **The pages match what happens.** The README, the getting-started guide and the token page agree on the steps. They say that setup may install free tools after asking, and that you need a free GitHub account. The token screen is described as two permission rows, not two checkboxes.

Non-goals: no change to the Cloudflare key itself or how it is made; no installer app or download; no change to other commands, which still install a tool only when they need it; no "what can I ask?" page or update notices, which come later.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `toolchain-dependencies`: the point-of-need rule gets a setup exception. Setup checks all four tools before it writes anything and installs missing ones with consent, through the system package manager when that needs no password, or else into the user's own folder. Other skills keep point-of-need installs.
- `install-onboarding`: setup signs the person in to GitHub itself, through the browser code flow, with the `workflow` and `user:email` scopes in one approval. It sets the git name and email from GitHub when they are unset, and checks Windows symlinks before the agent folder is made. The walkthrough lists the tool installs and the GitHub account. *Installation preserves the target* drops its claim that `/save` owns identity and its stale `/wong-cloudflare` sentence.
- `cloudflare-provisioning`: the closing report says memory is on only when the digest answers; otherwise it says memory starts after the first production deploy.

## Impact

- `.agents/skills/wong-setup/SKILL.md`: a new first section, *Get the computer ready*, before the source clone.
- `.agents/skills/wong-setup/references/tools.md` (new): the check, the install commands per system, the GitHub sign-in, git identity, and the Windows symlink check.
- `.agents/skills/wong-setup/references/cloudflare.md`: Step 1a verifies instead of stopping on `gh auth login`; Step 5's memory line.
- `.agents/skills/wong-setup/references/failure-map.md`: a *Getting the computer ready* table.
- `wiki/development/required-tools.md`: *Runtimes install at the point of need* gets the setup exception.
- `wiki/stack/getting-started.md`, `wiki/stack/cloudflare-credentials.md`, `README.md`: matching steps and wording.
- `VERSION` 25.9.0 → 25.10.0 and a `CHANGELOG.md` entry.
- No script or test changes; `scripts/tests/downstream-contract.test.mjs` pins nothing this touches.

## Decision log

- **2026-09-27** — Asked which area of the setup-to-use audit to tackle first → chose the setup tools.
- **2026-09-27** — Asked whether setup should install missing tools or the docs should drop the "nothing to install" promise → chose setup installs them.
- **2026-09-27** — Asked whether to also fix the other setup stops (git identity, the memory report, Windows links) → chose tools plus those stops.
- **2026-09-27** — Asked how setup should install missing tools → chose the system package manager (Homebrew, winget, apt).
- **2026-09-27** — Asked what setup does about Windows symbolic links → chose detect and walk the person through it.
- **2026-09-27** — Assumed: setup uses the package manager only when it runs without a password prompt (Homebrew already present, winget, or `apt` with passwordless `sudo`), and otherwise installs into the user's own folder, because the agent's shell cannot answer a `sudo` password prompt, and a managed laptop may refuse admin rights.
- **2026-09-27** — Assumed: setup does not install Homebrew itself, because that needs an admin password in a terminal; a Mac without it gets the user-folder install.
- **2026-09-27** — Assumed: the check runs after the empty-folder check and before the source clone, because the clone needs `git`, and a folder that will be refused should not trigger installs.
- **2026-09-27** — Assumed: the check is prose in a new `wong-setup/references/tools.md`, not a script, because it runs before any WongStack file is on the machine and must work where `node` is missing.
- **2026-09-27** — Assumed: the OpenSpec install command stays owned by `save/references/preconditions.md`, and `tools.md` links it, because `/update-dependencies` bumps the pin there.
- **2026-09-27** — Assumed: other skills keep point-of-need installs, and the spec's point-of-need requirement is replaced by one that carves out setup, because only setup runs before anything works.
- **2026-09-27** — Assumed: each unset git name or email goes into the global git config, taken from `gh api user` and the primary verified email, because a person's other repos need the same identity and an existing one must not be overwritten.
- **2026-09-27** — Assumed: `/save` no longer claims to own git identity in `wong-setup/SKILL.md`, because no `/save` step sets it; setup does it now.
- **2026-09-27** — Assumed: the `install-onboarding` requirement *Installation preserves the target* is corrected in the same change, because it says `/save` owns identity and names the retired `/wong-cloudflare`, and this change moves identity to setup.
- **2026-09-27** — Assumed: the runbook's `workflow`-scope check before the first push stays as a backstop, because a person can sign out and back in between setup and the first push.
- **2026-09-27** — Assumed: the README's three steps stay; getting-started expands them and says so, and its *Honest list* gains the GitHub account and install approvals, because the two pages count different things and only need to agree.
- **2026-09-27** — Assumed: links from `wong-setup` are checked by hand, because `check-payload-links.mjs` skips that source-only skill (a known gap).
- **2026-09-27** — Assumed: a minor release, because no installed repo needs a migration step and setup only gains behavior.
- **2026-09-27** — Built: `wong-setup/references/tools.md` owns the check, the no-password install routes with the `~/.local` fallback, the GitHub code-flow sign-in, identity, and the Windows link test; `SKILL.md` runs it after the empty-folder check and before the clone, reading it from the raw URL. The failure map gains *Getting the computer ready*; the runbook's Step 1a and Step 5 changed; `required-tools.md`, `getting-started.md`, `cloudflare-credentials.md`, the stack hub, and the README match. `gh auth login --web` and `gh auth refresh` were run with no terminal and printed the one-time code and device link. One consent names every missing tool, rather than one ask per tool; Node counts as ready at or above `.nvmrc`'s major. Released as 25.10.0, because 25.9.0 (dependency update, #147) merged first. Link, config, and retired-name checks and strict validation passed; `wong-setup` links were checked by script by hand.
