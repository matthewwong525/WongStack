---
slug: add-update-dependencies-skill
started: 2026-08-10
updated: 2026-08-10
consolidated:
---

# Adding /update-dependencies

Session that designed and built a meta-repo-only verb for keeping this repo's own toolchain current, then ran it once for real. The change's own Decision log holds why the change is shaped the way it is; this note holds the surrounding context.

## What the user decided, and why

**Aggressive to latest, majors included — because the loop already has the safety net.** The user's framing: the skill doesn't need its own test harness, because it bumps, hands the diff to `/save`, and CI gates it exactly as for any other change. The "AI makes sure everything works" part is reading changelogs and migration notes for majors and fixing breakage before or during the CI wait — the same auto-fix loop `/save` already runs. They volunteered the honest caveat themselves: whatever CI covers is the real ceiling, and `app/` only has vitest configs.

**Meta-repo only.** The user reasoned it out structurally: the skill lives at `.claude/skills/update-dependencies/` but stays out of the payload manifest, and since `/wong-sync` copies only manifest files, targets never receive it. They noted the side effect — a non-payload skill needs no VERSION bump or changelog entry just for existing — while also anticipating that *runs* can still produce releases when they touch payload docs. That anticipation turned out to be the whole story of this session (see below).

**Scheduling deferred.** On-demand now; "schedule later" was explicit.

**Naming.** The user raised the near-collision with the just-shipped `update-openspec-deps` branch themselves and offered `add-update-dependencies-skill` as the unambiguous alternative. Taken.

## The thing that actually surprised us

The plan's task 2.2 asserted this change would touch no payload file, so no `VERSION` bump. **That was wrong, and the verb's own first run is what proved it.**

`payload-files.json` ships the whole `app` dir under the `scaffold` category (excluding only `app/wrangler.jsonc`). So `app/package.json` is payload. Bumping the app deps — the thing the skill exists to do — makes the run a release.

Worth remembering as a general fact about this repo: **`app/**` is payload.** A grep for the literal string `"app/package.json"` in `payload-files.json` returns nothing and is misleading; the category ships a *directory*. Anything that edits the scaffold is a release.

## Repo facts confirmed along the way

- **`.claude` is a symlink to `.agents`.** Git does not resolve paths through it — `git check-ignore .claude/...` fails with "beyond a symbolic link", and `git status` reports the real path `.agents/skills/...`. `.gitignore` carries a comment explaining exactly this. Files land correctly either way; only the reported path differs.
- **`wiki/development/README.md` owns the "editing the payload is a release" rule.** `CLAUDE.md`'s notes are explicitly the short form. Link there rather than restating the VERSION+CHANGELOG mechanism.
- **`wiki/development/adding-a-skill.md` is the *payload* skill checklist** — steps 2–4 (manifest, wong-setup surfaces, release, README/CLAUDE.md) apply only to payload skills. A meta-repo-only skill does step 1 and stops. The page does not currently say this; a future `/dream` might be the place to add the carve-out.
- `openspec update` reports "All 2 tool(s) up to date" and needs `--force` to rewrite anyway. It generates skills only — no `.claude/commands/opsx/` in 1.8.0.
- `npm outdated` is useless without `node_modules` present (reports `MISSING` and omits devDependencies). Query the registry per package instead when surveying a repo that isn't installed.
- `scripts/check-payload-links.mjs` distinguishes dead (fails) from conditional (`~`, reported and allowed). This repo currently has 13 conditional links, all into `wiki/stack/` from pack-gated or stack-adjacent pages.

## Toolchain state at time of writing

Current: openspec 1.8.0, agent-browser 0.33.2, git 2.53.0.
Left behind deliberately, needing `sudo`/apt and therefore the user's call: **`gh` 2.46.0 → 2.97.0** and **Node 22.22.1 → 26.7.0**. CI pins Node 22 in both `test.yml` and `deploy.yml`, so a local Node bump would diverge from CI unless those move too — worth deciding together rather than separately.

## Open threads

- The `gh`/Node question above.
- `@types/node` is now two majors (26) ahead of the Node the suite runs on (22). Nothing broke, but the pairing is the one loose end from the aggressive-to-latest posture. Either bump CI's Node or accept the skew knowingly.
- Whether `/update-dependencies` should eventually be scheduled, and if so by what (the `/loop` skill, a cron routine, or a GitHub Action).
