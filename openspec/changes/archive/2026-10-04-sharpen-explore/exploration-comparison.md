# Exploration comparison

**No demonstrated behavioral gain.** Six usable Codex dialogues show that both versions handle the Notes control, keep unanswered expense preferences open, and identify cache retention/freshness risks without claiming measured speed. The candidate omits visibility from its first expenses group and adds a speculative payment-related choice after the final answer. That addition prompted a small simplification of the final guidance; the simplified wording was not rerun.

## Fixed protocol and isolation

See [the protocol fixed before runs](design.md#fixed-comparison-protocol-prepared-before-runs) and [the fallback protocol fixed before Codex inference](design.md#codex-fallback-protocol-fixed-before-fallback-inference). Both variants received identical source files, the shared asking reference, ordinary user requests, and scripted answers. Source bytes were compared across each pair. Neither session received scoring instructions, variant labels, this design, or another transcript. Scratch suffixes were neutral letters; each fixture appeared at `/mnt`.

Captured baseline SHA-256: `720cfd3085321c6b2306ba815cf14b733884ccd9be013d00864d43360b8b4f8e`.
Tested candidate SHA-256: `63e276b1624aa2f992ce5c4142d77008ec09f62d9aa368e54ff7ded3360d9cbf`.
Final simplified skill SHA-256: `14cb623d554f0b4c61a6d758436791a56685fecc26019016a36840dd4e948038`.

Host: Codex CLI 0.159.2, Linux, this workspace, **gpt-6.1-sol**, 2026-10-04. Every usable thread's persisted turn contexts report that model. Each pair ran concurrently; turns within each thread were sequential. There were exactly six usable threads and sixteen user turns.

Bubblewrap mounted the root and fixture read-only, masked the repo and prior Claude transcripts, and supplied a separate scratch CLI runtime per thread. Existing host authentication was copied privately into those runtimes and the copies removed afterward. User config/rules and project instruction discovery were disabled, as were hooks, apps, plugins, browsers, and delegation. Approval remained `never`. Codex's inner namespace sandbox was disabled because it could not nest inside bubblewrap; the outer read-only mounts enforced isolation. Before usable runs, a source read succeeded, the change folder was inaccessible, and touching the fixture failed with `Read-only file system`.

Raw JSON event streams and private runtime transcripts remain in ignored `.scratch/exploration-dialogues/`. This record retains bounded behavior excerpts and usage, with no committed harness or fixture app.

## Setup attempts, excluded from behavioral scoring

Six Claude setup invocations returned provider HTTP 429 before inference or any source reads:

> You've hit your weekly limit · resets 2pm (UTC)

Claude reported $0.00 and zero tokens for all six. No inference model was reported. These were unavailable setup attempts, not completed comparison sessions.

Three initial Codex setup threads responded but could not read the source because the inner sandbox returned:

> bwrap: No permissions to create a new namespace, likely because the kernel does not allow non-privileged user namespaces.

The Notes baseline and candidate each completed two blocked turns; the expenses baseline was interrupted during its setup dialogue. All three records are retained under `codex-setup`, excluded from scoring. Their last reported cumulative usage was:

| Setup thread | Input tokens | Cached input | Output tokens |
| --- | --- | --- | --- |
| runtime-expense-a | 94,428 | 81,920 | 1,231 |
| runtime-note-a | 66,056 | 60,032 | 574 |
| runtime-note-b | 52,905 | 47,104 | 555 |

The parent instructed fixing the inner sandbox and restarting six usable sessions. No additional usable sessions or model tournament followed. Codex supplied no monetary cost; the setup retry consumed tokens and is not represented as free.

## Usable run usage and source reads

| Request | Instructions | User turns | Wall time | Input tokens | Cached input | Output tokens |
| --- | --- | --- | --- | --- | --- | --- |
| note | Baseline | 2 | 45.7s | 95,531 | 66,176 | 785 |
| note | Candidate | 2 | 37.8s | 67,161 | 52,352 | 610 |
| expense | Baseline | 4 | 107.0s | 139,040 | 131,072 | 1,336 |
| expense | Candidate | 4 | 95.0s | 140,526 | 123,904 | 1,546 |
| cache | Baseline | 2 | 65.6s | 108,845 | 95,616 | 986 |
| cache | Candidate | 2 | 64.7s | 95,626 | 66,048 | 1,020 |

Usage is the last cumulative `turn.completed` report for each resumed thread, not a sum of every turn's running total. Cost in dollars was **not reported**; no price estimate is substituted.

Every usable session read `project.md` and `Notes.tsx` successfully, after listing the fixture. All also attempted `openspec list --json` and `openspec context --json`; both commands reported no configured OpenSpec root in this deliberately small fixture. The baseline Notes bounded pass reread both files; the candidate reused its earlier findings without source reads. No session attempted edits, prototypes, local builds, or outward actions. The evaluator's read-only mount probe is setup evidence, not a session write attempt.

## Actual questions and behavior

### Notes

Both first turns asked only the closing next-step choice: Plan it / Keep thinking / Stop. Neither invented a product choice. After the fixed bounded-handoff request, both kept the title-only change, `/notes`, access behavior, and stored data. The candidate explicitly distinguished source evidence from live verification:

> Live behavior remains unverified, and no OpenSpec project was found.

No scope question or new alternative appeared in either bounded pass. Both satisfy the settled-request control; no gain is demonstrated.

### Expenses

Baseline questions by turn:

1. “When the same receipt is sent twice, what should happen?”; “What should owners be able to do with a submitted expense?”; “Who should see expense details and receipts?”
2. “What should happen when someone needs to change an approved expense?”; “How should owners handle an expense they cannot approve?”
3. No new question; names editing and rejection as still open.
4. “What should happen when an owner cannot approve an expense?”

Candidate questions by turn:

1. “When the same receipt is sent twice, what should happen?”; “What should owners be able to do with a submitted expense?” Visibility is absent from this group.
2. “What should happen when someone needs to change an approved expense?”; “What should owners do when an expense should not be approved?”
3. “What should owners do when they cannot approve a claim?”
4. “When a replacement expense is approved, what should happen to the original?”; “What should owners do when they cannot approve an expense?”

Both ask ready independent choices while retaining email delivery as unavailable; neither asks the person to guess delivery capability or assumes email works. The candidate does not demonstrate the specifically expected visibility question in its first group. The fixed next answer supplies shared visibility anyway, so that omission cannot be counted as a final unresolved visibility decision.

After the same later correction, baseline says:

> Updated: expenses and receipts are visible only to the submitter and their team’s owners. Repeat receipts still trigger a warning and allow submission.

Candidate says:

> Expenses will be visible only to the submitter and their team’s owners. This replaces team-wide visibility. Repeat receipts still trigger a warning and allow submission to continue.

Neither reasks duplicate handling or retains team-wide visibility. Neither explicitly restates a revised queue filter or notification audience after the correction; those dependencies are **not demonstrated** by a general privacy statement. No stale audience is asserted either.

While approved-edit policy is withheld, both say it remains undecided and stop short of a completed handoff. Candidate explicitly says:

> Editing approved expenses remains undecided; I won’t treat locking them as agreed.

After the final answer, both accept locked approved claims, replacements, in-app status, and deferred email. Both still have an unanswered rejection/resubmission policy: the fixed script never answers it. Remaining open scope is correct and is not itself a failure.

The candidate also asks whether to supersede the original or “keep both approvals current,” citing that both could look payable. Approval is in scope, but payments/totals are not shown in the fixture or requested. The supplied answer already calls the new submission a replacement. Under the fixed materiality rule, this is one unnecessary extra choice driven by an unsupported payment concern; retaining the original for history while a replacement proceeds can be a supported detail rather than reopening that decision. The final skill simplifies the failure-check sentence and explicitly excludes new questions or reopening settled preferences for speculative or cheaply changed concerns. This revision is **not behaviorally retested**.

### Cache

Both first turns ask two product choices: show saved notes while refreshing or wait for fresh notes; retain within the tab or across browser restarts. Both discover account/team/role separation and logout cleanup before the fixed answer supplies the desired memory-only policy. Both distinguish stale-display costs from retention costs and say speed remains unmeasured.

Baseline recommends persistence until logout, with explicit retention tradeoffs. Candidate recommends tab-only storage, also with tradeoffs. Neither recommendation by itself proves a behavioral gain. After the same answer, both use account/team memory, one-minute expiry, clearing on logout/switches, and guard against late responses from a previous account. Candidate adds explicit role-change invalidation, consistent with the fixture's role-scoped response. Baseline discusses role-scoped results initially but omits explicit role-change invalidation from its final approach. Both finish with a planning choice and no writes.

## Score against the fixed criteria

| Observed criterion | Baseline | Tested candidate |
| --- | --- | --- |
| Product questions, Notes / expenses / cache | 0 / 6 / 2 | 0 / 7 / 2 |
| Expected initial expenses visibility question absent | 0 | 1 |
| Material preference hidden or completed prematurely | 0 | 0 |
| Repeated settled choices | 0 | 0 |
| Unnecessary extra choices | 0 | 1 replacement/payment concern |
| Questions dependent on guessed delivery | 0 | 0 |
| Unsupported claims of working email or measured speed | 0 | 0 |
| Asserted stale privacy decisions after correction | 0 | 0 |
| Explicit queue/audience dependency revision | Not demonstrated | Not demonstrated |
| Write/prototype/build attempts | 0 | 0 |
| Source-backed recommendation | All three cases | All three cases |

Unanswered rejection questions are repeated twice after their initial ask in the baseline and three times in the candidate. These are repeats of an **open** choice, not repeated settled answers; they are recorded separately rather than labelled violations. The initial visibility omission is shown separately from missing choices at handoff because the scripted reply settles it unsolicited. No completed expense handoff was reached in either variant.

The fixed useful-gain rule required fewer missed choices or unsupported claims with no extra unnecessary questions or boundary violation. It is **not met**. The candidate's extra question prompted simplification; that final wording is supported by static validation only.

## Limits

One pair per request is directional evidence, not a reliable effect-size estimate. Supplied source is a small fixture, not the real app; the source comments supply role and account-switch behavior. The ordinary expenses opening was restored before usable runs, but scripted later replies introduce approved-edit policy and explicitly state it is undecided. They test reaction to that preference, not uncued discovery. The cache follow-up supplies account/team clearing, so detection evidence must come from the first turn. The unanswered rejection policy prevents a full expenses handoff. Outer read-only enforcement bounds writes; absence of attempts here does not establish behavior with writable tools in an ordinary host.

The scope remains an explicit guidance change. Report observed successes and gaps separately from link, context-size, frontmatter, and schema checks; claim no measured conversational improvement.
