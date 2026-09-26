# Home

Home is the WongStack repo for one person's own life: an ordinary full install, recorded once per machine so that every other repo can reach it. It has no mode. It follows the [same rules](../../CLAUDE.md#rules) as every repo — plain requests done directly, code through [the change loop](the-change-loop.md), [repeatable knowledge](../wiki-style.md#repeatable-knowledge) written when learned. Home differs only in what other repos read from it and send to it.

## The machine record

One person uses each computer, so each machine has at most one home. Its absolute path lives in `~/.wong-stack/machine.json`:

```json
{ "home": "/Users/ana/home" }
```

[`/wong-setup`](https://github.com/matthewwong525/WongStack/blob/main/.agents/skills/wong-setup/SKILL.md) asks whether a new repo is your home, suggests `~/home`, and writes this file; it asks before it replaces another home. To make an existing repo home, write its path here yourself. The path must hold a WongStack install with a [memory store](memory.md); anything else counts as no home, and nothing fails. Delete the file, and every repo stops reading home.

## What every repo reads from home

When a session starts in any other repo, the digest gets a short **From home** part, built by code with no model:

- **Your page:** the file under home's `wiki/people/` that lists home's `git config user.email`, up to 4 KB. Your work email can differ; list every email you use on that page ([people pages](../wiki-style.md#people)).
- **Your facts:** the live `user` and `feedback` facts in home's store, up to 15 lines and 3 KB.

It reads home's own install record and home's own `.env` token, so no token is copied and no database is added. When home's store does not answer, the part says so in one line; your page still shows, because it is read from disk. In home itself, the part holds only your page, because home's facts are already in the digest. With no home recorded, there is no part; with no page for you yet, it shows only your facts.

## What every repo sends to home

A fact about your private life — health, family, money, personal plans — never goes to another repo's store. Capture sends it to home's store with `memory.mjs put-facts --home` ([the memory skill](../../.agents/skills/memory/SKILL.md#write)). When home's store does not answer, the fact waits in home's local spool, and home's next session start sends it. With no home recorded, the fact is dropped. The same rule keeps private life out of every wiki but home's ([where a fact goes](../wiki-style.md#where-a-fact-goes)).

## Saved browser logins

The agent reaches your accounts (mail, calendar, banking) through [agent-browser](https://github.com/vercel-labs/agent-browser), not through connectors. A persistent Chrome profile keeps your logins across restarts, for every repo on the machine.

1. **The first login sets the profile.** When a task meets a login and `~/.agent-browser/config.json` has no `"profile"`, the agent adds `"profile": "<your home folder>/.wong-stack/browser-profile"` as an absolute path, keeps every other key, and creates the folder. This is a standing permission to edit that one file; the agent does not ask. It never changes a `profile` that is already set.
2. **You log in once.** The agent hands you the browser — for example with `agent-browser stream enable` or `agent-browser dashboard start` — and waits until you say the login is done. It never asks for a password in chat or writes one to a file.
3. **Later tasks reuse the session.** No login step, until the site logs you out.

**One personal browsing task at a time.** Chrome lets only one browser use a profile at a time, so a browsing task and a scheduled run must not use it at the same moment. A task that finds the profile busy waits or reports it; it never deletes the profile's lock. [`/verify`](staging-walkthrough.md) is not affected: each walk uses its own temporary profile, so a preview check never carries your logins.

Back to [Working on WongStack](README.md).
