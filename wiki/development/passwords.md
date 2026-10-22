# Save your passwords

Give the agent the logins you choose through a private link, so it logs in for you whenever a site logs you out. The agent never sees a password: it learns only which sites you saved. It is part of [browsing](browsing.md), in the [development](README.md) docs.

- **The ask.** Say *save my passwords* or *add my Netflix login*. The agent also offers it on its own at any login page that no saved login matches, a first page asking only your email included, or whose saved password the site rejects; otherwise only when you ask. Either way it [asks first](browsing.md#how-private-links-work): *I need your Netflix login. I'll send the page to save it.* `Ready, send the link / Not now`.
- **One screen for your logins.** Drop your password export on the page, or tap the box to pick it on a phone. Export it as a CSV file from Chrome, Apple Passwords, LastPass, Bitwarden, 1Password, Dashlane, or Firefox. Your device reads the file itself and lists every site in it, none ticked; a second file adds to the list without repeats. To add a site by hand, fill the form at the top and tap *Add*: it joins the list ticked. The export box sits under it. The page isn't the site's own, so your password manager won't fill the form by itself: pick the site's login from its list, or type it. Tap *Save and continue* once: only the ticked logins leave your device, plus a form you filled but didn't add, and the file is never sent. Successful completion saves the entries and wakes the requesting chat in that tap. A failed selection stays open, keeping successful rows saved and failed rows editable. An incomplete typed login must be corrected before continuing. Unticked export entries stay on your device. *Not now* cancels without announcing readiness. A file it can't read, such as 1Password's `.1pux` or a JSON export, gets *Export as CSV from your password manager.* Delete the export file once you're done: it holds every password in clear.
- **Where they're kept.** On the computer the agent runs on, in one plain file in your home folder, `~/.wong-stack/logins.json`, never in your repo. Only your own user can read it, and nothing locks it beyond that: a copy or a backup of the file shows every password in it, and so does anyone with full access to that computer. The agent runs as your user, so it could open the file; it is told never to, and only [the program that types a login](browsing.md#saved-browser-logins) reads it.
- **Earlier saved logins aren't carried over.** Logins saved while the agent used its earlier browser sit in that browser's own store, which gives out no password to copy. Nothing there is deleted or read. The first time an errand meets each site, the agent sends this link, and you save that login again.
- **Keep bank and email out**, unless you trust the agent with them: anyone with that computer can reach what's saved.
- **Change or forget one in the chat.** Saving the same site and username again replaces the old password, so a changed password is fixed by adding it again. A second account on the same site is kept beside the first. Say *forget my Netflix login* and the agent runs [`browse.mjs`](../../.agents/skills/browser/scripts/browse.mjs) `forget <name>`. Say *which logins do you have?* and it lists the sites and usernames from `browse.mjs logins`.
- **How.** The agent runs [`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs) `open --passwords`, sends you the `HANDOVER_LINK` it prints, and runs `wait` in the background. Private input ends after a successful *Save and continue*, on *Not now*, or after 24 hours by default:

  ```bash
  node .claude/skills/hand-over/scripts/hand-over.mjs open --passwords   # the password link
  node .claude/skills/hand-over/scripts/hand-over.mjs wait               # HANDOVER_RESULT=done, then HANDOVER_SAVED=netflix-com,costco-com
  ```

  For one site's login, `--site` fills in the website, and `--username` the username of a saved login the site rejected, so you type only what's missing. The page is titled *Save your netflix.com login* and starts in the first empty box. Both ride only in the link, after the `#`, which your browser never sends, so they reach no server, log, or file. The copy [listed in your inbox](browsing.md#how-private-links-work) leaves the username out, so opened from there, the page asks for it. When the task's page is on that site, the page also shows a picture of it, as [the private form](private-form.md#what-you-see) does, so you see which login it wants; a task that passes `--session <name>` to `browse.mjs` passes it here too. Saving the same site and username replaces the old password:

  ```bash
  node .claude/skills/hand-over/scripts/hand-over.mjs open --passwords --site https://www.netflix.com/login                      # no saved login
  node .claude/skills/hand-over/scripts/hand-over.mjs open --passwords --site https://www.netflix.com/login --username me@x.com   # a rejected one
  ```

  A site that asks for the email on a page of its own gets `--email-first` beside `--site`, so you're asked once, not for the email in the chat and the password later. The box reads *Password (optional)*, with *Leave it blank if the site sends you a code.* A login saved blank holds the email only: next time the agent types the email, and at a password page `browse.mjs login` prints `missing`, so you get this link for the password, with the username filled in.

  ```bash
  node .claude/skills/hand-over/scripts/hand-over.mjs open --passwords --site https://accounts.shopify.com/lookup --email-first   # an email-first login
  ```

  Once `wait` prints `HANDOVER_SAVED`, the agent logs in with it as with [any saved login](browsing.md#saved-browser-logins).

  It then names the saved sites in the chat, looked up by name in `browse.mjs logins`, never a password. Only one [private link](browsing.md#how-private-links-work) is open at a time; a [key link](secrets.md#receive-a-key-through-a-private-link) nobody has opened gives way to this one.

The link has [every private link's safety](browsing.md#how-private-links-work): a new address and secret key each time, closed after successful completion, cancellation, or after 24 hours by default. Each password travels once, from your device to that file, and never lands in the chat, a log, a command line, or a file in the repo.

Back to [browsing](browsing.md).
