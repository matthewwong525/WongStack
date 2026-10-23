## MODIFIED Requirements

### Requirement: A reply link opens in the inbox when it can

When the computer is signed in to the live app and the app has the inbox, opening a plan's reply link SHALL put the page in the person's inbox and give its inbox address, and SHALL start no tunnel for it. Any other page SHALL open through the tunnel as before and, when the inbox is available, SHALL also be listed there with its address only, never its content, until the link closes. Otherwise every page SHALL open through the tunnel as before. While any inbox item is open, the computer SHALL collect the person's taps, deliver them under the same fixed-message, version and once-per-action rules, and report each result back. A rebuilt page SHALL replace its inbox copy at the same address while that item is open; one opened again after its item closed SHALL get a new address.

#### Scenario: Signed in with the inbox

- **WHEN** a plan is made on a computer signed in to an app that has the inbox
- **THEN** the plan's link is its inbox address and no tunnel starts

#### Scenario: A form while the inbox is on

- **WHEN** the assistant opens an intake form on a computer signed in to an app with the inbox
- **THEN** the form opens at a tunnel link, the inbox lists it with *Open*, and the app holds neither the form nor the answers

#### Scenario: Not signed in

- **WHEN** a page is opened on a computer that is not signed in, or whose app has no inbox yet
- **THEN** it opens at a tunnel link, as before, and nothing is listed
