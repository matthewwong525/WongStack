# Design

## Context

`scripts/tag-releases.mjs` runs `gh release create` through `execFileSync`. It throws on the first failure, so one refusal ends the run and fails the `releases` job. Run 36295651789 created 19.0.1 through 20.0.0, then stopped at 20.1.0. That commit (`7c7c0a6`) changes `.github/workflows/test.yml`, and `gh` printed `HTTP 403: Resource not accessible by integration`. The four versions it created touch no workflow file. The user's local `gh` login has the `workflow` scope, and it created the other 22.

`.agents/rules/payload.md` is meta-only and loads for `VERSION` and `CHANGELOG.md`, which every release edits. It already owns the release ritual.

## Goals / Non-Goals

**Goals:** a refused Release never turns `main` red; the gap is visible; `/ship` here closes it in the same session.

**Non-Goals:** a stored token with workflow permission; any payload change.

## Decisions

### Refused is HTTP 403 from `gh release create`, nothing else

`run('gh', args, body)` is wrapped per version, with `stdio` stderr captured instead of inherited. When the error's stderr contains `HTTP 403`, the version goes into `refused`, its stderr line is echoed, and the loop continues. Any other error is rethrown, as today.

After the loop:
- For each refused version, print `::warning::GitHub refused v<version>; run node scripts/tag-releases.mjs with a login that has the workflow scope` (a GitHub annotation; plain text elsewhere). When `GITHUB_STEP_SUMMARY` is set, append a short Markdown list to that file.
- Exit 1 only for `missing` versions (no `VERSION` commit), as today.

*Alternative:* treat every creation error as refused. That would hide auth or network failures, which should stay loud.

### `/ship` step in the meta-only rule

Add one bullet to `.agents/rules/payload.md`: after `/ship` merges a release here, run `node scripts/tag-releases.mjs` from the checkout `merge.sh` reported as `synced`, with the person's `gh` login, and name any Release it created in the ship report.

*Alternative:* a conditional line in `ship/SKILL.md` ("when `scripts/tag-releases.mjs` exists"). That is more reliable in a cold `/ship`, but it ships to every installed repo for a script none of them has, and the context check counts it on every `/ship`.

### Workflow

No change to `release.yml` is needed: the script writes the summary itself through `GITHUB_STEP_SUMMARY`, which Actions sets.

## Risks / Trade-offs

- **A cold `/ship` without the rule loaded skips the fill.** The warning annotation and job summary keep the gap visible, and the next release ship fills it, because the script fills every missing version.
- **GitHub could change the 403 wording.** The test pins the fake `gh`'s text to what the real run printed, and any other failure fails loudly.
