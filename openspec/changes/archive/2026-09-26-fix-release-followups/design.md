## Context

`run.mjs` starts `claude -p --permission-mode dontAsk --allowedTools "Bash(node .claude/skills/memory/scripts/memory.mjs:*)"`. The runbook it builds tells the model to pass JSON on stdin with `put-facts --file - <<'EOF'`. The probe on 2026-09-26 (memory #157) found the limits of that grant:

- `Bash(prefix:*)` passes a single-line command and a heredoc of plain JSON. It denies a heredoc whose body holds `<`, `>`, `|`, or `$`. Real facts hold these often (`<name>`, `>=22`).
- A `Write(...)` rule does not let the Write tool write. An `Edit(//abs/path/**)` rule does, and a path outside the working directory also needs `--add-dir`.
- Any write under `.git/` is denied. That is why the 18.x `work/` folder under the state directory failed.

`/ship` Step 5 runs `git push origin --delete "$BRANCH"` after the retarget loop. The source repo now has `delete_branch_on_merge` on, so the push fails with "remote ref does not exist".

## Goals / Non-Goals

**Goals:** a capture run that succeeds under `dontAsk` on any fact text, with a grant no wider than one folder; a clean `/ship` report when GitHub deleted the branch.

**Non-Goals:** changing how an interactive session sends JSON, the store, or the `gate` and `put-facts` input format. `--file <path>` already exists; only the runbook's use of it changes.

## Decisions

### One temp folder per run, outside the repo

`main()` in `run.mjs` makes the folder with `realpathSync(mkdtempSync(join(tmpdir(), 'wong-memory-')))` and removes it with `rmSync(dir, { recursive: true, force: true })` in the existing `finally`. A small exported helper, `withInputDir(fn)`, owns create and remove, so a test can prove removal after a throw.

- `realpathSync`, because on macOS `tmpdir()` is under `/var`, a symlink to `/private/var`, and the permission check matches the resolved path.
- Not under `.git/`: always denied. Not in the worktree: it would show in `git status` and could reach a commit.
- Alternative rejected: keep stdin and escape the JSON. The model writes the heredoc, and no escape rule is reliable for it. A file path makes the command one line with no JSON in it.

### The grant

`agentCommand(agent, prompt, stateDir, inputDir)` returns, for Claude:

```
--permission-mode dontAsk
--allowedTools "Bash(node .claude/skills/memory/scripts/memory.mjs:*)" "Edit(/<inputDir>/**)"
--add-dir <inputDir>
```

`inputDir` is absolute, so `/` + `/tmp/wong-memory-x` gives the `//tmp/wong-memory-x/**` form that means an absolute path. For Codex, `writable_roots` lists `stateDir` and `inputDir`.

### The runbook

`runbook(exclude, inputDir)` replaces the stdin line with: write each JSON input with your file-writing tool as a new file in `<inputDir>`, then pass its path, for example `node .claude/skills/memory/scripts/memory.mjs put-facts --file <inputDir>/put-1.json`. Write no file anywhere else, and never use a heredoc, pipe, or redirect. The `## Background run` section of `memory/SKILL.md` changes "send each JSON input on stdin with `--file -`" to "write each JSON input to the input folder your instructions name, and pass `--file <path>`". Its steps name `gate --file <input>` and `put-facts --file <input>`.

The runbook also embeds `## Write`, whose example was a heredoc. `## Write` shows the JSON in a `json` block, says `<input>` is a path or `-`, and keeps the heredoc in one **From a session** paragraph. `runbook()` drops that paragraph, so interactive sessions keep the heredoc and the background prompt never sees one.

`memory.mjs spool` prints `put-facts --file - --spooled <file>` as its hint. That changes to `put-facts --file <input> --spooled <file>`, which reads correctly for both paths, since `-` is still a valid `<input>`.

### The test

The existing runbook test in `scripts/tests/memory-capture.test.mjs` changes to:

- grants equal `[Bash(<SCRIPT>:*), Edit(/<dir>/**)]`, and `--add-dir <dir>` is present;
- the prompt holds no `<<`;
- every `gate` or `put-facts` command with `--file` reads a path under `<dir>`;
- every sentence that tells the model to write a file names `<dir>`, or starts with "never".

A second test calls `withInputDir` with a function that throws, and asserts the folder is gone.

### `/ship` delete

```bash
git ls-remote --exit-code --heads origin "$BRANCH" >/dev/null; rc=$?
case $rc in
  0) git push origin --delete "$BRANCH" || exit 1 ;;
  2) echo "branch already deleted at merge" ;;
  *) exit 1 ;;
esac
```

`--exit-code` returns 2 when no ref matches, so a network or auth failure stays distinct and still stops. Alternative rejected: run the push and ignore "remote ref does not exist". That parses an error string, and it hides the difference between gone and unreachable. The report line for the delete says "deleted" or "deleted at merge by GitHub".

The retarget loop stays before this check. When GitHub deleted the branch at merge, GitHub also retargets dependents itself; the loop then finds none, or retargets what is left, which is harmless.

### Dependabot

```yaml
    ignore:
      # Types follow the Node major in .nvmrc; move both together by hand.
      - dependency-name: "@types/node"
        update-types: ["version-update:semver-major"]
```

under the `npm` entry for `/app`.

## Risks / Trade-offs

- [A future Claude Code changes how `Edit(...)` or `--add-dir` works] → The task list includes one real `claude -p` pass with hostile characters, and its result goes in the Decision log. A later failure shows in the digest as a failed run with its reason.
- [The temp folder survives a killed run (`SIGKILL`, a machine restart)] → It holds only decisions already sent to the store, and the OS cleans `tmpdir()`. The `wong-memory-` prefix makes a leftover easy to find.
- [The model writes JSON but then pastes it in a heredoc anyway] → The command is denied and the run fails with a reason, as today. The runbook forbids it, and the test keeps `<<` out of the prompt.

## Migration Plan

None. Installs get the new `run.mjs` and runbook with `/wong-sync` to 19.0.2. The next session start runs capture with the new grant. Rollback is a revert.
