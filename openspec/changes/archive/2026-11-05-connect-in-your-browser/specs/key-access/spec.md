# Spec Delta

## ADDED Requirements

### Requirement: A tool added from a chat works with no publish

The owner or an Admin SHALL be able to add a tool to the live app, and remove it, with no code change and no publish: its name, purpose, API guide, address, the secret it sends and how, and the requests it counts as reads. The tool SHALL be used directly like any key, live only, and governed by the same key levels. A preview SHALL hold no such tool. Nobody else SHALL be able to add or remove one, and a tool SHALL NOT take the name of a key in the code. Removing a tool, or a save that changes what it reads or the levels it offers, SHALL drop every level given on it, so it is given again on purpose.

#### Scenario: The owner adds Stripe

- **WHEN** the owner's assistant adds Stripe and its key is saved
- **THEN** a Stripe look-up through the app answers within seconds, with no publish

#### Scenario: A teammate tries to add a tool

- **WHEN** a teammate with no Admin role asks the app to add a tool
- **THEN** the app refuses and nothing is added

### Requirement: A tool added from a chat is held to the direct-use rules when saved

The app SHALL refuse to save a tool, naming the rule, when it has no purpose, no HTTPS API guide, an address that is not HTTPS, a secret that is not its own, or a read that could match a path outside its address. These SHALL be the same rules the checks hold a key in the code to before publishing.

#### Scenario: A read outside the address

- **WHEN** a tool is saved with a read that could match a path outside its address
- **THEN** the app refuses it and names that read

### Requirement: Services shows a chat-added tool's reads

The Services view SHALL list each tool added from a chat with the other keys, mark it as added in a chat, and show the requests it counts as reads, so the owner sees what *Read* allows before giving anyone a level. It SHALL show no key value.

#### Scenario: The owner opens Services

- **WHEN** the owner opens Services after adding Stripe from a chat
- **THEN** Stripe shows Saved, *added in a chat*, and its reads, and no key value

### Requirement: An app's first use of a chat-added tool moves it into code

A change that first builds an app or action on a tool added from a chat SHALL move that tool into the code's keys, keeping its secret, so the checks review it before publishing; from then on the code's entry SHALL win over the stored one.

#### Scenario: A first app on Stripe

- **WHEN** a change builds an app that lists the chat-added Stripe tool
- **THEN** Stripe is a key in the code in that change, its checks pass, and its saved key keeps working after publish
