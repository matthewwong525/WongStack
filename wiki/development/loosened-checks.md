# Loosened checks

The loosened-check guard, [`loosened-checks.mjs`](../../.github/scripts/loosened-checks.mjs), fails the automatic checks when a change weakens a check without a written reason. This page lists what it flags and where it runs; [a loosened check needs a reason](the-change-loop.md#a-loosened-check-needs-a-reason) owns the rule and how the reason is written.

## What is flagged

A file is flagged when the change does one of four things to it:

- **Adds a line that turns a check off**: a skip comment, or a skipped, focused, or to-do test.
- **Deletes a test file**, other than by moving it to another test file.
- **Changes a check's settings**: a test, coverage, mutation, lint, type, duplicate-code, or unused-code config, a `package.json` `test` script or a script it runs, a workflow file, a file of a shared workflow action under `.github/actions/`, or a script under `.github/scripts/`. Any settings change counts, stricter ones too: a script can not tell stricter from looser. Such a change also makes each check [prove it still fails](../stack/mini-apps.md#the-rules).
- **Changes the steps or expectations of a [kept check](kept-checks.md), or removes one.**

Prose is never read for skip markers: `wiki/`, `openspec/`, and any `.md` file.

A project's first change passes with nothing flagged when its base holds no files, such as a new install's first commit: there is no check yet to loosen.

## A kept check is flagged only when it gets weaker

A kept check needs no reason when the change:

- **adds it**, or moves it unchanged;
- **records it again with the same steps and expectations.** Only when and from which files it was recorded differ, which weakens nothing. A line for it in every publish report would teach you to skip the list;
- **rewrites or removes the promise it points at.** The change's own check covers that promise, and [keeps it again](kept-checks.md#what-each-result-means). The guard sees this when the scenario's `THEN` in `openspec/specs/` differs from the default branch's, or when a delta spec in the change lists its requirement as MODIFIED or REMOVED.

A kept check that can no longer be read counts as changed.

`keep --install` prints `REPLACED=<path>` or `REMOVED=<path>` for each kept check it replaced with other steps or expectations, or deleted. Inside `/ship`, the assistant writes each one's reason into the archived proposal before it saves ([the command](../../.agents/skills/verify/references/walkthrough.md#g--kept-checks)).

## The guard a pull request can not edit

The Test check runs the branch's own copy of the guard, so a change that weakens the guard is judged by the weakened one. On GitHub a second check, `guard`, closes that gap:

1. [`guard.yml`](../../.github/workflows/guard.yml) runs on `pull_request_target`, so GitHub takes the workflow from the branch the pull request aims at, never from the pull request.
2. It checks out the default branch into `guard/` and the pull request into `pr/`.
3. It runs `guard/`'s copy of the guard from inside `pr/`. The guard asks git for the changed files and reads them as text.

**Nothing from the pull request is installed or run.** That is what makes `pull_request_target` safe here, forks included: a step that ran a file under `pr/` would hand a fork the repository's rights.

A change to the guard still passes with a `Check:` bullet naming the file; the published guard is the one that asks for it. Both checks pass or fail by the same rule.

Its limits:

- **`guard.yml` can not run on the pull request that adds it.** The next pull request is its first run.
- **It is not a required check until the owner adds it.** [`/ship`](../../.agents/skills/ship/SKILL.md) stops on a red `guard` either way. A person merging by hand on GitHub can pass one, unless `guard` is in the branch's required checks: *Settings → Rules → Rulesets* in the GitHub project.
- **Off GitHub there is no second run.** [Artifacts](../stack/artifacts-route.md) and [the pre-check on this computer](the-change-loop.md#the-gate) use the branch's copy.
- **A broken published guard blocks every pull request**, its own fix included. The fix needs only a `Check:` bullet naming the guard file. If the reader of those bullets is the broken part, a person merges the fix by hand.

[`/save`](../../.agents/skills/save/references/git-gate.md#2--wait-for-checks-auto-fix-on-failure) waits for `guard` by name where the default branch holds `guard.yml`: GitHub starts it for the pull request, not the push, so it can be listed after the other checks pass.

Part of [development](README.md).
