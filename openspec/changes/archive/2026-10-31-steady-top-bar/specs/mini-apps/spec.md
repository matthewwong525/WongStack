## REMOVED Requirements

### Requirement: The top bar scrolls with the page

**Reason**: Matthew found the bar that hides and slides back jerky, and wants it to stay put.
**Migration**: None; the bar stays at the top of every page, per "The top bar stays at the top".

## ADDED Requirements

### Requirement: The top bar stays at the top

The main app's top bar SHALL stay at the top of the screen on every page while the person scrolls, laid over the page's content, never hiding, and opaque enough that the page's text under it does not make it hard to read.

#### Scenario: Reading down a long page

- **WHEN** the person scrolls down a page longer than the screen
- **THEN** the top bar stays at the top, its links and the light and dark switch in reach, while the page scrolls under it
