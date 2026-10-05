# Make WongStack your own

Your own WongStack fork sets the defaults every new project receives, while each installed project keeps its own site, data, and business knowledge.

```text
WongStack → your fork → easy setup → your project
                 ↑                      ↑
          shared defaults         changes for one business
```

## Choose where to change it

Change an **installed project** when the request is for that business: its home page, a [mini app](mini-apps.md), a tool, or what the assistant knows about the team. Ask for the change through [the usual loop](../development/the-change-loop.md). Later updates preserve its local changes.

Change a **source fork** when every new project should start that way. A fork is your copy of WongStack on GitHub, maintained as a template. It supplies the instructions, starter site, and setup flow. Setup creates a separate project from it; never run `/wong-setup` or `/wong-sync` against the source fork itself.

## Shape your template

[Fork and clone WongStack](https://github.com/matthewwong525/WongStack/blob/main/.github/CONTRIBUTING.md#fork-branch-and-open-a-pull-request), then ask the assistant to change your defaults. For example:

> Make this WongStack template fit a small design studio. Change the starter page and the shared workflow guidance, and keep easy setup working for new projects.

The [payload manifest](../../.agents/skills/wong-sync/references/payload-manifest.md) owns what new projects receive. You can change the workflow skills, shared rules, shipped wiki pages, starter app, and [Cloudflare stack](README.md). When adding a default, update the inventory so setup includes it. A source-only page or script does not reach installed projects just because it exists in the fork.

Keep the [template's release checks](https://github.com/matthewwong525/WongStack/blob/main/wiki/maintaining/README.md) and its blank [environment examples](../development/secrets.md). They help catch missing files, broken links, and secrets before someone installs your version. The existing easy setup uses Cloudflare. Changing the hosting provider means maintaining your own setup and deployment flow too.

## Install your version with one request

Open a folder outside the source checkout in your coding agent, preferably an empty one for the new project. Paste this, replacing `your-name/your-stack` with your fork's owner and repository. Replace `main` if its default branch has another name:

```text
Install WongStack from https://github.com/your-name/your-stack.
Read and follow https://raw.githubusercontent.com/your-name/your-stack/refs/heads/main/.agents/skills/wong-setup/SKILL.md.
```

The assistant resolves your fork's default branch and follows that version's setup guide, tool requirements, payload, and hosting runbook. It runs the same tools, GitHub sign-in, token, hosting, and first-publish flow described in [getting started](getting-started.md). An unavailable fork stops setup with an explanation. A request with no custom source uses the original WongStack.

Each new project gets its own hosting, database, and [memory](../development/memory.md). Setup creates a fresh [install record](../../.agents/skills/wong-sync/references/payload-manifest.md#install-record) naming your fork, its version, and the installed commit. Keep the source's live database IDs, memory bindings, secrets, and install record out of the new project.

An already installed project keeps following its recorded source. A new setup request does not switch it to a different fork.

## Update at two levels

**First update your fork.** Review changes from the original WongStack and bring the useful ones into your source fork, keeping your defaults. Use ordinary GitHub upstream updates and the fork's [change loop](../development/the-change-loop.md); `/wong-sync` is for installed projects. Publish the fork's changes with the [release process](https://github.com/matthewwong525/WongStack/blob/main/.agents/rules/payload.md). [Contributing](../contributing.md) explains how to offer a useful improvement back to WongStack.

**Then update each installed project.** Ask for [`/wong-sync`](../../.agents/skills/wong-sync/SKILL.md) there. It retrieves the project's recorded source, including your fork, and plans its latest changes while keeping the project's local adaptations. You review and publish that update through the same change loop. A source cache containing another repository or local work stays intact; sync uses a separate clean checkout.

Back to [Cloudflare stack](README.md).
