# Proposal

**Status:** ready-to-ship
**Branch:** manual-api-tokens
**Open questions:** none

## Why

Token pages are finicky, and people should provide their own API tokens. The assistant should give you a useful link and steps instead of using its browser to get or change a token.

## What Changes

- **You handle token pages yourself.** When a website needs you to get, create, rotate, edit, or revoke an API key or token, the assistant asks you to do it in your own browser, with a direct link and short steps. New values come back through the existing private key link.
  ```text
  need a token or a change
            │
            ▼
      link and steps
            │
            ▼
     you use the website
            │
            ▼
     private key link
            │
            ▼
      assistant resumes
  ```

Non-goals: Change ordinary website browsing, saved logins, private key storage, or existing token management through authorized APIs.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `browser-logins`: Token website tasks are handed to the person instead of using the agent's browser.

## Impact

Update the shared entry rule in `AGENTS.md`, the owning procedure in `wiki/development/secrets.md`, links from browsing and API-key guidance, and the payload changelog. No application or browser-tool code changes.

## Decision log

- **2026-09-30** — Asked: How should the assistant handle getting or changing API tokens? → chose: Ask the person, with a helpful link and steps; keep other browsing as usual, because token pages are finicky and humans should provide the values.
- **2026-09-30** — Assumed: This boundary covers token website interactions, including revealing, copying, permission edits, and revocation, because those use the browser access the request excludes.
- **2026-09-30** — Assumed: Existing authorized API provisioning stays unchanged, because the request concerns browser access and says everything else continues as usual.
- **2026-09-30** — Assumed: Keep the procedure on the secrets page and link from the browsing and API-key pages, so the vendored browser skill and other workspaces' setup changes remain untouched.
- **2026-09-30** — Asked: Publish the finished change? → chose: Run `/ship`; all five tasks are complete, the change is archived, and release 28.1.0 includes the latest published changes before this checkpoint.
