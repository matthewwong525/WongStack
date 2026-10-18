# Evidence: service-catalogue

What each MCP's public sign-in metadata returned, read without signing in or registering. No token, client or account detail is kept here.

## Discovery (task 1.1, public half), 2026-10-18

Each address answered an unsigned `initialize` with `401` and a `WWW-Authenticate` header naming its metadata, as `app/worker/mcp/discover.ts` expects.

| | Canva `https://mcp.canva.com/mcp` | Notion `https://mcp.notion.com/mcp` |
|---|---|---|
| Metadata named in `WWW-Authenticate` | `/.well-known/oauth-protected-resource/mcp` | the same |
| `resource` | `https://mcp.canva.com/mcp` | `https://mcp.notion.com/mcp` |
| Sign-in server | `https://mcp.canva.com` | `https://mcp.notion.com` |
| Scopes offered | 16, from `profile:read` to `brandkit:read` | `default` |
| `authorize` / `token` / `register` | `/authorize`, `/token`, `/register` | the same |
| PKCE | `plain`, `S256` | `S256` |
| Grants | `authorization_code`, `refresh_token`, JWT bearer | the same |
| Client sign-in at `token` | `none`, `client_secret_post`, `client_secret_basic` | the same |

Both pass Add's checks; the app registers each as a public client (`none`) and asks for every scope the MCP lists.

## Still to prove on the first preview

Registration's answer, one sign-in round trip at Canva in the owner's browser, the token lifetime, whether the refresh token rotates, `readOnlyHint` coverage and the tool-list size: task 1.1, with the walk in task 8.2.

## Return addresses on the preview, 2026-10-18

The owner pressed Connect for Canva on the preview and Canva answered `Invalid redirect URI.` at `/authorize`. A probe then registered throwaway public clients with different return addresses and opened `/authorize` for each, without signing in:

| Return address | Canva `/register` | Canva `/authorize` | Notion `/authorize` |
|---|---|---|---|
| `https://<preview>.workers.dev/api/mcp/callback` | accepted | `400 Invalid redirect URI.` | `302` to Notion's sign-in |
| `https://example.com/callback`, `https://claymoo.com/api/mcp/callback` | accepted | `400 Invalid redirect URI.` | not tried |
| `http://localhost:<port>/callback`, `http://127.0.0.1:<port>/callback` | accepted | `302` to Canva's sign-in | not tried |
| `https://claude.ai/api/mcp/auth_callback` | accepted | `302`, marked `mcp_client_type=ClaudeConnector` | not tried |

Canva registers any address but signs in only to the computer's own address or an app it has approved, so no install's web address can connect it. Notion takes the preview's address. Add's checks cannot see this: registration succeeds, and only `/authorize` refuses.

## Which popular MCPs let a web app sign in, 2026-10-18

The same probe on 24 public MCP addresses: register a throwaway client with the preview's return address, then open `/authorize` without signing in. An opened sign-in page is not a finished round trip.

- **Sign-in page opens (14):** Notion, Linear, Atlassian, Sentry, Stripe, PayPal, Square, Webflow, Monday, Wix, Supabase, Cloudflare, Zapier, Airtable.
- **Approved apps only (3):** Canva (`/authorize` refuses), Intercom (`/register` answers `invalid_redirect_uri`), Figma (`/register` answers `403`).
- **No self-registration (4):** Asana, HubSpot, GitHub, Box: they need an app made on the service's developer site, the plan's later step.
- **Unclear (3):** Klaviyo's page didn't read clearly; Vercel and Shopify didn't answer as MCPs at the guessed address.

## Keys-only build on the preview, 2026-10-18 (task 7.3)

Run at `e6ca8c7` on the preview, signed in as the verification login, which is the owner there:

- `services` and `services --all` print one row: Cloudflare, its purpose, *not saved yet: ask the owner*, the notes path `wiki/services/cloudflare.md` (none yet) and its guide link.
- `list --q cloudflare` prints one line: `cloudflare.read  read  unavailable  Look something up in Cloudflare`; `list --limit 50` prints 7 lines.
- `call memory.search` with 100 results: a 32,894-byte answer prints a 4,238-byte envelope (`truncated`, `bytes`, `file`, `preview`); the file is mode `600` in a `700` folder; `--full` prints all 32,895 bytes. A 5,994-byte answer prints whole.
- Access → Services, on a desk and a phone: the Cloudflare row shows its purpose, the API guide link, *Not saved* and *Ask the assistant to finish Access setup*, with no value.
- A teammate's view isn't reachable on a preview, where the verification login is the owner; `Services.test.tsx` and `App.test.tsx` cover it.
