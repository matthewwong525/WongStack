# Tasks

## 1. The browser skill and its script

- [x] 1.1 Create `.agents/skills/browser/SKILL.md`, hidden with `disable-model-invocation` like `hand-over`, pointing to `scripts/cloud-browser.mjs` and to [browsing.md](../../../wiki/development/browsing.md) as the procedure's home. Leave `.agents/skills/agent-browser/SKILL.md` untouched. Verify `git diff` shows no change to the agent-browser stub.
- [x] 1.2 Add `cloud-browser.mjs open [--minutes N]`: read `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` through the memory skill's primary-worktree `.env` reader; start the detached loopback bridge on `127.0.0.1:<free port>/<secret>` that adds the `Authorization` header and `keep_alive=600000` to the Browser Run upgrade and pipes bytes both ways; print `CLOUD_BROWSER_CDP=` and `CLOUD_BROWSER_SESSION=`. Verify with a fake TLS/WebSocket upstream in `scripts/tests/cloud-browser.test.mjs` that the header arrives, the token appears in no output or argv, and a wrong secret path is refused.
- [x] 1.3 Add bridge lifetime and `close`: exit on `close`, on the last client leaving after one connected, or at the deadline (default 30 minutes), closing the upstream each time. Verify all three exits in the test with a shortened deadline.
- [x] 1.4 Add the one-group widen on a first `401` or `403`: resolve `Browser Run Write` by name, keep `resources` and both API-token grants, `PUT`, retry with the documented backoff, and print `CLOUD_BROWSER_GRANTED=`. Name Browser Run's quota error in plain words. Verify with a fake Cloudflare API that the PUT body keeps every existing policy and the two grants, a late-propagating grant succeeds, and a final refusal lists the permission to add by hand.
- [x] 1.5 Add `check [--session s]`, printing `BROWSER_BLOCKED=check|block|none` from the page's title and first visible text only, with the check held about 15 s before it counts. Verify against saved fixture texts for Cloudflare's challenge, block page, error 1020, and an ordinary page.
- [x] 1.6 Add `carry-in --site <host>…` and `carry-back --site <host>…`: `state save` into a 0700 temp dir, keep only cookies and storage for the named hosts and their subdomains, drop the listed challenge cookies (Cloudflare, Akamai, DataDome, PerimeterX, Imperva), `state load` into the other session, and delete the temp dir in a `finally`. A busy personal profile prints `CARRY=busy` and never touches its lock. Verify with fixture state files that another site's cookies and every challenge cookie are dropped, the temp dir is gone after success and after a thrown load, and a locked profile gives `busy`.
- [x] 1.7 Add `first [local|cloud]`, reading and writing `~/.wong-stack/browser.json` and keeping other keys; a missing file reads `local`. Verify both values and the missing-file case.

## 2. Provisioning grants Browser Run

- [x] 2.1 Add `Browser Run Write` (account scope) to `NORMAL_PROVISION` in `.agents/skills/wong-setup/scripts/provision.mjs` and to the table in `references/permission-groups.md`, with the id read from the live API (`adddda876faa4a0590f1b23a038976e4` on 2026-09-30). Verify `scripts/tests/provision.test.mjs` passes with the tables and the script in agreement, including a widen fixture that grants the new group.

## 3. Wiki and payload

- [x] 3.1 Update `wiki/development/browsing.md`: a new section on when a site blocks the agent's browser (the switch, the one-line notice, the login carry-over for one site, both-refused leading to the person's own device, the setting, Cloudflare's allowance and cost); the hand-over *When* bullet sending a Cloudflare check to the fallback, not a link; and the no-disguise rule, kept in one place and linked. Verify the page keeps one home per fact and `node scripts/check-payload-links.mjs` passes.
- [x] 3.2 List the `browser` skill in the payload manifest's core line and add a `## Next (minor)` CHANGELOG entry in plain words, noting the permission an existing install grants itself on first use and the Workers plan allowances; leave VERSION alone. Verify `node scripts/check-openspec-config.mjs` and `node scripts/measure-context.mjs --check` pass.
- [x] 3.3 Comment on [vercel-labs/agent-browser#1642](https://github.com/vercel-labs/agent-browser/issues/1642) with the Browser Run use case, only after the owner says yes in chat (outward). Verify the comment link, or record the no.

## 4. Real checks

- [x] 4.1 On this server, open Browser Run through the bridge and load Grillies on Uber Eats with `agent-browser --cdp`, and show a picture of the menu in chat. Verify `check` reports `none` there and `check` in the agent's own browser reports `check`.
- [x] 4.2 Record the real checks the owner chose to skip on 2026-09-30 (a login carried into the cloud browser, a hand-over on a phone showing the cloud browser, a real order) as one open memory thread, so the next real Uber Eats task checks them. The hand-over link on the cloud session did start and print its link; nobody used it. Verify the thread is in the memory store.
- [x] 4.3 Validate with `openspec validate cloud-browser-fallback --strict --no-interactive`, rebuild `review.html`, and leave the test suite to `/save`'s CI gate. Verify the page is current.
