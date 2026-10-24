## ADDED Requirements

### Requirement: Inbox items reach their chat whichever app holds them

When projects on one computer use different company apps, the computer SHALL collect each inbox item's taps from the app that holds that item, deliver them to its chat, and report each result to that same app, whichever project's chat opened the item or started the computer's delivery. Closing an item, or a listed form, SHALL close it in the app that lists it. An app the computer can't reach SHALL keep its items waiting without stopping delivery for the others. The next plan opened from an updated project SHALL replace delivery left running by older code, including one started from a project not yet updated, and an item that older code opened SHALL still reach its chat through its own app.

#### Scenario: Two projects, two apps

- **WHEN** a ClaymooApp chat started the computer's delivery and the person taps *Build and publish* on a WongStack plan in the WongStack app's inbox
- **THEN** the WongStack plan's chat gets the tap, the WongStack app shows it *Sent*, and taps on ClaymooApp's items still arrive

#### Scenario: One app can't be reached

- **WHEN** the computer is signed out of one project's app while items from another app are open
- **THEN** taps on the other app's items still arrive, and the unreachable app's items wait until their link closes
