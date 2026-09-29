## Context

`/update-dependencies` is a source-only skill (outside `payload-files.json`); today its `SKILL.md` is a prose runbook the agent executes step by step. See proposal.md - Why. The surfaces it touches: `app/package.json` + lock, `scripts/tests/package.json` + lock (exact pins), the four OpenSpec pins (`.github/workflows/payload.yml`, `server/setup.sh`, `.agents/skills/save/references/preconditions.md`, `.github/CONTRIBUTING.md`), and the machine tools `openspec`, `agent-browser`, `gh`, `git`, `node`.

Constraints: Node built-ins only ([required tools](../../../wiki/development/required-tools.md)); nothing builds locally ([the gate](../../../wiki/development/the-change-loop.md#the-gate)); the startup route sits at 2199 of its 2200-word ceiling, so the skill's `description:` must not grow.

## Goals / Non-Goals

**Goals:** every mechanical step in one idempotent script with a plain, line-per-step log an agent can watch; `SKILL.md` shrinks to "run it, watch it, act on what it hands you".

**Non-Goals:** updating GitHub Actions SHAs (Dependabot owns them); closing Dependabot PRs; upgrading `gh`, `git`, or Node itself.

## Decisions

**One script, `scripts/update.mjs`, in stages.** Each stage prints `== <stage>` then one line per item (`<name> <from> -> <to> [major]`, `<name> current`), and ends `ok` or `FAIL <what> — <stderr tail>` with exit 1. Stages:

1. **survey**: installed (`--version`) and latest for `openspec`, `agent-browser` (`npm view <pkg> version`), `gh` (`gh api repos/cli/cli/releases/latest --jq .tag_name`), `node` (latest in the `.nvmrc` major, from `https://nodejs.org/dist/index.json`), `git` (installed only); `npm view <pkg> version` for each direct dependency in `app/` and `scripts/tests/`, eight at a time. Not `npm outdated`: without `node_modules` it lists only some packages, so it missed devDependencies in a fresh checkout.
2. **tools**: `npm install -g` the latest `@fission-ai/openspec` and `agent-browser` when behind. A permission error fails the stage with `needs you:` so the agent asks. `gh`, `git`, `node` behind → `needs you:` lines, never a failure.
3. **openspec-pins**: read the pin from `payload.yml`; if the latest differs, rewrite `@fission-ai/openspec@<v>` in all four files and the `OpenSpec <v>` prose in `CONTRIBUTING.md`, then confirm all four agree.
4. **app**: for each outdated package set the range to latest keeping its prefix (`^`, `~`), `@types/node` held to the latest in the `.nvmrc` major; then `npm install --no-audit --no-fund` to refresh the lock. Overrides untouched.
5. **test-tools**: same in `scripts/tests/`, with exact pins.
6. **contract**: when the OpenSpec CLI moved, run `node --test scripts/tests/openspec-contract.test.mjs` against the new CLI; it needs no installed packages.
7. **report**: a closing block: `status: current | updated | needs-agent`, the majors (each with its package's npm `repository` / changelog URL for the agent to read), `openspec: <from> -> <to>` when moved, and `needs you:` lines.

Why a script over prose: [most process improvements shouldn't use AI](../../../wiki/agent-knowledge-center.md#most-process-improvements-shouldnt-use-ai). Idempotence comes free: every stage compares against latest, so a rerun after a fix finds finished stages current.

`--dry-run` runs only survey and prints what each later stage would change, writing nothing. `--hold <package>` (repeatable) leaves a package at the range `package.json` names, so a major the agent restores stays restored on a rerun. Pure helpers (range bumping, major detection, pin rewriting, `.nvmrc` hold) are exported and tested; the CLI uses `scripts/lib-cli.mjs`'s `parseCli`/`isMain` like its neighbours.

**The watching agent is the one that ran the verb.** In Claude Code it starts the script in the background and waits on its output; any host can run it in the foreground and read the log. It acts on `FAIL` (fix, rerun), on majors (read the notes, migrate, or hold back one package at its old version and name it), on an OpenSpec move (check release notes against [the CLI contract](../../../.agents/skills/plan/references/openspec-cli.md), adapt the owning skill), then hands a nonempty diff to `/save` and fixes CI failures. Alternative considered: a separate helper agent watching the script — rejected, it would hand every fix back to the parent anyway.

## Risks / Trade-offs

- [A major breaks in a way CI catches only partly] → the report lists every major so the agent reads each one's notes; the spec already forbids claiming green CI proves a major safe.
- [`npm install -g` needs sudo on some machines] → the stage fails with `needs you:`; the agent asks per required tools.
- [Network calls (`npm view`, nodejs.org, GitHub) can flake] → a failed lookup fails the survey stage with the command named; a rerun retries.
- [Tests would hit the network] → tests put fake `npm`, `openspec`, `gh` shims on `PATH` and run against a temp fixture repo.
