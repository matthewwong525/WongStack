# Getting started

You install WongStack from your own computer, into accounts you own, through [the README's three steps](https://github.com/matthewwong525/WongStack#start-in-three-steps).

Setup assumes you know nothing about Cloudflare, databases, or deployment: where a step needs one of those, the agent handles it and tells you what it did. The runbook the agent follows is [setup's provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md).

Want new projects to start with your own tools and site? [Make WongStack your own](customizing-wongstack.md) explains how to customize a fork and install it through the same easy setup.

## What you'll end up with

- A private address you and allowed teammates can open after email login, like `https://recipe-box.yourname.workers.dev`
- A separate address for every version you're still working on, so you can look at a change before it's real
- A place your data lives, and a practice copy of it that test versions use
- Automatic publishing: when a change is approved, it goes live
- A **starter site**: a working page that lists *Your apps* under a *Make it yours* box. Press **Copy** in that box and paste the message into your chat: the agent gets to know you, asking before it skims your recent chats, then makes the page yours, removes the box, and explains each step as it goes. The site is yours to change, replace, or delete.

## What it costs

WongStack is free. You install it one of two ways, and one of them costs money:

| | Free way | Cloudflare alone |
|---|---|---|
| Accounts | a free GitHub account and a free Cloudflare account | a Cloudflare account |
| Cost | free | Cloudflare's paid plan, about $5 a month |
| Computers | Mac, Windows, or Linux | Mac or Linux |

On Mac or Linux, setup offers Cloudflare alone first, and asks which you want before anything costs money. [The Artifacts route](artifacts-route.md#what-it-costs) has the detail.

You bring your own assistant, on a plan of your own, such as Claude or ChatGPT. For future work, [host schedules](host-schedules.md) use an existing clock after checking its access and uptime needs. Setup may also install a few free tools it needs — Git, Node.js, OpenSpec, a browser for the agent, a tool that sends you a private link to that browser, and, on the free way, GitHub's app — and it asks before it installs any.

## After that: how you work

You never need to run anything on your own computer.

**Ask for anything.** Look something up, plan your week, draft a message, or remind you on a schedule. The agent does it and answers, with no commands. It asks before it sends or changes anything outside the chat. What it learns about you stays for next time, in [memory](../development/memory.md) and [the wiki](../README.md).

**Give it a key** when your app should use another service, such as maps or payments. The assistant sends a private link to paste it into; [API keys](api-keys.md) says what happens next.

**Ask for a small tool** — a tip splitter, a run log — and it goes through the same steps as any change below: a plan, a link to try it, then publish. [Mini apps](mini-apps.md) has the details.

**Change the site itself** through a short, reviewable loop:

```
   ask for a change  →  read the plan  →  agent builds it  →  you get a link
                                                                 ↓
                                                        open it, look at it
                                                                 ↓
                                                        happy? publish  →  it's live
```

Each change gets its own link, running against the practice data. Your real site keeps working the whole time, untouched, until you publish.

## Honest list of what you have to do yourself

Setup needs these steps. Each needs you, and the ones marked *browser* open a web page:

1. Have an assistant that can work on your computer, such as [Claude Code](https://code.claude.com/docs/en/setup) or [Codex](https://developers.openai.com/codex/cli). Its install page may ask you to run one command in a terminal.
2. Say yes to any free tools setup needs to install. An install may show your computer's own permission window.
3. On Windows, approve its permission window if setup needs to turn on the setting for your assistant's folder links. The agent handles the change; you type no command. If your workplace blocks it, ask your IT team for help ([Windows links](../development/required-tools.md#symbolic-links-in-the-agent-folder)).
4. Sign up for [Cloudflare](https://cloudflare.com) (*browser*)
5. Open [the token link](cloudflare-credentials.md#create-the-token), check the two rows, press Create, and paste the token into the chat (*browser*). Cloudflare shows it **once**, so copy it before leaving the page.
6. On Mac or Linux, choose where your project is kept when setup asks: turn on Cloudflare's paid plan (*browser*, needs a card), or say GitHub. [What it costs](#what-it-costs) compares the two.
7. On the free way, sign up for [GitHub](https://github.com/signup), and approve the sign-in code the agent shows you (*browser*). On Windows, or when you asked for GitHub at the start, this comes before step 4.

The first happens before the chat exists; the rest happen in one sitting, while the agent waits. Nobody does all seven: step 3 is for Windows, step 6 for Mac or Linux, and step 7 for the free way. A chat app is optional: [required tools](../development/required-tools.md) says what one adds. There's no "connect your repository" step and setup configures protection automatically. A new Zero Trust account may need its dashboard onboarding completed before setup can continue.

## If you want a login wall

Your business site and previews require email login automatically. Setup needs a reachable owner email; git’s private author address is a separate setting.

Setup creates the login wall; [Cloudflare Access](cloudflare-access.md) explains teammate and machine access.

## When something goes wrong

Almost every failure at setup traces to the token.

- **The link opened a form with a row missing, or no form at all.** Make the token by hand with [the click path](cloudflare-credentials.md#if-the-link-doesnt-work).
- **It was made in the wrong place.** Use **My Profile**, not the account area; the link always opens the right one.
- **The Account Resources field was left blank** on a hand-made token. Edit the token you already made; no new one needed.

[The credentials page](cloudflare-credentials.md) covers each. The agent translates Cloudflare's error codes into plain language, so if you see a raw code, ask it what that means.

## Teardown

Setup creates real resources on your Cloudflare account. To remove them, for example after a test, ask your agent to tear the project down. It follows these steps:

1. **List** what this repo created: the production and staging Workers, the two app databases (`<repo>-db` and `<repo>-db-staging`), the `<repo>-deploy` token, any Access application and service token (the service token is named for the application's id, not the repo, so find it by the id in the install record), and the GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Include any service token that [`/verify` made for itself](../development/staging-walkthrough.md#when-the-walk-cant-get-in). List the memory store (`<repo>-memory` database and bucket) separately: deleting it destroys what every past session learned, so it is removed only when you name it. Its memory keys live in that database, so they go with it; deleting the production Worker already removed the memory route. Leave every other repo's memory store alone.
2. **Confirm** as a two-option question that names what each side does. Deleting a database destroys its data.
3. **Delete** what this repo created, with the same user token: `DELETE /accounts/{account_id}/workers/scripts/<name>`, `DELETE /accounts/{account_id}/d1/database/<id>`, `DELETE /accounts/{account_id}/tokens/<id>` for the deploy token, `DELETE /user/tokens/<id>` for an old `<repo>-memory` token if one is left, and `gh secret delete` for each secret.
4. **Report** what was removed *and what was skipped*: anything whose name does not match this repo, and anything you declined. Nothing is deleted by guess.

An install with an older cloud runner keeps it until explicitly removed: [legacy teardown](legacy-cloud-schedules.md#tear-it-down) covers its Worker, AI Gateway, and dedicated keys. New schedules install no runner.

## Next

- The runbook behind setup: [the provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md).
- What happens each time you push a change: the [D1 pipeline](d1-pipeline.md).
- Back to the stack overview: [Cloudflare stack](README.md).
