# Getting started

From nothing to a website other people can open, in five steps. Three of them are answering questions.

This page is for the person doing it. It assumes you know nothing about Cloudflare, databases, or deployment — where a step needs one of those, the agent handles it and tells you what it did. The runbook the agent follows is [setup's provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md).

## What you'll end up with

- A live address anyone can open, like `https://recipe-box.yourname.workers.dev`
- A separate address for every version you're still working on, so you can look at a change before it's real
- A place your data lives, and a practice copy of it that test versions use
- Automatic publishing: when a change is approved, it goes live

## You don't need to have built anything yet

This works from an empty folder. If your project doesn't have a website in it yet, saying yes in step 1 also gets you a **starter site** — a working page with a button on it that talks to your data. It's yours from the moment it lands; change it, replace it, or delete it.

You don't choose this separately and there's nothing to configure. The agent looks at your project, and if there's nothing to publish yet, the starter site is simply part of what "yes" gives you. If your project *does* already have a website, it's left completely alone — the agent never touches, moves, or overwrites what you built.

What lands with the starter site is the page itself and the code that serves it. The one thing it can't bring is the file that says *which* data storage to connect to, because those names and ids don't exist until your account does — so [step 5](#5-wait-about-a-minute) writes that file, wiring the site to the storage it just made. That's why there's nothing for you to fill in.

## What it costs

Cloudflare's free tier covers all of this. You need a free Cloudflare account and a free GitHub account. Nothing installs on your computer beyond the coding agent you're already using.

## The five steps

### 1. Paste the prompt

Make an empty folder, open it in your coding agent, and paste the setup prompt from [WongStack's README](https://github.com/matthewwong525/WongStack#readme). Setup starts from an empty folder; in a folder that already has files, it stops and says so. The agent asks for the Cloudflare key first (steps 3 and 4), then asks a few questions about how you like to work, and sets up the shared knowledge, the workflows, a starter site, and its hosting.

**You do:** answer a few questions.

### 2. Sign in to GitHub

GitHub is where your project lives and where changes get reviewed. If you're not already signed in, the agent opens a browser page and asks you to approve.

**You do:** click approve in the browser.

> Approve everything it asks for on that screen, including permission to add automated steps. Skipping that one causes a confusing error much later.

### 3. Make a Cloudflare account

Go to [cloudflare.com](https://cloudflare.com) and sign up. Free tier is fine.

**You do:** sign up.

### 4. Create one key and paste it

Cloudflare needs to give your agent permission to set things up on your behalf. That's a "token" — a long password-like string.

**You do:** follow the [exact click path](cloudflare-credentials.md#create-the-token), then paste the token when the agent asks.

Two things worth knowing before you click:

- Cloudflare shows you the token **once**. Copy it before leaving that page.
- There is a field called **Account Resources** near the bottom. Set it to include your account. It's the step people miss, and skipping it produces a token that looks fine and does nothing.

If you get it wrong, the agent will tell you which specific field to change — and usually you can edit the token you already made rather than starting over.

### 5. Wait about a minute

The agent does the rest: gives itself the permissions it needs, sets up your data storage and its practice copy, connects the publishing pipeline, and puts your project online.

**You do:** nothing. It'll hand you the address at the end.

Open it. If you took the starter site, the page loads and has a button that fetches something live from your project — clicking it is the proof that the whole chain works: your address, your code, your data storage. If it answers, you're online.

## After that: how you work

You never need to run anything on your own computer.

```
   ask for a change  →  agent builds it  →  /save  →  you get a link
                                                       ↓
                                              open it, look at it
                                                       ↓
                                              happy? /ship  →  it's live
```

Each change gets its own link, running against the practice data. Your real site keeps working the whole time, untouched, until you ship.

## Honest list of what you have to do yourself

Nothing here can be automated — they all need a human with a browser:

1. Sign up for GitHub, and approve the permissions screen
2. Sign up for Cloudflare
3. Create the token and paste it

Three things, all in one sitting. There's no "connect your repository" step and no dashboard configuration — those are avoided by design.

## If you want a login wall

By default your site is **public** — anyone with the link can open it. Plenty of projects want that.

If you'd rather people sign in first, say so and the agent sets it up. It needs no extra permissions from you up front, which is why it isn't part of the steps above. See [Cloudflare Access](cloudflare-access.md).

## When something goes wrong

Almost every failure at setup traces to the token: it was made in the wrong place (use **My Profile**, not the account area), or the **Account Resources** field was left blank (edit the token you already made — no new one needed). Both are covered on [the credentials page](cloudflare-credentials.md). The agent translates Cloudflare's error codes into plain language, so if you see a raw code, ask it what that means.

## Teardown

Setup creates real resources on your Cloudflare account. To remove them, for example after a test, ask your agent to tear the project down. It follows these steps:

1. **List** what this repo created: the production and staging Workers, the two app databases (`<repo>-db` and `<repo>-db-staging`), the `<repo>-deploy` token, any Access application and service token, and the GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Include any service token that [`/verify` made for itself](../development/staging-walkthrough.md#when-the-walk-cant-get-in). List the memory store (`<repo>-memory` database and bucket) separately: deleting it destroys what every past session learned, so it is removed only when you name it. Its memory keys live in that database, so they go with it; deleting the production Worker already removed the memory route. Leave every other repo's memory store alone.
2. **Confirm** as a two-option question that names what each side does. Deleting a database destroys its data.
3. **Delete** what this repo created, with the same user token: `DELETE /accounts/{account_id}/workers/scripts/<name>`, `DELETE /accounts/{account_id}/d1/database/<id>`, `DELETE /accounts/{account_id}/tokens/<id>` for the deploy token, `DELETE /user/tokens/<id>` for an old `<repo>-memory` token if one is left, and `gh secret delete` for each secret.
4. **Report** what was removed *and what was skipped*: anything whose name does not match this repo, and anything you declined. Nothing is deleted by guess.

## Next

- The runbook behind these steps: [the provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md).
- What happens each time you push a change: the [D1 pipeline](d1-pipeline.md).
- Back to the stack overview: [Cloudflare stack](README.md).
