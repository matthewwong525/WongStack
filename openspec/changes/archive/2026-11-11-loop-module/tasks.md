# Tasks

## 1. Move the folders

- [x] 1.1 Make `.agents/plugins/loop/` with both `plugin.json` files at 1.0.0; move each of `.agents/skills/{explore,plan,apply,save,ship,verify,continue,close}/` to its `skills/<name>/`; make each `.agents/skills/<name>` a link to it (design §1)
- [x] 1.2 Move the WongStack-only scripts to `.agents/loop/`: `step-title.mjs`, `ask-check.mjs`, `other-work.mjs`, `helper-stop-check.mjs`, the company-git and Artifacts route scripts, the preview guards, and the staging scripts; repoint `.agents/settings.json`, `.agents/hooks.json`, and every caller; list each old path in `scripts/retired-names.json`
- [x] 1.3 Replace folder-depth root finding with `git rev-parse --show-toplevel` or a walk up to `.git` in every moved script
- [x] 1.4 Point every Markdown link at the real `.agents/plugins/loop/skills/…` path; update `.agents/memory/areas.json` for the moved paths and add a `loop-module` area for the new spec
- [x] 1.5 Add the module's and the eight commands' `mapped` entries to `payload-files.json` and the payload manifest; teach the sync and `check-payload-links.mjs` that a nested mapped entry wins over its parent's; move `wong-setup`'s `seed/openspec-config.yaml` into the module's `references/` and point `wong-setup` at it

## 2. Slots and own helpers

- [x] 2.1 Write `loop/scripts/slot.mjs` (load `.agents/loop/profile.mjs` if present; run the part; print `SLOT=<name> empty` on a missing part) and `.agents/loop/profile.mjs` filling every slot from today's code (design §2)
- [x] 2.2 In each `SKILL.md` and reference, replace the WongStack command lines (step title, other work, workspace, schedule, close) with `slot.mjs` lines; make each memory step conditional on `.claude/skills/memory/` existing
- [x] 2.3 `build-review.mjs` gets its link through `reviewLink`; `/apply` and `checkpoint.mjs` get the pre-check, guards, and preview through their slots; `/verify` and `ship.mjs` get `verify`, `liveLook`, and `keys` through theirs
- [x] 2.4 Add `loop/scripts/lib/` copies of `cli.mjs`, `primary-root.mjs`, the env helpers, and the key scan; point the module's scripts at them; extend `cli-conventions.test.mjs` to fail when a copy differs from memory's
- [x] 2.5 Tests: `slot.mjs` with no profile, a profile missing a part, and a full one; `build-review.mjs --link` with an empty `reviewLink` prints the local file and the in-chat line; the moved WongStack script tests pass at their new paths

## 3. Saving and publishing without GitHub

- [x] 3.1 `delivery-route.mjs`: add `local` (no `gh`, or an origin that is not GitHub) and `route()`/`routeRun()` for routes the module doesn't own (design §3)
- [x] 3.2 `checkpoint.mjs` on `local`: commit, run `precheck`, print `SAVE_GATE_RESULT=LOCAL`; no push
- [x] 3.3 `ship.mjs` on `local`: archive, run `precheck`, squash-merge into the default branch, ask before any push; stop on a failing `precheck`
- [x] 3.4 Tests: route choice with and without `gh` and a GitHub origin; `local` save commits; `local` ship merges after a pass and stops on a fail

## 4. Setup, README, and the guide

- [x] 4.1 Write the module's `README.md` (paste-in install and update messages first, what you get, what it needs) and `references/setup.md` with its `## Update` section (design §5)
- [x] 4.2 Update `wiki/maintaining/adding-a-module.md`: a command that must keep its own name sits in the module's `skills/` and installs as its own skill folder beside the module's, which is then not linked in the source; link the loop module as its example
- [x] 4.3 Update `wiki/development/the-change-loop.md`, `wiki/development/staging-walkthrough.md`, and `wiki/review-pages.md` where they name the moved paths or say the loop needs WongStack

## 5. Checks

- [x] 5.1 `module-install.test.mjs` installs each module alone by its `mapped` entries and runs its check: the loop with a `precheck`-only profile builds a sample page with the local-file link and saves a commit on `local`; fails on an import from outside the module's folders
- [x] 5.2 Add the `## Next (minor) — The build loop is a module any project can add` entry to `CHANGELOG.md`
- [x] 5.3 Run `node .github/scripts/checks.mjs --worktree` (payload links, OpenSpec config, retired names, module versions, `measure-context.mjs --check` with offsetting cuts, script tests)
- [x] 5.4 In a scratch empty repo with no remote, follow the module's `references/setup.md` from the branch's files: confirm the eight commands load under their names in Claude Code and Codex, the `loop` folder loads with no warning and no `/loop:` command, OpenSpec installs after a yes, the sample page opens as a local file, and a change goes from `/plan` to merged with nothing pushed
