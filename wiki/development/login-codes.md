# Login codes

When a site asks for a one-time code after the agent logs in with [a saved password](passwords.md), the agent gets the code itself from your email, or asks you for it in the chat: never through a hand-over link. It is part of [browsing](browsing.md#saved-browser-logins).

## Spot the code step

After `agent-browser auth login`, the agent takes a snapshot of the page and reads what it asks for:

- **A code box:** a field labelled code, OTP, verification, or 2FA, or one marked `autocomplete="one-time-code"`.
- **An app approval:** text like *check your phone* or *approve in the app*, with no box.
- **A backup or recovery code box:** this goes to [the hand-over](browsing.md#hand-the-browser-over), never the chat. A backup code doesn't expire, so it must not sit in the stored chat.

The page usually says where the code went: *We sent a code to j\*\*\*@gmail.com*, or *to •••• 1234*. Email → [read the inbox](#read-the-code-from-your-email). A text, an authenticator app, or no clear answer → [ask in the chat](#ask-in-the-chat).

## Read the code from your email

The agent reads the code itself only when its browser is already signed in to that email. It never logs in to your email to fetch a code: that login may want a code of its own, and loop.

1. **Pick the webmail** from the saved login's username:

   | Email ends in | Webmail |
   | --- | --- |
   | `gmail.com`, `googlemail.com` | `https://mail.google.com/` |
   | `outlook.com`, `hotmail.com`, `live.com` | `https://outlook.live.com/mail/` |
   | `icloud.com`, `me.com` | `https://www.icloud.com/mail/` |
   | anything else | Gmail, which also serves Google Workspace; then ask |

2. **Open it in a new tab of the same browser**, so it shares the profile ([one browsing task at a time](browsing.md#saved-browser-logins)). For Gmail, open the search straight away:

   ```bash
   agent-browser tab new --label inbox "https://mail.google.com/mail/u/0/#search/from%3Anetflix.com+newer_than%3A1h"
   ```

3. **A login page there means it isn't signed in.** Close the tab and ask in the chat.
4. **Open only the newest message** from the site's sender in the last 15 minutes, read the code from its text, close the tab, and go back to the login tab. Wait up to about a minute for a late email, then ask in the chat.
5. **Show no picture of the inbox.** This overrides [a picture of each new page](browsing.md#show-what-the-browser-is-doing) for that tab: your inbox holds far more than the code.
6. **Say what it did, in one line:** *Got Netflix's code from your email.*

## Ask in the chat

One line names the site and where the code went: *Netflix sent a code to your phone ending 1234. What is it?* No link, no *ready?* question. The agent puts your reply in the box with `agent-browser fill` and submits.

The code stays in the stored chat and on one command line. That's fine, not a leak: it dies in minutes, unlike a password. A reply that looks like a backup code, because you say so or it's longer than 10 characters with dashes, isn't used; the agent offers the hand-over instead.

## Approve on your phone

For an *approve in the app* prompt, the agent says *Tap Yes in the Google app on your phone.* and checks the address with `agent-browser get url` until it leaves the approval page. After about 2 minutes, the site's own limit, it says it timed out and offers to try again.

## A wrong or expired code

The agent says so, taps the site's *Resend* when it has one, and asks again. After three failures, it offers the hand-over.

## What still goes to the hand-over

[The hand-over link](browsing.md#hand-the-browser-over) stays for steps only you can do on the page: picture puzzles, passkeys and Face ID, *Sign in with Google* or *Apple* buttons, backup or recovery codes, and sites that log in another way. When you're already in the link, say for single sign-on, you type the code there, and the link stays open through the code page.

A login with no saved password, or one the site rejects, goes to [the password link with the site filled in](passwords.md), not here.

Back to [browsing](browsing.md).
