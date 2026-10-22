# Tasks

## 1. The daily skill

- [x] 1.1 `.agents/skills/daily/references/chief.md`: add the *quick vs. big* rule beside *Brief before you start an agent*: what stays in the chat, what is handed off, *in doubt hand it off*, the one line `Handed to its own workspace: <title>`, and the *do it here* override; verify by reading it against the spec scenarios
- [x] 1.2 `.agents/skills/daily/SKILL.md`: turn the *Get someone to …* line into *a task past a quick reply* (with *get someone to* as the explicit form), linking the rule in `chief.md`; same `D open --step "task: <title>"` command
- [x] 1.3 `node scripts/measure-context.mjs --check` passes; trim offsetting words in the same two files if not

## 2. The wiki

- [x] 2.1 `wiki/development/daily.md#the-chief-of-staff`: say what the chief keeps and what it hands off on its own, and *do it here*; update the *Talk to it* list; keep every linked heading's text

## 3. Release

- [x] 3.1 `CHANGELOG.md`: a `## Next (minor) — The chief hands off big tasks by itself` entry with a plain **Updating.** note (nothing to do by hand)

## 4. Close a handed-off agent

- [x] 4.1 `.agents/skills/daily/scripts/daily.mjs`: add `close --agent <agent>`: only for an agent this `/daily` opened, never a chat handed in with `D hand` (`refused`); archives its workspace, or the agent when it has none, through Paseo; marks it closed so the watch prints nothing more for it; prints one JSON line (`closed`, `unknown`, `refused`, `unsupported`, `failed`); tests beside the script's existing tests (a closed agent's later stop prints nothing and gets no status line; an unknown or handed-in agent is refused; a step closed today opens again fresh)
- [x] 4.2 `chief.md` *Quick or big*: *do it here* right after a hand-off runs `D close --agent <agent>`, says `Moved here: <title>`, then does the task here; on `failed` or `unsupported`, say the workspace is still working and ask before doing it here. Drop the `D reply` Stop. `SKILL.md`'s command list names `D close`; the wiki line says the chief closes the workspace
- [x] 4.3 `CHANGELOG.md` entry mentions the close

## 5. Verification

- [x] 5.1 `node .github/scripts/checks.mjs --worktree` passes (payload links, OpenSpec config, context budget, retired names)
- [x] 5.2 `openspec validate chief-hands-off-big-tasks --strict --no-interactive` passes
