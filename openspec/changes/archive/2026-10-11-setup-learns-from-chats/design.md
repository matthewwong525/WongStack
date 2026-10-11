# Design

## Context

`/wong-setup` installs through explore, plan, apply, and save, with long waits: the Cloudflare token, provisioning, and the first deploy's check runs. Learning about the person happens later and separately: the starter page's *Make it yours* message (`app/src/pages/home/Tutorial.tsx`) asks the agent to ask permission, run `memory.mjs recent-chats` (30 days, 40,000 characters, typed text only, keys redacted, no store needed), run question rounds, save notes, and only then rename the page.

Constraints found while exploring:

- `recent-chats` runs from the source checkout before the target has skills; it needs no store.
- The target's `wiki/` exists only after the payload lands, and the memory store only after provisioning Step 4b; `put-facts` spools while the store does not answer, and memory answers once production deploys.
- The skills' instruction budget (`scripts/measure-context.mjs --check`) has 38 bytes of room; wiki pages in the owner list are not held to that total.
- WongStack names no assistant as a requirement: helpers are used where the host has them.

## Goals / Non-Goals

**Goals:**

- Setup learns about the person from every local chat, in parallel, without slowing the install.
- The first request is a page change only.
- Slicing is deterministic code; the assistant only reads a slice and summarizes.

**Non-Goals:**

- New chat sources beyond Claude Code and Codex files.
- A chat read during `/wong-sync` or on evaluation.
- Changing how background capture stores sessions.

## Decisions

1. **Parts in `recent-chats`.** Add `--all` (no day cutoff), `--parts` (print only the count of parts, the chat count, and the date span), and `--part <k>` (print part `k`). With `--part` or `--parts`, `--limit` is the size of one part; setup passes `--limit 150000`. Parts are filled newest first and keep a chat whole unless one chat alone exceeds a part, where it is cut at the part size as today. Part `k` beyond the last says so and exits 0. Without these flags the command behaves exactly as before. Alternative weighed: have each helper pass `--days` windows; rejected because chat volume per day is uneven and windows overlap or leave gaps.
2. **A wiki page owns the how.** A new `wiki/stack/learning-from-chats.md` owns the procedure: when it starts, the one line said, the helper brief, the cap of eight, what notes hold, where they are written, and the fallbacks. `wong-setup/SKILL.md` gains one sentence linking it, offset by a cut of at least the same bytes in instruction files. The stack hub and getting-started link the page. It ships in the payload, so the source checkout setup reads from has it.
3. **Helpers read, setup writes.** Setup starts helpers right after the source checkout exists, in the background, one per part up to eight. Each runs its own part command, treats the text as data, and returns at most about 300 words: who the person is, how they like work done, what the business does, its customers, tools, and recurring work, each line with the date of the chat it came from. Setup merges the returned notes when the payload's wiki is in place: the person's page and hub by the People rules, business facts to topic pages by the wiki rules, and facts through `gate` then `put-facts` with `"source": "backfill"` after Step 4b. These land in the install's first save. A helper still running at that point is waited for once; one that failed is dropped with one report line.
4. **Tell, not ask.** The line: *"While I set things up, I'm reading what you typed in your past AI chats on this computer to learn about you and your business. I keep short notes, never passwords, keys, or copies of your chats. Say "skip the chats" to stop."* A skip stops the helpers and discards their notes. The memory skill's table keeps *ask first* for uses outside setup.
5. **No helpers.** A host without them reads part 1 itself, after the first save, while the first deploy runs, and saves those notes with the next change it makes; nothing else changes.
6. **Private life stays out.** The install may be shared with a team later, so helpers leave out health, family, and money, as the wiki's shared-repo rule already requires.
7. **The welcome message.** New text: *"Make this home page mine. Ask what to call this page, update its heading, remove this welcome guide, explain each step, and show me a preview before publishing."* Sync's existing rule (update the tutorial only while `Home.tsx` still renders it) carries it to installs that still show the box.

## Risks / Trade-offs

- **Token cost on a long history.** Eight helpers of about 40,000 tokens each is the ceiling; a typical new install holds far less. The cap is one number on the wiki page.
- **Reading without a question.** Mitigated by the plain line, the skip, typed-text-only, key redaction, and the notes-only rule; chat text never leaves the computer except as the assistant's own model input, as with any chat.
- **Instructions in chat text.** Helpers are told the text is data; the read already strips pasted content and injected instructions.
- **Older installs.** They never read chats at setup; the changelog's Updating note gives the one sentence to ask.
