## REMOVED Requirements

### Requirement: The widen covers the walkthrough's browser

**Reason**: The permission existed for exactly one purpose — letting the provisioned `CLOUDFLARE_API_TOKEN` open Cloudflare Browser Run sessions for `/walk`. The walkthrough now drives a local Playwright browser and the Browser Run path is removed, so the grant serves nothing. Granting a permission with no consumer contradicts the narrow-token principle the widen and its narrow-back offer exist to serve.

**Migration**: No action is required of any repo. A token widened by an earlier version keeps the Browser Rendering Edit group; it is unused and harmless, and `/wong-cloudflare`'s existing narrow-back offer already removes it along with the other groups it granted. New provisioning runs simply do not request it. The Access permission groups are unaffected — `/walk` still mints an Access service token when it meets an Access wall, and that heal widens into the Access groups on demand exactly as before.
