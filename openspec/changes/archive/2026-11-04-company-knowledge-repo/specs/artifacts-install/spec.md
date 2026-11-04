# Spec Delta

## MODIFIED Requirements

### Requirement: Setup installs with one Cloudflare account

A new install on Mac or Linux SHALL complete from one Cloudflare user token and no GitHub account, with its repository, app hosting, login wall and check runner all in the person's own Cloudflare account. Setup SHALL confirm the account can hold them before it creates anything. Because every install keeps company knowledge in Cloudflare, every route SHALL need Cloudflare's paid plan, and setup SHALL check it before creating anything on either route.

#### Scenario: A fresh computer

- **WHEN** a person whose Cloudflare account has the paid plan asks for an install in an empty folder
- **THEN** the install finishes with its repository and site in that account, and no GitHub sign-in is asked for

#### Scenario: The account is on the free plan

- **WHEN** the token's account lacks the paid plan, on either route
- **THEN** setup stops before creating any resource, says the plan is needed for every way to install and what it costs, and offers to wait while the person turns it on
