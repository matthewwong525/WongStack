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
   - **No match, or a rejected login:** it sends [the password link](passwords.md) with the site, and a rejected login's username, already filled in, then logs in with what you save.
   - **A code page or an app approval:** it reads the code from your email or asks you in the chat: [login codes](login-codes.md).
3. **A login with no password to save, you do once.** For *Sign in with Google*, a passkey, or an emailed sign-in link, the agent hands you the browser and carries on once you're past the login.
4. **Later tasks reuse the session.** No login step, until the site logs you out.

**The agent never asks for a password in the chat.** It never reads, shows, or writes one, and it never opens `~/.agent-browser/auth/`. If you start typing a password into the chat, it doesn't use or save it; it offers [the password link](passwords.md) instead.

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

- **When.** A captcha, a passkey, a single sign-on button, a backup code, any other input only you can give on the page, or you saying *let me take over*. A password login or a one-time code isn't one of these: see [saved browser logins](#saved-browser-logins). A bot check or block that stops the agent's own browser, such as Cloudflare's *Verify you are human*, moves the site to [Cloudflare's browser](blocked-sites.md) instead: a link can't help, because the site judges the browser, not your tap. API key and token website steps follow [the own-browser procedure](secrets.md#api-token-website-steps). The agent never tries to get past a login or check itself, and [nothing is disguised](blocked-sites.md#nothing-is-disguised). A yes or no is not one of these: the agent asks it in the chat, never through a hand-over.
- **Ask first.** Before it sends a link, the agent asks in the chat as a multiple choice, [the shared way](../../.agents/skills/explore/references/asking-the-user.md): *I need you to sign in to your bank with Google.* `Ready, send the link / Not now`. It sends the link only once you reply, so the 10 minutes start when you're there, not while you're away. A question waits for you; a link dies. If your last message was *let me take over*, you're there, so the link comes straight away.
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

When a site turns the agent's browser away, the agent says so in one line and carries on in Cloudflare's cloud browser, bringing just that site's login. The steps, the cost, and what it never does: [when a site blocks the browser](blocked-sites.md).

## Save your passwords

Say *save my passwords* and the agent sends a private link where you pick the logins it may use; it never sees a password. The screen, where they're kept, and how to change one: [save your passwords](passwords.md).

Back to [development](README.md).
