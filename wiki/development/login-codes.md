# Login codes

When a site asks for a one-time code after the agent logs in with [a saved password](passwords.md), the agent gets the code itself from your email, or asks you for it in the chat: never through a link. It is part of [browsing](browsing.md#saved-browser-logins).

## Spot the code step

`accepted` from [`browse.mjs login`](browsing.md#saved-browser-logins) only means the address left the login page: the site may still want a check or a code before you're signed in. So the agent takes a snapshot of the next page and reads what it asks for, before it says it's signed in:

- **A robot check:** a tick box such as *I'm not a robot*, or a picture puzzle. It comes first: the agent offers [a live view](live-view.md) for you to tap through, then reads the page again.
- **A code box:** a field labelled code, OTP, verification, or 2FA, or one marked `autocomplete="one-time-code"`.
- **An app approval:** text like *check your phone* or *approve in the app*, with no box.
- **An emailed sign-in link:** text like *check your email for a link*, with no box. It is handled as a code is: it expires in minutes too.
- **A backup or recovery code box:** this goes to [the private form](browsing.md#the-private-form), never the chat. A backup code doesn't expire, so it must not sit in the stored chat.

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

2. **Open it in a page of its own**, named with `--session`, so the login page stays as it is and [shares the same logins](browsing.md#saved-browser-logins). For Gmail, open the search straight away:

   ```bash
   node .claude/skills/browser/scripts/browse.mjs open "https://mail.google.com/mail/u/0/#search/from%3Anetflix.com+newer_than%3A1h" --session inbox
   ```

3. **A login page there means it isn't signed in.** Close that page (`close --session inbox`) and ask in the chat.
4. **Open only the newest message** from the site's sender in the last 15 minutes, read the code from its text, close that page, and go back to the login page. For a sign-in link, open the link from that message instead. Wait up to about a minute for a late email, then ask in the chat.
5. **Show no picture of the inbox.** This overrides [a picture of each new page](browsing.md#show-what-the-browser-is-doing) for that page: your inbox holds far more than the code.
6. **Say what it did, in one line:** *Got Netflix's code from your email.*

## Ask in the chat

One line names the site and where the code went: *Netflix sent a code to your phone ending 1234. What is it?* No link, no *ready?* question. The agent puts your reply in the box with `browse.mjs type` and submits. For an emailed sign-in link, it asks you to paste the link, and opens it.

The code stays in the stored chat and on one command line. That's fine, not a leak: it dies in minutes, unlike a password. A reply that looks like a backup code, because you say so or it's longer than 10 characters with dashes, isn't used; the agent offers [the private form](browsing.md#the-private-form) instead.

## Approve on your phone

For an *approve in the app* prompt, the agent says *Tap Yes in the Google app on your phone.* and checks the address with `browse.mjs get url` until it leaves the approval page. After about 2 minutes, the site's own limit, it says it timed out and offers to try again.

## A wrong or expired code

The agent says so, taps the site's *Resend* when it has one, and asks again. After three failures, it stops and gives you [steps to finish it yourself](browsing.md#steps-for-you-to-finish).

## What is not a code

Each of these has its own route in [when a step needs you](browsing.md#when-a-step-needs-you):

- **A backup or recovery code** goes through [the private form](browsing.md#the-private-form).
- **A *Sign in with Google* or *Apple* button** [follows the provider's own login](browsing.md#saved-browser-logins); a code the provider sends comes back here.
- **A robot check**, a tick box or a picture puzzle, goes to [a live view](live-view.md).
- **A passkey or Face ID** is yours, on your own device, with [steps to finish it yourself](browsing.md#steps-for-you-to-finish).
- **A login with no saved password**, or one the site rejects, goes to [the password link with the site filled in](passwords.md).

Back to [browsing](browsing.md).
