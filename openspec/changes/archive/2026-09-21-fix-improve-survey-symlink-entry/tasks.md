## 1. Survey CLI

- [x] 1.1 Resolve the invoked script path before the direct-entry comparison, while imported modules remain inert and report behavior stays unchanged. Follow [the reviewed flow](review.html#/survey-entry/after/direct-entry).
- [x] 1.2 Add process-level regression coverage that compares successful JSON reports from the documented `.claude/...` alias and canonical `.agents/...` path.

## 2. Payload release

- [x] 2.1 Bump WongStack to patch version 16.2.2 and add a newest-first changelog entry for the survey CLI repair.

## 3. Verification

- [x] 3.1 Run the focused survey tests, the documented and canonical CLI probes, the payload link check, the OpenSpec config check, strict change validation, and the current-format review build.
