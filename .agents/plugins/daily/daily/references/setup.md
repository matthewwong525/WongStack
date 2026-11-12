# Set up Daily

This guide adds Daily, or [updates](#update) it. Ask the person before a step that costs money or makes something public. Daily needs Node 20 or newer; look at the repo and fill each gap.

## 1. Stop in a WongStack install

With `.claude/.wong-stack.json`, stop and change nothing: Daily comes with each WongStack update.

## 2. Copy both folders in

Copy each folder, as a real folder, into `.claude/skills/`, where Claude Code loads plugins. Skip one that is there.

```bash
for part in daily schedule; do
  [ -e .claude/skills/$part/SKILL.md ] && continue
  mkdir -p .claude/skills/$part
  curl -fsSL https://codeload.github.com/matthewwong525/WongStack/tar.gz/main \
    | tar -xz --strip-components=5 -C .claude/skills/$part WongStack-main/.agents/plugins/daily/$part \
    || { rm -rf .claude/skills/$part; echo "Copy failed: $part"; exit 1; }
done
```

## 3. Write the settings file

Write `.agents/daily/<person>.json` from [the example](example.json): `person` from the git email's name, in lowercase letters, digits and `-` only (`Sam.Lee@…` → `sam-lee`), `emails` from `git config user.email`, this computer's `timezone`, and `sources` as `{}`. Drop `guide`, or write the file it names.

## 4. Fill the profile from what the repo has

Write `.agents/daily/profile.mjs` only for the parts the repo can fill; a missing part turns off only its own feature. It imports nothing from the folders and holds no key.

```js
export default {
  schedules: { name, list, get, show, save, approve, control, defaults, report }, // the repo's schedule store
  person: cwd => ({ email, state, login, help }),   // who is signed in
  chatName: (cwd, agent) => ({ step, task }),        // the chat's name
  offeredChoices: async (input, agent) => false,     // true when the repo sends typed choices back
  prepareRun: async dir => {},                       // set up a background run's copy of the repo
  checkout: (branch, cwd) => ({ commit }),           // check a saved branch before a chat opens on it; a throw refuses
};
```

## 5. Codex

Skip this without `codex` on this computer.

1. Add `daily` to the root `.claude-plugin/marketplace.json`, the repo's own list when it has one; else make it:

   ```json
   { "name": "wongstack", "owner": { "name": "WongStack" }, "plugins": [{ "name": "daily", "source": "./.claude/skills/daily" }] }
   ```

2. Run `codex plugin marketplace add "$(pwd)"` and `codex plugin add daily@<the list's name>`. Codex asks once to trust the hooks.
3. Name both commands in `AGENTS.md`, made if missing, for the other computers.

## 6. Run the check

Run `node .claude/skills/daily/scripts/daily.mjs check`. Daily is ready only at `"status": "ok"`. It names the schedule store:

- **`app`:** the profile's. **`paseo`:** a `paseo` program was found, so schedules are Paseo chats on this computer; the skill names what Paseo refuses.
- **`off`:** tell the person to install Paseo or add a store; for a script, give a crontab line. With no store, the worker keeps the chats in line every 5 minutes; `daily.mjs lineup off` stops it.

## 7. Save

Commit both folders and each file you added. Ask before any push.

## Update

1. **Stop in a WongStack install**: Daily updates with [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md).
2. **Find the base:** the newest WongStack commit that set this `daily` folder's version. No base: stop and say so.

   ```bash
   version=$(node -p "require('./.claude/skills/daily/.claude-plugin/plugin.json').version")
   ws=$(mktemp -d)/ws; git clone -q --filter=blob:none --no-checkout https://github.com/matthewwong525/WongStack "$ws"
   manifest=.agents/plugins/daily/daily/.claude-plugin/plugin.json
   for c in $(git -C "$ws" log --format=%H main -- "$manifest"); do
     git -C "$ws" show "$c:$manifest" | grep -q "\"version\": \"$version\"" && { base=$c; break; }
   done
   ```

3. **Merge in a temporary copy.** Each file `.agents/plugins/daily/<part>/X` at `$base` and `main` is the repo's `.claude/skills/<part>/X`:
   - in both: `git merge-file -p <repo's file> <base> <main>`; a non-zero exit is a conflict;
   - only at `main`: add it;
   - only at the base: remove it, unless the repo changed it: a conflict;
   - deleted here and changed upstream: a conflict.
4. **On a conflict, write nothing:** name each file and stop. Else put both folders in place, [run the check](#6-run-the-check), rerun [Codex's commands](#5-codex) when Codex is here, commit, and ask before any push.
