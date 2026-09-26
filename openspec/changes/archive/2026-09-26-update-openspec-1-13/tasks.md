## 1. Pin

- [x] 1.1 Install 1.13.2 and check the CLI contract against a throwaway repo under both versions
- [x] 1.2 Change the pinned version in `payload.yml`, `preconditions.md`, `openspec-cli.md`, `spec-sync.md`, `CONTRIBUTING.md`, and `README.md`

## 2. Specs and checks

- [x] 2.1 Write a real Purpose for `delivery-gate` and `secrets-convention`; `openspec validate --specs --strict` passes all 50
- [x] 2.2 Add `openspec validate --specs --strict --no-interactive` to the `payload` release checks and to `CONTRIBUTING.md`

## 3. Release

- [x] 3.1 Bump `VERSION` to 24.0.2 and add the `CHANGELOG.md` entry
- [x] 3.2 Run `node scripts/check-payload-links.mjs` and `node scripts/check-openspec-config.mjs`
- [x] 3.3 `/save` for CI
