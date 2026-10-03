# Verification autonomy and staging safety

## Context

See [the proposal](proposal.md) for the intended outcome. The driver already runs independent journeys in order; the changes are agent decisions around safety, blocking, and reporting. The current instructions immediately ask on ambiguous evidence and reset any stack-pack staging database after failure.

## Decisions

- Keep the existing driver and probe ladder. Add a scenario ledger before execution, distinguishing runnable checks from blocked checks, dependencies, and cleanup. Scope stays with the selected change, or the named plain check.
- Authorize reversible staging actions only against isolated fixtures or records created by the invocation, with known cleanup. Confirm deployed bindings and test integration destinations before writes; never infer isolation from the URL alone. Database-wide reset requires an established disposable seed database with no overlapping work.
- Collect unresolved evidence, manual checks, credentials, and permissions for one final handoff. A block pauses only dependent journeys. Failures remain failures; ambiguity stays unverified. Existing SUCCESS-with-partly-shown semantics remain, while a runnable scenario blocked by access, safety, or ambiguity makes the final result UNKNOWN unless FAILURE or TIMEOUT applies.
- Before the handoff, attempt the strongest safe simulation available through existing deployed interfaces, disposable synthetic data, or established sandbox integrations. Keep the no-local-execution and no-invented-tooling boundaries. Record that evidence is simulated, which claims it supports, and what real behavior remains unproven; a simulated delivery cannot prove actual delivery or a person's experience. If no safe simulation exists, explain the limitation rather than inventing evidence.
- The consolidated handoff offers help or authorization, skipping selected checks, or skipping all remaining checks. Record each declined check as skipped and unverified with its evidence limits; stop requesting it unless the person reopens it. Skipping grants no authorization, erases no observed failure, and creates no passing result. Apply existing verdict rules to the coverage actually obtained.
- Keep the grader's evidence standards and two-fix bound. Change when the person is asked, rather than supplying an assumed reading. Preserve useful evidence in the comment or chat before temporary-file cleanup; after help, resume only the pending checks and anything invalidated.
- Keep instructions within the existing context ceiling by tightening the reference's long comment example and repeated prose. Update the owning wiki reasons and capability delta together.

## Risks / Trade-offs

- A safe fixture is absent → report the check as unverified; finish independent read-only checks.
- An integration's target is unknown → defer its trigger, state the exact destination or sandbox proof needed, and avoid a real-world effect.
- Simulation could be mistaken for complete verification → label its source and limits and retain unverified real-world claims, including checks the person skips.
- Existing practice evaluation covers grading, not staging ownership → measure baseline and candidate grading, then review realistic blocking and safety cases separately.

## Migration

The payload release replaces instructions and docs only. Existing previews and credentials keep working. No data migration or new configuration.

## Validation

[Practice measurement](measurement.md) records the before/after results and runner limitation. [Verification checks](verification.md) records realistic handoff and staging-safety reviews and validator compatibility.
