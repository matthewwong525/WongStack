---
title: One change takes down your live website
problem: Your AI edits the live site directly, and one bad change breaks it for everyone.
fix: Every change is checked, then you see a test copy, then you say publish.
order: 4
checked: 2026-10-31
sources:
  - wiki/development/the-change-loop.md
  - wiki/development/staging-walkthrough.md
  - wiki/development/kept-checks.md
---
Add a safe way to publish changes to my AI setup. Build it in this project and ask me before anything you can't undo:

> Never edit the live site directly: every change goes on its own branch
> Each branch opens a pull request, so every change is one package to review
> Automatic checks run on every push: tests, lint, and a build
> When there are no checks, a person reviews the pull request instead
> Run the same checks on this computer first, as a quick pre-check, never as the final word
> Every push deploys a private test copy of the site, with its own link
> The test copy uses its own sample data and its own keys, never the live ones
> Before publishing, walk the test copy the way a person would: open pages, click, fill forms
> Check each promise the plan wrote down, and attach screenshots as evidence
> A promise no check can reach is listed as unverified, never as a pass
> Save each passed walk as a recording, and replay the recordings before each publish, so old features don't break quietly
> Keep the replay short, with a time limit, and name any check it didn't reach
> A failed check stops the publish; fix it in the same change, at most twice, then ask me
> Removing or loosening a check needs a written reason in the plan
> Publish only when I say yes, and only after the checks pass
> After publishing, take one look at the live site, and change nothing there
> If the live site breaks, say so in the same chat and offer one fix
> For more context, look at this repo: https://github.com/matthewwong525/WongStack (start at wiki/development/the-change-loop.md)
