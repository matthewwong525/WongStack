# Tasks

Build sections 1–4 together, authoring each group's tests and docs beside its code. Run nothing between tasks: no tests, no build, no `/save`. The boxes in 1–4 are checked by source review; section 5 is the one gate.

## 1. Worker: the registry entry and the forwarder

- [x] 1.1 Add the optional `forward` entry to the `Key` type in `app/worker/keys.ts` ([design 1](design.md)), with a commented example beside the commented Stripe line, and readers for it in `app/worker/employee-access/key-levels.ts`. Extend `app/worker/apps/keys.test.ts` to fail, naming the key, on a non-HTTPS `base`, a `base` not ending in `/`, a `secret` outside the key's own `secrets`, a `lookups` entry that is not `METHOD path` or holds `..`, and `forward` on a key with `setup` or `alone`. Verify by tests over made-up registries, one per rule and one clean.
- [x] 1.2 Write `app/worker/api/forward.ts` ([design 2–4](design.md)): from a registry, build `<key>.read` at `POST /api/direct/<key>/read` and, for a key offering Read & write, `<key>.change` at `POST /api/direct/<key>/change`, each a described action with input descriptions, synthetic examples, safe errors (`not_allowed`, `not_a_lookup`, `too_large`, `bad_answer`) and the limits in design 4. Author `forward.test.ts` with a stubbed `fetch`: a `GET` look-up, a listed `POST` look-up, an unlisted `POST` refused by `.read` and sent by `.change`, each traversal and other-host path refused with nothing sent, a redirect not followed, an answer over the bound, an answer holding the secret, a service 404 returned with its status, fixed headers and the key header sent, no other header sent, and the abort signal passed.
- [x] 1.3 Register the generated routes and their `{ keys, direct }` mappings in `app/worker/api/router.ts`, so `apiActions` and `apiKeyUse` include them. Verify by a router test over a made-up registry that both actions are registered, mapped to their key alone, and that the shipped registry adds none.
- [x] 1.4 Write one log line per direct request ([design 9](design.md)). Verify by a test that the line holds caller, key, kind, method, path and status, and holds no query, body or secret.

## 2. Worker: the choice

- [x] 2.1 Add a timestamped migration under `schema/migrations/` creating `wong_access_key_direct` ([design 5](design.md)), and give `schema/seed.sql` no row, so a preview starts off. Verify by a test that a database with no row reads every key as off.
- [x] 2.2 Read the choices in `currentPolicy()`'s one query and enforce `direct` in `refusal()` ([design 6](design.md)), with the two refusal messages. Author tests in `app/worker/employee-access/`: off refuses the owner, the checker and a Read & write holder; look-ups only runs a read for Read and refuses a change for Read & write; look-ups and changes runs a change for Read & write and refuses it for Read; a lowered choice governs the next request; `legacy` and `not_started` refuse; unreadable data denies; a stored `write` on a Read-only key counts as `read`.
- [x] 2.3 Add the `direct` save to `app/worker/employee-access/management.ts` ([design 7](design.md)), refusing a non-manager, a key with no `forward`, and `write` on a Read-only key, and bumping the revision. Author tests for each, and for a manager's save.
- [x] 2.4 Confirm discovery lists a direct action only when it would run, in `app/worker/api/discovery.ts`, adding no field. Author a test over the list, the single-action view and the OpenAPI document for each mode.
- [x] 2.5 Add `direct` to each key in `keyCatalogue` and to each `Skill` in `app/worker/employee-access/skills.ts` ([design 8](design.md)), and to the schemas in `app/src/lib/access.ts`. Verify by tests: a key with no `forward` reads null, a skill listing `<key>.read` needs that key at Read and direct `read`, and one listing `<key>.change` needs `write` for both.

## 3. Access screens

- [x] 3.1 Add the *Direct use* group to `app/src/apps/access/KeyPage.tsx` ([design UX](design.md#ux)): the choices the key offers, the consequence line with the count of people the pick reaches, and the *Not set up for this key* line when `direct` is null; send the `direct` save before the levels save. Author tests: each choice's line and count, a Read-only key offers two choices, the not-set-up state shows no choice, leaving asks first, and a failed choice save is reported.
- [x] 3.2 Show the choice on the key's row through `keyUseShort` in `levels.ts`, within the list's one-line bound. Verify by extending the existing line-length test with a key that an app uses and that is used directly.
- [x] 3.3 In `levels.ts`, count an unmet `direct` as a gap of the skill, and show *direct use is off* or *direct changes are off* once in the skill's panel and on the Skills row. On a person's and a role's key line, say the level also reaches the service directly when the key's choice is on. Author tests for a skill stopped only by the choice, one stopped by a level, and the key line in each mode.

## 4. Docs and the release

- [x] 4.1 Write *Use a key directly* in `wiki/stack/company-api.md` ([design 11](design.md)) and the one sentence in *Build a skill on actions*; keep the page under 3,000 words, moving *Look things up in Cloudflare* detail to a link if needed. Update `wiki/stack/api-keys.md`, *Key levels* and *A key with no app* in `wiki/stack/employee-access.md`, and the Keys line in `wiki/stack/access-screens.md`; add at most one linking clause to `wiki/development/secrets.md`. Verify with `node scripts/check-payload-links.mjs` and `node scripts/measure-context.mjs --check`.
- [x] 4.2 Add the `## Next (minor) — …` entry to `CHANGELOG.md` in plain words, with an **Updating.** note that nothing needs doing by hand and direct use is off until chosen. Verify that `VERSION` is unchanged.

## 5. Verification

- [x] 5.1 Run `node .github/scripts/checks.mjs --worktree` and fix what it finds, including the app's coverage gate for `forward.ts`.

Publishing's own checkpoint passes CI, and its preview walk looks at this: Keys shows each key's row unchanged in width, an opened key shows *Not offered for this key* with no choice, and Access saves as before at phone width. A real direct request stays unverified until a real install saves a real key.
