# Design

## Context

See proposal.md. Three shipped wiki pages each gain one line a dream found missing, and the dream script gains one test. No code path changes.

## Goals / Non-Goals

**Goals:** each addition sits where a reader already looks for the rule, in the page's own voice, inside the page's and its save route's text limits.

**Non-Goals:** the tools page, and any change to what `/dream-memory` does.

## Decisions

- **The after-publishing rule joins `/ship`'s own bullet in `wiki/development/the-change-loop.md`**, because `/ship` is what refuses the unticked task. It is one sentence: the page is on the named-secret save route, whose byte total may not grow, and 93 bytes were free.
- **The `close --all` warning joins the *one browsing task at a time* paragraph in `wiki/development/browsing.md`**, which already says never to delete the profile's lock.
- **The one-off permission line joins the list under *The widen is pre-authorized* in `wiki/stack/cloudflare-credentials.md`**, as one more thing the standing permission does not cover. It says to ask first.

## Risks / Trade-offs

- [The one-off permission line reads as a new grant] → it is worded as a limit: it asks first, lasts 15 minutes, and is never written to a file.
