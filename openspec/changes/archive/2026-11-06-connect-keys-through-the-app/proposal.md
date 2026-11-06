# Connect your tools in the assistant's browser, with keys sent through the app

**Status:** shipping as 50.4.0
**Branch:** calm-dinosaur
**Open questions:** none

## Why

On 2026-11-06, a Mac test showed that connecting a tool takes too many routes and still gets stuck. Connect asks whether it can use your Chrome, even though the assistant's own browser now opens in a window on your Mac. A key can reach the app only from a computer that holds a strong Cloudflare login, and that Mac had none. Shopify's newer kind of key, an ID and a secret, does not work in the app at all. So the Shopify connection had to use an old key that can change almost everything in the store.

## What Changes

- **Connecting uses the assistant's own browser on every computer.** On a Mac or Windows computer, it is the window you already use for robot checks. On a server, it is the watch link. The *use your own Chrome* question goes, and nothing needs to be turned on in Chrome. When a tool asks you to sign in, the chat says *Sign in to Shopify in the browser window, then say done*. The assistant carries on when the site lets you in.
  ```mermaid
  flowchart TD
    ask["connect my Shopify"] --> open[assistant opens the key page]
    open -->|signed in| make[assistant makes a read-only key]
    open -->|signed out| turn["you sign in, in the window"]
    turn --> make
    make --> seal[key locked and sent to the app]
    seal --> wait["waits for the next publish"]
    wait --> works[a look-up shows it working]
  ```

- **The assistant sends each key through your app, with your company sign-in.** The computer no longer needs a Cloudflare login. The key is locked before it leaves the page, and only the next publish can open it. The publish puts it into your app's Cloudflare secrets, as today. Even the app can't read a key while it waits. The chat shows only the key's last four characters. A key goes live at the next publish, not at once. When nothing else waits, the assistant offers to publish just the keys.
  ```text
  ✓ Shopify   key sent, ends in …9f2c
              goes live at the next publish
  Publish the waiting keys now?
  ```

- **You can paste a key in Access yourself.** Each row in Services gets a *Paste key* button, or *Replace key* when the key is already saved. The key is locked in your browser before it is sent. After that, nobody can see it again, you included. Use it for a key you already have, or for a key from a site that won't let the assistant's browser through. The assistant still makes every other key.
  ```picture
  Before: pictures/services-before.png
  After: pictures/paste-popup.png
  After, waiting: pictures/waiting-for-publish.png
  Try it: https://connect-keys-through-the-app-wongstack-staging.matthewwong525.workers.dev/apps/access/services
  ```

- **Tools that give an ID and a secret work.** Shopify's Dev Dashboard, and other tools like it, give an ID and a secret that trade for a token that lasts a day. The app makes that trade itself, keeps the token until it runs out, and gets a new one. So Shopify can use a new key that only reads, in place of the old key that can change almost everything. The assistant makes that read-only Shopify app in its browser, after you say yes.
  | | Today | After |
  |---|---|---|
  | Shopify key | old key, can change almost all | new key, reads only |
  | How it renews | never | the app gets a new token each day |

**Non-goals:** tools that need you to sign in again each time, such as Gmail, stay *not connected yet*. Keys that only this computer uses, in `.env`, keep the private key link. The sign-in finish rules don't change. A key never goes live without a publish.

## What the build needs

- **A yes to make a read-only Shopify app**: Ready. You said yes on 2026-11-06. It is called `AI assistant`, in Claymoo's Dev Dashboard, installed on the store with `read_orders`, `read_products` and `read_customers`.
- **A place for the publish's half of the lock**: Ready. It is a secret on WongStack's GitHub repository, set with your GitHub login, which this computer has.

## Capabilities

### New Capabilities

- `sealed-keys`: a key sent to the app is sealed with a public key before it leaves the page, stored until the next publish, opened only by the publish, put into the live app's Cloudflare secrets, then deleted; the app's own token exchange for tools that give an ID and a secret.

### Modified Capabilities

- `own-browser-connect`: drop the person's Chrome; the assistant's browser on every computer, a window on a Mac or Windows; sign-in turns in the window; keys move through the app sealed.
- `connect-tools`: tools that give an ID and a secret can be added; new tools' keys go live at the next publish.
- `key-access`: Services offers a place to paste a key, still never showing a value; a key waiting for publish shows as waiting.

## Impact

- `.agents/skills/connect/` (`SKILL.md`, `scripts/browser.mjs`: drop the agent-browser `--auto-connect` backend, `where` answers `window|server|link`, `sign-in` in window mode, `take-key` seals and sends through the app), `wiki/stack/connect-your-tools.md`, `wiki/development/secrets.md`, `wiki/development/browsing.md`, `wiki/stack/getting-started.md`, `wiki/stack/api-keys.md`, `wiki/stack/access-screens.md`, `wiki/services/shopify.md`.
- `.agents/skills/hand-over/scripts/hand-over.mjs` (a `--watch` turn in window mode).
- `app/worker`: a new owner/Admin route to store a sealed key, a D1 migration (`sealed_keys`), `employee-access/tools.ts` and `key-rules.ts` (an `exchange` in `forward`), `api/forward.ts` (token exchange and cache), the status a key reports (`waiting`).
- `app/src/apps/access/Services.tsx`, a new paste popup, browser-side sealing in `app/src/lib/`.
- `scripts/seal-keys.mjs` (new: make the key pair, open and put waiting keys), `scripts/cf-secrets.mjs`, `scripts/company-api.mjs`, `.github/workflows/deploy.yml` and the Artifacts route's publish (put waiting keys after deploy), `.agents/skills/wong-setup/references/cloudflare.md` (make the key pair).
- `scripts/retired-names.json` (`WHERE=chrome`, `CHROME=none`, `SERVER=possible`), `scripts/tests/connect-browser.test.mjs`, `scripts/tests/hand-over.test.mjs`, app tests.
- A release: `CHANGELOG.md` `## Next (minor)`, with an **Updating.** step that makes the pair of locks for each install.

## Decision log

- **2026-11-06** — Asked whether a read-only Shopify key should replace the old one → chose to use the ClaymooOS key now, and plan the read-only key.
- **2026-11-06** — Asked whether keys can be pasted in Access → chose yes, in this plan.
- **2026-11-06** — Asked which browser connect uses → chose the assistant's own browser everywhere, and removing the person's Chrome, for a simpler flow.
- **2026-11-06** — Asked where a pasted key is kept → chose the app's Cloudflare secrets, kept secure.
- **2026-11-06** — Asked whether people paste the rest of their keys in Access → the person asked why the assistant can't make them; so the assistant makes every key it can, and Access paste is for a key the person already holds or a site that refuses the browser.
- **2026-11-06** — The person said a key need not go live in seconds; so a key waits for the next publish, and the app holds no Cloudflare login that can change itself.
- **2026-11-06** — Assumed: a key is sealed with a public key on the page or the computer and opened only by the publish, which holds the private key, because then a leak of the app or its database shows no key.
- **2026-11-06** — Assumed: the assistant offers a publish of only the waiting keys when no other change waits, because otherwise a new tool could wait days.
- **2026-11-06** — Assumed: the token trade follows the standard client-credentials grant, to an address on the tool's own host, with no per-tool code, because connections should stay generic.
- **2026-11-06** — Assumed: the sign-in finish needs no change, because connect already opens the key page again after a sign-in turn and checks it; the Facebook *remember this browser?* page fooled only a test watcher written by hand.
- **2026-11-06** — Assumed: one plan, not three workspaces, because Paseo is not on this computer and the parts share the key path.
- **2026-11-06** — Assumed: the private key link stays only for keys this computer uses, because one way per job is simpler.
- **2026-11-06** — Asked for a yes to make the read-only `AI assistant` Shopify app → chose yes.
- **2026-11-06** — Check: `.github/workflows/deploy.yml` the new *Put waiting keys* step runs with `continue-on-error`, because the live app has deployed by then; a key it can't open stays waiting, named in the log, for the next publish.
- **2026-11-06** — Assumed: Access sends a pasted key by its key and its place (`/api/access/keys/<id>/<n>`), and the status shows a label per part (*Key*, or *Secret* and *ID*), because the status never names a secret, as an existing test holds.
- **2026-11-06** — Assumed: a tool's id may not end in `-id`, because `TOOL_<ID>_ID` is the ID of a tool that trades for a token, and two tools must never share a secret's name.
- **2026-11-06** — Assumed: the Shopify swap to the read-only app runs right after the publish, in the same chat, not as a task, because it needs the published code and the keys-only publish of `main`; a preview holds no tools.
- **2026-11-06** — Assumed: task 7.1 checks the preview without a paste button, because WongStack's preview holds no key a person can paste.
- **2026-11-06** — Assumed: the public half of the lock goes in every environment's settings, staging too, because named environments inherit no settings and the publish's parity check stops a top-level setting staging lacks; a preview refuses a key before it reads the lock.
- **2026-11-06** — Assumed: archived for 50.4.0 after CI passed and the preview's Services showed the Cloudflare row *Live app only* with no paste button; the read-only Shopify app is made and installed, and its keys go in after the publish.
