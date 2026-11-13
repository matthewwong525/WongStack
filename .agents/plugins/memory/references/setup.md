# Set up memory

This guide adds memory, or [updates](#update) it. Ask the person before each step that costs money or makes something public: a new database, a deploy, a public route.

Memory needs Node 20 or newer, this folder, a profile, and a store that passes the check. Write no install list: look at the repo and fill each gap.

## 1. Stop in a WongStack install

When the repo has `.claude/.wong-stack.json`, stop and change nothing: memory comes with each WongStack update.

## 2. Copy the folder in

Copy this folder from GitHub, as a real folder, to `.claude/skills/memory/`: Claude Code loads skills only from `.claude/skills/`. Skip this when it is there.

```bash
dir=.claude/skills/memory
mkdir -p "$dir"
curl -fsSL https://codeload.github.com/matthewwong525/WongStack/tar.gz/main \
  | tar -xz --strip-components=4 -C "$dir" WongStack-main/.agents/plugins/memory
```

## 3. Give it a store

Ask the person for a memory server, and look in the repo for an app with a server and a database. Take the first path that fits:

1. **A memory server:** the profile's `connect` gets its address and sign-in.
2. **The repo's own app:** add one route that imports `serve` from [`store/interface.mjs`](../store/interface.mjs) and calls `serve(request, { prefix, caller, store })`: `prefix` is the profile's `url` path plus `/v2/`, and `store` is the caller's view. Copy that file in only when the build can not reach it. The store answers the twelve `OPERATIONS` from the app's database, and none edits or deletes a fact. Start from [the stand-in store](https://github.com/matthewwong525/WongStack/blob/main/scripts/tests/fixtures/memory/stand-in-store.mjs), which applies [who sees what](../README.md#who-sees-what). The route verifies the sign-in and gives `serve` the caller; never take an owner or a role from the request body.
3. **No app:** delete the copied folder. In an empty repo with no commits, offer WongStack's [Cloudflare setup](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/SKILL.md): it brings memory and makes the database. Else, or on a no, stop.

## 4. Write the profile

Write `.agents/memory/profile.mjs`, outside the folder, so an update never touches it. Start with `connect`, then `topics` from the repo's doc hub and folders. Add [another part](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/memory.md#the-profile) only when the repo needs it: a missing part turns off only its own feature.

```js
export default {
  connect: ctx => ({ url, headers }),   // which store; headers() gives this computer's sign-in
  topics: ctx => [{ tag, kind: 'code'|'company', page, summary, aliases, paths }],
};
```

The profile imports nothing from the folder. Keep every key in an ignored file, never in the profile.

## 5. Run its hooks

The project's own settings run memory's hooks, so they run in every chat, trusted folder or not. Merge [`hooks/claude.json`](../hooks/claude.json) into `.claude/settings.json` and [`hooks/codex.json`](../hooks/codex.json) into `.codex/hooks.json`, each made if missing: under each event, add each group that is not there yet, and keep every other entry.

```bash
node -e 'const fs = require("fs"), path = require("path");
for (const [from, to] of [["claude", ".claude/settings.json"], ["codex", ".codex/hooks.json"]]) {
  const add = JSON.parse(fs.readFileSync(`.claude/skills/memory/hooks/${from}.json`, "utf8")).hooks;
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

## 6. Link it for Codex

Codex loads skills from `.agents/skills/`: link the folder there, unless `.agents` and `.claude` are already the same folder.

```bash
if [ "$(cd .claude && pwd -P)" != "$(mkdir -p .agents && cd .agents && pwd -P)" ]; then
  mkdir -p .agents/skills
  name=memory t=.agents/skills/memory; { [ -e "$t" ] && [ ! -L "$t" ] && echo "Skipped $t: it is another skill"; } || ln -sfn "../../.claude/skills/$name" "$t"
fi
```

## 7. Run the check

On a memory server, a new chat that shows `# Memory digest` is the check. Else [`store/contract.mjs`](../store/contract.mjs) exports `checkStore(makeStore)`, one `node:test` suite over each operation and each role. Add a test file:

```js
import { checkStore } from '../.claude/skills/memory/store/contract.mjs';
checkStore(() => makeStore());   // a fresh, empty { as(caller) → store }
```

A caller is `{ role: 'admin'|'member'|'reader'|'team', subject, email }`. Run it with `node --test`: memory is ready only when it passes.

## 8. Save

Commit the folder and every file you added. Ask before any push.

## Update

1. **Stop in a WongStack install** (`.claude/.wong-stack.json`): memory updates with [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md).
2. **Find the base:** the newest WongStack commit that set the folder's version: its `VERSION` file, or, in a copy from before that file, its `.claude-plugin/plugin.json`.

   ```bash
   dir=.claude/skills/memory
   if [ -f "$dir/VERSION" ]; then version=$(cat "$dir/VERSION"); file=.agents/plugins/memory/VERSION
   else version=$(node -p "require('./$dir/.claude-plugin/plugin.json').version"); file=.agents/plugins/memory/.claude-plugin/plugin.json
   fi
   ws=$(mktemp -d)/ws
   git clone -q --filter=blob:none --no-checkout https://github.com/matthewwong525/WongStack "$ws"
   for c in $(git -C "$ws" log --format=%H main -- "$file"); do
     git -C "$ws" show "$c:$file" | grep -qE "(^|\")$version(\"|$)" && { base=$c; break; }
   done
   ```

   No base: stop and say so.
3. **Merge in a temporary copy**, never in the repo. For each file under `.agents/plugins/memory/` at `$base` and at `main`:
   - in both: `git merge-file -p <repo's file> <base> <main>`; a non-zero exit is a conflict;
   - only at `main`: add it;
   - only at the base: remove it, unless the repo changed it: a conflict.
4. **On any conflict, write nothing:** name each file and stop.
5. Else put the merged folder in place, then:
   - **From a copy with a `.claude-plugin/` folder**, which the merge removed: remove `memory` from the root `.claude-plugin/marketplace.json`, and the file once it lists none; when Codex is here, run `codex plugin remove memory@<the list's name>`; and delete the `enabledPlugins` key `memory@skills-dir` from `.claude/settings.json` and `.claude/settings.local.json`.
   - [Run its hooks](#5-run-its-hooks) again. First remove each group the base's hook files listed and `main`'s do not, and each hook the project added by hand that runs the same `.claude/skills/memory/scripts/` file, so each hook runs once.
   - [Link it for Codex](#6-link-it-for-codex) again.
   - [Run the check](#7-run-the-check), commit, and ask before any push.
