# Tasks

## 1. The open switch: Worker and deployment check

- [x] 1.1 In `app/worker/index.ts`, serve business content without an identity only when `WORKSPACE_LOGIN === "off"` and both `CF_ACCESS_TEAM_DOMAIN` and `CF_ACCESS_AUD` are blank; keep `401`/`503` otherwise. Add `WORKSPACE_LOGIN` to the Worker's env type. Cover open, stale-switch-with-IDs (`401`), and unchanged private cases in `app/worker/index.test.ts`.
- [x] 1.2 In `scripts/check-private-access.mjs` (and `lib-access-config.mjs` if it parses the vars), accept a config whose production and staging both carry `WORKSPACE_LOGIN: "off"` and no Access IDs: check Worker names and the secrets rule, print one open warning, return `protection: 'open'`. Reject the switch alongside Access IDs. Cover both in `scripts/tests/access-coverage.test.mjs` without loosening the private cases.

## 2. Provisioning

- [x] 2.1 Add `--open-without-login` to `provision.mjs`: an `AccessSetupError` from `accessOrganization()` alone records `access: { mode: 'open', reason, onboardingUrl }`, skips the Access steps, and continues; later Access errors still stop. Without the flag, behavior is unchanged.
- [x] 2.2 Make `wranglerConfig()` write `WORKSPACE_LOGIN: "off"` in both environments' vars in open mode, and update the fragment in `.agents/skills/wong-sync/references/stack-pack-fragments.md` only if the placeholder list needs it.
- [x] 2.3 On a rerun of an open install where onboarding now succeeds, run the normal Access steps with adoption, fill the `CF_ACCESS_*` vars per environment, and remove `WORKSPACE_LOGIN` from `app/wrangler.jsonc`; an unparseable config goes to `todo`. Record the new `components.access`.
- [x] 2.4 Cover 2.1–2.3 in `scripts/tests/provision.test.mjs` with the fake Cloudflare: open on onboarding failure with the flag, stop without it, stop on a later Access error even with the flag, and the rerun that turns private. Confirm `scripts/tests/server-install.test.mjs` still shows the server installer stopping.

## 3. Setup runbook

- [x] 3.1 In `.agents/skills/wong-setup/references/cloudflare.md` Step 4, pass `--open-without-login` and say in plain words what an open result means; Step 4g becomes the machine probe (private) or a `200` fetch (open), with no per-site email sign-in; Step 5 adds the optional card list with the three account links and what is missing without it, and counts the person's paste of the starter message as the human check. Add a short "adding the card later" section: rerun `provision`, then publish through `/save`.
- [x] 3.2 Update `.agents/skills/wong-setup/SKILL.md`'s `/explore` description so private pages are automatic when the account allows, and a no-card account finishes open with the card recommended afterwards.
- [x] 3.3 Add the onboarding-needs-a-card row to `references/failure-map.md` if it lists the old stop.

## 4. Wiki

- [x] 4.1 `wiki/stack/cloudflare-access.md`: describe the open-until-card state, the switch, and turning it private later, replacing "setup stops closed" for interactive setup; keep the browser runbook for `/verify`.
- [x] 4.2 `wiki/development/memory.md#without-r2`: point at the same closing card list, so one list owns the steps.

## 5. Payload release

- [x] 5.1 Add one `## Next (minor)` CHANGELOG entry in plain words, noting existing private installs are unchanged; leave VERSION alone.
- [x] 5.2 Run `node scripts/check-payload-links.mjs`, `node scripts/check-openspec-config.mjs`, and `node scripts/measure-context.mjs --check`; fix issues without loosening checks. Tests run in CI at `/save`.

## 6. Live check

- [x] 6.1 At `/save`, confirm CI passes. Then drive a real `/wong-setup` provision against a Cloudflare account without Zero Trust onboarding (or record it unverified): the site answers `200` anonymously, `/_memory` still needs its key, and the closing report shows the card list.
