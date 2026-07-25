## Context

WongStack's strongest idea is already present in pieces: `wiki/` owns reusable process, OpenSpec owns change-specific plans and decisions, archived changes preserve what shipped, and skills give agents repeatable actions. The public docs do not yet name that system clearly. The README currently leads with app building and Claude Code, while `wong-setup` still foregrounds "fit verdict" language from the 6.0.0 front-door release.

The user wants the docs to present WongStack as the start of an AI-native operating model: centralize team processes first, let agents run those centralized processes, and capture knowledge through the work so future humans and agents move faster.

## Goals / Non-Goals

**Goals:**

- Make "repo-native AI knowledge center" the top-level public framing.
- Explain that agents need shared knowledge to function well, and WongStack gives that knowledge a home.
- Keep the docs approachable for non-technical readers by defining technical terms only after the core idea.
- Make the project agent-agnostic: Claude Code is a convenient starting point, not the product boundary.
- Add a wiki page that owns the philosophy so README and setup docs can link instead of restating it.
- Preserve setup safety: guided questions, consent before file changes, and hard-stop mismatch handling where the workflow cannot operate.

**Non-Goals:**

- Changing the actual command loop or how `/save`, `/ship`, `/continue`, OpenSpec, or git operate.
- Making WongStack a hosted service, SaaS knowledge base, or managed plugin.
- Removing Claude-specific paths where Claude Code is still the native skill host.

## Decisions

### Lead with the knowledge center, not app building

The README should start with what WongStack makes: a repo where team process, active work, shipped decisions, and reusable lessons are written in forms humans can review and agents can run. Internal apps and product work become examples of what the knowledge center helps teams do, not the definition of WongStack.

Alternative considered: keep "building apps" but add knowledge bullets. That still makes the code output sound primary, when the user's desired thesis is that the knowledge layer is the enduring value.

### Add one philosophy page under `wiki/`

The philosophy needs a stable owner because it will inform README, `CLAUDE.md`, setup, `/dream`, and future docs. A single `wiki/agent-knowledge-center.md` page keeps the thesis atomic and linked from `wiki/README.md`.

Alternative considered: fold the philosophy into `wiki/README.md`. That would overload the hub; the hub should route readers, while the philosophy page owns the explanation.

### Keep setup guided, but reduce admissions-test language

`wong-setup` should still research the repo, ask useful questions, and stop on hard mismatches. The public and runbook wording should frame that as guided onboarding and process alignment, not a product that keeps asking whether it is allowed to exist.

Alternative considered: remove all mismatch handling. That would make setup less honest when a repo has no git, no compatible forge, or a locked-in workflow the skills would fight.

### Preserve agent agnosticism with file-based language

Docs should say Claude Code is one way to run WongStack, while the durable interface is Markdown files, repo instructions, skills, and shell/file operations. Where `.claude/skills/` is still named, explain it as Claude Code's native location and offer agent pointers such as `AGENTS.md`.

Alternative considered: rename `.claude/skills/` or hide Claude references. That would misrepresent the current implementation.

## Risks / Trade-offs

- **"AI knowledge center" could sound vague** -> Pair the phrase with concrete repo surfaces: agent instructions, wiki, active changes, archived changes, and skills.
- **Less fit language could overpromise setup** -> Keep hard mismatch exits in `wong-setup`, but move them out of the README's core pitch.
- **Agent-agnostic copy could imply every agent has native skill support** -> State the practical minimum: an agent that can read files, edit files, and run shell commands.
- **New wiki philosophy could duplicate `wiki-style.md`** -> Keep `agent-knowledge-center.md` focused on why the system exists; link to `wiki-style.md` for how the wiki is structured.
