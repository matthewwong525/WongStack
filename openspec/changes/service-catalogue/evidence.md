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
