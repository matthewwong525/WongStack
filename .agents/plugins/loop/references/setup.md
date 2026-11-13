# Set up the build loop

This guide adds the build loop, or [updates](#update) it. Ask the person before each step that costs money or makes something public, and before any push.

The loop needs Node 20 or newer, git, OpenSpec, its folders, and a profile with the project's test command. Write no install list: look at the repo and fill each gap.

## 1. Stop in a WongStack install

When the repo has `.claude/.wong-stack.json`, stop and change nothing: the loop comes with each WongStack update.

## 2. Copy the folders in

Get WongStack's `.agents/` folder from GitHub into a temporary folder. Its install script gives each file the text an install uses: it repoints the imports between the loop's folders.

```bash
ws=$(mktemp -d); src="$ws/WongStack-main"
curl -fsSL https://codeload.github.com/matthewwong525/WongStack/tar.gz/main | tar -xz -C "$ws" WongStack-main/.agents
```

When `.claude/skills/<name>/` is already there for a command and it is not the loop's, stop and name it. Else copy each file as a real file: the commands in `skills/` go to `.claude/skills/<name>/`, and the rest goes to `.claude/skills/loop/`.

```bash
(cd "$src" && find .agents/plugins/loop -type f) | while read -r f; do
  rel=${f#.agents/plugins/loop/}
  case $rel in skills/*) to=.claude/skills/${rel#skills/} ;; *) to=.claude/skills/loop/$rel ;; esac
  mkdir -p "$(dirname "$to")"
  node "$src/.agents/skills/wong-sync/scripts/install-path.mjs" --source "$src" "$f" > "$to"
  [ -x "$src/$f" ] && chmod +x "$to"
done
```

For Codex, link each command into `.agents/skills/`, unless `.agents` and `.claude` are already the same folder:

```bash
mkdir -p .agents/skills
for name in explore plan apply save ship verify close; do t=".agents/skills/$name"; { [ -e "$t" ] && [ ! -L "$t" ] && echo "Skipped $t: it is another skill"; } || ln -sfn "../../.claude/skills/$name" "$t"; done
```

## 3. OpenSpec

1. When `openspec --version` fails, ask, then install it by the command in [the save checks](../skills/save/references/preconditions.md).
2. When the repo has no `openspec/`, run `openspec init --tools none`.
3. When the repo has no `openspec/config.yaml`, copy [`openspec-config.yaml`](openspec-config.yaml) there.

## 4. Write the profile

Find the project's test command: `package.json`'s `test` script, a `Makefile` `test` target, `pytest`, `cargo test`, or what the README says. Ask the person to confirm it.

Write `.agents/loop/profile.mjs`, outside the loop's folders, so an update never touches it. Give it only `precheck`:

```js
export default {
  precheck: 'npm test',   // runs from the repo's top before a save and a merge
};
```

Each other part stays empty. [The loop's README](../README.md#the-profile) names each part and what turns off without it.

## 5. Run the check

1. **The review page:** make a temporary folder with a `proposal.md` that has a `# Title`, a `## Why`, and a `## What Changes` with one bullet. Run `node .claude/skills/plan/scripts/build-review.mjs <folder> --require-current --link`. The link it prints must be the folder's `review.html` file. Show the person the page.
2. **The save:** in a scratch repo (`git init` in a temporary folder, one commit, then a branch with one staged line), write a one-line message file and a summary file, then run `node <this repo>/.claude/skills/save/scripts/checkpoint.mjs --message-file <message> --summary-file <summary>` from it. It must print `SAVE_GATE_RESULT=LOCAL`, and the branch must have the commit.

The loop is ready only when both pass. Delete the temporary folders.

## 6. Save

Commit the folders and every file you added. Ask before any push.

## Update

1. **Stop in a WongStack install** (`.claude/.wong-stack.json`): the loop updates with [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md).
2. **Find the base:** the newest WongStack commit that set the loop's version: its `VERSION` file, or, in a copy from before that file, its `.claude-plugin/plugin.json`.

   ```bash
   dir=.claude/skills/loop
   if [ -f "$dir/VERSION" ]; then version=$(cat "$dir/VERSION"); file=.agents/plugins/loop/VERSION
   else version=$(node -p "require('./$dir/.claude-plugin/plugin.json').version"); file=.agents/plugins/loop/.claude-plugin/plugin.json
   fi
   ws=$(mktemp -d)/ws
   git clone -q --filter=blob:none https://github.com/matthewwong525/WongStack "$ws"
   for c in $(git -C "$ws" log --format=%H main -- "$file"); do
     git -C "$ws" show "$c:$file" | grep -qE "(^|\")$version(\"|$)" && { base=$c; break; }
   done
   ```

   No base: stop and say so.
3. **Make both versions as an install has them**, each in its own temporary folder: run [step 2](#2-copy-the-folders-in)'s copy with `src` set to `git -C "$ws" worktree add <folder> $base`, then again for `main`.
4. **Merge in a temporary copy**, never in the repo. For each file of the loop's folders at the base and at `main`:
   - in both: `git merge-file -p <repo's file> <base> <main>`; a non-zero exit is a conflict;
   - only at `main`: add it;
   - only at the base: remove it, unless the repo changed it: a conflict.
5. **On any conflict, write nothing:** name each file and stop.
6. Else put the merged files in place, remove each `.agents/skills/` command link whose target is now gone, [run the check](#5-run-the-check), commit, and ask before any push. Never touch `.agents/loop/`.
