## 1. The script

- [x] 1.1 Add `server/setup.sh`: strict mode, `WORKSPACE_USER` (default `wong`), the user, Node.js 24, `gh`, the npm globals, Claude Code, agent-browser with its Chrome and AppArmor profile, and the Paseo service, then the final check that prints `missing: <name>` and exits non-zero (review.html#/setup).
- [x] 1.2 Add `server/README.md`: the command, the input, the end state, the paths it never touches, the size budget, and how a fork changes its servers.

## 2. Tests

- [x] 2.1 Add `scripts/tests/server-setup.test.mjs`: the script is at most 12 KiB, `bash -n` passes, and the final check names every tool the README promises.

## 3. Docs and release

- [x] 3.1 Update `wiki/development/required-tools.md`: the server script is the one place WongStack installs Paseo, for a server.
- [x] 3.2 Add `server/` to "Not copied" in the payload manifest, and a row for `server/` in the README's layout table.
- [x] 3.3 Bump `VERSION` to 20.2.0 and add the `CHANGELOG.md` entry.
- [x] 3.4 Run `/save` so CI runs the tests and payload checks. The task is done when CI passes.
