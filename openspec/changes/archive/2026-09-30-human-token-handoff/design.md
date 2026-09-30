# Design

## Context

See [the proposal](proposal.md) for motivation. `wiki/development/browsing.md` currently directs personal website tasks through saved logins and remote hand-over. `wiki/development/secrets.md` already receives user-supplied values through a private key form. The vendored browser skill is an upstream discovery stub, so local policy belongs in the shared entry rule and wiki.

## Goals / Non-Goals

**Goals:** Make the exception discoverable before any token website interaction, including when an ordinary browsing task encounters token management.

**Non-Goals:** Change scripts, the private input UI, or API-based provisioning. This is an instruction change; no local app build or new tests are needed.

## Decisions

- Put the full procedure under `wiki/development/secrets.md#api-token-website-steps`: choose the direct management page from existing provider guidance, state the intended action and needed permissions, ask the person to use their own browser, and await a saved value or completion confirmation. Link from `AGENTS.md`, browsing, and the user-facing API-key guide. Duplicating the full procedure in the browser skill would fork upstream content and create two owners.
- Treat token operations as an exception to both browser automation and remote hand-over. A saved session does not remove that exception. If an ordinary task encounters a token step, stop interacting with that step before screenshots or extraction and hand the person the website URL.
- Keep existing authorized Cloudflare API provisioning and credential use unchanged. Requiring manual replacement for every machine token would expand the request into setup and verification code changes.
- Add a minor payload release entry and leave `VERSION` alone. No credential migration is required. Keep active setup work in other workspaces untouched.

## Risks / Trade-offs

- [An agent follows generic browsing instructions first] → A shared entry rule and early browsing-page link expose the exception before login and screenshots.
- [A provider link or label is uncertain] → Use its known dashboard link with the navigation path rather than inventing an account-specific URL. Token values and pages never enter agent browser output.
- [Instructions are not a runtime tool restriction] → State the observable boundary in the browser contract and review the instructions against missing-token, rotation, permission-edit, revocation, and ordinary-browsing cases.

## Migration Plan

Publish the updated payload instructions through the usual release. Existing credentials and private key links require no migration. Revert the instruction and release-entry changes to undo the policy.
