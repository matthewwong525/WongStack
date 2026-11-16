# Tasks

## 1. Script

- [x] 1.1 In `keys.mjs`, set `LIMITS.value = 32 * 1024` and `LIMITS.body = 128 * 1024`
- [x] 1.2 In `keys-page.mjs`, set `FILE_LIMIT = 24 * 1024`; add exported `fileValue(bytes)` and `fileLabel(name, bytes)`; make `pickFile` read `file.arrayBuffer()` and hold the text or the base64 line

## 2. Tests

- [x] 2.1 In `scripts/tests/keys-page.test.mjs`: `fileValue` on JSON, PEM, `.p12`-like bytes, a zero byte and invalid UTF-8; a picked binary file is held as base64 under `fileLabel` and sent as one line; the over-limit test uses 24 KB
- [x] 2.2 In `scripts/tests/keys.test.mjs`: a 6,000-character base64 value saves bare and reads back as the same bytes; the limit tests follow `LIMITS` unchanged

## 3. Docs and release

- [x] 3.1 In `references/key-link.md`, add one sentence: a key holds up to 32 KB; a picked file that is not text is stored as one base64 line; a Worker secret holds at most 5 KB
- [x] 3.2 Add a `## Next (minor) — The key link takes longer keys and any file` entry to `CHANGELOG.md` with a nothing-to-do **Updating.** note, and raise `.agents/plugins/browser/VERSION` to 3.5.0
- [x] 3.3 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate key-link-files --strict --no-interactive`
