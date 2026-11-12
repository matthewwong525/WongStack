# Build loop

The build loop gives your AI assistant seven commands that take an idea to a published change: `/explore`, `/plan`, `/apply`, `/save`, `/ship`, `/verify`, and `/close`. Each plan is a set of [OpenSpec](https://github.com/Fission-AI/OpenSpec) files with a review page you open in a browser. It works in Claude Code and Codex, with or without GitHub.

## Add it to your project

Paste this message into a chat in your project, in any AI tool:

> Add WongStack's build loop to this project. Follow the setup guide at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/loop/references/setup.md

The AI copies the seven commands in, installs OpenSpec, finds your test command, writes the profile, builds a sample plan page, and saves the work. It asks you before each step that costs money or makes something public, and before it pushes.

A [WongStack](https://github.com/matthewwong525/WongStack) project already has the loop: it comes with each update. The guide stops there and changes nothing.

## Update it

Paste this message:

> Update WongStack's build loop in this project. Follow the update steps at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/loop/references/setup.md#update

It keeps your own edits to the loop's folders and never touches your profile. When one of your edits and a new change touch the same lines, it changes nothing and names each file.

## What you get

- **`/explore`** thinks an idea through with you and changes no file.
- **`/plan`** writes the plan and builds its review page.
- **`/apply`** builds the plan, with its tests, and runs your test command. To pick up saved work in a new chat, type `/apply <name>`, or `/apply` alone to choose from a list.
- **`/save`** makes a commit. On GitHub it also opens or updates the pull request and waits for its checks.
- **`/ship`** merges the change when the checks pass.
- **`/verify`** checks the result: your checks on GitHub, or your own check through the profile.
- **`/close`** keeps unfinished work and closes the chat's workspace.

## Without GitHub

When the project has no GitHub remote, or `gh` can not run, the loop uses the **local** route:

- `/save` commits on the change's branch and runs your test command. It pushes nothing.
- `/ship` runs your test command, then merges the branch into the main branch on this computer. A failed test stops the merge. It asks before any push.

## The profile

`.agents/loop/profile.mjs` is your project's side of the loop, outside the loop's folders, so an update never touches it. It default-exports **parts**, each optional. A part is a value, a command string, or a function that gets `{ root, args }`. When a part is missing, only its feature turns off, and the step still does its job.

| Part | What it does | When it is missing |
|---|---|---|
| `precheck` | The command `/apply`, `/save`, and `/ship` run before they go on | No local check; `/ship` merges on a yes |
| `reviewLink` | A link that opens the review page with reply buttons | The page opens as a file; you reply in the chat |
| `route` | The save route by name: `github`, `local`, or one `routeRun` runs | `github` with a GitHub remote and a working `gh`, else `local` |
| `routeRun` | Runs a save route the loop does not own | That route stops and says so |
| `guards` | More checks `/apply` runs before the preview | Skipped |
| `preview` | The command that publishes a preview and prints its address | No preview, and the report says why |
| `verify` | Your own check of the result | `/verify` uses the checks on GitHub only |
| `liveLook` | A look at the live site after a merge | Skipped |
| `afterMerge` | A step after `/ship` merges | Skipped |
| `keys` | The keys a save scans for, as name-value lists | The process environment and the `.env` files |
| `stepTitle` | Names the chat by its step | Nothing |
| `otherWork` | Finds other work on the same files | The check is skipped |
| `newWorkspace` | Opens a new workspace for a new task | The chat says to open one by hand |
| `closeWorkspace` | Closes this chat's workspace | The chat says you can close it |
| `schedule` | `true` to offer a schedule for work that comes back | Not offered |

A setup writes only `precheck`. [WongStack's profile](https://github.com/matthewwong525/WongStack/blob/main/.agents/loop/profile.mjs) fills every part, and is an example of each.

Skill text and scripts read a part through `scripts/slot.mjs`:

```bash
node .claude/skills/loop/scripts/slot.mjs <part> [args…]        # prints the value; SLOT=<part> empty when missing
node .claude/skills/loop/scripts/slot.mjs --run <part> [args…]  # runs a command part with the args
```

## What it needs

- **Node 20 or newer** and **git** on each computer.
- **OpenSpec**, the free tool that keeps each plan as files. Setup installs it after a yes.
- **This folder** at `.claude/skills/loop/`, and each command in `skills/` at `.claude/skills/<name>/`, as real folders. Claude Code loads them from there with no install step, and each command keeps its own name.
- **For Codex**, the same folders under `.agents/skills/`: setup links them.
- **For GitHub**, the [`gh`](https://cli.github.com/) command, signed in.

[How WongStack runs the loop](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/the-change-loop.md) explains each step in full.
