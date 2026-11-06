# service-definitions Specification

## Purpose
Each outside service an install uses has one definition, kept with the code: an OpenAPI file of the calls the install has made, written from its own use, and scrubbed real examples. Tests, code types and the AI all read it; the AI reads it through a short view, led there by a services skill every session loads.

## Requirements

### Requirement: Each outside service has one definition

Each outside service an install uses SHALL have one definition, kept with the code: an OpenAPI file holding only the calls the install uses, and real example exchanges, each matched to its call by its own request. Each call SHALL be written from the install's own real use, never copied from the service's published description, and SHALL say in its standard fields what the install uses it for and how, quirks included. The definition SHALL use the same OpenAPI version and the same way of writing a call as the app's own API description. Tests, code types and the AI SHALL all read this one definition; no test SHALL keep its own copy of a service's answer. The definition SHALL stay with the install: an update SHALL never add, change or remove it.

#### Scenario: A skill adds a call

- **WHEN** a skill starts using Notion's page read and the call is added to Notion's definition with an example
- **THEN** the AI's call list, the code types and the runtime tests all have the call, and no test file changed

#### Scenario: An update arrives

- **WHEN** an install with a Notion definition takes an update
- **THEN** its Notion definition and examples are unchanged

### Requirement: The AI reads a short view of a service, never the whole file

The helper SHALL list a service's calls one line each, and print one call's input and answer in a short form: references resolved, deep nesting cut, and the example named. The short view SHALL include how the install uses the call. The same views SHALL show the app's own actions, read from the app at the time of asking and limited to what the person may use; the app's own description SHALL never be saved as a file. Every installed repo SHALL carry a services skill whose description every session loads, saying it is for calling an outside tool or service and for writing code that calls one, and sending the AI to the short view before it calls or codes. The skill's text SHALL be the same in every install and name no install's service.

#### Scenario: A chat is asked about a service

- **WHEN** a person asks a fresh chat for the newest Notion page
- **THEN** the chat reads Notion's short view before its first call to Notion, without opening the whole definition file

#### Scenario: A call has a quirk

- **WHEN** Notion's search call's description says the install sorts by last edit to get the newest page
- **THEN** a chat reading the search call's short view sees that note beside what to send and what comes back

### Requirement: Examples are saved without a key on the computer and without sending a change

A look-up example SHALL be made by sending the look-up through the company app under the caller's own sign-in and key level, so no business key reaches the computer. Only a request the app accepts as read-only SHALL be sent to make an example. An example of a change SHALL be kept only from a change already made for real work, and never sent again.

#### Scenario: Save a look-up

- **WHEN** a person with Read on Notion saves a Notion page search as an example
- **THEN** the example holds the request, status and body, Notion's definition gains the call if missing, and no key value appears in it or on the computer

#### Scenario: Try to save a change as a look-up

- **WHEN** someone saves a request the app does not accept as a look-up
- **THEN** nothing is sent to the service and nothing is saved

### Requirement: An example holds no private data

Before an example is saved, every email, name, ID, phone number, free text and key-like value SHALL be replaced with a made-up value of the same kind, keeping field names, types and nesting. The same real value SHALL get the same made-up value within one example, so links between fields survive. The test command SHALL fail on an example that still holds a value that looks private, naming the file and field.

#### Scenario: A customer email in an answer

- **WHEN** a saved answer holds a customer's real email
- **THEN** the example holds a made-up `example.com` email in its place

#### Scenario: A private value is added by hand

- **WHEN** someone edits an example to hold a real-looking email or token
- **THEN** the test command fails and names the file and field

### Requirement: The definition and its examples agree

The test command SHALL fail, naming the file and field, when a definition doesn't parse, uses another OpenAPI version than the app's own, or has a broken reference, when a call lacks a written summary or description, when an example's request matches no call or more than one, or when an example's answer doesn't fit its call's answer schema.

#### Scenario: A new call is not described

- **WHEN** a chat saves a first Notion user look-up and leaves the call's summary as the placeholder
- **THEN** the test command fails and names the call

#### Scenario: An example no longer fits

- **WHEN** an example's answer lacks a field its call marks required
- **THEN** the test command fails and names the example and the field

### Requirement: Code that reads a service answer is type-checked against its definition

Each service definition SHALL produce types for each call's input and answer. App code reading a service answer through those types SHALL fail the type check when it reads a field the definition doesn't hold. The types SHALL be rebuilt whenever the definition changes, and the test command SHALL fail on stale types.

#### Scenario: Code reads a field the service doesn't send

- **WHEN** an action reads `results[0].heading` from a Notion search answer and Notion's definition has no `heading`
- **THEN** the type check fails and names the field

### Requirement: The definition grows with use

After a successful direct call that the service's definition doesn't hold, the helper SHALL say the call is not added yet and give the one command that adds it with an example. A call the definition holds SHALL produce no such message.

#### Scenario: A chat works out a new call

- **WHEN** a chat's look-up of `GET users/me` on Notion succeeds and Notion's definition lacks it
- **THEN** the helper prints that the call is not added and the command to add it, and after that command the short view lists it

### Requirement: Runtime tests replay the definition's examples

A runtime test SHALL be able to answer the app's outside requests from the service's examples, matched by service, method, path and input. A request no example matches SHALL fail the test and name the closest example.

#### Scenario: Code that calls a service

- **WHEN** a runtime test runs an app route that searches Notion and Notion's definition has a search example
- **THEN** the route gets the example's answer and the live service is never contacted

### Requirement: Examples can be refreshed

A refresh SHALL repeat each look-up example through the company app and report, per example, whether the new answer fits its call, naming fields that don't fit and fields the definition doesn't name. It SHALL check each new answer against the call's current answer schema before it saves. It SHALL save each new answer scrubbed. Each call's shape SHALL widen to match, and its written summary and description SHALL stay. A change example SHALL be listed as not checked. An example whose request the scrubber changed SHALL be listed as not checked and never sent. A refresh SHALL never send a change.

#### Scenario: A service adds a field

- **WHEN** Notion's page answer gains a field since its example was saved
- **THEN** the refresh names the new field, saves the new answer scrubbed, and the call gains the field in its definition and types, with its description unchanged

#### Scenario: A service drops a required field

- **WHEN** Notion's search answer no longer holds `has_more`, which every saved example held
- **THEN** the refresh lists `has_more` as missing, then saves the new answer and widens the call

#### Scenario: A request holds a made-up value

- **WHEN** an example's saved request holds a page ID the scrubber made up
- **THEN** the refresh lists it as not checked and never sends it
