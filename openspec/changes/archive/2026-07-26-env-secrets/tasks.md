## 1. AGENTS.md — the WONG-STACK block

- [x] 1.1 Add the secrets paragraph as the third paragraph under `## Where context lives`, inside the `WONG-STACK:BEGIN`/`END` markers — `.env.example` named first as the committed map, the git-ignored `.env` at the repo root (or the stack's dotenv equivalent) second for values, per design.md **Decisions**
- [x] 1.2 Verify the wording holds up when lifted: `.env.example` mentioned as inline code and not hard-linked, `wiki/development/secrets.md` linked, no repo-specific detail
- [x] 1.3 Confirm the edit sits wholly between the markers and nothing outside them changed (`git diff AGENTS.md`)

## 2. Release ritual

- [x] 2.1 Bump `VERSION` 6.1.1 → 6.3.0
- [x] 2.2 Add the newest-first `CHANGELOG.md` entry for 6.3.0 describing the added guidance

## 3. Verification

- [x] 3.1 Re-run the discovery check that motivated the change — `grep -inE 'env|secret|credential|auth' AGENTS.md` now hits inside the block
- [x] 3.2 `openspec validate env-secrets` passes
