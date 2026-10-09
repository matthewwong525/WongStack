# Optional code audit acceptance

On 2026-10-09 the finished helper made four real requests to `@cf/cloudflare/clef`, using two seeded violations and two healthy counterparts. An initial evaluation leaked case labels through scenario names and source filenames; its claim that all labels were excluded was incorrect. That evaluation is retained in [label-leaked-acceptance.json](label-leaked-acceptance.json) and excluded from accuracy claims.

The corrected evaluation below reran all four cases once through the unchanged helper, with shuffled order, neutral filenames (`module-1.mjs` through `module-4.mjs`) and identical scenario names for each healthy/violating pair. Expected answers, original filenames and the private case mapping stayed outside requests. All requests completed; no selective reruns, response-dependent prompt edits or probability thresholds were used. No images, behavioral captures or product execution were used. Request records were checked for the leaked label patterns.

| Saved-code case | Expected assessment | Clef assessment | Inspection |
|---|---|---|---|
| Invoice authorization violation | possible violation | possible violation | Accepted: `organizationMatches || billingRole` permits a billing actor from another organization. |
| Invitation storage violation | possible violation | possible violation | Accepted: deleting the invitation before the awaited storage operation loses the invitation when storage rejects. |
| Healthy invoice authorization | no contradiction seen | no contradiction seen | `organizationMatches && billingRole` denies the specified cross-organization request. |
| Healthy invitation storage | no contradiction seen | possible violation | Dismissed: storage is awaited before invitation deletion; rejection exits before deletion or a success return. |

Both planted defects were flagged; neither was missed. One of two healthy controls was falsely flagged. The false alarm's `possible_violation` probability was 0.9142. Fixed-choice answers supplied no explanatory rationale; the inspection above comes from source, not an inferred model explanation. High probability does not establish correctness. This tiny study cannot establish general defect detection or security coverage.

The written storage scenario explicitly states that the database rejects before storing a member. The healthy saved code is:

```js
export async function redeemInvitation(code, member, database, unusedCodes) {
  if (!unusedCodes.has(code)) throw new Error('invitation already consumed');
  await database.insertMember(member);
  unusedCodes.delete(code);
  return { accepted: true };
}
```

The violating counterpart moves `unusedCodes.delete(code)` before the awaited insertion. Both invoice versions are a single returned expression comparing organization IDs and the `billing` role; the violation replaces `&&` with `||`. The healthy counterparts have identical baseline/head source hashes. These small static cases test the request protocol and advisory handling, not real storage, deployment or comprehensive model accuracy.

## Recorded integration evidence

- Named baseline: `014379d09e1200a6068900c1a6bece63aa2d9712`; saved head: `7fa1cfc119bf34e4d6db7b2d8301e21dda26f0ad` in an isolated temporary fixture repository prepared before execution. The corrected protocol and private mapping were written before the corrected requests.
- The CLI returned `CODE_AUDIT_RESULT=COMPLETE`, an advisory integration result, not a verification verdict. Each response identified larger `clef`; all four source choices referred to supplied IDs or `none`.
- Total elapsed time: 3,159 ms; individual requests in shuffled order: 984 / 874 / 929 / 234 ms. Usage: 2,906 input tokens, zero output tokens. No service errors or budget exhaustion occurred.
- All four saved requests and the outcome record passed known-value and token-shape credential scans. Files were mode `0600`; their directory was `0700`. Request records contain scrubbed code and written expectations only. The temporary walk directory was removed after recording acceptance.
- [acceptance.json](acceptance.json) records every corrected outcome, probability distribution, source/request hash, revision, privacy and label check. Full sanitized requests, source fixture and protocol are retained privately outside git at `/root/.paseo/artifacts/optional-clef-code-audit-2026-10-09/neutral-rerun/`; the original evaluation remains in the parent folder for provenance.

## Local checks and preview

The implementation's full local pre-check and affected reruns passed the app suite, script suite, wiki, payload links/config/specs and context budget. Shellcheck was unavailable here; it remains enabled in the delivery checks. No check was disabled and no baseline or dependency changed.

Final source review restored explicit delta/diff scenario selection and the observed-claims condition for partly shown results after prose compression; evidence grading is unchanged. The local classifier treats the new scripts/tests as app-affecting, so the apply preview was built and uploaded successfully. No database migration was pending and no asset changed. Exact uploaded version: `ed72f1b8-379f-450b-868a-4e0d587a3b0c`; [preview](https://ed72f1b8-wongstack-staging.matthewwong525.workers.dev). No app screen changed, so no screenshot was needed. Human login was not tested. This host preview and local tests are not the delivery gate; nothing has been committed, pushed or published.
