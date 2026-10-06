# Matthew Wong

Matthew Wong owns WongStack and runs his own repos on it.

- **Git emails:** `matthewwong525@gmail.com`, `operations@claymoo.com`.
- **A payment page's email and terms are his to answer.** When a payment page asks for his email and to accept terms, ask him both in the chat and type them in; never tick the terms without his yes. Only the card goes in the private form ([when a step needs you](../development/browsing.md#when-a-step-needs-you)).
- **Each check runs only when its kind of file changed.** A wiki-only change runs only the wiki checks; a code-only change runs only the code checks, so no time goes on checks that can't fail. Keep a new check to this rule, as [the gate](../development/the-change-loop.md#the-gate) does.
- **Asked to improve something, he wants it improved, not only measured.** Say early when nothing is fixed yet, and fold a fix the measuring finds into the same change, not a follow-up.
- **Staging should mirror the live app.** When a check can only be done on the live app, fix staging so it can be done there: a safe playground the assistant can do anything in. Add a check on the live app only for what staging can never show, such as whether a release landed ([staging walkthrough](../development/staging-walkthrough.md)).
- **A break the change caused gets fixed, not asked about.** When a check finds the change broke something, fix it and go on. Stop to ask only when the fix fails, or the break is not the change's: he wrote *if it breaks something old it should fix it* on a plan that had the publish stop and ask ([kept checks](../development/kept-checks.md)).
- **Added waiting comes with its measured time and one fixed limit.** Before proposing a step that makes a check or a publish longer, time what it costs and offer a single cap, such as two minutes; he chose *only before publishing* once he saw the numbers.
- **A shared file is no reason to wait.** When another chat's unpublished work only edits the same files as yours, and yours needs none of its code, say so and build now, not after it. Whichever publishes second brings the other in ([other work and overlaps](../development/the-change-loop.md#several-parts-several-workspaces)).

- **A screen follows what other products do, not a hand-built look.** For a list of people or things he expects a table with rows you open, the common change in the row, and one frame that stays the same across a screen's states. He prefers a known component kit to styling each part by hand: *not re-invent the wheel*. Fold rarely used setup into a button or popup, and remove a button whose purpose needs explaining.
- **Screens match each other.** Every screen starts at one left edge and fills the same frame, so nothing jumps sideways between them and no screen leaves half of it empty. Rows in a list are one height. An item opens beside its list, not in its place. A question is asked one way, in a popup. A thing such as *Connect your assistant* has one way in. [Mini apps](../stack/mini-apps.md#the-home-page-lists-the-apps) describes the frame.

- **Service connections should stay free and generic.** He does not want a paid connection service or service-specific integrations stored in WongStack. If tap-to-sign-in is revisited, he prefers an open-source service ([connection choices](../../openspec/changes/archive/2026-10-03-smoother-key-link/proposal.md#decision-log)).

Back to [people](README.md).
