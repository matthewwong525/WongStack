# Connect your tools in your own browser

**Status:** shipped as 48.4.0
**Branch:** onboarding-flow-after-setup
**Open questions:** none

## Why

After install, connecting your work tools is the step that makes the assistant useful, but today it is slow. You make each key by hand on a private link, and every tool the app does not know yet waits for a change, its checks and a publish. Your own Chrome is already signed in to those tools, so the assistant can make the keys there, and a new tool can work at once.

## What Changes

- **Connecting comes first after install, with your tools already suggested.** Setup reads your past chats while it installs. The assistant uses what it learned to suggest your tools: *You seem to use Stripe, Notion and Figma. Connect these?* You say yes, or change the list.
  ```mermaid
  flowchart TD
    done[install finishes] --> ask["suggest your tools"]
    ask --> chrome{"use your Chrome?"}
    chrome -->|yes| make[assistant makes each key]
    chrome -->|no or other computer| link[key link, as today]
    make --> saved[keys saved, unseen]
    link --> saved
    saved --> works[each tool shows one result]
    works --> app["your first app?"]
  ```

- **The assistant uses your own Chrome, where you are already signed in.** It asks first. You turn on one Chrome setting once, and Chrome asks you to allow it. The assistant works only in new tabs it opens. You watch it go to each tool's key page and make the narrowest key that only reads. If you are signed out of a tool, you sign in yourself in that tab. It never asks for a password. When your Chrome is on another computer, or you say no, the private key link works as it does today.
  ```text
  You seem to use Stripe, Notion and Figma.
  I can make their keys in your own Chrome,
  in new tabs, while you watch. Each key
  only reads.
  Turn this on once: in Chrome, open
  chrome://inspect/#remote-debugging and
  switch it on. Chrome then asks "Allow?"
  [ Use my Chrome ]  [ Send me the key link ]
  ```

- **Keys go to your app, and the chat never sees them.** The assistant takes each new key from the page and sends it straight to your live app. The chat shows only its last four characters. While a key is on the screen, the assistant's view of the page hides it, and it takes no picture.
  ```text
  ✓ Stripe   key saved, ends in …4f2a
  ✓ Notion   key saved, ends in …91c0
  ✓ Figma    key saved, ends in …7d13
  ```

- **A new tool works at once, with no publish.** The assistant works out each tool from its own developer pages. It writes how to reach the tool, and which requests only read, into your app. No code changes and no checks run, so the tool works a few seconds later. It also writes a notes page, so the next chat does not work the tool out again. The app holds each new tool to the same safety rules as before, and refuses one that breaks them. No ready-made tool list ships.
  | | Today | After |
  |---|---|---|
  | A tool the app does not know | a change, its checks, then *publish it?* | ready in seconds |
  | Who makes the key | you, from steps on a link | the assistant, in your Chrome |
  | Where the key passes | your copy and paste | page to app, unseen |

- **Each new tool shows in Access, and you give teammates their levels there.** The Services list shows each tool you connected in a chat, and the requests that tool counts as reads. A teammate gets a tool only when you give them a level for it, so you see what *Read* lets them do before you give it.
  ```screen
  <div class="card col gap">
    <div class="row gap"><h3>Services</h3></div>
    <div class="row gap"><b>Stripe</b><span class="grow muted">Payments and refunds</span><span>Saved</span></div>
    <div class="muted">Added in a chat · reads: GET anything, POST /v1/search</div>
    <div class="sep"></div>
    <div class="row gap"><b>Notion</b><span class="grow muted">Docs and project notes</span><span>Saved</span></div>
    <div class="muted">Added in a chat · reads: GET anything, POST /v1/search</div>
  </div>
  ```
  A sketch, not a picture: the plan step changes no code, so no prototype runs yet.

- **Your first app comes next, in the same chat.** When your tools work, the assistant offers a first app built on them, such as *this week's charges from Stripe*. You no longer open the site to copy the *Make it yours* request. The box stays on the site for anyone who skipped. Your sign-in on the live site during setup now counts as the check that you can sign in.
  ```text
  Your tools
    ✓ Stripe   works: 3 charges today
    ✓ Notion   works: 12 pages
    – Gmail    not connected yet: it needs a
               sign-in the app can't keep yet
  Want a first app on these? For example,
  this week's charges and who paid.
  ```

**Non-goals:** tools that offer only a sign-in that renews, such as Gmail and Google Calendar, stay *not connected yet*. Teammates' computers still send the owner a message and make no key. The assistant's own browser, and saved passwords, are not used for keys. No ready-made tool list ships.

## What the build needs

- **Nothing.** The last check, on a computer where your Chrome and the assistant run together, comes after the build.

## Capabilities

### New Capabilities

- `own-browser-connect`: connecting a tool through the person's own open Chrome: asking first, working only in tabs it opens, making the narrowest key, moving the key to the app unseen, hiding keys from page readings and pictures, and falling back to the key link.

### Modified Capabilities

- `connect-tools`: suggest the tool list, connect a new tool with no change and no publish, and drop the "never open a browser" rule for the person's own Chrome.
- `key-access`: tools added from a chat are kept as app data, held to the direct-use rules when saved, listed in Services with their reads, and moved into code when an app first uses one.
- `browser-logins`: the own-browser rule for key pages allows the connect helper in the person's own Chrome, with their yes.
- `install-onboarding`: after connecting, setup offers the first app in the same chat; the site's request stays as a fallback.
- `cloudflare-provisioning`: the owner's sign-in on the live site during setup counts as the human login check.

## Impact

- `.agents/skills/connect/` (skill, new `scripts/chrome.mjs` wrapping `agent-browser --auto-connect`), `wiki/stack/connect-your-tools.md`, `wiki/development/secrets.md#api-token-website-steps`, `wiki/development/browsing.md`, `AGENTS.md` (the *API keys/tokens* rule).
- `app/worker/keys.ts` and `app/worker/employee-access/key-levels.ts` (registry becomes code keys plus D1 tools, read per request), a new D1 migration (`tools`), an owner/Admin route to add and remove a tool, `app/worker/api/forward.ts`, `scripts/check-app-keys.mjs` (rules shared with the Worker), `scripts/cf-secrets.mjs` (live-only `TOOL_*` secrets), `scripts/company-api.mjs` (`tool add|remove`).
- `app/src/apps/access/Services.tsx` and `wiki/stack/access-screens.md`.
- `.agents/skills/wong-setup/references/cloudflare.md` Step 5, `wiki/stack/getting-started.md`, `wiki/stack/api-keys.md`.
- Depends on `agent-browser` 0.38.1's `--auto-connect` and Chrome's remote-debugging setting; neither is tried on a real Chrome yet.

## Decision log

- **2026-11-04** — Asked whether connecting tools comes first after install → chose connecting first; everything else comes after.
- **2026-11-04** — Asked whether the browser could help connect → chose using the person's own open browser, with agent-browser as the tool, so they need not sign in.
- **2026-11-04** — Asked whether to ship ready-made common tools → chose no: the assistant works out each tool and helps connect it.
- **2026-11-04** — Asked how keys reach Cloudflare → chose straight from the page to the app, safely, with no copy and paste.
- **2026-11-04** — Asked whether to try the browser on a real Chrome first or plan now → chose plan now and test during the build.
- **2026-11-04** — Asked, earlier the same day, for steps only and no browser sign-in when connecting → this plan replaces that choice for the person's own Chrome, because they are already signed in and type no password.
- **2026-11-04** — Assumed: a tool added in a chat lives in the app's data, not code, because a code change needs checks and a publish for every tool.
- **2026-11-04** — Assumed: the owner gives no extra approval for a tool; giving a teammate a level in Access, where its reads show, is the approval, because the owner already holds every key and an extra click slows the first run.
- **2026-11-04** — Assumed: when an app is first built on a tool added in a chat, that change moves the tool into code, because an app lists its keys in code and the checks then review it.
- **2026-11-04** — Assumed: the assistant makes the narrowest key that only reads, and a key that can change things only when the person asks, because Read covers the first look-ups.
- **2026-11-04** — Assumed: the assistant reads and acts only in tabs it opened, and leaves the person's other tabs alone, because they can hold mail and banks.
- **2026-11-04** — Assumed: the owner's sign-in on the live site during setup counts as the human login check, because it is a real email login on the live app.
- **2026-11-04** — Assumed: the *Make it yours* box stays on the site as a fallback, because a person who skips connecting still needs a way to start.
- **2026-11-04** — Assumed: a teammate's computer keeps today's message-to-the-owner path, because it can not store a key.
- **2026-11-05** — Assumed: each request's key list rides on its bindings and is passed to every key helper, not held in request-wide state, because the app's Worker code has no Node types for that.
- **2026-11-05** — Assumed: a tool saved with no `levels` offers Read alone, because Read covers the first look-ups.
- **2026-11-05** — Assumed: saving or removing a tool off the live app is refused (`live_only`), and no seed rows hold a tool, because a preview runs branch code and must hold no tool.
- **2026-11-05** — Assumed: the check on this server used the Chromium at `chromium-1248`, because `chromium-1243` was not there.
- **2026-11-05** — Assumed: `take-key` with no ref takes the page's one key and refuses when it finds none or several, because a guess could save the wrong value.
- **2026-11-05** — Assumed: `fill` refuses password and sign-in-code boxes, because the person types no password for the assistant.
- **2026-11-05** — Assumed: `take-key` saves to the primary `app/.dev.vars` first, so a failed live save leaves the key on this computer and says so.
- **2026-11-05** — Assumed: only a signed-in person's request reads the tool list, and only for Access, discovery, the services list and `/api/direct/`, because a machine is refused before anything is read and no other route uses a tool.
- **2026-11-05** — Asked when to test it on Matthew's own Chrome → chose after publish, together, including signing in when signed out; a camoufox backup and any sign-in fixes go to a new workspace.
- **2026-11-05** — Assumed: a code key that is not saved takes the key link under its declared name, and `take-key` saves only a new tool's `TOOL_<ID>`, because the services list holds no secret names and the key link already routes declared names.
- **2026-11-05** — Assumed: the key link takes an undeclared `TOOL_<ID>` with the same shape `put-tool` takes (a letter after `TOOL_`), so both paths accept one set of names.
- **2026-11-05** — Assumed: a tool save drops its levels when its address, look-ups, MCP reads or offered levels change, and keeps them for a new title, purpose, guide or header, because only the first set changes what a level allows.
- **2026-11-05** — Assumed: a key page is one whose address, title or a heading names API, developer, integration, key, token or secret, and only there are long hex runs and UUIDs hidden, because ids of that shape are common on other pages.
- **2026-11-05** — Assumed: a tool added in a chat whose key never came goes to the person's Chrome first, then the key link, because the key link is only the fallback; a code key that is not saved goes to the key link.
- **2026-11-05** — Assumed: archived for 48.4.0 after CI passed and the preview held no tools and refused a tool save as live only.
