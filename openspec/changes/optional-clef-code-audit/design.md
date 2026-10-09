# Design

## Context

See [the proposal](proposal.md) for the trial and agreed scope. The verify skill already selects scenarios, binds a saved head, owns temporary evidence folders and grades deployed or captured CI observations. Shared memory helpers provide durable credential discovery and redaction. No app screen changes.

## Goals / Non-Goals

Provide a small optional code-reading step with reproducible inputs and explicit failure handling. Keep model output separate from observed evidence. Do not add dependencies, manufacture credentials, send screenshots, or execute product code to fill verification gaps.

## Decisions

### Activation and placement

Document `/verify --code-audit` as the explicit option. After the existing scout finds a reachable check, bind its saved head and allocate the owned run directory; before writing journeys, read the optional guide and run its helper. A default run loads neither the guide nor credentials and makes no paid request. The existing `NONE` fast path stays first. Do not add a permanent switch or automatically enable it in ship.

### Saved, focused code packets

Add `verify/scripts/verify-code-audit.mjs` with standard `--help` and shared CLI conventions. Its input manifest lives in the run directory and carries a small list of cases with scenario name, exact WHEN and THEN, and selected source paths with their concrete role (changed source, caller or contract). Optional explicit line ranges for each revision allow useful narrow context without silent truncation. Supply full 40-character head and baseline commit IDs. Read source with bounded, argument-array git plumbing from those objects; never from the working file and never by running project code. Validate commits and reject unsafe paths, symlinks, submodules, binary data and credential files. Include source hashes and selected line bounds in the local record. Check current head before requests and at completion so a moved head invalidates results.

Use at most six cases, eight sources per case, 48,000 UTF-8 bytes per final request and a bounded manifest/file read. Oversized input is explicitly unavailable rather than cropped. Missing baseline paths can represent newly added code only when the saved tree confirms their absence; missing head context is unavailable. Before/after source is sufficient; include a bounded diff only if useful, without invoking external diff tools. These limits choose a narrow review rather than a repository upload.

### One bounded larger-model request per case

Use the fixed Cloudflare account API endpoint for `@cf/cloudflare/clef`, never Flash or a model fallback. Reuse exported `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`, otherwise the primary worktree's ignored `.env`, through existing helpers. Do not mint a token, widen permissions, install a runtime or prompt for missing optional access. Mark unavailable and continue the walk instead.

Send only scrubbed code context and written expectations as state. Treat their contents as data, not instructions. Ask a finite-choice assessment (`possible_violation`, `no_contradiction_seen`, `insufficient_context`) and a finite-choice suspected source from the supplied source IDs, plus `none`. Validate the returned choices and probabilities. Record the choices, probability distributions, usage, model, revisions, source/request hashes and explicit limitations. A favorable answer is merely lack of a detected contradiction.

One call per case, no retries, at most 20 seconds per request and 60 seconds total; enforce deadlines through response-body consumption too. Preserve completed cases when later calls fail. Missing credentials, HTTP failures, malformed/truncated answers, budget exhaustion and head movement produce advisory unavailable outcomes, never any of the five verification verdicts. Return bounded sanitized diagnostics rather than API bodies or authorization values.

### Privacy and records

Reuse shared redaction for known credential values and token-shaped text before both network transfer and disk output. Include known values from durable and exported credentials. Do not read secret paths even if tracked. The helper reads and writes only regular files in the walk-owned temporary directory outside the checkout; refuse symlink paths and unsafe destinations. Use private file modes. Persist sanitized requests and outcomes for auditability, not credentials or images. Existing walk cleanup removes all audit records on every exit; report a concise sanitized account of flags and limitations before cleanup.

### How a flag affects verification

The verifier examines the indicated supplied code and its confirmed relationships. Accept, dismiss or leave the flag unresolved in a separate audit section, then use existing scenario probes and their verbatim THEN criteria. A model flag cannot authorize a repair, invent a promise, broaden scope, waive a check or fail the walk. A suspected missing expectation stays a coverage gap. The walkthrough distinguishes this code advice from the previously declined second agent judging captured evidence.

### Release and context cost

Ship the helper and optional guide through the existing directory payload rules. Add a minor Next changelog entry; leave VERSION alone. Keep verify's loading instructions small and offset added guide text by tightening redundant walkthrough prose without losing safety obligations or historical measurement facts. Do not raise the committed context baseline. Tests and trial records stay in the meta-repo/change rather than installed payload.

## Risks / Trade-offs

- False alarms and misses → optional only, inspect flags, preserve observed checks; the initial trial already had a healthy false alarm.
- Incomplete callers or narrow snippets → explicit input roles, line bounds and insufficient-context result; no completeness claim.
- Code sent to a remote service → explicit request, narrow manifest, deny secret files, scrub before sending and retain only private temporary records.
- Service cost and delay → six calls maximum, bounded context and time, no retries or permanent enabling.
- Probability appears authoritative → record it as model output with no threshold governing verification.

## Migration Plan

Installed repos receive an unused optional helper and guide. Existing verification needs no new account, setting or dependency. Remove the optional entry point/helper to roll back; default checks and evidence rules are unchanged. Final acceptance uses four fresh saved-code cases (two violations and two healthy counterparts) through the real helper/API, records every outcome and confirms larger Clef and credential-free records. This tests the optional integration, not app behavior. There is no model-accuracy shipping threshold or change to evidence grading.
