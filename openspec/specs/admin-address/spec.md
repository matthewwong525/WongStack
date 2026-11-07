# admin-address Specification

## Purpose
The short address of WongStack's own app, kept in this repo: the app answers at admin.wongstack.com and its workers.dev address, and a preview never takes the name.

## Requirements

### Requirement: The app answers at admin.wongstack.com

This repo's own app, the Worker `wongstack`, SHALL answer at `admin.wongstack.com` once published from the default branch, and SHALL keep its `workers.dev` address. Both addresses SHALL ask for the same Access sign-in before any page, asset or API.

#### Scenario: A person opens the new address

- **WHEN** a person who is not signed in opens `https://admin.wongstack.com`
- **THEN** they get the Access sign-in, and after signing in they see the same app as at the `workers.dev` address

#### Scenario: The computer's tools keep the old address

- **WHEN** the change is published
- **THEN** the `workers.dev` address still serves the app, and the computer's memory and schedule calls succeed with no new sign-in

### Requirement: A preview never takes admin.wongstack.com

Every environment in `app/wrangler.jsonc` SHALL declare an empty `routes` list, so only the production Worker holds `admin.wongstack.com`. A check SHALL fail when the top-level routes are not exactly `admin.wongstack.com` as a custom domain, when `workers_dev` is not `true`, or when an environment lacks its own empty `routes`.

#### Scenario: A staging block loses its empty routes

- **WHEN** `env.staging` in `app/wrangler.jsonc` has no `routes` of its own
- **THEN** the check fails and names `env.staging` and `"routes": []`

#### Scenario: The workers.dev address is turned off

- **WHEN** `app/wrangler.jsonc` declares routes without `"workers_dev": true`
- **THEN** the check fails and says the computer's tools would lose their address
