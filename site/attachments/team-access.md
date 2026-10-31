---
title: Everyone has access to your company secrets
problem: Keys sit in shared files and chats, so every teammate and every AI can use all of them.
fix: Each person signs in as themselves, and keys stay in your app, never in chat.
order: 6
checked: 2026-10-31
sources:
  - wiki/stack/employee-access.md
  - wiki/development/secrets.md
  - wiki/stack/company-api.md
---
Add per-person access to my AI setup. Build it in this project and ask me before anything you can't undo:

> Put a sign-in wall in front of the business app, so only people I add get in
> Know the owner by one sign-in email written in the app's settings
> The owner picks, per person, which tools in the app they may use and which keys
> A key has a level per person: none, look up only, or look up and change
> Give a group of people the same access with a role; one admin role can manage people
> Check the person's access on every request, so a change works on their next one
> Removing a person blocks them at once and ends their open sessions
> Keep every business key inside the app, never on a teammate's computer
> The AI calls named actions in the app, as the person, never with a raw key
> Each action says what it does, its inputs, its output, and whether it reads or changes
> A refusal names the access the person lacks, never a key's value
> Each route gets only the keys it lists
> The AI asks the app which actions exist before it calls one
> Keys for this computer's own tools sit in one ignored file, with a blank template saved beside it
> Never paste a key in chat: send a private one-time link where the person enters it
> Strip keys and tokens out of transcripts and screenshots before they leave the computer
> A test copy of the app holds its own test keys, never the live ones
> For more context, look at this repo: https://github.com/matthewwong525/WongStack (start at wiki/stack/employee-access.md)
