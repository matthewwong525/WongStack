# Time the private form

You time a [private form](../development/private-form.md) send on a practice checkout, so a change to the form or the browser shows its cost before a real payment does. [`scripts/tests/fixtures/practice-checkout.mjs`](../../scripts/tests/fixtures/practice-checkout.mjs) serves it; it ships to no install.

## Run a timed send

1. **Start the checkout.** `node scripts/tests/fixtures/practice-checkout.mjs` prints `CHECKOUT_URL=`. Its card boxes sit in a cross-origin frame, like Stripe's.
2. **Pick the site's speed** with `?delay=`: `5000` takes the payment in 5 seconds, `90000` outlasts the form's first minute, and `never` declines it and keeps the page.
3. **Open it in your own browser session**, such as `browse.mjs --session walk open "$CHECKOUT_URL?delay=5000"`, then take a snapshot for the refs. The browser is shared with other chats: close only your session's tab, and never stop the browser server.
4. **Open a form** on that session with `--until '**/receipt/**'`, and send through the link's `/send` with made-up card values, or from a phone.
5. **Read the times** at the end of `~/.wong-stack/hand-over/timings.jsonl`: each box, the press, the wait, and how the link ended.

`HANDOVER_SEND_WAIT_MS` and `HANDOVER_WATCH_MS` shorten the first minute and the ten-minute watch, so a `never` site ends *Not accepted* in seconds.

## What to expect

On 2026-10-21 each box took 40 to 120 ms, and the press took 0.7 s warm and 1.8 s cold. A 5-second site's whole send took about 5.7 s.

Stop the checkout with the PID that `pgrep -f "node scripts/tests/fixtures/practice"` prints. `pkill -f practice-checkout.mjs` would also match your own shell.

Back to [maintaining WongStack](README.md).
