# Tasks

## 1. Owners absorb their facts (before any duplicate is cut)

- [x] 1.1 `wong-cloudflare/references/permission-groups.md` — absorb the widen protocol as the owning statement: the five-call sequence, the wholesale-`PUT` rule (must retain `API Tokens Write` + `Account API Tokens Write`, preserve the account resource block), resolve-ids-by-name + the ambiguous-name/scope rule, the five normal-provision groups table (with the "For" column and the Workers-CI-naming note), and the three Access groups. Keep the recorded ids as fallback/fixture.
- [x] 1.2 `wiki/stack/cloudflare-credentials.md` — confirm it owns the full token click path + Account Resources warning; **fix the stale line** "CI doesn't need a copy: Workers Builds runs inside Cloudflare" (the Actions workflow reads the credentials from GitHub repository secrets); replace its duplicated widen call list and permission table with a link to `permission-groups.md`.
- [x] 1.3 `wiki/stack/d1-pipeline.md` — confirm it owns why-Actions-not-Workers-Builds and the thin-driver workflow description, and that its Workers Builds **fallback** paragraph (with the dashboard deploy-command setting) is the single home of that dashboard step.
- [x] 1.4 `wiki/development/required-tools.md` — add the owning `workflow`-OAuth-scope explanation: why the scope, the exact `refusing to allow an OAuth App to create or update workflow` failure and that it fires at push time, `gh auth login --scopes workflow` up front, `gh auth refresh --scopes workflow` as repair, and the plain-language one-liner.
- [x] 1.5 `wong-cloudflare/references/failure-map.md` — replace the stale "Preview swap refuses to run" row with the current model's failure (`cf-deploy.sh` refuses when a non-production branch resolves to the production Worker name; staging env missing its own `name`/`d1_databases`); keep it the single home of failure translations.

## 2. wong-cloudflare — one door, outcome flow, env.staging model

- [x] 2.1 Rewrite Step 0 per design D1: flag true → continue; flag false or pack files missing → make the outcome-phrased offer (moved from setup Step 6, same wording contract: outcome not inventory), on yes set `components.stackPack: true`, land drop-ins by following `wong-sync` SKILL Steps 1–2 (clone refresh + copy-if-absent, no adapt), apply the id-free fragments (`package.json`, `.env.example`, `.gitignore`) from `stack-pack-fragments.md`, then continue; on no, stop unchanged. No token yet → stop cleanly after adoption, saying a re-run provisions. Drop the missing-wrangler-config bounce (the fragment creates it).
- [x] 2.2 Step 1b/1c slim: 2–3 line click-path summary + link to `cloudflare-credentials.md`; failure handling links `references/failure-map.md` instead of the inline two-row table.
- [x] 2.3 Step 2 slim: state the outcome (two-permission token widens itself; stop-and-list on refusal) + link `references/permission-groups.md` for the protocol. No inline call diagram or group table.
- [x] 2.4 Step 4c rewrite to the staging-Worker model: merge the `wrangler.jsonc` fragment with real ids — production id in the top-level binding, staging id inside `env.staging`, each with its own `database_name`/`migrations_dir`; no `preview_database_id`, no swap language. Keep the `migrations_dir`-relative-path caution as a one-liner + link to the fragment's rules.
- [x] 2.5 Step 4e slim: keep `gh auth status` check + `gh auth refresh --scopes workflow` offer as one line each, link `required-tools.md` for the why; keep the thin-driver sentence as a link to `d1-pipeline.md`.
- [x] 2.6 Step 4f/5: preview URL pattern in its `-staging` form (`<branch>-<worker>-staging.<subdomain>.workers.dev`), noting per-commit URLs are harvested by CI, not constructed.
- [x] 2.7 Step 6 (Access) slim: keep the two-things-together warning and the unverified Zero Trust org caveat; link `cloudflare-access.md` for the runbook and `permission-groups.md` for the Access groups.
- [x] 2.8 Update the frontmatter description for the adoption leg ("the one door to the pack: offers it, lands its files, configures, provisions, tears down") and confirm the whole SKILL reads as the outcome flow (~150 lines).

## 3. wiki/stack — delete the clone, keep one narrative

- [x] 3.1 Delete `wiki/stack/provisioning.md`. Sweep `grep -rn "provisioning\.md"` across the repo and repoint every inbound link (known: `wiki/stack/README.md`, `getting-started.md`, `required-tools.md`; check notes/ and specs references).
- [x] 3.2 `wiki/stack/getting-started.md` — keep the human narrative only: link the credentials page for the click path (drop the duplicated route + failure table), link required-tools for the workflow scope, fix the preview URL to the `-staging` form, and point "what happens next" at `/wong-cloudflare`.
- [x] 3.3 `wiki/stack/core-stack.md` — fix "Workers Builds runs the build and deploy wrappers" to the CI-neutral truth (the pack's CI — GitHub Actions by default — runs them).
- [x] 3.4 `wiki/stack/README.md` — drop the provisioning.md entry, tighten the per-page blurbs to one line each, and remove the duplicated pack-gating sentence (link the payload manifest).
- [x] 3.5 `wiki/stack/cloudflare-access.md` — confirm it is the Access runbook owner; keep its unverified-org labelling; no content moves in, only the skill's Step 6 now points here.

## 4. Fragments + payload manifest

- [x] 4.1 `wong-sync/references/stack-pack-fragments.md` — applier sentence: `/wong-cloudflare` applies fragments at adoption and provisioning (setup applies none); fix `CLOUDFLARE_USER_TOKEN=` → `CLOUDFLARE_API_TOKEN=` (keep the user-scoped/account-token warning comment); rewrite the Workers Builds deploy-command section to fallback-only — a pointer at `d1-pipeline.md`'s fallback paragraph, dropping "the pack does not work without it".
- [x] 4.2 `wong-sync/references/payload-manifest.md` — remove `provisioning.md` from the `wiki/stack/` list; update the fragments paragraph's applier (guided edits via `/wong-cloudflare`, surfaced through adapt when upstream changes one).

## 5. wong-setup — shrink and reference

- [x] 5.1 Step 6 pack offer: keep the outcome-phrased ask and the on-yes seed-manifest flag; delete the fragment-application instruction; closing line on yes = "run `/wong-cloudflare` when you have a Cloudflare account — it configures and provisions"; on no = name the working late-adoption route (set the flag + `/wong-sync`, then `/wong-cloudflare`). Keep the walkthrough name-drop paragraph.
- [x] 5.2 Step 7: replace the inline seed-manifest JSON with a reference to `wong-sync` SKILL Step 4's schema — "same shape, `version`/`commit` null, today's dates, renames from Step 6" — keeping the hand-off unchanged.
- [x] 5.3 Step 0: mark the clone cache path as a copy of the value `wong-sync` Step 1 owns.
- [x] 5.4 Step 5: cut the two workflow-scope paragraphs to one line each (login with `--scopes workflow`; refresh as repair) + link to `required-tools.md`'s owning explanation.
- [x] 5.5 Step 8 → one line: "Legacy traces (pre-v5: `WONG-FRAMEWORK` markers, `.wong-framework.json`, retired skills, `daily/`): offer to migrate or remove what Step 2 found — ask first, never delete unprompted." Fold Step 1's pre-2.0 manifest-name fallback into a parenthetical there or in Step 1's first line.
- [x] 5.6 `references/fit-playbook.md:42` — rewrite the stale contribute row: the pain maps to `/wong-sync` pulling upstream improvements down + the manual PR route (`contributing.md`) for sending fixes up; no "opens the PR itself".

## 6. wong-sync — schema owner and truthful pointers

- [x] 6.1 SKILL Step 4: mark the manifest schema block as the payload's single statement of the schema (setup references it for the seed); no content change beyond the ownership note.
- [x] 6.2 SKILL Step 2 (pack scoping rule): after "never copied, never analysed, never offered", add the truthful pointer — adopting the pack is `/wong-cloudflare`'s job (or the flag + a sync where the skill isn't installed).
- [x] 6.3 `references/adapt.md` — remove the `stack-pack-cloudflare — declined` line from the example verdict record (a non-pack repo's pack is never analysed, so the example was impossible).

## 7. Journey visibility

- [x] 7.1 Root `README.md` — one sentence after the workflow table: the optional `/wong-cloudflare` door to a real, visitable website.
- [x] 7.2 `wiki/README.md` — the stack section line tells the flow: setup once → `/wong-sync` to stay current → `/wong-cloudflare` if you want it live.

## 8. Sweeps, release

- [x] 8.1 Sweep `grep -rn "preview_database_id\|swap-d1-id\|CLOUDFLARE_USER_TOKEN" wiki/ .claude/ AGENTS.md README.md` — the only remaining live hits are `d1-pipeline.md`'s adoption runbook (the thing you remove) and changelog/archive history.
- [x] 8.2 Sweep `grep -rn "it'll offer the pack\|take the pack later" wiki/ .claude/` — every hit names the working route.
- [x] 8.3 Sweep the workflow-scope fact: the full explanation appears only in `required-tools.md`; `wong-setup`, `wong-cloudflare`, and `getting-started.md` carry one line + link each.
- [x] 8.4 Verify every markdown link added or repointed in this change resolves; run `openspec validate setup-sync-consolidation`.
- [x] 8.5 Bump `VERSION` 8.5.0 → 8.6.0 and add the newest-first `CHANGELOG.md` entry: the five drift fixes, provisioning.md deleted with the ownership map, the `/wong-cloudflare` adoption leg + fragments ownership, setup/sync single owners, journey lines.
