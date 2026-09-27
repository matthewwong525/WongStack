## Context

Source words on `main` at 25.8.0: 13,540 in the 14 `SKILL.md` files (ship 1,776, continue 1,436, save 1,347, improve 1,233, apply 1,144, memory 1,093, verify 1,057, plan 1,031, explore 732, wong-setup 689, wong-sync 592, routine 567, agent-browser 476, update-dependencies 367) and 15,674 in `references/*.md` (largest: wong-setup/cloudflare 2,831, wong-sync/stack-pack-fragments 2,106, verify/walkthrough 2,012, wong-sync/payload-manifest 1,521). `scripts/measure-context.mjs` counts the verb skills and their owners.

## Decisions

- **One editing pass per skill, by fixed rules.** For each file:
  1. A rule another page owns becomes one link: the preconditions line, the default-branch line, the ask-format line, the selection rungs, and "git stays with the git verbs" each have one owner today and are restated in five to nine skills.
  2. A reason the wiki already gives is cut; keep a short *because* only where the step is otherwise surprising.
  3. One example, not several. Parenthetical asides and "e.g." lists go unless they carry a rule.
  4. [Our voice](../../../wiki/voice.md)'s delete-on-sight list and its 20% read-back test apply to every sentence.
- **What never changes:** frontmatter `name` and `user-invocable`; every command, flag, path, identifier, and quoted string; every heading another page links to (the payload link check lists the anchors); the order of steps; every authorization and stop condition. A `description` may be shortened only if it keeps its trigger words.
- **Largest first.** ship, continue, save, improve, apply, memory, verify, plan, then the rest, so the biggest savings land even if review asks for changes to later ones.
- **Check each skill against its specs.** Before moving on, read the spec requirements that name the skill and confirm each still has its text in the rewrite.

## Risks / Trade-offs

- A cut loses a rule the agent relied on → the spec read-through per skill, the payload tests, and review of the diff by skill. A reviewer can ask for any one skill back.
- Installed repos with locally adapted skills get merge conflicts → the changelog names it, and `/wong-sync` already plans conflicts through the normal loop.
