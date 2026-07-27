## 1. The `wiki/stack/` section

- [x] 1.1 Create `wiki/stack/README.md` — the section hub: a strong opener stating it's the optional Cloudflare stack (recommendation, not requirement), a short map of the pages, and a placeholder note that the build/D1 pipeline pages arrive with `cloudflare-stack-pack`. Links down to both pages, up to `wiki/README.md`.
- [x] 1.2 Link the `wiki/stack/` hub from `wiki/README.md` as an optional section, visually distinct from the core process list (mirror how the existing list entries read), so nothing is orphaned.

## 2. Cloudflare Access runbook (`wiki/stack/cloudflare-access.md`)

- [x] 2.1 Write the setup runbook per `wiki/wiki-style.md` + `wiki/voice.md`: topic title, stand-alone opener, ordered steps — create the Zero Trust org, add an identity provider, create the Access application, protect the prod host + `*.workers.dev` previews with ONE wildcard policy (call out that this is what gates previews for free), add a bypass policy for `/public/*`, and state the policy ordering. Generalize from `~/ClaymooApp/docs/development/architecture.md` (Auth model) — nothing app-specific.
- [x] 2.2 Write the auth-model section: the Worker has no auth code and trusts `Cf-Access-Authenticated-User-Email` (generalize `~/ClaymooApp/worker/lib/access-email.ts`). State the safety boundary loudly — header trust holds only behind the proxy — and make "verify previews are actually gated by the wildcard" an explicit step. Specify `401` on a missing header, with a fallback identity only under an explicit `SKIP_AUTH` dev flag (generalize `~/ClaymooApp/docs/development/dev-servers.md` local-auth).
- [x] 2.3 Cross-link: down/sideways to `cloudflare-credentials.md` (for the service token added to the policy), up to the `wiki/stack/` hub. Verify Access dashboard menu/label names against the live dashboard; where a name can't be verified, describe the capability and flag it rather than guessing.

## 3. Cloudflare credentials guide (`wiki/stack/cloudflare-credentials.md`)

- [x] 3.1 Write the user-scoped API token guide: create it at My Profile → API Tokens (user-scoped, NOT an account token), list the permissions it needs, and store `CLOUDFLARE_USER_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` in `.env` — link `wiki/development/secrets.md`, don't restate it. Call out the account-token trap and its `Invalid token` symptom against the Workers Builds log API (generalize `~/ClaymooApp/docs/development/ci-and-deploy.md`).
- [x] 3.2 Write the Access service-token section: create the service token, add it to the Access policy, and state that this is what lets a non-interactive CI/test caller reach an Access-gated preview (generalize the note in `~/ClaymooApp/.claude/skills/server/SKILL.md`). Cross-link up to the hub and sideways to `cloudflare-access.md`.
- [x] 3.3 Verify exact Cloudflare permission names and menu paths against the live dashboard before finalizing; describe-and-flag anything unverifiable rather than pinning a guessed label.

## 4. Retire the superseded change + release

- [x] 4.1 Remove `openspec/changes/recommended-stack-guide/` (0/8 tasks, unstarted) as superseded by this arc; confirm `openspec list` no longer shows it.
- [x] 4.2 Add a newest-first `CHANGELOG.md` entry and bump `VERSION` (minor — additive docs).
- [x] 4.3 Verify: both pages read as optional and stand-alone, every link resolves (up/down/sideways + `wiki/README.md` → hub → pages), the header-trust boundary and the account-token trap are both explicit, and no skill/installer/core doc now implies Cloudflare is required.
