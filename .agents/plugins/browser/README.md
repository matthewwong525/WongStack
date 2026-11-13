# Browser

The browser module lets your AI assistant use websites as you: it signs in once in its own browser, shows you the moments that matter, and sends you a private link for what only you can give or do, such as a key, a card, or a sign-in. It also buys through Shop, with your yes before each payment. It works in any repo, in Claude Code and Codex.

## Add it to your project

Paste this message into a chat in your project, in any AI tool:

> Add WongStack's browser to this project. Follow the setup guide at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/browser/references/setup.md

The AI copies the module's folder into your project, checks that your key file is private, runs the module's check, and saves the work. It asks you before it downloads the browser, and before it pushes.

A [WongStack](https://github.com/matthewwong525/WongStack) project already has the browser: it comes with each update. The guide stops there and changes nothing.

## Update it

Paste this message:

> Update WongStack's browser in this project. Follow the update steps at https://github.com/matthewwong525/WongStack/blob/main/.agents/plugins/browser/references/setup.md#update

It keeps your own edits to the folder. When one of your edits and a new change touch the same lines, it changes nothing and names each file.

## What you get

- **[A browser that stays signed in](references/browsing.md)**: you sign in once, on the site's own page, and the agent keeps the sign-in for later tasks.
- **[A live view](./skills/hand-over/references/live-view.md)**: a private link that shows the agent's browser for your turn to sign in, pay, or pass a robot check, then *Hand back*.
- **[A key link](./skills/hand-over/references/key-link.md)**: a private page that writes a key into your ignored key file, so the key never passes through the chat.
- **[Saved details](./skills/hand-over/references/saved-details.md)**: everyday answers you choose to keep, such as an email or an address. A card is never saved.
- **[Login codes](references/login-codes.md)**, **[a window or a link](references/browser-window.md)**, **[proxies](references/browser-proxy.md)**, and **[your password manager](references/password-manager.md)** beside the agent.
- **[Shopping](./skills/shop/references/shopping.md)** through Shop: one payment per purchase, and no card detail the agent can read.

## What it needs

- **Node 20 or newer** on each computer.
- **One folder** at `.claude/skills/browser/`, as a real folder, with the private-link and Shop skills inside it in `skills/`, each linked up to `.claude/skills/<name>/`. Claude Code and Codex load them from there, with no install step. One version in its `VERSION` file names the whole folder.
- **A git-ignored `.env`** at the repo's top: the key link writes keys there when the repo has no profile.
- **`cloudflared`** for a private link, Camoufox to browse, and Shop's command to buy: the agent asks, then installs each when a task first needs it ([how](https://github.com/matthewwong525/WongStack/blob/main/wiki/development/required-tools.md)).
- **A profile, if you want one**: `.agents/browser/profile.mjs`, outside the folder, so an update never touches it. With none, each slot below is empty and the module still works.

## Slots

A slot is one named part of the profile, a default export: `export default { look, keyFiles, … }`. An empty slot turns off only its own extra. [WongStack's profile](https://github.com/matthewwong525/WongStack/blob/main/.agents/browser/profile.mjs) fills all six.

| Slot | What it gives | When empty |
| --- | --- | --- |
| `look()` | `{ css, themeJs }`: the repo's look for every private page | A plain light look |
| `wakeChat(state, message)` | Tells the chat that opened a link that the person finished | The chat sees the result at its next look |
| `chatTarget()` | Names the chat that opens a turn, so a live view shared by several chats wakes the right one | Only the chat that opened the view is woken |
| `inbox` | `{ companyFor, listLink, closeItem, inTime }`: lists each open link in the repo's inbox | No inbox item |
| `keyFiles(ctx)` | `[{ file, names?, app?, copy? }]`: which file takes each key, and the hint shown for it | Every key goes to the top `.env` |
| `sendKey(name, value)` | Sends a key that `connect-browser.mjs take-key` read to the repo's app: `null`, `{ said }`, or `{ code, why }` | The key stays in this computer's `.env` |

`WONG_BROWSER_PROFILE` names another profile file; set it empty to load none.
