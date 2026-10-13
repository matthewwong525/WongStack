# Spec Delta

## Purpose

Lets the agent find, compare, and buy products through Shop for the person: looking needs no account, paying needs the person's yes each time, and no payment secret reaches the agent.

## ADDED Requirements

### Requirement: The agent shops through Shop without an account

For a product request, the agent SHALL search Shop before it browses a store's website, and SHALL be able to search, compare, and fill a cart with no Shop account. Each option it shows SHALL name the seller and the price with its currency and link the product. With a cart or checkout it SHALL give the store's own checkout link, so the person can always pay themselves.

#### Scenario: A request with no account connected

- **WHEN** the person asks for a product and no Shop account is connected
- **THEN** the agent shows options with seller, price, and product link, without asking the person to sign in

#### Scenario: The person wants to pay themselves

- **WHEN** the person picks an item and has not connected Shop
- **THEN** the agent gives the store's checkout link for that item and pays nothing

### Requirement: The agent connects a Shop account only on the person's yes

The agent SHALL ask in the chat before it connects the person's Shop account, and SHALL ask only when the task needs the account. The person SHALL approve the connection in Shop themselves. One connection SHALL serve every repo on the computer. After a no, the agent SHALL continue without an account and SHALL NOT ask again in that task.

#### Scenario: The person says yes

- **WHEN** the person agrees to connect Shop
- **THEN** the agent gives them Shop's link and code, and uses the account only once Shop reports the connection approved

#### Scenario: The person says no

- **WHEN** the person declines to connect Shop
- **THEN** nothing is connected, the agent goes on with what needs no account, and the task does not ask again

### Requirement: The agent pays only after a yes that names the purchase

Before it pays through Shop, the agent SHALL ask the person in the chat, naming the store, the items, the total with its currency, the delivery address, and the card by brand and last digits, and SHALL pay only on a yes. The yes SHALL cover that purchase at that total alone.

#### Scenario: A confirmed purchase

- **WHEN** the person says yes to the named purchase
- **THEN** the agent pays once and reports the order only when Shop returns a completed order

#### Scenario: The total moved after the yes

- **WHEN** the store's total differs from the one the person agreed to
- **THEN** nothing is paid, and the agent asks again with the new total

### Requirement: A payment through Shop is never sent twice

The agent SHALL send a payment at most once per confirmed purchase. When the outcome is not known, it SHALL look the purchase up, SHALL NOT pay again or start a replacement purchase, and SHALL tell the person the outcome is not confirmed and give the store's checkout link.

#### Scenario: No answer comes back

- **WHEN** a payment is sent and no result returns
- **THEN** the agent reads the purchase's state once, reports an order only if it shows completed, and otherwise says it is not confirmed without paying again

### Requirement: The agent never sees a payment secret from Shop

A card number, a payment credential, or the Shop sign-in SHALL NOT appear in any command, output, log, message, or repository file the agent can read. Of a saved payment method the agent SHALL see only what names it to the person, such as brand and last digits. The agent SHALL NOT obtain a card issued for it to type into a website.

#### Scenario: A checkout lists saved cards

- **WHEN** a checkout returns the person's saved payment methods
- **THEN** the agent sees each one's brand and last digits, and no credential

#### Scenario: A website outside Shop's checkout

- **WHEN** a purchase can only be made by typing a card into a website's own form
- **THEN** the agent requests no card from Shop, and the card goes through the private form as before

### Requirement: A purchase Shop cannot complete falls back without a second charge

When Shop cannot complete a purchase, because the store is not one Shop pays at, the checkout needs the person, or the Shop command is not installed, the agent SHALL fall back to the store's checkout link or to browsing as the person, and SHALL NOT pay by a second route for a purchase whose first payment may have gone through.

#### Scenario: A checkout needs the person

- **WHEN** a checkout reports a step only the person can do
- **THEN** the agent gives the person the checkout link and what is left to do

#### Scenario: The command is declined

- **WHEN** the person declines to install the Shop command
- **THEN** nothing is installed and the agent does the errand by browsing as the person
