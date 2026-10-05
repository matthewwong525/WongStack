# Kept checks

A kept check is a passed preview check saved in your project, so a later publish can repeat it with no AI. [`/verify`](../../.agents/skills/verify/SKILL.md) keeps and replays them only inside [`/ship`](../../.agents/skills/ship/SKILL.md#step-4--verify-the-preview-evidence-not-a-gate)'s check before publishing.

This page owns the reasons. [The staging walkthrough](staging-walkthrough.md) owns the check itself, and [its reference](../../.agents/skills/verify/references/walkthrough.md#g--kept-checks) owns the commands.

## Why keep a check

Every preview check is written fresh and thrown away, so nothing looks at an old feature again. A change can break one, and nobody hears until someone trips over it. Checking old features afresh with AI each time is too slow: the browser part of a check takes about 16 seconds, and the assistant's writing and reading take the rest (measured on 2026-10-05, over 12 days of chats). A recording replays in seconds.

## What is kept

When the check before publishing passes a promise about a page or a request, it saves a small file: the steps, and what the passing page or answer showed.

- **Where.** `.agents/verification/journeys/<capability>/<id>.json`, beside your [verification recipes](staging-walkthrough.md#adopt-a-ci-capture), one file per scenario. It is saved with your code, because every branch shares one staging and a branch that changes a screen must carry the check that matches it.
- **It points at the written promise, never copies it.** A second copy goes stale when the promise changes. The file holds a fingerprint of the scenario's `THEN`, so a rewritten promise shows.
- **It holds no address.** The preview's address is swapped for `{url}`, so the same file replays against the next preview.
- **It is proven first.** A check is kept only after it replays cleanly once, alone, from fresh sample data. A recording that fails on the next person's publish would cost them a fresh look for nothing. One that fails its proof is named and left out, and the verdict stands.
- **It expects only what was seen.** A page check expects text that showed, text that was gone, or the address it landed on. A request check expects a status or text in the answer. Nothing else: this is a recording, not a test language.

Nothing is installed for this, no AI key is needed, and your project gains no dependency. The set grows from use: a feature that already shipped gets a kept check the next time a change's own check passes one of its promises.

## What is never kept

These stay one-time checks:

- **A check that needed you**: your login, or a [hand-over](browsing.md#hand-the-browser-over). A replay runs unattended.
- **A check that triggers an outside service or a timed job.** A replay must not send a real email twice.
- **A check whose steps hold a password or a key.** The file is saved with your code, where others read it.
- **A check that clicked by a snapshot reference**, like `@e5`. The reference dies with the page.
- **Anything but a page or a request**: a fact read from the database, evidence from the automatic checks, a phone app. A program can't repeat those without the assistant.

## When it replays

Only before publishing, after your change's own checks and their fixes settle, so the replay sees what will go live. A check in the middle of a change stays as fast as today and replays only if you ask.

- **It needs known data.** Staging must have been [rebuilt from the sample data](../stack/d1-pipeline.md#seeded-staging-production-untouched) for this check. Where it can't be, nothing replays and nothing is kept, the report says why, and the verdict is what it would have been.
- **A check that writes starts from a fresh rebuild**, about 13 seconds each, and needs a staging that is [safe to write to](staging-walkthrough.md#why-a-walk-runs-the-way-it-does). Read-only checks run on the data the walk left.
- **It never runs against the live app.** A replay writes, so it stays in staging, in a throwaway browser with no saved login.

### The two-minute limit

The replay stops after 120 seconds, rebuilds included, and gives any one check 30 seconds. That is about six checks that write, or a few dozen that only read. One fixed limit, no setting.

Checks recorded against files your change touched go first. The rest follow in an order that turns with each commit, so every check is reached over several publishes. A check the limit didn't reach is named, and never counts as a pass.

## What each result means

| Replay says | What happens |
|---|---|
| `same` | It is listed as *replayed, unchanged*. What was seen is still seen; the promise was not graded again. |
| `changed` | The assistant takes one fresh look and grades it against the written promise. |
| `skipped` | Your change rewrites that promise, so its own check covers it and keeps it again. A promise your change removes takes its kept check with it. |
| `not-run` | It is named with its reason: the limit, a login wall, an unreadable file, no rebuild. Never a pass, never a failure. |

A fresh look ends one of three ways:

- **The promise still holds and only the page changed**, such as a renamed button. The kept check is replaced and nothing stops.
- **The promise is broken and your change broke it.** The assistant fixes it, saves, and replays that check, without asking, at most twice. It never edits code your change didn't touch: that would turn one change into another.
- **The break survives two tries, or doesn't come from your change.** The check is a failure that names the older promise, and `/ship` asks: fix it first, or publish anyway.

At most three fresh looks per publish. One renamed menu could otherwise send the assistant through every kept check; the rest are named as not checked.

## How a kept check reaches the publish

`/ship` saves the kept checks once more, and publishes that commit only when [the gate](the-change-loop.md#the-gate) passes. The commit changes no code and no promise, so nothing is checked again.

Publishing takes a little longer: up to two minutes of replay, about 15 seconds to prove each new check, and one short save.

To stop, delete `.agents/verification/journeys/`. With no kept checks the check before publishing behaves as before.

## What was declined

- **Adopting a test tool.** [The staging walkthrough](staging-walkthrough.md#what-it-is-not) records why; only the replay idea was taken.
- **Replaying on every save, on every mid-change check, or nightly.** Preview checks already feel long, and the moment that matters is the one before a change goes live.
- **Keeping the checks outside the project.** A store outside git holds one set for every branch, and a branch that changes a screen needs its own.
- **Recording checks for features that already shipped.** A backfill is a long AI run nobody asked for.

Part of [development](README.md).
