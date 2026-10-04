# The hosted app's archive

The hosted WongStack app that ran at wongstack.com was shut down on 2026-10-04, and its repo is kept as a private, read-only archive. wongstack.com now shows [the landing page](landing-page.md). This page says what is gone, what is kept, and the one thing never to do with the archive.

## What is gone

- **The app.** Sign-in, plans, and rented servers, with its production and practice sites and their databases.
- **Its practice site.** No staging address exists, so nothing can be walked there.
- **Its keys.** The publish key, the repo's secrets, and the key files in its checkout.

No customer existed: no payment was ever taken.

## What is kept

- **The repo**, archived. Reading works; a save needs it unlocked in its settings first.
- **Its memory**: the archive's own memory database and bucket, in the same Cloudflare account as this repo's. Nothing serves them, because [the memory route](../development/memory.md#the-memory-key) lived in the app's Worker. Read the database directly, or attach both to a Worker again.
- **Mail to the support address**, which the domain forwards to the owner. No other address at the domain receives mail.

The rest of what was kept, and where, is in [session memory](../development/memory.md): search it for the hosted app's shutdown.

## Never publish the archive as it is

The archive's deploy config still claims `wongstack.com` and `www.wongstack.com`. A publish from it would take both names from the landing page. Its workflows are off and its key is deleted, so that takes three deliberate steps; remove the two names from its config before any of them.

Part of [maintaining WongStack](README.md).
