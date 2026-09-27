# Paseo starts with your settings in every install

**Status:** ready-to-ship
**Branch:** explore-paseo-defaults
**Open questions:** none

## Why

When someone installs WongStack and opens it in Paseo, they get none of your Paseo setup. A new workspace opens without its secrets, Paseo names workspaces, branches, and commits its own way, and your four agent presets are missing. You want every install to start the way you work.

## What Changes

- **Every install's new workspaces open ready to work.** Today only this repo copies its secrets into a new workspace. Installs never got that step. Now every install gets it, and an update keeps any steps a repo already added.
- **Paseo names things the way WongStack does.** Workspace titles are a few plain words. Branch names are short topic names. Commit messages and pull requests use the same form `/save` and `/ship` already use, with the Claude sign-off.
- **Setup adds your agent presets to Paseo.** New installs get the four starting choices you use now: *Explore / Plan* and *Apply / Ship*, for Claude and for Codex, each with full permissions and high thinking. Setup only adds the ones missing, never changes one a person already has, and skips Codex presets when Codex isn't installed. The server installer does the same.
  ```text
  install WongStack
        │
        ▼
  Paseo installed? ── no ──▶ skip, say so
        │ yes
        ▼
  for each preset:
    already there? ── yes ─▶ keep theirs
        │ no
        ▼
    its agent installed? ─ no ─▶ skip
        │ yes
        ▼
      add it
        │
        ▼
  Paseo reloads ──▶ presets show up
  ```
- **The wiki says what WongStack sets in Paseo and what it leaves alone.** New workspaces already start from `main`, and "new worktree or local" is a choice the Paseo app remembers on its own. Neither needs a setting.

Non-goals: no package install when a workspace opens; no change to where workspaces branch from; workspaces never close themselves right after a merge; the agent browser stays off; presets are not re-added at every session start.

## Capabilities

### New Capabilities

- `paseo-defaults`: the committed `paseo.json` every install gets (worktree setup and naming instructions), its merge on sync, and the add-missing agent presets setup and the server installer write to the machine's Paseo config.

### Modified Capabilities

None.

## Impact

- `paseo.json`: adds `metadataGeneration` instructions for `title`, `branchName`, `commitMessage`, and `pullRequest`; keeps `worktree.setup`.
- `.agents/skills/wong-sync/references/payload-files.json` and `payload-manifest.md`: `paseo.json` joins core, with a merge rule for a target's own file.
- New `.agents/skills/routine/scripts/presets.mjs` and `paseo-presets.json`, sharing `lib/paseo.mjs`; `/routine`'s `SKILL.md` names it.
- `.agents/skills/wong-setup/SKILL.md` and `server/install-wongstack.mjs` (+ `server/README.md`) run it.
- `wiki/development/required-tools.md`: what WongStack sets in Paseo.
- Tests: `scripts/tests/presets.test.mjs`, plus payload and server-install coverage.
- `CHANGELOG.md`: a `## Next (minor)` entry.

## Decision log

- **2026-09-27** — Asked whether setup should add the agent presets, document them, or skip machine settings → chose setup adds them, add-missing only.
- **2026-09-27** — Asked whether a new workspace should also install the app's packages → chose no, it only copies secrets.
- **2026-09-27** — Asked whether `paseo.json` should carry naming rules → chose yes, matching `/save` and `/ship`.
- **2026-09-27** — Assumed: new workspaces keep branching from the repo's default branch, because Paseo 0.9.2 already uses `origin/HEAD` (here `main`) and the new-workspace isolation choice lives only in the Paseo app.
- **2026-09-27** — Assumed: `autoArchiveAfterMerge` stays off, because `tidy.mjs` already closes saved workspaces idle 3+ days, and closing at merge would cut off the chat that just shipped.
- **2026-09-27** — Assumed: a preset counts as present when a profile with its id or its name exists, because Paseo's own profiles get random ids and a person may have made the same preset by hand.
- **2026-09-27** — Assumed: a preset is added only when its agent's command (`claude` or `codex`) is on the path, because a preset for a missing agent can not start.
- **2026-09-27** — Assumed: the script writes only an existing `config.json` and then runs `paseo reload`, because Paseo creates that file on first start and a half-made config could stop the daemon.
- **2026-09-27** — Assumed: presets are not re-added at session start, because a preset someone deleted on purpose would keep coming back; a teammate on a new computer asks for them, as the wiki says.
- **2026-09-27** — Assumed: the preset script lives with `/routine`, because that skill already owns WongStack's Paseo glue and ships to every install.
- **2026-09-27** — Assumed: commit and pull request titles carry no version number, because `merge.sh` adds it at publish time.
- **2026-09-27** — Assumed: the build also lists `paseo.json` in `.agents/rules/payload.md`'s paths, because `payload-rule-paths.test.mjs` requires every payload file there; the server installer adds presets as its last step, after the push, so an early stop's error line stays first and a rerun still adds them; `PRESETS_PASEO_BIN` overrides the `paseo` binary for tests, like `WORKSPACE_PASEO_BIN`. Tasks 1.1–4.2 landed; saving for the CI gate (5.1).
- **2026-09-27** — Task 5.2 ran before merge, because the script is the same either side of it: a dry run on this machine kept all four presets by name and left `config.json` unchanged. Distilled into `wiki/development/required-tools.md`: Paseo's settings live in the repo's `paseo.json` and each computer's `~/.paseo/config.json`.
- **2026-09-27** — Archive checkpoint: archived as `openspec/changes/archive/2026-09-27-ship-paseo-defaults`, numbered 26.15.0, saved for the final CI gate before merge.
