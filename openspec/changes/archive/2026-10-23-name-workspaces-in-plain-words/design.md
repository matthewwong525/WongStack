## Context

`workspace.mjs open` runs `paseo run --new-workspace` and then `paseo workspace rename <id> <title>`, because `paseo run --title` names only the agent. Two paths still leave a code-style name in Paseo's list:

- An agent that runs `paseo run --new-workspace … --new-branch <slug>` itself skips the rename, so the list shows the branch. ClaymooApp's `customer-brain-confidence` came this way (title `null` in `~/.paseo/projects/workspaces.json`).
- `/continue`'s pickup passes `--title '<change name>'`, which is a kebab-case slug.

## Goals / Non-Goals

**Goals:** every workspace `workspace.mjs` opens has a plain-words name; agents are told to open through it.

**Non-Goals:** renaming folders or branches; naming workspaces the person starts in Paseo, which Paseo already titles from the first message; a sweep that renames workspaces opened elsewhere.

## Decisions

- **`workspaceTitle(raw)` in `workspace.mjs`, run before anything opens.** It trims; when the title has no spaces and is made only of letters, digits, `-`, `_` and `.`, with at least one `-` or `_`, it splits on those, joins with spaces and capitalises the first letter (`customer-brain-confidence` → `Customer brain confidence`). Then, lowercased and with `-`/`_` read as spaces, a title in the placeholder set (`main`, `master`, `default`, `hello`, `hello world`, `test`, `testing`, `untitled`, `new workspace`, `workspace`, `scratch`, `temp`, `tmp`, `wip`) throws `PaseoError(EXIT.input, …)` asking for a few words that say what the work is. The converted title goes to both `paseo run --title` and the rename, so agent and workspace match.
  - Alternative: refuse slugs too. Rejected: `/daily`'s `open` treats a failed launch as *run it here*, so a refusal moves the task into the morning chat; conversion keeps it in its own workspace.
- **`/continue`'s pickup uses the plan's `#` title.** `new-workspace.md`'s pickup command passes `--title '<the plan's title>'`, read from the proposal's first `#` heading, falling back to the change name (converted by the script).
- **One way to open.** `new-workspace.md` says to open every workspace through `workspace.mjs`, never a raw `paseo run --new-workspace`, and says what a good title is: a few words naming the work, in the person's words. The change loop's *Several parts, several workspaces* gets one line with the reason.

## Risks / Trade-offs

- An agent that never reads these docs can still run `paseo run` itself → the doc rule is the only guard; a Paseo-side default would need a plugin, out of scope.
- A single-word title like `Billing` stays allowed → only the placeholder set is refused, since a short real name is fine.
