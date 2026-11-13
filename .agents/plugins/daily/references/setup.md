# Set up Daily

This guide adds Daily, or [updates](#update) it. Ask the person before a step that costs money or makes something public. Daily needs Node 20 or newer; look at the repo and fill each gap.

## 1. Stop in a WongStack install

With `.claude/.wong-stack.json`, stop and change nothing: Daily comes with each WongStack update.

## 2. Copy the folder in

Copy the folder, as a real folder, to `.claude/skills/daily/`, where Claude Code loads skills. The schedule command comes inside it, in `skills/schedule/`. Skip this step when the folder is there.

```bash
if [ ! -e .claude/skills/daily/SKILL.md ]; then
  mkdir -p .claude/skills/daily
  curl -fsSL https://codeload.github.com/matthewwong525/WongStack/tar.gz/main \
    | tar -xz --strip-components=4 -C .claude/skills/daily WongStack-main/.agents/plugins/daily \
    || { rm -rf .claude/skills/daily; echo "Copy failed"; exit 1; }
fi
```

## 3. Write the settings file

Write `.agents/daily/<person>.json` from [the example](example.json): `person` from the git email's name, in lowercase letters, digits and `-` only (`Sam.Lee@…` → `sam-lee`), `emails` from `git config user.email`, this computer's `timezone`, and `sources` as `{}`. Drop `guide`, or write the file it names.

## 4. Fill the profile from what the repo has

Write `.agents/daily/profile.mjs` only for the parts the repo can fill; a missing part turns off only its own feature. It imports nothing from the folder and holds no key.

```js
export default {
  schedules: { name, list, get, show, save, approve, control, defaults, report }, // the repo's schedule store
  person: cwd => ({ email, state, login, help }),   // who is signed in
  chatName: (cwd, agent) => ({ step, task }),        // the chat's name
  offeredChoices: async (input, agent) => false,     // true when the repo sends a typed question back
  askedInText: async text => false,                  // true when a chat's last words ask the person in text
  prepareRun: async dir => {},                       // set up a background run's copy of the repo
  checkout: (branch, cwd) => ({ commit }),           // check a saved branch before a chat opens on it; a throw refuses
};
```

## 5. Run its hooks

The project's own settings run Daily's hooks, so they run in every chat, trusted folder or not. Merge [`hooks/claude.json`](../hooks/claude.json) into `.claude/settings.json` and [`hooks/codex.json`](../hooks/codex.json) into `.codex/hooks.json`, each made if missing: under each event, add each group that is not there yet, and keep every other entry.

```bash
node -e 'const fs = require("fs"), path = require("path");
for (const [from, to] of [["claude", ".claude/settings.json"], ["codex", ".codex/hooks.json"]]) {
  const add = JSON.parse(fs.readFileSync(`.claude/skills/daily/hooks/${from}.json`, "utf8")).hooks;
  const file = fs.existsSync(to) ? JSON.parse(fs.readFileSync(to, "utf8")) : {};
  for (const [event, groups] of Object.entries(add)) {
    const have = ((file.hooks ??= {})[event] ??= []);
    for (const group of groups) if (!have.some(g => JSON.stringify(g) === JSON.stringify(group))) have.push(group);
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.writeFileSync(to, JSON.stringify(file, null, 2) + "\n");
}'
```

Codex runs them once the person trusts the project.

## 6. Link the schedule command

Link each command in `skills/` up to `.claude/skills/<command>`, so it loads by its own name in every chat: `/schedule`. Replace a real folder there only when its `SKILL.md` is the same as the module's: that is a copy from an earlier setup. Else it is the project's own skill: skip that command, and tell the person the name is taken. Where a link fails, such as on Windows without links turned on, copy the folder instead. For Codex, also link the folder and each command into `.agents/skills/`, unless `.agents` and `.claude` are already the same folder.

```bash
linked=daily
for name in schedule; do
  dir=".claude/skills/$name"
  if [ -e "$dir" ] && [ ! -L "$dir" ]; then
    cmp -s "$dir/SKILL.md" ".claude/skills/daily/skills/$name/SKILL.md" \
      || { echo "Skipped /$name: $dir is another skill"; continue; }
    rm -rf "$dir"
  fi
  [ -L "$dir" ] || ln -s "daily/skills/$name" "$dir" 2>/dev/null || cp -R ".claude/skills/daily/skills/$name" "$dir"
  linked="$linked $name"
done
if [ "$(cd .claude && pwd -P)" != "$(mkdir -p .agents && cd .agents && pwd -P)" ]; then
  mkdir -p .agents/skills
  for name in $linked; do t=".agents/skills/$name"; { [ -e "$t" ] && [ ! -L "$t" ] && echo "Skipped $t: it is another skill"; } || ln -sfn "../../.claude/skills/$name" "$t"; done
fi
```

## 7. Run the check

Run `node .claude/skills/daily/scripts/daily.mjs check`. Daily is ready only at `"status": "ok"`. It names the schedule store:

- **`app`:** the profile's. **`paseo`:** a `paseo` program was found, so schedules are Paseo chats on this computer; the skill names what Paseo refuses.
- **`off`:** tell the person to install Paseo or add a store; for a script, give a crontab line. With no store, the worker keeps the chats in line every 5 minutes; `daily.mjs lineup off` stops it.

## 8. Save

Commit the folder and each file you added. Ask before any push.

## Update

1. **Stop in a WongStack install**: Daily updates with [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md).
2. **Find the base:** the newest WongStack commit that set the folder's version: its `VERSION` file, or, in a copy from before that file, its `.claude-plugin/plugin.json`. Below 2.0.0, Daily was two folders, and that file was in `daily/`.

   ```bash
   dir=.claude/skills/daily
   if [ -f "$dir/VERSION" ]; then version=$(cat "$dir/VERSION"); file=.agents/plugins/daily/VERSION
   else version=$(node -p "require('./$dir/.claude-plugin/plugin.json').version"); file=.agents/plugins/daily/.claude-plugin/plugin.json
     [ "${version%%.*}" -lt 2 ] && file=.agents/plugins/daily/daily/.claude-plugin/plugin.json
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
   | `.agents/plugins/daily/daily/X` | `.claude/skills/daily/X` | `X` |
   | `.agents/plugins/daily/schedule/X` | `.claude/skills/schedule/X` | `skills/schedule/X` |

   Also copy each repo file in an old folder with no base file to its new path: the project added it.

   From 2.0.0, each file `.agents/plugins/daily/X` at the base is the repo's `.claude/skills/daily/X`.
4. **Merge in a temporary copy.** For each file at its new path, at the base and at `main` (`.agents/plugins/daily/X`):
   - in both: `git merge-file -p <repo's file> <base> <main>`; a non-zero exit is a conflict;
   - only at `main`: add it;
   - only at the base: remove it, unless the repo changed it: a conflict;
   - deleted here and changed upstream: a conflict.
5. **On a conflict, write nothing:** name each file and stop. Else put the folder in place at `.claude/skills/daily/`, then:
   - **From a copy with a `.claude-plugin/` folder**, which the merge removed: remove `daily` from the root `.claude-plugin/marketplace.json`, and the file once it lists none; when Codex is here, run `codex plugin remove daily@<the list's name>`; and delete the `enabledPlugins` key `daily@skills-dir` from `.claude/settings.json` and `.claude/settings.local.json`. In `AGENTS.md`, change `/daily:schedule` to `/schedule`.
   - [Run its hooks](#5-run-its-hooks) again. First remove each group the base's hook files listed and `main`'s do not, and each hook the project added by hand that runs the same `.claude/skills/daily/scripts/` file, so each hook runs once.
   - [Link the schedule command](#6-link-the-schedule-command) again.
   - [Run the check](#7-run-the-check), commit, and ask before any push.
