# Design — wong-setup

## Context

`/install-wong-stack` is a guided installer with a one-paragraph pitch and no listening step. `/wong-sync` owns everything post-install, requires a `.claude/.wong-stack.json` manifest, and classifies every payload file three-way against a recorded base commit. The installer's copy-loop and wong-sync's payload manifest are two encodings of "what installs." The README's one-paste prompt points at the installer's raw SKILL.md URL — and the agent executing a paste-prompt may not be Claude (Codex or any shell-capable coding agent). The repo has no real installed base yet, which frees the retirement to be a clean delete. Two explore sessions settled the shape: one consultative skill that front-doors everything, and the install itself delegated to wong-sync.

## Goals / Non-Goals

**Goals:** a front door that researches, listens, diagnoses against the verbs, and gives an honest verdict including "no"; one entry point; one copy engine (wong-sync's manifest diff) for install and update alike; a runbook any coding agent can execute.

**Non-Goals:** porting WongStack itself to other agents (the skills stay Claude Code-native; non-Claude agents get a pointer, not a port); changing the manifest *set*; changing wong-sync's behavior for already-installed repos (real `commit` present → identical to today).

## Decisions

1. **Takeover, not front door.** `wong-setup` absorbs the installer role; `install-wong-stack` is retired. *Alternative:* a thin consult skill fronting the old installer — rejected (two skills for one journey).

2. **Install = sync with an empty base.** wong-sync's three-way classification degenerates correctly when the base is the empty tree: absent-locally → "upstream update" (pull = install, batch-approvable); exists-locally-and-differs (a collision) → "true conflict" (ask, now with keep-under-rename); "contribution candidate" is impossible since upstream always differs from ∅. So the fresh install reuses the classify/pull machinery nearly unchanged, and the installer copy-loop — a second, driftable encoding of the payload list — disappears. Fresh-mode deltas in wong-sync: skip the changelog walk (nothing installed before), skip the contribute leg, *insert* the CLAUDE.md block when no markers exist (today it only replaces between markers), offer rename on collisions and record it in `components.skills`.

3. **The seed manifest is the handshake.** wong-setup ends its setup phase by writing `.claude/.wong-stack.json` with `commit: null`, `version: null`, the `upstream` block, and any renames agreed during collision discussion; wong-sync reads `commit: null` as "fresh — empty-tree base." wong-sync's "no manifest → stop, point at `/wong-setup`" rule stays: the seed is how intent-to-install is distinguished from not-installed. The schema is one of the few things kept prescriptive-precise.

4. **Chicken-and-egg via the existing bootstrap.** A fresh repo doesn't have the wong-sync skill yet; wong-setup copies it in before handing off — the same single-bootstrap the manifest-present path has always done. That copy is wong-setup's *only* payload file operation.

5. **Authored vs copied.** What comes out of the consultation isn't payload: CLAUDE.md's "What this is" and a seeded wiki hub README are *authored* from research + conversation, so they stay in wong-setup, done before handoff. The `WONG-STACK` block itself is payload and arrives via wong-sync's pull (inserted per Decision 2). `openspec init` and the GitHub rungs are environment setup, also wong-setup's. The closing "here's your first command" stays wong-setup's — it wraps the whole conversation, after wong-sync reports.

6. **Guidance over prescription.** The runbook states outcomes ("a repo with at least one commit exists; `gh` is authed; `origin` resolves") and lets the executing agent pick commands, keeping the plain-language one-rung-at-a-time narration for newcomers. Exactly three things stay verbatim-precise: the seed-manifest JSON schema, the shared clone cache path (`${XDG_CACHE_HOME:-~/.cache}/wong-stack/WongStack`), and the few commands handed *to the user* to run themselves (e.g. `gh auth login --web`). *Trade-off accepted:* bash blocks were rails for weaker agents; the risky file operations now live in wong-sync, which keeps its precision — only the adaptive conversational half loses rails, where they hurt.

7. **Agent-agnostic runbook, Claude-native toolkit.** The runbook must be executable by any agent that can run shell and edit files: Claude-only affordances (AskUserQuestion, Explore subagents, the Skill tool) are phrased as "if available, else do it inline / ask in plain text." Setup asks which agent(s) drive the repo and passes them to `openspec init --tools`; when the answer isn't (only) Claude, it notes the skills live in `.claude/skills/` and offers an AGENTS.md pointer so other agents can discover the verbs. The handoff to wong-sync is likewise "read and follow `.claude/skills/wong-sync/SKILL.md`" — a file path, not a Claude Skill invocation.

8. **Sequencing inside wong-setup:** locate source → mode check (manifest with real commit → hand to `/wong-sync`, no pitch) → research → discover → diagnose → verdict. GitHub rungs run only after a yes (or the explicit fast path) — never during the consultation.

9. **Consultative advisor tone, not sales language.** Ask, diagnose, recommend, factually; the willingness to conclude "not a good fit" (playbook disqualifiers → terminal exit with an alternative named) is what makes "good fit" credible. Playbook content in `references/fit-playbook.md`, mirroring `/improve`'s references pattern.

10. **Clean delete, no tombstone.** `install-wong-stack/` is removed outright, along with every live reference (legacy-trace repoint entries included). The tombstone idea guarded stale paste-prompts in the wild — but the repo has no real installed base yet, so there's nothing to guard; carrying redirect machinery for zero users is pure weight. Historical CHANGELOG entries (≤5.0.0) keep the old name — they're the release record, not live references.

11. **Major bump to 6.0.0.** Public entry point changes, a skill is retired, and wong-sync's contract gains a mode — precedent: 5.0.0 retiring `contribute-wong-stack`.

## Risks / Trade-offs

- [wong-sync fresh mode mishandles an existing manifest] → fresh behavior triggers only on `commit: null`; any real commit takes today's path untouched.
- [A non-Claude agent misses skill frontmatter conventions] → the runbook depends on none of them; everything the executing agent needs is in the SKILL.md body + playbook.
- [Consultation annoys the decided] → fast path at every consult phase.
- [CLAUDE.md block insertion into an arbitrary existing file] → insertion appends the block with markers and touches nothing outside them; conflicts with the user's own rules are surfaced during the consultation's CLAUDE.md discussion, not silently merged.

## Migration Plan

Single change, one release (6.0.0). Installed repos: unaffected (real `commit` → today's path). Fresh installs: new funnel. Rollback: revert the branch. The old installer's raw URL 404s post-ship — accepted, since no installed base exists yet.

## Open Questions

None open — both explore sessions' decisions are folded in above.
