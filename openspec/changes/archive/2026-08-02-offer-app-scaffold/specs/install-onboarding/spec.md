## MODIFIED Requirements

### Requirement: wong-setup offers the stack pack as an opt-in

`wong-setup` SHALL offer the Cloudflare stack pack once during setup, as a single plain-language prompt, framed as optional with decline as the safe default. On acceptance it SHALL record `components.stackPack: true` in the seed manifest so `/wong-sync`'s pull installs the pack's files alongside the rest of the payload; on decline it SHALL leave `components.stackPack` false/absent and install no pack file. The offer SHALL NOT be a gate — declining never blocks or complicates the rest of setup.

The offer SHALL be phrased as an **outcome the user recognizes**, not an inventory of what ships. It SHALL NOT lead with product or component names (`D1`, `Workers`, "pipeline scripts", "seed template") — the audience is someone who does not know what those are, decline is the documented safe default, and a jargon-first offer therefore converts the target user into a decline by confusion. It SHALL name the practical cost honestly (a free Cloudflare account, a few minutes) and the practical result (a live address other people can open). Technical detail SHALL remain available for a user who asks, as a follow-up rather than as the prompt.

**The offer SHALL include the app scaffold when, and only when, the repo has no application of its own.** Research SHALL determine this before the offer is made, from the absence of an application to build — no build script in a `package.json`, no application entry point, and no wrangler config. Where that holds, accepting the offer SHALL install the scaffold too, and the seed manifest SHALL record both `components.stackPack: true` and `components.appScaffold: true`. Where the repo already has an application, the scaffold SHALL NOT be mentioned and the manifest SHALL record `stackPack` alone.

The scaffold SHALL NOT be raised as a second question. It is part of what the one outcome-shaped offer delivers, not a separate decision the user is asked to adjudicate — a repo with nothing to deploy cannot honour "a real website people can open at an address" without an app, so bundling it is what makes the existing promise true. The prompt SHALL remain free of product and component vocabulary when the scaffold is included; describing it as *"I'll set up a starter site you can change"* satisfies this, while naming React, Vite, or a Worker does not.

`wong-setup` SHALL NOT apply the pack's config fragments. On acceptance it SHALL name `/wong-cloudflare` as the follow-on step that configures and provisions, runnable whenever the user has a Cloudflare account. On decline it SHALL name the late-adoption route that actually works (per the stack-pack capability) rather than implying `/wong-sync` will offer the pack.

#### Scenario: User accepts the pack

- **WHEN** the user accepts the stack-pack offer during `wong-setup`
- **THEN** the seed manifest records `components.stackPack: true`
- **AND** the `/wong-sync` pull installs the pack's files with the rest of the payload
- **AND** setup applies no config fragment, telling the user `/wong-cloudflare` configures and provisions whenever they have a Cloudflare account

#### Scenario: A repo with no app accepts the offer

- **WHEN** research finds no build script, no application entry point, and no wrangler config, and the user accepts the offer
- **THEN** the seed manifest records both `components.stackPack: true` and `components.appScaffold: true`
- **AND** the `/wong-sync` pull installs the app scaffold alongside the pack

#### Scenario: A repo that already has an app is never offered the scaffold

- **WHEN** research finds an application the repo already builds
- **THEN** the offer covers the pack only and never mentions the scaffold
- **AND** an acceptance records `components.stackPack` alone

#### Scenario: The scaffold does not add a question

- **WHEN** the scaffold is included in the offer
- **THEN** the user is asked exactly one question, about the outcome
- **AND** they are not asked to decide separately about an application, a framework, or a Worker

#### Scenario: User declines the pack

- **WHEN** the user declines the offer
- **THEN** setup proceeds normally, `components.stackPack` stays false/absent, and no pack file is installed
- **AND** any mention of taking the pack later names the working route

#### Scenario: The offer is not a toll gate

- **WHEN** the user declines or ignores the pack offer
- **THEN** the rest of setup completes exactly as it would for a repo that was never offered the pack

#### Scenario: A non-technical user meets the offer

- **WHEN** the offer is shown to someone who does not know what a database or a Worker is
- **THEN** the prompt describes the outcome in words they already understand and states what it will cost them
- **AND** it does not require them to recognize any product, component, or file name in order to answer
