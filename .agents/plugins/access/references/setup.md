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

Copy this folder from GitHub, as a real folder, to `.claude/skills/access/`: Claude Code loads plugins only from `.claude/skills/`. Skip this when it is there.

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

## 9. Memory

When the repo has `.claude/skills/memory/`, offer to point memory's `connect` headers at [`signin/computer.mjs`](../signin/computer.mjs), and the memory route's caller at `app.decide`. Both then sign in one way.

## 10. Run the check

[`store/contract.mjs`](../store/contract.mjs) exports `checkStore(makeStore)`, one `node:test` suite over each operation. Add a test file:

```js
import { checkStore } from '../.claude/skills/access/store/contract.mjs';
checkStore(() => makeStore());   // a fresh, empty store
```

Run it with `node --test`. Then send one signed-in request through `gate`, as the owner: it must pass. Access is ready only when both pass.

## 11. Codex and save

Skip the Codex steps when `codex` is not on this computer.

1. Add `access` to the root `.claude-plugin/marketplace.json`, the repo's own list when it has one; else make it:

   ```json
   { "name": "wongstack", "owner": { "name": "WongStack" }, "plugins": [{ "name": "access", "source": "./.claude/skills/access" }] }
   ```

2. From the repo's folder, with the list's `name` in place of `wongstack`, run `codex plugin marketplace add "$(pwd)"` and `codex plugin add access@wongstack`. Codex asks once to trust the hooks.
3. Name both commands in `AGENTS.md`, made if missing, for each other computer's Codex.
4. Commit the folder and every file you added. Ask before any push.

## Update

1. **Stop in a WongStack install** (`.claude/.wong-stack.json`): Access updates with [`/wong-sync`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-sync/SKILL.md).
2. **Find the base:** the newest WongStack commit that set the folder's `.claude-plugin/plugin.json` version.

   ```bash
   dir=.claude/skills/access
   version=$(node -p "require('./$dir/.claude-plugin/plugin.json').version")
   ws=$(mktemp -d)/ws
   git clone -q --filter=blob:none --no-checkout https://github.com/matthewwong525/WongStack "$ws"
   manifest=.agents/plugins/access/.claude-plugin/plugin.json
   for c in $(git -C "$ws" log --format=%H main -- "$manifest"); do
     git -C "$ws" show "$c:$manifest" | grep -q "\"version\": \"$version\"" && { base=$c; break; }
   done
   ```

   No base: stop and say so.
3. **Merge in a temporary copy**, never in the repo. For each file under `.agents/plugins/access/` at `$base` and at `main`:
   - in both: `git merge-file -p <repo's file> <base> <main>`; a non-zero exit is a conflict;
   - only at `main`: add it;
   - only at the base: remove it, unless the repo changed it: a conflict.
4. **On any conflict, write nothing:** name each file and stop.
5. Else put the merged folder in place, [run the check](#10-run-the-check), rerun [Codex's two commands](#11-codex-and-save) when Codex is here, commit, and ask before any push.
