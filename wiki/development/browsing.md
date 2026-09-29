# Browsing

Browsing is how the agent uses websites as you: it keeps your logins, logs in with the passwords you save for it, shows you what it's doing, and hands you the browser when a step needs you. It works the same for every repo on the computer.

## Saved browser logins

The agent reaches your accounts (mail, calendar, banking) through [agent-browser](https://github.com/vercel-labs/agent-browser), not through connectors. A persistent Chrome profile keeps your logins across restarts, for every repo on the machine. Before a task's first `agent-browser` command, the agent runs `agent-browser skills get core` to load the guide for the installed version.

1. **The first login sets the profile.** When a task meets a login and `~/.agent-browser/config.json` has no `"profile"`, the agent adds `"profile": "<your home folder>/.wong-stack/browser-profile"` as an absolute path, keeps every other key, and creates the folder. This is a standing permission to edit that one file; the agent does not ask. It never changes a `profile` that is already set.
2. **A saved login goes first.** When a site asks to log in, the agent runs `agent-browser auth list --json`, which gives each login's name, site, and username, never a password. It matches the login page's host against each saved site's host, `www.` dropped: they match when they're equal, or when one sits under the other, so `login.netflix.com` matches `netflix.com`.
   - **One match:** the agent logs in without asking, because saving the login was your permission. It runs the command below, then checks that the address left the login page:

     ```bash
     agent-browser auth login netflix-com --no-navigate --url https://login.netflix.com   # the page's own origin
     ```

   - **Two matches:** it asks in the chat which account to use, as a multiple choice.
   - **No match, a rejected login, or a code page:** it [hands you the browser](#hand-the-browser-over), as for any login.
3. **Otherwise you log in once.** The agent hands you the browser and carries on once you're past the login.
4. **Later tasks reuse the session.** No login step, until the site logs you out.

**The agent never asks for a password in the chat.** It never reads, shows, or writes one, and it never opens `~/.agent-browser/auth/`. If you start typing a password into the chat, it doesn't use or save it; it offers [the password link](#save-your-passwords) instead.

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

## Save your passwords

Give the agent the logins you choose through a private link, so it logs in for you instead of sending you a hand-over link each time a site logs you out. The agent never sees a password: it learns only which sites you saved.

- **The ask.** Say *save my passwords* or *add my Netflix login*. The agent brings this up only when you ask about passwords or logins, never on its own. It asks first, as for a hand-over: *I'll send a private link to save your logins.* `Ready, send the link / Not now`.
- **Upload an export.** Export your passwords as a CSV file from Chrome, Apple Passwords, LastPass, Bitwarden, 1Password, Dashlane, or Firefox, and pick it on the page. Your phone or laptop reads the file itself and lists every site in it, none ticked. You tick the ones the agent may use and tap *Save*: only those leave your device, and the file is never sent. A file it can't read, such as 1Password's `.1pux` or a JSON export, gets *Export as CSV from your password manager.* Delete the export file once you're done: it holds every password in clear.
- **Or add one login.** A small form asks for the website, your email or username, and your password. The page isn't the site's own, so your password manager or phone won't fill it by itself: pick the site's login from its list, or type it.
- **Where they're kept.** On the computer the agent runs on, in agent-browser's own locked store (`~/.agent-browser/auth/`), never in your repo. The key to that store sits beside it, on the same computer. So it stops a copied or backed-up file from exposing your logins, but not someone with full access to that computer, the agent included.
- **Keep bank and email out**, unless you trust the agent with them: anyone with that computer can reach what's saved.
- **Change or forget one in the chat.** Saving the same site and username again replaces the old password, so a changed password is fixed by adding it again. A second account on the same site is kept beside the first. Say *forget my Netflix login* and the agent runs `agent-browser auth delete <name>`. Say *which logins do you have?* and it lists the sites and usernames from `auth list`.
- **How.** The agent runs [`hand-over.mjs`](../../.agents/skills/verify/scripts/hand-over.mjs) `open --passwords`, sends you the `HANDOVER_LINK` it prints, and runs `wait` in the background. The link closes when you tap *Done*, or after 10 minutes:

  ```bash
  node .claude/skills/verify/scripts/hand-over.mjs open --passwords   # the password link; no live view of the browser
  node .claude/skills/verify/scripts/hand-over.mjs wait               # HANDOVER_RESULT=done, then HANDOVER_SAVED=netflix-com,costco-com
  ```

  It then names the saved sites in the chat, looked up by name in `auth list`, never a password. `--local` works as for a hand-over. Only one link, a hand-over or a password link, is open at a time.

The link has [the hand-over link's safety](#hand-the-browser-over): a new address and secret key each time, closed on *Done* or after 10 minutes. Each password travels once, from your device to the store, and never lands in the chat, a log, a command line, or a file in the repo.

Back to [Working on WongStack](README.md).
