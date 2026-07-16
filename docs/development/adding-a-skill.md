# Adding a skill to the payload

Adding a skill to WongStack means creating it under [`.claude/skills/`](../../.claude/skills/) and wiring it through every surface that installs, versions, and advertises the payload — so [`/install-wong-stack`](../../.claude/skills/install-wong-stack/SKILL.md) copies it into target repos, the updater can explain it, and the docs and READMEs still match reality. It's a [release](README.md), so it ends with a version bump and a changelog entry.

Work through it in order:

1. **Create the skill.** Add `.claude/skills/<name>/SKILL.md` with YAML frontmatter — `name`, a trigger-rich `description` (the text an invocation is matched against, so pack it with the phrasings that should fire the skill), and `user-invocable: true` — following an existing skill like [`document`](../../.claude/skills/document/SKILL.md) or [`save`](../../.claude/skills/save/SKILL.md) for shape. Add a `references/` folder for supporting material the skill reads (as [`document`](../../.claude/skills/document/) does), a `scripts/` folder for helpers it runs (as [`save`](../../.claude/skills/save/) does), and/or an `agents/` folder of subagent briefs the skill spawns (as [`ship`](../../.claude/skills/ship/agents/) does for its parallel quality gate), only if the skill needs them. Reference repo files by **repo-relative path** — `$(git rev-parse --show-toplevel)/…` — never an absolute path or `${CLAUDE_PLUGIN_ROOT}`, because the same skill runs from whatever repo installed it.

2. **Wire it into the installer.** [`/install-wong-stack`](../../.claude/skills/install-wong-stack/SKILL.md) copies the payload *minus itself* into target repos and later updates it, so a new skill has to appear in **four** places or it won't be installed and kept current:
   - the frontmatter `description`'s skills list,
   - the [Step 1](../../.claude/skills/install-wong-stack/SKILL.md#step-1--deep-research-the-target-repo) research **collision list** — the skills the installer checks a target repo for,
   - the [Step 3F](../../.claude/skills/install-wong-stack/SKILL.md#step-3f--fresh-install) **fresh-install list**,
   - the [Step 4](../../.claude/skills/install-wong-stack/SKILL.md#step-4--manifest) **manifest `skills` array**.

3. **Cut the release.** Bump [`VERSION`](../../VERSION) — a new skill is additive, so a **minor** bump — and add a newest-first entry to [`CHANGELOG.md`](../../CHANGELOG.md) describing it. The updater reads every entry newer than a repo's installed version to walk the user through what changed, so an unversioned skill is invisible to existing installs. This is the [release](README.md) that any payload edit ends with.

4. **Update the user-facing surfaces.** Add the skill to the [`README.md`](../../README.md) "What you get" table **and** its "Layout" tree, and to the skills list inside the `WONG-STACK:BEGIN/END` block in [`CLAUDE.md`](../../CLAUDE.md) — the block the installer lifts verbatim into a target repo. These are what a reader, and a freshly installed repo, see, so they must name every skill.

5. **Carry attribution for adapted work.** If the skill adapts external, licensed work, keep that work's `LICENSE` file inside the skill directory and record a `license:` field and an `adapted-from:` note in the SKILL frontmatter. [`improve`](../../.claude/skills/improve/SKILL.md) is the worked example — it carries [`improve/LICENSE.md`](../../.claude/skills/improve/LICENSE.md) and notes its origin under `metadata:`.

Part of [working on WongStack](README.md).
