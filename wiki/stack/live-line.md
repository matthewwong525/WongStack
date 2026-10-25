# The live line

The live line is one connection your computer keeps open to [your company app](company-api.md), so an inbox tap, a change, or a schedule's due time reaches it in seconds. Your open inbox joins the same line, so a new card or *Sent* shows at once.

## What it carries

The app sends one message down the line: *look now*. Nothing else.

1. You tap in the inbox, or a [schedule](host-schedules.md) comes due.
2. The app says *look now* to your computer.
3. Your computer asks the app for its work, signed in as you, through the same requests it used before the line existed.
4. It acts only on what it set up itself: a tap on a page it made, sending the message it fixed for that button ([reply links](../development/reply-links.md#in-your-inbox-first)), or a run of a schedule whose instructions are saved in your repo and match the revision you approved.

The app never sends a command, a prompt, or code. Your computer ignores any other message and writes it in [its log](#the-log). So someone who broke into the app could at most send a tap or start an approved schedule early, as before, and both show on your screens.

Your computer also keeps its own limits, so even a broken-into app can't open chat after chat:

- **A run starts once.** The helper notes each run it starts in `~/.wong-stack/helper/runs.json` and refuses the same run again (`repeat`).
- **A schedule starts no more often than its record allows**: its `authority.minIntervalMs`, or every 10 minutes at most when the record sets none (`too_soon`). A schedule meant to run more often needs that field set.
- **Rounds stay 1 second apart**, however many *look now* messages arrive.

A refused run shows as not started in the inbox, with its reason, and goes in [the log](#the-log). When the helper can't read or write `runs.json`, it starts nothing (`no_ledger`).

The helper starts a run from whichever of your project folders signed in to that app holds the schedule's record, preferring the folder the record names. Paseo schedules from all of them go up to the app together.

A line belongs to one person in one app. Ana's tap never wakes Ben's computer. The line closes when your sign-in expires, and your computer opens it again with a fresh one. A web page from another site can't open yours: the app checks where the request came from.

## Why nothing listens on your computer

Your computer connects out, the way a browser tab does. It opens no port, takes no webhook, and runs no server for the app to call. Your chats can control the whole computer, so an open door there is the biggest risk; a line you dial out on has no door.

When the line drops, your computer goes back to checking every 10 seconds, and reconnects on its own, waiting a little longer after each failed try, up to a minute. While the line is open it still checks every 5 minutes, in case a *look now* was lost. An open inbox does the same: it refreshes on its own every few seconds while it can't join.

## The helper

A small background program, the helper, holds the line. [`helper.mjs`](../../.agents/skills/hand-over/scripts/helper.mjs) installs it so it starts with the computer and runs as you, never with more rights than your chats:

- **Linux:** a systemd user service, `wongstack-helper.service`, kept running after you log out. When your chats run as root, as on a server, it is a system service that runs as root.
- **macOS:** a LaunchAgent, `com.wongstack.helper.plist`.
- **Other systems:** no service. Each chat that starts runs the helper while it is needed.

Setup offers to install it once, in its tools question; an update asks first. Each chat that starts restarts it if it stopped. The service runs a small launcher in `~/.wong-stack/helper/` that starts the helper from your main project folder, never from a workspace a tidy-up may delete. The helper stores no new secret: it signs in through `cloudflared`, as your chats do.

The helper warns when your computer's Node is older than [the minimum with current security fixes](../development/required-tools.md#nodes-minimum), and keeps working.

## Turn it off

```bash
node .claude/skills/hand-over/scripts/helper.mjs uninstall
```

It no longer starts with the computer. Taps then arrive by checking while a chat runs, as before. Schedules on the app's clock wait until it is back: a run due meanwhile starts once then, or shows as *Missed* if it is too late. `helper.mjs status` says whether it is installed and running; `helper.mjs install` puts it back.

## The log

The helper writes one line per delivered tap, started or refused run, and ignored message to `~/.wong-stack/helper/log.jsonl`, so you can see everything the app caused. It never holds a message's text. It starts over once it reaches 1 MB, keeping the one before.

## Its own Worker

Cloudflare makes no preview link for a Worker that defines a Durable Object class. When the line lived in the app's Worker, no app change got a link. So the line runs in a Worker of its own, [`line-worker.ts`](../../app/worker/line-worker.ts) with `app/wrangler.line.jsonc`: `<worker>-line`, for the live app only. It has no web address. The app reaches it through its `LIVE_LINE` binding, which names that Worker (`script_name`). Keep any new Durable Object out of the app's Worker the same way.

- **Previews have no line.** The staging app binds no `LIVE_LINE`, so its line answers `503` *This app has no line yet; the inbox keeps checking*. A preview's inbox refreshes every few seconds, and a computer signed in to it checks every 10 seconds, so its schedules still come due. Nothing on a preview reaches the live line or a live computer. A preview that binds any other Worker's Durable Object is refused, naming the binding, and `secrets:check` fails on it.
- **The line deploys first, on the default branch only.** [`cf-deploy.sh`](d1-pipeline.md#the-scripts) sends the line's Worker, then the live app: Cloudflare refuses a binding to a Worker that doesn't exist yet (`code: 10061`). A failed line deploy stops the app's. A new app's first publish makes the line.
- **Setup writes the line's settings and deploys nothing.** It lists the line in the install record, `.claude/.wong-stack.json`, under `components.liveLine.workers`. A Worker that holds the line's name but isn't on that list may be another project's: setup leaves a to-do naming it, and writes nothing.
- **Its settings come from the default branch.** A deploy never copies a branch's `app/wrangler.line.jsonc`, only the bundled code in `dist/line/`. A line config with an `env.staging` or a web address is refused.
- **The binding is `LIVE_LINE`, not `LINE`.** Cloudflare refuses to delete a class while a binding keeps its old name, even pointed at another Worker (`code: 10061`). The rename let migration `line-2` drop the app's own copy. Its saved state went with it, and each computer put it back on reconnecting.
- **A version can't apply a class migration.** `wrangler versions upload` refuses a Worker with one pending; `cf-preview.sh` deploys staging once, then uploads.

## Change or test it

The line is one Durable Object per person, [`line.ts`](../../app/worker/apps/inbox/line.ts), holding hibernating sockets. A preview can't test a line change: it has no line. Try it on this computer, then on the live app.

- **Try it on this computer first.** `npm run dev` runs the app and its line together, the line from `wrangler.line.jsonc`'s `env.local`. The local sign-in, `dev@example.com`, counts as a person there, so the inbox and its line open. From `app/`:

  ```bash
  npx wrangler d1 migrations apply DB --local --env local   # once: the inbox's tables
  npm run dev                                               # the app at http://localhost:5173
  ```

  Open `http://localhost:5173/apps/inbox/`, then join the line as a computer in a second terminal, from the repo's root:

  ```bash
  node scripts/line-stand-in.mjs
  ```

  [`line-stand-in.mjs`](../../scripts/line-stand-in.mjs) prints each message it hears, with the seconds since it joined, and closes on Ctrl-C. It refuses any address but this computer's, so it never reaches a live app. Put a test plan the way a chat does, a `PUT` to `/apps/inbox/api/item` with an id of 32 hex characters and `"actions": ["approve"]`. Tap it in the inbox, which needs a button in the plan's HTML that posts `inbox:tap`, or send the inbox's tap yourself: a `POST` to `/apps/inbox/api/tap` with the item, `approve` and its version. The stand-in prints `{"t":"look"}` within a second; the plan alone wakes only the inbox. Close the test item after, with a `POST` to `/apps/inbox/api/item-close`.
- **Then on the live app, after publishing.** `helper.mjs status` says the helper is running. Tap a test plan in the live inbox and time it reaching its chat; the tap shows in `~/.wong-stack/helper/log.jsonl`. Close the test item and any test schedule after.
- **Answer every goodbye.** Its `webSocketClose` closes the socket back. Without it, the computer waits 10 seconds and sees the line drop (`1006`), not close.
- **Walk it from a script**, signed in as you: give [`companyClient`](../../scripts/employee-bootstrap.mjs) a `stateDir` holding a `target.json` that names the app's origin. The folder must be private (`0700`) and the file `0600`, or it refuses. Open `/apps/inbox/api/line?computer=<32 hex>`, then make an item, tap it, and time the *look now*.

Back to [the Cloudflare stack](README.md).
