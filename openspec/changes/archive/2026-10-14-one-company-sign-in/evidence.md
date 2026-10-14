# Evidence

## 1.2 The cloudflared sign-in verifies in the Worker

2026-10-14. The saved session in `~/.cloudflared` gave a token for both origins with no new login:

- `cloudflared access token -app=https://prolific-bumblebee-wongstack-staging.matthewwong525.workers.dev`
- `cloudflared access token -app=https://wongstack.matthewwong525.workers.dev`

Both returned the same app token. Its claims, read without the signature:

| Claim | Value | Worker setting (`app/wrangler.jsonc`) |
|---|---|---|
| `aud` | `["b0e998ce…cd2590"]` | `CF_ACCESS_AUD` `b0e998ce…cd2590`, live and staging |
| `iss` | `https://startuptemplate.cloudflareaccess.com` | `CF_ACCESS_TEAM_DOMAIN` `startuptemplate.cloudflareaccess.com` |
| `type` | `app` | |
| `email` | `matthewwong525@gmail.com` | |
| `sub` | `759fcc53-…` | |
| `exp` | 2026-11-05T00:48:08Z (30 days from `iat`) | |

The token was then passed to the Worker's own `getAccessIdentity` from `app/worker/access.ts`, run under Node 22, with the staging env values and the live team certs fetched from `https://startuptemplate.cloudflareaccess.com/cdn-cgi/access/certs`:

```text
{"verified":true,"id":"matthewwong525@gmail.com","kind":"user","exp":"2026-11-05T00:48:08.000Z"}
wrong aud: null
tampered sig: null
```

On staging, `GET /api/actions` with only `cf-access-token: <token>` answered 200 with the action list; with no token the edge answered 302 to the sign-in.

**Result:** the `cloudflared` app token verifies against the Worker's `aud`, `iss` and certs. Live and staging share one Access application, so one token serves both. No re-plan needed.
