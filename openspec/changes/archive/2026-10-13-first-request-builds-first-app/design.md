# Design

## Context

See proposal.md for why. The first request is one string in `app/src/pages/home/Tutorial.tsx`, quoted again in `Tutorial.test.tsx` and in the kept check `.agents/verification/journeys/mini-apps/the-starter-landing-page-teaches-the-loop-a-fresh-install.json`. The agent that receives it is whatever chat the person pastes into: the message is the whole instruction, so its wording carries the behavior. `Tutorial.tsx` is payload, so this is a release.

## Goals / Non-Goals

**Goals:**

- One message that leads a new owner to a first app they picked.
- Every page that describes the message says the same thing.

**Non-Goals:**

- A skill, script, or wiki procedure for the interview. The pasted request and the normal change loop already cover it; a second copy goes stale.
- Changing the card's title, button labels, or copy behavior.

## Decisions

1. **The message text.** Exactly:

   > Help me build my first app. Grill me first: start from what you already know about me and ask about my work and where my time goes, one question at a time. Then suggest a few apps I'd use, build the one I pick, remove this welcome guide, explain each step, and show me a preview before publishing.

   It names no file, folder, or command, as the spec requires. *Remove this welcome guide* keeps the phrase the comment in `Tutorial.tsx` already explains how to act on. Alternative: keep the rename and add the app. Rejected: two jobs in one message, and the request asks for the app to lead.
2. **The supporting line.** *Want something different? Just ask in your chat. You’ll see a preview before anything goes live.* becomes *Start with an app built for how you work. Just ask in your chat. You’ll see a preview before anything goes live.* The spec still holds: changes begin in the person's chat, and a preview precedes publishing.
3. **The source comment.** The line above the message in `Tutorial.tsx` says what the request does; rewrite it for the new job and keep the removal instructions on the next line.
4. **The kept check.** Edit only the quoted message in the journey's `expect`. Its scenario's THEN text is unchanged, so `thenDigest` stays; `/verify` re-records the journey if its own rules say the file is stale.
5. **Docs.** `wiki/stack/mini-apps.md` owns the description of the welcome; `wiki/stack/getting-started.md` and `wiki/stack/learning-from-chats.md` each carry one clause about it, and `.agents/skills/wong-sync/references/payload-manifest.md` one line. Update each in place; add no page. `README.md`'s *paste its Make it yours message* stays true.
6. **Release level.** `minor`: the message asks for new behavior.

## Risks / Trade-offs

- [The pasted chat has no memory of the person] → The message says *start from what you already know*, which is nothing in that case, so the agent asks from scratch.
- [A first app is a bigger first change than a rename] → The request still asks for each step explained and a preview before publishing, and the normal loop stops at the plan and at the preview.
- [Skill text budget] → The manifest line is reworded at the same length or shorter; `node scripts/measure-context.mjs --check` confirms.
