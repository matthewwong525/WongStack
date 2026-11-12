# Set up the browser

This guide adds the browser module, or [updates](#update) it. Ask the person before each step that downloads something large or makes something public: the browser download, a push.

The module needs Node 20 or newer, its three folders, and a git-ignored `.env`. Write no install list: look at the repo and fill each gap.

## 1. Stop in a WongStack install

When the repo has `.claude/.wong-stack.json`, stop and change nothing: the browser comes with each WongStack update.

## 2. Copy the three folders in

Copy the module's three folders from GitHub, as real folders, to `.claude/skills/`: Claude Code loads skills only from there. Skip a folder that is there.

```bash
for folder in browser hand-over shop; do
  mkdir -p ".claude/skills/$folder"
  curl -fsSL https://codeload.github.com/matthewwong525/WongStack/tar.gz/main \
    | tar -xz --strip-components=5 -C ".claude/skills/$folder" "WongStack-main/.agents/plugins/browser/$folder"
done
```

## 3. Keep keys private

The key link writes keys to `.env` at the repo's top. Run `git check-ignore -q .env`; when it fails, add `.env` to `.gitignore` and tell the person.

## 4. Leave the profile out

Write no profile: with none, each slot is empty and the module still works. Name the [slots](../README.md#slots) to the person, with what each does when empty, and [WongStack's profile](https://github.com/matthewwong525/WongStack/blob/main/.agents/browser/profile.mjs) as an example. Write `.agents/browser/profile.mjs` only when they ask for a slot. The profile imports nothing from the folders, and holds no key.

## 5. Run the check

Each of these exits 0:

```bash
node .claude/skills/browser/scripts/browse.mjs status
HOME=$(mktemp -d) node .claude/skills/hand-over/scripts/details.mjs list
node .claude/skills/hand-over/scripts/hand-over.mjs --help
```

Then ask the person; the browser download is large. On a yes:

```bash
node .claude/skills/browser/scripts/browse.mjs install
node .claude/skills/browser/scripts/browse.mjs open https://example.com
node .claude/skills/browser/scripts/browse.mjs snapshot
node .claude/skills/browser/scripts/browse.mjs close
```

The browser is ready when the snapshot shows the page's text.

## 6. Save

Commit the three folders and every file you added. Ask before any push.

## Update

1. **Stop in a WongStack install** (`.claude/.wong-stack.json`): the browser updates with [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md).
2. **Find the base:** the newest WongStack commit that set `browser/module.json`'s version.

   ```bash
   version=$(node -p "require('./.claude/skills/browser/module.json').version")
   ws=$(mktemp -d)/ws
   git clone -q --filter=blob:none --no-checkout https://github.com/matthewwong525/WongStack "$ws"
   manifest=.agents/plugins/browser/browser/module.json
   for c in $(git -C "$ws" log --format=%H main -- "$manifest"); do
     git -C "$ws" show "$c:$manifest" | grep -q "\"version\": \"$version\"" && { base=$c; break; }
   done
   ```

   No base: stop and say so.
3. **Merge in a temporary copy**, never in the repo. For each of the three folders, and each file under `.agents/plugins/browser/<folder>/` at `$base` and at `main`:
   - in both: `git merge-file -p <repo's file> <base> <main>`; a non-zero exit is a conflict;
   - only at `main`: add it;
   - only at the base: remove it, unless the repo changed it: a conflict.
4. **On any conflict, write nothing:** name each file and stop.
5. Else put the merged folders in place, [run the check](#5-run-the-check), commit, and ask before any push.

Part of [the browser module](../README.md).
