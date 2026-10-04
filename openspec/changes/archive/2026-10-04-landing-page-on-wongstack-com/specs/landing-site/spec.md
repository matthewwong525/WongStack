# Spec Delta

## REMOVED Requirements

### Requirement: The public domain moves only on the owner's word

**Reason**: The owner has seen the site live at its own address and said to switch. Its one scenario, that `wongstack.com` still shows what it showed before, is no longer true once this change is published.

**Migration**: Replaced by *wongstack.com shows the landing page* below.

## ADDED Requirements

### Requirement: wongstack.com shows the landing page

The published landing page SHALL answer at `wongstack.com` and `www.wongstack.com`, and SHALL stay reachable at its own address. Only a publish from the default branch SHALL attach those names: a preview of an unpublished change SHALL NOT take either one.

#### Scenario: A visitor opens wongstack.com

- **WHEN** a visitor opens `wongstack.com` or `www.wongstack.com` after this change is published
- **THEN** they see the landing page, with no sign-in and no pricing

#### Scenario: A later change is previewed

- **WHEN** an unpublished landing page change is previewed
- **THEN** the preview is shown at its own preview address, and `wongstack.com` keeps showing the published page
