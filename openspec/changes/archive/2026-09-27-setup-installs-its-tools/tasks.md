# Tasks

## 1. Setup skill

- [x] 1.1 Write `.agents/skills/wong-setup/references/tools.md`: the four-tool check (with the Node major version read from the source's `.nvmrc`), the per-system install table with the no-password rule and the `~/.local` fallback, the one consent per install in [the ask format](../../../.agents/skills/explore/references/asking-the-user.md), the stop on decline or failure, the GitHub code-flow sign-in and scope refresh, git identity from GitHub, and the Windows link test with the Developer Mode walkthrough. Link the OpenSpec install command in `save/references/preconditions.md` rather than copying it. Verify: every command in design.md's *Decisions* appears once, and every doc it names is linked.
- [x] 1.2 Add *Get the computer ready* to `.agents/skills/wong-setup/SKILL.md`, after *Start from an empty folder* and before the source clone, linking `tools.md`. Reorder the opening line to match. Drop "`/save` for Git identity" from the delegation paragraph. Make the agent-folder links with `MSYS=winsymlinks:nativestrict` on Windows. Verify: the skill reads in order — empty folder, computer ready, source, token, explore — and stays under 800 words.
- [x] 1.3 In `references/cloudflare.md`, turn Step 1a's signed-out stop into a check that points back to `tools.md`'s sign-in. Make Step 5's memory line depend on 4g's digest result, with the plain "starts once your site first goes live" wording. Update the intro drawing's "two checkboxes". Verify: 4e's `workflow` backstop is unchanged.
- [x] 1.4 Add a *Getting the computer ready* table to `references/failure-map.md`: a declined install, a package manager that wants a password, no code in `gh`'s output, a sign-in not completed, no verified primary email, and the Windows link test still failing after Developer Mode. Each row gets the one fix in plain words.

## 2. Wiki and README

- [x] 2.1 In `wiki/development/required-tools.md`, rewrite *Runtimes install at the point of need*: consent always; setup is the one skill that checks ahead; the package-manager-then-user-folder route; other skills keep point-of-need. Point the `gh` scope sections and *Symbolic links in the agent folder* at setup's handling. Verify: the governing-rule quote still holds.
- [x] 2.2 In `wiki/stack/getting-started.md`, say setup may install free tools after asking, and replace "Nothing installs on your computer beyond the coding agent". Say the steps expand the README's three. Describe the GitHub step as a code and one approval, and drop the "approve everything" warning. Add the GitHub account and install approvals to *Honest list*. Verify: no line says nothing is installed.
- [x] 2.3 In `wiki/stack/cloudflare-credentials.md`, change "two checkboxes" to two permission rows.
- [x] 2.4 In `README.md`, make step 3 name a free GitHub account and say setup installs any missing free tools after asking. Make *Requirements* say setup installs `git`, `gh`, Node.js, and OpenSpec when they are missing, and replace the Windows "before you clone" line with setup's check. Verify: the install-onboarding requirements still hold (one prompt, a no-terminal app named).

## 3. Release

- [x] 3.1 Bump `VERSION` 25.9.0 → 25.10.0 and add a newest-first `CHANGELOG.md` entry with an **Updating** line: nothing to do in an installed repo; new installs get the tool check.
- [x] 3.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, `node scripts/check-retired-names.mjs`, and `openspec validate setup-installs-its-tools --strict --no-interactive`. Check links from `wong-setup/` into other skills by hand, since the link checker skips it. Verify: all pass.
- [x] 3.3 CI passes on the pull request, checked by `/save`.
