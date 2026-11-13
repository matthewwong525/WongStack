# Set up the browser

This guide adds the browser module, or [updates](#update) it. Ask the person before each step that downloads something large or makes something public: the browser download, a push.

The module needs Node 20 or newer, its one folder, and a git-ignored `.env`. Write no install list: look at the repo and fill each gap.

## 1. Stop in a WongStack install

When the repo has `.claude/.wong-stack.json`, stop and change nothing: the browser comes with each WongStack update.

## 2. Copy the folder in

Copy the module's folder from GitHub, as a real folder, to `.claude/skills/browser/`: Claude Code loads skills only from there. The private-link and Shop skills come inside it, in `skills/`. Skip this step when the folder is there.

```bash
if [ ! -e .claude/skills/browser/SKILL.md ]; then
  mkdir -p .claude/skills/browser
  curl -fsSL https://codeload.github.com/matthewwong525/WongStack/tar.gz/main \
    | tar -xz --strip-components=4 -C .claude/skills/browser WongStack-main/.agents/plugins/browser \
    || { rm -rf .claude/skills/browser; echo "Copy failed"; exit 1; }
fi
```

## 3. Keep keys private

The key link writes keys to `.env` at the repo's top. Run `git check-ignore -q .env`; when it fails, add `.env` to `.gitignore` and tell the person.

## 4. Leave the profile out

Write no profile: with none, each slot is empty and the module still works. Name the [slots](../README.md#slots) to the person, with what each does when empty, and [WongStack's profile](https://github.com/matthewwong525/WongStack/blob/main/.agents/browser/profile.mjs) as an example. Write `.agents/browser/profile.mjs` only when they ask for a slot. The profile imports nothing from the folder, and holds no key.

## 5. Link its commands

Link each command in `skills/` up to `.claude/skills/<command>`, so it loads by its own name in every chat: `/hand-over`, `/shop`. Replace a real folder there only when its `SKILL.md` is the same as the module's: that is a copy from an earlier setup. Else it is the project's own skill: skip that command, and tell the person the name is taken. Where a link fails, such as on Windows without links turned on, copy the folder instead. For Codex, also link the folder and each command into `.agents/skills/`, unless `.agents` and `.claude` are already the same folder.

```bash
linked=browser
for name in hand-over shop; do
  dir=".claude/skills/$name"
  if [ -e "$dir" ] && [ ! -L "$dir" ]; then
    cmp -s "$dir/SKILL.md" ".claude/skills/browser/skills/$name/SKILL.md" \
      || { echo "Skipped /$name: $dir is another skill"; continue; }
    rm -rf "$dir"
  fi
  [ -L "$dir" ] || ln -s "browser/skills/$name" "$dir" 2>/dev/null || cp -R ".claude/skills/browser/skills/$name" "$dir"
  linked="$linked $name"
done
if [ "$(cd .claude && pwd -P)" != "$(mkdir -p .agents && cd .agents && pwd -P)" ]; then
  mkdir -p .agents/skills
  for name in $linked; do t=".agents/skills/$name"; { [ -e "$t" ] && [ ! -L "$t" ] && echo "Skipped $t: it is another skill"; } || ln -sfn "../../.claude/skills/$name" "$t"; done
fi
```

## 6. Run the check

Each of these exits 0:

```bash
node .claude/skills/browser/scripts/browse.mjs status
HOME=$(mktemp -d) node .claude/skills/browser/skills/hand-over/scripts/details.mjs list
node .claude/skills/browser/skills/hand-over/scripts/hand-over.mjs --help
```

Then ask the person; the browser download is large. On a yes:

```bash
node .claude/skills/browser/scripts/browse.mjs install
node .claude/skills/browser/scripts/browse.mjs open https://example.com
node .claude/skills/browser/scripts/browse.mjs snapshot
node .claude/skills/browser/scripts/browse.mjs close
```

The browser is ready when the snapshot shows the page's text.

## 7. Save

Commit the folder and every file you added. Ask before any push.

## Update

1. **Stop in a WongStack install** (`.claude/.wong-stack.json`): the browser updates with [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md).
2. **Find the base:** the newest WongStack commit that set the repo's recorded version. From 3.0.0 the version is in the folder's `VERSION` file; from 2.0.0 it was in its `.claude-plugin/plugin.json`; below 2.0.0 it was in `browser/module.json`, and the module was three folders.

   ```bash
   dir=.claude/skills/browser
   if [ -f "$dir/VERSION" ]; then version=$(cat "$dir/VERSION"); file=.agents/plugins/browser/VERSION
   elif [ -f "$dir/.claude-plugin/plugin.json" ]; then
     version=$(node -p "require('./$dir/.claude-plugin/plugin.json').version"); file=.agents/plugins/browser/.claude-plugin/plugin.json
   else
     version=$(node -p "require('./$dir/module.json').version"); file=.agents/plugins/browser/browser/module.json
   fi
   ws=$(mktemp -d)/ws
   git clone -q --filter=blob:none --no-checkout https://github.com/matthewwong525/WongStack "$ws"
   for c in $(git -C "$ws" log --format=%H main -- "$file"); do
     git -C "$ws" show "$c:$file" | grep -qE "(^|\")$version(\"|$)" && { base=$c; break; }
   done
   ```

   No base: stop and say so.
3. **From below 2.0.0, move the old paths once.** Read each base file and each repo file at its new path in the one folder:

   | At the base | In the repo | New path in the folder |
   | --- | --- | --- |
   | `.agents/plugins/browser/browser/X` | `.claude/skills/browser/X` | `X` |
   | `.agents/plugins/browser/hand-over/X` | `.claude/skills/hand-over/X` | `skills/hand-over/X` |
   | `.agents/plugins/browser/shop/X` | `.claude/skills/shop/X` | `skills/shop/X` |

   Also copy each repo file in an old folder with no base file to its new path: the project added it.

   From 2.0.0, each file `.agents/plugins/browser/X` at the base is the repo's `.claude/skills/browser/X`.
4. **Merge in a temporary copy**, never in the repo. For each file at its new path, at the base and at `main` (`.agents/plugins/browser/X`):
   - in both: `git merge-file -p <repo's file> <base> <main>`; a non-zero exit is a conflict;
   - only at `main`: add it;
   - only at the base: remove it, unless the repo changed it: a conflict.
5. **On any conflict, write nothing:** name each file and stop.
6. Else put the merged folder in place at `.claude/skills/browser/`. From a copy with a `.claude-plugin/` folder, which the merge removed, delete the `enabledPlugins` key `browser@skills-dir` from `.claude/settings.json` and `.claude/settings.local.json`. [Link its commands](#5-link-its-commands) again, [run the check](#6-run-the-check), commit, and ask before any push.

Part of [the browser module](../README.md).
