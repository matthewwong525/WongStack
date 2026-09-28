# Design

## Context

`.agents/skills/agent-browser/SKILL.md` is agent-browser's upstream discovery stub. Its body says: before any command, run `agent-browser skills get core` (add `--full` for the command reference). WongStack adds `disable-model-invocation: true`, so no session lists the skill and no agent reads the stub. The two places that drive the browser never mention the guide:

- `.agents/skills/verify/references/walkthrough.md`, *Browser journey → `<id>.batch.json`*, shows one example array.
- `wiki/development/home.md`, *Saved browser logins*, names `stream enable` and `dashboard start` only.

The installed CLI is 0.38.1, the latest on npm (checked 2026-09-28). Its `skills/agent-browser/SKILL.md` differs from ours by one added line, `agent-browser skills get protected-vercel-deployments`, plus our local frontmatter line.

## Goals / Non-Goals

**Goals:** the two driving surfaces load the version-matched guide first; the stub equals upstream 0.38.1 plus its one local edit.

**Non-Goals:** unhiding the skill; copying guide content into the repo; new probes or specialized skills (dogfood, a11y) that were deliberately not adopted.

## Decisions

- **Point, don't copy.** Each surface adds one sentence: run `agent-browser skills get core` before writing commands, `--full` for the command reference. The CLI serves content for the installed version; a copy would go stale at the next release. Alternative rejected: unhide the skill, which would put a 600+ character description in every session and let it trigger on unrelated web tasks.
- **Refresh by copying upstream verbatim.** Take `skills/agent-browser/SKILL.md` from `npm pack agent-browser@0.38.1`, then re-add `disable-model-invocation: true` after `hidden: true`, per the payload rule. No hand edits to the body.
- **The walkthrough owns `/verify`'s pointer; home owns personal browsing's.** One sentence each, at the point of need, so no fact lives twice.

## Risks / Trade-offs

- `skills get core` costs context on each walk. It is loaded only when a browser journey exists, which already installs the browser, so a walk with no UI journey pays nothing.
- The guide's content is outside our control. The batch driver still feeds commands unread and grades evidence against the THEN, so a bad command fails the journey visibly rather than silently.
