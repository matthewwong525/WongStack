# The hosted app's archive

The hosted WongStack app at wongstack.com was shut down on 2026-10-04, and its repo, [`matthewwong525/wongstack-cloud`](https://github.com/matthewwong525/wongstack-cloud), is kept read-only. wongstack.com now shows [the landing page](landing-page.md). This page says what is gone, what is kept, and where.

## What is gone

- **The app.** Sign-in, plans, and rented servers, with its production and practice Workers, their databases, and the test-mail inbox.
- **Its practice site.** No staging address exists, so nothing can be walked there.
- **Its keys.** The publish key, the repo's GitHub secrets, and the key files in the checkout.

No customer existed: live Stripe never took a payment.

## What is kept

- **The repo**, archived on GitHub. Reading works; a save needs it unlocked in its settings first.
- **Its memory**: the database and bucket named `wongstack-cloud-memory`, in the same Cloudflare account as this repo's. Nothing serves them, because [the memory route](../development/memory.md#the-memory-key) lived in the app's Worker. Read the database directly, or attach both to a Worker again.
- **A copy of the production database**, a file beside the checkout on the maintainer's server. Its sealed values can not be opened: the sealing key was deleted.
- **Two servers in the practice Hetzner project.** The app never managed them. They still run and bill.
- **Two empty Artifacts namespaces**, `ha-83ec40bf` and `wongstack`. Cloudflare has no way to delete a namespace, and an empty one costs nothing.
- **Mail to `support@wongstack.com`**, which the domain forwards to the owner. No other address at the domain receives mail.

## The Stripe account is shared

The Stripe account named WongStack also sells an older product, Premium Report. The app's products, prices, and webhooks are switched off, not deleted. Never close the account or replace its live key for WongStack's sake without checking what else uses it.

## Never publish the archive as it is

The archive's deploy config still claims `wongstack.com` and `www.wongstack.com`. A publish from it would take both names from the landing page. Its workflows are off and its key is deleted, so that takes three deliberate steps; remove the two names from its config before any of them.

Part of [maintaining WongStack](README.md).
