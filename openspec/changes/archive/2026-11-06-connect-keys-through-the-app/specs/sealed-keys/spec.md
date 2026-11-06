## ADDED Requirements

### Requirement: A key sent to the app stays sealed until the publish

A key sent to the company app, from Access or from the assistant, SHALL be sealed before it leaves the person's browser or computer, with a lock only the publish can open. The app SHALL keep only the sealed value, the key's name, its last four characters, who sent it, and when. Neither the app nor anyone reading its database SHALL be able to open a sealed key, and no route SHALL return a sealed value. Only the owner or an Admin SHALL be able to send a key, only to the live app, and only under the name of a key in the code or a tool added from a chat. A newer key for the same name SHALL replace a waiting one.

#### Scenario: A teammate sends a key

- **WHEN** a teammate who is not an Admin sends a Stripe key to the app
- **THEN** the app refuses it and stores nothing

#### Scenario: A copy of the database leaks

- **WHEN** someone reads the app's database while a Shopify key waits
- **THEN** they find a sealed value they can not open, and the name and last four characters

### Requirement: The publish puts waiting keys into the app's secrets

Each publish of the live app SHALL open every waiting key, put it into the live app's Cloudflare secrets, and then delete it from the app's database. A key it can not open or put SHALL stay waiting, and the publish SHALL name it without its value. No preview SHALL open or receive a waiting key. The assistant SHALL be able to start a publish that changes only keys.

#### Scenario: A publish with a waiting key

- **WHEN** the live app is published while a Notion key waits
- **THEN** the Notion key is in the live app's secrets, the database no longer holds it, and Services shows Notion as Saved

#### Scenario: A preview

- **WHEN** a preview is published while a Notion key waits
- **THEN** the key stays waiting and the preview does not hold it

### Requirement: A tool can trade an ID and a secret for a short token

A tool added from a chat SHALL be able to name a token address on its own service's host, so the app trades the tool's ID and secret there for a short token, by the standard client-credentials grant, and sends that token in place of a fixed key. The app SHALL reuse the token until shortly before it runs out, and SHALL get a new one when the service refuses an old one. No token, ID, or secret SHALL be returned to the caller. A token address that is not HTTPS, or not on the tool's own host, SHALL be refused when the tool is saved.

#### Scenario: Shopify with an ID and a secret

- **WHEN** a person with Read on Shopify asks for the shop's name, and the app holds Shopify's ID and secret
- **THEN** the app gets a token from the store, sends the look-up with it, and returns only the shop's answer

#### Scenario: A token address on another host

- **WHEN** a tool is saved whose token address is on a different host from its API address
- **THEN** the app refuses the tool and names the token address
