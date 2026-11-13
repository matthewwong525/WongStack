# Set up Access

This guide adds Access to an app, or [updates](#update) it. Ask the person before each step that costs money or makes something public: a new database, a new Cloudflare key, a deploy, a public route.

Access needs a JavaScript server, a sign-in that tells it who is asking, and a store that passes the check. Write no install list: look at the repo and fill each gap.

## 1. Stop in a WongStack install

When the repo has `.claude/.wong-stack.json`, stop and change nothing: Access comes with each WongStack update.

## 2. Find the app

Find the repo's server: Node, Cloudflare Workers, Deno or Bun, anything that answers a `Request` with a `Response`.

- **No JavaScript server:** say Access needs one, and stop.
- **An empty repo with no commits:** offer WongStack's [Cloudflare setup](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/SKILL.md): it brings Access and makes the database. On a no, stop.

## 3. Copy the folder in

Copy this folder from GitHub, as a real folder, to `.claude/skills/access/`: Claude Code loads skills only from `.claude/skills/`. Skip this when it is there.

```bash
dir=.claude/skills/access
mkdir -p "$dir"
curl -fsSL https://codeload.github.com/matthewwong525/WongStack/tar.gz/main \
  | tar -xz --strip-components=4 -C "$dir" WongStack-main/.agents/plugins/access
```

## 4. Connect the sign-in

`signIn(request)` gives back who is asking, from a sign-in the server has checked: `{ email, subject }` for a person, `{ machine }` for a service token, or `null`. Never take a person from the request body or a plain header.

- **A Cloudflare sign-in wall:** use [`signin/cloudflare.mjs`](../signin/cloudflare.mjs) with the wall's team domain and audience. Offer [`signin/cloudflare-list.mjs`](../signin/cloudflare-list.mjs) as `signInList`, so a person added on the page can sign in; it needs a Cloudflare key, so ask before you make one.
- **The app's own login:** write `signIn` on the app's session check.
- **No login:** say Access needs one, and stop.

## 5. Give it a store

Start from [the stand-in store](../store/stand-in.mjs): it shows each operation's shape on plain arrays. Write the same operations on the app's database. Ask before you make a new database.

## 6. Write the slots

Write the slots in one file outside the folder, such as `app/access-slots.mjs`, so an update never touches them. Only the first three are needed:

```js
export const slots = {
  signIn: async request => ({ email, subject }) | { machine } | null,
  store: () => store,                    // the app's store, made once per request
  owner: () => 'owner@shop.com',         // the one person who manages everyone
  apps: () => [{ id, title, description }],   // only when the person wants an app tick per person
  secret: name => process.env[name],     // keys the app holds, for services
};
```

Then write `.agents/access/slots.json`, which tells the chat-start check, `/access` and the services helper where things are:

```json
{ "slots": "app/access-slots.mjs", "app": "https://app.example.com", "definitions": "schema/services", "types": "app/services", "notes": "wiki/services" }
```

## 7. Add the route and the gate

`access(slots)` from [`server/index.mjs`](../server/index.mjs) gives `serve` and `gate`. `serve` answers everything under `/api/access/`, `/api/services`, and the Access page at `/apps/access/` and each address under it. `gate` is what each app route asks first: it refuses a request with no caller. A route's need is `{ apps: [...] }`, `{ keys: [...] }` for a route that uses a key, or `{ kind: 'owner' }`.

```js
import { access } from '../.claude/skills/access/server/index.mjs';
import { slots } from './access-slots.mjs';

const app = access(slots);

export async function handle(request) {
  const answer = await app.serve(request);
  if (answer) return answer;
  const refused = await app.gate(request, { apps: ['orders'] });   // the apps the route belongs to
  return refused ?? orders(request);
}
```

Serve the [`screen/`](../screen/main.mjs) folder's files as they are at `/apps/access/`, after `serve`. To use other addresses, set the `page` and `prefix` slots.

On Cloudflare Workers, call it from `fetch(request, env, ctx)` and pass `{ wait: work => ctx.waitUntil(work) }` to `serve`. Call `app.scheduled()` from `scheduled()` when you use `signInList`. In Node, Deno or Bun, give `handle` to the server as it is.

## 8. Keys for services

Ask whether the app holds keys for outside services. On a yes, keep `secret`, add `keys` with each key's title and purpose, and offer `sealing`, so a person sends a key sealed, never in a chat. The services helper reads `definitions`, `types` and `notes` from `.agents/access/slots.json`.

## 9. Run the check

[`store/contract.mjs`](../store/contract.mjs) exports `checkStore(makeStore)`, one `node:test` suite over each operation. Add a test file:

```js
import { checkStore } from '../.claude/skills/access/store/contract.mjs';
checkStore(() => makeStore());   // a fresh, empty store
```

Run it with `node --test`. Then send one signed-in request through `gate`, as the owner: it must pass. Access is ready only when both pass.

## 10. Run its hooks

The project's own settings run Access's hooks, so they run in every chat, trusted folder or not. Merge [`hooks/claude.json`](../hooks/claude.json) into `.claude/settings.json` and [`hooks/codex.json`](../hooks/codex.json) into `.codex/hooks.json`, each made if missing: under each event, add each group that is not there yet, and keep every other entry.

```bash
node -e 'const fs = require("fs"), path = require("path");
for (const [from, to] of [["claude", ".claude/settings.json"], ["codex", ".codex/hooks.json"]]) {
  const add = JSON.parse(fs.readFileSync(`.claude/skills/access/hooks/${from}.json`, "utf8")).hooks;
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

## 11. Link its services command

Link each command in `skills/` up to `.claude/skills/<command>`, so it loads by its own name in every chat: `/services`. Replace a real folder there only when its `SKILL.md` is the same as the module's: that is a copy from an earlier setup. Else it is the project's own skill: skip that command, and tell the person the name is taken. Where a link fails, such as on Windows without links turned on, copy the folder instead. For Codex, also link the folder and each command into `.agents/skills/`, unless `.agents` and `.claude` are already the same folder.

```bash
linked=access
for name in services; do
  dir=".claude/skills/$name"
  if [ -e "$dir" ] && [ ! -L "$dir" ]; then
    cmp -s "$dir/SKILL.md" ".claude/skills/access/skills/$name/SKILL.md" \
      || { echo "Skipped /$name: $dir is another skill"; continue; }
    rm -rf "$dir"
  fi
  [ -L "$dir" ] || ln -s "access/skills/$name" "$dir" 2>/dev/null || cp -R ".claude/skills/access/skills/$name" "$dir"
  linked="$linked $name"
done
if [ "$(cd .claude && pwd -P)" != "$(mkdir -p .agents && cd .agents && pwd -P)" ]; then
  mkdir -p .agents/skills
  for name in $linked; do t=".agents/skills/$name"; { [ -e "$t" ] && [ ! -L "$t" ] && echo "Skipped $t: it is another skill"; } || ln -sfn "../../.claude/skills/$name" "$t"; done
fi
```

## 12. Save

Commit the folder and every file you added. Ask before any push.

## Update

1. **Stop in a WongStack install** (`.claude/.wong-stack.json`): Access updates with [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md).
2. **Find the base:** the newest WongStack commit that set the folder's version: its `VERSION` file, or, in a copy from before that file, its `.claude-plugin/plugin.json`.

   ```bash
   dir=.claude/skills/access
   if [ -f "$dir/VERSION" ]; then version=$(cat "$dir/VERSION"); file=.agents/plugins/access/VERSION
   else version=$(node -p "require('./$dir/.claude-plugin/plugin.json').version"); file=.agents/plugins/access/.claude-plugin/plugin.json
   fi
   ws=$(mktemp -d)/ws
   git clone -q --filter=blob:none --no-checkout https://github.com/matthewwong525/WongStack "$ws"
   for c in $(git -C "$ws" log --format=%H main -- "$file"); do
     git -C "$ws" show "$c:$file" | grep -qE "(^|\")$version(\"|$)" && { base=$c; break; }
   done
   ```

   No base: stop and say so.
3. **Merge in a temporary copy**, never in the repo. For each file under `.agents/plugins/access/` at `$base` and at `main`:
   - in both: `git merge-file -p <repo's file> <base> <main>`; a non-zero exit is a conflict;
   - only at `main`: add it;
   - only at the base: remove it, unless the repo changed it: a conflict.
4. **On any conflict, write nothing:** name each file and stop.
5. Else put the merged folder in place, then:
   - **From a copy with a `.claude-plugin/` folder**, which the merge removed: remove `access` from the root `.claude-plugin/marketplace.json`, and the file once it lists none; when Codex is here, run `codex plugin remove access@<the list's name>`; and delete the `enabledPlugins` key `access@skills-dir` from `.claude/settings.json` and `.claude/settings.local.json`.
   - [Run its hooks](#10-run-its-hooks) again. First remove each group the base's hook files listed and `main`'s do not, and each hook the project added by hand that runs the same `.claude/skills/access/scripts/` file, so each hook runs once.
   - [Link its services command](#11-link-its-services-command) again.
   - [Run the check](#9-run-the-check), commit, and ask before any push.
