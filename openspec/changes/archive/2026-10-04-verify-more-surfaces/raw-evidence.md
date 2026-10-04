# Raw verification evidence

The experiment's 1,145 raw files are bundled in `raw-verification-evidence.tar.gz` (3,934,821 bytes). Every extracted file's SHA-256 was compared with its original before removing the loose copies; all match exactly. The archive preserves valid and invalid runs, frozen scores, model/tool/token traces, scenario observations, initiating requests/readbacks, reports, screenshots, ledgers, CI comparison manifests and exact-source regression streams. No measurement was rerun or rescored during packaging.

Read `evidence.md` for the study/results/limits and `integration-report.md` for the final combined report. Historical paths in those records are relative to the archive root: `measurement-blocked/`, `measurement-codex/` and `regression-proof-27db0ff/`. The `measurement-codex/final-integration/README.md` explains final practice versus actual GitHub source identity.

For detailed inspection, extract into a new disposable folder outside the checkout:

```bash
sha256sum -c raw-verification-evidence.sha256
VERIFY_EVIDENCE_DIR="$(mktemp -d /tmp/wong-verify-evidence-XXXXXX)"
tar --no-same-owner -xzf raw-verification-evidence.tar.gz -C "$VERIFY_EVIDENCE_DIR"
```

The archive is read-only historical evidence, never an executable probe or a fallback for a newer head's missing capture. It is meta-only and excluded from installed WongStack payloads. Normal verification does not create or append a measurement archive; the paid instruction experiment runs only when deliberately requested for a skill change.
