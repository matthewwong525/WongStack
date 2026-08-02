# extract-walk-skill

**Status:** ready-to-ship
**Open questions:** none

## Why

The staging walkthrough is welded into `/ship` as a merge gate, so the only way to see the app driven in a browser is to ship it. That's backwards for the thing people actually want it for — checking whether the work looks right *while it's still being worked on*. As a gate it also has to carry a whole safety apparatus (`UNKNOWN` never merges, a shared retry budget, the reset-before-retry rule) that exists solely because a merge hangs on the verdict.

Making it a verb you invoke — `/walk` — inverts both problems. You get the browser evidence whenever you want it, as many times as you want it, and the machinery it needed to be a gate falls away.

## What Changes

- **New `/walk` skill.** Runs `/save` first (push, wait for CI, resolve the per-commit preview URL), then walks the change's own OpenSpec scenarios against that preview, then posts the evidence as a PR comment. Scope is unchanged from today's walk: stack-pack repos, Playwright-detected, delta-scoped.
- **BREAKING — `/ship` no longer walks.** Step 4.5, the five-verdict table, the walkthrough hard rules, and the walkthrough line in the report are removed. `/ship` becomes CI-when-present → merge. A repo that adopted the walkthrough as a gate loses that gate and must invoke `/walk` deliberately.
- **BREAKING — the gate ladder loses a rung.** `CI-when-present → walkthrough-when-adopted → merge` becomes `CI-when-present → merge`, with PR review as the gate when CI is absent.
- **Evidence is posted on every verdict, not only on success.** With no merge to block, a failed walk's screenshots are the most useful thing that can land on the PR.
- **The verdicts stop gating and start reporting.** `UNKNOWN` and `TIMEOUT` no longer block anything — they are reported as unverified. The distinction they encoded (unverified ≠ absent) is preserved as *reporting* honesty rather than as a merge rule.
- **The capability is renamed** `ship-walkthrough` → `staging-walkthrough`, and the runbook `wiki/stack/ship-walkthrough.md` → `wiki/stack/staging-walkthrough.md`. The old names assert a coupling to `/ship` that this change removes.
- **Files move** from `ship/` to `walk/`: `references/walkthrough.md`, `scripts/walk-staging.sh`, `scripts/walk-runner.mjs`. The payload manifest is updated to match.
- **Release.** `VERSION` 8.5.0 → 9.0.0 and a newest-first `CHANGELOG.md` entry, per the payload-is-a-release rule. Major, because an adopted repo's `/ship` silently stops gating.

**Non-goals.** A general integration-test runner (this stays a staging-preview walk of OpenSpec scenarios); adopting `cloudflare/skills` or any Cloudflare MCP server; any `disable-model-invocation` work (spiked — it blocks the Skill tool and would break every skill-to-skill handoff); fixing `/save`'s description overrunning the 1,536-character skill-listing cap.

## Capabilities

### New Capabilities

- `staging-walkthrough`: the walk as a user-invoked verb — `/save`-then-walk ordering, scenario scouting, throwaway journeys, grading against the written `THEN`, verdicts as report rather than gate, unconditional evidence comment, and the adoption runbook. Replaces `ship-walkthrough` wholesale.

### Modified Capabilities

- `ship-walkthrough`: every requirement is REMOVED — the capability is renamed and rehomed to `staging-walkthrough`. Nothing survives under the old name, because the name asserts the `/ship` coupling being deleted.
- `delivery-gate`: the gate ladder drops the walkthrough rung; the "No local build fallback" requirement stops permitting the walk as a `/ship` gate and instead permits it as a user-invoked verb; `/ship`'s merge conditions no longer reference a walk verdict.

## Impact

**Payload skills**
- New `.agents/skills/walk/` — `SKILL.md`, `references/walkthrough.md`, `scripts/walk-staging.sh`, `scripts/walk-runner.mjs`.
- `.agents/skills/ship/SKILL.md` — remove Step 4.5 + verdict table + walkthrough hard rules + report line, rewrite the `description` frontmatter (it currently advertises the walk), renumber steps.
- `.agents/skills/wong-sync/references/payload-manifest.md` — add `walk` to the workflow-skills list, move the `ship/references/` + `ship/scripts/` entries, update the `wiki/stack/` file list for the renamed page.
- `.agents/skills/wong-setup/SKILL.md` — one sentence describing the walk as something `/ship` does; retarget to `/walk` and the renamed page.

**Wiki**
- `wiki/development/the-change-loop.md` — the gate ladder (§ The gate) loses a rung; `/walk` joins the verb list.
- `wiki/stack/ship-walkthrough.md` → `wiki/stack/staging-walkthrough.md` — rewritten around `/walk`; the "Not part of `/save`" declined-option is revisited (the walk now *begins* with `/save`); the verdict table stops describing merge outcomes.
- `wiki/stack/README.md`, `wiki/stack/d1-pipeline.md` — link and description updates.

**Repo root**
- `VERSION` → `9.0.0`; `CHANGELOG.md` newest-first entry.

**Note on paths:** `.claude` is a symlink to `.agents` — edits target `.agents/` per [repo layout](../../../wiki/development/repo-layout.md).

**Unchanged:** every safety property that isn't about merging — never write inside the repo, never install Playwright or a browser, reset staging only after a failed walk, "no exception thrown" is not a pass, stop and ask on genuinely ambiguous evidence, video is a link not an inline player.

## Decision log

- **2026-08-02** — Planned and implemented in one session; all 26 tasks landed. Three threads were explored, two were closed before planning: a `/cloudflare` docs skill (dropped at the user's call once `cloudflare/skills` turned out to be an Apache-2.0 upstream shipping 2.0 MB / 319 reference files — larger than all of WongStack — making the real question delivery, not authoring), and making most skills command-only to reclaim context. **The command-only thread was killed by a spike, not by opinion:** two probe skills (one with `disable-model-invocation: true`, one control) proved the flag blocks the *Skill tool*, not just autonomous triggering — `Skill spike-flagged cannot be used with Skill tool due to disable-model-invocation`. Since every WongStack verb is both a human entry point and a handoff target (`/apply` → `/save`, `/continue` → `/apply`, `/explore` → `openspec-explore`), setting it would sever the mandated handoffs. Measured cost of all 16 skill descriptions was ~2,307 tokens, ~1% of the window, so the thread was not worth a workaround.
- **2026-08-02** — Decided `/walk` goes in the payload manifest's **stack-pack** section, not the always-copied workflow-skills list: it walks a per-commit preview alias only the pack's pipeline publishes, so outside a stack-pack repo there is nothing to walk. This makes adoption two-level — the pack gates the skill, `playwright` in `devDependencies` gates the walk.
- **2026-08-02** — Kept the runbook's "Not part of `/save`" declined-option rather than deleting it, rewritten to distinguish two different things: `/walk` *invoking* `/save` as its first step (adopted — it's how the preview URL comes to exist) versus `/save` *automatically walking* (still declined — N runs per change with reseeds firing while the surface changes). Added the newly declined option: automatic walking on `/ship`.
- **2026-08-02** — Renamed the capability and the runbook page (`ship-walkthrough` → `staging-walkthrough`) rather than modifying in place. Nearly every requirement changed anyway, so the rename cost almost nothing and avoids a spec whose name contradicts its content. Six live references outside archives; archived changes deliberately untouched as historical record.
- **2026-08-02** — Chose full removal from `/ship` over the "one-line nudge when an adopted repo's PR has no walk evidence" middle ground. Recorded in design.md decision 2 as a clean later addition if walks turn out to be routinely forgotten.
- **2026-08-02** — Branch was created as `command-only-skills` before the spike killed that thread; renamed to `extract-walk-skill` (never pushed, 0 commits) to restore the branch-name = change-name tie.
- **2026-08-02** — Found in passing and **not** fixed here (out of scope): `/save`'s own `description` is 1,583 characters against the 1,536-character skill-listing cap, so its tail — `or get a shareable preview URL of in-progress work` — is silently truncated and can no longer match. Worth its own one-line change.
