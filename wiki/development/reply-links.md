# Reply links

A reply link opens a page the agent made at a web address, and the page's buttons reach the chat that made it: one sends what you wrote, with nothing to copy and paste, and others send a fixed action with optional notes. A plan's review page uses one, and so can any page a chat writes; [`reply-link.mjs`](../../.agents/skills/reply-link/scripts/reply-link.mjs) opens them. Part of [development](README.md).

It is not a [private link](../../.agents/skills/browser/references/browsing.md#how-private-links-work). A private link takes a secret the agent must never see, and nothing typed into it reaches the chat. A reply link does the opposite: everything you send goes into the chat. **Never send a password, a key, or a card through one.**

## A plan's link

Each new or changed plan prints *👉 Tap here to see the plan* as one reply link, when one can open ([print the plan's link](../../.agents/skills/explore/references/asking-the-user.md#print-the-plans-link)). A finished plan's reply puts the link first, so a chat that folds a long reply never hides it, then the plan itself to read in the chat, and ends with *Review the plan, then tap Build it or Build and publish on its page.* and no question.

- **Send notes.** On the page, save your notes, then tap *Send notes*. Saving copies nothing there. One tap sends every note not yet sent, and each is marked *Sent*, so a second tap sends nothing twice. Change a sent note and it goes again.
- **The chat takes them as pasted notes.** They arrive under the line *Notes on the plan … Don't build yet.* The chat [updates the plan](../../.agents/skills/plan/SKILL.md#review-notes) and builds nothing.
- **Three choices stay visible at the bottom.** *Send notes*, *Build it*, and *Build and publish*, even on small phones. Either build choice sends your saved unsent notes with it: the chat updates the plan, answers question notes, then acts on that choice without asking again. Drafts stay out. *Build it* shows the result before anything goes live. *Build and publish* asks once more above the bar. Escape or an outside tap dismisses that question; Escape returns focus to *Build and publish*.
- **Only acknowledged notes become Sent.** A saved edit made while a request waits remains unsent. Failures keep notes available for retry or copying. If the plan changed after you opened it, reload to read it first. Each action works once per version; a duplicate request cannot mark new notes sent.
- **A tap shows progress.** Connecting to the chat shows *Connecting…*. Send notes or a build choice shows a spinner until the chat answers; no other tap can send meanwhile. The result appears above the bar; its height stays the same. Success shows only once the chat acknowledges it.
- **The first plan of the day waits 5 to 10 seconds** for the connection. Later plans, from any chat on the same computer, share it and print at once.

## In your inbox first

When the project has [a company app](../stack/company-api.md), every reply link opens in its Inbox, at `/apps/inbox/?item=<id>`, behind your company sign-in: a [review page](../review-pages.md) and any page a chat wrote itself. No tunnel starts.

- **Signed out, or with the inbox out of reach, no link opens.** The chat gives you the page's file and the sign-in link ([where no link opens](#where-no-link-opens)). A project with an app never falls back to a tunnel: a tunnel is slow to start, dies with the computer, and needs `cloudflared`.
- **A project with no company app opens its links at a tunnel**, where this page names one.
- **The inbox opens on what is open.** Without `?item=`, it lists under *Open* each page that waits on you, newest first, and a tap opens it. With none, it says *Nothing open.* A badge shows whether this computer is online. It lists no chats: a chat's question waits in its own chat, by [your chat list](daily.md#your-chat-list).
- **Artifacts keeps every closed page.** It lists each one, newest first, with *Answered*, *No answer* or *Page*, and when. A [plain page](plain-pages.md) goes straight there; one [shared with the team](plain-pages.md#share-with-team) says *Shared*. Search finds a page, open or closed, by words in its title, and no page shows twice. *Show more* reads 50 more. *Back* goes to the inbox.
- **Schedules is a button in the top bar.** It opens [your schedules](../stack/host-schedules.md#manage-a-schedule), and their *Back* returns to the inbox.
- **A tap waits in the app until this computer takes it.** The app tells the computer at once down [the live line](../stack/live-line.md); the computer takes the taps on its own plans, wakes the chat, and reports back. With the line down, it checks every 10 seconds instead. The page shows *Waiting…*, or *Waiting for your computer* when it hasn't checked in for a minute, then *Sending…* once the computer has it, then *Sent* once the chat has it.
- **A plan closes once the chat has your answer.** Notes, *Build it* or *Build and publish* close the plan as soon as the chat gets them. A send that doesn't arrive keeps the plan open, so you can try again; a rebuilt plan comes at [a new link](#a-day-then-a-new-link).
- **A plan closes when its change ships.** Once [`/ship`](../../.agents/skills/ship/SKILL.md) merges it, its waiting pages move to *Artifacts*, wherever they opened. A shipped plan's link is its saved file.
- **A closed page stays in *Artifacts*.** It opens read-only, under a line that says what reached the chat and when, such as *Archived · Build it, 3 Nov, 14:02*, with your notes. Its buttons and notes go, and a tap sends nothing. Other items, such as an approval, still go a day after they close.
- **A tap never fires late or twice.** *Cancel* stops a tap until the computer takes it. One still waiting when its plan closes is dropped. A taken tap whose result doesn't come back in 2 minutes shows *Didn't arrive* and never goes again. A plan rebuilt since you opened it says *This plan changed* and asks you to reload. A plan that closes while you read it says so, with *Back*.
- **One tap per plan every 5 seconds.** The app refuses a faster one, and the computer wakes a chat no faster, as at a tunnel.
- **The app's bar stays put while you read a plan.** It stays at the top of every page, and nothing hides or slides. *Back* and the plan's workspace sit at the top of the plan's own page, so they scroll away with its words; scroll back to the top to tap *Back*. A plan built before 2026-10-31 shows *Back* fixed above it until its chat builds it again.
- **The page runs sealed.** It sits in a frame that can run its own script but can't reach the app's sign-in or data. It talks to the inbox only on a private channel handed to it when it first loads, and its notes only under its own plan's name. Its links open in a new tab, so the frame never shows another site; a page that loads there later gets no channel. A page a chat wrote gets [a small bridge](reply-link-pages.md#the-page-bridge) in its inbox copy, never in its file.
- **The app never holds the chat or its messages.** It keeps the page, its button names and your taps; the chat and each button's message stay on this computer. So a tap in the app can send only the messages this computer fixed.

## A day, then a new link

A link stays open for 24 hours from when the chat printed it. Building the plan again moves the time on and keeps the same link while the plan waits on you; once you've sent your answer, the rebuilt plan comes back at a new link.

- **A closed link costs you nothing.** When the link has closed, or the chat can't be reached, the same tap copies your notes and says so: *This link has closed. Copied 2 notes: paste them into chat.* The button then reads *Copy notes*, as on a file. The build buttons go, and you choose in the chat.
- **Say *new link*.** The chat runs the plan's build command again and prints a fresh link. Notes you saved at the old address stay there: send or copy them before you ask.
- **At a tunnel, a dead connection shows Cloudflare's error page**, not ours. Say *new link*.

## Files from a page

A page's [file question](../review-pages.md#files) sends each file to the computer the chat runs on, as soon as you pick it. The send or button then names the files, and the chat gets a `Files:` line for each, with its question, name, size, and the path where it is saved.

- **Through a tunnel (no app), the file goes straight to this computer.** It needs the link's key, as a send does. The computer saves it in `.scratch/<page folder>-uploads/`, readable only by you; `reply-link.mjs open --uploads <dir>` picks another folder.
- **From your Inbox, the file waits in your company app.** The app keeps it until the computer takes your tap. The computer reads it, checks it, and saves it as a tunnel's file; an item with no page file uses `.scratch/inbox-uploads/`. Then the app deletes it. It deletes it too when you cancel the tap or the chat can't be woken. No one can open a file 24 hours after it came, whether or not the computer comes back; the app deletes it the next time the Inbox is used. The database's restore history can keep deleted data for up to 30 days. A file the app deleted before your page sent it shows again under its question, marked to pick again, and its need opens again. The app keeps 300 MB of waiting files at most, for all its people together, and refuses more until the computer takes some.
- **Each file is checked twice**, on the page and on the computer: 25 MB a file, 100 MB a link's files, sent or not, and a type its question takes. The first bytes must match the name's type, so a `logo.png` that is not a PNG is refused.
- **A file you never sent goes when the link closes.** A sent file stays in its folder for the chat to use; git never takes `.scratch/`.
- **Never send a password, a key, or a card in a file.** It reaches the chat like your words do.

## Where no link opens

The chat prints the page's file, and the page copies notes as it always has. It asks you to install nothing. That happens when:

- this computer is signed out of the company app (`REPLY_REASON=signed-out`): the chat also gives the sign-in link from `node scripts/company-api.mjs login`;
- the inbox did not answer or take the page (`inbox-down`);
- the host has no way to send a chat a message (`no-chat`);
- `REPLY_LINK=off` is set, as the tests do (`off`).

With no app, two more come from the tunnel: [`cloudflared`](required-tools.md#installing-cloudflared) is not installed (`no-cloudflared`), or the tunnel did not come up within 30 seconds (`tunnel-down`).

A page opened from the plan's file, or from a pull request, is the same page with *Copy notes* and no build buttons.

## Is a link safe?

- **The address alone only shows the page.** It is long and random, and what it shows is plan text, not a secret.
- **Sending needs the link's key.** The key rides after the `#`, which a browser never sends as part of an address, and goes back in a header.
- **A send reaches one chat, under one fixed line.** The chat and the first line are set when the link opens; the page can change neither. For a plan that line says *Don't build yet.* The send arrives as your own message, never under another chat's name.
- **A send is bounded:** 20,000 characters, and one every 5 seconds for each page.
- **A button names a fixed action and may attach notes.** The opener fixes its instruction and chat target; reviewer text follows that instruction and is limited to 20,000 characters. Invalid or oversized notes never reach the chat. So the most a plan's link can do is send notes, start that plan's build, or start its publish.
- **The link is in the chat's text.** Anyone who can read it there can send notes to that chat, and start that build or publish, until it closes.
- **It never blocks a private link.** A reply link keeps its own state, apart from [`hand-over.mjs`](../../.agents/skills/hand-over/scripts/hand-over.mjs), so a key link opens at once during a review, and several pages hold links at the same time.
- **A key, a password or a card never goes to the inbox.** Only a private link's address, kind, title and closing time do, and a test holds that line.

## Open one for another page

A form, a list to approve, or an inbox item with no page opens a reply link too: [reply link pages](reply-link-pages.md) shows how.
