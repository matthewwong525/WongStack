# Memory areas capture

This meta-only pilot captures the real [`memory.mjs areas`](../../../.agents/skills/memory/scripts/memory.mjs) entry point from the source revision checked out by the [payload workflow](../../../.github/workflows/payload.yml). Its expectations live in the [memory scenarios](../../../openspec/specs/memory/spec.md); the producer supplies observations, never a verdict. The fixture and producer are not copied to installed projects.

## Run and inspect

Normal `/save` starts the existing workflow. Code or skill changes run the pilot once after the script suite; changes confined to wiki or plans skip it. The workflow runs:

```sh
node scripts/verify-memory-areas.mjs --out "$RUNNER_TEMP/verify-memory-areas" --baseline-ref "origin/<default-branch>"
```

Prerequisites are the checked-out source with fetched history, Node and Git already supplied by that workflow, plus GitHub's repository, commit, run, attempt, event and ref variables. The producer observes the checkout's actual revision and stops if it differs from the capture head. It selects the merge-base with the named default-branch ref and checks out that exact baseline in an owned temporary worktree. It requires a new output folder and accepts no local execution mode. The complete workflow remains the gate; these two behavior captures do not rerun the suite.

Inspect the actual branch-push run for the saved head, then download its `verify-memory-areas` artifact with existing GitHub tools:

```sh
gh run view <run-id> --repo <owner/repo> --json headSha,event,attempt,url
gh run download <run-id> --repo <owner/repo> --name verify-memory-areas --dir <new-local-folder>
```

Match `capture.json`'s repository, workflow, head/subject revision, run and attempt to GitHub's newest run attempt before reading its cases. Pull-request merge checkouts do not establish branch-head evidence. Open the retained stdout/stderr and inspect exit code, signal and the fixture observations against each named scenario. A nonzero command is still an observation; an unavailable process or harness error is a capture gap. The inspected `memory-areas-pilot-1` manifest is retained as the first supported capture shape; the project-owned recipe lives at `.agents/verification/memory-areas.json`.

The head manifest's `pair` names the selected `baselineSha`, capture folder and source cleanup observations. `baseline/capture.json` keeps the same workflow/head/run/attempt identity while its `subjectSha` identifies the observed baseline checkout. Both subjects use the current head's driver and fixture bytes in separate roots. Per-case `comparison` records the digest of seeded files plus the lookup path, the driver digest, and Node version/platform/architecture/locale. Root paths and capture timestamps are excluded from comparison; raw commands and streams remain intact. A merge-base equal to the head, missing old entry point or incomplete baseline capture/cleanup leaves a named comparison gap and preserves independent head evidence.

Record the expressly selected merge-base before comparing. The [collector commands](../../../.agents/skills/verify/references/ci-evidence.md) download the exact head capture and check the baseline identity and matching inputs/method/environment. Their `comparable` state proves eligibility, never correctness or improvement; grade both raw results against the current named scenario. Missing comparison metadata keeps otherwise valid head observations usable.

## Isolation and follow-up

The producer seeds [these inputs](memory-areas.json) into a fresh temporary Git repository, with no `.env` or installation record. It invokes the unchanged source entry point from that repository. The child receives only a short environment allowlist; it inherits no service credentials, endpoint overrides, Git routing or Node startup hooks. Local state is confined to the same temporary root. No memory-service requests can be configured by these inputs.

`unmapped` asks about an unowned path. `unconfigured` asks about a mapped path with no service configuration. `mini-app` asks about the linked hello file with both named docs and the archived folder change present. Each case retains its actual command, raw streams, exit/signal and before/after local-file digests, including absence or presence of `.env` and the installation record. The mapped cases can show the local-document behavior and graceful unavailable-memory response; they cannot show facts returned by a real memory service or a network outage of a configured store. Record those limitations when grading.

The producer removes only its temporary fixture roots and baseline source worktree in `finally`; it records removal of the source directory and its Git registration separately. Output sits outside those roots, survives cleanup, and includes cleanup observations even after a capture failure. Streams and manifest text are scrubbed using the existing credential scrub; digests describe the scrubbed stream bytes. Upload runs after a failed capture too, with 14-day retention, replacing the fixed-name artifact on a rerun. A cancelled job, older attempt or expired artifact can leave evidence unavailable; a green workflow alone does not prove these scenarios. Do not execute downloaded files.
