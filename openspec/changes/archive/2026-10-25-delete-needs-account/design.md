## Context

Seen 2026-10-25: `npx wrangler delete --name wongstack-line-staging --force` from `app/`, wrangler 4.152, with `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` set from `.env`. Its log shows `DELETE …/workers/services/wongstack-line-staging`, then `GET /memberships` failing with an `AuthenticationError` (*Are you missing the `User->Memberships->Read` permission?*). A rerun answered `This Worker does not exist on this account. [code: 10090]`, and the account's Workers list no longer had it.

## Decisions

- **The step lives in `wiki/stack/live-line.md`**, a bullet under *Its own Worker*: an install from before 44.14.0 deletes `<worker>-line-staging` after publishing, from `app/`, with the command; it can't be undone and held only test state; an error about memberships after it means the delete went through, so check the Workers list (Cloudflare dashboard → Workers & Pages) or rerun it, which answers `code: 10090` once it's gone.
- **The patch's Updating note** says the same in one sentence and links that bullet. The published 44.14.0 entry stays as it is.

**Non-Goals:** a script that deletes it; widening any token.
