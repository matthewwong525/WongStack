# Tasks

## 1. The served file and the message (Worker)

- [x] 1.1 Add `setup-file.ts` in `app/worker/employee-access/`, importing `scripts/employee-bootstrap.mjs` as text, and the pure function that sets `SERVED_FROM`; test that it carries the origin and throws without the marker. Verify `npm run build` in `app/` bundles the script; if Vite refuses the path, use the prebuild hook as design D2's risk says.
- [x] 1.2 Serve `GET /_memory/setup.mjs` in `app/worker/index.ts` before the memory hand-off and the identity check; test that it answers the file with `no-store` and no sign-in, that another method is refused, and that other `/_memory/` calls still reach the memory handler.
- [x] 1.3 Rewrite `prompt.ts` to `setupMessage(origin)` and simplify `setup.ts`; update `prompt.test.ts` and the setup tests: one message for `ready` and `off`, no message for `lacked`, a service token or a removed person.
- [x] 1.4 Remove `bootstrap-release.json` and every reader of it; verify `npm test` in `app/` passes at full coverage.

## 2. The popup

- [x] 2.1 Drop the handling of an unready install from `AssistantSetup` and `setupSchema`; update `AssistantSetup.test.tsx` and `CopyText.test.tsx` and verify they pass.

## 3. The setup script

- [x] 3.1 In `scripts/employee-bootstrap.mjs`, add the `SERVED_FROM` line, make no command mean `install`, and resolve the origin and folder by design D5; remove the home-folder default and the remembered folder. Test each row of the proposal's folder table.
- [x] 3.2 Make a served file ignore its own path, remove itself before a clone and when `main` ends, and never remove a copy inside the project; test all three.
- [x] 3.3 Update `scripts/tests/employee-bootstrap.test.mjs`, `employee-project.test.mjs`, `company-api-payload.test.mjs` and `cli-conventions.test.mjs` for the removed pins and the new defaults; verify `node --test scripts/tests/` passes.

## 4. Docs and release

- [x] 4.1 Rewrite `wiki/stack/employee-project.md`: the message, the fixed link, the folder table; delete *Get the reviewed bootstrap* and *Publish checked artifact pins*, fixing every link to them (`memory.mjs areas wiki/stack/employee-project.md` lists them).
- [x] 4.2 Add the setup link to the public surface in `wiki/stack/cloudflare-access.md`, and update the popup's description in `wiki/stack/mini-apps.md`.
- [x] 4.3 Add `bootstrap-release.json` to `scripts/retired-names.json`, drop it from `payload-files.json`, the payload manifest and the journey file's watched paths, and add the new Worker file where those lists need it; verify `node scripts/check-retired-names.mjs` and `node scripts/check-payload-links.mjs` pass.
- [x] 4.4 Add `## Next (minor) — One connect message for every assistant` to `CHANGELOG.md`, with an **Updating.** note in plain words: nothing to do by hand; a message copied earlier keeps working.

## 5. Verify

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and `openspec validate one-connect-message --strict --no-interactive`; both pass.
- [x] 5.2 `/save`, then on the preview: open Connect your assistant and see the short message; fetch its link with the checker's sign-in and get the setup file carrying the preview's address.
- [x] 5.3 On the preview, run the fetched file in an empty folder as the checker and confirm the project lands in that folder and the file is gone; run it again and confirm *up to date*.
