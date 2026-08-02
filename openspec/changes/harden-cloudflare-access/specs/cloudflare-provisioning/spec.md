## ADDED Requirements

### Requirement: The account is chosen before anything is created

Where the token resolves more than one Cloudflare account, the skill SHALL enumerate the accounts it can see and stop for an explicit choice **before creating any resource**. It SHALL NOT infer the account from ordering, from a single-match heuristic applied to a multi-match result, or from the repository's name.

Provisioning into the wrong account is expensive to undo — resources must be created again elsewhere and deleted here, and anything already bound to them re-bound — and the mistake is invisible at the moment it is made, since every call succeeds. An adopter with access to more than one account came within one step of provisioning a personal project into a business account.

#### Scenario: A multi-account token stops for a choice

- **WHEN** the token can see more than one account
- **THEN** the skill lists them and asks which to use
- **AND** it creates nothing until the answer arrives

#### Scenario: A single-account token does not ask

- **WHEN** the token resolves exactly one account
- **THEN** the skill proceeds, naming the account it resolved

### Requirement: Permission propagation is waited out, not treated as failure

After the token widens its own permissions, the skill SHALL treat an early authorization failure as **propagation rather than refusal**, retrying with backoff before concluding anything. A widen can take up to roughly a minute to take effect, and the Access endpoints in particular were observed returning `403` for about that long immediately after a successful widen.

The retry window and the reason SHALL be documented wherever the probe protocol is stated, so that a first `403` is not read as a wrong token, a wrong account, or a missing permission group — each of which sends the reader down a diagnosis that cannot succeed.

#### Scenario: An early 403 after widening is retried

- **WHEN** an API call fails authorization within the propagation window of a successful widen
- **THEN** the skill retries with backoff before reporting a failure
- **AND** it says it is waiting for propagation rather than reporting a permission problem

#### Scenario: A genuine permission failure is still reported

- **WHEN** the calls continue to fail after the documented window
- **THEN** the skill reports the failure with the permission group involved

### Requirement: A fresh hostname's placeholder is set as an expectation

The skill SHALL tell the user, at the point it hands over a newly created `workers.dev` URL, that a hostname can serve a placeholder or `404` for a minute or two after its first deploy. Without that sentence the first thing a new user sees at their new address is a page that reads as a failed deploy — observed twice in one adoption.

#### Scenario: The handover sets the expectation

- **WHEN** the skill reports a URL for a hostname deployed for the first time
- **THEN** it states that the address may briefly 404 or show a placeholder before it resolves

### Requirement: A run finishes with a smoke test against the deployed URL

Before reporting success, the skill SHALL make two requests against the deployed URL and assert the results: one **anonymous**, and one **authenticated** by the means the repo actually uses — a service token where Access is on, an ordinary request where it is not. It SHALL assert that each gets the response its configuration implies: the application for the authenticated caller, and the application or an Access challenge, per configuration, for the anonymous one.

A mismatch SHALL be reported as a failure of the run rather than a note, and SHALL name which of the two requests disagreed with the configuration.

This check exists because the two most damaging findings in this area were both invisible to every other step: an Access wall that admitted service tokens and challenged anonymous callers while serving a browser a placeholder, and an auth implementation that `401`d every machine caller. Both would have surfaced here immediately.

Where Access is in front, the skill SHALL additionally state that the smoke test does not prove a human can log in, and point at the runbook's browser verification — the terminal cannot establish that.

#### Scenario: A public app answers both requests

- **WHEN** the run finishes on a repo with no Access in front
- **THEN** both the anonymous and the authenticated request receive the application
- **AND** the run reports the check passed

#### Scenario: A gated app challenges the anonymous caller

- **WHEN** the run finishes on a repo with Access configured
- **THEN** the anonymous request receives a challenge and the service-token request receives the application
- **AND** the report states that browser verification is still required to confirm a human can pass

#### Scenario: A locked-out machine caller fails the run

- **WHEN** the service-token request is rejected by the app's own auth code
- **THEN** the run reports a failure naming that request
- **AND** it does not report provisioning as successful
