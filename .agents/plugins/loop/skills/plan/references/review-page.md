# The plan's review page

What a plan's `review.html` shows. Write each fence by [the drawing guide](drawings.md); the builder stops on any it can't carry, naming it.

## A card shows the closest real result

A changed screen shows *Before*, today's screen, and one *After* per state from [the prototype](prototypes.md), with *Try it* when online. A site this app doesn't run shows a `live` card of [its prototype](#a-website-prototype). Words to send are the real words.

## The review file

A sketch holds each screen and empty, loading, or error state of the flow, with one primary action, real labels, and phone layout first when the brief says phone. Pictures are phone width, visible part only, under 300 KB, with no private data.

## A website prototype

Write the site in `openspec/changes/<change>/prototypes/<site>/`, `index.html` first, fonts and pictures copied in. Notes change those files; the build starts from them.

## What the build needs

Every plan has `## What the build needs` after What Changes, one bullet a thing. Check each first: a key in the service list or `.env`, a sign-in by opening the site; found or answered in the chat → *Ready*. A *Needs you* item holds its `form` fence, never for a secret, or one `https` link, such as a key's private link. Nothing needed → `- **Nothing.**` An open need stops the build.
