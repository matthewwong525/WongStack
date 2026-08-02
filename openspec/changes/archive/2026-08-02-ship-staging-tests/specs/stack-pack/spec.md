## ADDED Requirements

### Requirement: The pack's CI publishes the preview URL it produced

The pack's deploy script SHALL surface the per-commit preview URL that `wrangler versions upload` produced, and the pack's GitHub Actions workflow SHALL publish it to GitHub as a Deployment carrying an `environment_url`.

The URL SHALL be **harvested from wrangler's own output, never constructed** from the documented `<alias>-<worker>-staging.<subdomain>.workers.dev` shape. A constructed URL is a guess that can answer `200` while pointing at a different commit, or at a Worker this deploy never touched — which defeats the purpose of a per-commit URL. When wrangler prints no URL, the scripts SHALL publish nothing and callers SHALL report that no preview URL exists, rather than emitting an unverified one.

Publication SHALL be a no-op outside GitHub Actions: under Cloudflare Workers Builds, Cloudflare's own GitHub integration already attaches the URL to the commit, and the deploy script SHALL NOT duplicate it.

Failure to publish SHALL NOT fail the deploy. The deploy has already succeeded by that point, and a missing URL degrades the tooling that reads it rather than the release.

#### Scenario: Actions publishes the URL wrangler printed

- **WHEN** the workflow deploys a non-production branch and `wrangler versions upload` prints a preview URL
- **THEN** the workflow creates a GitHub Deployment for the head SHA whose status carries that URL as `environment_url`
- **AND** `.claude/skills/save/scripts/preview-url.sh` resolves that same URL for the commit

#### Scenario: No URL printed is reported, not invented

- **WHEN** `wrangler versions upload` prints no `workers.dev` URL
- **THEN** the deploy script warns and publishes nothing
- **AND** the deploy itself still succeeds

#### Scenario: Workers Builds is left alone

- **WHEN** the deploy script runs under Cloudflare Workers Builds rather than GitHub Actions
- **THEN** it emits the URL for the log but publishes no GitHub Deployment, because Cloudflare's integration already did
