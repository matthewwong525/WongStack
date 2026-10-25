# Design

## Context

The inbox shows a plan's review page in `<iframe sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox" srcDoc={item.body}>` (`app/src/apps/inbox/PlanView.tsx`). A `srcdoc` document's address is `about:srcdoc`, but its links resolve against the parent's base address. The page's section links (`<a href="#why">` and the rest in `review-kit.html`'s `.jump` nav, and any `#` link a proposal holds) therefore point at `https://<app>/apps/inbox/?item=<id>#changes`. That is a different document, so tapping one loads the inbox's address inside the sealed frame: the plan goes blank (seen 2026-10-25 on the inbox-phone-fixes preview).

`review-kit.html` already has a capture-phase click listener for framed pages: links not starting with `#` get `target="_blank"`, and `#` links are left alone, which is the bug. `jump()` handles `#/why`, `#/<n>` and `#/decisions/<n>` from `location.hash` on load and on `hashchange`.

## Goals / Non-Goals

**Goals:** in a frame, every `#` link scrolls the page to its target and never navigates the frame.

**Non-Goals:** the inbox side (it can't see into the sealed frame); a plan already sent (it keeps its old kit until rebuilt); links to other pages.

## Decisions

- **Handle `#` links in the existing framed click listener.** When `window.parent !== window` and the link's `href` starts with `#`, call `preventDefault()` and scroll in place: a `#/…` route goes through `jump`, which takes the hash as an argument (default `location.hash`); any other `#id` scrolls `document.getElementById(decodeURIComponent(id))` into view with `block: 'start'`. An unknown target does nothing, rather than navigate.
  - *Alternative:* a `<base href="about:srcdoc">` in the kit. Rejected: it changes how every relative link resolves, and the existing "opens in its own tab" path relies on today's resolution.
  - *Alternative:* setting `location.hash` in the frame. Rejected: fragment navigation on `about:srcdoc` differs by browser, and the in-place scroll is enough.
- **Opened on its own, the page is unchanged**: the default link behaviour already works there and keeps the address shareable.

## Risks / Trade-offs

- **Scrolling tucks the inbox's bars** → expected: a jump down is reading down.
- **Old plans keep the bug** until their chat rebuilds them → noted in the changelog.
