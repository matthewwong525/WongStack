# When a site blocks the agent's browser

Some sites put a *Verify you are human* check in front of the agent's browser, or turn it away. The agent then carries on in Cloudflare's cloud browser, which tells sites it's an agent working for a person, and many let it in. [`cloud-browser.mjs`](../../.agents/skills/browser/scripts/cloud-browser.mjs) runs it with the same `agent-browser` commands. It is part of [browsing](browsing.md), in the [development](README.md) docs.

1. **Spot it.** On a site's first page, the agent reads only its title and first lines:

   ```bash
   node .claude/skills/browser/scripts/cloud-browser.mjs check   # BROWSER_BLOCKED=check|block|none
   ```

   `check` means Cloudflare's check held about 15 seconds; `block` means its block page or error 1020. Another site's plain refusal, such as one naming the server's address, counts as `block`. It never runs while a private form is open.
2. **Switch, and say so in one line.** *Uber Eats blocked my browser, so I'm using Cloudflare's.* No retry in its own browser, and no question: a switch costs cents.

   ```bash
   node .claude/skills/browser/scripts/cloud-browser.mjs open   # CLOUD_BROWSER_CDP=ws://127.0.0.1:<port>/<secret>, CLOUD_BROWSER_SESSION=cloud-1
   agent-browser --session cloud-1 --cdp "<CLOUD_BROWSER_CDP>" open https://www.ubereats.com/
   ```

   Every command for that session names both `--session` and `--cdp`: one without `--cdp` starts the agent's own browser instead. `CLOUD_BROWSER_GRANTED=` names a permission your Cloudflare key just gave itself: report it. `CLOUD_BROWSER_NEEDS=` names one to add by hand. `CLOUD_BROWSER_QUOTA=used-up` (exit 3) means the account's cloud browser time is used up: say so plainly, and give [steps to finish it yourself](browsing.md#steps-for-you-to-finish).
3. **Bring the login.** Before opening the site, the agent copies just that site's login in, naming each host it logs in on (Uber Eats signs in on `uber.com`):

   ```bash
   node .claude/skills/browser/scripts/cloud-browser.mjs carry-in --site ubereats.com --site uber.com   # CARRY=done|none|busy
   ```

   Only those sites' cookies and storage move, never another site's login or a check's pass, and the copy is deleted straight after. `busy` means another task holds the personal browser: carry on without the login. A site with nothing to copy, or one that rejects the copy, gets [a saved login, the password link, or a code through the chat](browsing.md#saved-browser-logins), as for any login.
4. **A private form works there too.** Card details or a backup code in the cloud browser go through [the same private form](browsing.md#the-private-form), naming the session: `AGENT_BROWSER_SESSION=cloud-1 AGENT_BROWSER_CDP="<CLOUD_BROWSER_CDP>" node .claude/skills/hand-over/scripts/hand-over.mjs open --form …`. A password link names no session: a saved login works in either browser.
5. **Finish.** The agent copies any refreshed login back, then closes the session:

   ```bash
   node .claude/skills/browser/scripts/cloud-browser.mjs carry-back --site ubereats.com --site uber.com
   agent-browser --session cloud-1 --cdp "<CLOUD_BROWSER_CDP>" close
   node .claude/skills/browser/scripts/cloud-browser.mjs close
   ```

   A session also closes by itself once `agent-browser` lets go of it, or after 30 minutes (`open --minutes N` raises that), even if the chat stops. Cloudflare closes one idle for 10 minutes, say while you think over *Pay now?*: reopen, carry the login in again, and go on, since the cart lives in the account.
6. **Both refused.** When Cloudflare's browser is turned away too, as DoorDash does, the agent stops browsing that site. It gives you [steps to finish it yourself](browsing.md#steps-for-you-to-finish), and sends no private link.

**Cloud first.** Say *use the cloud browser first* and the agent runs `cloud-browser.mjs first cloud`: tasks in every repo on this computer then start there, and a site that refuses it moves to the agent's own browser. `first local` switches back; `first` alone prints `BROWSER_FIRST=`.

## Nothing is disguised

The agent never hides that its browser is automated, changes the browser's identity to pass a check, sends its traffic through someone else's or a hired address, uses a check-solving service, or moves a check's pass from one browser to another. That holds even when you ask, and when you do the tapping: it offers Cloudflare's browser, or the step on your own device.

**What it costs.** The Workers Paid plan includes 10 cloud browser hours a month, then $0.09 an hour; the free plan gives 10 minutes a day. Cloudflare can see the pages in its browser, as it already carries your app and every private link.

Back to [browsing](browsing.md).
