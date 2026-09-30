# Browsing

Browsing is how the agent uses websites as you: it keeps your logins, logs in with the passwords you save for it, shows you what it's doing, moves to Cloudflare's browser when a site blocks its own, and hands you the browser when a step needs you. It works the same for every repo on the computer.

**API key and token website steps use your own browser.** Before opening or interacting with a token page, follow [the token website procedure](secrets.md#api-token-website-steps), including when ordinary browsing reaches such a step. It takes precedence over saved logins, pictures, and remote hand-over below; the agent gives you the service link and short steps.

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

When a step needs you, the agent sends you a private link that opens its browser on your phone or laptop, and the link closes itself. The link opens a live view of the page, with *Page* and *Fill fields* views on a phone, or the fields beside the page on a computer: a box per text field, a dropdown per dropdown, a tick box per tick box, each with the page's label. What you type or pick lands in that field on the page as you go; then tap its matching button, such as *Pay* or *Sign in*, beside its listed fields. Native form buttons keep the site's labels and disabled state, with each form's buttons beside its fields. Your latest typing arrives before the click. Custom controls and buttons in embedded frames may only appear in the live view: tap them there. A changed or uncertain button asks for a tap in the preview; it never resubmits automatically.

- **Fill it in one tap.** Each box says what it holds (card number, expiry, security code, email, password, one-time code), so 1Password or your phone's autofill can fill the whole list at once.
- **A field that isn't listed**, such as one inside a payment provider's embedded box: tap the field on *Page*, switch to *Fill fields*, and open *Other typing*. On a computer, open *Other typing* beside the page. It opens by itself when the page has no fields to list. On a laptop you can also click and type on the page itself.
- **Submitting keeps the browser with you** until the requested finish, including a code step after a password. Your own tap on a website action uses the website's normal validation and handlers; the existing chat confirmation rules still apply when the agent initiates an outward action.
- **The list follows the page.** It refreshes when the page moves on, say from the password to a code page, and when a pick shows a new field, such as the year once you choose a month.
- **Page and fields each have room.** On a phone, switch between *Page* and *Fill fields* without losing your typing. Swipe the live page up, down, left, or right: first move through the preview, then keep scrolling the website when you reach its edge. Tap a supported text field on the page to open your phone keyboard; the same local typing appears in *Fill fields*. This also lets you see login screens that have no scrolling of their own. The fields scroll separately; you never need to scroll the whole hand-over to reach its controls. On a computer, both views stay side by side, and the mouse wheel scrolls the website at your pointer.
- **Go back after an accidental click.** *Back* and *Forward* arrows, a *Reload* icon, and a *Return to start* icon stay below both views and control the live website. *Return to start* opens the exact page where this private link began, even after you visit another website. Each icon has an accessible name and a tooltip. With no browser history, *Back* or *Forward* tells you so and keeps your typing and preview position. Your latest field edits arrive first. If navigation cannot be confirmed, check *Page* before trying again; it never repeats the action itself.
- **Room above the phone keyboard.** While the on-screen keyboard is open, the hand-over header, view tabs and navigation hide, and the selected field comes into view. Dismissing the keyboard brings the controls back, keeping your typing. The website keeps its size and readable writing; a hardware keyboard leaves the controls visible. Your phone browser's own bars stay under its control.
- **On a phone, the page fits your screen.** A window narrower than 800 points gets the site's own phone layout, with enough height to see a whole login screen by swiping. A wider visible form expands the browser width within its limits, and you can drag sideways to reach both edges without shrinking the writing. Turning the phone re-fits it; opening the keyboard keeps the remote page steady. Successful navigation returns the preview to the top. The page goes back to desktop size when the link closes.

- **When.** A login, a captcha, a code sent to you, any input only you can give, or you saying *let me take over*. A bot check or block that stops the agent's own browser, such as Cloudflare's *Verify you are human*, moves the site to [Cloudflare's browser](#when-a-site-blocks-the-agents-browser) instead: a link can't help, because the site judges the browser, not your tap. API key and token website steps follow [the own-browser procedure](secrets.md#api-token-website-steps). The agent never tries to get past a login or check itself, and [nothing is disguised](#nothing-is-disguised). A yes or no is not one of these: the agent asks it in the chat, never through a hand-over.
- **Ask first.** Before it sends a link, the agent asks in the chat as a multiple choice, [the shared way](../../.agents/skills/explore/references/asking-the-user.md): *I need you to log in to your bank.* `Ready, send the link / Not now`. It sends the link only once you reply, so the 10 minutes start when you're there, not while you're away. A question waits for you; a link dies. If your last message was *let me take over*, you're there, so the link comes straight away.
- **How.** The agent runs [`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs) `open` with the finish to watch for, sends you the `HANDOVER_LINK` it prints, and runs `wait` in the background. `open` closes blank tabs and brings the task's page to the front, so the link never opens on an empty page:

  ```bash
  node .claude/skills/hand-over/scripts/hand-over.mjs open --until "**mail.google.com/mail/**"   # a login: the logged-in page
  node .claude/skills/hand-over/scripts/hand-over.mjs open --until-gone "iframe[src*=recaptcha]"  # a captcha that clears in place
  node .claude/skills/hand-over/scripts/hand-over.mjs open                                        # let me take over: no finish
  node .claude/skills/hand-over/scripts/hand-over.mjs wait                                        # prints HANDOVER_RESULT=...
  ```

  Name the page you reach once past the step, not "left the login page": a two-step code page would count too. Add `--local` only when you say you're at the computer the agent runs on; it prints a local link and opens no tunnel.
- **While it's open.** The agent sends its browser no commands, so it never fights you for the page. When you say *done*, it runs `hand-over.mjs close`.
- **After it closes.** A successful requested finish wakes the chat that opened the link, even if it stopped waiting. The watcher closes private input first and makes one bounded notification attempt through the installed Paseo CLI. It sends only completion identity, mode, result, saved login/key names, and Worker-key names; never a private address, page content, or credential. `HANDOVER_COMPLETION` identifies the same event in `wait` and the notification: handle that identity once, resume the original task, and consume a duplicate without doing the task again. `HANDOVER_NOTIFICATION=notified` means dispatch was acknowledged, not that the task has finished. Missing workspace identity or CLI gives `unavailable`; a failed or ambiguous send gives `unconfirmed`, with no automatic resend. The page tells you to return to chat and say *continue*; saved inputs stay saved. Cancellation, expiry, and incomplete input never announce readiness (`ready: false` and `not-requested`). With no browser finish supplied, keep the explicit *done* in chat followed by `close`. On `done`, the agent takes a fresh snapshot, because you may have moved the page, and carries on. On `timeout`, it says so and offers a new link. On `HANDOVER_NEEDS=cloudflared`, it asks, installs [Cloudflare's tunnel tool](required-tools.md), and tries again.

**Is the link safe?** Each link gets a new random address plus a secret key that only the link carries, and it dies once you're past the step, when you say *done*, or after 10 minutes, even if the chat stops. A copy left in the chat is dead too. Anyone who sees it while it's open, say over your shoulder, can use the browser until it closes. Cloudflare carries the connection, so like any site it hosts, it could in principle see what you type; your app already runs on Cloudflare, so this adds no new company to trust. To list the fields, the page reads each one's label, kind, position and size, a visible form's width, a dropdown's choices, native form actions' labels, association, geometry, and visible/enabled state, and navigation details limited to the browser history length and the original page address, never what's in the fields; what you type goes to the page as key presses and is never read back or saved. The agent reads only the page's address, or whether the box it waits on is still there: never the page, the list, what you type, or a picture of it. The page shows only this task's browser, never the agent's other browser sessions. The browser runs with no window, so Chrome can't offer to save your password; only the login itself is kept, as before.

## When a site blocks the agent's browser

Some sites put a *Verify you are human* check in front of the agent's browser, or turn it away. The agent then carries on in Cloudflare's cloud browser, which tells sites it's an agent working for a person, and many let it in. [`cloud-browser.mjs`](../../.agents/skills/browser/scripts/cloud-browser.mjs) runs it with the same `agent-browser` commands.

1. **Spot it.** On a site's first page, the agent reads only its title and first lines:

   ```bash
   node .claude/skills/browser/scripts/cloud-browser.mjs check   # BROWSER_BLOCKED=check|block|none
   ```

   `check` means Cloudflare's check held about 15 seconds; `block` means its block page or error 1020. Another site's plain refusal, such as one naming the server's address, counts as `block`. It never runs during a hand-over.
2. **Switch, and say so in one line.** *Uber Eats blocked my browser, so I'm using Cloudflare's.* No retry in its own browser, and no question: a switch costs cents.

   ```bash
   node .claude/skills/browser/scripts/cloud-browser.mjs open   # CLOUD_BROWSER_CDP=ws://127.0.0.1:<port>/<secret>, CLOUD_BROWSER_SESSION=cloud-1
   agent-browser --session cloud-1 --cdp "<CLOUD_BROWSER_CDP>" open https://www.ubereats.com/
   ```

   Every command for that session names both `--session` and `--cdp`: one without `--cdp` starts the agent's own browser instead. `CLOUD_BROWSER_GRANTED=` names a permission your Cloudflare key just gave itself: report it. `CLOUD_BROWSER_NEEDS=` names one to add by hand. `CLOUD_BROWSER_QUOTA=used-up` (exit 3) means the account's cloud browser time is used up: say so plainly, and give the site's link and the steps for your own device.
3. **Bring the login.** Before opening the site, the agent copies just that site's login in, naming each host it logs in on (Uber Eats signs in on `uber.com`):

   ```bash
   node .claude/skills/browser/scripts/cloud-browser.mjs carry-in --site ubereats.com --site uber.com   # CARRY=done|none|busy
   ```

   Only those sites' cookies and storage move, never another site's login or a check's pass, and the copy is deleted straight after. `busy` means another task holds the personal browser: carry on without the login. A site with nothing to copy, or one that rejects the copy, gets [a saved login or a hand-over](#saved-browser-logins), as for any login.
4. **Hand over the same way.** A code or login in the cloud browser gets [the same private link](#hand-the-browser-over), naming the session: `AGENT_BROWSER_SESSION=cloud-1 AGENT_BROWSER_CDP="<CLOUD_BROWSER_CDP>" node .claude/skills/hand-over/scripts/hand-over.mjs open …`.
5. **Finish.** The agent copies any refreshed login back, then closes the session:

   ```bash
   node .claude/skills/browser/scripts/cloud-browser.mjs carry-back --site ubereats.com --site uber.com
   agent-browser --session cloud-1 --cdp "<CLOUD_BROWSER_CDP>" close
   node .claude/skills/browser/scripts/cloud-browser.mjs close
   ```

   A session also closes by itself once `agent-browser` lets go of it, or after 30 minutes (`open --minutes N` raises that), even if the chat stops. Cloudflare closes one idle for 10 minutes, say while you think over *Pay now?*: reopen, carry the login in again, and go on, since the cart lives in the account.
6. **Both refused.** When Cloudflare's browser is turned away too, as DoorDash does, the agent stops browsing that site. It gives you the site's link and the steps to do on your own phone, not a hand-over link.

**Cloud first.** Say *use the cloud browser first* and the agent runs `cloud-browser.mjs first cloud`: tasks in every repo on this computer then start there, and a site that refuses it moves to the agent's own browser. `first local` switches back; `first` alone prints `BROWSER_FIRST=`.

### Nothing is disguised

The agent never hides that its browser is automated, changes the browser's identity to pass a check, sends its traffic through someone else's or a hired address, uses a check-solving service, or moves a check's pass from one browser to another. That holds even when you ask, and when you do the tapping: it offers Cloudflare's browser, or the step on your own device.

**What it costs.** The Workers Paid plan includes 10 cloud browser hours a month, then $0.09 an hour; the free plan gives 10 minutes a day. Cloudflare can see the pages in its browser, as it already carries your app and the hand-over link.

## Save your passwords

Give the agent the logins you choose through a private link, so it logs in for you instead of sending you a hand-over link each time a site logs you out. The agent never sees a password: it learns only which sites you saved.

- **The ask.** Say *save my passwords* or *add my Netflix login*. The agent brings this up only when you ask about passwords or logins, never on its own. It asks first, as for a hand-over: *I'll send a private link to save your logins.* `Ready, send the link / Not now`.
- **One screen for your logins.** Drop your password export on the page, or tap the box to pick it on a phone. Export it as a CSV file from Chrome, Apple Passwords, LastPass, Bitwarden, 1Password, Dashlane, or Firefox. Your device reads the file itself and lists every site in it, none ticked; a second file adds to the list without repeats. To add a site by hand, fill the small form under the list and tap *Add*: it joins the list ticked. The page isn't the site's own, so your password manager won't fill the form by itself: pick the site's login from its list, or type it. Tap *Save and continue* once: only the ticked logins leave your device, plus a form you filled but didn't add, and the file is never sent. Successful completion saves the entries and wakes the requesting chat in that tap. A failed selection stays open, keeping successful rows saved and failed rows editable. An incomplete typed login must be corrected before continuing. Unticked export entries stay on your device. *Close without continuing* cancels without announcing readiness. A file it can't read, such as 1Password's `.1pux` or a JSON export, gets *Export as CSV from your password manager.* Delete the export file once you're done: it holds every password in clear.
- **Where they're kept.** On the computer the agent runs on, in agent-browser's own locked store (`~/.agent-browser/auth/`), never in your repo. The key to that store sits beside it, on the same computer. So it stops a copied or backed-up file from exposing your logins, but not someone with full access to that computer, the agent included.
- **Keep bank and email out**, unless you trust the agent with them: anyone with that computer can reach what's saved.
- **Change or forget one in the chat.** Saving the same site and username again replaces the old password, so a changed password is fixed by adding it again. A second account on the same site is kept beside the first. Say *forget my Netflix login* and the agent runs `agent-browser auth delete <name>`. Say *which logins do you have?* and it lists the sites and usernames from `auth list`.
- **How.** The agent runs [`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs) `open --passwords`, sends you the `HANDOVER_LINK` it prints, and runs `wait` in the background. Private input ends after a successful *Save and continue*, on *Close without continuing*, or after 10 minutes:

  ```bash
  node .claude/skills/hand-over/scripts/hand-over.mjs open --passwords   # the password link; no live view of the browser
  node .claude/skills/hand-over/scripts/hand-over.mjs wait               # HANDOVER_RESULT=done, then HANDOVER_SAVED=netflix-com,costco-com
  ```

  It then names the saved sites in the chat, looked up by name in `auth list`, never a password. `--local` works as for a hand-over. Only one link, a hand-over or a password link, is open at a time.

The link has [the hand-over link's safety](#hand-the-browser-over): a new address and secret key each time, closed after successful completion, cancellation, or after 10 minutes. Each password travels once, from your device to the store, and never lands in the chat, a log, a command line, or a file in the repo.

Back to [development](README.md).
