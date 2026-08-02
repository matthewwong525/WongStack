# Getting started

From nothing to a website other people can open, in five steps. Three of them are answering questions.

This page is for the person doing it. It assumes you know nothing about Cloudflare, databases, or deployment — where a step needs one of those, the agent handles it and tells you what it did. The runbook the agent follows is [`/wong-cloudflare`](../../.claude/skills/wong-cloudflare/SKILL.md).

## What you'll end up with

- A live address anyone can open, like `https://recipe-box.yourname.workers.dev`
- A separate address for every version you're still working on, so you can look at a change before it's real
- A place your data lives, and a practice copy of it that test versions use
- Automatic publishing: when a change is approved, it goes live

## What it costs

Cloudflare's free tier covers all of this. You need a free Cloudflare account and a free GitHub account. Nothing installs on your computer beyond the coding agent you're already using.

## The five steps

### 1. Paste the prompt

Open your project folder in your coding agent and paste the setup prompt from the [README](../../README.md). The agent reads your project, asks a few questions about how you like to work, and sets up the shared knowledge and workflows.

**You do:** answer a few questions.

At some point it asks whether you want this to be a real website people can visit. Say yes — that's what turns on everything below. (Saying no is fine too: ask for `/wong-cloudflare` any time later and it makes the same offer, sets everything up, and puts you online.)

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

## Next

- The runbook behind these steps: [`/wong-cloudflare`](../../.claude/skills/wong-cloudflare/SKILL.md).
- What happens each time you push a change: the [D1 pipeline](d1-pipeline.md).
- Back to the stack overview: [Cloudflare stack](README.md).
