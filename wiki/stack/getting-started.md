# Getting started

WongStack has two explicit setup routes: a [managed hosted project](hosted-projects.md) through the service, or a personal GitHub installation through [the README's three steps](https://github.com/matthewwong525/WongStack#start-in-three-steps).

Managed hosted projects use the existing email and AI sign-in steps. Once enabled, a new project can start without customer GitHub or Cloudflare accounts, tokens or dashboard visits. The first starter serves HTTP and static assets; it does not configure memory, business databases or background jobs. Existing projects keep their route, and choosing GitHub keeps the personal setup below. Managed creation remains disabled until the complete acceptance checks pass.

It assumes you know nothing about Cloudflare, databases, or deployment: where a step needs one of those, the agent handles it and tells you what it did. The runbook the agent follows is [setup's provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md).

Want new projects to start with your own tools and site? [Make WongStack your own](customizing-wongstack.md) explains how to customize a fork and install it through the same easy setup.

## What you'll end up with

- A private address you and allowed teammates can open after email login, like `https://recipe-box.yourname.workers.dev`
- A separate address for every version you're still working on, so you can look at a change before it's real
- A place your data lives, and a practice copy of it that test versions use
- Automatic publishing: when a change is approved, it goes live
- A **starter site**: a working page that lists *Your apps* under a *Make it yours* box. Press **Copy** in that box and paste the message into your chat: the agent gets to know you, asking before it skims your recent chats, then makes the page yours, removes the box, and explains each step as it goes. The site is yours to change, replace, or delete.

## What it costs

For personal GitHub setup, Cloudflare's free tier covers the starter. You need a free Cloudflare account and a free GitHub account. Setup may also install a few free tools it needs — Git, GitHub's app, Node.js, OpenSpec, a browser for the agent, and a tool that sends you a private link to that browser — and it asks before it installs any. Managed projects use the service's platform account; this page does not promise a free managed service or sign up for a paid trial.

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

Personal GitHub setup needs these steps. Each needs you, and the ones marked *browser* open a web page:

1. Install [Claude Code](https://code.claude.com/docs/en/setup) or [Codex](https://developers.openai.com/codex/cli). Its install page may ask you to run one command in a terminal.
2. Get the free [Paseo](https://paseo.sh) app, where you chat. Setup points to it if it's missing, and never installs it for you.
3. Sign up for [GitHub](https://github.com/signup), and approve the sign-in code the agent shows you (*browser*)
4. Say yes to any free tools setup needs to install. An install may show your computer's own permission window.
5. On Windows, approve its permission window if setup needs to turn on the setting for your assistant's folder links. The agent handles the change; you type no command. If your workplace blocks it, ask your IT team for help ([Windows links](../development/required-tools.md#symbolic-links-in-the-agent-folder)).
6. Sign up for [Cloudflare](https://cloudflare.com) (*browser*)
7. Open [the token link](cloudflare-credentials.md#create-the-token), check the two rows, press Create, and paste the token into the chat (*browser*). Cloudflare shows it **once**, so copy it before leaving the page.

The first two happen before the chat exists; the rest happen in one sitting, while the agent waits. There's no "connect your repository" step and setup configures protection automatically. A new Zero Trust account may need its dashboard onboarding completed before setup can continue.

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

1. **List** what this repo created: the production and staging Workers, the two app databases (`<repo>-db` and `<repo>-db-staging`), the `<repo>-deploy` token, any Access application and service token, and the GitHub secrets `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. Include any service token that [`/verify` made for itself](../development/staging-walkthrough.md#when-the-walk-cant-get-in). List the memory store (`<repo>-memory` database and bucket) separately: deleting it destroys what every past session learned, so it is removed only when you name it. Its memory keys live in that database, so they go with it; deleting the production Worker already removed the memory route. Leave every other repo's memory store alone.
2. **Confirm** as a two-option question that names what each side does. Deleting a database destroys its data.
3. **Delete** what this repo created, with the same user token: `DELETE /accounts/{account_id}/workers/scripts/<name>`, `DELETE /accounts/{account_id}/d1/database/<id>`, `DELETE /accounts/{account_id}/tokens/<id>` for the deploy token, `DELETE /user/tokens/<id>` for an old `<repo>-memory` token if one is left, and `gh secret delete` for each secret.
4. **Report** what was removed *and what was skipped*: anything whose name does not match this repo, and anything you declined. Nothing is deleted by guess.

## Next

- The runbook behind setup: [the provisioning runbook](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/references/cloudflare.md).
- What happens each time you push a change: the [D1 pipeline](d1-pipeline.md).
- Back to the stack overview: [Cloudflare stack](README.md).
