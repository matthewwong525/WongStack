# Live view

A live view is a private link that shows the agent's browser on one page, so you can pass a check a site uses to ask whether a person is there, or sign in where a login is stuck. It is the one time the agent shows you its browser, and the fourth [private link](browsing.md#how-private-links-work) in [browsing](browsing.md).

## When it opens

For two things only:

- **A robot check:** a tick box such as *I'm not a robot*, or a picture puzzle. It can stand at a site's front door or come right after a sign-in. The agent never ticks, solves, or answers one itself, even when asked.
- **A stuck login**, after the agent's own routes: [a saved login](browsing.md#saved-browser-logins), [the password link](passwords.md), and [a code](login-codes.md). After each submit the agent reads the page again. The login is stuck when the page stays on the login, comes back to it, or just reloads, with no error message, no check, and no code or approval page. Shopify taking the saved email, then reloading its login page, is stuck. A message such as *wrong password* is not: it gets the password link again. A saved login that sticks gets the view straight away, since the agent has nothing else to try.

A password you type in the view goes to the site a key press at a time. The view saves nothing, so it isn't added to [your saved logins](passwords.md).

Every other step keeps its route in [when a step needs you](browsing.md#when-a-step-needs-you): a password, a code, a card, an ordinary answer. A passkey or an approval on your phone stays on your own device: neither can travel through a view of another computer's browser.

## What you see

The agent's browser fills the page, already on the check, with one box under it:

```text
┌──────────────────────────────┐
│ facebook.com/...             │
│  [ ] I'm not a robot         │
│                              │
├──────────────────────────────┤
│ [Tap a box above, then type] │
└──────────────────────────────┘
```

- **It fits what you hold.** Narrow on a phone, wide on a laptop, with the whole puzzle and its button in view. The page gets its own size back when the link closes.
- **Tap straight on the browser.** Your taps go to it as they are. On a laptop your keyboard does too.
- **Type in the box and it types in the browser.** A phone's keyboard doesn't reach the browser. Tap a box in the browser, then type in ours: each letter, delete, Enter, and paste lands in the browser at once, with no send. Text already in the browser's box stays: you add to it, or keep deleting.
- **No close button.** Close the tab when you're finished, or say *done* in the chat to close the link.
- **It ends by itself.** Once the site lets you through, the page says *Done. Go back to the chat.* and the agent carries on. A link that has closed says *This link has closed. Ask in the chat for a new one.*

## What the link can do

**While it's open, the link drives a browser signed in as you.** Anyone who gets it can use every account that browser is signed in to, address bar included. Send it to nobody.

- **The same guards as [every private link](browsing.md#how-private-links-work).** A new Cloudflare address and a secret only the link carries, one link open at a time, and no screen without the secret. The screen's connection sends it as the WebSocket subprotocol, since a browser can send no header there, and the helper echoes it back ([`ws-bridge.mjs`](../../.agents/skills/hand-over/scripts/lib/ws-bridge.mjs)).
- **Open for up to 8 hours.** It closes when the site lets you through, when you say *done* in the chat, or at the limit, even if the chat stops. A closed link never works again.
- **The agent learns only how it ended.** It sees nothing you tapped or typed. Afterwards it reads the page afresh and trusts nothing from before.
- **Tasks share the screen.** Another task's new page can cover yours for a second or two; yours comes back to the front by itself.

## How the agent runs one

1. **Read the page once more.** A check that clears by itself in a few seconds needs no view.
2. **Ask first**, as a multiple choice, [the shared way](../../.agents/skills/explore/references/asking-the-user.md): *Messenger wants to know you're a person. I'll send a link that shows my browser, for you to tap through.* `Ready, send it / Not now`. At a login: *Shopify's login keeps reloading. I'll send a link that shows my browser, for you to sign in.* A puzzle goes stale and the link can use your accounts, so it's sent only once you're there.
3. **Open it with the finish**, send the `HANDOVER_LINK` it prints, and run `wait` in the background:

   ```bash
   H=.claude/skills/hand-over/scripts/hand-over.mjs
   node $H open --view --until "**/messages/**" --note "Messenger wants to know you're a person"   # where the site goes once you're through
   node $H open --view --until-gone "iframe[title*=challenge]"                                      # a check that goes away in place
   node $H open --view --until "**/store/**" --note "Shopify's login keeps reloading. Sign in here."              # a stuck login
   node $H open --view --until-gone "input[type=email], input[type=password]"                         # a login whose address after is unknown
   node $H wait                                                                                      # prints HANDOVER_RESULT=...
   ```

   Name where the site goes once the check is passed, as for [a private form](browsing.md#the-private-form): not "left this page", since an error page would count too. At a login, name the signed-in address when you know it, such as `**/store/**` for Shopify's admin. When you don't, use `--until-gone` with every login box, email and password both, from the snapshot: the email box alone goes away at a site's password page, which would close the view before you're signed in. `--note` is the one line the page shows. A task that passes `--session <name>` to [`browse.mjs`](../../.agents/skills/browser/scripts/browse.mjs) passes it here too. Exit 1 means the task has no page open, the page already meets the finish, or another link is open. No page open usually means you took a while to say *Ready* and the browser closed the idle page: the agent opens the site's page again, then the view.
4. **Hands off while it's open.** From `open` until `wait` prints, the agent sends its browser no commands and takes no pictures: the page is yours. The link's helper reads only the page's address, or whether a named part is still there. It keeps the page's window in front, and once a minute sets the page's size again, since the browser closes a page left alone for 5 minutes and your taps don't count ([`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs)).
5. **Read how it ended.**
   - `done`: the site moved on. The agent takes a fresh snapshot, shows [a picture](browsing.md#show-what-the-browser-is-doing), and carries on. It says it's signed in only once the page shows it.
   - `closed` or `timeout`: the check or the login is still there. If you never got to it, the agent offers a new link. If you tried and the site refused you, that was [the site's one view](#one-view-per-site).
   - `error`: the browser's screen stopped. The agent says so and gives [steps to finish it yourself](browsing.md#steps-for-you-to-finish).

## One view per site

Each site gets one live view per task, for a check and a stuck login together: one real try. When your try doesn't clear the check or sign you in, or the site shows a second check after it, the agent stops and [gives you steps](browsing.md#when-a-site-refuses-the-browser) for your own device. A site that turns a real person away in this browser will do it again, and repeats can lock your account.

## The first one installs three small tools

On `HANDOVER_NEEDS=live-view` (exit 3), the agent asks once, naming [what the install needs](required-tools.md#installing-the-live-views-tools): three small tools, two with admin rights on the computer.

```bash
node .claude/skills/hand-over/scripts/hand-over.mjs install-view   # HANDOVER_INSTALLED=live-view, or HANDOVER_INSTALL=manual
```

- **Yes:** it installs them and opens the view.
- **`HANDOVER_INSTALL=manual`:** nothing was installed, because the computer wants a password for admin rights. The agent gives you the one command it printed to run yourself, or steps for the check instead.
- **No:** nothing is installed, and the check or login [ends with steps for you](browsing.md#steps-for-you-to-finish).

## On a Mac

Nothing to show yet. There the agent's browser runs with no screen, so `open --view` prints `HANDOVER_VIEW=unsupported` and the check or login ends with [steps to finish it yourself](browsing.md#steps-for-you-to-finish). Linux, where the browser draws on a virtual screen, is the one place a live view opens.

Back to [browsing](browsing.md).
