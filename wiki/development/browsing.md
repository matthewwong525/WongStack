# Browsing

Browsing is how the agent uses websites as you: it keeps your logins, shows you what it's doing, and hands you the browser when a step needs you. It works the same for every repo on the computer.

## Saved browser logins

The agent reaches your accounts (mail, calendar, banking) through [agent-browser](https://github.com/vercel-labs/agent-browser), not through connectors. A persistent Chrome profile keeps your logins across restarts, for every repo on the machine. Before a task's first `agent-browser` command, the agent runs `agent-browser skills get core` to load the guide for the installed version.

1. **The first login sets the profile.** When a task meets a login and `~/.agent-browser/config.json` has no `"profile"`, the agent adds `"profile": "<your home folder>/.wong-stack/browser-profile"` as an absolute path, keeps every other key, and creates the folder. This is a standing permission to edit that one file; the agent does not ask. It never changes a `profile` that is already set.
2. **You log in once.** The agent [hands you the browser](#hand-the-browser-over) and carries on once you're past the login. It never asks for a password in chat or writes one to a file.
3. **Later tasks reuse the session.** No login step, until the site logs you out.

**One personal browsing task at a time.** Chrome lets only one browser use a profile at a time, so a browsing task and a scheduled run must not use it at the same moment. A task that finds the profile busy waits or reports it; it never deletes the profile's lock. [`/verify`](staging-walkthrough.md) is not affected: each walk uses its own temporary profile, so a preview check never carries your logins.

## Show what the browser is doing

While the agent browses for you, it drops a picture of the page into the chat at each key moment, so you can catch a wrong page or a wrong field before it's too late.

- **When.** Each new page, right before an action that publishes, sends, books, pays for, or deletes something, and the result. Not after every click or keystroke: a flood of pictures hides the one that matters.
- **A picture before a yes.** Before one of those actions, the picture goes with a question in the chat: *Publish the site now?* The agent waits for your yes, however long you take, then acts.
- **How.** The agent takes the picture into agent-browser's temp folder, then opens the path it prints with its own image tool (Claude's Read, Codex's image view). [Paseo](https://paseo.sh) shows an image a tool opens as a picture in the chat; a terminal shows a placeholder, which does no harm.

  ```bash
  agent-browser screenshot --if-changed   # prints a temp path, or none when the page hasn't changed
  ```

  No path means the page hasn't changed, so the agent shows nothing new.
- **One line each.** Above each picture, one plain line says what it shows: *Filled in 7pm, 2 people. Booking now.*
- **Never in the repo.** A picture can hold your mail or your bank balance, so it stays in the temp folder, never a repo file.
- **None while you have the browser.** During a [hand-over](#hand-the-browser-over) the agent takes no pictures; it starts again once you hand the browser back.

## Hand the browser over

When a step needs you, the agent sends you a private link that opens its browser on your phone or laptop, and the link closes itself. The link opens a live view of the page, with the page's fields listed under it: a box per text field, a dropdown per dropdown, a tick box per tick box, each with the page's label. What you type or pick lands in that field on the page as you go; then tap the page's own button, such as *Pay* or *Sign in*, in the live view.

- **Fill it in one tap.** Each box says what it holds (card number, expiry, security code, email, password, one-time code), so 1Password or your phone's autofill can fill the whole list at once.
- **A field that isn't listed**, such as one inside a payment provider's embedded box: open *Other typing*, tap the field on the page, and type in its box. It opens by itself when the page has no fields to list. On a laptop you can also click and type on the page itself.
- **The list follows the page.** It refreshes when the page moves on, say from the password to a code page, and when a pick shows a new field, such as the year once you choose a month.

- **When.** A login, a captcha or bot check, a code sent to you, any input only you can give, or you saying *let me take over*. The agent never tries to get past one itself: no retries, no disguised browser, no solving service. A yes or no is not one of these: the agent asks it in the chat, never through a hand-over.
- **Ask first.** Before it sends a link, the agent asks in the chat as a multiple choice, [the shared way](../../.agents/skills/explore/references/asking-the-user.md): *I need you to log in to your bank.* `Ready, send the link / Not now`. It sends the link only once you reply, so the 10 minutes start when you're there, not while you're away. A question waits for you; a link dies. If your last message was *let me take over*, you're there, so the link comes straight away.
- **How.** The agent runs [`hand-over.mjs`](../../.agents/skills/verify/scripts/hand-over.mjs) `open` with the finish to watch for, sends you the `HANDOVER_LINK` it prints, and runs `wait` in the background. `open` closes blank tabs and brings the task's page to the front, so the link never opens on an empty page:

  ```bash
  node .claude/skills/verify/scripts/hand-over.mjs open --until "**mail.google.com/mail/**"   # a login: the logged-in page
  node .claude/skills/verify/scripts/hand-over.mjs open --until-gone "iframe[src*=recaptcha]"  # a captcha that clears in place
  node .claude/skills/verify/scripts/hand-over.mjs open                                        # let me take over: no finish
  node .claude/skills/verify/scripts/hand-over.mjs wait                                        # prints HANDOVER_RESULT=...
  ```

  Name the page you reach once past the step, not "left the login page": a two-step code page would count too. Add `--local` only when you say you're at the computer the agent runs on; it prints a local link and opens no tunnel.
- **While it's open.** The agent sends its browser no commands, so it never fights you for the page. When you say *done*, it runs `hand-over.mjs close`.
- **After it closes.** On `done`, the agent takes a fresh snapshot, because you may have moved the page, and carries on. On `timeout`, it says so and offers a new link. On `HANDOVER_NEEDS=cloudflared`, it asks, installs [Cloudflare's tunnel tool](required-tools.md), and tries again.

**Is the link safe?** Each link gets a new random address plus a secret key that only the link carries, and it dies once you're past the step, when you say *done*, or after 10 minutes, even if the chat stops. A copy left in the chat is dead too. Anyone who sees it while it's open, say over your shoulder, can use the browser until it closes. Cloudflare carries the connection, so like any site it hosts, it could in principle see what you type; your app already runs on Cloudflare, so this adds no new company to trust. To list the fields, the page reads each one's label and a dropdown's choices, never what's in them; what you type goes to the page as key presses and is never read back or saved. The agent reads only the page's address, or whether the box it waits on is still there: never the page, the list, what you type, or a picture of it. The page shows only this task's browser, never the agent's other browser sessions. The browser runs with no window, so Chrome can't offer to save your password; only the login itself is kept, as before.

Back to [Working on WongStack](README.md).
