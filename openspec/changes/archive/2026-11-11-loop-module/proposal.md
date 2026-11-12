# The whole build loop becomes a module any project can add

**Status:** ready-to-ship
**Branch:** wongstack-module-ideas
**Open questions:** none

## Why

Today, the steps that take an idea to a published change work only inside a full WongStack project: think it through, plan, build, save, publish, check, pick up, and close. They lean on WongStack's chat names, its app, its private links, its Cloudflare previews and staging site, and its release numbers. A project that wants only this way of working must take all of WongStack. Memory is now a module any project can add with one pasted message. The build loop is next, and it follows the same guide.

## What Changes

- **Any project can add the whole loop with one pasted message.** The person pastes the message into any AI tool. The AI copies the eight commands in, fills what the project is missing, and makes a sample plan page to prove it works. It asks before each step that costs money or makes something public.
  ```text
  "Add WongStack's build loop to this project.
   Follow the setup guide at <link>"

   → /explore /plan /apply /save
     /ship /verify /continue /close
   → a sample plan page opens
  ```

- **It is one module folder, like memory, and every command keeps its name.** In WongStack's own repo the loop is one plugin folder with its version, guide, and the eight commands inside. In a project, the module's own files go in one skill folder, and each command gets its own skill folder beside it, so `/plan` stays `/plan`, not `/loop:plan`. WongStack projects see no change.
  ```text
  WongStack's repo          a project
  plugins/loop/             skills/
    plugin files, guide ──▶   loop/   (plugin files, guide)
    skills/
      explore/  plan/   ──▶   explore/  plan/
      apply/    save/   ──▶   apply/    save/
      ship/   verify/   ──▶   ship/   verify/
      continue/ close/  ──▶   continue/ close/
  ```

- **It works alone, and does more where the project has more.** Each part that differs by project comes through one named slot. An empty slot turns off only that part, and the step still does its job.
  | Part | Alone | In WongStack |
  |---|---|---|
  | Review page | Opens as a file on this computer; you reply in the chat | Private link with OK, notes, and Build buttons |
  | Saving | A commit; a pull request when the project is on GitHub | As today, company git included |
  | Checks before saving | The project's own tests | WongStack's checks |
  | Preview | None, unless the project has one | Cloudflare preview |
  | Checking the result | The project's own checks on GitHub | A walk through the staging site with a browser |
  | Publishing | Merge, after a yes before any push | Release number, merge, deploy |
  | Chat names, other work, new chats, closing a workspace, schedules | Off | As today |
  | Memory | Used when the memory module is there | Used |

- **A project with no GitHub still saves and publishes.** `/save` makes a commit on its own branch. `/ship` merges it into the main branch once the project's tests pass. Nothing is pushed anywhere without a yes.
  ```mermaid
  flowchart TD
    S["/save"] -->|GitHub| PR[pull request]
    S -->|no GitHub| C[commit on a branch]
    PR --> SH["/ship"]
    C --> SH
    SH --> M[merged into main]
  ```

- **Setup fills the gaps.** It installs OpenSpec, the free tool that holds each plan as files, and makes the plans folder. It finds the project's test command. It writes the project's own settings file, which stays outside the module so an update never touches it.
  ```mermaid
  flowchart TD
    A[Pasted message] --> B{WongStack project?}
    B -->|yes| X[Stop: it is already there]
    B -->|no| C[Copy the eight commands in]
    C --> D{OpenSpec there?}
    D -->|no| E[Ask, then install it]
    D -->|yes| F[Find the test command]
    E --> F
    F --> G[Write the settings file]
    G --> H[Build a sample plan page]
    H --> I[Ask, then save the work]
  ```

- **WongStack's own parts move out, and work the same.** Chat names, the check for other work, company git, Cloudflare previews and staging, and the reminders to ask with question cards are WongStack's, not the loop's. They move to WongStack's own folder, as memory's extras did. Every WongStack command and check runs as it does today.
  ```text
  stays in WongStack           goes in the module
  chat names, other work       the eight commands
  company git, Cloudflare      review page builder
  staging walk, preview        commit, PR, merge
  question-card reminders      how to ask, plain words
  helper report check          plans, tasks, tests
  ```

- **Updates keep your edits.** A full WongStack project gets the module with each update, as today. A project with only the loop pastes the update message. Your own edits stay, and when an edit and an update touch the same lines, it stops and names each file.
  ```text
  "Update WongStack's build loop in this project.
   Follow the update steps at <link>"
  ```

- **The module guide learns one rule.** Every module stays one plugin folder with one version. A command that must keep its own name sits in the module's `skills/` folder and installs as its own skill folder, beside the module's. The loop is the first module that does this. The install test that adds each module alone to an empty project covers it too.
  ```text
  memory   skills/memory/   /memory, /memory:dream-memory
  loop     skills/loop/     no command of its own
           skills/plan/     /plan, and the seven others
  ```

## What the build needs

- **Nothing.**

Non-goals: support for code hosts other than GitHub beyond local commits and merges; the Cloudflare staging walk outside WongStack; the question-card and helper-report reminders as module hooks; any change to how a review page looks or how WongStack's own loop behaves.

## Capabilities

### New Capabilities

- `loop-module`: the eight loop commands and the review page builder as one module any repo adds alone by a pasted message: its skill folders, its slots and what each does when empty, saving and publishing with and without GitHub, its setup (OpenSpec, test command, profile, sample page check), and its update.

### Modified Capabilities

None. WongStack's own loop behavior (`change-loop`, `asking-the-user`, `review-pages`, `other-work-check`, `delivery-gate`, `staging-walkthrough`) keeps every requirement; only where the code lives changes.

## Impact

- **Module (source):** `.agents/plugins/loop/` holds `.claude-plugin/plugin.json`, `.codex-plugin/plugin.json`, `README.md`, `references/setup.md`, `scripts/slot.mjs`, and `scripts/lib/` copies of the memory helpers it uses. `.agents/skills/{explore,plan,apply,save,ship,verify,continue,close}/` move to its `skills/<name>/`, and each `.agents/skills/<name>` becomes a link.
- **WongStack's loop extras:** `.agents/loop/` gains `profile.mjs` and the WongStack-only scripts moved out of the module: `step-title.mjs`, `ask-check.mjs`, `other-work.mjs`, `helper-stop-check.mjs`, the company-git and Artifacts route scripts, the Cloudflare preview and staging scripts, and `own-site.mjs`. `.agents/settings.json`, `.agents/hooks.json`, and every caller are repointed.
- **Payload:** `payload-files.json` maps the module folder, minus `skills/`, to `.claude/skills/loop/` and each command to `.claude/skills/<name>/`; the sync learns that a nested mapped entry wins over its parent's, plus the payload manifest, `scripts/retired-names.json`, and `.agents/memory/areas.json`. The OpenSpec seed config moves from `wong-setup` into the module.
- **Checks:** `scripts/tests/module-install.test.mjs` installs the loop alone and runs its check; the save, ship, verify, and step-title tests follow the moves.
- **Docs:** `wiki/maintaining/adding-a-module.md`, `wiki/development/the-change-loop.md`, `wiki/development/staging-walkthrough.md`, `wiki/review-pages.md`, and `CHANGELOG.md` (minor).

## Decision log

- **2026-11-11** — Asked which module to plan after memory → chose the plan module: `/explore`, `/plan`, and review pages. Access, setup, and sync stay WongStack's core.
- **2026-11-11** — Asked how the module carries `/explore`, since Claude Code would name a second skill inside a plugin `/plan:explore` → chose separate skill folders, so every command keeps its name everywhere, and the module guide gains a rule: a module with no hooks may be several plain skill folders under one version.
- **2026-11-11** — Asked what setup does in a project with no OpenSpec → chose to install OpenSpec and make its plans folder, asking first, so plans have one shape everywhere.
- **2026-11-11** — Asked, after Matthew asked why `/apply`, `/ship`, and the rest were left out, how the module should cover them → chose the whole loop in this one plan: `/explore`, `/plan`, `/apply`, `/save`, `/ship`, `/verify`, `/continue`, and `/close`. This replaces the plan-only scope.
- **2026-11-11** — Assumed: the question-card hooks (`ask-check.mjs`) and the helper-report hook (`helper-stop-check.mjs`) stay WongStack's and are not module hooks, because they guard every chat and helper, not only the loop. The module then has no hooks and needs no plugin manifest. In a loop-only project, a helper that stops without its report is not sent back.
- **2026-11-11** — Assumed: everything that differs by project reaches WongStack through slots in `.agents/loop/profile.mjs`, read by one module script (`slot.mjs <name>`), because skill text can't import code. Memory is used only when its skill folder is present, with no slot, because it is another module.
- **2026-11-11** — Assumed: with no GitHub (no `gh`, or an origin that is not GitHub), `/save` commits on the feature branch and `/ship` merges into the default branch locally after the project's tests pass, asking before any push, because the guide asks a module to work in a project with nothing else.
- **2026-11-11** — Assumed: GitHub pull requests stay in the module, and company git and the Artifacts route move to WongStack's extras, because GitHub is the common case outside WongStack and the other two need WongStack's app and Cloudflare.
- **2026-11-11** — Assumed: release numbering (`number-release.mjs`) stays in the module, because it already does nothing (`release=none`) when a branch has no `## Next` changelog entry.
- **2026-11-11** — Assumed: the module keeps its own copies of the memory helpers it uses (`cli.mjs`, `primary-root.mjs`, `parseEnv`, `loadEnv`, `repoContext`, the key scan), because the module guide bars imports from outside its folders; a test keeps each copy equal to memory's.
- **2026-11-11** — Assumed: the module's check builds a sample plan's review page with every slot empty and confirms it opens as a local file, then runs `/save`'s commit-only path in a scratch repo, because that proves the module runs alone with no app and no GitHub.
- **2026-11-11** — Assumed: core files that use the module (`/daily`, `hand-over`, `wong-setup`, `wong-sync`) keep calling `.claude/skills/<name>/…` by the same paths, because WongStack may reach into a module; only the reverse is barred.
- **2026-11-11** — Asked, in review notes on the module-guide change, whether the loop should drop the plugin folder → Matthew chose to keep it, for one shape across modules: the loop is one plugin folder with both `plugin.json` files and one version, and its commands sit in its `skills/` folder. This replaces the earlier rule that a module with no hooks may be plain skill folders and drops `module.json`.
- **2026-11-11** — Assumed: each command in `skills/` installs as its own `.claude/skills/<name>/`, and the rest of the module folder installs at `.claude/skills/loop/` with no `skills/` and no `SKILL.md`, because a plugin's nested skills would be named `/loop:<name>`. In the source, only the eight commands are linked into `.agents/skills/`, so a checkout loads no second copy. The module's shared scripts (`slot.mjs`, `lib/`) and guide live at its root.
- **2026-11-11** — Assumed: `app-untouched.sh` and `loosened-checks.mjs` stay in `.github/scripts/`, and the `guards` slot calls them, because CI runs them from there too.
- **2026-11-11** — Assumed: the walkthrough reference, `verify-receipts.mjs`, and `kept-promises.mjs` stay in the module, and only the staging scripts move, because they read CI evidence that any GitHub project has.
- **2026-11-11** — Assumed: `update-copy.mjs` and `worktree-secrets.mjs` move to `.agents/loop/` too, because only WongStack's session start and secrets use them.
- **2026-11-11** — Assumed: an install rewrites each module-relative import and each `.claude/plugins/<name>/…` repo path in a mapped folder's own files to its install path, because a command folder moves away from the module root. Markdown rewrites only after `--show-toplevel)/` or `node `, so a setup guide's source paths stay as written.
- **2026-11-11** — Assumed: the module's `scripts/lib/` holds `cli.mjs`, `primary-root.mjs`, `env.mjs` (`parseEnv`), and `origin.mjs` (`RouteError`, `originHost`), and no key-scan copy, because the module uses no other helper; `origin.mjs` sits apart from `delivery-route.mjs` so a profile can import it with no import cycle.
- **2026-11-11** — Assumed: the route is `local` only when the profile names no route, so WongStack's own route choice is unchanged.
- **2026-11-11** — Assumed: memory goes to 2.0.1 for its one link fix to the moved loop files, because a changed folder must raise its version.
- **2026-11-11** — Assumed: `checkpoint.mjs` and `ship.mjs` still know the `app` and `artifacts` save shapes by name; only those routes' scripts run through `routeRun`, because moving the shapes too would change WongStack's behavior.
- **2026-11-11** — Assumed: with no `keys` part, a save scans the process environment and the `.env` files, so a loop-only project still gets its key check.
- **2026-11-11** — Assumed: an `afterMerge` slot runs WongStack's secret promotion and closes its plan pages after a merge, because both are WongStack's.
- **2026-11-11** — Assumed: `newWorkspace` also serves `scratch`, the folder a new workspace's brief goes in, and `verify` also serves `journeys`, so one slot covers each step.
- **2026-11-11** — Assumed: `number-release.mjs` takes `--base`, so a local ship numbers the release against the local default branch.
- **2026-11-11** — Assumed: a local `/ship` merges in the checkout that holds the default branch, which must be clean, else switches this checkout to it; moving another change to its own branch still pushes, as before.
- **2026-11-11** — Assumed: the `--only` repair text still names `checks.mjs`, because it applies only to that output format.
- **2026-11-11** — Assumed: WongStack's `precheck` gives no command in a checkout with no `checks.mjs`, so an old checkout reports no pre-check.
- **2026-11-11** — Assumed: setup copies the files through `install-path.mjs` from the downloaded WongStack folder, so a project gets the same rewritten text a WongStack sync writes, and links each command into `.agents/skills/` for Codex; task 5.4 confirms that Codex loads them.
- **2026-11-11** — Check: `.github/workflows/deploy.yml` changes only a comment's path to `live-look.sh`, because the script moved to `.agents/loop/staging/`; no check is weaker.
- **2026-11-11** — Check: `.github/workflows/qmd-retrieval.yml` watches `/explore`'s real path, because the skill moved into the loop module; the same file still starts the check.
- **2026-11-11** — Check: `scripts/tests/.c8rc.json` adds the loop module and `.agents/loop/` to coverage, because the moved scripts left `.agents/skills/`; it measures more, not less.
- **2026-11-11** — Check: `.github/workflows/payload.yml` and `scripts/payload-checks.mjs` add `.agents/loop` and `.agents/plugins/loop/scripts` to the lint paths, because the moved scripts left `.agents/skills/*/scripts`; it lints more, not less.
- **2026-11-11** — Assumed: `/verify` names the loop's `slot.mjs` after `$(git rev-parse --show-toplevel)/`, the form the install rewrite already knows, so the rewrite stays as narrow as it is; the install test now fails on any `.claude/plugins/` path left in an installed file.
- **2026-11-11** — Assumed: `LOCAL` is a merge-ready save result: `/ship` skips `/verify` because a local save leaves no receipt, and `finish` reruns the pre-check before it merges. The words came back from repeated text: the receipt lines `/save` already returns, the change-and-branch rule `/save` already owns, and the `NEXT:` note the ship skill's top already gives.
- **2026-11-11** — Assumed: on the `local` route the preconditions check only `openspec`, so no one signs in to GitHub or makes a GitHub repository for a project that saves on this computer.
- **2026-11-11** — Assumed: `/save` skips its `git fetch origin main` on the `local` route, because a project with no remote has nothing to fetch and the fetch error would stop every save.
